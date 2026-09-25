'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import type { FoundationValuePage, FoundationValueSummary } from '@/lib/foundation/business-reader';
import { parseFoundationPageResponse, parseFoundationDetailResponse } from '@/lib/foundation/schema';
import { adaptFoundationSummaryToFinancialEntity, adaptFoundationDetailToFinancialEntity, isFoundationDossierReady } from '@/lib/foundation/foundation-adapter';
import { getNextNewArrivalsReleaseAt } from '@/lib/foundation/new-arrivals';
import { aggregateMacroIntelligence } from '@/lib/intelligence/macro-aggregator';
import { MAX_APPROVAL_PROJECTION_IDS } from '@/shared/entity-approval-contract';
import { useCuratedCatalog } from './useCuratedCatalog';
import { fetchBusinessDetailResponse } from './foundation-detail-request';
import { parseFinancialEntity } from '@/shared/financial-entity-schema';

const NEGATIVE_APPROVAL_RECHECK_MS = 20_000;
const FOUNDATION_PAGE_REQUEST_LIMIT = 12;

function parseApprovedIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid approval overlay');
  const ids = (payload as Record<string, unknown>).entityIds;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string' && id.trim().length > 0 && id.length <= 200)) {
    throw new Error('Invalid approval overlay');
  }
  return [...new Set(ids.map((id) => id.trim().toLowerCase()))];
}

function chunks<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function removeCollectionTag(entity: FinancialEntity): FinancialEntity {
  if (!(entity.tags || []).includes('収集事例')) return entity;
  return { ...entity, tags: (entity.tags || []).filter((tag) => tag !== '収集事例') };
}

function isApprovalCandidate(entity: FinancialEntity): boolean {
  return (entity.tags || []).includes('収集事例');
}

