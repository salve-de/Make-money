'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { INSTITUTIONAL_ENTITIES } from '../../data/mockLedgerData';
import { INTELLIGENCE_DOSSIERS } from '../../data/intelligenceDossiers';
import { FinancialEntity, GridFilterOption, WorkspaceMode, IntelligenceTopicId } from '../../types/terminal';
import { MarketTickerStrip } from '../ticker/MarketTickerStrip';
import { TerminalSidebar } from '../navigation/TerminalSidebar';
import { DataGridToolbar } from '../grid/DataGridToolbar';
import { InstitutionalDataGrid } from '../grid/InstitutionalDataGrid';
import { CompanyInspectorPane } from '../inspector/CompanyInspectorPane';
import { FoundationDataGrid } from '../foundation/FoundationDataGrid';
import { FoundationInspectorPane } from '../foundation/FoundationInspectorPane';
import { IntelligenceDeepDiveView } from '../intelligence/IntelligenceDeepDiveView';
import { IntelligenceCatalogView } from '../intelligence/IntelligenceCatalogView';
import { MoneyFlowRadarView } from '../radar/MoneyFlowRadarView';
import { TacticalArchetypesView } from '../archetypes/TacticalArchetypesView';
import { StrategySynthesisView } from '../synthesis/StrategySynthesisView';
import { useAnalystNotes } from '../../hooks/useAnalystNotes';
import { useViewHistory } from '../../hooks/useViewHistory';
import { GlobalCommandPalette } from '../command/GlobalCommandPalette';
import { AdvancedScreenerModal, ScreenerFilterState } from '../screener/AdvancedScreenerModal';
import { MobileBottomNav } from '../navigation/MobileBottomNav';
import { ProModal } from '../../../components/terminal/ProModal';
import { useAuth } from '../../../context/AuthContext';
import type {
  FoundationBusinessCase,
  FoundationValuePage,
  FoundationValueSummary,
} from '@/lib/foundation/business-reader';

