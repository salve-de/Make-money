import { describe, expect, it } from 'vitest';
import type { FinancialEntity } from '@/shared/terminal';
import { otherCases } from './CompareSimilarCases';

function row(id: string, withMetric: boolean): FinancialEntity {
  const reader = withMetric
    ? { sources: [], facts: [], analysis: [], unknowns: [], metrics: [{ id: `${id}-m`, measure: 'REVENUE', periodKind: 'YEAR', period: '2025', amount: 1000, currency: 'USD', origin: 'SELF_REPORTED', sourceId: 's' }] }
    : undefined;
  return { id, name: id, tags: [], reader } as unknown as FinancialEntity;
}

describe('cases that can be added to a comparison', () => {
  it('excludes compared cases and puts cases with a recorded figure first', () => {
    const rows = [row('a', false), row('b', true), row('c', true), row('d', true)];
    expect(otherCases(rows, ['c']).map((item) => item.id)).toEqual(['b', 'd', 'a']);
  });
});
