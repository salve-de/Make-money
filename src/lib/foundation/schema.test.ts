import { expect, it } from 'vitest';
import { parseFoundationDetailResponse, parseFoundationPageResponse } from './schema';
import { parseRevenueToMonthlyJpy } from './foundation-adapter';
const summary = {
  id: 'ent_test', name: 'Test', entityType: 'company', aliases: [], canonicalIdentifier: null,
  domain: null, status: 'active', observedAt: null, evidenceIds: [],
  valueProfile: { tier: 'CANDIDATE', score: 0, labels: [], businessSignal: null, painSignal: null,
    moneySignal: null, tractionSignal: null, mechanismSignal: null, timeSignal: null,
    counts: { claims: 0, metrics: 0, moneySignals: 0, events: 0, observations: 0, derived: 0, evidence: 0 } },
};
it('validates a paged response without coercing pagination or filling absent facts', () => {
  const input = { source: 'foundation_lake', data: [summary], hasMore: false, nextCursor: null };
  expect(parseFoundationPageResponse(input)?.data[0].domain).toBeNull();
  expect(() => parseFoundationPageResponse({ ...input, hasMore: 'false' })).toThrow();
  expect(() => parseFoundationPageResponse({ ...input, data: [{ ...summary, valueProfile: {} }] })).toThrow();
  expect(parseFoundationPageResponse({ source: 'static_fallback', data: [] })).toBeNull();
});
it('rejects malformed nested detail and preserves empty evidence arrays', () => {
  const detail = { ...summary, claims: [], metrics: [], moneySignals: [], events: [], relationships: [], observations: [], derived: [], bundlesScanned: 0, bundleObjectsListed: 0, bundleScanComplete: true };
  expect(parseFoundationDetailResponse({ source: 'foundation_lake', data: detail })).toBe(detail);
  expect(() => parseFoundationDetailResponse({ source: 'foundation_lake', data: { ...detail, metrics: [{ value: {} }] } })).toThrow();
  expect(() => parseFoundationDetailResponse(null)).toThrow();
});
it('normalizes annual/monthly revenue and keeps unknown prices unconfirmed', () => {
  expect(parseRevenueToMonthlyJpy(1200, 'USD', 'annual_revenue').monthlyJpy).toBe(15000);
  expect(parseRevenueToMonthlyJpy(1200, 'JPY', 'monthly_revenue').monthlyJpy).toBe(1200);
  expect(parseRevenueToMonthlyJpy(null).isUnconfirmed).toBe(true);
  expect(parseRevenueToMonthlyJpy('$799 course').isUnconfirmed).toBe(true);
});
