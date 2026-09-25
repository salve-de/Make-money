'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FoundationValuePage, FoundationValueSummary } from '@/lib/foundation/business-reader';
import { parseFoundationPageResponse } from '@/lib/foundation/schema';
import { getNextNewArrivalsReleaseAt } from '@/lib/foundation/new-arrivals';
import {
  canContinueFoundationSearch,
  foundationPagingPolicy,
  foundationSearchRetryMessage,
  isFoundationPagingStateCurrent,
  mergeFoundationRowsById,
  shouldApplyFoundationContinuationFailure,
  shouldReplaceFoundationRows,
} from './foundation-paging-state';

const FOUNDATION_PAGE_REQUEST_LIMIT = 12;

function readBooleanFlag(payload: unknown, key: string): boolean {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    (payload as Record<string, unknown>)[key] === true,
  );
}

function readSource(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const source = (payload as Record<string, unknown>).source;
  return typeof source === 'string' ? source : undefined;
}

function readTotal(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const total = (payload as Record<string, unknown>).total;
  return Number.isSafeInteger(total) && (total as number) >= 0 ? total as number : null;
}

function sourceLabel(source: string | undefined): string {
  if (source === 'foundation_lake') return '保存済み台帳 + Foundation R2';
  if (source === 'local_fallback') return '保存済み台帳（ローカル予備）';
  if (source === 'static_fallback') return '保存済み台帳（静的予備）';
  return '保存済み台帳（外部取得なし）';
}

