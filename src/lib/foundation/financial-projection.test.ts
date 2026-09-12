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
    expect(parseRevenueToMonthlyJpy(12000, undefined, 'ARR').isUnconfirmed).toBe(true);
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
    { periodEnd: '2024-12-31' }, { currency: 'USD' }, { verificationStatus: 'UNVERIFIED' }, { scope: 'subsidiary' }, { pointInTime: '2025-12-31' },
  ] as Partial<FoundationMetricSignal>[])('rejects incompatible profit %j', override => {
    expect(projectProfitMetrics(10000, revenue, [metric('operating_profit', 24000, override)]).isMarginUnconfirmed).toBe(true);
  });
  it('uses explicit percentage margins only with a percentage unit', () => {
    expect(projectProfitMetrics(10000, revenue, [metric('operating_margin', 25, { unit: '%' })])).toMatchObject({ operatingProfit: 2500, operatingMargin: 25, isMarginUnconfirmed: false });
    expect(projectProfitMetrics(10000, revenue, [metric('operating_margin', 25)]).isMarginUnconfirmed).toBe(true);
  });

  it('uses bounded period dates for generic revenue and ignores free-form basis wording', () => {
    const revenue = metric('revenue', 1_987_000, {
      unit: 'USD', currency: 'USD', periodStart: '2025-10-01T00:00:00Z', periodEnd: '2025-10-31T23:59:59Z',
      basis: 'Monthly recognized revenue; rounded.', scope: 'Buffer company',
    });
    const cogs = metric('cogs', 325_868, {
      unit: 'USD', currency: 'USD', periodStart: revenue.periodStart, periodEnd: revenue.periodEnd,
      basis: 'Calculated: rounded revenue * (1 - gross margin).', scope: revenue.scope,
    });

    expect(parseRevenueToMonthlyJpy(revenue.value, revenue.currency, `${revenue.metricType} ${revenue.unit}`, revenue.periodStart, revenue.periodEnd)).toMatchObject({
      monthlyJpy: 298_050_000, isUnconfirmed: false,
    });
    expect(projectProfitMetrics(298_050_000, revenue, [revenue, cogs])).toMatchObject({
      cogs: 48_880_200, isCogsUnconfirmed: false,
    });
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
  const detail: FoundationBusinessCase = { ...summary, ...empty, valueProfile: buildFoundationValueProfile(summary, empty), bundlesScanned: 0, bundleObjectsListed: 0, bundleScanComplete: true };
  const known = adaptFoundationDetailToFinancialEntity({ ...detail, metrics: [metric('mrr', 10000, { unit: 'monthly' })] });
  expect(known.pnl).toMatchObject({ monthlyRevenue: 10000, isRevenueUnconfirmed: false, isMarginUnconfirmed: true, operatingProfit: 0 });
  const zero = adaptFoundationDetailToFinancialEntity({ ...detail, metrics: [metric('mrr', 0, { unit: 'monthly' })] });
  expect(zero.pnl).toMatchObject({ monthlyRevenue: 0, isRevenueUnconfirmed: false, isMarginUnconfirmed: true });
});

