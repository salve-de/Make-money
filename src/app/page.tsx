'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { TERMINAL_COMPANIES } from '@/data/terminalData';
import { CompanyRecord, TerminalFilterState } from '@/types/terminal';
import { GlobalTerminalHeader } from '@/components/layout/GlobalTerminalHeader';
import { MobileBottomNavBar } from '@/components/layout/MobileBottomNavBar';
import { SearchPaletteModal } from '@/components/layout/SearchPaletteModal';
import { QuickFacetFilterBar, LedgerQuickPreset } from '@/components/ledger/QuickFacetFilterBar';
import { UniversalDataLedger } from '@/components/ledger/UniversalDataLedger';
import { ExecutiveDossierDrawer } from '@/components/dossier/ExecutiveDossierDrawer';
import { ExecutiveScreenerDrawer } from '@/components/screener/ExecutiveScreenerDrawer';
import { PortalView } from '@/components/terminal/PortalView';
import { SpecialCollectionsView } from '@/components/terminal/portal/sections/SpecialCollectionsView';
import { CollectionDetailView } from '@/components/terminal/portal/sections/CollectionDetailView';
import { MarketSignalsView } from '@/components/terminal/portal/sections/MarketSignalsView';
import { SignalDetailView } from '@/components/terminal/portal/sections/SignalDetailView';
import { LeaderboardView } from '@/components/terminal/portal/sections/LeaderboardView';
import { ProModal } from '@/components/terminal/ProModal';

export type MainViewType = 
  | 'TERMINAL'
  | 'PORTAL'
  | 'COLLECTIONS_LIST'
  | 'COLLECTION_DETAIL'
  | 'SIGNALS_LIST'
  | 'SIGNAL_DETAIL'
  | 'LEADERBOARD';

