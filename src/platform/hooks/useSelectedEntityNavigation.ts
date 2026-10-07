'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { FinancialEntity } from '@/shared/terminal';
import { parseCompanyAnalysis } from '@/lib/company-access/schema';
import { useViewHistory } from './useViewHistory';
import { isDetailSettled, preferDetail } from '@/shared/dossier-authority';
import { useAuth } from '../../context/AuthContext';
import { openEntityParam } from '../utils/entityUrl';

interface UseSelectedEntityNavigationProps {
  entities: FinancialEntity[];
  filteredEntities: FinancialEntity[];
  detailedEntities: Record<string, FinancialEntity>;
  /** 公開目録の先頭の事例。届いたらPC幅で自動表示する（届くまで null） */
  defaultEntityId?: string | null;
  onFetchEntityDetailOnDemand: (id: string, hash?: string) => void;
}

export function useSelectedEntityNavigation({
  entities,
  filteredEntities,
  detailedEntities,
  defaultEntityId = null,
  onFetchEntityDetailOnDemand,
}: UseSelectedEntityNavigationProps) {
  const { viewedEntityIds, recordView } = useViewHistory();
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get('q') || '';
  const rawEntityParam = searchParams?.get('entity');
  // ?entity=ENT_... の大文字小文字・空白の違いは、手元の一覧にある正式な ID に直す（無ければ前後の空白だけ取る）
  const trimmedEntityParam = rawEntityParam?.trim() ?? rawEntityParam;
  const entityParam = trimmedEntityParam
    ? (entities.find((e) => e.id.toLowerCase() === trimmedEntityParam.toLowerCase())?.id ?? trimmedEntityParam)
    : trimmedEntityParam;

  const initialEntityId =
    entityParam ||
    (queryParam
      ? entities.find(
          (e) =>
            e.name.toLowerCase().includes(queryParam.toLowerCase()) ||
            e.ticker.toLowerCase().includes(queryParam.toLowerCase())
        )?.id || entities[0]?.id || null
      : entities[0]?.id || null);

  const [selectedEntityId, setSelectedEntityIdState] = useState<string | null>(initialEntityId);
  // 利用者が自分で開いた事例か（URLの ?entity=・検索語・クリック・キー操作）。
  // PCで最初の事例を自動で表示しているだけのときは false にして、「閲覧中」や強調表示に使わない
  const [selectionIsExplicit, setSelectionIsExplicit] = useState(Boolean(entityParam || queryParam));
  // 最初の事例の自動表示を済ませた（または利用者が操作した）か。閉じた後に勝手に開き直さないための印
  const autoSelectSettled = useRef(initialEntityId !== null);
  const setSelectedEntityId = useCallback((id: string | null) => {
    autoSelectSettled.current = true;
    setSelectionIsExplicit(id !== null);
    setSelectedEntityIdState(id);
  }, []);
  const appliedNavigation = useRef<string | null>(null);
  const previousEntityParam = useRef<string | null>(entityParam ?? null);

  // 本番は公開目録がブラウザに届いてから先頭の事例を自動で表示する（サーバー側では詳細を読まない）。
  // 自動表示は「利用者が開いた」扱いにしない。詳細欄が見えない幅（スマホ）では選ばず、詳細も取りに行かない
  useEffect(() => {
    if (autoSelectSettled.current || selectedEntityId || entityParam || queryParam || !defaultEntityId) return;
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    autoSelectSettled.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedEntityIdState(defaultEntityId);
  }, [defaultEntityId, selectedEntityId, entityParam, queryParam]);

  // オンデマンド詳細読み込み
  useEffect(() => {
    if (!selectedEntityId) return;
    const existing = entities.find((e) => e.id === selectedEntityId);
    if (isDetailSettled(existing)) {
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
      setSelectedEntityId(entityParam);
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
      // 戻る操作などで ?entity= が消えたら詳細を閉じる
      if (previousEntityParam.current) setSelectedEntityId(null);
    }
    previousEntityParam.current = entityParam ?? null;
  }, [entityParam, queryParam, entities, setSelectedEntityId]);

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
    const listed = entities.find((e) => e.id === selectedEntityId);
    const detailed = detailedEntities[selectedEntityId];
    const entity = detailed ? preferDetail(listed, detailed) : listed;
    if (!entity) return null;
    if (authIsPro && token && analysis?.token === token && analysis.id === selectedEntityId) {
      return { ...entity, meta: analysis.meta };
    }
    return entity;
  }, [selectedEntityId, detailedEntities, entities, authIsPro, token, analysis]);

  // 前後送りハンドラー
  const handlePrevEntity = useCallback(() => {
    const list = filteredEntities;
    if (!selectedEntityId || list.length === 0) return;
    const currentIndex = list.findIndex((e) => e.id === selectedEntityId);
    if (currentIndex > 0) {
      setSelectedEntityId(list[currentIndex - 1].id);
      openEntityParam(list[currentIndex - 1].id);
    }
  }, [selectedEntityId, filteredEntities, setSelectedEntityId]);

  const handleNextEntity = useCallback(() => {
    const list = filteredEntities;
    if (!selectedEntityId || list.length === 0) return;
    const currentIndex = list.findIndex((e) => e.id === selectedEntityId);
    if (currentIndex >= 0 && currentIndex < list.length - 1) {
      setSelectedEntityId(list[currentIndex + 1].id);
      openEntityParam(list[currentIndex + 1].id);
    }
  }, [selectedEntityId, filteredEntities, setSelectedEntityId]);

  return {
    selectedEntityId,
    /** 利用者が開いた事例のID（自動で表示しているだけなら null） */
    openedEntityId: selectionIsExplicit ? selectedEntityId : null,
    setSelectedEntityId,
    selectedEntity,
    viewedEntityIds,
    handlePrevEntity,
    handleNextEntity,
  };
}
