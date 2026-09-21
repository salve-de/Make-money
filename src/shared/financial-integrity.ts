import type { FinancialEntity, ProfitAndLossStatement } from './terminal';

type ReportedMetric = Record<string, unknown>;
type FinancialEntityWithReportedMetrics = FinancialEntity & { reportedMetrics?: unknown };

export type FinancialEvidenceDomain =
  | 'revenue'
  | 'cogs'
  | 'operatingCosts'
  | 'profit'
  | 'netProfit'
  | 'tax'
  | 'growth';

export interface FinancialEvidenceConsistency {
  explicitUnknownDomains: FinancialEvidenceDomain[];
  explicitUnknownEvidence: string[];
  annualRevenueEvidence: string[];
  monthlyRevenueEvidence: string[];
  annualRevenueAmountsJpy: number[];
  monthlyRevenueAmountsJpy: number[];
  revenuePeriodConflict: boolean;
  reasons: string[];
}

const UNKNOWN_MARKER = /未確認|未実施|独立確認(?:していない|は未実施|できていない)|not independently (?:verified|confirmed)|unverified/i;
const REVENUE_SIGNAL = /売上|年商|月商|revenue|sales|turnover/i;
const COGS_SIGNAL = /原価|cogs|cost of goods/i;
const OPERATING_COST_SIGNAL = /営業経費|経費|広告費|広告|外注費|外注|費用|手数料|operating expense|advertising|subcontract|tool(?:s)?|fee(?:s)?/i;
const PROFIT_SIGNAL = /利益|profit|margin/i;
const NET_PROFIT_SIGNAL = /純利益|手残り|net profit|net income|take[- ]?home/i;
const TAX_SIGNAL = /税|tax/i;
const GROWTH_SIGNAL = /成長率|growth/i;
const ANNUAL_REVENUE_SIGNAL = /年商|年間(?:売上|収益)|annual\s+(?:side\s+hustle\s+)?(?:revenue|sales|turnover)|(?:revenue|sales|turnover).{0,40}(?:annual|yearly|last year|per year)|(?:annual|yearly).{0,40}(?:revenue|sales|turnover)/i;
const MONTHLY_REVENUE_SIGNAL = /月商|月次(?:売上|収益)|monthly\s+(?:revenue|sales|turnover)|(?:revenue|sales|turnover).{0,40}(?:monthly|per month)|(?:in|for|at|best)\s+(?:a\s+)?month|月(?:間|に).{0,20}(?:売上|収益)|(?:売上|収益).{0,20}月/i;

function addDomain(domains: Set<FinancialEvidenceDomain>, domain: FinancialEvidenceDomain): void {
  domains.add(domain);
}

function metricText(metric: ReportedMetric): string {
  return [metric.original, metric.context]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .trim();
}

function metricPeriod(metric: ReportedMetric): 'annual' | 'monthly' | null {
  const unit = typeof metric.unit === 'string' ? metric.unit.toUpperCase() : '';
  const context = metricText(metric);
  if (unit === 'ANNUAL_REVENUE' || /ANNUAL.*REVENUE/.test(unit) || ANNUAL_REVENUE_SIGNAL.test(context)) return 'annual';
  if (unit === 'MONTHLY_REVENUE' || unit === 'MRR' || /MONTHLY.*REVENUE/.test(unit) || MONTHLY_REVENUE_SIGNAL.test(context)) return 'monthly';
  return null;
}

