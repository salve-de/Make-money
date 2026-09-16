import { describe, expect, it } from 'vitest';
import { GRID_FILTERS, matchesGridFilter, readEntityFilterQuery, type FilterCandidate } from './entity-filter';

const empty = new Set<string>();
const candidate: FilterCandidate = {
  id: 'ent_test', scale: 'SOLO', sector: 'NICHE_SAAS',
  pnl: { operatingMargin: 50 },
  operations: { initialCapitalRequired: 0, isCapitalUnconfirmed: false },
};

describe('PR20 filter behavior contract', () => {
  it('covers every existing grid filter', () => {
    expect(GRID_FILTERS).toEqual(['ALL', 'SOLO', 'HIGH_MARGIN', 'ZERO_CAPITAL', 'MONOPOLY', 'AI_NATIVE', 'BOOKMARKED']);
  });
  it('does not include enterprise companies in SOLO', () => {
    expect(matchesGridFilter(candidate, 'SOLO', empty)).toBe(true);
    expect(matchesGridFilter({ ...candidate, scale: 'ENTERPRISE' }, 'SOLO', empty)).toBe(false);
  });
  it.each([[49.99, false], [50, true], [50.01, true], [0, false]])('HIGH_MARGIN boundary %s', (operatingMargin, expected) => {
    expect(matchesGridFilter({ ...candidate, pnl: { operatingMargin } }, 'HIGH_MARGIN', empty)).toBe(expected);
  });
  it.each([[0, false, true], [1, false, false], [0, true, false]])('ZERO_CAPITAL amount=%s unknown=%s', (initialCapitalRequired, isCapitalUnconfirmed, expected) => {
    expect(matchesGridFilter({ ...candidate, operations: { initialCapitalRequired, isCapitalUnconfirmed } }, 'ZERO_CAPITAL', empty)).toBe(expected);
  });
  it('preserves monopoly, AI and bookmark predicates', () => {
    expect(matchesGridFilter(candidate, 'MONOPOLY', empty)).toBe(false);
    expect(matchesGridFilter({ ...candidate, scale: 'ENTERPRISE' }, 'MONOPOLY', empty)).toBe(true);
    expect(matchesGridFilter(candidate, 'AI_NATIVE', empty)).toBe(false);
    expect(matchesGridFilter({ ...candidate, sector: 'AI_AUTOMATION' }, 'AI_NATIVE', empty)).toBe(true);
    expect(matchesGridFilter(candidate, 'BOOKMARKED', empty)).toBe(false);
    expect(matchesGridFilter(candidate, 'BOOKMARKED', new Set([candidate.id]))).toBe(true);
  });
  it('restores filters and batch from shareable URLs', () => {
    expect(readEntityFilterQuery(new URLSearchParams('filter=SOLO&batch=batch_02'))).toEqual({ filter: 'SOLO', batch: 'batch_02' });
    expect(readEntityFilterQuery(new URLSearchParams('filter=HIGH_MARGIN&batch=batch_01'))).toEqual({ filter: 'HIGH_MARGIN', batch: 'batch_01' });
  });
  it.each(['', 'filter=invalid', 'filter=__proto__', 'filter=constructor&batch='])('resets absent/invalid URL values: %s', (query) => {
    expect(readEntityFilterQuery(new URLSearchParams(query))).toEqual({ filter: 'ALL', batch: 'ALL' });
  });
});
