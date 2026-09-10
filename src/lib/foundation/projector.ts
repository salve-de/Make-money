import type { FinancialEntity } from '@/platform/types/terminal';

/**
 * The Foundation reader has its own lossless, nullable display model. This
 * legacy adapter is intentionally conservative: only an already-complete
 * Make-Money FinancialEntity may pass through it. A raw Foundation bundle is
 * never converted by inventing revenue, margin, headcount, URLs, or dates.
 */
export function projectBundleToFinancialEntity(input: unknown): FinancialEntity | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const candidate = input as Partial<FinancialEntity>;
  const pnl = candidate.pnl;
  const operations = candidate.operations;
  const strategy = candidate.strategy;
  const operatingExpenses = pnl?.operatingExpenses;

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.tagline !== 'string' ||
    typeof candidate.ticker !== 'string' ||
    typeof candidate.sector !== 'string' ||
    typeof candidate.scale !== 'string' ||
    typeof candidate.founder !== 'string' ||
    typeof candidate.country !== 'string' ||
    typeof candidate.url !== 'string' ||
    typeof candidate.verifiedBadge !== 'boolean' ||
    !pnl ||
    typeof pnl.monthlyRevenue !== 'number' ||
    typeof pnl.cogs !== 'number' ||
    typeof pnl.grossProfit !== 'number' ||
    typeof pnl.grossMargin !== 'number' ||
    typeof pnl.operatingProfit !== 'number' ||
    typeof pnl.operatingMargin !== 'number' ||
    typeof pnl.estimatedAnnualNetProfit !== 'number' ||
    !operatingExpenses ||
    typeof operatingExpenses.serverAndApi !== 'number' ||
    typeof operatingExpenses.advertising !== 'number' ||
    typeof operatingExpenses.subcontracting !== 'number' ||
    typeof operatingExpenses.toolsAndSaaS !== 'number' ||
    typeof operatingExpenses.other !== 'number' ||
    !operations ||
    typeof operations.teamSize !== 'number' ||
    typeof operations.weeklyHours !== 'number' ||
    typeof operations.initialCapitalRequired !== 'number' ||
    typeof operations.automationLevel !== 'number' ||
    !Array.isArray(operations.primaryChannels) ||
    !Array.isArray(operations.toolStack) ||
    !strategy ||
    typeof strategy.blindspot !== 'string' ||
    typeof strategy.moatType !== 'string' ||
    typeof strategy.moatDescription !== 'string' ||
    !Array.isArray(strategy.initialTraction) ||
    !Array.isArray(strategy.actionPlaybook) ||
    typeof candidate.growthRateYoY !== 'number' ||
    typeof candidate.architecturePattern !== 'string' ||
    typeof candidate.pipelineStack !== 'string' ||
    typeof candidate.targetPainWallet !== 'string' ||
    !Array.isArray(candidate.tags)
  ) {
    return null;
  }

  return candidate as FinancialEntity;
}
