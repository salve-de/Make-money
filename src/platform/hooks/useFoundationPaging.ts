'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  FoundationValuePage,
  FoundationValueSummary,
} from '@/lib/foundation/business-reader';
import { parseFoundationPageResponse } from '@/lib/foundation/schema';
import { withOneFoundationPageRetry } from './foundation-search-lifecycle';
import { getNextNewArrivalsReleaseAt } from '@/lib/foundation/new-arrivals';

const FOUNDATION_PAGE_REQUEST_LIMIT = 12;

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
    // Search continuation is manual; normal archive paging resumes when clear.
    autoLoadFoundation: !searchActive,
    gridHasMore:
      input.catalogHasMore ||
      (!searchActive && input.foundationHasMore),
    gridRetryAvailable:
      !searchActive && input.foundationRetryAvailable,
    searchContinuationAvailable:
      searchActive &&
      (input.foundationHasMore || input.foundationRetryAvailable),
    searchContinuationFailed:
      searchActive && input.foundationRetryAvailable,
    searchIncomplete:
      searchActive &&
      (input.foundationHasMore || input.foundationRetryAvailable),
  };
}

export function canContinueFoundationSearch(input: {
  searchQuery: string;
  foundationSearchQuery: string;
  loadedQuery: string | null;
  loading: boolean;
  hasContinuation: boolean;
}): boolean {
  return (
    input.searchQuery.trim().length > 0 &&
    input.searchQuery === input.foundationSearchQuery &&
    input.loadedQuery === input.foundationSearchQuery &&
    !input.loading &&
    input.hasContinuation
  );
}

export function shouldApplyFoundationContinuationFailure(input: {
  requestId: number;
  currentRequestId: number;
  requestQuery: string;
  currentSearchQuery: string;
  loadedQuery: string | null;
}): boolean {
  return (
    input.requestId === input.currentRequestId &&
    input.requestQuery === input.currentSearchQuery &&
    input.loadedQuery === input.requestQuery
  );
}

