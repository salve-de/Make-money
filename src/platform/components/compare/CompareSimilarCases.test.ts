import { describe, expect, it } from 'vitest';
import type { FinancialEntity } from '@/shared/terminal';
import { splitSimilarCases } from './CompareSimilarCases';

function row(id: string, revenue: number, extra: Partial<FinancialEntity> = {}): FinancialEntity {
  return { id, name: id, tags: [], pnl: { monthlyRevenue: revenue, isRevenueUnconfirmed: revenue === 0, financialStatus: 'REPORTED' }, ...extra } as FinancialEntity;
}

describe('similar cases for comparison', () => {
  it('splits failures from revenue records, excludes compared cases and sorts by revenue', () => {
    const rows = [
      row('a', 1_000_000),
      row('b', 5_000_000),
      row('c', 0),
      row('d', 2_000_000, { pnl: { monthlyRevenue: 2_000_000, isRevenueUnconfirmed: false, financialStatus: 'POST_MORTEM' } as FinancialEntity['pnl'] }),
      row('e', 9_000_000),
    ];
    const { failures, successes } = splitSimilarCases(rows, ['e']);
    expect(failures.map((item) => item.id)).toEqual(['d']);
    expect(successes.map((item) => item.id)).toEqual(['b', 'a']);
  });
});
