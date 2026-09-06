'use client';

import React, { useState } from 'react';
import { CompanyRecord, ScaleTier, TerminalFilterState } from '../../types/terminal';
import { SortOrder } from './DesireFilterBar';
import { CompanyLogo } from './CompanyLogo';
import { SparklineChart } from './SparklineChart';
import { SlidersHorizontal } from 'lucide-react';
import { AuditStatusBadge } from './AuditStatusBadge';

interface CompanyListSidebarProps {
  companies: CompanyRecord[];
  totalCount: number;
  selectedCompanyId: string;
  onSelectCompany: (id: string) => void;
  activeSort: SortOrder;
  onSelectSort: (sort: SortOrder) => void;
  onOpenScreener: () => void;
  hasActiveFilters: boolean;
  filter: TerminalFilterState;
  onRemoveFilter: (key: keyof TerminalFilterState) => void;
  onResetAll: () => void;
}

export const CompanyListSidebar: React.FC<CompanyListSidebarProps> = ({
  companies,
  totalCount,
  selectedCompanyId,
  onSelectCompany,
  activeSort,
  onSelectSort,
  onOpenScreener,
  hasActiveFilters,
  filter,
  onRemoveFilter,
  onResetAll
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scaleTab, setScaleTab] = useState<'ALL' | 'SOLO_SMALL' | 'MEGA_CORP'>('ALL');

  const filterLabels: Partial<Record<keyof TerminalFilterState, string>> = {
    keyword: '検索語',
    desireCategory: '欲望',
    workStyle: '働き方',
    ambitionScale: '規模',
    margin: '利益率',
    capital: '元手',
    businessModelCategory: 'モデル',
    moat: '堀',
    acquisitionChannel: '集客',
  };

  const activeFilterEntries = (Object.entries(filter) as Array<[keyof TerminalFilterState, string]>)
    .filter(([key, value]) => key !== 'sortBy' && value !== 'ALL' && value !== '');

  // 規模別の件数計算
  const soloSmallCompanies = companies.filter(
    (c) => c.teamSize <= 5 || c.scaleTier === 'SOLO_MICRO' || c.scaleTier === 'NICHE_LEADER'
  );
  const megaCorpCompanies = companies.filter(
    (c) => c.scaleTier === 'MEGA_CORP' || c.tags.includes('巨大独占')
  );

  // 規模タブ適用後の表示リスト
  const displayedCompanies = companies.filter((c) => {
    if (scaleTab === 'SOLO_SMALL') {
      return c.teamSize <= 5 || c.scaleTier === 'SOLO_MICRO' || c.scaleTier === 'NICHE_LEADER';
    }
    if (scaleTab === 'MEGA_CORP') {
      return c.scaleTier === 'MEGA_CORP' || c.tags.includes('巨大独占');
    }
    return true;
  });

  const handleScaleTabChange = (newTab: 'ALL' | 'SOLO_SMALL' | 'MEGA_CORP') => {
    setScaleTab(newTab);
    if (newTab === 'MEGA_CORP' && megaCorpCompanies.length > 0) {
      const alreadyMega = megaCorpCompanies.some((c) => c.id === selectedCompanyId);
      if (!alreadyMega) onSelectCompany(megaCorpCompanies[0].id);
    } else if (newTab === 'SOLO_SMALL' && soloSmallCompanies.length > 0) {
      const alreadySolo = soloSmallCompanies.some((c) => c.id === selectedCompanyId);
      if (!alreadySolo) onSelectCompany(soloSmallCompanies[0].id);
    }
  };

  return (
    <div className={`${isCollapsed ? 'w-10' : 'w-84 lg:w-92'} bg-white border-r border-slate-200 flex flex-col shrink-0 select-none overflow-hidden font-sans transition-[width] duration-200`}>
      {isCollapsed ? (
        <div className="flex h-full flex-col items-center bg-slate-50 py-3 border-r border-slate-200">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-xs leading-none text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            aria-label="候補一覧を開く"
          >
            ›
          </button>
          <span className="mt-4 text-[10px] font-mono tracking-widest text-slate-400 [writing-mode:vertical-rl]">
            DIRECTORY
          </span>
        </div>
      ) : (
        <>
          {/* 1. スクリーナー頭部 */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                DIRECTORY ({displayedCompanies.length}/{totalCount})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpenScreener}
                  className={`h-6 px-2 rounded border text-[10px] font-mono font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                    hasActiveFilters
                      ? 'bg-slate-950 text-white border-slate-950 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  <SlidersHorizontal size={10} />
                  <span>50軸条件</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-400 hover:text-slate-800 cursor-pointer"
                  title="サイドバーを閉じる"
                >
                  ‹
                </button>
              </div>
            </div>

            {/* 3分割セグメント（個人・少人数 / 独占大企業 / 全件） */}
            <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-0.5 rounded text-[11px] font-mono">
              <button
                type="button"
                onClick={() => handleScaleTabChange('SOLO_SMALL')}
                className={`py-1 text-center rounded transition-colors cursor-pointer ${
                  scaleTab === 'SOLO_SMALL'
                    ? 'bg-white text-slate-950 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                個人・少人数 ({soloSmallCompanies.length})
              </button>
              <button
                type="button"
                onClick={() => handleScaleTabChange('MEGA_CORP')}
                className={`py-1 text-center rounded transition-colors cursor-pointer ${
                  scaleTab === 'MEGA_CORP'
                    ? 'bg-white text-slate-950 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                大企業独占 ({megaCorpCompanies.length})
              </button>
              <button
                type="button"
                onClick={() => handleScaleTabChange('ALL')}
                className={`py-1 text-center rounded transition-colors cursor-pointer ${
                  scaleTab === 'ALL'
                    ? 'bg-white text-slate-950 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                全件 ({companies.length})
              </button>
            </div>

            {/* ソートセレクター */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5">
              <span>並び替え:</span>
              <select
                value={activeSort}
                onChange={(e) => onSelectSort(e.target.value as SortOrder)}
                className="bg-white text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-medium focus:outline-none cursor-pointer"
              >
                <option value="REVENUE_DESC">売上が大きい順</option>
                <option value="MARGIN_DESC">利益率が高い順</option>
                <option value="TEAM_ASC">少人数・一人順</option>
                <option value="INVEST_ASC">初期投資が少ない順</option>
              </select>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-1 border-t border-slate-200 pt-2">
                {activeFilterEntries.map(([key, value]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => onRemoveFilter(key)}
                    className="inline-flex max-w-full items-center gap-1 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 hover:border-slate-950 hover:text-slate-950"
                    aria-label={`${filterLabels[key] ?? key}の条件を解除`}
                  >
                    <span className="truncate">{filterLabels[key] ?? key}: {value}</span>
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onResetAll}
                  className="ml-auto text-[10px] font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-950"
                >
                  全解除
                </button>
              </div>
            )}
          </div>

          {/* 2. リストヘッダー */}
          <div className="px-3 py-1.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono font-medium">
            <span>企業名 / モデル</span>
            <span>収益規模</span>
          </div>

          {/* 3. 該当銘柄一覧リスト */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
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
                <button
                  type="button"
                  key={company.id}
                  onClick={() => onSelectCompany(company.id)}
                  aria-pressed={isSelected}
                  className={`w-full text-left px-3 py-2.5 cursor-pointer transition-colors border-l-3 flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-slate-100 border-slate-950 text-slate-950 font-medium'
                      : 'hover:bg-slate-50 border-transparent text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <CompanyLogo id={company.id} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                          {getTierCode(company.scaleTier)}
                        </span>
                        <AuditStatusBadge status={company.verifiedStatus} compact />
                        <span className="text-xs font-bold truncate text-slate-950">
                          {company.japaneseName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {company.tagline}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {revenueLabel && (
                      <span className="text-[10px] font-mono font-bold text-emerald-700 tabular-nums px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200/80 whitespace-nowrap">
                        {revenueLabel}
                      </span>
                    )}
                    <div className="w-10 h-3.5 opacity-75">
                      <SparklineChart trend="UP" width={40} height={14} color="#10B981" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
