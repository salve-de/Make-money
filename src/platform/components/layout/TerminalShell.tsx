'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseCompanyAnalysis } from '@/lib/company-access/schema';
import { parseFoundationPageResponse, parseFoundationDetailResponse } from '@/lib/foundation/schema';
import { INTELLIGENCE_DOSSIERS } from '../../data/intelligenceDossiers';
import { FinancialEntity, GridFilterOption, WorkspaceMode, IntelligenceTopicId } from '../../types/terminal';
import { MarketTickerStrip } from '../ticker/MarketTickerStrip';
import { TerminalSidebar } from '../navigation/TerminalSidebar';
import { DataGridToolbar } from '../grid/DataGridToolbar';
import { InstitutionalDataGrid } from '../grid/InstitutionalDataGrid';
import { CompanyInspectorPane } from '@/features/company-inspector';
import { TacticalArchetypesView } from '../archetypes/TacticalArchetypesView';
import { StrategySynthesisView } from '../synthesis/StrategySynthesisView';
import { PlaybookIntelligenceView } from '../playbook/PlaybookIntelligenceView';
import { aggregateMacroIntelligence } from '@/lib/intelligence/macro-aggregator';
import { useAnalystNotes } from '../../hooks/useAnalystNotes';
import { useViewHistory } from '../../hooks/useViewHistory';
import { GlobalCommandPalette } from '../command/GlobalCommandPalette';
import { AdvancedScreenerModal, ScreenerFilterState } from '../screener/AdvancedScreenerModal';
import { MobileBottomNav } from '../navigation/MobileBottomNav';
import { ProModal } from '../../../components/terminal/ProModal';
import { useAuth } from '../../../context/AuthContext';
import type {
  FoundationValuePage,
  FoundationValueSummary,
} from '@/lib/foundation/business-reader';
import {
  adaptFoundationSummaryToFinancialEntity,
  adaptFoundationDetailToFinancialEntity,
} from '@/lib/foundation/foundation-adapter';

