'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import type {
  FoundationValuePage,
  FoundationValueSummary,
} from '@/lib/foundation/business-reader';
import {
  parseFoundationPageResponse,
  parseFoundationDetailResponse,
} from '@/lib/foundation/schema';
import {
  adaptFoundationSummaryToFinancialEntity,
  adaptFoundationDetailToFinancialEntity,
  isFoundationDossierReady,
} from '@/lib/foundation/foundation-adapter';
import { aggregateMacroIntelligence } from '@/lib/intelligence/macro-aggregator';

export function useFoundationCatalog(initialEntities: FinancialEntity[]) {
  const coreEntities = initialEntities;

  const [dataSource, setDataSource] = useState('取得状態を確認中');
  const [foundationRows, setFoundationRows] = useState<FoundationValueSummary[]>([]);
  const [foundationNextCursor, setFoundationNextCursor] = useState<string | null>(null);
  const [foundationHasMore, setFoundationHasMore] = useState(false);
  const [foundationLoading, setFoundationLoading] = useState(false);
  const foundationLoadingRef = useRef(false);
  const foundationRequestedCursors = useRef(new Set<string>());

  const [detailedEntities, setDetailedEntities] = useState<Record<string, FinancialEntity>>({});
  const detailFetchInProgress = useRef(new Set<string>());

  // ユーザー承認済みエンティティID（収集事例タグから除外するID一覧）
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());

  // R2の完成体候補のみを抽出
  const foundationDisplayRows = useMemo(() => {
    return foundationRows.filter(isFoundationDossierReady);
  }, [foundationRows]);

  // 公開対象になったR2サマリーを台帳用 FinancialEntity へ変換
  const foundationEntities = useMemo(() => {
    return foundationDisplayRows.map((summary) => adaptFoundationSummaryToFinancialEntity(summary));
  }, [foundationDisplayRows]);

  // 全エンティティの統合
  const entities = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().trim().replace(/[\s\-_・（）()株式会社有限会社]/g, '');
    const foundationById = new Map(foundationEntities.map((entity) => [entity.id.toLowerCase(), entity]));
    const foundationByName = new Map(foundationEntities.map((entity) => [normalize(entity.name), entity]));
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
      const replacement = foundationById.get(core.id.toLowerCase()) ||
        (coreName ? foundationByName.get(coreName) || foundationByName.get(aliasMatches[coreName]) : undefined);
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

    // 承認済みエンティティからは「収集事例」タグを即時除外（楽観的UI）
    return merged.map((item) => {
      if (approvedIds.has(item.id.toLowerCase())) {
        return {
          ...item,
          tags: (item.tags || []).filter((t) => t !== '収集事例'),
        };
      }
      return item;
    });
  }, [coreEntities, foundationEntities, approvedIds]);

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
    if (cursor && foundationLoadingRef.current) return null;
    if (!cursor) foundationRequestedCursors.current.clear();
    foundationLoadingRef.current = true;
    setFoundationLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/businesses?${params.toString()}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload: unknown = await res.json();
      const source = payload && typeof payload === 'object' && !Array.isArray(payload) && typeof (payload as { source?: unknown }).source === 'string'
        ? (payload as { source: string }).source
        : undefined;
      const page = parseFoundationPageResponse(payload);
      setDataSource(source === 'foundation_lake'
        ? '保存済み台帳 + Foundation R2'
        : source === 'local_fallback'
          ? '保存済み台帳（ローカル予備）'
          : source === 'static_fallback'
            ? '保存済み台帳（静的予備）'
            : '保存済み台帳（外部取得なし）');
      if (page) {
        mergeFoundationRows(page.data, !cursor);
        const nextCursor = page.nextCursor && page.nextCursor !== cursor ? page.nextCursor : null;
        setFoundationNextCursor(nextCursor);
        setFoundationHasMore(page.hasMore && Boolean(nextCursor));
        return page;
      }
      return null;
    } finally {
      foundationLoadingRef.current = false;
      setFoundationLoading(false);
    }
  }, [mergeFoundationRows]);

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
    const controller = new AbortController();
    void loadFoundationPage(undefined, controller.signal).catch((error) => {
      if ((error as { name?: string })?.name !== 'AbortError') {
        setDataSource('保存済み台帳（外部取得に失敗）');
        console.warn('[TerminalShell] Foundation Lake read failed; static UI remains available:', error);
      }
    });
    return () => controller.abort();
  }, [loadFoundationPage]);

  // オンデマンド詳細読み込み関数
  const fetchEntityDetailOnDemand = useCallback((targetId: string, latestDossierHash?: string) => {
    if (detailedEntities[targetId] || detailFetchInProgress.current.has(targetId)) return;

    detailFetchInProgress.current.add(targetId);
    const hashParam = latestDossierHash
      ? `&dossier_hash=${encodeURIComponent(latestDossierHash)}`
      : '';

    void fetch(`/api/businesses?entity_id=${encodeURIComponent(targetId)}${hashParam}`)
      .then(async (res) => {
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
            setDetailedEntities((prev) => ({ ...prev, [targetId]: payload.data as FinancialEntity }));
          }
        }
      })
      .catch((err) => {
        console.warn('[TerminalShell] Detail fetch failed for', targetId, err);
      })
      .finally(() => {
        detailFetchInProgress.current.delete(targetId);
      });
  }, [detailedEntities]);

  return {
    entities,
    dataSource,
    macroData,
    foundationHasMore,
    foundationLoading,
    detailedEntities,
    setDetailedEntities,
    approvedIds,
    setApprovedIds,
    loadMoreFoundation,
    fetchEntityDetailOnDemand,
  };
}
