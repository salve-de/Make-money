import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ release: vi.fn(), entity: vi.fn(), list: vi.fn(), read: vi.fn(), readRange: vi.fn(), head: vi.fn() }));
vi.mock('./business-reader', async (importOriginal) => ({
  ...await importOriginal<typeof import('./business-reader')>(),
  readLatestNewArrivalsRelease: state.release,
  readFoundationEntitySummaryById: state.entity,
}));
vi.mock('@/lib/storage/r2', () => ({
  getFoundationBucketAsync: vi.fn().mockResolvedValue('lake'),
  listR2Objects: state.list,
  headR2Object: state.head,
  readR2Object: state.read,
  readR2ObjectRange: state.readRange,
  getFromR2: vi.fn(), putR2MutableView: vi.fn(),
  R2ViewConcurrentModificationError: class extends Error {},
}));
import { buildFoundationBusinessCasesFromBundle, foundationBusinessCaseToValueSummary } from './business-reader';
import { readMakeMoneyValuePage, selectNewArrivalPromotionIds } from './make-money-view';

beforeEach(() => {
  state.release.mockReset().mockResolvedValue(null);
  state.entity.mockReset().mockResolvedValue(null);
  state.list.mockReset().mockResolvedValue({ objects: [], truncated: false, cursor: null });
  state.read.mockReset().mockResolvedValue(null);
  state.head.mockReset().mockResolvedValue({ exists: false });
  state.readRange.mockReset().mockImplementation((bucket: string, key: string) => state.read(bucket, key));
});

function viewDocument(id: string, name: string) {
  const bundle = {
    schema_version: 'research-bundle.v1',
    run_id: 'run_test',
    retrieved_at: '2026-09-22T00:00:00Z',
    entities: [{ entity_id: id, entity_type: 'company', canonical_name: name, aliases: [],
      domain: null, canonical_identifier: null, status: 'observed', observed_at: '2026-09-22T00:00:00Z', evidence_ids: [] }],
    claims: [], metrics: [], money_signals: [], events: [], relationships: [], observations: [], derived: [],
  };
  const detail = buildFoundationBusinessCasesFromBundle(bundle)[0];
  return {
    schema_version: 'make-money-view.v2', consumer: 'make-money', projection_version: 'v1',
    source_run_ids: ['run_test'], latest_source_run_id: 'run_test', projected_at: '2026-09-22T00:00:00Z',
    summary: foundationBusinessCaseToValueSummary(detail), detail,
  };
}

describe('edition before product-view projection', () => {
  it('keeps canonical new arrivals visible while their product views are pending', async () => {
    state.release.mockResolvedValue({ entityIds: ['ent_new'], count: 1 });
    state.entity.mockResolvedValue({
      id: 'ent_new', name: 'New business', entityType: 'business', aliases: [],
      canonicalIdentifier: 'example.com', domain: 'example.com', status: 'ACTIVE',
      observedAt: '2026-09-21T00:00:00Z', evidenceIds: ['ev_source'],
    });
    const page = await readMakeMoneyValuePage();
    expect(page.data).toHaveLength(1);
    expect(page.data[0]).toMatchObject({ id: 'ent_new', isNew: true });
    expect(page.data[0].valueProfile.moneySignal).toBeNull();
  });

  it('does not invent a row when both canonical record and view are missing', async () => {
    state.release.mockResolvedValue({ entityIds: ['ent_missing'], count: 1 });
    state.entity.mockResolvedValue(null);
    expect((await readMakeMoneyValuePage()).data).toEqual([]);
  });

  it('bounds first-page new-arrival promotion to keep R2 reads within Worker limits', async () => {
    const ids = Array.from({ length: 100 }, (_, index) => `ent_arrival_${index}`);
    state.release.mockResolvedValue({ entityIds: ids, count: ids.length });
    state.entity.mockImplementation(async (id: string) => ({
      id,
      name: id,
      entityType: 'business',
      aliases: [],
      canonicalIdentifier: null,
      domain: null,
      status: 'ACTIVE',
      observedAt: '2026-09-21T00:00:00Z',
      evidenceIds: [],
    }));

    const page = await readMakeMoneyValuePage();

    expect(page.data).toHaveLength(10);
    expect(state.entity).toHaveBeenCalledTimes(10);
  });

  it('filters known arrivals before applying the promotion cap', () => {
    const known = new Set(Array.from({ length: 25 }, (_, index) => `ent_known_${index}`));
    const entityIds = [...known, 'ent_unprojected_25'];

    expect(selectNewArrivalPromotionIds(entityIds, known)).toEqual(['ent_unprojected_25']);
  });

  it('does not repeat a promoted entity on a later serving cursor page', async () => {
    const promotedId = 'ent_company_0123456789abcdef0123';
    const laterId = 'ent_company_abcdef01234567890123';
    const documents = new Map([
      [promotedId, viewDocument(promotedId, 'Promoted company')],
      [laterId, viewDocument(laterId, 'Later company')],
    ]);
    state.release.mockResolvedValue({ entityIds: [promotedId], count: 1 });
    state.list.mockImplementation(async ({ cursor }: { cursor?: string }) => cursor
      ? { objects: [{ key: `views/make-money/v1/entities/${promotedId}.json` }, { key: `views/make-money/v1/entities/${laterId}.json` }], truncated: false, cursor: null }
      : { objects: [{ key: `views/make-money/v1/entities/${laterId}.json` }], truncated: true, cursor: 'r2-next' });
    state.read.mockImplementation(async (_bucket: string, key: string) => {
      if (key.includes('/_evidence-corrections/')) return null;
      const id = key.split('/').at(-1)?.replace('.json', '');
      const document = id ? documents.get(id) : null;
      return document ? { body: new TextEncoder().encode(JSON.stringify(document)) } : null;
    });

    const first = await readMakeMoneyValuePage({ limit: 1 });
    expect(first.data.map((item) => item.id)).toEqual([promotedId, laterId]);
    expect(first.nextCursor).toContain('make-money-serving-v2:');

    const second = await readMakeMoneyValuePage({ cursor: first.nextCursor || undefined, limit: 2 });
    expect(second.data.map((item) => item.id)).toEqual([laterId]);
  });

  it('serves a list row from its persisted summary without parsing the detail graph', async () => {
    const id = 'ent_company_0123456789abcdef0123';
    const document = viewDocument(id, 'Summary-only company');
    const summaryOnlyDocument = { ...document, detail: { intentionally: 'not a list payload' } };
    state.list.mockResolvedValue({
      objects: [{ key: `views/make-money/v1/entities/${id}.json` }],
      truncated: false,
      cursor: null,
    });
    state.read.mockImplementation(async (_bucket: string, key: string) => {
      if (key.includes('/_evidence-corrections/')) return null;
      return { body: new TextEncoder().encode(JSON.stringify(summaryOnlyDocument)) };
    });

    const page = await readMakeMoneyValuePage({ limit: 1 });

    expect(page.data).toHaveLength(1);
    expect(page.data[0]).toMatchObject({ id, name: 'Summary-only company' });
  });
});
