import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { FoundationBusinessCase } from './business-reader';
import {
  assertMakeMoneyValuePage,
  mapServingReads,
  mergeFoundationBusinessCasesForView,
  projectionRetryMatchesCanonical,
  typedRecordSetFromCanonicalBundle,
} from './make-money-view';

describe('serving page guard', () => {
  it('accepts the bounded page envelope used by the list route', () => {
    expect(() => assertMakeMoneyValuePage({
      data: [{
        id: 'ent_company_0123456789abcdef0123', name: 'Example', entityType: 'company',
        aliases: [], canonicalIdentifier: null, domain: null, status: 'ACTIVE', observedAt: null,
        evidenceIds: [], valueProfile: {
          tier: 'CANDIDATE', score: 0, labels: [], businessSignal: null, painSignal: null,
          moneySignal: null, tractionSignal: null, mechanismSignal: null, timeSignal: null,
          counts: { claims: 0, metrics: 0, moneySignals: 0, events: 0, observations: 0, derived: 0, evidence: 0 },
        },
      }], nextCursor: null, hasMore: false, newArrivals: null,
    })).not.toThrow();
  });

  it('rejects a malformed serving row before publication', () => {
    expect(() => assertMakeMoneyValuePage({ data: [{ id: 'broken' }], nextCursor: null, hasMore: false, newArrivals: null }))
      .toThrow('Invalid Foundation serving page');
  });
});


describe('bounded serving-view reads', () => {
  it('reads every row in order with at most two remote reads in flight', async () => {
    let active = 0; let peak = 0;
    const inputs = Array.from({ length: 301 }, (_, i) => i);
    const rows = await mapServingReads(inputs, async i => {
      active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, i % 3));
      active--; return i;
    });
    expect(rows).toEqual(inputs); expect(peak).toBeLessThanOrEqual(2);
    expect(active).toBe(0);
  });
  it('does not hide read failures or invent empty rows', async () => {
    await expect(mapServingReads([1], async () => { throw new Error('R2 unavailable'); })).rejects.toThrow('R2 unavailable');
    expect(await mapServingReads([], async v => v)).toEqual([]);
  });
});

describe('exact Starwood mapper-v4 candidate transport', () => {
  it('extracts the same typed source run and public facts from the immutable candidate blob', () => {
    const candidate = JSON.parse(readFileSync(
      'src/lib/foundation/fixtures/real-starwood-apollo-sec-mapper-v4-candidate.json',
      'utf8',
    )) as Record<string, unknown>;

    expect(candidate.run_id).toBe('run_handoff_c9e926361e9472f5085323dc727be7ff');

    const candidateObservations = candidate.observations as Array<Record<string, unknown>>;
    expect(candidateObservations.some(
      (row) => row.observation_id === 'obs_62caf68d0af2a7f659bf0b5a',
    )).toBe(true);

    const typed = typedRecordSetFromCanonicalBundle(candidate) as Record<string, unknown>;
    expect(typed.source_run_id).toBe('run_verify_canary_starwood_20260925044005');
    expect(typed.subject_ref).toBe(
      'case:starwood-sreit-apollo-affordable-housing-jv-liquidity-recapitalization:2026',
    );

    const extensions = typed.extensions as Record<string, unknown>;
    const publicFactsOutput = extensions['public_facts.v1'] as Record<string, unknown>;
    expect(publicFactsOutput.producer_lane).toBe('VERIFY_RECONCILE');

    const facts = publicFactsOutput.facts as Array<Record<string, unknown>>;
    expect(facts).toHaveLength(2);
    expect(facts.map((fact) => (fact.value as Record<string, unknown>).value).sort())
      .toEqual([41.5, 58.5]);
    expect(facts.map((fact) => fact.fact_id).sort()).toEqual([
      'pf_62877c1fb7ba35b14d80ff33',
      'pf_f4ae5d042c95d5c1c607cd85',
    ].sort());
  });
});

describe('immutable projection retry compatibility', () => {
  it('accepts omitted versus explicit null optional object fields', () => {
    const canonical = `${JSON.stringify({
      run_id: 'run_same',
      money_signals: [{ amount: 10, currency: 'USD' }],
    })}\n`;
    const retry = {
      run_id: 'run_same',
      money_signals: [{ amount: 10, currency: 'USD', amount_label: null }],
    };

    expect(projectionRetryMatchesCanonical(canonical, retry)).toBe(true);
  });

  it('rejects a changed non-null fact', () => {
    const canonical = `${JSON.stringify({ run_id: 'run_same', amount: 10 })}\n`;

    expect(projectionRetryMatchesCanonical(canonical, { run_id: 'run_same', amount: 11 })).toBe(false);
  });
});

