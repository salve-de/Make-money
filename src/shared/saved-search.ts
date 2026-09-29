import type { GridFilterOption } from '@/shared/terminal';

/** Limits shared by the API, the database CHECK constraints and any screen that edits a saved search. */
export const SAVED_SEARCH_NAME_MAX = 60;
export const SAVED_SEARCH_QUERY_MAX = 200;
export const SAVED_SEARCH_LIMIT = 20;
export const SAVED_SEARCH_LIMIT_MESSAGE = `保存できる条件は${SAVED_SEARCH_LIMIT}件までです`;

/**
 * Same shape as `CatalogFilters` in src/platform/model/entity-filter.ts, so a
 * screen can hand its current filters straight to the API. `shared` may not
 * import `platform` (pnpm lint enforces this), so the shape is declared here and
 * src/lib/saved-searches/input.test.ts fails to compile if the two ever drift.
 *
 * In a saved search `bookmarks` is always empty and `filter` is never
 * `BOOKMARKED`: the cases a person saved are not a search condition.
 */
export interface SavedSearchFilters {
  filter: GridFilterOption;
  batch: string;
  tags: string[];
  bookmarks: string[];
  screener: {
    scales: string[];
    minMargin: number;
    maxCapital: number | null;
    moats: string[];
    selectedTags?: string[];
  } | null;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SavedSearchFilters;
  notify: boolean;
  /** Milliseconds since the Unix epoch, issued by the server. */
  createdAt: number;
}

/** Body of `POST /api/saved-searches`. `notify` defaults to true. */
export interface SavedSearchInput {
  name: string;
  query: string;
  filters: SavedSearchFilters;
  notify: boolean;
}

/** Body of `PATCH /api/saved-searches/[id]`. At least one field is required. */
export interface SavedSearchPatch {
  name?: string;
  notify?: boolean;
}
