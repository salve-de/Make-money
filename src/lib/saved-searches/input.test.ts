import { describe, expect, it } from 'vitest';
import type { CatalogFilters } from '@/platform/model/entity-filter';
import type { SavedSearchFilters } from '@/shared/saved-search';
import {
  normalizeSavedSearchFilters,
  parseSavedSearchInput,
  parseSavedSearchPatch,
  SavedSearchValidationError,
} from './input';

// `shared` cannot import `platform`, so the filter shape is declared twice. This assignment
// stops compiling the moment the two shapes differ in either direction.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const sameShape: Equal<SavedSearchFilters, CatalogFilters> = true;

const emptyFilters = { filter: 'ALL', batch: 'ALL', tags: [], bookmarks: [], screener: null };
const validInput = { name: '高利益率の一人事業', query: 'AI', filters: emptyFilters, notify: true };

function messageOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(SavedSearchValidationError);
    return (error as Error).message;
  }
  throw new Error('expected a validation error');
}

describe('saved search filter shape', () => {
  it('stays identical to CatalogFilters', () => {
    expect(sameShape).toBe(true);
  });
});

describe('parseSavedSearchInput', () => {
  it('accepts a complete input and trims the text', () => {
    expect(parseSavedSearchInput({ ...validInput, name: '  名前  ', query: '  AI  ' })).toEqual({
      name: '名前', query: 'AI', filters: emptyFilters, notify: true,
    });
  });

  it('defaults notify to on and keeps an explicit off', () => {
    const withoutNotify = { name: validInput.name, query: validInput.query, filters: validInput.filters };
    expect(parseSavedSearchInput(withoutNotify).notify).toBe(true);
    expect(parseSavedSearchInput({ ...validInput, notify: false }).notify).toBe(false);
  });

  it('allows an empty search word, because filters alone can be a condition', () => {
    expect(parseSavedSearchInput({ ...validInput, query: '' }).query).toBe('');
  });

  describe('name', () => {
    it.each([
      ['missing', undefined],
      ['not text', 5],
      ['empty', ''],
      ['only spaces', '   '],
      ['61 characters', 'あ'.repeat(61)],
      ['a line break', '一行目\n二行目'],
      ['a control character', 'a\u0007b'],
    ])('rejects %s', (_label, name) => {
      expect(messageOf(() => parseSavedSearchInput({ ...validInput, name }))).toBe('名前は1〜60文字で入力してください');
    });

    it('accepts exactly 60 characters', () => {
      expect(parseSavedSearchInput({ ...validInput, name: 'あ'.repeat(60) }).name).toHaveLength(60);
    });

    it('counts a character as one even when it needs two UTF-16 units', () => {
      expect(parseSavedSearchInput({ ...validInput, name: '😀'.repeat(60) }).name).toBe('😀'.repeat(60));
      expect(() => parseSavedSearchInput({ ...validInput, name: '😀'.repeat(61) })).toThrow(SavedSearchValidationError);
    });
  });

  describe('query', () => {
    it('accepts exactly 200 characters and rejects 201', () => {
      expect(parseSavedSearchInput({ ...validInput, query: 'あ'.repeat(200) }).query).toHaveLength(200);
      expect(messageOf(() => parseSavedSearchInput({ ...validInput, query: 'あ'.repeat(201) }))).toBe('検索語は200文字までです');
    });

    it.each([undefined, null, 5, {}])('rejects a non-text query %j', (query) => {
      expect(() => parseSavedSearchInput({ ...validInput, query })).toThrow(SavedSearchValidationError);
    });

    it('rejects control characters', () => {
      expect(() => parseSavedSearchInput({ ...validInput, query: 'a\nb' })).toThrow(SavedSearchValidationError);
    });
  });

  describe('body shape', () => {
    it.each([null, undefined, [], 'text', 5, true])('rejects %j', (body) => {
      expect(() => parseSavedSearchInput(body)).toThrow(SavedSearchValidationError);
    });

    it('rejects fields it does not know, so nothing else can be smuggled into a row', () => {
      expect(() => parseSavedSearchInput({ ...validInput, userId: 'someone-else' })).toThrow(SavedSearchValidationError);
      expect(() => parseSavedSearchInput({ ...validInput, id: 'chosen-id' })).toThrow(SavedSearchValidationError);
      expect(() => parseSavedSearchInput({ ...validInput, createdAt: 1 })).toThrow(SavedSearchValidationError);
    });

    it('rejects a notify value that is not true or false', () => {
      for (const notify of ['true', 1, 0, null]) {
        expect(messageOf(() => parseSavedSearchInput({ ...validInput, notify }))).toBe('通知の指定が正しくありません');
      }
    });
  });

  describe('filters', () => {
    it('never stores bookmarks, whatever the screen had loaded', () => {
      const parsed = parseSavedSearchInput({ ...validInput, filters: { ...emptyFilters, bookmarks: ['ent_a_1', 'ent_b_2'] } });
      expect(parsed.filters.bookmarks).toEqual([]);
    });

    it('refuses the saved-cases list as a condition', () => {
      expect(messageOf(() => parseSavedSearchInput({ ...validInput, filters: { ...emptyFilters, filter: 'BOOKMARKED' } })))
        .toBe('保存した事例の一覧は条件として保存できません');
    });

    it.each([
      ['a filter option that does not exist', { ...emptyFilters, filter: 'EVERYTHING' }],
      ['tags that are not a list', { ...emptyFilters, tags: 'AI' }],
      ['a tag that is not text', { ...emptyFilters, tags: [1] }],
      ['a batch that is not text', { ...emptyFilters, batch: 3 }],
      ['no screener field at all', { filter: 'ALL', batch: 'ALL', tags: [], bookmarks: [] }],
      ['a screener with a non-numeric margin', { ...emptyFilters, screener: { scales: [], minMargin: 'high', maxCapital: null, moats: [] } }],
      ['a screener with a non-list scales field', { ...emptyFilters, screener: { scales: 'SOLO', minMargin: 0, maxCapital: null, moats: [] } }],
      ['something that is not an object', 'ALL'],
      ['nothing', undefined],
    ])('rejects %s', (_label, filters) => {
      expect(messageOf(() => parseSavedSearchInput({ ...validInput, filters }))).toContain('絞り込み条件');
    });

    it('keeps every valid filter option except the saved-cases list', () => {
      for (const filter of ['ALL', 'SOLO', 'HIGH_MARGIN', 'ZERO_CAPITAL', 'MONOPOLY', 'AI_NATIVE']) {
        expect(parseSavedSearchInput({ ...validInput, filters: { ...emptyFilters, filter } }).filters.filter).toBe(filter);
      }
    });

    it('keeps a valid screener and its tags', () => {
      const screener = { scales: ['SOLO'], minMargin: 40, maxCapital: 100_000, moats: ['DATA'], selectedTags: ['B2B'] };
      const parsed = parseSavedSearchInput({ ...validInput, filters: { ...emptyFilters, tags: ['完全1人'], batch: 'batch-1', screener } });
      expect(parsed.filters).toEqual({ filter: 'ALL', batch: 'batch-1', tags: ['完全1人'], bookmarks: [], screener });
    });

    it('accepts a screener without a capital ceiling or selected tags', () => {
      const screener = { scales: [], minMargin: 0, maxCapital: null, moats: [] };
      expect(parseSavedSearchInput({ ...validInput, filters: { ...emptyFilters, screener } }).filters.screener).toEqual(screener);
    });

    it('rebuilds the filters from known fields, so extra properties are not stored', () => {
      const filters = {
        ...emptyFilters,
        injected: 'x',
        screener: { scales: [], minMargin: 0, maxCapital: null, moats: [], injected: 'y' },
      };
      const stored = parseSavedSearchInput({ ...validInput, filters }).filters;
      expect(stored).not.toHaveProperty('injected');
      expect(stored.screener).not.toHaveProperty('injected');
      expect(Object.keys(stored).sort()).toEqual(['batch', 'bookmarks', 'filter', 'screener', 'tags']);
    });

    it('refuses a filter set too large for one row', () => {
      const tags = Array.from({ length: 300 }, (_, index) => `${String(index).padStart(3, '0')}${'x'.repeat(97)}`);
      expect(messageOf(() => normalizeSavedSearchFilters({ ...emptyFilters, tags }))).toBe('絞り込み条件が大きすぎます');
    });
  });
});

