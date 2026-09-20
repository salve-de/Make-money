import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  getFoundationBucketAsync: vi.fn(async () => 'foundation-lake'),
  listR2Objects: vi.fn(),
  getFromR2: vi.fn(),
  readR2Object: vi.fn(),
  readR2ObjectRange: vi.fn(),
}));

vi.mock('@/lib/storage/r2', () => state);

import { buildFoundationBusinessCaseForEntity, buildFoundationValueSummariesFromBundle, foundationEntityIdsFromBundle, readFoundationHydratedValuePage, readFoundationValuePage } from './business-reader';

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

  it('builds a high-signal serving projection directly from one research bundle', () => {
    const entityId = 'ent_business_0123456789abcdef0123';
    const page = buildFoundationValueSummariesFromBundle({
      schema_version: 'research-bundle.v1',
      run_id: 'run_projection_test',
      retrieved_at: '2026-09-20T00:00:00Z',
      entities: [{
        entity_id: entityId,
        entity_type: 'business',
        canonical_name: 'Projection Test',
        aliases: [],
        canonical_identifier: 'projection.test',
        domain: 'projection.test',
        status: 'operating',
        observed_at: '2026-09-20T00:00:00Z',
        evidence_ids: ['ev_one', 'ev_two'],
      }],
      claims: [
        {
          claim_id: 'cl_0123456789abcdef01234567',
          entity_ids: [entityId],
          statement: 'Projection Test is a SaaS platform for small teams.',
          origin_type: 'reported',
          verification_status: 'SUPPORTED',
          confidence: 0.9,
          occurred_at: null,
          evidence_ids: ['ev_one'],
        },
        {
          claim_id: 'cl_1123456789abcdef01234567',
          entity_ids: [entityId],
          statement: 'Customers pay to remove a slow manual workflow bottleneck.',
          origin_type: 'reported',
          verification_status: 'SUPPORTED',
          confidence: 0.9,
          occurred_at: null,
          evidence_ids: ['ev_two'],
        },
        {
          claim_id: 'cl_2123456789abcdef01234567',
          entity_ids: [entityId],
          statement: 'The product grew through referrals and direct distribution.',
          origin_type: 'reported',
          verification_status: 'SUPPORTED',
          confidence: 0.9,
          occurred_at: '2026-09-01T00:00:00Z',
          evidence_ids: ['ev_one'],
        },
      ],
      metrics: [{
        metric_id: 'mt_0123456789abcdef01234567',
        entity_id: entityId,
        metric_type: 'MRR',
        value: 50000,
        unit: null,
        currency: 'USD',
        period_start: null,
        period_end: null,
        point_in_time: '2026-09-01T00:00:00Z',
        basis: 'reported',
        scope: 'company',
        origin_type: 'reported',
        verification_status: 'SUPPORTED',
        confidence: 0.9,
        evidence_ids: ['ev_one'],
      }],
      money_signals: [],
      events: [{
        event_id: 'evt_0123456789abcdef01234567',
        entity_ids: [entityId],
        event_type: 'launch',
        occurred_at: '2025-01-01T00:00:00Z',
        description: 'Launched after an initial customer pilot.',
        verification_status: 'SUPPORTED',
        confidence: 0.9,
        evidence_ids: ['ev_two'],
      }],
      relationships: [],
      observations: [],
      derived: [],
    });

    expect(page).toHaveLength(1);
    expect(page[0]?.valueProfile.tier).toBe('HIGH_SIGNAL');
    expect(page[0]?.valueProfile.counts.evidence).toBe(2);
    expect(page[0]?.valueProfile.moneySignal).toContain('MRR');
  });

  it('projects record-only enrichment bundles onto referenced existing entities', () => {
    const entityId = 'ent_business_fedcba9876543210fedc';
    const bundle = {
      schema_version: 'research-bundle.v1',
      entities: [],
      claims: [{
        claim_id: 'cl_cccccccccccccccccccccccc',
        entity_ids: [entityId],
        statement: 'Existing business added a new paid workflow.',
        origin_type: 'reported',
        verification_status: 'SUPPORTED',
        confidence: 0.9,
        occurred_at: null,
        evidence_ids: ['ev_enrichment'],
      }],
      metrics: [{
        metric_id: 'mt_dddddddddddddddddddddddd',
        entity_id: entityId,
        metric_type: 'MRR',
        value: 90000,
        unit: null,
        currency: 'USD',
        period_start: null,
        period_end: null,
        point_in_time: '2026-09-20T00:00:00Z',
        basis: 'reported',
        scope: 'company',
        origin_type: 'reported',
        verification_status: 'SUPPORTED',
        confidence: 0.9,
        evidence_ids: ['ev_enrichment'],
      }],
      money_signals: [],
      events: [],
      relationships: [],
      observations: [],
      derived: [],
    };

    expect(foundationEntityIdsFromBundle(bundle)).toEqual([entityId]);

    const detail = buildFoundationBusinessCaseForEntity(bundle, {
      id: entityId,
      name: 'Existing Business',
      entityType: 'business',
      aliases: [],
      canonicalIdentifier: 'existing.example',
      domain: 'existing.example',
      status: 'operating',
      observedAt: '2026-09-01T00:00:00Z',
      evidenceIds: ['ev_base'],
    });

    expect(detail.claims).toHaveLength(1);
    expect(detail.metrics).toHaveLength(1);
    expect(detail.valueProfile.moneySignal).toContain('MRR');
  });


  it('does not reject record-only enrichment when the byte-range probe only reaches entities', async () => {
    vi.resetModules();
    const reader = await import('./business-reader');
    const entityId = 'ent_probe_abcdef0123456789abcd';
    const entityKey = `datasets/ds.business.entities.core/v1/entities/${entityId}.json`;
    const bundleKey = 'datasets/ds.business.research-bundles.derived/v1/2026/09/20/run_probe_partial.json';

    const entity = {
      entity_id: entityId,
      canonical_name: 'Probe Demo',
      entity_type: 'business',
      aliases: [],
      canonical_identifier: 'probe.example',
      domain: 'probe.example',
      status: 'operating',
      observed_at: '2026-09-20T00:00:00Z',
      evidence_ids: ['ev_probe'],
    };
    const bundle = {
      schema_version: 'research-bundle.v1',
      entities: [],
      claims: [],
      metrics: [{
        metric_id: 'mt_probeeeeeeeeeeeeeeeeeeeee',
        entity_id: entityId,
        metric_type: 'MRR',
        value: 12345,
        unit: null,
        currency: 'USD',
        period_start: null,
        period_end: null,
        point_in_time: '2026-09-20T00:00:00Z',
        basis: 'reported',
        scope: 'company',
        origin_type: 'reported',
        verification_status: 'SUPPORTED',
        confidence: 0.9,
        evidence_ids: ['ev_probe'],
      }],
      money_signals: [],
      events: [],
      relationships: [],
      observations: [],
      derived: [],
    };

    state.listR2Objects
      .mockResolvedValueOnce({ objects: [{ key: entityKey }], truncated: false })
      .mockResolvedValueOnce({ objects: [{ key: bundleKey }], truncated: false });
    state.getFromR2.mockImplementation(async (key: string) => {
      if (key === entityKey) return JSON.stringify(entity);
      if (key === bundleKey) return JSON.stringify(bundle);
      return null;
    });
    state.readR2ObjectRange.mockResolvedValue({
      exists: true,
      // The bounded probe can fully parse entities=[] but does not reach the
      // later metric arrays. That is UNKNOWN, not negative proof.
      body: new TextEncoder().encode('{"schema_version":"research-bundle.v1","entities":[]}'),
      metadata: {},
    });

    const page = await reader.readFoundationHydratedValuePage({ limit: 1 });

    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.valueProfile.counts.metrics).toBe(1);
    expect(page.data[0]?.valueProfile.moneySignal).toContain('MRR');
    expect(state.getFromR2).toHaveBeenCalledWith(bundleKey, 'foundation-lake');
  });

  it('reports cumulative bundle scans incomplete when the listing page cap is reached', async () => {
    vi.resetModules();
    const reader = await import('./business-reader');
    const entityId = 'ent_cap_abcdef0123456789abcd';
    const bundleKey = 'datasets/ds.business.research-bundles.derived/v1/2026/09/20/run_cap_test.json';
    const entity = {
      entity_id: entityId,
      canonical_name: 'Cap Demo',
      entity_type: 'business',
      aliases: [],
      canonical_identifier: 'cap.example',
      domain: 'cap.example',
      status: 'operating',
      observed_at: '2026-09-20T00:00:00Z',
      evidence_ids: ['ev_cap'],
    };
    const bundle = {
      schema_version: 'research-bundle.v1',
      entities: [entity],
      claims: [],
      metrics: [],
      money_signals: [],
      events: [],
      relationships: [],
      observations: [],
      derived: [],
    };

    state.readR2Object.mockResolvedValue({
      exists: true,
      body: new TextEncoder().encode(JSON.stringify(entity)),
      metadata: {},
    });
    let listCall = 0;
    state.listR2Objects.mockImplementation(async () => {
      listCall += 1;
      return {
        objects: listCall === 1 ? [{ key: bundleKey }] : [],
        truncated: true,
        cursor: `cursor-${listCall}`,
      };
    });
    state.getFromR2.mockImplementation(async (key: string) => key === bundleKey ? JSON.stringify(bundle) : null);
    state.readR2ObjectRange.mockResolvedValue({
      exists: true,
      body: new TextEncoder().encode(JSON.stringify(bundle)),
      metadata: {},
    });

    const detail = await reader.readFoundationBusinessCaseCumulative(entityId);

    expect(detail).not.toBeNull();
    expect(detail?.bundleObjectsListed).toBe(1);
    expect(detail?.bundleScanComplete).toBe(false);
    expect(state.listR2Objects).toHaveBeenCalledTimes(128);
  });


  it('aggregates later canonical bundles while the serving-view migration is incomplete', async () => {
    const entityId = 'ent_demo_abcdef0123456789abcd';
    const entityKey = `datasets/ds.business.entities.core/v1/entities/${entityId}.json`;
    const bundleAKey = 'datasets/ds.business.research-bundles.derived/v1/2026/09/01/run_migration_a.json';
    const bundleBKey = 'datasets/ds.business.research-bundles.derived/v1/2026/09/19/run_migration_b.json';

    const entity = {
      entity_id: entityId,
      canonical_name: 'Migration Demo',
      entity_type: 'business',
      aliases: [],
      canonical_identifier: 'migration.example',
      domain: 'migration.example',
      status: 'operating',
      observed_at: '2026-09-01T00:00:00Z',
      evidence_ids: ['ev_old'],
    };
    const bundleA = {
      schema_version: 'research-bundle.v1',
      entities: [entity],
      claims: [{
        claim_id: 'cl_aaaaaaaaaaaaaaaaaaaaaaaa',
        entity_ids: [entityId],
        statement: 'Migration Demo is a SaaS platform for finance teams.',
        origin_type: 'reported',
        verification_status: 'SUPPORTED',
        confidence: 0.9,
        occurred_at: null,
        evidence_ids: ['ev_old'],
      }],
      metrics: [],
      money_signals: [],
      events: [],
      relationships: [],
      observations: [],
      derived: [],
    };
    const bundleB = {
      schema_version: 'research-bundle.v1',
      entities: [{
        ...entity,
        observed_at: '2026-09-19T00:00:00Z',
        evidence_ids: ['ev_new'],
      }],
      claims: [],
      metrics: [{
        metric_id: 'mt_bbbbbbbbbbbbbbbbbbbbbbbb',
        entity_id: entityId,
        metric_type: 'MRR',
        value: 75000,
        unit: null,
        currency: 'USD',
        period_start: null,
        period_end: null,
        point_in_time: '2026-09-19T00:00:00Z',
        basis: 'reported',
        scope: 'company',
        origin_type: 'reported',
        verification_status: 'SUPPORTED',
        confidence: 0.9,
        evidence_ids: ['ev_new'],
      }],
      money_signals: [],
      events: [],
      relationships: [],
      observations: [],
      derived: [],
    };
    const bodies = new Map([
      [entityKey, JSON.stringify(entity)],
      [bundleAKey, JSON.stringify(bundleA)],
      [bundleBKey, JSON.stringify(bundleB)],
    ]);

    state.listR2Objects
      .mockResolvedValueOnce({
        objects: [{ key: entityKey }],
        truncated: false,
      })
      .mockResolvedValueOnce({
        objects: [{ key: bundleAKey }, { key: bundleBKey }],
        truncated: false,
      });
    state.getFromR2.mockImplementation(async (key: string) => bodies.get(key) || null);
    state.readR2ObjectRange.mockImplementation(async (_bucket: string, key: string) => {
      const body = bodies.get(key);
      return body
        ? { exists: true, body: new TextEncoder().encode(body), metadata: {} }
        : null;
    });

    const page = await readFoundationHydratedValuePage({ limit: 1 });

    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.observedAt).toBe('2026-09-19T00:00:00Z');
    expect(page.data[0]?.valueProfile.counts.claims).toBe(1);
    expect(page.data[0]?.valueProfile.counts.metrics).toBe(1);
    expect(page.data[0]?.valueProfile.moneySignal).toContain('MRR');
    expect(page.data[0]?.evidenceIds).toEqual(expect.arrayContaining(['ev_old', 'ev_new']));
  });


  it('marks cumulative hydration incomplete when a listed bundle cannot be read', async () => {
    vi.resetModules();
    const reader = await import('./business-reader');
    const entityId = 'ent_fail_abcdef0123456789abcd';
    const bundleKey = 'datasets/ds.business.research-bundles.derived/v1/2026/09/20/run_read_failure.json';
    const entity = {
      entity_id: entityId,
      canonical_name: 'Read Failure Demo',
      entity_type: 'business',
      aliases: [],
      canonical_identifier: 'read-failure.example',
      domain: 'read-failure.example',
      status: 'operating',
      observed_at: '2026-09-20T00:00:00Z',
      evidence_ids: ['ev_base'],
    };

    state.readR2Object.mockResolvedValue({
      exists: true,
      body: new TextEncoder().encode(JSON.stringify(entity)),
      metadata: {},
    });
    state.listR2Objects.mockResolvedValue({
      objects: [{ key: bundleKey }],
      truncated: false,
    });
    state.readR2ObjectRange.mockResolvedValue({
      exists: true,
      body: new TextEncoder().encode(JSON.stringify({
        schema_version: 'research-bundle.v1',
        entities: [{ entity_id: entityId }],
      })),
      metadata: {},
    });
    state.getFromR2.mockImplementation(async (key: string) => {
      if (key === bundleKey) throw new Error('transient R2 GET failure');
      return null;
    });

    const detail = await reader.readFoundationBusinessCaseCumulative(entityId);

    expect(detail).not.toBeNull();
    expect(detail?.bundleScanComplete).toBe(false);
    expect(detail?.bundleObjectsListed).toBe(1);
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