function makeCase(input: {
  observedAt: string;
  name?: string;
  evidenceIds?: string[];
  includeSignals?: boolean;
  includeUpdate?: boolean;
}): FoundationBusinessCase {
  const includeSignals = input.includeSignals ?? false;
  return {
    id: 'ent_business_0123456789abcdef0123',
    name: input.name || 'Example Co',
    entityType: 'business',
    aliases: [],
    canonicalIdentifier: 'example.com',
    domain: 'example.com',
    status: 'operating',
    observedAt: input.observedAt,
    evidenceIds: input.evidenceIds || [],
    claims: includeSignals ? [
      {
        id: 'cl_business',
        statement: 'Example Co is a SaaS platform for finance teams.',
        originType: 'reported',
        verificationStatus: 'SUPPORTED',
        confidence: 0.9,
        occurredAt: null,
        evidenceIds: ['ev_old_1'],
      },
      {
        id: 'cl_pain',
        statement: 'Customers pay to remove a slow manual reporting bottleneck.',
        originType: 'reported',
        verificationStatus: 'SUPPORTED',
        confidence: 0.9,
        occurredAt: null,
        evidenceIds: ['ev_old_2'],
      },
      {
        id: 'cl_growth',
        statement: 'The product grew through referrals and direct distribution.',
        originType: 'reported',
        verificationStatus: 'SUPPORTED',
        confidence: 0.9,
        occurredAt: '2026-08-01T00:00:00Z',
        evidenceIds: ['ev_old_1'],
      },
    ] : [],
    metrics: includeSignals ? [
      {
        id: 'mt_revenue_old',
        metricType: 'MRR',
        value: 50000,
        unit: null,
        currency: 'USD',
        periodStart: null,
        periodEnd: null,
        pointInTime: '2026-08-01T00:00:00Z',
        basis: 'reported',
        scope: 'company',
        originType: 'reported',
        verificationStatus: 'SUPPORTED',
        confidence: 0.9,
        evidenceIds: ['ev_old_1'],
      },
    ] : [],
    moneySignals: [],
    events: input.includeUpdate ? [
      {
        id: 'evt_price_change',
        eventType: 'pricing_change',
        occurredAt: '2026-09-15T00:00:00Z',
        description: 'Pricing changed after the August observation.',
        verificationStatus: 'SUPPORTED',
        confidence: 0.9,
        evidenceIds: ['ev_new_1'],
      },
    ] : [],
    relationships: [],
    observations: [],
    derived: [],
    valueProfile: {
      tier: 'CANDIDATE',
      score: 0,
      labels: [],
      businessSignal: null,
      painSignal: null,
      moneySignal: null,
      tractionSignal: null,
      mechanismSignal: null,
      timeSignal: null,
      counts: {
        claims: 0,
        metrics: 0,
        moneySignals: 0,
        events: 0,
        observations: 0,
        derived: 0,
        evidence: 0,
      },
    },
    bundlesScanned: 1,
    bundleObjectsListed: 1,
    bundleScanComplete: true,
  };
}

describe('Make-Money cumulative Foundation view', () => {
  it('retains historical facts when a later monitoring bundle is sparse', () => {
    const historical = makeCase({
      observedAt: '2026-08-01T00:00:00Z',
      evidenceIds: ['ev_old_1', 'ev_old_2'],
      includeSignals: true,
    });
    const update = makeCase({
      observedAt: '2026-09-20T00:00:00Z',
      name: 'Example Co',
      evidenceIds: ['ev_new_1'],
      includeUpdate: true,
    });

    const merged = mergeFoundationBusinessCasesForView(historical, update);

    expect(merged.observedAt).toBe('2026-09-20T00:00:00Z');
    expect(merged.metrics.map((item) => item.id)).toContain('mt_revenue_old');
    expect(merged.events.map((item) => item.id)).toContain('evt_price_change');
    expect(merged.evidenceIds).toEqual(expect.arrayContaining(['ev_old_1', 'ev_old_2', 'ev_new_1']));
    expect(merged.valueProfile.moneySignal).toContain('MRR');
    expect(merged.valueProfile.tier).toBe('HIGH_SIGNAL');
  });

  it('does not let an older bundle overwrite a newer duplicate record ID', () => {
    const newer = makeCase({
      observedAt: '2026-09-20T00:00:00Z',
      evidenceIds: ['ev_new_1'],
    });
    newer.metrics = [{
      id: 'mt_same',
      metricType: 'MRR',
      value: 90000,
      unit: null,
      currency: 'USD',
      periodStart: null,
      periodEnd: null,
      pointInTime: '2026-09-20T00:00:00Z',
      basis: 'reported',
      scope: 'company',
      originType: 'reported',
      verificationStatus: 'SUPPORTED',
      confidence: 0.9,
      evidenceIds: ['ev_new_1'],
    }];

    const older = makeCase({
      observedAt: '2026-08-01T00:00:00Z',
      evidenceIds: ['ev_old_1'],
    });
    older.metrics = [{
      id: 'mt_same',
      metricType: 'MRR',
      value: 10000,
      unit: null,
      currency: 'USD',
      periodStart: null,
      periodEnd: null,
      pointInTime: '2026-08-01T00:00:00Z',
      basis: 'reported',
      scope: 'company',
      originType: 'reported',
      verificationStatus: 'SUPPORTED',
      confidence: 0.9,
      evidenceIds: ['ev_old_1'],
    }];

    const merged = mergeFoundationBusinessCasesForView(newer, older);

    expect(merged.metrics).toHaveLength(1);
    expect(merged.metrics[0]?.value).toBe(90000);
    expect(merged.metrics[0]?.pointInTime).toBe('2026-09-20T00:00:00Z');
  });

  it('does not roll identity time backward when an older bundle arrives later', () => {
    const newer = makeCase({
      observedAt: '2026-09-20T00:00:00Z',
      evidenceIds: ['ev_new_1'],
      includeUpdate: true,
    });
    const older = makeCase({
      observedAt: '2026-08-01T00:00:00Z',
      evidenceIds: ['ev_old_1', 'ev_old_2'],
      includeSignals: true,
    });

    const merged = mergeFoundationBusinessCasesForView(newer, older);

    expect(merged.observedAt).toBe('2026-09-20T00:00:00Z');
    expect(merged.metrics.map((item) => item.id)).toContain('mt_revenue_old');
    expect(merged.events.map((item) => item.id)).toContain('evt_price_change');
  });
});