export default function Home() {
  // メイン画面（台帳 or 市場シグナルポータル）
  const [mainView, setMainView] = useState<MainViewType>('TERMINAL');

  // PROモーダル
  const [isProModalOpen, setIsProModalOpen] = useState(false);

  // ⌘K検索パレット
  const [isSearchPaletteOpen, setIsSearchPaletteOpen] = useState(false);

  // 50軸スクリーナー
  const [isScreenerOpen, setIsScreenerOpen] = useState(false);

  // 詳細ドシエDrawer開閉状態＆選択企業ID
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);

  // クイックファセットプリセット
  const [activePreset, setActivePreset] = useState<LedgerQuickPreset>('ALL');

  // ソート状態 ('REVENUE' | 'MARGIN')
  const [sortBy, setSortBy] = useState<'REVENUE' | 'MARGIN'>('REVENUE');

  // ブックマーク一覧
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kin_bookmarks');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const handleToggleBookmark = (companyId: string) => {
    setBookmarkedIds((prev) => {
      const next = prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('kin_bookmarks', JSON.stringify(next));
        } catch {}
      }
      fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: 'company', itemId: companyId }),
      }).catch(() => {});
      return next;
    });
  };

  // 50軸スクリーナーフィルター状態
  const [screenerFilter, setScreenerFilter] = useState<TerminalFilterState>({
    keyword: '',
    desireCategory: 'ALL',
    workStyle: 'ALL',
    ambitionScale: 'ALL',
    margin: 'ALL',
    capital: 'ALL',
    businessModelCategory: 'ALL',
    moat: 'ALL',
    acquisitionChannel: 'ALL',
    sortBy: 'revenueDesc'
  });

  const resetScreenerFilter = () => {
    setScreenerFilter({
      keyword: '',
      desireCategory: 'ALL',
      workStyle: 'ALL',
      ambitionScale: 'ALL',
      margin: 'ALL',
      capital: 'ALL',
      businessModelCategory: 'ALL',
      moat: 'ALL',
      acquisitionChannel: 'ALL',
      sortBy: 'revenueDesc'
    });
  };

  const activeScreenerCount = useMemo(() => {
    let count = 0;
    if (screenerFilter.workStyle !== 'ALL') count++;
    if (screenerFilter.capital !== 'ALL') count++;
    if (screenerFilter.margin !== 'ALL') count++;
    if (screenerFilter.acquisitionChannel !== 'ALL') count++;
    return count;
  }, [screenerFilter]);

  // フィルタリング ＆ ソート
  const filteredCompanies = useMemo(() => {
    return TERMINAL_COMPANIES.filter((company) => {
      // 1. クイックファセットプリセット
      if (activePreset === 'SOLO' && company.teamSize !== 1) return false;
      if (activePreset === 'HIGH_MARGIN') {
        const m = company.financials?.[company.financials.length - 1]?.operatingMarginPercent || 0;
        if (m < 50) return false;
      }
      if (activePreset === 'LOW_CAPITAL' && company.initialInvestmentJpy > 50000) return false;
      if (activePreset === 'GIANT' && company.scaleTier !== 'MEGA_CORP') return false;
      if (activePreset === 'AI_AUTO' && !(company.businessModel === 'MICRO_SAAS' || company.businessModel === 'FRONTIER_AI' || company.id.includes('photoai') || company.id.includes('outbid'))) return false;
      if (activePreset === 'BOOKMARK' && !bookmarkedIds.includes(company.id)) return false;

      // 2. 50軸スクリーナー
      if (screenerFilter.workStyle !== 'ALL') {
        if (screenerFilter.workStyle === 'REMOTE_SOLO' && company.teamSize !== 1) return false;
        if (screenerFilter.workStyle === 'SMALL_TEAM' && (company.teamSize < 2 || company.teamSize > 5)) return false;
        if (screenerFilter.workStyle === 'ENTERPRISE' && company.scaleTier !== 'MEGA_CORP') return false;
      }
      if (screenerFilter.capital !== 'ALL') {
        if (screenerFilter.capital === 'ZERO' && company.initialInvestmentJpy !== 0) return false;
        if (screenerFilter.capital === 'UNDER_50K' && company.initialInvestmentJpy > 50000) return false;
        if (screenerFilter.capital === 'UNDER_500K' && company.initialInvestmentJpy > 500000) return false;
      }
      if (screenerFilter.margin !== 'ALL') {
        const m = company.financials?.[company.financials.length - 1]?.operatingMarginPercent || 0;
        if (screenerFilter.margin === 'MARGIN_30' && m < 30) return false;
        if (screenerFilter.margin === 'MARGIN_50' && m < 50) return false;
        if (screenerFilter.margin === 'MARGIN_80' && m < 80) return false;
      }

      return true;
    }).sort((a, b) => {
      const aRev = a.financials?.[a.financials.length - 1]?.revenueJpy || 0;
      const bRev = b.financials?.[b.financials.length - 1]?.revenueJpy || 0;
      const aMargin = a.financials?.[a.financials.length - 1]?.operatingMarginPercent || 0;
      const bMargin = b.financials?.[b.financials.length - 1]?.operatingMarginPercent || 0;

      if (sortBy === 'MARGIN') return bMargin - aMargin;
      return bRev - aRev;
    });
  }, [activePreset, screenerFilter, sortBy, bookmarkedIds]);

  // 詳細ドシエ対象の企業
  const currentDossierCompany = useMemo(() => {
    if (!selectedDossierId) return null;
    return TERMINAL_COMPANIES.find((c) => c.id === selectedDossierId) || null;
  }, [selectedDossierId]);

  // 前後の銘柄移動
  const currentDossierIndex = useMemo(() => {
    if (!selectedDossierId) return -1;
    return filteredCompanies.findIndex((c) => c.id === selectedDossierId);
  }, [selectedDossierId, filteredCompanies]);

  const handleNextDossier = () => {
    if (currentDossierIndex >= 0 && currentDossierIndex < filteredCompanies.length - 1) {
      setSelectedDossierId(filteredCompanies[currentDossierIndex + 1].id);
    }
  };

  const handlePrevDossier = () => {
    if (currentDossierIndex > 0) {
      setSelectedDossierId(filteredCompanies[currentDossierIndex - 1].id);
    }
  };

  // 外部からのモデルクリック直行ハンドラー
  const handleOpenCompanyDetail = (id: string) => {
    setSelectedDossierId(id);
    setMainView('TERMINAL');
  };

  // ポータル内サブ画面管理
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [activeSignalId, setActiveSignalId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#080B10] text-zinc-100 flex flex-col font-sans select-none antialiased">
      {/* ── 1. グローバルヘッダー (48px) ── */}
      <GlobalTerminalHeader
        mainView={mainView === 'TERMINAL' ? 'TERMINAL' : 'PORTAL'}
        onChangeMainView={(v) => {
          setMainView(v);
          if (v === 'TERMINAL') {
            setActiveCollectionId(null);
            setActiveSignalId(null);
          }
        }}
        onOpenSearchPalette={() => setIsSearchPaletteOpen(true)}
        onOpenProModal={() => setIsProModalOpen(true)}
        totalCount={TERMINAL_COMPANIES.length}
      />

      {/* ── 2. メインビュー切り替え ── */}
      {mainView === 'TERMINAL' && (
        <div className="flex-1 flex flex-col min-h-0 pb-12 md:pb-0">
          {/* クイックファセットチップスバー (h-9) */}
          <QuickFacetFilterBar
            activePreset={activePreset}
            onSelectPreset={setActivePreset}
            totalCount={TERMINAL_COMPANIES.length}
            filteredCount={filteredCompanies.length}
            bookmarkCount={bookmarkedIds.length}
            onOpenScreener={() => setIsScreenerOpen(true)}
            activeScreenerCount={activeScreenerCount}
          />

          {/* 金融台帳（スマホ・狭小PC・ワイドPCの自動ポリモーフィズム） */}
          <UniversalDataLedger
            companies={filteredCompanies}
            onSelectCompany={(id) => setSelectedDossierId(id)}
            selectedCompanyId={selectedDossierId}
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={handleToggleBookmark}
            onSortByRevenue={() => setSortBy('REVENUE')}
            onSortByMargin={() => setSortBy('MARGIN')}
          />
        </div>
      )}

      {/* ポータル・市場シグナル系統 */}
      {mainView === 'PORTAL' && (
        <div className="flex-1 flex flex-col min-h-0 pb-12 md:pb-0">
          <PortalView
            companies={TERMINAL_COMPANIES}
            onSelectCompany={handleOpenCompanyDetail}
            onNavigateToTerminal={() => setMainView('TERMINAL')}
            onOpenCollectionsList={() => setMainView('COLLECTIONS_LIST')}
            onOpenCollectionDetail={(cid) => {
              setActiveCollectionId(cid);
              setMainView('COLLECTION_DETAIL');
            }}
            onOpenSignalsList={() => setMainView('SIGNALS_LIST')}
            onOpenSignalDetail={(sid) => {
              setActiveSignalId(sid);
              setMainView('SIGNAL_DETAIL');
            }}
            onOpenLeaderboard={() => setMainView('LEADERBOARD')}
          />
        </div>
      )}

      {mainView === 'COLLECTIONS_LIST' && (
        <div className="flex-1 flex flex-col min-h-0 pb-12 md:pb-0">
          <SpecialCollectionsView
            companies={TERMINAL_COMPANIES}
            onSelectCompany={handleOpenCompanyDetail}
            onOpenDossier={(did) => {
              setActiveCollectionId(did);
              setMainView('COLLECTION_DETAIL');
            }}
            onBackToPortal={() => setMainView('PORTAL')}
          />
        </div>
      )}

      {mainView === 'COLLECTION_DETAIL' && activeCollectionId && (
        <div className="flex-1 flex flex-col min-h-0 pb-12 md:pb-0">
          <CollectionDetailView
            collectionId={activeCollectionId}
            companies={TERMINAL_COMPANIES}
            onSelectCompany={handleOpenCompanyDetail}
            onBackToCollectionsList={() => setMainView('COLLECTIONS_LIST')}
            onBackToPortal={() => setMainView('PORTAL')}
          />
        </div>
      )}

      {mainView === 'SIGNALS_LIST' && (
        <div className="flex-1 flex flex-col min-h-0 pb-12 md:pb-0">
          <MarketSignalsView
            companies={TERMINAL_COMPANIES}
            onSelectCompany={handleOpenCompanyDetail}
            onSelectSignal={(sid) => {
              setActiveSignalId(sid);
              setMainView('SIGNAL_DETAIL');
            }}
            onBackToPortal={() => setMainView('PORTAL')}
          />
        </div>
      )}

      {mainView === 'SIGNAL_DETAIL' && activeSignalId && (
        <div className="flex-1 flex flex-col min-h-0 pb-12 md:pb-0">
          <SignalDetailView
            signalId={activeSignalId}
            companies={TERMINAL_COMPANIES}
            onSelectCompany={handleOpenCompanyDetail}
            onBackToSignalsList={() => setMainView('SIGNALS_LIST')}
            onBackToPortal={() => setMainView('PORTAL')}
          />
        </div>
      )}

      {mainView === 'LEADERBOARD' && (
        <div className="flex-1 flex flex-col min-h-0 pb-12 md:pb-0">
          <LeaderboardView
            companies={TERMINAL_COMPANIES}
            onSelectCompany={handleOpenCompanyDetail}
            onBackToPortal={() => setMainView('PORTAL')}
          />
        </div>
      )}

      {/* ── 3. スマホ専用固定ボトムナビ (親指ゾーン) ── */}
      <MobileBottomNavBar
        mainView={mainView === 'TERMINAL' ? 'TERMINAL' : 'PORTAL'}
        onChangeMainView={(v) => {
          setMainView(v);
          setActivePreset('ALL');
        }}
        onOpenScreener={() => setIsScreenerOpen(true)}
        bookmarkCount={bookmarkedIds.length}
        activeFilterCount={activeScreenerCount}
        onSelectBookmarkFilter={() => {
          setMainView('TERMINAL');
          setActivePreset(activePreset === 'BOOKMARK' ? 'ALL' : 'BOOKMARK');
        }}
        isBookmarkActive={activePreset === 'BOOKMARK'}
      />

      {/* ── 4. ⌘K 検索コマンドパレット ── */}
      <SearchPaletteModal
        isOpen={isSearchPaletteOpen}
        onClose={() => setIsSearchPaletteOpen(false)}
        companies={TERMINAL_COMPANIES}
        onSelectCompany={handleOpenCompanyDetail}
      />

      {/* ── 5. 50軸 金融スクリーナーDrawer ── */}
      <ExecutiveScreenerDrawer
        isOpen={isScreenerOpen}
        onClose={() => setIsScreenerOpen(false)}
        filter={screenerFilter}
        onChangeFilter={setScreenerFilter}
        onReset={resetScreenerFilter}
        filteredCount={filteredCompanies.length}
      />

      {/* ── 6. エグゼクティブ監査ドシエDrawer (右スライドイン & ボトムシート) ── */}
      <ExecutiveDossierDrawer
        company={currentDossierCompany}
        isOpen={selectedDossierId !== null}
        onClose={() => setSelectedDossierId(null)}
        onNext={handleNextDossier}
        onPrev={handlePrevDossier}
        hasNext={currentDossierIndex < filteredCompanies.length - 1}
        hasPrev={currentDossierIndex > 0}
        bookmarkedIds={bookmarkedIds}
        onToggleBookmark={handleToggleBookmark}
        onOpenProModal={() => setIsProModalOpen(true)}
      />

      {/* ── 7. PROアンロックモーダル ── */}
      <ProModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
      />
    </div>
  );
}
