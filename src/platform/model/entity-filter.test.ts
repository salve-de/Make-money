import { describe, expect, it } from 'vitest';
import type { FinancialEntity } from '@/shared/terminal';
import {
  GRID_FILTERS,
  collectedEntityIds,
  countFacetMatches,
  countScreenerMatches,
  facetRowOf,
  matchesCatalogQuery,
  matchesGridFilter,
  matchesTaxonomySelection,
  readEntityFilterQuery,
  type FilterCandidate,
} from './entity-filter';

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
    // キーワードからの推測の業種では絞り込まない
    expect(matchesGridFilter({ ...candidate, sector: 'AI_AUTOMATION' }, 'AI_NATIVE', empty)).toBe(false);
    expect(matchesGridFilter({ ...candidate, sector: 'AI_AUTOMATION', sectorBasis: { source: 'SOURCED_DESCRIPTION', note: '主要説明文の語: AI' } }, 'AI_NATIVE', empty)).toBe(false);
    expect(matchesGridFilter({ ...candidate, sector: 'AI_AUTOMATION', sectorBasis: { source: 'SEC_SIC', note: 'SIC 7372' } }, 'AI_NATIVE', empty)).toBe(true);
    expect(matchesGridFilter(candidate, 'BOOKMARKED', empty)).toBe(false);
    expect(matchesGridFilter(candidate, 'BOOKMARKED', new Set([candidate.id]))).toBe(true);
  });
  it('restores filters and batch from shareable URLs', () => {
    expect(readEntityFilterQuery(new URLSearchParams('filter=SOLO&batch=batch_02'))).toEqual({ filter: 'SOLO', batch: 'batch_02', tags: [], screener: null });
    expect(readEntityFilterQuery(new URLSearchParams('filter=HIGH_MARGIN&batch=batch_01'))).toEqual({ filter: 'HIGH_MARGIN', batch: 'batch_01', tags: [], screener: null });
  });
  it.each(['', 'filter=invalid', 'filter=__proto__', 'filter=constructor&batch='])('resets absent/invalid URL values: %s', (query) => {
    expect(readEntityFilterQuery(new URLSearchParams(query))).toEqual({ filter: 'ALL', batch: 'ALL', tags: [], screener: null });
  });
  it('approves only collected entities from the rows already visible to the user', () => {
    const visible = [
      { id: 'ent_visible_collected', tags: ['収集事例', 'SaaS'] },
      { id: 'ent_visible_curated', tags: ['SaaS'] },
    ];
    expect(collectedEntityIds(visible)).toEqual(['ent_visible_collected']);

    const hiddenElsewhere = { id: 'ent_hidden_collected', tags: ['収集事例'] };
    expect(collectedEntityIds(visible)).not.toContain(hiddenElsewhere.id);
  });
});

describe('絞り込み欄の0件判定', () => {
  // 公開中の事例と同じく、規模・利益率・初期資金・参入障壁がどれも未設定の事例
  const unknown = {
    id: 'ent_unknown', name: 'Unknown', ticker: '', tagline: '', tags: [], scale: 'UNKNOWN', sector: 'UNKNOWN',
    pnl: { operatingMargin: 0 }, operations: { initialCapitalRequired: 0, isCapitalUnconfirmed: true }, strategy: { moatType: 'UNKNOWN' },
  } as unknown as FinancialEntity;
  const solo = { ...unknown, id: 'ent_solo', scale: 'SOLO', pnl: { operatingMargin: 60 } } as unknown as FinancialEntity;
  const none = { scales: [], minMargin: 0, maxCapital: null, moats: [] };

  it('値が未設定の事例だけなら、どの条件も0件になる', () => {
    expect(countScreenerMatches([unknown], { ...none, scales: ['SOLO'] })).toBe(0);
    expect(countScreenerMatches([unknown], { ...none, minMargin: 30 })).toBe(0);
    expect(countScreenerMatches([unknown], { ...none, maxCapital: 0 })).toBe(0);
    expect(countScreenerMatches([unknown], { ...none, moats: ['SWITCHING_COST'] })).toBe(0);
  });
  it('当たる事例があれば、その件数を数える（一覧の絞り込みと同じ規則）', () => {
    expect(countScreenerMatches([unknown, solo], { ...none, scales: ['SOLO'] })).toBe(1);
    expect(countScreenerMatches([unknown, solo], { ...none, minMargin: 50 })).toBe(1);
    expect(countScreenerMatches([unknown, solo], { ...none, minMargin: 80 })).toBe(0);
  });
});

