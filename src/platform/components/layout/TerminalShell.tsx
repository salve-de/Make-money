'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { INSTITUTIONAL_ENTITIES } from '../../data/mockLedgerData';
import { FinancialEntity, GridFilterOption } from '../../types/terminal';
import { MarketTickerStrip } from '../ticker/MarketTickerStrip';
import { TerminalTopBar } from '../header/TerminalTopBar';
import { TerminalSidebar } from '../navigation/TerminalSidebar';
import { DataGridToolbar } from '../grid/DataGridToolbar';
import { InstitutionalDataGrid } from '../grid/InstitutionalDataGrid';
import { CompanyInspectorPane } from '../inspector/CompanyInspectorPane';
import { GlobalCommandPalette } from '../command/GlobalCommandPalette';
import { AdvancedScreenerModal, ScreenerFilterState } from '../screener/AdvancedScreenerModal';
import { MobileBottomNav } from '../navigation/MobileBottomNav';

export const TerminalShell: React.FC = () => {
  const [currentFilter, setCurrentFilter] = useState<GridFilterOption>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'JPY' | 'USD'>('JPY');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isScreenerOpen, setIsScreenerOpen] = useState<boolean>(false);
  const [screenerFilters, setScreenerFilters] = useState<ScreenerFilterState | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set(['ent_photoai', 'ent_keyence']));

  const handleToggleBookmark = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filteredEntities = useMemo(() => {
    return INSTITUTIONAL_ENTITIES.filter((entity) => {
      if (currentFilter === 'SOLO' && entity.scale !== 'SOLO') return false;
      if (currentFilter === 'HIGH_MARGIN' && entity.pnl.operatingMargin < 50) return false;
      if (currentFilter === 'ZERO_CAPITAL' && entity.operations.initialCapitalRequired > 0) return false;
      if (currentFilter === 'MONOPOLY' && entity.scale !== 'ENTERPRISE') return false;
      if (currentFilter === 'AI_NATIVE' && entity.sector !== 'AI_AUTOMATION') return false;
      if (currentFilter === 'BOOKMARKED' && !bookmarkedIds.has(entity.id)) return false;

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
        if (!matchName && !matchTicker && !matchBlindspot && !matchFounder) return false;
      }

      return true;
    });
  }, [currentFilter, screenerFilters, searchQuery, bookmarkedIds]);

  const selectedEntity = useMemo(() => {
    return INSTITUTIONAL_ENTITIES.find((e) => e.id === selectedEntityId) || null;
  }, [selectedEntityId]);

  const handlePrevEntity = useCallback(() => {
    if (!selectedEntityId || filteredEntities.length === 0) return;
    const currentIndex = filteredEntities.findIndex((e) => e.id === selectedEntityId);
    if (currentIndex > 0) {
      setSelectedEntityId(filteredEntities[currentIndex - 1].id);
    }
  }, [selectedEntityId, filteredEntities]);

  const handleNextEntity = useCallback(() => {
    if (!selectedEntityId || filteredEntities.length === 0) return;
    const currentIndex = filteredEntities.findIndex((e) => e.id === selectedEntityId);
    if (currentIndex >= 0 && currentIndex < filteredEntities.length - 1) {
      setSelectedEntityId(filteredEntities[currentIndex + 1].id);
    }
  }, [selectedEntityId, filteredEntities]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#060709] text-zinc-100 font-sans">
      {/* 最上部: リアルタイム市場ティッカー */}
      <MarketTickerStrip />

      {/* 極薄コントロールヘッダー */}
      <TerminalTopBar
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        currency={currency}
        onToggleCurrency={() => setCurrency((prev) => (prev === 'JPY' ? 'USD' : 'JPY'))}
      />

      {/* メインワークスペース (左ナビ + 中央データグリッド + 右リアルタイムインスペクター) */}
      <main className="flex-1 flex overflow-hidden relative pb-13 md:pb-0">
        {/* 左サイドバー */}
        <TerminalSidebar
          currentFilter={currentFilter}
          onSelectFilter={(f) => {
            setCurrentFilter(f);
            setScreenerFilters(null);
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          bookmarkCount={bookmarkedIds.size}
        />

        {/* 中央メインエリア */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#07080B]">
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
          />

          <InstitutionalDataGrid
            entities={filteredEntities}
            selectedEntityId={selectedEntityId}
            onSelectEntity={setSelectedEntityId}
            currency={currency}
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={handleToggleBookmark}
          />
        </div>

        {/* 右リアルタイム解剖インスペクター */}
        {selectedEntity && (
          <CompanyInspectorPane
            entity={selectedEntity}
            onClose={() => setSelectedEntityId(null)}
            currency={currency}
            onPrevEntity={handlePrevEntity}
            onNextEntity={handleNextEntity}
          />
        )}
      </main>

      {/* スマホ最下部固定ボトムナビ */}
      <MobileBottomNav
        currentFilter={currentFilter}
        onSelectFilter={(f) => {
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
    </div>
  );
};
