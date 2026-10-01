'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import { MAX_APPROVAL_PROJECTION_IDS } from '@/shared/entity-approval-contract';
import { useCuratedCatalog } from './useCuratedCatalog';
import { fetchBusinessDetailResponse } from './foundation-detail-request';
import { parseFinancialEntity } from '@/shared/financial-entity-schema';
import { hasFullReader, isDetailSettled, preferDetail } from '@/shared/dossier-authority';
import { canonicalCatalogId, filterToCatalog } from '@/shared/catalog-membership';

const NEGATIVE_APPROVAL_RECHECK_MS = 20_000;

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

/**
 * 画面に出す事例の行。公開目録（data/catalog-release.json）にある事例だけを受け取り、出口でも目録の門を通す。
 */
export type DetailFetchStatus = 'failed' | 'done';

export function useCatalogEntities(initialEntities: FinancialEntity[], searchQuery = '') {
  const [catalogFilters, setCatalogFilters] = useState('');
  const catalog = useCuratedCatalog(initialEntities, searchQuery, catalogFilters);
  const coreEntities = useMemo(() => filterToCatalog(catalog.entities), [catalog.entities]);

  const [detailedEntities, setDetailedEntities] = useState<Record<string, FinancialEntity>>({});
  const detailFetchInProgress = useRef(new Set<string>());
  // 詳細の取得が失敗した・採らなかった事例。一覧の再描画のたびに同じ要求を撃ち直さないよう、ページを開き直すまで再取得しない
  const detailFetchSettled = useRef(new Set<string>());
  // 詳細の取得の結末。failed は取り直しても通らなかった事例で、画面は「準備中」ではなく失敗と再読み込みを出す。
  // done は取得が終わった（中身の有無は問わない）事例。どちらも無い間は読み込み中として扱える
  const [detailStatus, setDetailStatus] = useState<Readonly<Record<string, DetailFetchStatus>>>({});
  const lastDetailHash = useRef(new Map<string, string | undefined>());

  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [approvalProjectionEpoch, setApprovalProjectionEpoch] = useState(0);
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

  const approvalCandidateIds = useMemo(() => {
    const ids = new Set<string>();
    const addCandidate = (entity: FinancialEntity) => {
      if (isApprovalCandidate(entity)) ids.add(entity.id.trim().toLowerCase());
    };
    coreEntities.forEach(addCandidate);
    Object.values(detailedEntities).forEach(addCandidate);
    return [...ids];
  }, [coreEntities, detailedEntities]);

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

  const entities = useMemo(
    () => coreEntities.map((item) => approvedIds.has(item.id.toLowerCase()) ? removeCollectionTag(item) : item),
    [coreEntities, approvedIds],
  );

  // Detailed records use the same persisted overlay as summaries. Keep the raw
  // fetched object intact so changing an approval never mutates source evidence.
  const visibleDetailedEntities = useMemo(() => {
    const next: Record<string, FinancialEntity> = {};
    for (const [key, entity] of Object.entries(detailedEntities)) {
      next[key] = approvedIds.has(entity.id.toLowerCase()) ? removeCollectionTag(entity) : entity;
    }
    return next;
  }, [approvedIds, detailedEntities]);

  // オンデマンド詳細読み込み関数（公開目録の事例だけ。目録外は取りに行かない）
  const fetchEntityDetailOnDemand = useCallback((requestedId: string, latestDossierHash?: string) => {
    // ?entity=ENT_... のような大文字小文字・前後の空白の違いは、目録の正式な ID に直してから扱う
    const targetId = canonicalCatalogId(requestedId);
    if (!targetId) return Promise.resolve();
    lastDetailHash.current.set(targetId, latestDossierHash);
    if (detailedEntities[targetId] || detailFetchInProgress.current.has(targetId) || detailFetchSettled.current.has(targetId)) return Promise.resolve();

    detailFetchInProgress.current.add(targetId);
    const markStatus = (status: DetailFetchStatus) => setDetailStatus((prev) =>
      prev[targetId] === status ? prev : { ...prev, [targetId]: status });
    return fetchBusinessDetailResponse(fetch, { targetId, latestDossierHash })
      .then(async (res) => {
        if (res.status === 404) {
          // 公開されていない・見つからない事例。取り直しても同じなので、ページを開き直すまで撃ち直さない
          detailFetchSettled.current.add(targetId);
          markStatus('done');
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: unknown = await res.json();
        if (json && typeof json === 'object') {
          const payload = json as { data?: unknown };
          if (payload.data && typeof payload.data === 'object') {
            const entity = parseFinancialEntity(payload.data);
            if (entity.id !== targetId) throw new Error('Detail entity identity mismatch');
            setDetailedEntities((prev) => ({ ...prev, [targetId]: preferDetail(prev[targetId], entity) }));
          }
        }
        markStatus('done');
      })
      .catch((err) => {
        // 取り直しても通らなかった。一覧の再描画で撃ち直さないよう止め、画面の再読み込みだけで取り直す
        detailFetchSettled.current.add(targetId);
        markStatus('failed');
        console.warn('[TerminalShell] Detail fetch failed for', targetId, err);
      })
      .finally(() => {
        detailFetchInProgress.current.delete(targetId);
      });
  }, [detailedEntities]);

  /** 詳細の取得に失敗した事例を、利用者の「再読み込み」で取り直す。 */
  const retryEntityDetail = useCallback((requestedId: string) => {
    const targetId = canonicalCatalogId(requestedId);
    if (!targetId || detailStatus[targetId] !== 'failed' || detailFetchInProgress.current.has(targetId)) return Promise.resolve();
    detailFetchSettled.current.delete(targetId);
    setDetailStatus((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
    return fetchEntityDetailOnDemand(targetId, lastDetailHash.current.get(targetId));
  }, [detailStatus, fetchEntityDetailOnDemand]);

  /** 詳細ペインに渡す取得状態。取得中・失敗を「準備中」と取り違えないために使う。取得が終わっていれば undefined。 */
  const detailStateFor = useCallback((entity: FinancialEntity): 'loading' | 'failed' | undefined => {
    const status = detailStatus[entity.id];
    if (status === 'failed') return 'failed';
    return !status && !hasFullReader(entity) && !isDetailSettled(entity) ? 'loading' : undefined;
  }, [detailStatus]);

  return {
    entities,
    catalogFirstId: catalog.firstId,
    catalogLoadedCount: catalog.loadedCount,
    catalogTotal: catalog.totalCount,
    /** 目録を読み込めなかった時の理由。null なら正常 */
    catalogError: catalog.error,
    hasMore: catalog.hasMore,
    catalogLoading: catalog.loading,
    detailedEntities: visibleDetailedEntities,
    setDetailedEntities,
    approvedIds,
    setApprovedIds,
    setCatalogFilters,
    loadMore: catalog.loadMore,
    fetchEntityDetailOnDemand,
    detailStateFor,
    retryEntityDetail,
  };
}
