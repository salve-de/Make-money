'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { TERMINAL_COMPANIES } from '@/data/terminalData';
import { CompanyRecord, TerminalFilterState } from '@/types/terminal';
import { CleanHeader } from '@/components/terminal/CleanHeader';
import { DesireFilterBar, DesirePreset, SortOrder } from '@/components/terminal/DesireFilterBar';
import { ActiveFilterChips } from '@/components/terminal/ActiveFilterChips';
import { ScreenerModal } from '@/components/terminal/ScreenerModal';
import { CompanyListSidebar } from '@/components/terminal/CompanyListSidebar';
import { ExecutiveDetailSheet } from '@/components/terminal/ExecutiveDetailSheet';
import { PlaybookInspector } from '@/components/terminal/PlaybookInspector';
import { TerminalDirectoryTable } from '@/components/terminal/TerminalDirectoryTable';
import { PortalView } from '@/components/terminal/PortalView';
import { SpecialCollectionsView } from '@/components/terminal/portal/sections/SpecialCollectionsView';
import { CollectionDetailView } from '@/components/terminal/portal/sections/CollectionDetailView';
import { MarketSignalsView } from '@/components/terminal/portal/sections/MarketSignalsView';
import { SignalDetailView } from '@/components/terminal/portal/sections/SignalDetailView';
import { LeaderboardView } from '@/components/terminal/portal/sections/LeaderboardView';
import { IdeasVaultView } from '@/components/terminal/IdeasVaultView';
import { DiagnosticFinder } from '@/components/terminal/DiagnosticFinder';
import { MarketLiveTicker } from '@/components/terminal/MarketLiveTicker';
import { ProModal } from '@/components/terminal/ProModal';

export type MainViewType = 
  | 'PORTAL'
  | 'FINDER'
  | 'IDEAS_VAULT'
  | 'TERMINAL'
  | 'COLLECTIONS_LIST'
  | 'COLLECTION_DETAIL'
  | 'SIGNALS_LIST'
  | 'SIGNAL_DETAIL'
  | 'LEADERBOARD';