export const TerminalShell: React.FC<{initialEntities: FinancialEntity[]; entityAliases: Record<string, string>}> = ({initialEntities, entityAliases}) => {
  const { viewedEntityIds, recordView } = useViewHistory();
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get('q') || '';
  const modeParam = searchParams?.get('mode') as WorkspaceMode | null;
  const topicParam = searchParams?.get('topic') as IntelligenceTopicId | null;
  const entityParam = searchParams?.get('entity');
  const filterParam = searchParams?.get('filter') as GridFilterOption | null;

  // アナリスト考察メモの永続化フック
  const { notes, getNote, saveNote, getSaveStatus } = useAnalystNotes();

  // 表示モード (LEDGER: 台帳 / RADAR: 動向レーダー / SYNTHESIS: 戦略壁打ち＆独自アイデア合成)
  const initialMode: WorkspaceMode = modeParam || 'LEDGER';
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(initialMode);

  // 特集トピックID (nullの場合は特集カタログ一覧を表示)
  const initialTopic: IntelligenceTopicId | null =
    topicParam && INTELLIGENCE_DOSSIERS.some((d) => d.id === topicParam)
      ? topicParam
      : null;
  const [activeTopicId, setActiveTopicId] = useState<IntelligenceTopicId | null>(initialTopic);

  const initialFilter: GridFilterOption = filterParam || 'ALL';
  const [currentFilter, setCurrentFilter] = useState<GridFilterOption>(initialFilter);
  const [searchQuery, setSearchQuery] = useState<string>(queryParam);

  // 1. 静的・自社重点事例（キーエンス、Photo AI、ShipFast等）
  const coreEntities = initialEntities;

  // 2. Foundation Lake (R2) から取得したグローバル企業サマリー
  const [dataSource, setDataSource] = useState('取得状態を確認中');
  const [foundationRows, setFoundationRows] = useState<FoundationValueSummary[]>([]);
  const [foundationNextCursor, setFoundationNextCursor] = useState<string | null>(null);
  const [foundationHasMore, setFoundationHasMore] = useState(false);
  const [foundationLoading, setFoundationLoading] = useState(false);
  const foundationLoadingRef = useRef(false);
  const foundationRequestedCursors = useRef(new Set<string>());

  // 3. 詳細フェッチ済みエンティティのキャッシュマップ (R2詳細 ➔ FinancialEntity)
  const [detailedEntities, setDetailedEntities] = useState<Record<string, FinancialEntity>>({});
  const detailFetchInProgress = useRef(new Set<string>());

  // R2サマリーを FinancialEntity へアダプト
  const foundationEntities = useMemo(() => {
    return foundationRows.map((summary) => adaptFoundationSummaryToFinancialEntity(summary));
  }, [foundationRows]);

  // 全エンティティの統合。Foundationに同じentity_idがある場合は、
  // ローカルの旧スナップショットを一覧の正本として残さず、R2投影を優先する。
  // R2でまだページングされていない対象だけは、読み取り不能時のローカル予備として残す。
  const entities = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const foundationById = new Map(foundationEntities.map((entity) => [entity.id.toLowerCase(), entity]));
    const foundationByName = new Map(foundationEntities.map((entity) => [normalize(entity.name), entity]));
    // 特殊エイリアスマッピング（R2の名前 ↔ coreName）
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
        foundationByName.get(coreName) ||
        foundationByName.get(aliasMatches[coreName]);
      const entity = replacement || core;
      const normalizedName = normalize(entity.name);
      if (seenIds.has(entity.id.toLowerCase()) || seenNames.has(normalizedName)) continue;
      merged.push(entity);
      seenIds.add(entity.id.toLowerCase());
      seenNames.add(normalizedName);
    }

    for (const foundation of foundationEntities) {
      const normalizedName = normalize(foundation.name);
      const aliasName = aliasMatches[normalizedName];
      if (seenIds.has(foundation.id.toLowerCase()) || seenNames.has(normalizedName) || (aliasName && seenNames.has(aliasName))) continue;
      // Foundationの正本に存在する行は、財務やタグラインが未確認でも一覧に残す。
      // 欠損値はprojection/UI側で「未確認」と表示し、存在する記録を静かに捨てない。
      merged.push(foundation);
      seenIds.add(foundation.id.toLowerCase());
      seenNames.add(normalizedName);
    }
    return merged;
  }, [coreEntities, foundationEntities]);

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

  // 認知負荷ゼロ・即時着火: entityParam指定があればそれ、なければPhoto AI（粗利84%ソロ企業）をデフォルト自動展開
  const initialEntityId =
    (entityParam ? entityAliases[entityParam] || entityParam : null) ||
    (queryParam
      ? entities.find(
          (e) =>
            e.name.toLowerCase().includes(queryParam.toLowerCase()) ||
            e.ticker.toLowerCase().includes(queryParam.toLowerCase())
        )?.id || 'ent_keyence'
      : 'ent_keyence');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(initialEntityId);
  // 市場の歪み（Market Anomaly）選択ステート
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);

  // R2詳細読み込みロジック (選択されたエンティティがR2由来の場合に自動フェッチして完全版に昇華)
  useEffect(() => {
    if (!selectedEntityId) return;
    // Foundationに同じIDが存在する対象は、ローカル旧スナップショットではなく
    // R2詳細を読む。R2行がまだ到着していない間だけローカル予備を使う。
    const foundationHasEntity = foundationRows.some((row) => row.id === selectedEntityId);
    if (!foundationHasEntity && coreEntities.some((e) => e.id === selectedEntityId)) return;
    // 既に詳細取得済みまたは取得中ならスキップ
    if (detailedEntities[selectedEntityId] || detailFetchInProgress.current.has(selectedEntityId)) return;

    detailFetchInProgress.current.add(selectedEntityId);
    const controller = new AbortController();

    void fetch(`/api/businesses?entity_id=${encodeURIComponent(selectedEntityId)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const detail = parseFoundationDetailResponse(await res.json());
        if (detail) {
          const adapted = adaptFoundationDetailToFinancialEntity(detail);
          setDetailedEntities((prev) => ({ ...prev, [selectedEntityId]: adapted }));
        }
      })
      .catch((err) => {
        if ((err as { name?: string })?.name !== 'AbortError') {
          console.warn('[TerminalShell] Detail fetch failed for', selectedEntityId, err);
        }
      })
      .finally(() => {
        detailFetchInProgress.current.delete(selectedEntityId);
      });

    return () => controller.abort();
  }, [selectedEntityId, foundationRows, coreEntities, detailedEntities]);

  useEffect(() => {
    // URL changes must synchronize the existing user-controlled workspace state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (modeParam) setWorkspaceMode(modeParam);
    else if (topicParam) setWorkspaceMode('DEEP_DIVE');

    if (topicParam && INTELLIGENCE_DOSSIERS.some((d) => d.id === topicParam)) {
      setActiveTopicId(topicParam);
    }

    if (filterParam) {
      setCurrentFilter(filterParam);
    }

    if (queryParam !== undefined) {
      setSearchQuery(queryParam);
    }

    if (entityParam) {
      setSelectedEntityId(entityAliases[entityParam] || entityParam);
    } else if (queryParam) {
      const matched = entities.find(
        (e) =>
          e.name.toLowerCase().includes(queryParam.toLowerCase()) ||
          e.ticker.toLowerCase().includes(queryParam.toLowerCase()) ||
          e.strategy.blindspot.toLowerCase().includes(queryParam.toLowerCase())
      );
      if (matched) {
        setSelectedEntityId(matched.id);
      }
    }
  }, [searchParams, modeParam, topicParam, entityParam, filterParam, queryParam, entities, entityAliases]);

  // 閲覧履歴の自動追跡（開いた銘柄を蓄積）
  useEffect(() => {
    if (selectedEntityId) {
      recordView(selectedEntityId);
    }
  }, [selectedEntityId, recordView]);

  const { isPro: authIsPro, token } = useAuth();
  const isProUnlocked = authIsPro;

  const [currency] = useState<'JPY' | 'USD'>('JPY');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isScreenerOpen, setIsScreenerOpen] = useState<boolean>(false);
  const [isProModalOpen, setIsProModalOpen] = useState<boolean>(false);
  const [screenerFilters, setScreenerFilters] = useState<ScreenerFilterState | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set(['ent_photoai', 'ent_keyence']));
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // 複数タグのトグルハンドラー
  const handleToggleTag = useCallback((tag: string | null) => {
    if (!tag) {
      setActiveTags([]);
      return;
    }
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  // ⌘K グローバル検索ショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleBookmark = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // アクティブな特集レポート (nullの場合はカタログ一覧)
  const activeDossier = useMemo(() => {
    if (!activeTopicId) return null;
    return INTELLIGENCE_DOSSIERS.find((d) => d.id === activeTopicId) || null;
  }, [activeTopicId]);

  // 特集に紐づく対象企業群
  const deepDiveEntities = useMemo(() => {
    if (!activeDossier) return [];
    return entities.filter((entity) => activeDossier.targetEntityIds.includes(entity.id));
  }, [activeDossier, entities]);

  // 全タグ一覧および件数集計
  const { availableTags } = useMemo(() => {
    const counts: Record<string, number> = {};
    entities.forEach((e) => {
      (e.tags || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    const tags = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return { availableTags: tags };
  }, [entities]);

  // 全台帳モードでのフィルタリング
  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      if (currentFilter === 'SOLO' && entity.scale !== 'SOLO') return false;
      if (currentFilter === 'HIGH_MARGIN' && entity.pnl.operatingMargin < 50) return false;
      if (currentFilter === 'ZERO_CAPITAL' && (entity.operations.isCapitalUnconfirmed || entity.operations.initialCapitalRequired > 0)) return false;
      if (currentFilter === 'MONOPOLY' && entity.scale !== 'ENTERPRISE') return false;
      if (currentFilter === 'AI_NATIVE' && entity.sector !== 'AI_AUTOMATION') return false;
      if (currentFilter === 'BOOKMARKED' && !bookmarkedIds.has(entity.id)) return false;

      // 複数タグフィルタ（選択された全タグを含むAND一致）
      if (activeTags.length > 0) {
        const entityTags = entity.tags || [];
        const hasAllTags = activeTags.every((t) => entityTags.includes(t));
        if (!hasAllTags) return false;
      }

      if (screenerFilters) {
        if (screenerFilters.scales.length > 0 && !screenerFilters.scales.includes(entity.scale)) return false;
        if (screenerFilters.minMargin > 0 && entity.pnl.operatingMargin < screenerFilters.minMargin) return false;
        if (screenerFilters.maxCapital !== null && (entity.operations.isCapitalUnconfirmed || entity.operations.initialCapitalRequired > screenerFilters.maxCapital)) return false;
        if (screenerFilters.moats.length > 0 && !screenerFilters.moats.includes(entity.strategy.moatType)) return false;
        if (screenerFilters.selectedTags && screenerFilters.selectedTags.length > 0) {
          const entityTags = entity.tags || [];
          const hasSelectedTag = screenerFilters.selectedTags.some((t) => entityTags.includes(t));
          if (!hasSelectedTag) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const qNoSpace = q.replace(/\s+/g, '');
        const matchName = entity.name.toLowerCase().includes(q) || entity.name.toLowerCase().replace(/\s+/g, '').includes(qNoSpace);
        const matchTicker = entity.ticker.toLowerCase().includes(q);
        const matchTagline = (entity.tagline || '').toLowerCase().includes(q);
        const matchBlindspot = (entity.strategy?.blindspot || '').toLowerCase().includes(q);
        const matchFounder = (entity.founder || '').toLowerCase().includes(q);
        const matchTag = (entity.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchTicker && !matchTagline && !matchBlindspot && !matchFounder && !matchTag) return false;
      }

      return true;
    });
  }, [entities, currentFilter, activeTags, screenerFilters, searchQuery, bookmarkedIds]);

  // 現在選択中の企業エンティティ (詳細版があれば詳細版、なければサマリー版)
  const [analysis, setAnalysis] = useState<{ id: string; token: string; meta: NonNullable<FinancialEntity['meta']> } | null>(null);
  useEffect(() => {
    if (!authIsPro || !token || !selectedEntityId) return;
    const controller = new AbortController();
    void fetch(`/api/company-analysis?entity_id=${encodeURIComponent(selectedEntityId)}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal,
    }).then(async (result) => {
      if (!result.ok) return;
      const body = await result.json();
      const meta = parseCompanyAnalysis(body.meta);
      if (!controller.signal.aborted && body.entityId === selectedEntityId) setAnalysis({ id: selectedEntityId, token, meta });
    }).catch(() => { /* Never unlock on failed authorization or invalid data. */ });
    return () => controller.abort();
  }, [selectedEntityId, token, authIsPro]);

  const selectedEntity = useMemo(() => {
    if (!selectedEntityId) return null;
    const entity = detailedEntities[selectedEntityId] || entities.find((e) => e.id === selectedEntityId);
    if (!entity) return null;
    if (authIsPro && token && analysis?.token === token && analysis.id === selectedEntityId) return { ...entity, meta: analysis.meta };
    return entity;
  }, [selectedEntityId, detailedEntities, entities, authIsPro, token, analysis]);

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

  return (
    <div className="flex flex-col h-screen w-screen bg-[#07080B] text-zinc-100 overflow-hidden font-sans">
      {/* 統合ヘッダー ＆ リアルタイム市況ティッカー */}
      <MarketTickerStrip
        entities={entities}
        sourceLabel={dataSource}
        onSelectEntity={(id) => {
          setSelectedEntityId(id);
          setWorkspaceMode('LEDGER');
        }}
      />

      {/* メインエリア */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* 左サイドバー */}
        <TerminalSidebar
          workspaceMode={workspaceMode}
          onSelectMode={(mode) => setWorkspaceMode(mode)}
          currentFilter={currentFilter}
          onSelectFilter={(f) => setCurrentFilter(f)}
          bookmarkCount={bookmarkedIds.size}
          onOpenPro={() => setIsProModalOpen(true)}
        />

        {/* 画面モードに応じたコンテンツレンダリング */}
        {workspaceMode === 'PLAYBOOK' ? (
          <PlaybookIntelligenceView
            data={macroData}
            onSelectEntity={(entityId) => {
              setSelectedEntityId(entityId);
              setWorkspaceMode('LEDGER');
            }}
          />
        ) : workspaceMode === 'SYNTHESIS' ? (
          <StrategySynthesisView
            allEntities={entities}
            bookmarkedIds={bookmarkedIds}
            viewedEntityIds={viewedEntityIds}
            notes={notes}
            onSaveNote={saveNote}
            currency={currency}
            initialContextEntityId={selectedEntityId}
          />
        ) : (workspaceMode === 'ARCHETYPES' || workspaceMode === 'RADAR' || workspaceMode === 'DEEP_DIVE') ? (
          <TacticalArchetypesView
            allEntities={entities}
            initialAnomalyId={selectedAnomalyId}
            onOpenEntityInLedger={(entityId) => {
              setSelectedEntityId(entityId);
              setWorkspaceMode('LEDGER');
            }}
            onOpenSynthesisWithEntity={(entityId) => {
              setSelectedEntityId(entityId);
              setWorkspaceMode('SYNTHESIS');
            }}
          />
        ) : (
          <div className={`flex flex-col min-w-0 overflow-hidden bg-[#07080B] transition-all duration-150 ${
            selectedEntity
              ? 'w-full md:w-[440px] lg:w-[480px] xl:w-[520px] shrink-0 border-r border-white/[0.06]'
              : 'flex-1'
          }`}>
            <DataGridToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalCount={filteredEntities.length}
              onOpenScreener={() => setIsScreenerOpen(true)}
              screenerFilters={screenerFilters}
              onResetScreener={() => setScreenerFilters(null)}
              activeTags={activeTags}
              onToggleTag={handleToggleTag}
            />

            <InstitutionalDataGrid
              entities={filteredEntities}
              selectedEntityId={selectedEntityId}
              onSelectEntity={setSelectedEntityId}
              currency={currency}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
              isSplitView={Boolean(selectedEntity)}
              activeTags={activeTags}
              onToggleTag={handleToggleTag}
              onLoadMore={loadMoreFoundation}
              hasMore={foundationHasMore}
              isLoadingMore={foundationLoading}
            />
          </div>
        )}

        {/* 右リアルタイム解剖インスペクター (全銘柄台帳モード時のみ表示) */}
        {workspaceMode === 'LEDGER' && selectedEntity && (
          <CompanyInspectorPane
            entity={selectedEntity}
            onClose={() => setSelectedEntityId(null)}
            currency={currency}
            onPrevEntity={handlePrevEntity}
            onNextEntity={handleNextEntity}
            onOpenPro={() => setIsProModalOpen(true)}
            onSelectTopic={() => {
              setWorkspaceMode('RADAR');
            }}
            onOpenAnomaly={(anomalyId) => {
              setSelectedAnomalyId(anomalyId);
              setWorkspaceMode('ARCHETYPES');
            }}
            activeTags={activeTags}
            onToggleTag={handleToggleTag}
            analystNote={getNote(selectedEntity.id)}
            noteSaveStatus={getSaveStatus(selectedEntity.id)}
            onSaveAnalystNote={saveNote}
            onOpenSynthesisWithEntity={(id) => {
              setSelectedEntityId(id);
              setWorkspaceMode('SYNTHESIS');
            }}
            isPro={isProUnlocked}
          />
        )}
      </main>

      {/* スマホ最下部固定ボトムナビ */}
      <MobileBottomNav
        workspaceMode={workspaceMode}
        onSelectMode={(mode) => {
          setWorkspaceMode(mode);
          if (mode === 'DEEP_DIVE') {
            setActiveTopicId(null);
          }
        }}
        currentFilter={currentFilter}
        onSelectFilter={(f) => {
          setWorkspaceMode('LEDGER');
          setCurrentFilter(f);
          setScreenerFilters(null);
        }}
        onOpenScreener={() => setIsScreenerOpen(true)}
        bookmarkCount={bookmarkedIds.size}
      />

      {/* ⌘K グローバル検索モーダル */}
      <GlobalCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        entities={entities}
        onSelectEntity={(id) => {
          setSelectedEntityId(id);
        }}
        currency={currency}
      />
      {/* 50軸詳細スクリーナーモーダル */}
      <AdvancedScreenerModal
        isOpen={isScreenerOpen}
        onClose={() => setIsScreenerOpen(false)}
        onApplyFilters={setScreenerFilters}
        availableTags={availableTags}
        initialFilters={screenerFilters}
      />

      {/* PROメンバーシップ決済モーダル */}
      <ProModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
      />
    </div>
  );
};
