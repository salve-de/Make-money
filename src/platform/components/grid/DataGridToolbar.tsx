'use client';

import React from 'react';
import { SlidersHorizontal, Search, X } from 'lucide-react';
import { ScreenerFilterState } from '../screener/AdvancedScreenerModal';

interface DataGridToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalCount: number;
  onOpenScreener: () => void;
  screenerFilters?: ScreenerFilterState | null;
  onResetScreener?: () => void;
  activeTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
}

export const DataGridToolbar: React.FC<DataGridToolbarProps> = ({
  searchQuery,
  onSearchChange,
  totalCount,
  onOpenScreener,
  screenerFilters,
  onResetScreener,
  activeTag,
  onSelectTag,
}) => {
  // スクリーナーの適用条件数を計算
  const activeScreenerCount = React.useMemo(() => {
    if (!screenerFilters) return 0;
    let count = 0;
    if (screenerFilters.scales.length > 0) count += screenerFilters.scales.length;
    if (screenerFilters.minMargin > 0) count += 1;
    if (screenerFilters.maxCapital !== null) count += 1;
    if (screenerFilters.moats.length > 0) count += screenerFilters.moats.length;
    if (screenerFilters.selectedTags && screenerFilters.selectedTags.length > 0) count += screenerFilters.selectedTags.length;
    return count;
  }, [screenerFilters]);

  const hasActiveScreener = activeScreenerCount > 0;

  return (
    <div className="bg-[#08090C] border-b border-white/[0.06] px-3 py-2 select-none">
      <div className="flex items-center gap-2 text-xs">
        {/* 1. 50軸詳細スクリーニングボタン（左端固定：インスペクター開閉時も位置が1ミリもブレない） */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpenScreener}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors border cursor-pointer ${
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
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors cursor-pointer"
              title="スクリーナー条件を解除"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 2. 検索窓（スクリーナーボタンの直後に固定配置、残余幅に合わせて伸縮） */}
        <div className="relative flex-1 min-w-[140px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="銘柄名・手口・タグ・裏帳簿を検索..."
            className="w-full bg-[#050608] border border-white/[0.06] focus:border-white/[0.15] rounded pl-8 pr-12 py-1 text-zinc-200 placeholder-zinc-600 outline-none text-xs transition-colors"
          />
          {!searchQuery ? (
            <kbd className="hidden sm:inline-flex items-center absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-white/[0.04] border border-white/[0.06] px-1 rounded text-zinc-500 font-mono pointer-events-none">
              ⌘K
            </kbd>
          ) : (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 3. 右側: 選択中タグ解除バッジ & 件数表示 */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* 選択中タグ表示バッジ (ワンクリック解除可能) */}
          {activeTag && onSelectTag && (
            <button
              onClick={() => onSelectTag(null)}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              title="タグ絞り込みを解除"
            >
              <span>#{activeTag}</span>
              <X className="w-3 h-3 text-emerald-400" />
            </button>
          )}

          {/* 件数表示 */}
          <div className="font-mono text-zinc-500 text-[11px] pl-1 border-l border-white/[0.06]">
            <span className="text-zinc-200 font-medium tabular-nums">{totalCount}</span> 件
          </div>
        </div>
      </div>
    </div>
  );
};
