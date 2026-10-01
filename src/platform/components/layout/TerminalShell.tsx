'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { FinancialEntity, WorkspaceMode } from '@/shared/terminal';
import { useTerminalWorkspace } from '../../hooks/useTerminalWorkspace';
import { useFoundationCatalog } from '../../hooks/useFoundationCatalog';
import { useEntityFilter } from '../../hooks/useEntityFilter';
import { useSelectedEntityNavigation } from '../../hooks/useSelectedEntityNavigation';
import { useAnalystNotes } from '../../hooks/useAnalystNotes';
import { useAuth } from '../../../context/AuthContext';
import { INTELLIGENCE_DOSSIERS } from '../../data/intelligenceDossiers';

import { GlobalHeader } from '../navigation/GlobalHeader';
import { DataGridToolbar } from '../grid/DataGridToolbar';
import { InstitutionalDataGrid } from '../grid/InstitutionalDataGrid';
import { FoundationSearchContinuation } from '../foundation/FoundationSearchContinuation';
import { NewArrivalsBanner } from '../foundation/NewArrivalsBanner';
import { CompanyInspectorPane } from '@/features/company-inspector';
import { TacticalArchetypesView } from '../archetypes/TacticalArchetypesView';
import { StrategySynthesisView } from '../synthesis/StrategySynthesisView';
import { PlaybookIntelligenceView } from '../playbook/PlaybookIntelligenceView';
import { MarketRadarView } from '../radar/MarketRadarView';
import { GlobalCommandPalette } from '../command/GlobalCommandPalette';
import { AdvancedScreenerModal } from '../screener/AdvancedScreenerModal';
import { LedgerFilterRail } from '../grid/LedgerFilterRail';
import { useLedgerKeyboard } from '../../hooks/useLedgerKeyboard';
import { closeEntityParam, dropQueryParam, openEntityParam, openLedgerEntityUrl, positionLabel } from '../../utils/entityUrl';
import { preferDetail } from '@/shared/dossier-authority';
import { ProModal } from '../../../components/terminal/ProModal';

