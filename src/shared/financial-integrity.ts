import type { FinancialEntity, ProfitAndLossStatement } from './terminal';

/** Arithmetic checks do not establish that the underlying reported figures are true. */
export function inspectFinancialIntegrity(pnl: ProfitAndLossStatement) {
  const expenses = Object.values(pnl.operatingExpenses).reduce((sum, value) => sum + value, 0);
  const calculatedProfit = pnl.grossProfit - expenses;
  const profitConflict = !pnl.isCostsUnconfirmed && Math.abs(calculatedProfit - pnl.operatingProfit) > 1;
  const grossConflict = !pnl.isCostsUnconfirmed && Math.abs(pnl.monthlyRevenue - pnl.cogs - pnl.grossProfit) > 1;
  const marginUndefined = pnl.monthlyRevenue <= 0 || !!pnl.isRevenueUnconfirmed;
  const calculatedMargin = marginUndefined ? null : pnl.operatingProfit / pnl.monthlyRevenue * 100;
  // Source margins are usually rounded to one decimal place.
  const marginConflict = calculatedMargin !== null && Math.abs(calculatedMargin - pnl.operatingMargin) > 0.11;
  return { calculatedProfit, calculatedMargin, profitConflict, grossConflict, marginUndefined, marginConflict };
}

/** Keep claims intact; do not silently balance source data or rank an inconsistent margin. */
export function normalizeFinancialEntity(entity: FinancialEntity): FinancialEntity {
  const pnl = entity.pnl;
  const check = inspectFinancialIntegrity(pnl);
  return { ...entity, pnl: { ...pnl,
    isOperatingProfitUnconfirmed: check.profitConflict || check.grossConflict ? true : pnl.isOperatingProfitUnconfirmed,
    isGrossMarginUnconfirmed: check.grossConflict || check.marginUndefined ? true : pnl.isGrossMarginUnconfirmed,
    isMarginUnconfirmed: check.marginUndefined || check.marginConflict || check.profitConflict || check.grossConflict ? true : pnl.isMarginUnconfirmed,
    isNetProfitUnconfirmed: check.profitConflict || check.grossConflict ? true : pnl.isNetProfitUnconfirmed,
  } };
}