export function isFoundationPagingStateCurrent(input: {
  searchQuery: string;
  foundationSearchQuery: string;
  loadedSearchQuery: string | null;
}): boolean {
  return (
    input.searchQuery === input.foundationSearchQuery &&
    input.loadedSearchQuery === input.foundationSearchQuery
  );
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

export function useFoundationPaging(input: {
  searchQuery: string;
  catalogHasMore: boolean;
}) {
  const { searchQuery, catalogHasMore } = input;
  const latestSearchQuery = useRef(searchQuery);
  const foundationRequestId = useRef(0);
  const foundationLoadingRef = useRef(false);
  const foundationRequestedCursors = useRef(new Set<string>());
  const foundationLoadedQuery = useRef<string | null>(null);
  const [foundationSearchQuery, setFoundationSearchQuery] = useState(searchQuery);
  const [foundationLoadedSearchQuery, setFoundationLoadedSearchQuery] =
    useState<string | null>(null);

  const [dataSource, setDataSource] = useState('取得状態を確認中');
  const [rows, setRows] = useState<FoundationValueSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retryCursor, setRetryCursor] = useState<string | null>(null);
  const [latestRetryable, setLatestRetryable] = useState(false);
  const [archiveRetryable, setArchiveRetryable] = useState(false);
  const [newArrivalsRelease, setNewArrivalsRelease] =
    useState<FoundationValuePage['newArrivals']>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      latestSearchQuery.current = searchQuery;
      setFoundationSearchQuery(searchQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const loadPage = useCallback(async (
    cursor?: string,
    signal?: AbortSignal,
    options: { preserveExistingRows?: boolean } = {},
  ): Promise<FoundationValuePage | null> => {
    const queryChanged = foundationLoadedQuery.current !== foundationSearchQuery;
    const effectiveCursor = queryChanged ? undefined : cursor;
    if (effectiveCursor && foundationLoadingRef.current) return null;

    const requestQuery = foundationSearchQuery;
    const requestId = foundationRequestId.current + 1;
    foundationRequestId.current = requestId;
    const isCurrentRequest = () =>
      foundationRequestId.current === requestId &&
      foundationLoadedQuery.current === requestQuery &&
      latestSearchQuery.current === requestQuery;

    if (!effectiveCursor) {
      foundationLoadedQuery.current = requestQuery;
      foundationRequestedCursors.current.clear();
      if (queryChanged) {
        setRows([]);
        setTotal(null);
        setNextCursor(null);
        setHasMore(false);
        setRetryCursor(null);
        setLatestRetryable(false);
        setArchiveRetryable(false);
        setNewArrivalsRelease(null);
      }
    }

    foundationLoadingRef.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(FOUNDATION_PAGE_REQUEST_LIMIT),
        foundationOnly: 'true',
      });
      if (requestQuery.trim()) params.set('q', requestQuery.trim());
      if (effectiveCursor) params.set('cursor', effectiveCursor);

      const payload: unknown = await withOneFoundationPageRetry(async () => {
        const requestSignal = signal
          ? AbortSignal.any([signal, AbortSignal.timeout(60_000)])
          : AbortSignal.timeout(60_000);
        const response = await fetch(`/api/businesses?${params.toString()}`, { signal: requestSignal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<unknown>;
      }, () => isCurrentRequest() && !signal?.aborted,
      () => new Promise<void>((resolve) => window.setTimeout(resolve, 350)));

      const source = payload && typeof payload === 'object' && !Array.isArray(payload) &&
        typeof (payload as { source?: unknown }).source === 'string'
        ? (payload as { source: string }).source
        : undefined;
      const page = parseFoundationPageResponse(payload);
      const archiveFailed = Boolean(
        payload && typeof payload === 'object' && !Array.isArray(payload) &&
        (payload as { archiveRetryable?: unknown }).archiveRetryable === true,
      );
      const latestFailed = Boolean(
        payload && typeof payload === 'object' && !Array.isArray(payload) &&
        (payload as { latestRetryable?: unknown }).latestRetryable === true,
      );

      // A previous query's cursor must never overwrite the current read state.
      if (!isCurrentRequest() || signal?.aborted) return null;

      const reportedTotal = payload && typeof payload === 'object' && !Array.isArray(payload)
        ? (payload as { total?: unknown }).total
        : undefined;
      setTotal(Number.isSafeInteger(reportedTotal) && (reportedTotal as number) >= 0
        ? reportedTotal as number
        : null);
      setDataSource(source === 'foundation_lake'
        ? '保存済み台帳 + Foundation R2'
        : source === 'local_fallback'
          ? '保存済み台帳（ローカル予備）'
          : source === 'static_fallback'
            ? '保存済み台帳（静的予備）'
            : '保存済み台帳（外部取得なし）');

      if (!page) return null;

      setFoundationLoadedSearchQuery(requestQuery);
      setRows((current) => mergeFoundationRowsById(
        current,
        page.data,
        shouldReplaceFoundationRows(effectiveCursor, options.preserveExistingRows),
      ));
      if (page.newArrivals || !effectiveCursor) {
        setNewArrivalsRelease(page.newArrivals);
      }
      const next = page.nextCursor && page.nextCursor !== effectiveCursor
        ? page.nextCursor
        : null;
      setNextCursor(next);
      setHasMore(page.hasMore && Boolean(next));
      setRetryCursor(null);
      setLatestRetryable(latestFailed && !effectiveCursor);
      setArchiveRetryable(archiveFailed && !effectiveCursor);
      return page;
    } finally {
      if (isCurrentRequest()) {
        foundationLoadingRef.current = false;
        setLoading(false);
      }
    }
  }, [foundationSearchQuery]);

  const searchStateCurrent = isFoundationPagingStateCurrent({
    searchQuery,
    foundationSearchQuery,
    loadedSearchQuery: foundationLoadedSearchQuery,
  });

  const loadMoreFoundation = useCallback(() => {
    if (!searchStateCurrent || latestSearchQuery.current.trim()) return;
    const cursor = nextCursor;
    if (!cursor || foundationLoadingRef.current) return;
    if (foundationRequestedCursors.current.has(cursor)) {
      setNextCursor(null);
      setHasMore(false);
      return;
    }
    foundationRequestedCursors.current.add(cursor);
    const requestQuery = foundationSearchQuery;
    const pending = loadPage(cursor);
    const pageRequestId = foundationRequestId.current;
    void pending.catch((error) => {
      if (!shouldApplyFoundationContinuationFailure({
        requestId: pageRequestId,
        currentRequestId: foundationRequestId.current,
        requestQuery,
        currentSearchQuery: latestSearchQuery.current,
        loadedQuery: foundationLoadedQuery.current,
      })) return;
      foundationRequestedCursors.current.delete(cursor);
      setRetryCursor(cursor);
      setHasMore(false);
      setDataSource('保存済み台帳（追加取得に失敗 / 手動再試行可能）');
      console.warn('[TerminalShell] Additional Foundation page failed:', error);
    });
  }, [nextCursor, searchStateCurrent, foundationSearchQuery, loadPage]);

  const continueFoundationSearch = useCallback(() => {
    const requestQuery = foundationSearchQuery;
    const retryFromStart = !retryCursor && (latestRetryable || archiveRetryable);
    const cursor = retryCursor || (retryFromStart ? null : nextCursor);

    if (!canContinueFoundationSearch({
      searchQuery,
      foundationSearchQuery,
      loadedQuery: foundationLoadedQuery.current,
      loading: foundationLoadingRef.current,
      hasContinuation: Boolean(cursor) || retryFromStart,
    })) return;

    if (cursor && foundationRequestedCursors.current.has(cursor) && !retryCursor) return;
    if (cursor) foundationRequestedCursors.current.add(cursor);

    const pending = loadPage(cursor || undefined, undefined, {
      preserveExistingRows: retryFromStart,
    });
    const continuationRequestId = foundationRequestId.current;

    void pending.catch((error) => {
      if (cursor) foundationRequestedCursors.current.delete(cursor);
      if (!shouldApplyFoundationContinuationFailure({
        requestId: continuationRequestId,
        currentRequestId: foundationRequestId.current,
        requestQuery,
        currentSearchQuery: latestSearchQuery.current,
        loadedQuery: foundationLoadedQuery.current,
      })) return;
      if (cursor) setRetryCursor(cursor);
      console.warn('[TerminalShell] Foundation search continuation failed:', error);
    });
  }, [
    searchQuery,
    foundationSearchQuery,
    nextCursor,
    retryCursor,
    latestRetryable,
    archiveRetryable,
    loadPage,
  ]);

  const retryFoundationPage = useCallback(() => {
    if (!retryCursor || foundationLoadingRef.current) return;
    setNextCursor(retryCursor);
    setHasMore(true);
    setRetryCursor(null);
  }, [retryCursor]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    let activeController: AbortController | null = null;

    const clearRefreshTimer = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const scheduleNextEditionRefresh = () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      clearRefreshTimer();
      const nextReleaseAt = getNextNewArrivalsReleaseAt(new Date());
      const delay = Math.max(30_000, nextReleaseAt.getTime() - Date.now() + 30_000);
      timer = window.setTimeout(() => {
        timer = null;
        void refresh();
      }, delay);
    };

    const refresh = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      try {
        await loadPage(undefined, controller.signal);
      } catch (error) {
        if ((error as { name?: string })?.name !== 'AbortError') {
          setDataSource('保存済み台帳（curated継続 / Foundation追加経路は一時利用不可）');
          console.warn('[TerminalShell] Foundation Lake read failed; static UI remains available:', error);
        }
      } finally {
        if (activeController === controller) activeController = null;
        scheduleNextEditionRefresh();
      }
    };

    const handleVisibilityChange = () => {
      clearRefreshTimer();
      if (document.visibilityState === 'visible') void refresh();
    };

    void refresh();
    scheduleNextEditionRefresh();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      cancelled = true;
      clearRefreshTimer();
      activeController?.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadPage]);

  const continuationFailed =
    Boolean(retryCursor) || latestRetryable || archiveRetryable;
  const retryMessage = foundationSearchRetryMessage({
    latestRetryable,
    archiveRetryable: archiveRetryable || Boolean(retryCursor),
  });
  const pagingPolicy = foundationPagingPolicy({
    searchQuery,
    foundationHasMore: searchStateCurrent ? hasMore : false,
    foundationRetryAvailable: searchStateCurrent ? continuationFailed : false,
    catalogHasMore,
  });

  return {
    rows: searchStateCurrent ? rows : [],
    total: searchStateCurrent ? total : null,
    dataSource,
    loading,
    newArrivalsRelease,
    gridHasMore: pagingPolicy.gridHasMore,
    gridRetryAvailable: pagingPolicy.gridRetryAvailable,
    searchIncomplete: pagingPolicy.searchIncomplete,
    searchContinuationAvailable: pagingPolicy.searchContinuationAvailable,
    searchContinuationFailed: pagingPolicy.searchContinuationFailed,
    searchRetryMessage: retryMessage,
    loadMore: () => {
      if (pagingPolicy.autoLoadFoundation && searchStateCurrent) {
        loadMoreFoundation();
      }
    },
    continueSearch: continueFoundationSearch,
    retryPage: retryFoundationPage,
  };
}
