import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  view: vi.fn(),
  parse: vi.fn(),
  publishable: vi.fn(),
  adaptSummary: vi.fn(),
  adaptDetail: vi.fn(),
  release: vi.fn(),
}));

vi.mock('@/lib/foundation/make-money-view', () => ({
  readMakeMoneyViewDetail: state.view,
  // the real helper only bounds concurrency; keep its order-preserving, fail-fast behaviour
  mapServingReads: async <T, R>(items: readonly T[], read: (item: T) => Promise<R>) => Promise.all(items.map(read)),
}));
vi.mock('@/lib/foundation/schema', () => ({ parseFoundationBusinessCase: state.parse }));
vi.mock('@/lib/company-access/public-entity', () => ({ isPublishableEntity: state.publishable }));
vi.mock('@/lib/foundation/foundation-adapter', () => ({
  adaptFoundationSummaryToFinancialEntity: state.adaptSummary,
  adaptFoundationDetailToFinancialEntity: state.adaptDetail,
}));
vi.mock('@/lib/foundation/business-reader', () => ({ readLatestNewArrivalsRelease: state.release }));
vi.mock('@/lib/storage/d1', () => ({ queryD1: vi.fn(), executeD1: vi.fn() }));
vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: async () => undefined }));

import { createRuntimeDigestDeps, readPublishableEntities } from './digest-runtime';

/** A published case id ends in 20 lowercase hex digits; derive them from a readable label. */
const ID = (label: string) => `ent_saas_${Buffer.from(label).toString('hex').padEnd(20, '0').slice(0, 20)}`;

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  state.view.mockReset().mockImplementation(async (id: string) => ({ viewOf: id }));
  state.parse.mockReset().mockImplementation((view: { viewOf: string }) => ({ id: view.viewOf, name: `名前 ${view.viewOf}` }));
  state.publishable.mockReset().mockReturnValue(true);
  state.adaptSummary.mockReset().mockImplementation((detail: unknown) => ({ gateFor: detail }));
  state.adaptDetail.mockReset().mockImplementation((detail: { id: string }) => ({ id: detail.id, adapted: true }));
  state.release.mockReset();
});

describe('readPublishableEntities', () => {
  it('reads each case through the public detail path and returns the adapted entities in order', async () => {
    const ids = [ID('a'), ID('b'), ID('c')];
    const entities = await readPublishableEntities(ids);
    expect(entities).toEqual(ids.map((id) => ({ id, adapted: true })));
    expect(state.view.mock.calls.map((call) => call[0])).toEqual(ids);
  });

  it('applies the same publication gate the public detail uses, built from the summary form of the case', async () => {
    state.publishable.mockImplementation((gate: { gateFor: { id: string } }) => gate.gateFor.id !== ID('b'));
    const entities = await readPublishableEntities([ID('a'), ID('b')]);
    expect(entities.map((entity) => entity.id)).toEqual([ID('a')]);
    expect(state.adaptDetail).toHaveBeenCalledTimes(1);
  });

  it('leaves out cases that are missing, cannot be parsed, or have no display name yet', async () => {
    state.view.mockImplementation(async (id: string) => (id === ID('missing') ? null : { viewOf: id }));
    state.parse.mockImplementation((view: { viewOf: string }) => {
      if (view.viewOf === ID('garbled')) throw new Error('schema mismatch');
      // a case still named by its stored id has no display identity
      return { id: view.viewOf, name: view.viewOf === ID('unnamed') ? ID('unnamed') : '名前' };
    });
    const entities = await readPublishableEntities([ID('ok'), ID('missing'), ID('garbled'), ID('unnamed')]);
    expect(entities.map((entity) => entity.id)).toEqual([ID('ok')]);
  });

  it('skips one case whose adaptation throws instead of losing the whole edition', async () => {
    state.adaptDetail.mockImplementation((detail: { id: string }) => {
      if (detail.id === ID('bad')) throw new Error('unexpected shape');
      return { id: detail.id, adapted: true };
    });
    const entities = await readPublishableEntities([ID('bad'), ID('good')]);
    expect(entities.map((entity) => entity.id)).toEqual([ID('good')]);
  });

  it('never reads an identifier that is not shaped like a published case', async () => {
    const entities = await readPublishableEntities(['../secrets/key', 'ent_a', ID('ok'), '', 'ENT_SAAS_00000000000000000000']);
    expect(entities.map((entity) => entity.id)).toEqual([ID('ok')]);
    expect(state.view.mock.calls.map((call) => call[0])).toEqual([ID('ok')]);
  });

  it('lets a storage failure stop the run: it is not a case to skip', async () => {
    state.view.mockImplementation(async (id: string) => {
      if (id === ID('b')) throw new Error('R2 unavailable');
      return { viewOf: id };
    });
    await expect(readPublishableEntities([ID('a'), ID('b')])).rejects.toThrow('R2 unavailable');
  });
});

describe('createRuntimeDigestDeps', () => {
  it('maps the newest edition to what the digest needs, and none to null', async () => {
    const deps = createRuntimeDigestDeps('https://make-money.example.jp');
    state.release.mockResolvedValueOnce({ releaseId: '20260929-09', releaseAt: 'x', label: '2026.09.29 09:00 JST', count: 2, entityIds: [ID('a'), ID('b')], contributionCount: 1 });
    expect(await deps.readRelease()).toEqual({ releaseId: '20260929-09', label: '2026.09.29 09:00 JST', entityIds: [ID('a'), ID('b')] });
    state.release.mockResolvedValueOnce(null);
    expect(await deps.readRelease()).toBeNull();
  });

  it('lets a failure to read the newest edition stop the run', async () => {
    state.release.mockRejectedValueOnce(new Error('index unavailable'));
    await expect(createRuntimeDigestDeps('https://make-money.example.jp').readRelease()).rejects.toThrow('index unavailable');
  });

  it('gives an unsubscribe URL only while a signing secret exists', async () => {
    // getRuntimeEnvValue is mocked to return undefined: no secret, so no link
    expect(await createRuntimeDigestDeps('https://make-money.example.jp').unsubscribeUrl('sub-1')).toBeNull();
  });

  it('provides every dependency the digest calls', () => {
    const deps = createRuntimeDigestDeps('https://make-money.example.jp');
    for (const name of ['now', 'readRelease', 'readEntities', 'listAlertRecipients', 'listSubscribers', 'loadSent', 'claim', 'unclaim', 'markNotified', 'unsubscribeUrl', 'send'] as const) {
      expect(typeof deps[name]).toBe('function');
    }
  });
});
