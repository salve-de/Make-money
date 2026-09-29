import { parseCatalogFilters, type CatalogFilters } from '@/platform/model/entity-filter';
import {
  SAVED_SEARCH_NAME_MAX,
  SAVED_SEARCH_QUERY_MAX,
  type SavedSearchFilters,
  type SavedSearchInput,
  type SavedSearchPatch,
} from '@/shared/saved-search';

/**
 * Validation for the saved-search API. It lives in `lib` rather than next to the
 * types in `shared` because it reuses `parseCatalogFilters`, and `shared` may not
 * depend on `platform`.
 */
export class SavedSearchValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SavedSearchValidationError';
  }
}

const GENERIC_MESSAGE = '保存する内容が正しくありません';
const FILTERS_MESSAGE = '絞り込み条件が正しくありません';
// A saved filter set is a handful of chips, never thousands. This keeps one row small
// even though parseCatalogFilters itself accepts up to 100,000 characters.
const FILTERS_MAX_CHARS = 20_000;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
const INPUT_KEYS = new Set(['name', 'query', 'filters', 'notify']);
const PATCH_KEYS = new Set(['name', 'notify']);

function codePoints(value: string): number {
  return Array.from(value).length;
}

function objectOf(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SavedSearchValidationError(message);
  return value as Record<string, unknown>;
}

function assertKnownKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): void {
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new SavedSearchValidationError(GENERIC_MESSAGE);
}

function parseName(value: unknown): string {
  const message = `名前は1〜${SAVED_SEARCH_NAME_MAX}文字で入力してください`;
  if (typeof value !== 'string') throw new SavedSearchValidationError(message);
  const name = value.trim();
  const length = codePoints(name);
  if (length < 1 || length > SAVED_SEARCH_NAME_MAX || CONTROL_CHARACTERS.test(name)) throw new SavedSearchValidationError(message);
  return name;
}

function parseQuery(value: unknown): string {
  const message = `検索語は${SAVED_SEARCH_QUERY_MAX}文字までです`;
  if (typeof value !== 'string') throw new SavedSearchValidationError(message);
  const query = value.trim();
  if (codePoints(query) > SAVED_SEARCH_QUERY_MAX || CONTROL_CHARACTERS.test(query)) throw new SavedSearchValidationError(message);
  return query;
}

function parseNotify(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new SavedSearchValidationError('通知の指定が正しくありません');
  return value;
}

/**
 * Validate a filter set with the same rules the catalog API uses, then rebuild it
 * from known fields so nothing else is stored. Bookmarks are dropped (a saved search
 * never carries them) and the bookmark list itself is not a valid condition.
 */
export function normalizeSavedSearchFilters(value: unknown): SavedSearchFilters {
  const source = objectOf(value, FILTERS_MESSAGE);
  let parsed: CatalogFilters | undefined;
  try {
    parsed = parseCatalogFilters(JSON.stringify({ ...source, bookmarks: [] }));
  } catch {
    throw new SavedSearchValidationError(FILTERS_MESSAGE);
  }
  if (!parsed) throw new SavedSearchValidationError(FILTERS_MESSAGE);
  if (parsed.filter === 'BOOKMARKED') throw new SavedSearchValidationError('保存した事例の一覧は条件として保存できません');
  const screener = parsed.screener;
  const normalized: SavedSearchFilters = {
    filter: parsed.filter,
    batch: parsed.batch,
    tags: [...parsed.tags],
    bookmarks: [],
    screener: screener
      ? {
        scales: [...screener.scales],
        minMargin: screener.minMargin,
        maxCapital: screener.maxCapital,
        moats: [...screener.moats],
        ...(screener.selectedTags !== undefined ? { selectedTags: [...screener.selectedTags] } : {}),
      }
      : null,
  };
  if (JSON.stringify(normalized).length > FILTERS_MAX_CHARS) throw new SavedSearchValidationError('絞り込み条件が大きすぎます');
  return normalized;
}

export function parseSavedSearchInput(value: unknown): SavedSearchInput {
  const input = objectOf(value, GENERIC_MESSAGE);
  assertKnownKeys(input, INPUT_KEYS);
  return {
    name: parseName(input.name),
    query: parseQuery(input.query),
    filters: normalizeSavedSearchFilters(input.filters),
    notify: input.notify === undefined ? true : parseNotify(input.notify),
  };
}

export function parseSavedSearchPatch(value: unknown): SavedSearchPatch {
  const input = objectOf(value, GENERIC_MESSAGE);
  assertKnownKeys(input, PATCH_KEYS);
  const patch: SavedSearchPatch = {};
  if (input.name !== undefined) patch.name = parseName(input.name);
  if (input.notify !== undefined) patch.notify = parseNotify(input.notify);
  if (patch.name === undefined && patch.notify === undefined) throw new SavedSearchValidationError(GENERIC_MESSAGE);
  return patch;
}
