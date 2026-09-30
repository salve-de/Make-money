import { describe, expect, it } from 'vitest';
import type { FinancialEntity } from '@/shared/terminal';
import { caseOutcome, hasRecordedRevenue, isFailureCase } from './case-outcome';

function entity(pnl: Partial<FinancialEntity['pnl']>, extra: Partial<FinancialEntity> = {}): FinancialEntity {
  return {
    tags: [],
    growthRateYoY: 0,
    pnl: { monthlyRevenue: 0, isRevenueUnconfirmed: false, financialStatus: 'REPORTED', ...pnl },
    ...extra,
  } as FinancialEntity;
}

describe('case outcome', () => {
  it('counts only confirmed, positive revenue as a revenue record', () => {
    expect(hasRecordedRevenue(entity({ monthlyRevenue: 1_500_000 }))).toBe(true);
    expect(hasRecordedRevenue(entity({ monthlyRevenue: 1_500_000, isRevenueUnconfirmed: true }))).toBe(false);
    expect(hasRecordedRevenue(entity({ monthlyRevenue: 0 }))).toBe(false);
    expect(hasRecordedRevenue(entity({ monthlyRevenue: 500, financialStatus: 'UNAVAILABLE' }))).toBe(false);
  });

  it('treats post-mortems, hazard verdicts and failure tags as failures before revenue', () => {
    expect(isFailureCase(entity({ financialStatus: 'POST_MORTEM', monthlyRevenue: 9_000_000 }))).toBe(true);
    expect(caseOutcome(entity({ monthlyRevenue: 9_000_000 }, { tags: ['撤退'] }))).toBe('failure');
    expect(caseOutcome(entity({ monthlyRevenue: 9_000_000 }))).toBe('success');
    expect(caseOutcome(entity({ isRevenueUnconfirmed: true }))).toBe('unknown');
  });
});
