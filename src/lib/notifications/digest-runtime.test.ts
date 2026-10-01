import { beforeEach, describe, expect, it, vi } from 'vitest';

import manifest from '../../../data/catalog-release.json';

const state = vi.hoisted(() => ({ release: vi.fn(), find: vi.fn() }));

vi.mock('@/lib/company-access/catalog-release', () => ({ findReleaseEntity: state.find }));
vi.mock('@/lib/foundation/business-reader', () => ({ readLatestNewArrivalsRelease: state.release }));
vi.mock('@/lib/storage/d1', () => ({ queryD1: vi.fn(), executeD1: vi.fn() }));
vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: async () => undefined }));

import { createRuntimeDigestDeps, readPublishableEntities } from './digest-runtime';

const [A, B, C] = Object.keys(manifest.details);
const ID = (label: string) => label === 'a' ? A : label === 'b' ? B : C;

beforeEach(() => {
  state.release.mockReset();
  state.find.mockReset().mockImplementation(async (id: string) => ({ id, name: `名前 ${id}` }));
});

describe('readPublishableEntities', () => {
  it('目録の事例を、渡された順に返す', async () => {
    const entities = await readPublishableEntities([A, B, C]);
    expect(entities.map((entity) => entity.id)).toEqual([A, B, C]);
  });

  it('目録に無い ID は読まずに除く', async () => {
    const entities = await readPublishableEntities(['../secrets/key', 'ent_a', A, '', 'ent_not_in_catalog']);
    expect(entities.map((entity) => entity.id)).toEqual([A]);
    expect(state.find.mock.calls.map((call) => call[0])).toEqual([A]);
  });

  it('詳細が無い事例は除く', async () => {
    state.find.mockImplementation(async (id: string) => (id === B ? null : { id, name: 'x' }));
    const entities = await readPublishableEntities([A, B]);
    expect(entities.map((entity) => entity.id)).toEqual([A]);
  });

  it('読み込みの失敗は配信を止める', async () => {
    state.find.mockImplementation(async (id: string) => {
      if (id === B) throw new Error('catalog unavailable');
      return { id, name: 'x' };
    });
    await expect(readPublishableEntities([A, B])).rejects.toThrow('catalog unavailable');
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
