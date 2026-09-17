'use client';

import React, { useMemo } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import { useTerminalWorkspace } from '../../hooks/useTerminalWorkspace';
import { useFoundationCatalog } from '../../hooks/useFoundationCatalog';
import { useEntityFilter } from '../../hooks/useEntityFilter';
import { useSelectedEntityNavigation } from '../../hooks/useSelectedEntityNavigation';
import { useAnalystNotes } from '../../hooks/useAnalystNotes';
import { useAuth } from '../../../context/AuthContext';
import { INTELLIGENCE_DOSSIERS } from '../../data/intelligenceDossiers';

import { GlobalHeader } from '../navigation/GlobalHeader';
import { MarketTickerStrip } from '../ticker/MarketTickerStrip';
import { DataGridToolbar } from '../grid/DataGridToolbar';
import { InstitutionalDataGrid } from '../grid/InstitutionalDataGrid';
import { CompanyInspectorPane } from '@/features/company-inspector';
import { TacticalArchetypesView } from '../archetypes/TacticalArchetypesView';
import { StrategySynthesisView } from '../synthesis/StrategySynthesisView';
import { PlaybookIntelligenceView } from '../playbook/PlaybookIntelligenceView';
import { MarketRadarView } from '../radar/MarketRadarView';
import { GlobalCommandPalette } from '../command/GlobalCommandPalette';
import { AdvancedScreenerModal } from '../screener/AdvancedScreenerModal';
import { MobileBottomNav } from '../navigation/MobileBottomNav';
import { ProModal } from '../../../components/terminal/ProModal';

export const TerminalShell: React.FC<{
  initialEntities: FinancialEntity[];
  entityAliases: Record<string, string>;
}> = ({ initialEntities, entityAliases }) => {
  // 1. ワークスペース・モーダル・URL同期フック
  const {
    workspaceMode,
    setWorkspaceMode,
    activeTopicId,
    setActiveTopicId,
    searchQuery,
    setSearchQuery,
    selectedAnomalyId,
    setSelectedAnomalyId,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isScreenerOpen,
    setIsScreenerOpen,
    isProModalOpen,
    setIsProModalOpen,
    currency,
  } = useTerminalWorkspace();

  // 2. R2 Foundation カタログ・マージ・マクロ集計フック
  const {
    entities,
    dataSource,
    macroData,
    foundationHasMore,
    foundationLoading,
    detailedEntities,
    setDetailedEntities,
    setApprovedIds,
    loadMoreFoundation,
    fetchEntityDetailOnDemand,
  } = useFoundationCatalog(initialEntities);

  // 3. 複合フィルタリング・集計・承認フック
  const {
    currentFilter,
    setCurrentFilter,
    selectedBatch,
    setSelectedBatch,
    activeTags,
    handleToggleTag,
    screenerFilters,
    setScreenerFilters,
    bookmarkedIds,
    handleToggleBookmark,
    availableTags,
    tagCounts,
    newlyCollectedCount,
    batchCounts,
    filteredEntities,
    handleApproveEntity,
    handleApproveAllCollected,
  } = useEntityFilter({
    entities,
    searchQuery,
    onPersistApprovedId: (id) => setApprovedIds((prev) => new Set(prev).add(id)),
    onUpdateDetailedTags: (id) => {
      setDetailedEntities((prev) => {
        const existing = prev[id];
        if (!existing) return prev;
        return {
          ...prev,
          [id]: {
            ...existing,
            tags: (existing.tags || []).filter((t) => t !== '収集事例'),
          },
        };
      });
    },
  });

  // 特集レポート用エンティティ
  const activeDossier = useMemo(() => {
    if (!activeTopicId) return null;
    return INTELLIGENCE_DOSSIERS.find((d) => d.id === activeTopicId) || null;
  }, [activeTopicId]);

  const deepDiveEntities = useMemo(() => {
    if (!activeDossier) return [];
    return entities.filter((entity) => activeDossier.targetEntityIds.includes(entity.id));
  }, [activeDossier, entities]);

  // 4. 選択中エンティティ・ナビゲーション・PRO分析フック
  const {
    selectedEntityId,
    setSelectedEntityId,
    selectedEntity,
    viewedEntityIds,
    handlePrevEntity,
    handleNextEntity,
  } = useSelectedEntityNavigation({
    entities,
    filteredEntities,
    deepDiveEntities,
    workspaceMode,
    detailedEntities,
    entityAliases,
    onFetchEntityDetailOnDemand: fetchEntityDetailOnDemand,
  });

  // アナリスト考察メモ
  const { notes, getNote, saveNote, getSaveStatus } = useAnalystNotes();
  const { isPro: isProUnlocked, role } = useAuth();
  const canApproveEntities = role === 'admin';

  return (
    <div className="flex flex-col h-screen w-screen bg-[#07080B] text-zinc-100 overflow-hidden font-sans">
      {/* 統合グローバルナビゲーションヘッダー */}
      <GlobalHeader
        currentSection={
          workspaceMode === 'PLAYBOOK'
            ? 'PLAYBOOK'
            : workspaceMode === 'RADAR'
            ? 'RADAR'
            : workspaceMode === 'ARCHETYPES'
            ? 'ARCHETYPES'
            : workspaceMode === 'SYNTHESIS'
            ? 'SYNTHESIS'
            : 'LEDGER'
        }
        onSelectLocalMode={(mode) => setWorkspaceMode(mode)}
        onOpenPro={() => setIsProModalOpen(true)}
        bookmarkCount={bookmarkedIds.size}
        onSelectBookmark={() => {
          setWorkspaceMode('LEDGER');
          setCurrentFilter((prev) => (prev === 'BOOKMARKED' ? 'ALL' : 'BOOKMARKED'));
        }}
        isBookmarkActive={workspaceMode === 'LEDGER' && currentFilter === 'BOOKMARKED'}
      />

      {/* リアルタイム市況ティッカー */}
      <MarketTickerStrip
        entities={entities}
        sourceLabel={dataSource}
        selectedEntityId={selectedEntityId}
        onSelectEntity={(id) => {
          setSelectedEntityId(id);
          setWorkspaceMode('LEDGER');
        }}
      />

      {/* メインエリア */}
      <main className="flex-1 flex overflow-hidden relative">
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
        ) : workspaceMode === 'RADAR' ? (
          <MarketRadarView
            onSelectEntity={(entityId) => {
              setSelectedEntityId(entityId);
              setWorkspaceMode('LEDGER');
            }}
          />
        ) : (workspaceMode === 'ARCHETYPES' || workspaceMode === 'DEEP_DIVE') ? (
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
              newlyCollectedCount={newlyCollectedCount}
              onApproveAllCollected={canApproveEntities ? handleApproveAllCollected : undefined}
              selectedBatch={selectedBatch}
              onSelectBatch={setSelectedBatch}
              batchCounts={batchCounts}
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
            onApproveEntity={canApproveEntities ? handleApproveEntity : undefined}
            isPro={isProUnlocked}
            isBookmarked={bookmarkedIds.has(selectedEntity.id)}
            onToggleBookmark={(e) => handleToggleBookmark(selectedEntity.id, e)}
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
        tagCounts={tagCounts}
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
