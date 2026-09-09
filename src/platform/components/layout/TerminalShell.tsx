'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { INSTITUTIONAL_ENTITIES } from '../../data/mockLedgerData';
import { INTELLIGENCE_DOSSIERS } from '../../data/intelligenceDossiers';
import { FinancialEntity, GridFilterOption, WorkspaceMode, IntelligenceTopicId } from '../../types/terminal';
import { MarketTickerStrip } from '../ticker/MarketTickerStrip';
import { TerminalSidebar } from '../navigation/TerminalSidebar';
import { DataGridToolbar } from '../grid/DataGridToolbar';
import { InstitutionalDataGrid } from '../grid/InstitutionalDataGrid';
import { CompanyInspectorPane } from '../inspector/CompanyInspectorPane';
import { IntelligenceDeepDiveView } from '../intelligence/IntelligenceDeepDiveView';
import { IntelligenceCatalogView } from '../intelligence/IntelligenceCatalogView';
import { MoneyFlowRadarView } from '../radar/MoneyFlowRadarView';
import { TacticalArchetypesView } from '../archetypes/TacticalArchetypesView';
import { StrategySynthesisView } from '../synthesis/StrategySynthesisView';
import { MarketAnomalyLensStrip } from '../anomalies/MarketAnomalyLensStrip';
import { MARKET_ANOMALIES } from '../../data/marketAnomaliesData';
import { useAnalystNotes } from '../../hooks/useAnalystNotes';
import { useViewHistory } from '../../hooks/useViewHistory';
import { GlobalCommandPalette } from '../command/GlobalCommandPalette';
import { AdvancedScreenerModal, ScreenerFilterState } from '../screener/AdvancedScreenerModal';
import { MobileBottomNav } from '../navigation/MobileBottomNav';
import { ProModal } from '../../../components/terminal/ProModal';
import { useAuth } from '../../../context/AuthContext';
import type {
  FoundationBusinessCase,
  FoundationEntitySummary,
} from '@/lib/foundation/business-reader';
import { FoundationDataGrid } from '../foundation/FoundationDataGrid';
import { FoundationInspectorPane } from '../foundation/FoundationInspectorPane';

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

  // Foundation/R2のEntity一覧は100件単位で遅延取得する。既存の静的
  // FinancialEntity台帳とは別stateにして、未確認の値を既存銘柄へ混ぜない。
  const [foundationEntities, setFoundationEntities] = useState<FoundationEntitySummary[]>([]);
  const [foundationCursor, setFoundationCursor] = useState<string | null>(null);
  const [foundationHasMore, setFoundationHasMore] = useState(false);
  const [foundationLoading, setFoundationLoading] = useState(true);
  const [foundationSource, setFoundationSource] = useState<'loading' | 'r2_lake' | 'static' | 'unavailable'>('loading');
  const [selectedFoundationId, setSelectedFoundationId] = useState<string | null>(null);
  const [foundationDetail, setFoundationDetail] = useState<FoundationBusinessCase | null>(null);
  const [foundationDetailLoading, setFoundationDetailLoading] = useState(false);

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
  // 市場の歪み（Market Anomaly）レンズの選択ステート
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);

  const loadFoundationPage = useCallback(async (cursor?: string, append = false) => {
    setFoundationLoading(true);
    try {
      const query = new URLSearchParams({ limit: '100' });
      if (cursor) query.set('cursor', cursor);
      const response = await fetch(`/api/businesses?${query.toString()}`, { cache: 'no-store' });
      const payload = (await response.json()) as {
        source?: string;
        data?: unknown;
        nextCursor?: string | null;
        hasMore?: boolean;
      };

      const rows = Array.isArray(payload.data)
        ? payload.data.filter((value): value is FoundationEntitySummary => {
            if (!value || typeof value !== 'object') return false;
            const candidate = value as Partial<FoundationEntitySummary>;
            return typeof candidate.id === 'string' && typeof candidate.name === 'string';
          })
        : [];

      if (payload.source === 'r2_lake') {
        setFoundationSource('r2_lake');
        setFoundationEntities((previous) => {
          if (!append) return rows;
          const merged = new Map(previous.map((item) => [item.id, item]));
          rows.forEach((item) => merged.set(item.id, item));
          return Array.from(merged.values());
        });
        setFoundationCursor(payload.nextCursor || null);
        setFoundationHasMore(payload.hasMore === true);
        setSelectedFoundationId((previous) => {
          if (previous) return previous;
          if (entityParam && /^ent_[a-z0-9]+_[a-f0-9]{20}$/.test(entityParam)) return entityParam;
          return null;
        });
      } else if (!append) {
        setFoundationSource(payload.source === 'unavailable' ? 'unavailable' : 'static');
        setFoundationEntities([]);
        setFoundationCursor(null);
        setFoundationHasMore(false);
      }
    } catch (error) {
      if (!append) {
        setFoundationSource('unavailable');
        setFoundationEntities([]);
        setFoundationCursor(null);
        setFoundationHasMore(false);
      }
      console.warn('[TerminalShell] Foundation Entity load failed:', error);
    } finally {
      setFoundationLoading(false);
    }
  }, [entityParam]);

  useEffect(() => {
    void Promise.resolve().then(() => loadFoundationPage());
  }, [loadFoundationPage]);

  const handleLoadMoreFoundation = useCallback(() => {
    if (!foundationCursor || foundationLoading) return;
    void loadFoundationPage(foundationCursor, true);
  }, [foundationCursor, foundationLoading, loadFoundationPage]);

  useEffect(() => {
    if (foundationSource !== 'r2_lake' || !selectedFoundationId) {
      return;
    }

    let cancelled = false;
    const loadFoundationDetail = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setFoundationDetailLoading(true);
      try {
        const response = await fetch(`/api/businesses?entity_id=${encodeURIComponent(selectedFoundationId)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as { source?: string; data?: FoundationBusinessCase | null };
        if (!cancelled && payload.source === 'r2_lake' && payload.data) setFoundationDetail(payload.data);
      } catch (error) {
        if (!cancelled) console.warn('[TerminalShell] Foundation detail load failed:', error);
      } finally {
        if (!cancelled) setFoundationDetailLoading(false);
      }
    };
    void loadFoundationDetail();

    return () => {
      cancelled = true;
    };
  }, [foundationSource, selectedFoundationId]);

  useEffect(() => {
    if (selectedFoundationId) recordView(selectedFoundationId);
  }, [selectedFoundationId, recordView]);

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

  // 閲覧履歴の自動追跡（開いた銘柄を蓄積）
  useEffect(() => {
    if (selectedEntityId) {
      recordView(selectedEntityId);
    }
  }, [selectedEntityId, recordView]);
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

      // 市場の歪みレンズによる絞り込み（該当する裏付け実在銘柄のみ抽出）
      if (selectedAnomalyId) {
        const anomaly = MARKET_ANOMALIES.find((a) => a.id === selectedAnomalyId);
        if (anomaly && !anomaly.proofEntityIds.includes(entity.id)) {
          return false;
        }
      }

      return true;
    });
  }, [currentFilter, activeTags, screenerFilters, searchQuery, bookmarkedIds, selectedAnomalyId]);

  // 現在選択中の企業エンティティ
  const selectedEntity = useMemo(() => {
    return INSTITUTIONAL_ENTITIES.find((e) => e.id === selectedEntityId) || null;
  }, [selectedEntityId]);

  const filteredFoundationEntities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return foundationEntities.filter((entity) => {
      if (currentFilter === 'BOOKMARKED' && !bookmarkedIds.has(entity.id)) return false;
      if (!query) return true;
      return [
        entity.name,
        entity.id,
        entity.entityType,
        entity.domain || '',
        entity.status,
        ...entity.aliases,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [foundationEntities, searchQuery, currentFilter, bookmarkedIds]);

  const selectedFoundationEntity = useMemo(() => {
    const listedEntity = foundationEntities.find((entity) => entity.id === selectedFoundationId);
    if (listedEntity) return listedEntity;
    if (foundationDetail && foundationDetail.id === selectedFoundationId) return foundationDetail;
    return null;
  }, [foundationDetail, foundationEntities, selectedFoundationId]);

  const handlePrevFoundationEntity = useCallback(() => {
    const index = filteredFoundationEntities.findIndex((entity) => entity.id === selectedFoundationId);
    if (index > 0) setSelectedFoundationId(filteredFoundationEntities[index - 1].id);
  }, [filteredFoundationEntities, selectedFoundationId]);

  const handleNextFoundationEntity = useCallback(() => {
    const index = filteredFoundationEntities.findIndex((entity) => entity.id === selectedFoundationId);
    if (index >= 0 && index < filteredFoundationEntities.length - 1) {
      setSelectedFoundationId(filteredFoundationEntities[index + 1].id);
    }
  }, [filteredFoundationEntities, selectedFoundationId]);

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
          setSelectedEntityId(id);
          setWorkspaceMode('LEDGER');
        }}
      />

      {/* メインエリア */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* 左サイドバー */}
        <TerminalSidebar
          workspaceMode={workspaceMode}
          onSelectMode={(mode) => {
            if (mode === 'ARCHETYPES') {
              setWorkspaceMode('LEDGER');
              setSelectedAnomalyId((prev) => prev || MARKET_ANOMALIES[0]?.id || null);
            } else {
              setWorkspaceMode(mode);
            }
          }}
          currentFilter={currentFilter}
          onSelectFilter={(f) => {
            setCurrentFilter(f);
            setSelectedAnomalyId(null);
          }}
          bookmarkCount={bookmarkedIds.size}
          onOpenPro={() => setIsProModalOpen(true)}
        />

        {/* 画面モードに応じたコンテンツレンダリング */}
        {workspaceMode === 'SYNTHESIS' ? (
          <StrategySynthesisView
            allEntities={INSTITUTIONAL_ENTITIES}
            bookmarkedIds={bookmarkedIds}
            viewedEntityIds={viewedEntityIds}
            notes={notes}
            onSaveNote={saveNote}
            currency={currency}
            initialContextEntityId={selectedEntityId}
          />
        ) : (workspaceMode === 'RADAR' || workspaceMode === 'DEEP_DIVE') ? (
          <TacticalArchetypesView
            allEntities={INSTITUTIONAL_ENTITIES}
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
            (foundationSource === 'r2_lake' ? Boolean(selectedFoundationEntity) : Boolean(selectedEntity))
              ? 'w-full md:w-[440px] lg:w-[480px] xl:w-[520px] shrink-0 border-r border-white/[0.06]'
              : 'flex-1'
          }`}>
            {foundationSource === 'r2_lake' ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-[#090A0D] px-3 py-1.5 text-[10px] font-mono">
                  <span className="text-emerald-300">R2 LAKE · Foundation Entity</span>
                  <span className="text-zinc-500">読み込み済み {foundationEntities.length}件{foundationHasMore ? ' · 続きあり' : ''}</span>
                </div>
                <DataGridToolbar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  totalCount={filteredFoundationEntities.length}
                  onOpenScreener={() => setIsScreenerOpen(true)}
                  screenerFilters={null}
                  onResetScreener={() => undefined}
                  activeTags={[]}
                  onToggleTag={undefined}
                />
                <FoundationDataGrid
                  entities={filteredFoundationEntities}
                  selectedEntityId={selectedFoundationId}
                  onSelectEntity={setSelectedFoundationId}
                  bookmarkedIds={bookmarkedIds}
                  onToggleBookmark={handleToggleBookmark}
                  hasMore={foundationHasMore}
                  isLoadingMore={foundationLoading}
                  onLoadMore={handleLoadMoreFoundation}
                  isSplitView={Boolean(selectedFoundationEntity)}
                />
              </>
            ) : (
              <>
                {/* 市場の歪み ＆ トレンドレンズ（最上位ストリップ） */}
                <MarketAnomalyLensStrip
                  selectedAnomalyId={selectedAnomalyId}
                  onSelectAnomaly={setSelectedAnomalyId}
                  onOpenSynthesisWithEntity={(entityId) => {
                    setSelectedEntityId(entityId);
                    setWorkspaceMode('SYNTHESIS');
                  }}
                />

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
                />
              </>
            )}
          </div>
        )}

        {/* 右リアルタイム解剖インスペクター (全銘柄台帳モード時のみ表示) */}
        {workspaceMode === 'LEDGER' && foundationSource === 'r2_lake' && selectedFoundationEntity && (
          <FoundationInspectorPane
            entity={selectedFoundationEntity}
            detail={foundationDetail?.id === selectedFoundationId ? foundationDetail : null}
            detailLoading={foundationDetailLoading}
            onClose={() => setSelectedFoundationId(null)}
            onPrevEntity={handlePrevFoundationEntity}
            onNextEntity={handleNextFoundationEntity}
          />
        )}

        {workspaceMode === 'LEDGER' && foundationSource !== 'r2_lake' && selectedEntity && (
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
          if (mode === 'ARCHETYPES') {
            setWorkspaceMode('LEDGER');
            setSelectedAnomalyId((prev) => prev || MARKET_ANOMALIES[0]?.id || null);
          } else {
            setWorkspaceMode(mode);
          }
          if (mode === 'DEEP_DIVE') {
            setActiveTopicId(null);
          }
        }}
        currentFilter={currentFilter}
        onSelectFilter={(f) => {
          setWorkspaceMode('LEDGER');
          setCurrentFilter(f);
          setScreenerFilters(null);
          setSelectedAnomalyId(null);
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

