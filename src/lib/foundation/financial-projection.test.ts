import { describe, expect, it } from 'vitest';
import { parseRevenueToMonthlyJpy, projectProfitMetrics, adaptFoundationDetailToFinancialEntity } from './foundation-adapter';
import { cleanIntelligenceText, formatHumanMoney } from './text-cleaner';
import { buildFoundationValueProfile } from './value-projection';
import type { FoundationMetricSignal, FoundationEntitySummary, FoundationBusinessCase } from './business-reader';

const metric = (metricType: string, value: number, overrides: Partial<FoundationMetricSignal> = {}): FoundationMetricSignal => ({
  id: metricType, metricType, value, unit: 'annual', currency: 'JPY', periodStart: '2025-01-01', periodEnd: '2025-12-31', pointInTime: null,
  basis: null, scope: null, originType: 'reported', verificationStatus: 'SUPPORTED', confidence: null, evidenceIds: ['evidence'], ...overrides,
});

describe('revenue normalization', () => {
  it.each([
    ['2025 revenue $120,000', 'USD', 'annual_revenue', 1500000], ['USD 10 million ARR', 'USD', 'ARR', 125000000],
    [12000, 'USD', 'ARR', 150000], [12000, 'USD', 'MRR', 1800000],
    ['120,000', 'JPY', 'annual_revenue', 10000], ['$2,020 MRR', 'USD', 'mrr', 303000],
    ['月商 1.2億円', 'JPY', 'revenue', 120000000], ['年商 120万円', 'JPY', 'revenue', 100000],
    ['$10M (約15億円)', 'USD', 'annual_revenue', 125000000],
    ['$1.2M ARR', 'USD', 'arr', 15000000], ['2025-01-01 revenue $120,000', 'USD', 'annual_revenue', 1500000],
    [0, 'JPY', 'annual_revenue', 0], ['0', 'JPY', 'monthly_revenue', 0],
  ])('normalizes %s %s %s', (value, currency, type, expected) => {
    expect(parseRevenueToMonthlyJpy(value, currency, type)).toMatchObject({ monthlyJpy: expected, isUnconfirmed: false });
  });
  it.each([null, undefined, '', Number.NaN, Infinity, -120, 'unknown', '$799 course'])('preserves unavailable revenue for %s', value => {
    expect(parseRevenueToMonthlyJpy(value)).toMatchObject({ monthlyJpy: 0, isUnconfirmed: true });
  });
  it('does not invent FX rates or spread cumulative revenue over one year', () => {
    expect(parseRevenueToMonthlyJpy(12000, 'EUR', 'ARR').isUnconfirmed).toBe(true);
    expect(parseRevenueToMonthlyJpy(12000, 'JPY', 'cumulative_revenue').isUnconfirmed).toBe(true);
  });
});

describe('profit evidence', () => {
  const revenue = metric('annual_revenue', 120000);
  it('does not manufacture profit or costs from known revenue', () => {
    expect(projectProfitMetrics(10000, revenue, [revenue])).toMatchObject({ operatingProfit: 0, isMarginUnconfirmed: true, isGrossMarginUnconfirmed: true, isCostsUnconfirmed: true, isNetProfitUnconfirmed: true });
  });
  it('preserves explicit zero profit independently from missing profit', () => {
    expect(projectProfitMetrics(10000, revenue, [metric('operating_profit', 0)])).toMatchObject({ operatingProfit: 0, operatingMargin: 0, isMarginUnconfirmed: false });
  });
  it('preserves losses and derives compatible monthly profit and margin', () => {
    expect(projectProfitMetrics(10000, revenue, [metric('operating_profit', -24000)])).toMatchObject({ operatingProfit: -2000, operatingMargin: -20, isMarginUnconfirmed: false });
  });
  it.each([
    { periodEnd: '2024-12-31' }, { currency: 'USD' }, { verificationStatus: 'UNVERIFIED' }, { basis: 'cash' }, { scope: 'subsidiary' },
  ] as Partial<FoundationMetricSignal>[])('rejects incompatible profit %j', override => {
    expect(projectProfitMetrics(10000, revenue, [metric('operating_profit', 24000, override)]).isMarginUnconfirmed).toBe(true);
  });
  it('uses explicit percentage margins only with a percentage unit', () => {
    expect(projectProfitMetrics(10000, revenue, [metric('operating_margin', 25, { unit: '%' })])).toMatchObject({ operatingProfit: 2500, operatingMargin: 25, isMarginUnconfirmed: false });
    expect(projectProfitMetrics(10000, revenue, [metric('operating_margin', 25)]).isMarginUnconfirmed).toBe(true);
  });
});

