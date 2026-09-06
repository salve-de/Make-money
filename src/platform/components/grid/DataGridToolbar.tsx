'use client';

import React from 'react';
import { Download, SlidersHorizontal, Search, X } from 'lucide-react';
import { GridFilterOption } from '../../types/terminal';

interface DataGridToolbarProps {
  currentFilter: GridFilterOption;
  onSelectFilter: (filter: GridFilterOption) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalCount: number;
  onExportCsv: () => void;
  onOpenScreener: () => void;
}

export const DataGridToolbar: React.FC<DataGridToolbarProps> = ({
  currentFilter,
  onSelectFilter,
  searchQuery,
  onSearchChange,
  totalCount,
  onExportCsv,
  onOpenScreener,
}) => {
  const chips: { id: GridFilterOption; label: string }[] = [
    { id: 'ALL', label: '全件' },
    { id: 'SOLO', label: '完全1人' },
    { id: 'HIGH_MARGIN', label: '利益率50%+' },
    { id: 'ZERO_CAPITAL', label: '初期0円' },
    { id: 'MONOPOLY', label: '巨大独占' },
    { id: 'AI_NATIVE', label: 'AI自動化' },
  ];

  return (
    <div className="bg-[#08090C] border-b border-white/[0.06] p-2 space-y-1.5 select-none">
      {/* 上段: モノトーンセグメントチップス & アクション */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 shrink-0 bg-white/[0.02] p-0.5 rounded border border-white/[0.04]">
          {chips.map((chip) => {
            const isActive = currentFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => onSelectFilter(chip.id)}
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

        <div className="flex items-center gap-1.5 shrink-0">
          {/* 50軸詳細スクリーナー */}
          <button
            onClick={onOpenScreener}
            className="flex items-center gap-1.5 text-xs bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-zinc-300 px-2 py-1 rounded transition-colors"
          >
            <SlidersHorizontal className="w-3 h-3 text-zinc-400" />
            <span className="hidden sm:inline">50軸スクリーナー</span>
            <span className="sm:hidden">絞込</span>
          </button>

          {/* CSVエクスポート */}
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1 text-xs bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded transition-colors"
            title="CSV形式でダウンロード"
          >
            <Download className="w-3 h-3 text-zinc-500" />
            <span className="hidden sm:inline">CSV</span>
          </button>
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
