'use client';

import React from 'react';
import { Activity, Bookmark, Building2, Percent, SlidersHorizontal, Users, WalletCards } from 'lucide-react';

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
    { id: 'SOLO', label: '1人で運営', icon: <Users aria-hidden="true" className="h-3.5 w-3.5" /> },
    { id: 'HIGH_MARGIN', label: '利益率50%以上', icon: <Percent aria-hidden="true" className="h-3.5 w-3.5" /> },
    { id: 'LOW_CAPITAL', label: '初期資本5万円以下', icon: <WalletCards aria-hidden="true" className="h-3.5 w-3.5" /> },
    { id: 'GIANT', label: '大企業・上場企業', icon: <Building2 aria-hidden="true" className="h-3.5 w-3.5" /> },
    { id: 'AI_AUTO', label: 'AI・APIを活用', icon: <Activity aria-hidden="true" className="h-3.5 w-3.5" /> },
    { id: 'BOOKMARK', label: `保存済み (${bookmarkCount})`, icon: <Bookmark aria-hidden="true" className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex items-center justify-between gap-3 overflow-x-auto border-b border-white/[0.08] bg-[#10161f] px-3 py-2 font-sans select-none sm:px-5">
      {/* 水平スクロールチップス */}
      <div className="flex shrink-0 items-center gap-1.5">
        {presets.map((p) => {
          const isActive = activePreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPreset(p.id)}
              aria-pressed={isActive}
              className={`inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-sky-300/30 bg-sky-300/[0.08] text-sky-100'
                  : 'border-white/[0.1] bg-white/[0.025] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'
              }`}
            >
              {p.icon}
              {p.label}
            </button>
          );
        })}
      </div>

      {/* 右側：多条件スクリーナー起動ボタン */}
      <div className="flex shrink-0 items-center gap-2 border-l border-white/[0.08] pl-2">
        <button
          onClick={onOpenScreener}
          className={`flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${
            activeScreenerCount > 0
              ? 'border-sky-300/30 bg-sky-300/[0.08] text-sky-100'
              : 'border-white/[0.1] bg-white/[0.025] text-zinc-300 hover:bg-white/[0.06]'
          }`}
        >
          <SlidersHorizontal size={14} className={activeScreenerCount > 0 ? 'text-sky-200' : 'text-zinc-400'} />
          <span className="hidden xs:inline">条件を絞る</span>
          <span className="xs:hidden">絞り込み</span>
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
