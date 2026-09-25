'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import { parseFoundationDetailResponse } from '@/lib/foundation/schema';
import { adaptFoundationSummaryToFinancialEntity, adaptFoundationDetailToFinancialEntity, isFoundationDossierReady } from '@/lib/foundation/foundation-adapter';
import { aggregateMacroIntelligence } from '@/lib/intelligence/macro-aggregator';
import { MAX_APPROVAL_PROJECTION_IDS } from '@/shared/entity-approval-contract';
import { useCuratedCatalog } from './useCuratedCatalog';
import { useFoundationPaging } from './useFoundationPaging';
import { fetchBusinessDetailResponse } from './foundation-detail-request';
import { parseFinancialEntity } from '@/shared/financial-entity-schema';

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

export function useFoundationCatalog(initialEntities: FinancialEntity[], searchQuery = '') {
  const [catalogFilters, setCatalogFilters] = useState('');
  const catalog = useCuratedCatalog(initialEntities, searchQuery, catalogFilters);
  const coreEntities = catalog.entities;
  const foundation = useFoundationPaging(searchQuery, catalog.hasMore);
  const foundationRows = foundation.rows;

  const [detailedEntities, setDetailedEntities] = useState<Record<string, FinancialEntity>>({});
  const detailFetchInProgress = useRef(new Set<string>());

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
    foundationTotal: foundation.total,
    dataSource: catalog.error || foundation.dataSource,
    macroData,
    foundationHasMore: foundation.gridHasMore,
    foundationLoading: foundation.loading,
    catalogLoading: catalog.loading,
    foundationRetryAvailable: foundation.gridRetryAvailable,
    foundationSearchIncomplete: foundation.searchIncomplete,
    foundationSearchContinuationAvailable: foundation.searchContinuationAvailable,
    foundationSearchContinuationFailed: foundation.searchContinuationFailed,
    foundationSearchRetryMessage: foundation.searchRetryMessage,
    newArrivalsRelease: foundation.newArrivalsRelease,
    detailedEntities: visibleDetailedEntities,
    setDetailedEntities,
    approvedIds,
    setApprovedIds,
    setCatalogFilters,
    loadMoreFoundation: () => {
      foundation.loadMore();
      catalog.loadMore();
    },
    continueFoundationSearch: foundation.continueSearch,
    retryFoundationPage: foundation.retryPage,
    fetchEntityDetailOnDemand,
  };
}
