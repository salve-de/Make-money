'use client';

import { GuestCarryOverNotice } from '@/platform/components/saved/GuestCarryOverNotice';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { FinancialEntity, WorkspaceMode } from '@/shared/terminal';
import { useTerminalWorkspace } from '../../hooks/useTerminalWorkspace';
import { useCatalogEntities } from '../../hooks/useCatalogEntities';
import { useEntityFilter } from '../../hooks/useEntityFilter';
import { useSelectedEntityNavigation } from '../../hooks/useSelectedEntityNavigation';
import { useAnalystNotes } from '../../hooks/useAnalystNotes';
import { useAuth } from '../../../context/AuthContext';

import { GlobalHeader } from '../navigation/GlobalHeader';
import { DataGridToolbar } from '../grid/DataGridToolbar';
import { InstitutionalDataGrid, LedgerListTitle, LedgerMobileSearchSummary } from '../grid/InstitutionalDataGrid';
import { CompanyInspectorPane } from '@/features/company-inspector';
import { StrategySynthesisView } from '../synthesis/StrategySynthesisView';
import { GlobalCommandPalette } from '../command/GlobalCommandPalette';
import { AdvancedScreenerModal } from '../screener/AdvancedScreenerModal';
import { LedgerLoadState } from '../grid/LedgerLoadState';
import { LedgerFilterRail } from '../grid/LedgerFilterRail';
import { TerminalStatusBar } from './TerminalStatusBar';
import { useLedgerKeyboard } from '../../hooks/useLedgerKeyboard';
import { closeEntityParam, dropQueryParam, openEntityParam, openLedgerEntityUrl, positionLabel } from '../../utils/entityUrl';
import { preferDetail } from '@/shared/dossier-authority';
import { describeLedgerCondition } from '../../model/saved-search-view';
import { ProModal } from '../../../components/terminal/ProModal';