describe('タグの絞り込み（決まった言葉の一覧）', () => {
  const entityWith = (id: string, tags: { field: string; form: string; buyer: string; features: string[] }) => ({
    ...candidate, id, name: id, tagline: '', tags: [], reader: { display: { tags } },
  }) as unknown as FinancialEntity;
  const a = entityWith('a', { field: '開発・IT', form: 'ソフト・アプリ', buyer: '開発者向け', features: [] });
  const b = entityWith('b', { field: '開発・IT', form: '講座・教材', buyer: '個人向け', features: [] });
  const c = entityWith('c', { field: '住まい・不動産', form: 'ソフト・アプリ', buyer: '個人向け', features: ['AI'] });
  const pick = (selectedTags: string[]) => [a, b, c].filter((e) => matchesCatalogQuery(e, '', { filter: 'ALL', batch: 'ALL', tags: [], bookmarks: [], screener: { scales: [], minMargin: 0, maxCapital: null, moats: [], selectedTags } })).map((e) => e.id);
  it('「開発・IT」を選ぶと、分野が開発・ITの事例だけが残る', () => {
    expect(pick(['開発・IT'])).toEqual(['a', 'b']);
  });
  it('同じ軸の中で複数選ぶと「どれか」', () => {
    expect(pick(['開発・IT', '住まい・不動産'])).toEqual(['a', 'b', 'c']);
  });
  it('軸をまたいで選ぶと「全部」', () => {
    expect(pick(['開発・IT', 'ソフト・アプリ'])).toEqual(['a']);
    expect(pick(['個人向け', 'AI'])).toEqual(['c']);
    expect(pick(['講座・教材', 'AI'])).toEqual([]);
  });
  it('選ばなければ全部。一覧にない言葉（古い保存条件の自由な言葉）は絞り込みに使わない', () => {
    expect(pick([])).toEqual(['a', 'b', 'c']);
    expect(pick(['内装のAI'])).toEqual(['a', 'b', 'c']);
    expect(matchesTaxonomySelection([], ['開発・IT'])).toBe(false);
  });
});

describe('件数用の最小の値（全件の件数を最初から出す）', () => {
  const base = { scale: 'SOLO', pnl: { operatingMargin: 60 }, operations: { initialCapitalRequired: 0, isCapitalUnconfirmed: false }, strategy: { moatType: 'SWITCHING_COST' }, reader: { display: { tags: { field: '開発・IT', form: 'ソフト・アプリ', buyer: '個人向け', features: ['定期課金'] } } } };
  const none = { scales: [], minMargin: 0, maxCapital: null, moats: [] };
  it('事例から最小の値を作り、未確認の初期資金は null にする', () => {
    const row = facetRowOf(base as never);
    expect(row).toMatchObject({ scale: 'SOLO', margin: 60, capital: 0, moat: 'SWITCHING_COST' });
    expect(row.words).toContain('開発・IT');
    expect(facetRowOf({ ...base, operations: { initialCapitalRequired: 0, isCapitalUnconfirmed: true } } as never).capital).toBeNull();
  });
  it('事例そのもので数えた件数と、最小の値で数えた件数が一致する', () => {
    const entities = [base, { ...base, scale: 'ENTERPRISE', pnl: { operatingMargin: 20 } }] as never[];
    const rows = (entities as never[]).map(facetRowOf);
    for (const screener of [{ ...none, scales: ['SOLO'] }, { ...none, minMargin: 50 }, { ...none, maxCapital: 0 }, { ...none, selectedTags: ['開発・IT'] }, { ...none, selectedTags: ['健康・美容'] }]) {
      expect(countFacetMatches(rows, screener)).toBe(countScreenerMatches(entities, screener));
    }
    expect(countFacetMatches(rows, { ...none, selectedTags: ['開発・IT'] })).toBe(2);
    expect(countFacetMatches(rows, { ...none, selectedTags: ['健康・美容'] })).toBe(0);
  });
});
