import type { SavedSearchFilters } from '@/shared/saved-search';

/** The newest publication window ("便"): its id, its display label and the cases added in it. */
export interface DigestRelease {
  releaseId: string;
  label: string;
  entityIds: readonly string[];
}

export interface DigestAlertSearch {
  id: string;
  name: string;
  query: string;
  filters: SavedSearchFilters;
}

/** One person with at least one saved search that has notifications turned on. */
export interface DigestAlertRecipient {
  userId: string;
  /** The address stored for this account, or null when the account has no users row. */
  email: string | null;
  searches: DigestAlertSearch[];
}

export interface DigestSubscriber {
  id: string;
  email: string;
}
