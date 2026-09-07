'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { INSTITUTIONAL_ENTITIES } from '../../data/mockLedgerData';
import { INTELLIGENCE_DOSSIERS } from '../../data/intelligenceDossiers';
import { FinancialEntity, GridFilterOption, WorkspaceMode, IntelligenceTopicId } from '../../types/terminal';
import { MarketTickerStrip } from '../ticker/MarketTickerStrip';
import { TerminalTopBar } from '../header/TerminalTopBar';
import { TerminalSidebar } from '../navigation/TerminalSidebar';
import { DataGridToolbar } from '../grid/DataGridToolbar';
import { InstitutionalDataGrid } from '../grid/InstitutionalDataGrid';
import { CompanyInspectorPane } from '../inspector/CompanyInspectorPane';
import { IntelligenceDeepDiveView } from '../intelligence/IntelligenceDeepDiveView';
import { GlobalCommandPalette } from '../command/GlobalCommandPalette';
import { AdvancedScreenerModal, ScreenerFilterState } from '../screener/AdvancedScreenerModal';
import { MobileBottomNav } from '../navigation/MobileBottomNav';
import { ProModal } from '../../../components/terminal/ProModal';

export const TerminalShell: React.FC = () => {
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get('q') || '';
  const modeParam = searchParams?.get('mode') as WorkspaceMode | null;
  const topicParam = searchParams?.get('topic') as IntelligenceTopicId | null;
  const entityParam = searchParams?.get('entity');
  const filterParam = searchParams?.get('filter') as GridFilterOption | null;

  // 表示モード (LEDGER: 台帳 / DEEP_DIVE: 特集)
  const initialMode: WorkspaceMode = modeParam === 'DEEP_DIVE' || topicParam ? 'DEEP_DIVE' : 'LEDGER';
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(initialMode);

  const initialTopic: IntelligenceTopicId =
    topicParam && INTELLIGENCE_DOSSIERS.some((d) => d.id === topicParam)
      ? topicParam
      : 'solo_empire';
  const [activeTopicId, setActiveTopicId] = useState<IntelligenceTopicId>(initialTopic);

  const initialFilter: GridFilterOption = filterParam || 'ALL';
  const [currentFilter, setCurrentFilter] = useState<GridFilterOption>(initialFilter);
  const [searchQuery, setSearchQuery] = useState<string>(queryParam);

  // 認知負荷ゼロ・即時着火: entityParam指定があればそれ、なければPhoto AI（粗利84%ソロ企業）をデフォルト自動展開
  const initialEntityId =
    entityParam ||
    (queryParam
      ? INSTITUTIONAL_ENTITIES.find(
          (e) =>
            e.name.toLowerCase().includes(queryParam.toLowerCase()) ||
            e.ticker.toLowerCase().includes(queryParam.toLowerCase())
        )?.id || 'ent_photoai'
      : 'ent_photoai');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(initialEntityId);

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
    } else if (queryParam) {
      const matched = INSTITUTIONAL_ENTITIES.find(
        (e) =>
          e.name.toLowerCase().includes(queryParam.toLowerCase()) ||
          e.ticker.toLowerCase().includes(queryParam.toLowerCase()) ||
          e.strategy.blindspot.toLowerCase().includes(queryParam.toLowerCase())
      );
      if (matched) {
        setSelectedEntityId(matched.id);
      }
    }
  }, [searchParams, modeParam, topicParam, entityParam, filterParam, queryParam]);
  const [currency, setCurrency] = useState<'JPY' | 'USD'>('JPY');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isScreenerOpen, setIsScreenerOpen] = useState<boolean>(false);
  const [isProModalOpen, setIsProModalOpen] = useState<boolean>(false);
  const [screenerFilters, setScreenerFilters] = useState<ScreenerFilterState | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set(['ent_photoai', 'ent_keyence']));
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const handleToggleBookmark = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // アクティブな特集レポート
  const activeDossier = useMemo(() => {
    return INTELLIGENCE_DOSSIERS.find((d) => d.id === activeTopicId) || INTELLIGENCE_DOSSIERS[0];
  }, [activeTopicId]);

  // 特集に紐づく対象企業群
  const deepDiveEntities = useMemo(() => {
    return INSTITUTIONAL_ENTITIES.filter((entity) => activeDossier.targetEntityIds.includes(entity.id));
  }, [activeDossier]);

  // 全タグ一覧および件数集計
  const { availableTags, tagCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    INSTITUTIONAL_ENTITIES.forEach((e) => {
      (e.tags || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    const tags = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return { availableTags: tags, tagCounts: counts };
  }, []);

  // 全台帳モードでのフィルタリング
  const filteredEntities = useMemo(() => {
    return INSTITUTIONAL_ENTITIES.filter((entity) => {
      if (currentFilter === 'SOLO' && entity.scale !== 'SOLO') return false;
      if (currentFilter === 'HIGH_MARGIN' && entity.pnl.operatingMargin < 50) return false;
      if (currentFilter === 'ZERO_CAPITAL' && entity.operations.initialCapitalRequired > 0) return false;
      if (currentFilter === 'MONOPOLY' && entity.scale !== 'ENTERPRISE') return false;
      if (currentFilter === 'AI_NATIVE' && entity.sector !== 'AI_AUTOMATION') return false;
      if (currentFilter === 'BOOKMARKED' && !bookmarkedIds.has(entity.id)) return false;

      // タグフィルタ
      if (activeTag && !(entity.tags || []).includes(activeTag)) return false;

      if (screenerFilters) {
        if (screenerFilters.scales.length > 0 && !screenerFilters.scales.includes(entity.scale)) return false;
        if (screenerFilters.minMargin > 0 && entity.pnl.operatingMargin < screenerFilters.minMargin) return false;
        if (screenerFilters.maxCapital !== null && entity.operations.initialCapitalRequired > screenerFilters.maxCapital) return false;
        if (screenerFilters.moats.length > 0 && !screenerFilters.moats.includes(entity.strategy.moatType)) return false;
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
  }, [currentFilter, activeTag, screenerFilters, searchQuery, bookmarkedIds]);

  // 現在選択中の企業エンティティ
  const selectedEntity = useMemo(() => {
    return INSTITUTIONAL_ENTITIES.find((e) => e.id === selectedEntityId) || null;
  }, [selectedEntityId]);

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#060709] text-zinc-100 font-sans">
      {/* 最上部: リアルタイム市場ティッカー */}
      <MarketTickerStrip
        onSelectEntity={(id) => {
          setSelectedEntityId(id);
          setWorkspaceMode('LEDGER');
        }}
      />

      {/* 極薄コントロールヘッダー */}
      <TerminalTopBar
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        currency={currency}
        onToggleCurrency={() => setCurrency((prev) => (prev === 'JPY' ? 'USD' : 'JPY'))}
        onOpenPro={() => setIsProModalOpen(true)}
      />

      {/* メインワークスペース (左ナビ + 中央データグリッド/特集ディープダイブ + 右リアルタイムインスペクター) */}
      <main className="flex-1 flex overflow-hidden relative pb-13 md:pb-0">
        {/* 左ナビゲーション (48px極薄アイコンレール) */}
        <TerminalSidebar
          workspaceMode={workspaceMode}
          onSelectMode={setWorkspaceMode}
          activeTopicId={activeTopicId}
          onSelectTopic={(topicId) => {
            setWorkspaceMode('DEEP_DIVE');
            setActiveTopicId(topicId);
          }}
          currentFilter={currentFilter}
          onSelectFilter={(f) => {
            setWorkspaceMode('LEDGER');
            setCurrentFilter(f);
            setScreenerFilters(null);
          }}
          bookmarkCount={bookmarkedIds.size}
        />

        {/* 中央メインエリア (特集ディープダイブ or 金融台帳グリッド) */}
        {workspaceMode === 'DEEP_DIVE' ? (
          <IntelligenceDeepDiveView
            dossier={activeDossier}
            targetEntities={deepDiveEntities}
            selectedEntityId={selectedEntityId}
            onSelectEntity={(id) => {
              setSelectedEntityId(id);
              if (id) {
                setWorkspaceMode('LEDGER');
              }
            }}
            currency={currency}
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={handleToggleBookmark}
            onLaunchScreenerForDossier={() => {
              setWorkspaceMode('LEDGER');
              setIsScreenerOpen(true);
            }}
          />
        ) : (
          <div className={`flex flex-col min-w-0 overflow-hidden bg-[#07080B] transition-all duration-150 ${
            selectedEntity
              ? 'w-full md:w-[440px] lg:w-[480px] xl:w-[520px] shrink-0 border-r border-white/[0.06]'
              : 'flex-1'
          }`}>
            <DataGridToolbar
              currentFilter={currentFilter}
              onSelectFilter={(f) => {
                setCurrentFilter(f);
                setScreenerFilters(null);
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalCount={filteredEntities.length}
              onOpenScreener={() => setIsScreenerOpen(true)}
              screenerFilters={screenerFilters}
              onResetScreener={() => setScreenerFilters(null)}
              activeTag={activeTag}
              onSelectTag={setActiveTag}
              availableTags={availableTags}
              tagCounts={tagCounts}
            />

            <InstitutionalDataGrid
              entities={filteredEntities}
              selectedEntityId={selectedEntityId}
              onSelectEntity={setSelectedEntityId}
              currency={currency}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
              isSplitView={Boolean(selectedEntity)}
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
            onSelectTopic={(topicId) => {
              setWorkspaceMode('DEEP_DIVE');
              setActiveTopicId(topicId);
            }}
            activeTag={activeTag}
            onSelectTag={setActiveTag}
          />
        )}
      </main>

      {/* スマホ最下部固定ボトムナビ */}
      <MobileBottomNav
        workspaceMode={workspaceMode}
        onSelectMode={(mode) => setWorkspaceMode(mode)}
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
        entities={INSTITUTIONAL_ENTITIES}
        onSelectEntity={setSelectedEntityId}
        currency={currency}
      />

      {/* 50軸詳細スクリーナーモーダル */}
      <AdvancedScreenerModal
        isOpen={isScreenerOpen}
        onClose={() => setIsScreenerOpen(false)}
        onApplyFilters={setScreenerFilters}
      />

      {/* PROメンバーシップ決済モーダル */}
      <ProModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
      />
    </div>
  );
};

