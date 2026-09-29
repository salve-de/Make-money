import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedSearchFilters } from '@/shared/saved-search';

const state = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('@/lib/storage/d1', () => ({ queryD1: state.query }));

import {
  createSavedSearch,
  deleteSavedSearch,
  getSavedSearch,
  INSERT_SAVED_SEARCH_SQL,
  listSavedSearches,
  parseSavedSearchRow,
  parseStoredFilters,
  savedSearchFromRow,
  updateSavedSearch,
  UPDATE_SAVED_SEARCH_SQL,
  type SavedSearchRow,
} from './store';

const filters: SavedSearchFilters = { filter: 'ALL', batch: 'ALL', tags: [], bookmarks: [], screener: null };
const row = (overrides: Partial<SavedSearchRow> = {}): SavedSearchRow => ({
  id: 's-1', name: '条件', query: 'AI', filters: JSON.stringify(filters), notify: 1, createdAt: 1_700_000_000_000, ...overrides,
});
const input = { name: '条件', query: 'AI', filters, notify: true };

/** queryD1 runs its own row parser; emulate that so the store sees typed rows. */
function answer(rows: unknown[]) {
  return async (_sql: string, _params: unknown[], parse?: (value: unknown) => unknown) => rows.map((value) => (parse ? parse(value) : value));
}

beforeEach(() => {
  state.query.mockReset();
});

describe('parseSavedSearchRow', () => {
  it('accepts a well-formed row and rejects anything else', () => {
    expect(parseSavedSearchRow(row())).toEqual(row());
    for (const broken of [
      null, {}, row({ id: 5 as unknown as string }), row({ notify: 2 }), row({ notify: true as unknown as number }),
      row({ filters: {} as unknown as string }), row({ createdAt: Number.NaN }), row({ name: null as unknown as string }),
    ]) {
      expect(() => parseSavedSearchRow(broken)).toThrow('malformed');
    }
  });
});

describe('stored filters', () => {
  it('reads valid filters back and never brings bookmarks with them', () => {
    expect(parseStoredFilters(JSON.stringify({ ...filters, bookmarks: ['ent_x_1'] }))).toEqual(filters);
  });

  it('returns null for text that is not filters, and for the saved-cases list', () => {
    expect(parseStoredFilters('{')).toBeNull();
    expect(parseStoredFilters('{}')).toBeNull();
    expect(parseStoredFilters(JSON.stringify({ ...filters, filter: 'BOOKMARKED' }))).toBeNull();
    expect(parseStoredFilters('')).toBeNull();
  });

  it('maps a row to the public shape with a real boolean', () => {
    expect(savedSearchFromRow(row({ notify: 0 }))).toEqual({
      id: 's-1', name: '条件', query: 'AI', filters, notify: false, createdAt: 1_700_000_000_000,
    });
    expect(savedSearchFromRow(row({ filters: 'nonsense' }))).toBeNull();
  });
});

describe('listSavedSearches', () => {
  it('asks for one person only and returns the mapped rows', async () => {
    state.query.mockImplementation(answer([row(), row({ id: 's-2', notify: 0 })]));
    const list = await listSavedSearches('user-1');
    expect(state.query).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id=?'), ['user-1'], expect.any(Function));
    expect(list.map((item) => [item.id, item.notify])).toEqual([['s-1', true], ['s-2', false]]);
  });

  it('leaves out a row it can no longer understand instead of failing the whole list', async () => {
    state.query.mockImplementation(answer([row({ id: 'bad', filters: '{' }), row({ id: 'bookmarked', filters: JSON.stringify({ ...filters, filter: 'BOOKMARKED' }) }), row({ id: 'good' })]));
    expect((await listSavedSearches('user-1')).map((item) => item.id)).toEqual(['good']);
  });

  it('fails loudly when the database returns a malformed row', async () => {
    state.query.mockImplementation(answer([{ id: 's-1' }]));
    await expect(listSavedSearches('user-1')).rejects.toThrow('malformed');
  });

  it('passes a database failure to the caller', async () => {
    state.query.mockRejectedValue(new Error('unavailable'));
    await expect(listSavedSearches('user-1')).rejects.toThrow('unavailable');
  });
});