describe('parseSavedSearchPatch', () => {
  it('accepts a rename, a notification change, or both', () => {
    expect(parseSavedSearchPatch({ name: ' 新しい名前 ' })).toEqual({ name: '新しい名前' });
    expect(parseSavedSearchPatch({ notify: false })).toEqual({ notify: false });
    expect(parseSavedSearchPatch({ name: 'x', notify: true })).toEqual({ name: 'x', notify: true });
  });

  it('needs at least one field', () => {
    expect(() => parseSavedSearchPatch({})).toThrow(SavedSearchValidationError);
  });

  it('cannot change the conditions, the owner or the id', () => {
    for (const field of ['query', 'filters', 'userId', 'id', 'createdAt']) {
      expect(() => parseSavedSearchPatch({ name: 'x', [field]: 'y' })).toThrow(SavedSearchValidationError);
    }
  });

  it('applies the same name and notify rules as creation', () => {
    expect(() => parseSavedSearchPatch({ name: '' })).toThrow('名前は1〜60文字で入力してください');
    expect(() => parseSavedSearchPatch({ name: 'あ'.repeat(61) })).toThrow('名前は1〜60文字で入力してください');
    expect(() => parseSavedSearchPatch({ notify: 'no' })).toThrow('通知の指定が正しくありません');
  });

  it.each([null, undefined, [], 'text', 5])('rejects a body of %j', (body) => {
    expect(() => parseSavedSearchPatch(body)).toThrow(SavedSearchValidationError);
  });
});
