'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { FinancialEntity } from '@/shared/terminal';
import type { WorkspaceMode } from '../types/terminal';
import { parseCompanyAnalysis } from '@/lib/company-access/schema';
import { useViewHistory } from './useViewHistory';
import { useAuth } from '../../context/AuthContext';

interface UseSelectedEntityNavigationProps {
  entities: FinancialEntity[];
  filteredEntities: FinancialEntity[];
  deepDiveEntities: FinancialEntity[];
  workspaceMode: WorkspaceMode;
  detailedEntities: Record<string, FinancialEntity>;
  entityAliases: Record<string, string>;
  onFetchEntityDetailOnDemand: (id: string, hash?: string) => void;
}

export function useSelectedEntityNavigation({
  entities,
  filteredEntities,
  deepDiveEntities,
  workspaceMode,
  detailedEntities,
  entityAliases,
  onFetchEntityDetailOnDemand,
}: UseSelectedEntityNavigationProps) {
  const { viewedEntityIds, recordView } = useViewHistory();
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get('q') || '';
  const entityParam = searchParams?.get('entity');

  const initialEntityId =
    (entityParam ? entityAliases[entityParam] || entityParam : null) ||
    (queryParam
      ? entities.find(
          (e) =>
            e.name.toLowerCase().includes(queryParam.toLowerCase()) ||
            e.ticker.toLowerCase().includes(queryParam.toLowerCase())
        )?.id || entities[0]?.id || null
      : entities[0]?.id || null);

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(initialEntityId);
  const appliedNavigation = useRef<string | null>(null);

  // オンデマンド詳細読み込み
  useEffect(() => {
    if (!selectedEntityId) return;
    const existing = entities.find((e) => e.id === selectedEntityId);
    if (existing && existing.evidenceCards && existing.evidenceCards.length >= 2 && existing.lootBlueprint) {
      return;
    }
    onFetchEntityDetailOnDemand(selectedEntityId, existing?.latestDossierHash);
  }, [selectedEntityId, entities, onFetchEntityDetailOnDemand]);

  // URLパラメータ変更の同期
  useEffect(() => {
    const navigationKey = JSON.stringify([entityParam, queryParam]);
    if (appliedNavigation.current === navigationKey) return;
    if (entityParam) {
      appliedNavigation.current = navigationKey;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedEntityId(entityAliases[entityParam] || entityParam);
    } else if (queryParam) {
      const matched = entities.find(
        (e) =>
          e.name.toLowerCase().includes(queryParam.toLowerCase()) ||
          e.ticker.toLowerCase().includes(queryParam.toLowerCase()) ||
          e.strategy.blindspot.toLowerCase().includes(queryParam.toLowerCase())
      );
      if (matched) {
        appliedNavigation.current = navigationKey;
        setSelectedEntityId(matched.id);
      }
    } else {
      appliedNavigation.current = navigationKey;
    }
  }, [entityParam, queryParam, entities, entityAliases]);

  // 閲覧履歴の自動追跡
  useEffect(() => {
    if (selectedEntityId) {
      recordView(selectedEntityId);
    }
  }, [selectedEntityId, recordView]);

  // PRO分析データフェッチ
  const { isPro: authIsPro, token } = useAuth();
  const [analysis, setAnalysis] = useState<{ id: string; token: string; meta: NonNullable<FinancialEntity['meta']> } | null>(null);

  useEffect(() => {
    if (!authIsPro || !token || !selectedEntityId) return;
    const controller = new AbortController();
    void fetch(`/api/company-analysis?entity_id=${encodeURIComponent(selectedEntityId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal,
    }).then(async (result) => {
      if (!result.ok) return;
      const body = await result.json();
      const meta = parseCompanyAnalysis(body.meta);
      if (!controller.signal.aborted && body.entityId === selectedEntityId) {
        setAnalysis({ id: selectedEntityId, token, meta });
      }
    }).catch(() => {
      /* Never unlock on failed authorization or invalid data. */
    });
    return () => controller.abort();
  }, [selectedEntityId, token, authIsPro]);

  // 選択中エンティティの合成
  const selectedEntity = useMemo(() => {
    if (!selectedEntityId) return null;
    const entity = detailedEntities[selectedEntityId] || entities.find((e) => e.id === selectedEntityId);
    if (!entity) return null;
    if (authIsPro && token && analysis?.token === token && analysis.id === selectedEntityId) {
      return { ...entity, meta: analysis.meta };
    }
    return entity;
  }, [selectedEntityId, detailedEntities, entities, authIsPro, token, analysis]);

  // 前後送りハンドラー
  const handlePrevEntity = useCallback(() => {
    const list = workspaceMode === 'DEEP_DIVE' ? deepDiveEntities : filteredEntities;
    if (!selectedEntityId || list.length === 0) return;
    const currentIndex = list.findIndex((e) => e.id === selectedEntityId);
    if (currentIndex > 0) {
      setSelectedEntityId(list[currentIndex - 1].id);
    }
  }, [selectedEntityId, workspaceMode, deepDiveEntities, filteredEntities]);

  const handleNextEntity = useCallback(() => {
    const list = workspaceMode === 'DEEP_DIVE' ? deepDiveEntities : filteredEntities;
    if (!selectedEntityId || list.length === 0) return;
    const currentIndex = list.findIndex((e) => e.id === selectedEntityId);
    if (currentIndex >= 0 && currentIndex < list.length - 1) {
      setSelectedEntityId(list[currentIndex + 1].id);
    }
  }, [selectedEntityId, workspaceMode, deepDiveEntities, filteredEntities]);

  return {
    selectedEntityId,
    setSelectedEntityId,
    selectedEntity,
    viewedEntityIds,
    handlePrevEntity,
    handleNextEntity,
  };
}
