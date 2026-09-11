import { expect, it } from 'vitest';
import { buildUserInterestProfile } from './userProfile';
import { INSTITUTIONAL_ENTITIES } from '../data/mockLedgerData';
import type { FinancialEntity } from '../types/terminal';

function entity(id: string, margin: number, unknown = false): FinancialEntity {
  const base = INSTITUTIONAL_ENTITIES[0];
  return { ...base, id, pnl: { ...base.pnl, operatingMargin: margin, isMarginUnconfirmed: unknown } };
}

it('does not infer preferences without history', () => {
  const profile = buildUserInterestProfile(INSTITUTIONAL_ENTITIES, [], []);
  expect(profile).toMatchObject({ bookmarkedCount: 0, viewedCount: 0, preferredSectors: [], preferredScales: [], topTools: [], topMoats: [] });
  expect(profile.averageProfitMargin).toBeUndefined();
  expect(profile.profileSummary).toContain('未確認');
});

it('weights bookmarks by two and views by one, including zero and losses', () => {
  const profile = buildUserInterestProfile([entity('a', 20), entity('b', 0), entity('c', -20)], ['a'], ['a', 'b', 'c', 'c']);
  // a: 3, b: 1, c: 1; repeated viewing IDs are deduplicated.
  expect(profile.averageProfitMargin).toBe(8);
  expect(profile.profileSummary).toContain('加重平均営業利益率: 8%');
  expect(profile.profileSummary).not.toContain('粗利');
});

it('excludes unknown and nonfinite margins from both numerator and denominator', () => {
  const unavailable = entity('unavailable', 99);
  unavailable.pnl.financialStatus = 'UNAVAILABLE';
  const profile = buildUserInterestProfile([entity('known', 0), entity('unknown', 90, true), entity('bad', NaN), unavailable], ['unknown', 'bad', 'unavailable'], ['known']);
  expect(profile.averageProfitMargin).toBe(0);
});

it('omits the margin rather than substituting 75 when all margins are unknown', () => {
  const profile = buildUserInterestProfile([entity('a', 0, true)], ['a'], []);
  expect(profile.averageProfitMargin).toBeUndefined();
  expect(profile.profileSummary).not.toContain('利益率');
});

it('does not derive preferences from stale IDs absent from the catalog', () => {
  const profile = buildUserInterestProfile(INSTITUTIONAL_ENTITIES, ['removed'], []);
  expect(profile.preferredSectors).toEqual([]);
  expect(profile.averageProfitMargin).toBeUndefined();
  expect(profile.profileSummary).toContain('銘柄データがない');
});