export function useFoundationPaging(searchQuery: string, catalogHasMore: boolean) {
  const latestSearchQuery = useRef(searchQuery);
  const foundationRequestId = useRef(0);
  const foundationLoadingRef = useRef(false);
  const foundationRequestedCursors = useRef(new Set<string>());
  const foundationLoadedQuery = useRef<string | null>(null);

  const [foundationSearchQuery, setFoundationSearchQuery] = useState(searchQuery);
  const [foundationLoadedSearchQuery, setFoundationLoadedSearchQuery] = useState<string | null>(null);
  const [rows, setRows] = useState<FoundationValueSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retryCursor, setRetryCursor] = useState<string | null>(null);
  const [retryFromStart, setRetryFromStart] = useState(false);
  const [latestRetryable, setLatestRetryable] = useState(false);
  const [archiveRetryable, setArchiveRetryable] = useState(false);
  const [dataSource, setDataSource] = useState('取得状態を確認中');
  const [newArrivalsRelease, setNewArrivalsRelease] = useState<FoundationValuePage['newArrivals']>(null);

  useEffect(() => {
    latestSearchQuery.current = searchQuery;
    foundationRequestId.current += 1;
    const timer = window.setTimeout(() => setFoundationSearchQuery(searchQuery), 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const mergeRows = useCallback((incoming: FoundationValueSummary[], replace = false) => {
    setRows((current) => mergeFoundationRowsById(current, incoming, replace));
  }, []);

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

      let payload: unknown;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const requestSignal = signal
            ? AbortSignal.any([signal, AbortSignal.timeout(60_000)])
            : AbortSignal.timeout(60_000);
          const response = await fetch(`/api/businesses?${params.toString()}`, { signal: requestSignal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          payload = await response.json();
          break;
        } catch (cause) {
          lastError = cause;
          if (attempt === 1 || signal?.aborted) throw cause;
          await new Promise<void>((resolve) => window.setTimeout(resolve, 350));
        }
      }
      if (payload === undefined) {
        throw lastError instanceof Error ? lastError : new Error('Invalid Foundation page');
      }

      const page = parseFoundationPageResponse(payload);
      if (!isCurrentRequest() || signal?.aborted) return null;

      setTotal(readTotal(payload));
      setDataSource(sourceLabel(readSource(payload)));
      if (!page) return null;

      const replace = shouldReplaceFoundationRows(
        effectiveCursor,
        options.preserveExistingRows,
      );
      mergeRows(page.data, replace);
      if (page.newArrivals || !effectiveCursor) setNewArrivalsRelease(page.newArrivals);

      const next = page.nextCursor && page.nextCursor !== effectiveCursor ? page.nextCursor : null;
      const nextHasMore = page.hasMore && Boolean(next);
      const requestWasSearch = requestQuery.trim().length > 0;
      const nextLatestRetryable = requestWasSearch && readBooleanFlag(payload, 'latestRetryable');
      const nextArchiveRetryable = requestWasSearch && readBooleanFlag(payload, 'archiveRetryable');

      setNextCursor(next);
      setHasMore(nextHasMore);
      setRetryCursor(null);
      setRetryFromStart(!effectiveCursor && (nextLatestRetryable || nextArchiveRetryable));
      setLatestRetryable(nextLatestRetryable);
      setArchiveRetryable(nextArchiveRetryable);
      setFoundationLoadedSearchQuery(requestQuery);
      return page;
    } finally {
      if (isCurrentRequest()) {
        foundationLoadingRef.current = false;
        setLoading(false);
      }
    }
  }, [foundationSearchQuery, mergeRows]);

  const pagingStateCurrent = isFoundationPagingStateCurrent({
    searchQuery,
    foundationSearchQuery,
    loadedSearchQuery: foundationLoadedSearchQuery,
  });

  const loadMore = useCallback(() => {
    if (!pagingStateCurrent) return;
    if (latestSearchQuery.current.trim()) return;

    const cursor = nextCursor;
    if (!cursor || foundationLoadingRef.current) return;
    if (foundationRequestedCursors.current.has(cursor)) {
      setNextCursor(null);
      setHasMore(false);
      return;
    }

    foundationRequestedCursors.current.add(cursor);
    void loadPage(cursor).catch((error) => {
      foundationRequestedCursors.current.delete(cursor);
      setRetryCursor(cursor);
      setHasMore(false);
      setDataSource('保存済み台帳（追加取得に失敗 / 手動再試行可能）');
      console.warn('[TerminalShell] Additional Foundation page failed:', error);
    });
  }, [loadPage, nextCursor, pagingStateCurrent]);

  const continueSearch = useCallback(() => {
    const requestQuery = foundationSearchQuery;
    const restart = retryFromStart;
    const cursor = restart ? null : retryCursor || nextCursor;

    if (!canContinueFoundationSearch({
      searchQuery,
      foundationSearchQuery,
      loadedQuery: foundationLoadedQuery.current,
      loading: foundationLoadingRef.current,
      hasContinuation: restart || Boolean(cursor),
    })) return;

    if (cursor && foundationRequestedCursors.current.has(cursor) && !retryCursor) return;
    if (cursor) foundationRequestedCursors.current.add(cursor);

    const pending = loadPage(
      cursor || undefined,
      undefined,
      { preserveExistingRows: restart },
    );
    const requestId = foundationRequestId.current;

    void pending.catch((error) => {
      if (cursor) foundationRequestedCursors.current.delete(cursor);
      if (!shouldApplyFoundationContinuationFailure({
        requestId,
        currentRequestId: foundationRequestId.current,
        requestQuery,
        currentSearchQuery: latestSearchQuery.current,
        loadedQuery: foundationLoadedQuery.current,
      })) return;

      if (cursor) {
        setRetryCursor(cursor);
      } else {
        setRetryFromStart(true);
      }
      setArchiveRetryable(true);
      setHasMore(false);
      console.warn('[TerminalShell] Foundation search continuation failed:', error);
    });
  }, [
    foundationSearchQuery,
    loadPage,
    nextCursor,
    retryCursor,
    retryFromStart,
    searchQuery,
  ]);

  const retryPage = useCallback(() => {
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

  const searchRetryAvailable = retryFromStart ||
    Boolean(retryCursor) ||
    latestRetryable ||
    archiveRetryable;
  const visibleFoundationHasMore = pagingStateCurrent ? hasMore : false;
  const visibleRetryAvailable = pagingStateCurrent ? searchRetryAvailable : false;
  const policy = foundationPagingPolicy({
    searchQuery,
    foundationHasMore: visibleFoundationHasMore,
    foundationRetryAvailable: visibleRetryAvailable,
    catalogHasMore,
  });

  const visibleLatestRetryable = pagingStateCurrent && latestRetryable;
  const visibleArchiveRetryable = pagingStateCurrent &&
    (archiveRetryable || Boolean(retryCursor));

  return {
    rows,
    total,
    dataSource,
    loading,
    newArrivalsRelease,
    gridHasMore: policy.gridHasMore,
    gridRetryAvailable: policy.gridRetryAvailable,
    searchIncomplete: policy.searchIncomplete,
    searchContinuationAvailable: policy.searchContinuationAvailable,
    searchContinuationFailed: policy.searchContinuationFailed,
    searchRetryMessage: foundationSearchRetryMessage({
      latestRetryable: visibleLatestRetryable,
      archiveRetryable: visibleArchiveRetryable,
    }),
    loadMore,
    continueSearch,
    retryPage,
  };
}