export default function Home() {
  // PROモーダル開閉状態
  const [isProModalOpen, setIsProModalOpen] = useState(false);

  // ブックマーク一覧管理（ローカルストレージ ＋ /api/bookmarks 連携）
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

  // 選択中の銘柄ID
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    TERMINAL_COMPANIES[0]?.id || 'keyence-6861'
  );

  // 詳細レポート表示中の企業ID（nullなら全銘柄テーブル一覧を表示）
  const [selectedCompanyDetailId, setSelectedCompanyDetailId] = useState<string | null>(null);

  // ユーザーの欲望別クイックプリセット
  const [activePreset, setActivePreset] = useState<DesirePreset>('ALL');

  // 並び替え状態（売上高順でキーエンス・エヌビディアから整然と開始）
  const [activeSort, setActiveSort] = useState<SortOrder>('REVENUE_DESC');

  // 多次元スクリーナー開閉状態 (ポップアップ)
  const [isScreenerOpen, setIsScreenerOpen] = useState(false);

  // 多次元スクリーナー統合状態
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

  // 検索クエリ
  const [searchQuery, setSearchQuery] = useState('');

  // メイン画面の表示モード（デフォルトは世界標準3ペイン端末 TERMINAL）
  const [mainView, setMainView] = useState<MainViewType>('TERMINAL');

  // 選択中の特集コレクションID / シグナルID
  const [activeCollectionId, setActiveCollectionId] = useState<string>('collection-passive');
  const [activeSignalId, setActiveSignalId] = useState<string>('signal-tiktok-shop-faceless');

  // 多次元スクリーニング判定関数（外部調査に基づく完全判定ロジック）
  const matchesMultidimensional = (c: CompanyRecord, filter: TerminalFilterState) => {
    const latestFin = c.financials[c.financials.length - 1];
    const latestRev = latestFin?.revenueJpy || 0;
    const latestMargin = latestFin?.operatingMarginPercent || 0;

    // 1. 作業体質・チーム規模
    if (filter.workStyle === 'REMOTE_SOLO') {
      const isSolo = c.teamSize === 1;
      const isNonPhysical = !c.tags.includes('B2B製造') && !c.tags.includes('地方実業');
      if (!isSolo || !isNonPhysical) return false;
    } else if (filter.workStyle === 'SMALL_TEAM') {
      if (c.teamSize < 2 || c.teamSize > 5) return false;
    } else if (filter.workStyle === 'LOCAL_REAL') {
      const isLocal =
        c.tags.includes('地方実業') ||
        c.tags.includes('無人貸倉庫') ||
        c.tags.includes('B2B製造') ||
        c.businessModel === 'LOCAL_DX';
      if (!isLocal) return false;
    } else if (filter.workStyle === 'SALES_HIGH') {
      const isSales = c.tags.includes('直販モデル') || c.tags.includes('営業受託') || c.tags.includes('人的受託');
      if (!isSales) return false;
    } else if (filter.workStyle === 'AUTOMATED_PASSIVE') {
      const isPassive =
        c.tags.includes('自律収益') ||
        c.tags.includes('高粗利ストック') ||
        c.tags.includes('不労所得') ||
        c.tags.includes('無人') ||
        c.tags.includes('月利3200万') ||
        c.tags.includes('月利3500万');
      if (!isPassive) return false;
    } else if (filter.workStyle === 'ENTERPRISE') {
      if (c.teamSize < 100) return false;
    }

    // 2. 目標金額・野望規模
    if (filter.ambitionScale === 'POCKET_10K') {
      if (c.initialInvestmentJpy > 50000 || c.scaleTier === 'MEGA_CORP' || c.scaleTier === 'NICHE_LEADER') return false;
    } else if (filter.ambitionScale === 'INDEPENDENT_1M') {
      if (c.scaleTier === 'MEGA_CORP' || latestRev > 5000000000) return false;
    } else if (filter.ambitionScale === 'SOLO_RICH_10M') {
      if (c.teamSize > 5 || latestRev < 50000000) return false;
    } else if (filter.ambitionScale === 'MID_CORP_100M') {
      if (latestRev < 500000000 || latestRev > 50000000000) return false;
    } else if (filter.ambitionScale === 'WORLD_MEGA') {
      if (c.scaleTier !== 'MEGA_CORP' && c.scaleTier !== 'SCALE_UP') return false;
    }

    // 3. 利益率の異常度
    if (filter.margin === 'MARGIN_30') {
      if (latestMargin < 30) return false;
    } else if (filter.margin === 'MARGIN_50') {
      if (latestMargin < 50) return false;
    } else if (filter.margin === 'MARGIN_80') {
      if (latestMargin < 75) return false;
    }

    // 4. 初期元手・投資額
    if (filter.capital === 'ZERO') {
      if (c.initialInvestmentJpy > 50000 && !c.tags.includes('初期0円')) return false;
    } else if (filter.capital === 'UNDER_50K') {
      if (c.initialInvestmentJpy > 50000) return false;
    } else if (filter.capital === 'UNDER_500K') {
      if (c.initialInvestmentJpy > 500000) return false;
    } else if (filter.capital === 'OVER_1M') {
      if (c.initialInvestmentJpy < 1000000) return false;
    } else if (filter.capital === 'FOR_SALE') {
      if (!c.isForSale) return false;
    }

    // 5. ビジネスモデル
    if (filter.businessModelCategory === 'SAAS') {
      if (c.businessModel !== 'MICRO_SAAS' && c.businessModel !== 'PAYMENT_INFRA' && c.businessModel !== 'FRONTIER_AI') return false;
    } else if (filter.businessModelCategory === 'MEDIA_NEWS') {
      if (c.businessModel !== 'MEDIA_NEWS') return false;
    } else if (filter.businessModelCategory === 'DIGITAL_ASSET') {
      if (c.businessModel !== 'DIGITAL_ASSET') return false;
    } else if (filter.businessModelCategory === 'AGENCY_B2B') {
      if (!c.tags.includes('営業受託') && !c.tags.includes('人的受託')) return false;
    } else if (filter.businessModelCategory === 'LOCAL_DX') {
      if (c.businessModel !== 'LOCAL_DX' && !c.tags.includes('無人貸倉庫')) return false;
    } else if (filter.businessModelCategory === 'COMMERCE') {
      if (c.businessModel !== 'COMMERCE_AUTO') return false;
    } else if (filter.businessModelCategory === 'DEEPTECH_MFG') {
      if (c.businessModel !== 'B2B_DIRECT' && c.businessModel !== 'CHIP_ECOSYSTEM' && c.businessModel !== 'SEMICON_EQUIP' && c.businessModel !== 'PRECISION_MED' && c.businessModel !== 'CHEMICAL_MAT') return false;
    }

    // 6. 参入障壁・七つの堀
    if (filter.moat !== 'ALL') {
      if (c.primaryMoat !== filter.moat) return false;
    }

    // 7. 集客チャネル
    if (filter.acquisitionChannel === 'X_TWITTER') {
      if (!c.initialTractionStrategy.includes('X') && !c.initialTractionStrategy.includes('Twitter') && !c.coreMoatDescription.includes('X')) return false;
    } else if (filter.acquisitionChannel === 'DIRECT_OUTREACH') {
      if (!c.tags.includes('直販') && !c.tags.includes('営業受託')) return false;
    } else if (filter.acquisitionChannel === 'SEO_ORGANIC') {
      if (!c.initialTractionStrategy.includes('SEO') && !c.coreMoatDescription.includes('SEO')) return false;
    } else if (filter.acquisitionChannel === 'AFFILIATE_LOOP') {
      if (!c.tags.includes('紹介即日還元') && !c.coreMoatDescription.includes('アフィリエイト')) return false;
    } else if (filter.acquisitionChannel === 'ZERO_AD_SPEND') {
      if (!c.tags.includes('広告費0円') && !c.tags.includes('広告費ゼロ')) return false;
    }

    return true;
  };

  // フィルタリング＆ソート後の銘柄一覧
  const filteredCompanies = useMemo(() => {
    return TERMINAL_COMPANIES.filter((c) => {
      // 1. 検索キーワード
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchJp = c.japaneseName.toLowerCase().includes(q);
        const matchTicker = c.ticker.toLowerCase().includes(q);
        const matchHeadline = c.actionHeadline.toLowerCase().includes(q);
        const matchMoat = c.primaryMoat.toLowerCase().includes(q);
        const matchWhat = c.businessEssence?.whatItDoes.toLowerCase().includes(q);
        const matchTag = c.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchJp && !matchTicker && !matchHeadline && !matchMoat && !matchWhat && !matchTag) {
          return false;
        }
      }

      // 2. クイック欲望別プリセットフィルター
      switch (activePreset) {
        case 'SOLO_MILLION':
          if (!(c.teamSize <= 2 && (c.scaleTier === 'SOLO_MICRO' || c.tags.includes('完全1人')))) return false;
          break;
        case 'ZERO_INVESTMENT':
          if (!(c.initialInvestmentJpy <= 50000 || c.tags.includes('初期0円'))) return false;
          break;
        case 'AI_SAAS':
          if (
            !(
              c.tags.includes('AIツール') ||
              c.tags.includes('小型SaaS') ||
              c.tags.includes('AI半導体') ||
              c.tags.includes('基盤AIモデル') ||
              c.tags.includes('対話型検索')
            )
          )
            return false;
          break;
        case 'LOCAL_DX':
          if (!(c.businessModel === 'LOCAL_DX' || c.tags.includes('地方実業DX') || c.tags.includes('地方実業'))) return false;
          break;
        case 'MEDIA_LETTER':
          if (!(c.businessModel === 'MEDIA_NEWS' || c.tags.includes('メディア手紙'))) return false;
          break;
        case 'MEGA_MONOPOLY':
          if (!(c.scaleTier === 'MEGA_CORP' || c.tags.includes('巨大独占'))) return false;
          break;
        case 'FOR_SALE':
          if (!c.isForSale) return false;
          break;
        // 【新設: 希望の手札フィルター】
        case 'SKILL_ZERO' as any:
          if (c.handFilters?.includes('SKILL_ZERO')) return true;
          if (c.tags.includes('地方実業') || c.tags.includes('完全1人') || c.businessModel === 'LOCAL_DX') return true;
          return false;
        case 'ZERO_CAPITAL' as any:
          if (c.handFilters?.includes('ZERO_CAPITAL') || c.initialInvestmentJpy <= 30000 || c.tags.includes('初期0円')) return true;
          return false;
        case 'NO_AUDIENCE' as any:
          if (c.handFilters?.includes('NO_AUDIENCE') || c.tags.includes('直販モデル') || c.tags.includes('地方実業')) return true;
          return false;
        case 'SECOND_MOVER' as any:
          if (c.entryStrategy?.lensType === 'SECOND_MOVER' || c.scaleTier === 'SOLO_MICRO') return true;
          return false;
        case 'GIANT_CRUMBS' as any:
          if (c.entryStrategy?.lensType === 'GIANT_CRUMBS' || c.scaleTier === 'MEGA_CORP' || c.scaleTier === 'SCALE_UP') return true;
          return false;
        case 'PASSIVE' as any:
          if (c.handFilters?.includes('PASSIVE') || c.tags.includes('週5時間労働') || c.tags.includes('高粗利ストック') || c.tags.includes('自律収益') || c.tags.includes('不労所得') || c.tags.includes('月利900万')) return true;
          return false;
        case 'ALL':
        default:
          break;
      }

      // 3. 多次元スクリーナー（作業体質・目標金額・初期元手・武器手法）
      return matchesMultidimensional(c, screenerFilter);
    }).sort((a, b) => {
      const aFin = a.financials[a.financials.length - 1];
      const bFin = b.financials[b.financials.length - 1];
      const aMargin = aFin?.operatingMarginPercent || 0;
      const bMargin = bFin?.operatingMarginPercent || 0;
      const aRev = aFin?.revenueJpy || 0;
      const bRev = bFin?.revenueJpy || 0;

      switch (activeSort) {
        case 'MARGIN_DESC':
          return bMargin - aMargin;
        case 'REVENUE_DESC':
          return bRev - aRev;
        case 'TEAM_ASC':
          return a.teamSize - b.teamSize;
        case 'INVEST_ASC':
          return a.initialInvestmentJpy - b.initialInvestmentJpy;
        default:
          return 0;
      }
    });
  }, [searchQuery, activePreset, activeSort, screenerFilter]);

  // 現在選択中の企業レコード（該当ゼロ時はnull）
  const currentCompany = useMemo(() => {
    const found = filteredCompanies.find((c) => c.id === selectedCompanyId);
    return found || filteredCompanies[0] || null;
  }, [selectedCompanyId, filteredCompanies]);

  // 条件個別解除ハンドラー
  const handleRemoveFilter = (key: keyof TerminalFilterState) => {
    setScreenerFilter((prev) => ({
      ...prev,
      [key]: 'ALL'
    }));
  };

  // 全条件一括解除ハンドラー
  const handleResetAll = () => {
    setActivePreset('ALL');
    setSearchQuery('');
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

  // キーボードナビゲーション（J: 次の企業, K: 前の企業, 1〜4: ビュー切り替え）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // フォーム入力中はショートカットを無効化
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = filteredCompanies.findIndex((c) => c.id === selectedCompanyId);
        if (currentIndex < filteredCompanies.length - 1) {
          setSelectedCompanyId(filteredCompanies[currentIndex + 1].id);
        }
      } else if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = filteredCompanies.findIndex((c) => c.id === selectedCompanyId);
        if (currentIndex > 0) {
          setSelectedCompanyId(filteredCompanies[currentIndex - 1].id);
        }
      } else if (e.key === '1') {
        setMainView('TERMINAL');
        setSelectedCompanyDetailId(null);
      } else if (e.key === '2') {
        setMainView('PORTAL');
      } else if (e.key === 'Escape') {
        setSelectedCompanyDetailId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCompanies, selectedCompanyId]);

  return (
    <div className="h-screen w-screen bg-[#0B0E14] text-zinc-100 flex flex-col font-sans overflow-hidden select-none">
      {/* 1. 清潔な上部ヘッダー */}
      <CleanHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={TERMINAL_COMPANIES.length}
        mainView={mainView}
        onChangeMainView={setMainView}
        onOpenProModal={() => setIsProModalOpen(true)}
      />

      {/* リアルタイム市場金融ティッカー（全画面共通・横に流れる速報ニュースフィード） */}
      <MarketLiveTicker
        onSelectCompany={(id) => {
          setSelectedCompanyId(id);
          setMainView('TERMINAL');
        }}
      />

      {/* 2. メインコンテンツ（ポータル ⇄ 分析台帳 ⇄ 各種特集・個別詳細ページ） */}
      {mainView === 'PORTAL' && (
        <PortalView
          companies={filteredCompanies}
          onSelectCompany={(id) => {
            setSelectedCompanyId(id);
            setMainView('TERMINAL');
          }}
          onNavigateToTerminal={() => setMainView('TERMINAL')}
          onFilterTheme={(tag) => {
            if (tag === '完全1人') setActivePreset('SOLO_MILLION');
            else if (tag === '初期0円') setActivePreset('ZERO_INVESTMENT');
            else if (tag === '地方実業') setActivePreset('LOCAL_DX');
            else if (tag === '独占') setActivePreset('MEGA_MONOPOLY');
          }}
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
          onOpenIdeasVault={() => setMainView('IDEAS_VAULT')}
          onOpenFinder={() => setMainView('FINDER')}
        />
      )}

      {/* 大特集コレクション一覧画面 */}
      {mainView === 'COLLECTIONS_LIST' && (
        <SpecialCollectionsView
          companies={filteredCompanies}
          onSelectCompany={(id) => {
            setSelectedCompanyId(id);
            setMainView('TERMINAL');
          }}
          onOpenDossier={(cid) => {
            setActiveCollectionId(cid);
            setMainView('COLLECTION_DETAIL');
          }}
          onBackToPortal={() => setMainView('PORTAL')}
        />
      )}

      {/* 大特集コレクション個別詳細画面 */}
      {mainView === 'COLLECTION_DETAIL' && (
        <CollectionDetailView
          collectionId={activeCollectionId}
          companies={filteredCompanies}
          onSelectCompany={(id) => {
            setSelectedCompanyId(id);
            setMainView('TERMINAL');
          }}
          onBackToCollectionsList={() => setMainView('COLLECTIONS_LIST')}
          onBackToPortal={() => setMainView('PORTAL')}
        />
      )}

      {/* 市場シグナル一覧画面 */}
      {mainView === 'SIGNALS_LIST' && (
        <MarketSignalsView
          companies={filteredCompanies}
          onSelectCompany={(id) => {
            setSelectedCompanyId(id);
            setMainView('TERMINAL');
          }}
          onSelectSignal={(sid) => {
            setActiveSignalId(sid);
            setMainView('SIGNAL_DETAIL');
          }}
          onBackToPortal={() => setMainView('PORTAL')}
        />
      )}

      {/* 市場シグナル個別詳細画面 */}
      {mainView === 'SIGNAL_DETAIL' && (
        <SignalDetailView
          signalId={activeSignalId}
          companies={filteredCompanies}
          onSelectCompany={(id) => {
            setSelectedCompanyId(id);
            setMainView('TERMINAL');
          }}
          onBackToSignalsList={() => setMainView('SIGNALS_LIST')}
          onBackToPortal={() => setMainView('PORTAL')}
        />
      )}

      {/* リーダーボード全頭検査画面 */}
      {mainView === 'LEADERBOARD' && (
        <LeaderboardView
          companies={filteredCompanies}
          onSelectCompany={(id) => {
            setSelectedCompanyId(id);
            setMainView('TERMINAL');
          }}
          onBackToPortal={() => setMainView('PORTAL')}
        />
      )}

      {/* リソース適合診断専用画面（完全単一独立ワークスペース 左右2ペイン） */}
      {mainView === 'FINDER' && (
        <div className="flex-1 flex overflow-hidden">
          <DiagnosticFinder
            onSelectCompany={(id) => {
              setSelectedCompanyId(id);
              setMainView('TERMINAL');
            }}
          />
        </div>
      )}

      {/* 実践ビジネスアイデア台帳画面（左右2ペイン） */}
      {mainView === 'IDEAS_VAULT' && (
        <div className="flex-1 flex overflow-hidden">
          <IdeasVaultView
            onSelectCompany={(id) => {
              setSelectedCompanyId(id);
              setMainView('TERMINAL');
            }}
          />
        </div>
      )}

      {/* 企業財務データベース（Starter Story / PitchBook / Sacra 規格） */}
      {mainView === 'TERMINAL' && (
        <div className="flex-1 flex overflow-hidden min-h-0">
          {selectedCompanyDetailId ? (
            /* 詳細監査レポート画面（Sacra / PitchBook型：広々とした可読性MAXレイアウト） */
            <ExecutiveDetailSheet
              company={
                TERMINAL_COMPANIES.find((c) => c.id === selectedCompanyDetailId) ||
                TERMINAL_COMPANIES[0]
              }
              onOpenProModal={() => setIsProModalOpen(true)}
              isBookmarked={bookmarkedIds.includes(selectedCompanyDetailId)}
              onToggleBookmark={handleToggleBookmark}
              onBackToList={() => setSelectedCompanyDetailId(null)}
            />
          ) : (
            /* 全銘柄・高密度ディレクトリーテーブル（Starter Story / PitchBook型：全画面データグリッド） */
            <TerminalDirectoryTable
              companies={filteredCompanies}
              totalCount={TERMINAL_COMPANIES.length}
              onSelectCompany={(id) => setSelectedCompanyDetailId(id)}
              onOpenScreener={() => setIsScreenerOpen(true)}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
            />
          )}
        </div>
      )}

      {/* 詳細絞り込みスクリーナーモーダル */}
      <ScreenerModal
        isOpen={isScreenerOpen}
        onClose={() => setIsScreenerOpen(false)}
        filter={screenerFilter}
        onChangeFilter={(newFilter) => {
          setScreenerFilter(newFilter);
          const match = TERMINAL_COMPANIES.find((c) => matchesMultidimensional(c, newFilter));
          if (match) setSelectedCompanyId(match.id);
        }}
        totalCount={TERMINAL_COMPANIES.length}
        filteredCount={filteredCompanies.length}
        matchingCompanies={filteredCompanies}
      />

      {/* PROメンバーシップ決済モーダル */}
      <ProModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
      />
    </div>
  );
}
