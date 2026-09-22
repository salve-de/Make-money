import { describe, expect, it } from 'vitest';
import type { FoundationBusinessCase } from './business-reader';
import {
  mapServingReads,
  mergeFoundationBusinessCasesForView,
  projectionRetryMatchesCanonical,
} from './make-money-view';

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