it('keeps absent detail facts explicitly unknown instead of inventing an operating profile', () => {
  const summary: FoundationEntitySummary = { id: 'unknown', name: 'Unknown', entityType: 'business', aliases: [], canonicalIdentifier: null, domain: null, status: 'active', observedAt: null, evidenceIds: [] };
  const empty = { claims: [], metrics: [], moneySignals: [], events: [], relationships: [], observations: [], derived: [] };
  const detail: FoundationBusinessCase = { ...summary, ...empty, valueProfile: buildFoundationValueProfile(summary, empty), bundlesScanned: 0, bundleObjectsListed: 0, bundleScanComplete: true };
  const entity = adaptFoundationDetailToFinancialEntity(detail);

  expect(entity.scale).toBe('UNKNOWN');
  expect(entity.country).toBe('未確認');
  expect(entity.verifiedBadge).toBe(false);
  expect(entity.growthRateYoY).toBe(0);
  expect(entity.isGrowthUnconfirmed).toBe(true);
  expect(entity.operations).toMatchObject({
    teamSize: 0,
    isTeamSizeUnconfirmed: true,
    weeklyHours: 0,
    isWeeklyHoursUnconfirmed: true,
    initialCapitalRequired: 0,
    isCapitalUnconfirmed: true,
    automationLevel: 0,
    isAutomationUnconfirmed: true,
    primaryChannels: [],
    toolStack: [],
  });
  expect(entity.temporal).toMatchObject({ foundedYear: 0, viabilityStatus: 'UNKNOWN', dataSnapshotPeriod: '観測時期未確認' });
  expect(entity.strategy.moatType).toBe('UNKNOWN');
  expect(entity.evidenceCards?.map((card) => card.evidenceStatus)).toEqual(['UNKNOWN', 'UNKNOWN', 'ESTIMATED']);
  expect(entity.dynamicMoats).toEqual({});
  expect(entity.exposureAudit).toMatchObject({
    guerrillaTraction: '初期顧客獲得は未確認',
    platformGlitch: 'プラットフォーム施策は未確認',
    pivotSnapshot: 'ピボット履歴は未確認',
    hiddenStackCost: '原価内訳は未確認',
  });
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
    operatingProfit: -1000, isOperatingProfitUnconfirmed: false, isMarginUnconfirmed: true, isGrossProfitUnconfirmed: false, isGrossMarginUnconfirmed: true,
  });
});

it('does not promote unsupported Foundation facts into confirmed adapter fields', () => {
  const summary: FoundationEntitySummary = { id: 'unverified', name: 'Unverified', entityType: 'business', aliases: [], canonicalIdentifier: null, domain: null, status: 'active', observedAt: null, evidenceIds: [] };
  const empty = { claims: [], metrics: [], moneySignals: [], events: [], relationships: [], observations: [], derived: [] };
  const detail: FoundationBusinessCase = {
    ...summary,
    ...empty,
    metrics: [metric('mrr', 10000, { verificationStatus: 'UNVERIFIED', originType: 'reported' })],
    events: [{
      id: 'event-1', eventType: 'launch', occurredAt: '2024-01-01', description: '未確認のローンチ記録',
      verificationStatus: 'UNVERIFIED', confidence: null, evidenceIds: [],
    }],
    relationships: [{
      id: 'relationship-1', subjectEntityId: 'unverified', predicate: 'uses', object: '外部サービス',
      validFrom: '2024-01-01', validTo: null, verificationStatus: 'UNVERIFIED', confidence: null, evidenceIds: [],
    }],
    observations: [{
      id: 'observation-1', kind: null, text: '未確認の観測', originType: 'not-a-valid-origin', verificationStatus: 'unknown',
      observedAt: null, collectionTier: null, collectionChannel: null, evidenceIds: [],
    }],
    valueProfile: buildFoundationValueProfile(summary, { ...empty, metrics: [metric('mrr', 10000, { verificationStatus: 'UNVERIFIED', originType: 'reported' })] }),
    bundlesScanned: 1,
    bundleObjectsListed: 1,
    bundleScanComplete: true,
  };
  const entity = adaptFoundationDetailToFinancialEntity(detail);

  expect(entity.pnl).toMatchObject({ monthlyRevenue: 0, isRevenueUnconfirmed: true, financialStatus: 'UNAVAILABLE' });
  expect(entity.operations).toMatchObject({ teamSize: 0, isTeamSizeUnconfirmed: true });
  expect(entity.observationsStream?.[0]).toMatchObject({ originType: 'unknown', verificationStatus: 'UNVERIFIED' });
  expect(entity.observationsStream?.find((observation) => observation.id === 'mrr_metric')).toMatchObject({
    category: 'RESEARCH_LIMIT', categoryLabel: '未検証財務候補', verificationStatus: 'UNVERIFIED',
  });
  expect(entity.timelineEvents).toEqual([]);
  expect(entity.observationsStream?.find((observation) => observation.id === 'event-1_event')).toMatchObject({
    category: 'RESEARCH_LIMIT', verificationStatus: 'UNVERIFIED', originType: 'unknown',
  });
  expect(entity.observationsStream?.find((observation) => observation.id === 'relationship-1_relationship')).toMatchObject({
    category: 'RESEARCH_LIMIT', categoryLabel: '未検証関係候補', verificationStatus: 'UNVERIFIED', originType: 'unknown',
  });
});