export const TerminalShell: React.FC<{
  initialEntities: FinancialEntity[];
  entityAliases: Record<string, string>;
  catalogTags?: string[];
  catalogBatchIds?: string[];
}> = ({ initialEntities, entityAliases, catalogTags = [], catalogBatchIds = [] }) => {
  const searchParams = useSearchParams();
  const entityParam = searchParams?.get('entity') || null;
  const [inspectorVisibility, setInspectorVisibility] = useState({ entityParam, open: Boolean(entityParam) });
  const mobileInspectorOpen = inspectorVisibility.entityParam === entityParam
    ? inspectorVisibility.open : Boolean(entityParam);
  const setMobileInspectorOpen = (open: boolean) => setInspectorVisibility({ entityParam, open });
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
    macroData,
    foundationHasMore,
    catalogLoading,
    foundationRetryAvailable,
    foundationSearchContinuationAvailable,
    foundationSearchContinuationFailed,
    foundationSearchRetryMessage,
    continueFoundationSearch,
    foundationLoading,
    catalogTotal,
    newArrivalsRelease,
    detailedEntities,
    setDetailedEntities,
    setApprovedIds,
    setCatalogFilters,
    loadMoreFoundation,
    retryFoundationPage,
    fetchEntityDetailOnDemand,
  } = useFoundationCatalog(initialEntities, searchQuery);

  // 3. 複合フィルタリング・集計・承認フック
  const {
    currentFilter,
    setCurrentFilter,
    selectedBatch,
    setSelectedBatch,
    activeTags,
    setActiveTags,
    handleToggleTag,
    screenerFilters,
    setScreenerFilters,
    bookmarkedIds,
    handleToggleBookmark,
    bookmarkSyncStatus,
    availableTags,
    tagCounts,
    newlyCollectedCount,
    batchCounts,
    filteredEntities,
    handleApproveEntity,
    handleApproveAllCollected,
    catalogFilters,
  } = useEntityFilter({
    entities,
    searchQuery,
    onCatalogFiltersChange: setCatalogFilters,
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
  const { selectedEntityId, openedEntityId, setSelectedEntityId, selectedEntity, handlePrevEntity, handleNextEntity } =
    useSelectedEntityNavigation({
      entities,
      filteredEntities,
      deepDiveEntities,
      workspaceMode,
      detailedEntities,
      entityAliases,
      onFetchEntityDetailOnDemand: fetchEntityDetailOnDemand,
    });

  const openEntity = (id: string) => {
    setSelectedEntityId(id);
    setMobileInspectorOpen(true);
    openEntityParam(id);
  };
  const closeEntity = () => {
    setMobileInspectorOpen(false);
    setSelectedEntityId(null);
    closeEntityParam();
  };

  const selectedPositionLabel = positionLabel(filteredEntities.findIndex((row) => row.id === selectedEntityId), catalogTotal || filteredEntities.length);
  const ledgerEntityIds = useMemo(() => filteredEntities.map((entity) => entity.id), [filteredEntities]);
  useLedgerKeyboard({
    enabled: workspaceMode === 'LEDGER' && !isCommandPaletteOpen && !isScreenerOpen && !isProModalOpen,
    entityIds: ledgerEntityIds,
    selectedEntityId,
    onSelect: setSelectedEntityId,
    onOpen: openEntity,
  });

  const synthesisEntities = useMemo(() => {
    const merged = new Map(entities.map((entity) => [entity.id, entity]));
    for (const detail of Object.values(detailedEntities)) merged.set(detail.id, preferDetail(merged.get(detail.id), detail));
    return [...merged.values()];
  }, [entities, detailedEntities]);

  // Workspace tabs are already rendered inside this shell: update the view immediately and keep the
  // URL/back button in sync without requesting a new dynamic Server Component payload for the same page.
  const selectWorkspaceMode = (mode: WorkspaceMode, entityId?: string) => {
    setWorkspaceMode(mode);
    if (mode === 'DEEP_DIVE') setActiveTopicId(null);

    const params = new URLSearchParams(window.location.search);
    if (mode !== 'DEEP_DIVE') {
      params.delete('topic');
      setActiveTopicId(null);
    }
    if (mode === 'LEDGER') params.delete('mode');
    else params.set('mode', mode);
    if (entityId) params.set('entity', entityId);
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) window.history.pushState(null, '', nextUrl);
  };

  // ?pro=1 で PRO の説明を開き、パラメータは消す
  const proParam = searchParams?.get('pro');
  useEffect(() => {
    if (proParam !== '1') return;
    setIsProModalOpen(true);
    dropQueryParam('pro');
  }, [proParam, setIsProModalOpen]);

  // アナリスト考察メモ
  const { notes, getNote, saveNote, getSaveStatus } = useAnalystNotes();
  const { isPro: isProUnlocked, role } = useAuth();
  const canApproveEntities = role === 'admin';
  const openNewArrivals = () => {
    selectWorkspaceMode('LEDGER');
    setSearchQuery('');
    setCurrentFilter('ALL');
    setSelectedBatch('ALL');
    setScreenerFilters(null);
    setActiveTags(['新着']);
  };

  return (
    <div className="flex term-screen w-full flex-col overflow-hidden bg-term-bg font-sans text-term-fg">
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
        onOpenPro={() => setIsProModalOpen(true)}
        onSelectLocalMode={selectWorkspaceMode}
        {...(workspaceMode === 'LEDGER' ? { searchValue: searchQuery, onSearchChange: setSearchQuery } : {})}
        bookmarkCount={bookmarkedIds.size}
        bookmarkSyncStatus={bookmarkSyncStatus}
        onSelectBookmark={() => {
          selectWorkspaceMode('LEDGER');
          setCurrentFilter((prev) => (prev === 'BOOKMARKED' ? 'ALL' : 'BOOKMARKED'));
        }}
        isBookmarkActive={workspaceMode === 'LEDGER' && currentFilter === 'BOOKMARKED'}
      />

      {/* メインエリア */}
      <main className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* 画面モードに応じたコンテンツレンダリング */}
        {workspaceMode === 'PLAYBOOK' ? (
          <PlaybookIntelligenceView
            data={macroData}
            onSelectEntity={(entityId) => {
              openEntity(entityId);
              selectWorkspaceMode('LEDGER', entityId);
            }}
          />
        ) : workspaceMode === 'SYNTHESIS' ? (
          <StrategySynthesisView
            allEntities={synthesisEntities}
            onLoadEntity={fetchEntityDetailOnDemand}
            bookmarkedIds={bookmarkedIds}
            notes={notes}
            onSaveNote={saveNote}
            currency={currency}
            initialContextEntityId={openedEntityId}
          />
        ) : workspaceMode === 'RADAR' ? (
          <MarketRadarView
            onSelectEntity={(entityId) => {
              openEntity(entityId);
              selectWorkspaceMode('LEDGER', entityId);
            }}
          />
        ) : (workspaceMode === 'ARCHETYPES' || workspaceMode === 'DEEP_DIVE') ? (
          <TacticalArchetypesView
            allEntities={entities}
            initialAnomalyId={selectedAnomalyId}
            onOpenEntityInLedger={(entityId) => {
              openEntity(entityId);
              selectWorkspaceMode('LEDGER', entityId);
            }}
            onOpenSynthesisWithEntity={(entityId) => {
              openEntity(entityId);
              selectWorkspaceMode('SYNTHESIS', entityId);
            }}
          />
        ) : (
          <>
          <div className="hidden xl:flex">
            <LedgerFilterRail filters={screenerFilters} onChangeFilters={setScreenerFilters} onOpenAdvanced={() => setIsScreenerOpen(true)} resultCount={filteredEntities.length} catalogTotal={catalogTotal ?? filteredEntities.length} />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-term-line bg-term-bg xl:border-r">
            <h1 className="sr-only">事例一覧</h1>
            <DataGridToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              hideSearch
              totalCount={filteredEntities.length}
              onOpenScreener={() => setIsScreenerOpen(true)}
              screenerFilters={screenerFilters}
              onResetScreener={() => setScreenerFilters(null)}
              activeTags={activeTags}
              onToggleTag={handleToggleTag}
              newlyCollectedCount={newlyCollectedCount}
              onApproveAllCollected={canApproveEntities ? handleApproveAllCollected : undefined}
              selectedBatch={selectedBatch}
              onSelectBatch={setSelectedBatch} showBatchFilter={canApproveEntities}
              batchCounts={{ ...Object.fromEntries(catalogBatchIds.map((id) => [id, 0])), ...batchCounts }}
              catalogTotal={catalogTotal}
              savedSearchDraft={{ query: searchQuery, filters: catalogFilters }}
              hideScreenerOnXl
              countAddon={<NewArrivalsBanner release={newArrivalsRelease} entities={entities} onOpen={openNewArrivals} />}
            />
            <FoundationSearchContinuation available={foundationSearchContinuationAvailable} failed={foundationSearchContinuationFailed} loading={foundationLoading} retryMessage={foundationSearchRetryMessage} onContinue={continueFoundationSearch} />
            <InstitutionalDataGrid
              entities={filteredEntities}
              selectedEntityId={selectedEntityId}
              mobileSelectedEntityId={openedEntityId}
              onSelectEntity={openEntity}
              currency={currency}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
              isSplitView={Boolean(selectedEntity)}
              onLoadMore={loadMoreFoundation}
              hasMore={foundationHasMore}
              isLoadingMore={foundationLoading || catalogLoading}
              retryAvailable={foundationRetryAvailable}
              onRetry={retryFoundationPage}
            />
          </div>
          </>
        )}

        {/* 右リアルタイム解剖インスペクター (全銘柄台帳モード時のみ表示) */}
        {workspaceMode === 'LEDGER' && selectedEntity && (
          <div className="contents xl:flex xl:w-[520px] xl:min-w-0 xl:shrink-0">
          <CompanyInspectorPane
            entity={selectedEntity}
            positionLabel={selectedPositionLabel}
            onClose={closeEntity}
            mobileOpen={mobileInspectorOpen}
            currency={currency}
            onPrevEntity={handlePrevEntity}
            onNextEntity={handleNextEntity}
            onOpenPro={() => setIsProModalOpen(true)}
            onSelectTopic={() => {
              selectWorkspaceMode('RADAR');
            }}
            onOpenAnomaly={(anomalyId) => {
              setSelectedAnomalyId(anomalyId);
              selectWorkspaceMode('ARCHETYPES');
            }}
            activeTags={activeTags}
            onToggleTag={handleToggleTag}
            analystNote={getNote(selectedEntity.id)}
            noteSaveStatus={getSaveStatus(selectedEntity.id)}
            onSaveAnalystNote={saveNote}
            onOpenSynthesisWithEntity={(id) => {
              setSelectedEntityId(id);
              selectWorkspaceMode('SYNTHESIS', id);
            }}
            onApproveEntity={canApproveEntities ? handleApproveEntity : undefined}
            isPro={isProUnlocked}
            isBookmarked={bookmarkedIds.has(selectedEntity.id)}
            onToggleBookmark={(e) => handleToggleBookmark(selectedEntity.id, e)}
          />
          </div>
        )}
      </main>

      {/* ⌘K グローバル検索モーダル */}
      <GlobalCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        entities={entities}
        onSelectEntity={(id) => {
          setWorkspaceMode('LEDGER');
          setSelectedEntityId(id);
          setMobileInspectorOpen(true);
          openLedgerEntityUrl(id);
        }}
        currency={currency}
      />

      <AdvancedScreenerModal
        isOpen={isScreenerOpen}
        onClose={() => setIsScreenerOpen(false)}
        onApplyFilters={setScreenerFilters}
        availableTags={[...new Set([...availableTags, ...catalogTags])]}
        tagCounts={tagCounts}
        initialFilters={screenerFilters}
      />

      <ProModal isOpen={isProModalOpen} onClose={() => setIsProModalOpen(false)} />
    </div>
  );
};
