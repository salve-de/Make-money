export interface FoundationPagingPolicy {
  autoLoadFoundation: boolean;
  gridHasMore: boolean;
  gridRetryAvailable: boolean;
  searchContinuationAvailable: boolean;
  searchContinuationFailed: boolean;
  searchIncomplete: boolean;
}

export function foundationPagingPolicy(input: {
  searchQuery: string;
  foundationHasMore: boolean;
  foundationRetryAvailable: boolean;
  catalogHasMore: boolean;
}): FoundationPagingPolicy {
  const searchActive = input.searchQuery.trim().length > 0;
  return {
    autoLoadFoundation: !searchActive,
    gridHasMore: input.catalogHasMore || (!searchActive && input.foundationHasMore),
    gridRetryAvailable: !searchActive && input.foundationRetryAvailable,
    searchContinuationAvailable: searchActive && (input.foundationHasMore || input.foundationRetryAvailable),
    searchContinuationFailed: searchActive && input.foundationRetryAvailable,
    searchIncomplete: searchActive && (input.foundationHasMore || input.foundationRetryAvailable),
  };
}

export function isFoundationPagingStateCurrent(input: {
  searchQuery: string;
  foundationSearchQuery: string;
  loadedSearchQuery: string | null;
}): boolean {
  return input.searchQuery === input.foundationSearchQuery &&
    input.loadedSearchQuery === input.foundationSearchQuery;
}

export function canContinueFoundationSearch(input: {
  searchQuery: string;
  foundationSearchQuery: string;
  loadedQuery: string | null;
  loading: boolean;
  hasContinuation: boolean;
}): boolean {
  return input.searchQuery.trim().length > 0 &&
    input.searchQuery === input.foundationSearchQuery &&
    input.loadedQuery === input.foundationSearchQuery &&
    !input.loading &&
    input.hasContinuation;
}

export function shouldApplyFoundationContinuationFailure(input: {
  requestId: number;
  currentRequestId: number;
  requestQuery: string;
  currentSearchQuery: string;
  loadedQuery: string | null;
}): boolean {
  return input.requestId === input.currentRequestId &&
    input.requestQuery === input.currentSearchQuery &&
    input.loadedQuery === input.requestQuery;
}

export function shouldReplaceFoundationRows(
  effectiveCursor: string | undefined,
  preserveExistingRows = false,
): boolean {
  return !effectiveCursor && !preserveExistingRows;
}

export function mergeFoundationRowsById<T extends { id: string }>(
  current: readonly T[],
  incoming: readonly T[],
  replace = false,
): T[] {
  const next = replace ? [] : [...current];
  const seen = new Set(next.map((item) => item.id));
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    next.push(item);
    seen.add(item.id);
  }
  return next;
}

export function foundationSearchRetryMessage(input: {
  latestRetryable: boolean;
  archiveRetryable: boolean;
}): string | null {
  if (input.latestRetryable && input.archiveRetryable) {
    return '最新公開分と過去事例の一部を確認できませんでした。現在の検索結果は保持されています。';
  }
  if (input.latestRetryable) {
    return '最新公開分の一部を確認できませんでした。現在の検索結果は保持されています。';
  }
  if (input.archiveRetryable) {
    return '過去事例の追加検索に失敗しました。現在の検索結果は保持されています。';
  }
  return null;
}