describe('createSavedSearch', () => {
  it('inserts with the owner, the cap and a server-issued id and time, then reads the row back', async () => {
    state.query
      .mockImplementationOnce(async () => [{ id: 'ignored' }])
      .mockImplementationOnce(answer([row({ id: 'created' })]));
    const result = await createSavedSearch('user-1', { ...input, notify: false }, 1234);

    expect(result).toMatchObject({ status: 'created', savedSearch: { id: 'created' } });
    const [sql, params] = state.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toBe(INSERT_SAVED_SEARCH_SQL);
    expect(params).toEqual([
      expect.stringMatching(/^[0-9a-f-]{36}$/), 'user-1', '条件', 'AI', JSON.stringify(filters), 0, 1234, 'user-1', 20,
    ]);
    // the read-back asks for the id that was just generated, scoped to the same owner
    const [, readParams] = state.query.mock.calls[1] as [string, unknown[]];
    expect(readParams).toEqual([params[0], 'user-1']);
  });

  it('reports the limit when the guarded insert adds nothing', async () => {
    state.query.mockImplementationOnce(async () => []);
    expect(await createSavedSearch('user-1', input)).toEqual({ status: 'limit' });
    expect(state.query).toHaveBeenCalledTimes(1);
  });

  it('does not claim success when the row cannot be read back', async () => {
    state.query.mockImplementationOnce(async () => [{ id: 'x' }]).mockImplementationOnce(answer([]));
    await expect(createSavedSearch('user-1', input)).rejects.toThrow('read back');
  });
});

describe('updateSavedSearch', () => {
  it('changes only the given fields and only for the owner', async () => {
    state.query.mockImplementationOnce(async () => [{ id: 's-1' }]).mockImplementationOnce(answer([row({ name: '新名称' })]));
    const updated = await updateSavedSearch('user-1', 's-1', { name: '新名称' });
    expect(updated?.name).toBe('新名称');
    expect(state.query.mock.calls[0]).toEqual([UPDATE_SAVED_SEARCH_SQL, ['新名称', null, 's-1', 'user-1']]);
  });

  it('sends notify as 1 or 0 and leaves the name alone when only notify is given', async () => {
    state.query.mockImplementation(async (_sql: string, _params: unknown[], parse?: (value: unknown) => unknown) => (parse ? [parse(row())] : [{ id: 's-1' }]));
    await updateSavedSearch('user-1', 's-1', { notify: false });
    await updateSavedSearch('user-1', 's-1', { notify: true });
    expect(state.query.mock.calls[0][1]).toEqual([null, 0, 's-1', 'user-1']);
    expect(state.query.mock.calls[2][1]).toEqual([null, 1, 's-1', 'user-1']);
  });

  it("returns null, and reads nothing back, when the search is someone else's or missing", async () => {
    state.query.mockImplementationOnce(async () => []);
    expect(await updateSavedSearch('intruder', 's-1', { name: 'x' })).toBeNull();
    expect(state.query).toHaveBeenCalledTimes(1);
    expect(state.query.mock.calls[0][1]).toEqual(['x', null, 's-1', 'intruder']);
  });
});

describe('deleteSavedSearch and getSavedSearch', () => {
  it('deletes only when the owner matches', async () => {
    state.query.mockImplementationOnce(async () => [{ id: 's-1' }]).mockImplementationOnce(async () => []);
    expect(await deleteSavedSearch('user-1', 's-1')).toBe(true);
    expect(await deleteSavedSearch('intruder', 's-1')).toBe(false);
    expect(state.query.mock.calls[0]).toEqual([expect.stringContaining('AND user_id=?'), ['s-1', 'user-1']]);
    expect(state.query.mock.calls[1][1]).toEqual(['s-1', 'intruder']);
  });

  it('reads one search by id and owner', async () => {
    state.query.mockImplementationOnce(answer([row()]));
    expect((await getSavedSearch('user-1', 's-1'))?.id).toBe('s-1');
    expect(state.query.mock.calls[0][1]).toEqual(['s-1', 'user-1']);
    state.query.mockImplementationOnce(answer([]));
    expect(await getSavedSearch('user-1', 'missing')).toBeNull();
  });
});
