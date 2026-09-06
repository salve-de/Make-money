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
    { id: 'SOLO', label: '完全1人 (ソロ)' },
    { id: 'HIGH_MARGIN', label: '利益率50%超' },
    { id: 'ZERO_CAPITAL', label: '初期0円' },
    { id: 'MONOPOLY', label: '巨大独占' },
    { id: 'AI_NATIVE', label: 'AI・推論' },
  ];

  return (
    <div className="bg-[#0B0F17] border-b border-white/[0.08] p-2.5 space-y-2 select-none">
      {/* 上段: ファセットチップス & アクション */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 shrink-0">
          {chips.map((chip) => {
            const isActive = currentFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => onSelectFilter(chip.id)}
                className={`text-xs px-2.5 py-1 rounded transition-colors whitespace-nowrap font-medium ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] border border-white/[0.06]'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* 50軸詳細スクリーナー */}
          <button
            onClick={onOpenScreener}
            className="flex items-center gap-1.5 text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 px-2.5 py-1 rounded transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">50軸スクリーナー</span>
            <span className="sm:hidden">絞込</span>
          </button>

          {/* CSVエクスポート */}
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 px-2.5 py-1 rounded transition-colors"
            title="CSV形式でダウンロード"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">CSV出力</span>
          </button>
        </div>
      </div>

      {/* 下段: クイック検索 & 件数ステータス */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="台帳内をインクリメンタル絞り込み..."
            className="w-full bg-[#070A0F] border border-white/[0.08] focus:border-emerald-500/50 rounded pl-8 pr-7 py-1 text-slate-200 placeholder-slate-400 outline-none text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="font-mono text-slate-400 text-[11px] shrink-0">
          MATCHED: <span className="text-emerald-400 font-bold tabular-nums">{totalCount}</span> ENTITIES
        </div>
      </div>
    </div>
  );
};
