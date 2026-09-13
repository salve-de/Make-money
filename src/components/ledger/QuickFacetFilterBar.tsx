'use client';

import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

export type LedgerQuickPreset = 'ALL' | 'SOLO' | 'HIGH_MARGIN' | 'LOW_CAPITAL' | 'GIANT' | 'AI_AUTO' | 'BOOKMARK';

interface QuickFacetFilterBarProps {
  activePreset: LedgerQuickPreset;
  onSelectPreset: (preset: LedgerQuickPreset) => void;
  totalCount: number;
  filteredCount: number;
  bookmarkCount: number;
  onOpenScreener: () => void;
  activeScreenerCount: number;
}

export const QuickFacetFilterBar: React.FC<QuickFacetFilterBarProps> = ({
  activePreset,
  onSelectPreset,
  totalCount,
  bookmarkCount,
  onOpenScreener,
  activeScreenerCount
}) => {
  const presets: { id: LedgerQuickPreset; label: string; icon?: React.ReactNode }[] = [
    { id: 'ALL', label: `全件 (${totalCount})` },
    { id: 'SOLO', label: '⚡ 完全1人 (億超え)' },
    { id: 'HIGH_MARGIN', label: '📈 営業利益率 50%超' },
    { id: 'LOW_CAPITAL', label: '💰 初期資本 0円〜5万' },
    { id: 'GIANT', label: '🛡️ 巨大独占 (有報検証)' },
    { id: 'AI_AUTO', label: '🤖 AI・API自動化' },
    { id: 'BOOKMARK', label: `★ 保存済み (${bookmarkCount})` },
  ];

  return (
    <div className="bg-[#0B0E14] border-b border-white/[0.08] px-3 sm:px-5 py-2 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar select-none font-sans">
      {/* 水平スクロールチップス */}
      <div className="flex items-center gap-1.5 shrink-0">
        {presets.map((p) => {
          const isActive = activePreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/50 shadow-xs'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] border-white/[0.06]'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* 右側：50軸スクリーナー起動ボタン */}
      <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-white/[0.08]">
        <button
          onClick={onOpenScreener}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer border ${
            activeScreenerCount > 0
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/[0.08]'
          }`}
        >
          <SlidersHorizontal size={12} className={activeScreenerCount > 0 ? 'text-emerald-400' : 'text-zinc-400'} />
          <span className="hidden xs:inline">50軸スクリーナー</span>
          <span className="xs:hidden">詳細絞込</span>
          {activeScreenerCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-zinc-950 font-mono text-[10px] font-bold flex items-center justify-center">
              {activeScreenerCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
