import { parseCatalogFilters } from '@/platform/model/entity-filter';
import { queryD1 } from '@/lib/storage/d1';
import {
  SAVED_SEARCH_LIMIT,
  type SavedSearch,
  type SavedSearchFilters,
  type SavedSearchInput,
  type SavedSearchPatch,
} from '@/shared/saved-search';

/**
 * D1 access for saved searches. Every statement is scoped by `user_id`, taken from
 * the verified token, so a search id alone never grants access to someone else's row.
 * The SQL is exported so tests can run the exact text against a real SQLite.
 */
const COLUMNS = 'id, name, query, filters, notify, created_at AS createdAt';
const LIST_ROW_CAP = 100;

export const LIST_SAVED_SEARCHES_SQL =
  `SELECT ${COLUMNS} FROM saved_searches WHERE user_id=? ORDER BY created_at DESC, id LIMIT ${LIST_ROW_CAP}`;
export const GET_SAVED_SEARCH_SQL = `SELECT ${COLUMNS} FROM saved_searches WHERE id=? AND user_id=?`;
/** One statement, so the per-person cap cannot be beaten by two requests racing each other. */
export const INSERT_SAVED_SEARCH_SQL =
  `INSERT INTO saved_searches(id,user_id,name,query,filters,notify,created_at)
   SELECT ?,?,?,?,?,?,?
   WHERE (SELECT COUNT(*) FROM saved_searches WHERE user_id=?) < ?
   RETURNING id`;
export const UPDATE_SAVED_SEARCH_SQL =
  'UPDATE saved_searches SET name=COALESCE(?,name), notify=COALESCE(?,notify) WHERE id=? AND user_id=? RETURNING id';
export const DELETE_SAVED_SEARCH_SQL = 'DELETE FROM saved_searches WHERE id=? AND user_id=? RETURNING id';

export interface SavedSearchRow {
  id: string;
  name: string;
  query: string;
  filters: string;
  notify: number;
  createdAt: number;
}

/** Reject a malformed database row loudly instead of showing half a record. */
export function parseSavedSearchRow(value: unknown): SavedSearchRow {
  const row = value as Partial<Record<keyof SavedSearchRow, unknown>>;
  if (
    !row || typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.query !== 'string'
    || typeof row.filters !== 'string' || (row.notify !== 0 && row.notify !== 1)
    || typeof row.createdAt !== 'number' || !Number.isFinite(row.createdAt)
  ) throw new Error('Saved search row is malformed');
  return row as SavedSearchRow;
}

/**
 * Turn a stored filter string back into a usable filter set, or null when it is no
 * longer valid. A saved search is data a person typed once; one unreadable row must
 * not break listing the rest, and must never widen what a search matches.
 */
export function parseStoredFilters(raw: string): SavedSearchFilters | null {
  try {
    const parsed = parseCatalogFilters(raw);
    if (!parsed || parsed.filter === 'BOOKMARKED') return null;
    return { ...parsed, bookmarks: [] };
  } catch {
    return null;
  }
}

export function savedSearchFromRow(row: SavedSearchRow): SavedSearch | null {
  const filters = parseStoredFilters(row.filters);
  if (!filters) return null;
  return { id: row.id, name: row.name, query: row.query, filters, notify: row.notify === 1, createdAt: row.createdAt };
}

export async function listSavedSearches(userId: string): Promise<SavedSearch[]> {
  const rows = await queryD1(LIST_SAVED_SEARCHES_SQL, [userId], parseSavedSearchRow);
  return rows.flatMap((row) => {
    const savedSearch = savedSearchFromRow(row);
    return savedSearch ? [savedSearch] : [];
  });
}

export async function getSavedSearch(userId: string, id: string): Promise<SavedSearch | null> {
  const [row] = await queryD1(GET_SAVED_SEARCH_SQL, [id, userId], parseSavedSearchRow);
  return row ? savedSearchFromRow(row) : null;
}

export type CreateSavedSearchResult =
  | { status: 'created'; savedSearch: SavedSearch }
  | { status: 'limit' };

export async function createSavedSearch(
  userId: string,
  input: SavedSearchInput,
  now: number = Date.now(),
): Promise<CreateSavedSearchResult> {
  const id = crypto.randomUUID();
  const inserted = await queryD1<{ id: string }>(INSERT_SAVED_SEARCH_SQL, [
    id, userId, input.name, input.query, JSON.stringify(input.filters), input.notify ? 1 : 0, now,
    userId, SAVED_SEARCH_LIMIT,
  ]);
  if (inserted.length === 0) return { status: 'limit' };
  // Read the row back: success means the stored record is the one we will describe.
  const savedSearch = await getSavedSearch(userId, id);
  if (!savedSearch) throw new Error('Saved search could not be read back');
  return { status: 'created', savedSearch };
}

/** Returns null when the search does not exist or belongs to someone else. */
export async function updateSavedSearch(userId: string, id: string, patch: SavedSearchPatch): Promise<SavedSearch | null> {
  const updated = await queryD1<{ id: string }>(UPDATE_SAVED_SEARCH_SQL, [
    patch.name ?? null,
    patch.notify === undefined ? null : patch.notify ? 1 : 0,
    id,
    userId,
  ]);
  if (updated.length === 0) return null;
  const savedSearch = await getSavedSearch(userId, id);
  if (!savedSearch) throw new Error('Saved search could not be read back');
  return savedSearch;
}

/** Returns false when the search does not exist or belongs to someone else. */
export async function deleteSavedSearch(userId: string, id: string): Promise<boolean> {
  const deleted = await queryD1<{ id: string }>(DELETE_SAVED_SEARCH_SQL, [id, userId]);
  return deleted.length > 0;
}