export const TerminalShell: React.FC<{
  initialEntities: FinancialEntity[];
}> = ({ initialEntities }) => {
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
    searchQuery,
    setSearchQuery,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isScreenerOpen,
    setIsScreenerOpen,
    isProModalOpen,
    setIsProModalOpen,
    currency,
  } = useTerminalWorkspace();

  // 2. 公開目録（data/catalog-release.json）の事例だけを読むフック
  const {
    entities, catalogFirstId,
    catalogError,
    catalogLoading, catalogSlow, retryCatalog,
    catalogTotal,
    hasMore,
    detailedEntities,
    setDetailedEntities,
    setApprovedIds,
    setCatalogFilters,
    loadMore,
    fetchEntityDetailOnDemand, detailStateFor, retryEntityDetail,
  } = useCatalogEntities(initialEntities, searchQuery);

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

  // 4. 選択中エンティティ・ナビゲーション・PRO分析フック
  const { selectedEntityId, openedEntityId, setSelectedEntityId, selectedEntity, handlePrevEntity, handleNextEntity } =
    useSelectedEntityNavigation({
      entities,
      filteredEntities,
      detailedEntities,
      defaultEntityId: searchQuery ? null : catalogFirstId,
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

  // 最初の取得が届くまで（検索語や条件を変えた直後も）は「0件」ではなく読み込み中として扱う
  // 検索も絞り込みもしていない状態で全件が届いたら、その全件を覚えておく。左の絞り込み欄で
  // 「押すと必ず0件になる条件」を押せない表示にするために使う（一部しか届いていない時は判定しない）
  const unfilteredComplete = !searchQuery.trim() && currentFilter === 'ALL' && selectedBatch === 'ALL' && activeTags.length === 0
    && !screenerFilters && catalogTotal !== null && !hasMore && entities.length >= catalogTotal;
  const [catalogUniverse, setCatalogUniverse] = useState<FinancialEntity[] | undefined>(undefined);
  if (unfilteredComplete && catalogUniverse !== entities) setCatalogUniverse(entities);
  const listLoading = !catalogError && (catalogLoading || catalogTotal === null);
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
    const params = new URLSearchParams(window.location.search);
    params.delete('topic');
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

  return (
    <div className="flex term-screen w-full flex-col overflow-hidden bg-term-bg font-sans text-term-fg">
      {/* 統合グローバルナビゲーションヘッダー */}
      <GlobalHeader
        currentSection={workspaceMode === 'SYNTHESIS' ? 'SYNTHESIS' : 'LEDGER'}
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

      <GuestCarryOverNotice />

      {/* メインエリア */}
      <main className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* 画面モードに応じたコンテンツレンダリング */}
        {workspaceMode === 'SYNTHESIS' ? (
          <StrategySynthesisView
            allEntities={synthesisEntities}
            onLoadEntity={fetchEntityDetailOnDemand}
            bookmarkedIds={bookmarkedIds}
            notes={notes}
            onSaveNote={saveNote}
            currency={currency}
            initialContextEntityId={openedEntityId}
          />
        ) : (
          <>
          <div className="hidden xl:flex">
            <LedgerFilterRail filters={screenerFilters} onChangeFilters={setScreenerFilters} resultCount={filteredEntities.length} catalogTotal={catalogTotal ?? filteredEntities.length} allEntities={catalogUniverse} availableTags={availableTags} tagCounts={tagCounts} />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-term-line bg-term-bg xl:border-r">
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
              batchCounts={batchCounts}
              catalogTotal={catalogTotal}
              savedSearchDraft={{ query: searchQuery, filters: catalogFilters }}
            />
            {entities.length === 0 && (catalogError || listLoading) ? (
              <LedgerLoadState state={catalogError ? 'failed' : 'loading'} slow={catalogSlow} onRetry={retryCatalog} />
            ) : null}
            <LedgerListTitle count={filteredEntities.length} conditionsLabel={describeLedgerCondition({ query: searchQuery, filters: catalogFilters }).join('・')} />
            <LedgerMobileSearchSummary query={searchQuery} count={filteredEntities.length} onClear={() => setSearchQuery('')} />
            <InstitutionalDataGrid
              entities={filteredEntities}
              selectedEntityId={selectedEntityId}
              mobileSelectedEntityId={openedEntityId}
              onSelectEntity={openEntity}
              currency={currency}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
              isSplitView={Boolean(selectedEntity)}
              onLoadMore={loadMore}
              hasMore={hasMore}
              isLoadingMore={catalogLoading}
              retryAvailable={Boolean(catalogError) && entities.length > 0}
              onRetry={retryCatalog}
              suppressEmpty={entities.length === 0 && (Boolean(catalogError) || listLoading)}
            />
          </div>
          </>
        )}

        {/* 右リアルタイム解剖インスペクター (全銘柄台帳モード時のみ表示) */}
        {workspaceMode === 'LEDGER' && selectedEntity && (
          <div className="contents xl:flex xl:w-[520px] xl:min-w-0 xl:shrink-0">
          <CompanyInspectorPane
            entity={selectedEntity} detailState={detailStateFor(selectedEntity)} onRetryDetail={() => { void retryEntityDetail(selectedEntity.id); }}
            positionLabel={selectedPositionLabel}
            onClose={closeEntity}
            mobileOpen={mobileInspectorOpen}
            currency={currency}
            onPrevEntity={handlePrevEntity}
            onNextEntity={handleNextEntity}
            onOpenPro={() => setIsProModalOpen(true)}
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

      {workspaceMode === 'LEDGER' && <TerminalStatusBar shownCount={filteredEntities.length} totalCount={catalogTotal ?? filteredEntities.length} updatedAt={null} />}

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
        allEntities={catalogUniverse}
        availableTags={availableTags}
        tagCounts={tagCounts}
        initialFilters={screenerFilters}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <ProModal isOpen={isProModalOpen} onClose={() => setIsProModalOpen(false)} />
    </div>
  );
};