export function useFoundationCatalog(initialEntities: FinancialEntity[], searchQuery = '') {
  const [catalogFilters, setCatalogFilters] = useState('');
  const catalog = useCuratedCatalog(initialEntities, searchQuery, catalogFilters);
  const coreEntities = catalog.entities;
  const latestSearchQuery = useRef(searchQuery);
  const foundationRequestId = useRef(0);
  const [foundationSearchQuery, setFoundationSearchQuery] = useState(searchQuery);

  useEffect(() => {
    latestSearchQuery.current = searchQuery;
    foundationRequestId.current += 1;
    const timer = window.setTimeout(() => setFoundationSearchQuery(searchQuery), 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const [dataSource, setDataSource] = useState('取得状態を確認中');
  const [foundationRows, setFoundationRows] = useState<FoundationValueSummary[]>([]);
  const [foundationTotal, setFoundationTotal] = useState<number | null>(null);
  const [foundationNextCursor, setFoundationNextCursor] = useState<string | null>(null);
  const [foundationHasMore, setFoundationHasMore] = useState(false);
  const [foundationLoading, setFoundationLoading] = useState(false);
  const [newArrivalsRelease, setNewArrivalsRelease] = useState<FoundationValuePage['newArrivals']>(null);
  const foundationLoadingRef = useRef(false);
  const foundationRequestedCursors = useRef(new Set<string>());
  const foundationLoadedQuery = useRef<string | null>(null);

  const [detailedEntities, setDetailedEntities] = useState<Record<string, FinancialEntity>>({});
  const detailFetchInProgress = useRef(new Set<string>());

  // Source research is immutable. Approved IDs are a separate persisted editorial overlay.
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [approvalProjectionEpoch, setApprovalProjectionEpoch] = useState(0);
  // Negative results expire. Positive approvals are monotonic and live in approvedIds.
  const negativeApprovalCheckedAt = useRef(new Map<string, number>());

  useEffect(() => {
    let timer: number | null = null;

    const stopPolling = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const startPolling = () => {
      if (timer !== null || document.visibilityState !== 'visible') return;
      timer = window.setInterval(
        () => setApprovalProjectionEpoch((value) => value + 1),
        NEGATIVE_APPROVAL_RECHECK_MS,
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        stopPolling();
        return;
      }

      // A hidden tab may have missed approvals. Reconcile once immediately on
      // return, then resume the bounded 20-second cadence only while visible.
      setApprovalProjectionEpoch((value) => value + 1);
      startPolling();
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopPolling();
    };
  }, []);

  // Partial Foundation rows remain visible as standalone records. Readiness is
  // used only when deciding whether a Foundation row may replace an already
  // curated local dossier with the same identity.
  const foundationEntries = useMemo(() => {
    return foundationRows.map((summary) => ({
      summary,
      entity: adaptFoundationSummaryToFinancialEntity(summary),
      readyToReplaceCurated: isFoundationDossierReady(summary),
    }));
  }, [foundationRows]);

  const foundationEntities = useMemo(
    () => foundationEntries.map((entry) => entry.entity),
    [foundationEntries],
  );

  const approvalCandidateIds = useMemo(() => {
    const ids = new Set<string>();
    const addCandidate = (entity: FinancialEntity) => {
      if (isApprovalCandidate(entity)) ids.add(entity.id.trim().toLowerCase());
    };
    coreEntities.forEach(addCandidate);
    foundationEntities.forEach(addCandidate);
    Object.values(detailedEntities).forEach(addCandidate);
    return [...ids];
  }, [coreEntities, foundationEntities, detailedEntities]);

  useEffect(() => {
    const now = Date.now();
    const pendingIds = approvalCandidateIds.filter((id) => {
      if (approvedIds.has(id)) return false;
      const lastNegativeCheck = negativeApprovalCheckedAt.current.get(id) ?? 0;
      return now - lastNegativeCheck >= NEGATIVE_APPROVAL_RECHECK_MS;
    });
    if (pendingIds.length === 0) return;

    const controller = new AbortController();
    void (async () => {
      const approvedThisRun = new Set<string>();
      try {
        for (const chunk of chunks(pendingIds, MAX_APPROVAL_PROJECTION_IDS)) {
          const params = new URLSearchParams();
          chunk.forEach((id) => params.append('entityId', id));
          const response = await fetch(`/api/entities/approve?${params.toString()}`, {
            method: 'GET',
            signal: controller.signal,
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const ids = parseApprovedIds(await response.json());
          const approved = new Set(ids);
          ids.forEach((id) => approvedThisRun.add(id));

          // Only successful reads get a negative timestamp. Aborted/failed chunks
          // remain immediately eligible for the replacement effect. A negative is
          // revalidated after the short TTL so another admin's later approval is
          // discovered without a full page reload.
          const checkedAt = Date.now();
          chunk.forEach((id) => {
            if (approved.has(id)) negativeApprovalCheckedAt.current.delete(id);
            else negativeApprovalCheckedAt.current.set(id, checkedAt);
          });
        }
      } catch (error) {
        if ((error as { name?: string })?.name !== 'AbortError') {
          console.warn('[TerminalShell] Approval projection read failed; source data remains unchanged:', error);
        }
      } finally {
        // Publish positives once per projection run. Updating approvedIds inside the
        // chunk loop would retrigger this effect, abort the next chunk, and duplicate
        // bounded D1 reads. Completed chunks remain useful even if a later chunk aborts.
        if (approvedThisRun.size > 0) {
          setApprovedIds((current) => {
            let changed = false;
            const next = new Set(current);
            approvedThisRun.forEach((id) => {
              if (!next.has(id)) {
                next.add(id);
                changed = true;
              }
            });
            return changed ? next : current;
          });
        }
      }
    })();
    return () => controller.abort();
  }, [approvalCandidateIds, approvedIds, approvalProjectionEpoch]);

  // 全エンティティの統合
  const entities = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().trim().replace(/[\s\-_・（）()株式会社有限会社]/g, '');
    const foundationById = new Map(
      foundationEntries.map((entry) => [entry.entity.id.toLowerCase(), entry])
    );
    const foundationByName = new Map(
      foundationEntries.map((entry) => [normalize(entry.entity.name), entry])
    );
    const aliasMatches: Record<string, string> = {
      'aliabdaal': 'aliabdaalcourses',
      'aliabdaalcourses': 'aliabdaal',
      'eggheadio': 'egghead',
      'egghead': 'eggheadio',
    };

    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const merged: FinancialEntity[] = [];
    for (const core of coreEntities) {
      const coreName = normalize(core.name);
      const candidate = foundationById.get(core.id.toLowerCase()) ||
        (coreName ? foundationByName.get(coreName) || foundationByName.get(aliasMatches[coreName]) : undefined);
      const replacement = candidate?.readyToReplaceCurated ? candidate.entity : undefined;
      const entity = replacement ? { ...replacement, batchId: replacement.batchId || core.batchId } : core;
      const normalizedName = normalize(entity.name);
      if (seenIds.has(entity.id.toLowerCase()) || (normalizedName && seenNames.has(normalizedName))) continue;
      merged.push(entity);
      seenIds.add(entity.id.toLowerCase());
      if (normalizedName) seenNames.add(normalizedName);
    }

    for (const foundation of foundationEntities) {
      const normalizedName = normalize(foundation.name);
      const aliasName = aliasMatches[normalizedName];
      if (seenIds.has(foundation.id.toLowerCase()) || (normalizedName && seenNames.has(normalizedName)) || (aliasName && seenNames.has(aliasName))) continue;
      merged.push(foundation);
      seenIds.add(foundation.id.toLowerCase());
      if (normalizedName) seenNames.add(normalizedName);
    }

    return merged.map((item) => approvedIds.has(item.id.toLowerCase()) ? removeCollectionTag(item) : item);
  }, [coreEntities, foundationEntries, foundationEntities, approvedIds]);

  // Detailed records use the same persisted overlay as summaries. Keep the raw
  // fetched object intact so changing an approval never mutates source evidence.
  const visibleDetailedEntities = useMemo(() => {
    const next: Record<string, FinancialEntity> = {};
    for (const [key, entity] of Object.entries(detailedEntities)) {
      next[key] = approvedIds.has(entity.id.toLowerCase()) ? removeCollectionTag(entity) : entity;
    }
    return next;
  }, [approvedIds, detailedEntities]);

  // 資本主義の動的攻略本マクロ集計データ
  const macroData = useMemo(() => {
    return aggregateMacroIntelligence(entities);
  }, [entities]);

  const mergeFoundationRows = useCallback((incoming: FoundationValueSummary[], replace = false) => {
    setFoundationRows((current) => {
      const next = replace ? [] : [...current];
      const seen = new Set(next.map((item) => item.id));
      for (const item of incoming) {
        if (!seen.has(item.id)) {
          next.push(item);
          seen.add(item.id);
        }
      }
      return next;
    });
  }, []);

  const loadFoundationPage = useCallback(async (cursor?: string, signal?: AbortSignal): Promise<FoundationValuePage | null> => {
    const queryChanged = foundationLoadedQuery.current !== foundationSearchQuery;
    const effectiveCursor = queryChanged ? undefined : cursor;
    if (effectiveCursor && foundationLoadingRef.current) return null;
    const requestQuery = foundationSearchQuery;
    const requestId = foundationRequestId.current + 1;
    foundationRequestId.current = requestId;
    const isCurrentRequest = () => foundationRequestId.current === requestId &&
      foundationLoadedQuery.current === requestQuery &&
      latestSearchQuery.current === requestQuery;
    if (!effectiveCursor) {
      foundationLoadedQuery.current = requestQuery;
      foundationRequestedCursors.current.clear();
      if (queryChanged) {
        // A new search must not reuse the previous Foundation page cursor. The
        // source remains immutable; only this read-through projection is reset.
        setFoundationRows([]);
        setFoundationTotal(null);
        setFoundationNextCursor(null);
        setFoundationHasMore(false);
        setNewArrivalsRelease(null);
      }
    }
    foundationLoadingRef.current = true;
    setFoundationLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(FOUNDATION_PAGE_REQUEST_LIMIT), foundationOnly: 'true' });
      if (requestQuery.trim()) params.set('q', requestQuery.trim());
      if (effectiveCursor) params.set('cursor', effectiveCursor);
      let payload: unknown;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000);
          const res = await fetch(`/api/businesses?${params.toString()}`, { signal: requestSignal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          payload = await res.json();
          break;
        } catch (cause) {
          lastError = cause;
          if (attempt === 1 || signal?.aborted) throw cause;
          await new Promise<void>((resolve) => window.setTimeout(resolve, 350));
        }
      }
      if (payload === undefined) throw lastError instanceof Error ? lastError : new Error('Invalid Foundation page');
      const source = payload && typeof payload === 'object' && !Array.isArray(payload) && typeof (payload as { source?: unknown }).source === 'string'
        ? (payload as { source: string }).source
        : undefined;
      const page = parseFoundationPageResponse(payload);
      // A cursor request from the previous query may finish after the new
      // query has started. Its rows and cursor must never overwrite the new
      // query's read-through state.
      if (!isCurrentRequest() || signal?.aborted) return null;
      const reportedTotal = payload && typeof payload === 'object' && !Array.isArray(payload)
        ? (payload as { total?: unknown }).total
        : undefined;
      setFoundationTotal(Number.isSafeInteger(reportedTotal) && (reportedTotal as number) >= 0
        ? reportedTotal as number
        : null);
      setDataSource(source === 'foundation_lake'
        ? '保存済み台帳 + Foundation R2'
        : source === 'local_fallback'
          ? '保存済み台帳（ローカル予備）'
          : source === 'static_fallback'
            ? '保存済み台帳（静的予備）'
            : '保存済み台帳（外部取得なし）');
      if (page) {
        mergeFoundationRows(page.data, !effectiveCursor);
        if (page.newArrivals || !effectiveCursor) setNewArrivalsRelease(page.newArrivals);
        const nextCursor = page.nextCursor && page.nextCursor !== effectiveCursor ? page.nextCursor : null;
        setFoundationNextCursor(nextCursor);
        setFoundationHasMore(page.hasMore && Boolean(nextCursor));
        return page;
      }
      return null;
    } finally {
      if (isCurrentRequest()) {
        foundationLoadingRef.current = false;
        setFoundationLoading(false);
      }
    }
  }, [foundationSearchQuery, mergeFoundationRows]);

  const loadMoreFoundation = useCallback(() => {
    const cursor = foundationNextCursor;
    if (!cursor || foundationLoadingRef.current) return;
    if (foundationRequestedCursors.current.has(cursor)) {
      setFoundationNextCursor(null);
      setFoundationHasMore(false);
      return;
    }
    foundationRequestedCursors.current.add(cursor);
    void loadFoundationPage(cursor).catch((error) => {
      setFoundationHasMore(false);
      setDataSource('保存済み台帳（追加取得に失敗）');
      console.warn('[TerminalShell] Additional Foundation page failed:', error);
    });
  }, [foundationNextCursor, loadFoundationPage]);

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
      // Give the scheduled writer a short propagation/readback margin after
      // the public boundary. The writer itself still runs hourly.
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
        await loadFoundationPage(undefined, controller.signal);
      } catch (error) {
        if ((error as { name?: string })?.name !== 'AbortError') {
          // Foundation is an optional read-through path. Keep the accepted
          // curated catalog usable when the local R2/API bridge is temporarily
          // unavailable, and state the actual boundary instead of presenting
          // the whole ledger as failed.
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
  }, [loadFoundationPage]);

  // オンデマンド詳細読み込み関数
  const fetchEntityDetailOnDemand = useCallback((targetId: string, latestDossierHash?: string) => {
    if (detailedEntities[targetId] || detailFetchInProgress.current.has(targetId)) return;

    detailFetchInProgress.current.add(targetId);
    const normalizedTargetId = targetId.toLowerCase();
    const knownFoundation = foundationRows.some((row) => row.id.toLowerCase() === normalizedTargetId);
    const knownCurated = coreEntities.some((entity) => entity.id.toLowerCase() === normalizedTargetId);

    void fetchBusinessDetailResponse(fetch, {
      targetId,
      latestDossierHash,
      knownCurated,
      knownFoundation,
    }).then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: unknown = await res.json();
        if (json && typeof json === 'object') {
          const payload = json as { source?: string; data?: unknown };
          if (payload.source === 'foundation_lake') {
            const detail = parseFoundationDetailResponse(payload);
            if (detail) {
              const adapted = adaptFoundationDetailToFinancialEntity(detail);
              setDetailedEntities((prev) => ({ ...prev, [targetId]: adapted }));
            }
          } else if (payload.data && typeof payload.data === 'object') {
            const entity = parseFinancialEntity(payload.data);
            if (entity.id !== targetId) throw new Error('Detail entity identity mismatch');
            setDetailedEntities((prev) => ({ ...prev, [targetId]: entity }));
          }
        }
      })
      .catch((err) => {
        console.warn('[TerminalShell] Detail fetch failed for', targetId, err);
      })
      .finally(() => {
        detailFetchInProgress.current.delete(targetId);
      });
  }, [coreEntities, detailedEntities, foundationRows]);

  return {
    entities,
    catalogLoadedCount: catalog.loadedCount,
    catalogTotal: catalog.totalCount,
    foundationLoadedCount: foundationRows.length,
    foundationTotal,
    dataSource: catalog.error || dataSource,
    macroData,
    foundationHasMore: foundationHasMore || catalog.hasMore, foundationLoading, catalogLoading: catalog.loading,
    newArrivalsRelease,
    detailedEntities: visibleDetailedEntities,
    setDetailedEntities,
    approvedIds,
    setApprovedIds,
    setCatalogFilters,
    loadMoreFoundation: () => { loadMoreFoundation(); catalog.loadMore(); },
    fetchEntityDetailOnDemand,
  };
}