it('retains source numbers and unmatched English observations', () => {
  expect(cleanIntelligenceText('金額シグナルとして、公開情報は 250000 USD_annual_revenue を示す。')).toContain('250000');
  expect(cleanIntelligenceText('Revenue fell from $40M to $20M in 2025.')).toContain('$40M');
  expect(cleanIntelligenceText('Revenue fell from $40M to $20M in 2025.')).toContain('$20M');
});

it('does not turn an unrelated observation into all scoring dimensions', () => {
  const summary: FoundationEntitySummary = { id: 'test', name: 'Test', entityType: 'business', aliases: [], canonicalIdentifier: null, domain: null, status: 'active', observedAt: null, evidenceIds: [] };
  const profile = buildFoundationValueProfile(summary, { claims: [{ id: 'claim', statement: '本社の壁は青い。', originType: 'observed', verificationStatus: 'SUPPORTED', confidence: null, occurredAt: null, evidenceIds: [] }], metrics: [], moneySignals: [], events: [], relationships: [], observations: [], derived: [] });
  expect(profile).toMatchObject({ score: 0, tier: 'CANDIDATE', businessSignal: null, painSignal: null, tractionSignal: null, mechanismSignal: null });
});


it('detail adapter selects MRR and keeps zero revenue separate from missing profit', () => {
  const summary: FoundationEntitySummary = { id: 'test', name: 'Test', entityType: 'business', aliases: [], canonicalIdentifier: null, domain: null, status: 'active', observedAt: null, evidenceIds: [] };
  const empty = { claims: [], metrics: [], moneySignals: [], events: [], relationships: [], observations: [], derived: [] };
  const detail: FoundationBusinessCase = { ...summary, ...empty, valueProfile: buildFoundationValueProfile(summary, empty), bundlesScanned: 0, bundleObjectsListed: 0 };
  const known = adaptFoundationDetailToFinancialEntity({ ...detail, metrics: [metric('mrr', 10000, { unit: 'monthly' })] });
  expect(known.pnl).toMatchObject({ monthlyRevenue: 10000, isRevenueUnconfirmed: false, isMarginUnconfirmed: true, operatingProfit: 0 });
  const zero = adaptFoundationDetailToFinancialEntity({ ...detail, metrics: [metric('mrr', 0, { unit: 'monthly' })] });
  expect(zero.pnl).toMatchObject({ monthlyRevenue: 0, isRevenueUnconfirmed: false, isMarginUnconfirmed: true });
});


it('money labels do not strip magnitude or ranges into fabricated amounts', () => {
  expect(formatHumanMoney('$10M', 'USD')).toBe('$10M');
  expect(formatHumanMoney('10-20', 'USD')).toBe('10-20');
  expect(formatHumanMoney(Infinity, 'USD')).toBe('金額未確認');
  expect(formatHumanMoney(0, 'JPY')).toBe('¥0');
});


it('does not collapse revenue ranges or match undated accounting periods', () => {
  expect(parseRevenueToMonthlyJpy('$10-20M ARR', 'USD', 'ARR').isUnconfirmed).toBe(true);
  const revenue = metric('annual_revenue', 120000, { periodStart: null, periodEnd: null });
  const profit = metric('monthly_operating_profit', 1000, { periodStart: null, periodEnd: null, unit: 'monthly' });
  expect(projectProfitMetrics(10000, revenue, [profit]).isMarginUnconfirmed).toBe(true);
});


it('does not derive zero profit from a percentage when revenue is unknown', () => {
  const revenue = { ...metric('annual_revenue', 0), value: null };
  expect(projectProfitMetrics(0, revenue, [metric('operating_margin', 25, { unit: '%' })])).toMatchObject({ operatingProfit: 0, isMarginUnconfirmed: true });
});


it('keeps a zero-revenue loss amount known without inventing a zero percent margin', () => {
  const revenue = metric('annual_revenue', 0);
  expect(projectProfitMetrics(0, revenue, [metric('operating_profit', -12000), metric('gross_profit', -12000)])).toMatchObject({
    operatingProfit: -1000, isOperatingProfitUnconfirmed: false, isMarginUnconfirmed: true, isGrossMarginUnconfirmed: true,
  });
});
