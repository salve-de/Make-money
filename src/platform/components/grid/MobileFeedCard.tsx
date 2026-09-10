'use client';

import React from 'react';
import { FinancialEntity } from '../../types/terminal';
import { Bookmark } from 'lucide-react';

interface MobileFeedCardProps {
  entity: FinancialEntity;
  isSelected: boolean;
  onSelect: () => void;
  currency: 'JPY' | 'USD';
  onToggleBookmark: (e: React.MouseEvent) => void;
  isBookmarked: boolean;
  activeTags?: string[];
  onToggleTag?: (tag: string | null) => void;
}

export const MobileFeedCard: React.FC<MobileFeedCardProps> = ({
  entity,
  isSelected,
  onSelect,
  currency,
  onToggleBookmark,
  isBookmarked,
  activeTags = [],
  onToggleTag,
}) => {
  const formatMoney = (yen: number) => {
    if (currency === 'USD') {
      const usd = Math.round(yen / 150);
      if (usd >= 1000000) return `$${(usd / 1000000).toFixed(1)}M`;
      if (usd >= 1000) return `$${(usd / 1000).toFixed(0)}k`;
      return `$${usd}`;
    }
    if (yen >= 100000000) return `¥${(yen / 100000000).toFixed(1)}億`;
    if (yen >= 10000) return `¥${Math.round(yen / 10000)}万`;
    return `¥${yen.toLocaleString()}`;
  };

  return (
    <div
      onClick={onSelect}
      className={`p-3 border-b border-white/[0.05] active:bg-white/[0.04] transition-colors cursor-pointer select-none ${
        isSelected ? 'bg-white/[0.06] border-l-2 border-emerald-500' : 'bg-[#07080B]'
      }`}
    >
      {/* 1段目: ティッカー/社名/型 & 月商 */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className="font-medium text-xs text-white truncate font-sans shrink min-w-0">
            {entity.name}
          </span>
          <span 
            className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 max-w-[85px] truncate"
            title={entity.architecturePattern}
          >
            {entity.architecturePattern}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleBookmark}
            className="text-zinc-600 hover:text-zinc-300 p-0.5"
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-zinc-300 fill-zinc-300' : ''}`} />
          </button>
          <div className="text-right font-mono">
            {entity.pnl.isRevenueUnconfirmed ? (
              <span className="text-zinc-500 text-[10px] font-normal">
                {entity.pnl.revenueLabel || '非公開'}
              </span>
            ) : (
              <span className="text-white text-xs font-medium">
                {formatMoney(entity.pnl.monthlyRevenue)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2段目: 歪みの手口（1行スニペット） */}
      <p className="text-[11px] text-zinc-400 font-sans tracking-tight leading-snug line-clamp-1 truncate mb-2">
        {entity.tagline}
      </p>

      {/* 3段目: 純利益・利益率・体制 */}
      <div className="flex items-center justify-between text-[11px] font-mono pt-1.5 border-t border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-zinc-500 text-[10px] mr-1">純利</span>
            <span className="text-zinc-200 tabular-nums font-medium">
              {entity.pnl.isRevenueUnconfirmed || entity.pnl.isMarginUnconfirmed ? '--' : formatMoney(entity.pnl.operatingProfit)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] mr-1">営利</span>
            <span className="text-emerald-400 font-medium tabular-nums">
              {entity.pnl.isRevenueUnconfirmed || entity.pnl.isMarginUnconfirmed ? '--%' : `${entity.pnl.operatingMargin}%`}
            </span>
          </div>
        </div>
        <span className="text-zinc-500 text-[10px] font-sans">
          {entity.operations.teamSize === 1 ? '完全1人' : `${entity.operations.teamSize}人`}
        </span>
      </div>
    </div>
  );
};
