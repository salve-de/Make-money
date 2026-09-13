import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  getFoundationBucketAsync: vi.fn(async () => 'foundation-lake'),
  listR2Objects: vi.fn(),
  getFromR2: vi.fn(),
  readR2Object: vi.fn(),
  readR2ObjectRange: vi.fn(),
}));

vi.mock('@/lib/storage/r2', () => state);

import { readFoundationValuePage } from './business-reader';

describe('Foundation list read path', () => {
  beforeEach(() => {
    state.getFoundationBucketAsync.mockClear();
    state.listR2Objects.mockReset();
    state.getFromR2.mockReset();
    state.readR2Object.mockReset();
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

  it('reads a bundle directly from the entity run metadata', async () => {
    const entityId = 'ent_demo_0123456789abcdef0123';
    state.readR2Object
      .mockResolvedValueOnce({
        exists: true,
        body: new TextEncoder().encode(JSON.stringify({
          entity_id: entityId,
          canonical_name: 'Demo company',
          entity_type: 'company',
          aliases: [],
          status: 'ACTIVE',
          observed_at: '2026-09-09T00:00:00Z',
          evidence_ids: ['evidence-demo'],
        })),
        metadata: { 'foundation-run-id': 'run_demo_20260909_01' },
      });
    state.getFromR2.mockResolvedValue(JSON.stringify({
      schema_version: 'research-bundle.v1',
      entities: [{ entity_id: entityId }],
      claims: [{ claim_id: 'cl_0123456789abcdef01234567', entity_id: entityId, statement: '事業モデルを公開', origin_type: 'reported', verification_status: 'SUPPORTED', confidence: null, occurred_at: null, evidence_ids: ['evidence-demo'] }],
      metrics: [], money_signals: [], events: [], relationships: [], observations: [], derived: [],
    }));

    const detail = await (await import('./business-reader')).readFoundationBusinessCase(entityId);

    expect(detail?.bundleScanComplete).toBe(true);
    expect(detail?.bundlesScanned).toBe(1);
    expect(detail?.claims).toHaveLength(1);
    expect(state.getFromR2).toHaveBeenCalledWith(
      'datasets/ds.business.research-bundles.derived/v1/2026/09/09/run_demo_20260909_01.json',
      'foundation-lake',
    );
    expect(state.listR2Objects).not.toHaveBeenCalled();
    expect(state.readR2ObjectRange).not.toHaveBeenCalled();
  });
});
