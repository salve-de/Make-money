import { describe, expect, it } from 'vitest';
import { catalogQueryHref, readEntityFilterQuery, type CatalogFilters } from './entity-filter';
import { defaultSavedSearchName, describeSearchCondition, hasSavableCondition } from './saved-search-view';

const none: CatalogFilters = { filter: 'ALL', batch: 'ALL', tags: [], bookmarks: [], screener: null };

describe('saved search view', () => {
  it('saves only real conditions, never the saved-case filter', () => {
    expect(hasSavableCondition({ query: '', filters: none })).toBe(false);
    expect(hasSavableCondition({ query: 'AI', filters: none })).toBe(true);
    expect(hasSavableCondition({ query: 'AI', filters: { ...none, filter: 'BOOKMARKED' } })).toBe(false);
    expect(hasSavableCondition({ query: '', filters: { ...none, tags: ['新着'] } })).toBe(true);
  });

  it('describes the condition in plain words and makes a default name', () => {
    const filters: CatalogFilters = { ...none, filter: 'SOLO', tags: ['新着'], screener: { scales: ['SMALL_TEAM'], minMargin: 50, maxCapital: 0, moats: [] } };
    expect(describeSearchCondition({ query: ' AI ', filters })).toEqual(['検索「AI」', '一人で運営', 'タグ: 新着', '規模: 2〜10人', '営業利益率50%以上', '初期資金0円']);
    expect(defaultSavedSearchName({ query: '', filters: none })).toBe('保存した条件');
  });

  it('opens the same condition from a link and reads it back', () => {
    const filters: CatalogFilters = { ...none, filter: 'HIGH_MARGIN', tags: ['新着', 'B2B'], screener: { scales: ['SOLO'], minMargin: 30, maxCapital: null, moats: ['SWITCHING_COST'] } };
    const href = catalogQueryHref('請求書', filters);
    const params = new URL(href, 'http://localhost').searchParams;
    expect(params.get('q')).toBe('請求書');
    expect(readEntityFilterQuery(params)).toEqual({ filter: 'HIGH_MARGIN', batch: 'ALL', tags: ['新着', 'B2B'], screener: filters.screener });
    expect(catalogQueryHref('', none)).toBe('/');
  });

  it('ignores a malformed screener in the link', () => {
    const params = new URLSearchParams({ screener: '{"scales":"SOLO"}', tags: 'a,,a,b' });
    expect(readEntityFilterQuery(params)).toMatchObject({ screener: null, tags: ['a', 'b'] });
  });
});
