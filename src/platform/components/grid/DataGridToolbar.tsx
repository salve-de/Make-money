'use client';

import React from 'react';
import { SlidersHorizontal, Search, X, Filter } from 'lucide-react';
import { GridFilterOption } from '../../types/terminal';
import { ScreenerFilterState } from '../screener/AdvancedScreenerModal';

interface DataGridToolbarProps {
  currentFilter: GridFilterOption;
  onSelectFilter: (filter: GridFilterOption) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalCount: number;
  onOpenScreener: () => void;
  screenerFilters?: ScreenerFilterState | null;
  onResetScreener?: () => void;
}

export const DataGridToolbar: React.FC<DataGridToolbarProps> = ({
  currentFilter,
  onSelectFilter,
  searchQuery,
  onSearchChange,
  totalCount,
  onOpenScreener,
  screenerFilters,
  onResetScreener,
}) => {
  const chips: { id: GridFilterOption; label: string }[] = [
    { id: 'ALL', label: '全件' },
    { id: 'SOLO', label: '1人' },
    { id: 'HIGH_MARGIN', label: '利益50%+' },
    { id: 'ZERO_CAPITAL', label: '初期0円' },
    { id: 'MONOPOLY', label: '独占' },
    { id: 'AI_NATIVE', label: 'AI' },
  ];

  // スクリーナーの適用条件数を計算
  const activeScreenerCount = React.useMemo(() => {
    if (!screenerFilters) return 0;
    let count = 0;
    if (screenerFilters.scales.length > 0) count += screenerFilters.scales.length;
    if (screenerFilters.minMargin > 0) count += 1;
    if (screenerFilters.maxCapital !== null) count += 1;
    if (screenerFilters.moats.length > 0) count += screenerFilters.moats.length;
    return count;
  }, [screenerFilters]);

  const hasActiveScreener = activeScreenerCount > 0;

  return (
    <div className="bg-[#08090C] border-b border-white/[0.06] p-2 space-y-1.5 select-none">
      {/* 上段: クイックフィルターチップス & 50軸スクリーニング統合バー */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 shrink-0 bg-white/[0.02] p-0.5 rounded border border-white/[0.04]">
          {chips.map((chip) => {
            const isActive = !hasActiveScreener && currentFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => {
                  if (onResetScreener) onResetScreener();
                  onSelectFilter(chip.id);
                }}
                className={`text-xs px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-white/[0.1] text-white font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* 50軸詳細スクリーニング（DB統合型） */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpenScreener}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors border ${
              hasActiveScreener
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-medium'
                : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] text-zinc-300 hover:text-white'
            }`}
            title="50軸の条件で詳細スクリーニング"
          >
            <SlidersHorizontal className={`w-3 h-3 ${hasActiveScreener ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>50軸スクリーニング</span>
            {hasActiveScreener && (
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 ml-0.5">
                {activeScreenerCount}
              </span>
            )}
          </button>

          {hasActiveScreener && onResetScreener && (
            <button
              onClick={onResetScreener}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors"
              title="スクリーナー条件を解除"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 下段: クイック検索 & 件数ステータス */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="台帳内を絞り込み..."
            className="w-full bg-[#050608] border border-white/[0.06] focus:border-white/[0.15] rounded pl-7 pr-6 py-0.5 text-zinc-200 placeholder-zinc-600 outline-none text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="font-mono text-zinc-500 text-[10px] shrink-0">
          <span className="text-zinc-300 font-medium tabular-nums">{totalCount}</span> 銘柄表示
        </div>
      </div>
    </div>
  );
};