export const TerminalShell: React.FC = () => {
  const { viewedEntityIds, recordView } = useViewHistory();
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get('q') || '';
  const modeParam = searchParams?.get('mode') as WorkspaceMode | null;
  const topicParam = searchParams?.get('topic') as IntelligenceTopicId | null;
  const entityParam = searchParams?.get('entity');
  const filterParam = searchParams?.get('filter') as GridFilterOption | null;

  // アナリスト考察メモの永続化フック
  const { notes, getNote, saveNote } = useAnalystNotes();

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

  // 既存UI（SYNTHESIS/RADAR等）が使う静的ビュー用ステート。
  const [entities, setEntities] = useState<FinancialEntity[]>(INSTITUTIONAL_ENTITIES);

  // Foundation Lakeは正本を直接読む。UI用の短期ステートであり、R2へindexを書き戻さない。
  const [foundationRows, setFoundationRows] = useState<FoundationValueSummary[]>([]);
  const [foundationCursor, setFoundationCursor] = useState<string | null>(null);
  const [foundationHasMore, setFoundationHasMore] = useState(false);
  const [foundationLoading, setFoundationLoading] = useState(false);
  const [foundationMode, setFoundationMode] = useState(false);
  const foundationLoadingRef = useRef(false);
  const [foundationDetail, setFoundationDetail] = useState<FoundationBusinessCase | null>(null);
  const [foundationDetailId, setFoundationDetailId] = useState<string | null>(null);
  const [foundationDetailLoading, setFoundationDetailLoading] = useState(false);
  const [foundationDetailError, setFoundationDetailError] = useState<string | null>(null);
  const foundationDetailCache = useRef(new Map<string, FoundationBusinessCase>());

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
    if (foundationLoadingRef.current) return null;
    foundationLoadingRef.current = true;
    setFoundationLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/businesses?${params.toString()}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as {
        source?: string;
        data?: unknown;
        nextCursor?: string | null;
        hasMore?: boolean;
      };

      if (payload.source !== 'foundation_lake') {
        if (!cursor && Array.isArray(payload.data) && payload.data.length > 0) {
          setFoundationMode(false);
          setEntities(payload.data as FinancialEntity[]);
        }
        return null;
      }

      const page: FoundationValuePage = {
        data: Array.isArray(payload.data) ? (payload.data as FoundationValueSummary[]) : [],
        nextCursor: payload.nextCursor || null,
        hasMore: payload.hasMore === true,
      };
      setFoundationMode(true);
      mergeFoundationRows(page.data, !cursor);
      setFoundationCursor(page.nextCursor);
      setFoundationHasMore(page.hasMore);
      return page;
    } finally {
      foundationLoadingRef.current = false;
      setFoundationLoading(false);
    }
  }, [mergeFoundationRows]);

  useEffect(() => {
    const controller = new AbortController();
    void loadFoundationPage(undefined, controller.signal).catch((error) => {
      if ((error as { name?: string })?.name !== 'AbortError') {
        console.warn('[TerminalShell] Foundation Lake read failed; static UI remains available:', error);
      }
    });
    return () => controller.abort();
  }, [loadFoundationPage]);

  // 認知負荷ゼロ・即時着火: entityParam指定があればそれ、なければPhoto AI（粗利84%ソロ企業）をデフォルト自動展開
  const initialEntityId =
    entityParam ||
    (queryParam
      ? entities.find(
          (e) =>
            e.name.toLowerCase().includes(queryParam.toLowerCase()) ||
            e.ticker.toLowerCase().includes(queryParam.toLowerCase())
        )?.id || 'ent_photoai'
      : 'ent_photoai');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(initialEntityId);
  const [selectedFoundationId, setSelectedFoundationId] = useState<string | null>(entityParam);
  // 市場の歪み（Market Anomaly）選択ステート
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);

  useEffect(() => {
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
      setSelectedEntityId(entityParam);
      setSelectedFoundationId(entityParam);
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
  }, [searchParams, modeParam, topicParam, entityParam, filterParam, queryParam, entities]);

  // 閲覧履歴の自動追跡（開いた銘柄を蓄積）
  useEffect(() => {
    if (selectedEntityId) {
      recordView(selectedEntityId);
    }
  }, [selectedEntityId, recordView]);

  const loadFoundationDetail = useCallback(async (entityId: string, signal: AbortSignal) => {
    setFoundationDetailLoading(true);
    setFoundationDetailError(null);
    const cached = foundationDetailCache.current.get(entityId);
    if (cached) {
      setFoundationDetail(cached);
      setFoundationDetailId(entityId);
      setFoundationDetailLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/businesses?entity_id=${encodeURIComponent(entityId)}`, { signal });
      const payload = (await res.json()) as { source?: string; data?: FoundationBusinessCase };
      if (!res.ok || payload.source !== 'foundation_lake' || !payload.data) {
        throw new Error(`Foundation detail unavailable (HTTP ${res.status})`);
      }
      foundationDetailCache.current.set(entityId, payload.data);
      setFoundationDetail(payload.data);
      setFoundationDetailId(entityId);
    } catch (error) {
      if ((error as { name?: string })?.name !== 'AbortError') {
        setFoundationDetailId(entityId);
        setFoundationDetailError('このentityに紐づく詳細データを取得できませんでした。未確認のままです。');
      }
    } finally {
      if (!signal.aborted) setFoundationDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!foundationMode || !selectedFoundationId) return;
    const controller = new AbortController();
    void loadFoundationDetail(selectedFoundationId, controller.signal);
    return () => controller.abort();
  }, [foundationMode, loadFoundationDetail, selectedFoundationId]);

  const { isPro: authIsPro } = useAuth();
  const [isLocalProUnlocked, setIsLocalProUnlocked] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('kin_pro_unlocked');
      if (local === 'true') {
        setIsLocalProUnlocked(true);
      }
    }
  }, []);

  const isProUnlocked = Boolean(authIsPro || isLocalProUnlocked);

  const [currency, setCurrency] = useState<'JPY' | 'USD'>('JPY');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
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
  const { availableTags, tagCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    entities.forEach((e) => {
      (e.tags || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    const tags = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return { availableTags: tags, tagCounts: counts };
  }, [entities]);

  const filteredFoundationRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return foundationRows;
    return foundationRows.filter((entity) =>
      [
        entity.id,
        entity.name,
        entity.entityType,
        entity.domain || '',
        entity.canonicalIdentifier || '',
        entity.status,
        ...entity.aliases,
        entity.valueProfile.businessSignal || '',
        entity.valueProfile.painSignal || '',
        entity.valueProfile.moneySignal || '',
        entity.valueProfile.tractionSignal || '',
        entity.valueProfile.mechanismSignal || '',
        ...entity.valueProfile.labels,
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [foundationRows, searchQuery]);

  // 全台帳モードでのフィルタリング
  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      if (currentFilter === 'SOLO' && entity.scale !== 'SOLO') return false;
      if (currentFilter === 'HIGH_MARGIN' && entity.pnl.operatingMargin < 50) return false;
      if (currentFilter === 'ZERO_CAPITAL' && entity.operations.initialCapitalRequired > 0) return false;
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
        if (screenerFilters.maxCapital !== null && entity.operations.initialCapitalRequired > screenerFilters.maxCapital) return false;
        if (screenerFilters.moats.length > 0 && !screenerFilters.moats.includes(entity.strategy.moatType)) return false;
        if (screenerFilters.selectedTags && screenerFilters.selectedTags.length > 0) {
          const entityTags = entity.tags || [];
          const hasSelectedTag = screenerFilters.selectedTags.some((t) => entityTags.includes(t));
          if (!hasSelectedTag) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = entity.name.toLowerCase().includes(q);
        const matchTicker = entity.ticker.toLowerCase().includes(q);
        const matchBlindspot = entity.strategy.blindspot.toLowerCase().includes(q);
        const matchFounder = entity.founder.toLowerCase().includes(q);
        const matchTag = (entity.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchTicker && !matchBlindspot && !matchFounder && !matchTag) return false;
      }

      return true;
    });
  }, [entities, currentFilter, activeTags, screenerFilters, searchQuery, bookmarkedIds]);

  // 現在選択中の企業エンティティ
  const selectedEntity = useMemo(() => {
    if (foundationMode && workspaceMode === 'LEDGER') return null;
    return entities.find((e) => e.id === selectedEntityId) || null;
  }, [entities, foundationMode, selectedEntityId, workspaceMode]);

  const selectedFoundationSummary = useMemo(() => {
    if (!foundationMode || !selectedFoundationId) return null;
    return foundationRows.find((entity) => entity.id === selectedFoundationId) || null;
  }, [foundationMode, foundationRows, selectedFoundationId]);

  const handleLoadMoreFoundation = useCallback(() => {
    if (!foundationHasMore || foundationLoading || !foundationCursor) return;
    void loadFoundationPage(foundationCursor).catch((error) => {
      console.warn('[TerminalShell] Additional Foundation page read failed:', error);
    });
  }, [foundationCursor, foundationHasMore, foundationLoading, loadFoundationPage]);

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
        onSelectEntity={(id) => {
          setFoundationMode(false);
          setSelectedFoundationId(null);
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
        {workspaceMode === 'SYNTHESIS' ? (
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
              setFoundationMode(false);
              setSelectedFoundationId(null);
              setSelectedEntityId(entityId);
              setWorkspaceMode('LEDGER');
            }}
            onOpenSynthesisWithEntity={(entityId) => {
              setFoundationMode(false);
              setSelectedFoundationId(null);
              setSelectedEntityId(entityId);
              setWorkspaceMode('SYNTHESIS');
            }}
          />
        ) : (
          <div className={`flex flex-col min-w-0 overflow-hidden bg-[#07080B] transition-all duration-150 ${
            selectedEntity || selectedFoundationSummary
              ? 'w-full md:w-[440px] lg:w-[480px] xl:w-[520px] shrink-0 border-r border-white/[0.06]'
              : 'flex-1'
          }`}>
            <DataGridToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalCount={foundationMode ? filteredFoundationRows.length : filteredEntities.length}
              onOpenScreener={() => setIsScreenerOpen(true)}
              screenerFilters={screenerFilters}
              onResetScreener={() => setScreenerFilters(null)}
              activeTags={activeTags}
              onToggleTag={handleToggleTag}
            />

            {foundationMode ? (
              <FoundationDataGrid
                rows={filteredFoundationRows}
                selectedEntityId={selectedFoundationId}
                onSelectEntity={(id) => {
                  setSelectedFoundationId(id);
                  setSelectedEntityId(null);
                }}
                onLoadMore={handleLoadMoreFoundation}
                hasMore={foundationHasMore}
                isLoading={foundationLoading}
              />
            ) : (
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
              />
            )}
          </div>
        )}

        {/* 右リアルタイム解剖インスペクター (全銘柄台帳モード時のみ表示) */}
        {workspaceMode === 'LEDGER' && foundationMode && selectedFoundationId && (
          <FoundationInspectorPane
            entity={foundationDetailId === selectedFoundationId ? foundationDetail : null}
            loading={foundationDetailLoading}
            error={foundationDetailId === selectedFoundationId ? foundationDetailError : null}
            onClose={() => setSelectedFoundationId(null)}
          />
        )}
        {workspaceMode === 'LEDGER' && !foundationMode && selectedEntity && (
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
          setFoundationMode(false);
          setSelectedFoundationId(null);
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

