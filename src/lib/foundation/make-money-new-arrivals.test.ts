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
import { readMakeMoneyValuePage } from './make-money-view';

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
});
