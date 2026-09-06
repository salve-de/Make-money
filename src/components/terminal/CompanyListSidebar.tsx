'use client';

import React, { useState } from 'react';
import { CompanyRecord, ScaleTier, TerminalFilterState } from '../../types/terminal';
import { DesirePreset, SortOrder } from './DesireFilterBar';
import { CompanyLogo } from './CompanyLogo';
import { SparklineChart } from './SparklineChart';
import { SlidersHorizontal, ChevronRight, X, Bookmark, Search } from 'lucide-react';

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
  const [scaleTab, setScaleTab] = useState<'ALL' | 'SOLO' | 'HIGH_MARGIN' | 'ZERO_INVEST' | 'MEGA' | 'SAVED'>('ALL');
  const [localSearch, setLocalSearch] = useState('');

  // 規模別および条件別のフィルタリング
  const displayedCompanies = companies.filter((c) => {
    // ローカル検索
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      const matchName = c.japaneseName.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
      const matchTag = c.tags.some(t => t.toLowerCase().includes(q));
      const matchModel = c.businessModel.toLowerCase().includes(q);
      if (!matchName && !matchTag && !matchModel) return false;
    }

    if (scaleTab === 'SOLO') {
      return c.teamSize === 1;
    }
    if (scaleTab === 'HIGH_MARGIN') {
      const fin = c.financials[c.financials.length - 1];
      return (fin?.operatingMarginPercent || 0) >= 50;
    }
    if (scaleTab === 'ZERO_INVEST') {
      return c.initialInvestmentJpy <= 50000;
    }
    if (scaleTab === 'MEGA') {
      return c.scaleTier === 'MEGA_CORP' || c.tags.includes('巨大独占');
    }
    if (scaleTab === 'SAVED') {
      return bookmarkedIds.includes(c.id);
    }
    return true;
  });

  return (
    <div className={`${isCollapsed ? 'w-10' : 'w-72 lg:w-80'} bg-[#0D1117] border-r border-white/[0.08] flex flex-col shrink-0 select-none overflow-hidden font-sans transition-[width] duration-150`}>
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
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-zinc-300 font-bold uppercase tracking-wider">
                  DIRECTORY
                </span>
                <span className="font-mono text-[10px] text-emerald-400 font-bold bg-emerald-950/70 px-1.5 py-0.2 rounded border border-emerald-800/60">
                  {displayedCompanies.length}/{totalCount}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpenScreener}
                  className={`h-6 px-2 rounded border text-[10px] font-mono font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                    hasActiveFilters
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                      : 'bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:text-white hover:bg-white/[0.08]'
                  }`}
                  title="50軸の複合条件で絞り込む"
                >
                  <SlidersHorizontal size={10} />
                  <span>50軸</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  className="h-6 w-6 flex items-center justify-center rounded border border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  title="サイドバーを閉じる"
                >
                  ‹
                </button>
              </div>
            </div>

            {/* インラインクイック検索 */}
            <div className="relative">
              <Search size={11} className="absolute left-2 top-2 text-zinc-500" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="銘柄・モデル・タグ検索..."
                className="w-full bg-[#090C10] border border-white/[0.08] rounded pl-6 pr-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-white/[0.2] font-mono"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch('')}
                  className="absolute right-1.5 top-1.5 text-zinc-500 hover:text-zinc-300"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* 常設クイックファセットボタン（1クリック即時絞り込み） */}
            <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setScaleTab('ALL')}
                className={`py-1 px-1 text-center rounded border transition-colors cursor-pointer ${
                  scaleTab === 'ALL'
                    ? 'bg-white/[0.12] text-white font-bold border-white/[0.2]'
                    : 'bg-white/[0.02] text-zinc-400 border-white/[0.04] hover:text-zinc-200'
                }`}
              >
                全件 ({companies.length})
              </button>
              <button
                type="button"
                onClick={() => setScaleTab('SOLO')}
                className={`py-1 px-1 text-center rounded border transition-colors cursor-pointer ${
                  scaleTab === 'SOLO'
                    ? 'bg-emerald-950/80 text-emerald-300 font-bold border-emerald-800/60'
                    : 'bg-white/[0.02] text-zinc-400 border-white/[0.04] hover:text-zinc-200'
                }`}
              >
                1人限定
              </button>
              <button
                type="button"
                onClick={() => setScaleTab('HIGH_MARGIN')}
                className={`py-1 px-1 text-center rounded border transition-colors cursor-pointer ${
                  scaleTab === 'HIGH_MARGIN'
                    ? 'bg-emerald-950/80 text-emerald-300 font-bold border-emerald-800/60'
                    : 'bg-white/[0.02] text-zinc-400 border-white/[0.04] hover:text-zinc-200'
                }`}
              >
                利益50%+
              </button>
              <button
                type="button"
                onClick={() => setScaleTab('ZERO_INVEST')}
                className={`py-1 px-1 text-center rounded border transition-colors cursor-pointer ${
                  scaleTab === 'ZERO_INVEST'
                    ? 'bg-white/[0.12] text-white font-bold border-white/[0.2]'
                    : 'bg-white/[0.02] text-zinc-400 border-white/[0.04] hover:text-zinc-200'
                }`}
              >
                資本0円
              </button>
              <button
                type="button"
                onClick={() => setScaleTab('MEGA')}
                className={`py-1 px-1 text-center rounded border transition-colors cursor-pointer ${
                  scaleTab === 'MEGA'
                    ? 'bg-white/[0.12] text-white font-bold border-white/[0.2]'
                    : 'bg-white/[0.02] text-zinc-400 border-white/[0.04] hover:text-zinc-200'
                }`}
              >
                巨大独占
              </button>
              <button
                type="button"
                onClick={() => setScaleTab('SAVED')}
                className={`py-1 px-1 text-center rounded border transition-colors cursor-pointer ${
                  scaleTab === 'SAVED'
                    ? 'bg-amber-950/70 text-amber-300 font-bold border-amber-800/60'
                    : 'bg-white/[0.02] text-zinc-400 border-white/[0.04] hover:text-zinc-200'
                }`}
              >
                ★保存 ({bookmarkedIds.length})
              </button>
            </div>
          </div>

          {/* 2. リストヘッダー ＆ キーボードヒント */}
          <div className="px-3 py-1 bg-[#10141D] border-b border-white/[0.08] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span>銘柄 / モデル</span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-600 font-sans">移動: [J/K]</span>
              <span>収益規模</span>
            </div>
          </div>

          {/* 3. 該当銘柄一覧リスト（Linear風 高密度行） */}
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

              return (
                <div
                  key={company.id}
                  onClick={() => onSelectCompany(company.id)}
                  className={`px-3 py-2 cursor-pointer transition-colors border-l-2 flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-white/[0.08] border-emerald-400 text-white font-medium'
                      : 'hover:bg-white/[0.03] border-transparent text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <CompanyLogo id={company.id} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-zinc-400 border border-white/[0.06] shrink-0">
                          {company.teamSize === 1 ? '1人' : company.scaleTier === 'MEGA_CORP' ? '独占' : `${company.teamSize}人`}
                        </span>
                        <span className="text-xs font-bold truncate text-zinc-100">
                          {company.japaneseName}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate mt-0.5">
                        {company.tagline}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-0.5">
                    {revenueLabel && (
                      <span className="text-[10px] font-mono font-bold text-emerald-400 tabular-nums px-1 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/60 whitespace-nowrap">
                        {revenueLabel}
                      </span>
                    )}
                    <div className="w-9 h-3 opacity-75">
                      <SparklineChart trend="UP" width={36} height={12} color="#10B981" />
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