function metricAmountJpy(metric: ReportedMetric): number | null {
  return typeof metric.jpyAmount === 'number' && Number.isFinite(metric.jpyAmount) ? metric.jpyAmount : null;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function splitFinancialEvidenceClauses(text: string): string[] {
  return text
    .split(/[。！？?!\n;；]+|\.(?=\s+)/)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

/**
 * Detects explicit source limitations and period contradictions without changing
 * the stored evidence or guessing a missing month/year conversion.
 */
export function inspectFinancialEvidenceConsistency(entity: FinancialEntity): FinancialEvidenceConsistency {
  const extended = entity as FinancialEntityWithReportedMetrics;
  const observationTexts = [
    ...(entity.observations ?? []),
    ...(entity.observationsStream ?? []).map((observation) => observation.text),
  ].filter((text): text is string => typeof text === 'string' && text.trim().length > 0);
  const metrics = Array.isArray(extended.reportedMetrics)
    ? extended.reportedMetrics.filter((metric): metric is ReportedMetric => Boolean(metric && typeof metric === 'object'))
    : [];
  const metricTexts = metrics.map(metricText).filter(Boolean);
  const domains = new Set<FinancialEvidenceDomain>();
  const explicitUnknownEvidence: string[] = [];

  for (const text of observationTexts) {
    for (const clause of splitFinancialEvidenceClauses(text)) {
      if (!UNKNOWN_MARKER.test(clause)) continue;
      const hasFinancialUnknownSignal = [
        REVENUE_SIGNAL,
        COGS_SIGNAL,
        OPERATING_COST_SIGNAL,
        PROFIT_SIGNAL,
        NET_PROFIT_SIGNAL,
        TAX_SIGNAL,
        GROWTH_SIGNAL,
      ].some((signal) => signal.test(clause));
      if (REVENUE_SIGNAL.test(clause)) addDomain(domains, 'revenue');
      if (COGS_SIGNAL.test(clause)) addDomain(domains, 'cogs');
      if (OPERATING_COST_SIGNAL.test(clause)) addDomain(domains, 'operatingCosts');
      if (PROFIT_SIGNAL.test(clause)) addDomain(domains, 'profit');
      if (NET_PROFIT_SIGNAL.test(clause)) addDomain(domains, 'netProfit');
      if (TAX_SIGNAL.test(clause)) addDomain(domains, 'tax');
      if (GROWTH_SIGNAL.test(clause)) addDomain(domains, 'growth');
      if (hasFinancialUnknownSignal) explicitUnknownEvidence.push(clause);
    }
  }

  const annualRevenueEvidence = uniqueStrings([
    ...observationTexts.filter((text) => ANNUAL_REVENUE_SIGNAL.test(text)),
    ...metricTexts.filter((text) => ANNUAL_REVENUE_SIGNAL.test(text)),
  ]);
  const monthlyRevenueEvidence = uniqueStrings([
    ...observationTexts.filter((text) => MONTHLY_REVENUE_SIGNAL.test(text)),
    ...metricTexts.filter((text) => MONTHLY_REVENUE_SIGNAL.test(text)),
  ]);
  const annualRevenueAmountsJpy = metrics
    .filter((metric) => metricPeriod(metric) === 'annual')
    .map(metricAmountJpy)
    .filter((amount): amount is number => amount !== null);
  const monthlyRevenueAmountsJpy = metrics
    .filter((metric) => metricPeriod(metric) === 'monthly')
    .map(metricAmountJpy)
    .filter((amount): amount is number => amount !== null);

  const hasAnnualRevenueEvidence = annualRevenueEvidence.length > 0 || annualRevenueAmountsJpy.length > 0;
  const hasMonthlyRevenueEvidence = monthlyRevenueEvidence.length > 0 || monthlyRevenueAmountsJpy.length > 0;
  const hasMatchingMonthlyAmount = monthlyRevenueAmountsJpy.some(
    (amount) => Math.abs(amount - entity.pnl.monthlyRevenue) <= 1,
  );
  const revenuePeriodConflict = hasAnnualRevenueEvidence && (
    !hasMonthlyRevenueEvidence || (
      monthlyRevenueAmountsJpy.length > 0 &&
      entity.pnl.monthlyRevenue > 0 &&
      !hasMatchingMonthlyAmount
    )
  );

  const reasons: string[] = [];
  if (domains.size > 0) {
    reasons.push('既存観測に財務項目の未確認・独立未確認があるため、該当する派生P&Lをunknown/hold表示。');
  }
  if (revenuePeriodConflict) {
    reasons.push(hasMonthlyRevenueEvidence
      ? '既存根拠の年次売上と月次売上がP&Lの月次値に一致しないため、年/月換算を行わず売上と派生P&Lをunknown/hold表示。'
      : '既存根拠は年次売上を示すがP&Lの月次値を裏付ける根拠がないため、年/月換算を行わず売上と派生P&Lをunknown/hold表示。');
  }

  return {
    explicitUnknownDomains: [...domains],
    explicitUnknownEvidence: uniqueStrings(explicitUnknownEvidence),
    annualRevenueEvidence,
    monthlyRevenueEvidence,
    annualRevenueAmountsJpy,
    monthlyRevenueAmountsJpy,
    revenuePeriodConflict,
    reasons,
  };
}

/** Project explicit evidence limits onto display flags while preserving source numbers. */
export function reconcileFinancialEvidence(entity: FinancialEntity): FinancialEntity {
  const audit = inspectFinancialEvidenceConsistency(entity);
  const domains = new Set(audit.explicitUnknownDomains);
  const hasCogsUnknown = domains.has('cogs');
  const hasOperatingCostsUnknown = domains.has('operatingCosts');
  const hasCostsUnknown = hasCogsUnknown || hasOperatingCostsUnknown;
  const hasProfitUnknown = domains.has('profit');
  const hasNetProfitUnknown = domains.has('netProfit');
  const hasTaxUnknown = domains.has('tax');
  const hasRevenueUnknown = domains.has('revenue') || audit.revenuePeriodConflict;
  const hasDerivedProfitUnknown = hasRevenueUnknown || hasCostsUnknown || hasProfitUnknown;
  const pnl = { ...entity.pnl };

  if (hasRevenueUnknown) pnl.isRevenueUnconfirmed = true;
  if (hasRevenueUnknown) {
    pnl.isGrossProfitUnconfirmed = true;
    pnl.isGrossMarginUnconfirmed = true;
  }
  if (hasCogsUnknown) {
    pnl.isCogsUnconfirmed = true;
    pnl.isGrossProfitUnconfirmed = true;
    pnl.isGrossMarginUnconfirmed = true;
  }
  if (hasCostsUnknown) pnl.isCostsUnconfirmed = true;
  if (hasDerivedProfitUnknown) {
    pnl.isOperatingProfitUnconfirmed = true;
    pnl.isMarginUnconfirmed = true;
    pnl.isNetProfitUnconfirmed = true;
  }
  if (hasNetProfitUnknown || hasTaxUnknown) pnl.isNetProfitUnconfirmed = true;

  const unknownsNotes = [...(entity.unknownsNotes ?? [])];
  for (const reason of audit.reasons) {
    if (!unknownsNotes.includes(reason)) unknownsNotes.push(reason);
  }

  // Do not replace an already audited label (for example, a documented peak).
  // Newly detected period conflicts receive a non-numeric hold label instead.
  if (audit.revenuePeriodConflict && !entity.pnl.isRevenueUnconfirmed) {
    pnl.revenueLabel = '売上期間未確認（年次根拠のみ。月次換算なし）';
  }

  return {
    ...entity,
    pnl,
    isGrowthUnconfirmed: domains.has('growth') ? true : entity.isGrowthUnconfirmed,
    unknownsNotes: unknownsNotes.length > 0 ? unknownsNotes : entity.unknownsNotes,
  };
}

/** Arithmetic checks do not establish that the underlying reported figures are true. */
export function inspectFinancialIntegrity(pnl: ProfitAndLossStatement) {
  const expenses = Object.values(pnl.operatingExpenses).reduce((sum, value) => sum + value, 0);
  const calculatedProfit = pnl.grossProfit - expenses;
  const profitConflict = !pnl.isCostsUnconfirmed && Math.abs(calculatedProfit - pnl.operatingProfit) > 1;
  const cogsUnknown = pnl.isCogsUnconfirmed ?? pnl.isCostsUnconfirmed;
  const grossConflict = !cogsUnknown && Math.abs(pnl.monthlyRevenue - pnl.cogs - pnl.grossProfit) > 1;
  const marginUndefined = pnl.monthlyRevenue <= 0 || !!pnl.isRevenueUnconfirmed;
  const calculatedMargin = marginUndefined ? null : pnl.operatingProfit / pnl.monthlyRevenue * 100;
  // Source margins are usually rounded to one decimal place.
  const marginConflict = calculatedMargin !== null && Math.abs(calculatedMargin - pnl.operatingMargin) > 0.11;
  return { calculatedProfit, calculatedMargin, profitConflict, grossConflict, marginUndefined, marginConflict };
}

/** Keep claims intact; do not silently balance source data or rank an inconsistent margin. */
export function normalizeFinancialEntity(entity: FinancialEntity): FinancialEntity {
  const reconciled = reconcileFinancialEvidence(entity);
  const pnl = reconciled.pnl;
  const check = inspectFinancialIntegrity(pnl);
  return { ...reconciled, pnl: { ...pnl,
    isOperatingProfitUnconfirmed: check.profitConflict || check.grossConflict ? true : pnl.isOperatingProfitUnconfirmed,
    isGrossProfitUnconfirmed: check.grossConflict ? true : pnl.isGrossProfitUnconfirmed,
    isGrossMarginUnconfirmed: check.grossConflict || check.marginUndefined ? true : pnl.isGrossMarginUnconfirmed,
    isMarginUnconfirmed: check.marginUndefined || check.marginConflict || check.profitConflict || check.grossConflict ? true : pnl.isMarginUnconfirmed,
    isNetProfitUnconfirmed: check.profitConflict || check.grossConflict ? true : pnl.isNetProfitUnconfirmed,
  } };
}
