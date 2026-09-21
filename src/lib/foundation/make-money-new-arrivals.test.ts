import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ release: vi.fn(), entity: vi.fn() }));
vi.mock('./business-reader', async (importOriginal) => ({
  ...await importOriginal<typeof import('./business-reader')>(),
  readLatestNewArrivalsRelease: state.release,
  readFoundationEntitySummaryById: state.entity,
}));
vi.mock('@/lib/storage/r2', () => ({
  getFoundationBucketAsync: vi.fn().mockResolvedValue('lake'),
  listR2Objects: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
  readR2Object: vi.fn().mockResolvedValue(null),
  getFromR2: vi.fn(), putR2MutableView: vi.fn(),
  R2ViewConcurrentModificationError: class extends Error {},
}));
import { readMakeMoneyValuePage, selectNewArrivalPromotionIds } from './make-money-view';

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
});
