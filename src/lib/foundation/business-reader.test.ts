import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  getFoundationBucketAsync: vi.fn(async () => 'foundation-lake'),
  listR2Objects: vi.fn(),
  getFromR2: vi.fn(),
  readR2ObjectRange: vi.fn(),
}));

vi.mock('@/lib/storage/r2', () => state);

import { readFoundationValuePage } from './business-reader';

describe('Foundation list read path', () => {
  beforeEach(() => {
    state.getFoundationBucketAsync.mockClear();
    state.listR2Objects.mockReset();
    state.getFromR2.mockReset();
    state.readR2ObjectRange.mockReset();
  });

  it('does not scan research bundles while listing entity summaries', async () => {
    state.listR2Objects.mockResolvedValue({
      objects: [{ key: 'datasets/ds.business.entities.core/v1/entities/ent_demo.json' }],
      truncated: false,
    });
    state.getFromR2.mockResolvedValue(JSON.stringify({
      entity_id: 'ent_demo',
      canonical_name: 'Demo company',
      entity_type: 'company',
      aliases: [],
      status: 'ACTIVE',
      evidence_ids: ['evidence-demo'],
    }));

    const page = await readFoundationValuePage({ limit: 1 });

    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.name).toBe('Demo company');
    expect(page.data[0]?.valueProfile.counts).toEqual({
      claims: 0,
      metrics: 0,
      moneySignals: 0,
      events: 0,
      observations: 0,
      derived: 0,
      evidence: 1,
    });
    expect(state.listR2Objects).toHaveBeenCalledOnce();
    expect(state.readR2ObjectRange).not.toHaveBeenCalled();
  });
});
