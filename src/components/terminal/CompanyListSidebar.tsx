'use client';

import React, { useState } from 'react';
import { CompanyRecord, ScaleTier, TerminalFilterState } from '../../types/terminal';
import { DesirePreset, SortOrder } from './DesireFilterBar';
import { CompanyLogo } from './CompanyLogo';
import { SparklineChart } from './SparklineChart';
import { SlidersHorizontal, ChevronRight, X } from 'lucide-react';

interface CompanyListSidebarProps {
  companies: CompanyRecord[];
  totalCount: number;
  selectedCompanyId: string;
  onSelectCompany: (id: string) => void;
  activePreset: DesirePreset;
  onSelectPreset: (preset: DesirePreset) => void;
  activeSort: SortOrder;
  onSelectSort: (sort: SortOrder) => void;
  onOpenScreener: () => void;
  hasActiveFilters: boolean;
  filter: TerminalFilterState;
  onRemoveFilter: (key: keyof TerminalFilterState) => void;
  onResetAll: () => void;
  bookmarkedIds?: string[];
}

export const CompanyListSidebar: React.FC<CompanyListSidebarProps> = ({
  companies,
  totalCount,
  selectedCompanyId,
  onSelectCompany,
  activePreset,
  onSelectPreset,
  activeSort,
  onSelectSort,
  onOpenScreener,
  hasActiveFilters,
  filter,
  onRemoveFilter,
  onResetAll,
  bookmarkedIds = []
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scaleTab, setScaleTab] = useState<'ALL' | 'SOLO_SMALL' | 'MEGA_CORP' | 'SAVED'>('ALL');

  // 規模別および保存済みの件数計算
  const soloSmallCompanies = companies.filter(
    (c) => c.teamSize <= 5 || c.scaleTier === 'SOLO_MICRO' || c.scaleTier === 'NICHE_LEADER'
  );
  const megaCorpCompanies = companies.filter(
    (c) => c.scaleTier === 'MEGA_CORP' || c.tags.includes('巨大独占')
  );
  const savedCompanies = companies.filter((c) => bookmarkedIds.includes(c.id));

  // 規模タブ適用後の表示リスト
  const displayedCompanies = companies.filter((c) => {
    if (scaleTab === 'SOLO_SMALL') {
      return c.teamSize <= 5 || c.scaleTier === 'SOLO_MICRO' || c.scaleTier === 'NICHE_LEADER';
    }
    if (scaleTab === 'MEGA_CORP') {
      return c.scaleTier === 'MEGA_CORP' || c.tags.includes('巨大独占');
    }
    if (scaleTab === 'SAVED') {
      return bookmarkedIds.includes(c.id);
    }
    return true;
  });

  const handleScaleTabChange = (newTab: 'ALL' | 'SOLO_SMALL' | 'MEGA_CORP' | 'SAVED') => {
    setScaleTab(newTab);
    if (newTab === 'MEGA_CORP' && megaCorpCompanies.length > 0) {
      const alreadyMega = megaCorpCompanies.some((c) => c.id === selectedCompanyId);
      if (!alreadyMega) onSelectCompany(megaCorpCompanies[0].id);
    } else if (newTab === 'SOLO_SMALL' && soloSmallCompanies.length > 0) {
      const alreadySolo = soloSmallCompanies.some((c) => c.id === selectedCompanyId);
      if (!alreadySolo) onSelectCompany(soloSmallCompanies[0].id);
    } else if (newTab === 'SAVED' && savedCompanies.length > 0) {
      const alreadySaved = savedCompanies.some((c) => c.id === selectedCompanyId);
      if (!alreadySaved) onSelectCompany(savedCompanies[0].id);
    }
  };

  return (
    <div className={`${isCollapsed ? 'w-10' : 'w-84 lg:w-92'} bg-[#0D1117] border-r border-white/[0.08] flex flex-col shrink-0 select-none overflow-hidden font-sans transition-[width] duration-200`}>
      {isCollapsed ? (
        <div className="flex h-full flex-col items-center bg-[#090C10] py-3 border-r border-white/[0.08]">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex h-6 w-6 items-center justify-center rounded border border-white/[0.1] bg-white/[0.04] text-xs leading-none text-zinc-400 hover:bg-white/[0.08] hover:text-white cursor-pointer"
            aria-label="候補一覧を開く"
          >
            ›
          </button>
          <span className="mt-4 text-[10px] font-mono tracking-widest text-zinc-500 [writing-mode:vertical-rl]">
            DIRECTORY
          </span>
        </div>
      ) : (
        <>
          {/* 1. スクリーナー頭部 */}
          <div className="p-3 bg-[#12161F] border-b border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                DIRECTORY ({displayedCompanies.length}/{totalCount})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpenScreener}
                  className={`h-6 px-2 rounded border text-[10px] font-mono font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                    hasActiveFilters
                      ? 'bg-zinc-100 text-zinc-950 border-white font-bold shadow-xs'
                      : 'bg-white/[0.05] text-zinc-300 border-white/[0.1] hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  <SlidersHorizontal size={10} />
                  <span>50軸条件</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  className="h-6 w-6 flex items-center justify-center rounded border border-white/[0.1] bg-white/[0.04] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  title="サイドバーを閉じる"
                >
                  ‹
                </button>
              </div>
            </div>

            {/* 4分割セグメント（個人・少人数 / 独占大企業 / 保存済み / 全件） */}
            <div className="grid grid-cols-4 gap-0.5 bg-black/40 p-0.5 rounded text-[10px] font-mono border border-white/[0.06]">
              <button
                type="button"
                onClick={() => handleScaleTabChange('SOLO_SMALL')}
                className={`py-1 text-center rounded transition-colors cursor-pointer ${
                  scaleTab === 'SOLO_SMALL'
                    ? 'bg-white/[0.15] text-white font-bold shadow-xs border border-white/[0.1]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="個人・少人数企業"
              >
                個人 ({soloSmallCompanies.length})
              </button>
              <button
                type="button"
                onClick={() => handleScaleTabChange('MEGA_CORP')}
                className={`py-1 text-center rounded transition-colors cursor-pointer ${
                  scaleTab === 'MEGA_CORP'
                    ? 'bg-white/[0.15] text-white font-bold shadow-xs border border-white/[0.1]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="巨大独占企業"
              >
                大企業 ({megaCorpCompanies.length})
              </button>
              <button
                type="button"
                onClick={() => handleScaleTabChange('SAVED')}
                className={`py-1 text-center rounded transition-colors cursor-pointer ${
                  scaleTab === 'SAVED'
                    ? 'bg-amber-950/60 text-amber-300 font-bold shadow-xs border border-amber-600/60'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="ブックマーク保存済み企業"
              >
                ★保存 ({savedCompanies.length})
              </button>
              <button
                type="button"
                onClick={() => handleScaleTabChange('ALL')}
                className={`py-1 text-center rounded transition-colors cursor-pointer ${
                  scaleTab === 'ALL'
                    ? 'bg-white/[0.15] text-white font-bold shadow-xs border border-white/[0.1]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="全件"
              >
                全件 ({companies.length})
              </button>
            </div>

            {/* ソートセレクター */}
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-0.5">
              <span>並び替え:</span>
              <select
                value={activeSort}
                onChange={(e) => onSelectSort(e.target.value as SortOrder)}
                className="bg-[#161B22] text-zinc-200 border border-white/[0.1] rounded px-1.5 py-0.5 text-[10px] font-medium focus:outline-none cursor-pointer"
              >
                <option value="REVENUE_DESC">売上が大きい順</option>
                <option value="MARGIN_DESC">利益率が高い順</option>
                <option value="TEAM_ASC">少人数・一人順</option>
                <option value="INVEST_ASC">初期投資が少ない順</option>
              </select>
            </div>
          </div>

          {/* 2. リストヘッダー */}
          <div className="px-3 py-1.5 bg-[#10141D] border-b border-white/[0.08] flex items-center justify-between text-[10px] text-zinc-500 font-mono font-medium">
            <span>企業名 / モデル</span>
            <span>収益規模</span>
          </div>

          {/* 3. 該当銘柄一覧リスト */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] text-xs">
            {displayedCompanies.map((company) => {
              const isSelected = company.id === selectedCompanyId;
              const latestFin = company.financials[company.financials.length - 1];

              const formatRevenueBadge = (rev: number, period: string) => {
                if (period.includes('初週') || period.includes('48時間')) return '48h ¥2,000万';
                if (company.isForSale && company.askingPriceJpy) return `売却 ¥${Math.round(company.askingPriceJpy / 10000)}万`;
                if (rev >= 1_000_000_000_000) return `年商 ¥${(rev / 1_000_000_000_000).toFixed(1)}兆`;
                if (rev >= 100_000_000) return `年商 ¥${Math.round(rev / 100_000_000)}億`;
                if (rev >= 10_000) return `月商 ¥${Math.round(rev / 10000)}万`;
                return `¥${rev}`;
              };

              const revenueLabel = latestFin ? formatRevenueBadge(latestFin.revenueJpy, latestFin.period) : '';

              const getTierCode = (tier: ScaleTier) => {
                switch (tier) {
                  case 'SOLO_MICRO': return company.teamSize === 1 ? '1人' : `${company.teamSize}人`;
                  case 'NICHE_LEADER': return 'ニッチ';
                  case 'SCALE_UP': return '急成長';
                  case 'MEGA_CORP': return '巨大独占';
                }
              };

              return (
                <div
                  key={company.id}
                  onClick={() => onSelectCompany(company.id)}
                  className={`px-3 py-2.5 cursor-pointer transition-colors border-l-2 flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-white/[0.08] border-emerald-400 text-white font-medium'
                      : 'hover:bg-white/[0.03] border-transparent text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <CompanyLogo id={company.id} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-zinc-400 border border-white/[0.06] shrink-0">
                          {getTierCode(company.scaleTier)}
                        </span>
                        <span className={`text-[8px] font-mono px-1 py-0.2 rounded shrink-0 ${
                          company.verifiedStatus === 'AUDITED_PUBLIC'
                            ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60'
                            : company.verifiedStatus === 'VERIFIED_STRIPE'
                            ? 'bg-blue-950/70 text-blue-400 border border-blue-800/60'
                            : 'bg-amber-950/70 text-amber-400 border border-amber-800/60'
                        }`}>
                          {company.verifiedStatus === 'AUDITED_PUBLIC' ? '有報' : company.verifiedStatus === 'VERIFIED_STRIPE' ? '決済' : '推計'}
                        </span>
                        <span className="text-xs font-bold truncate text-zinc-100">
                          {company.japaneseName}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {company.tagline}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {revenueLabel && (
                      <span className="text-[10px] font-mono font-bold text-emerald-400 tabular-nums px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 whitespace-nowrap">
                        {revenueLabel}
                      </span>
                    )}
                    <div className="w-10 h-3.5 opacity-75">
                      <SparklineChart trend="UP" width={40} height={14} color="#10B981" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
