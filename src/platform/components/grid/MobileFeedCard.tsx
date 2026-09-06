'use client';

import React from 'react';
import { FinancialEntity } from '../../types/terminal';
import { ChevronRight, Bookmark } from 'lucide-react';

interface MobileFeedCardProps {
  entity: FinancialEntity;
  isSelected: boolean;
  onSelect: () => void;
  currency: 'JPY' | 'USD';
  onToggleBookmark: (e: React.MouseEvent) => void;
  isBookmarked: boolean;
}

export const MobileFeedCard: React.FC<MobileFeedCardProps> = ({
  entity,
  isSelected,
  onSelect,
  currency,
  onToggleBookmark,
  isBookmarked,
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
        isSelected ? 'bg-white/[0.04]' : 'bg-[#07080B]'
      }`}
    >
      {/* 1段目: ティッカー/社名 & 月商 */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[11px] text-zinc-500 shrink-0">
            {entity.ticker}
          </span>
          <span className="font-medium text-xs text-white truncate font-sans">
            {entity.name}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 font-mono mr-1">月商</span>
            <span className="text-xs font-mono font-medium text-white tabular-nums">
              {formatMoney(entity.pnl.monthlyRevenue)}
            </span>
          </div>
          <button
            onClick={onToggleBookmark}
            className="p-1 text-zinc-600 hover:text-zinc-300"
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-zinc-300 fill-zinc-300' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2段目: 突いた業界の盲点 */}
      <p className="text-[11px] text-zinc-300 line-clamp-1 mb-1.5 font-sans">
        <span className="text-amber-400/90 font-medium">急所: </span>
        {entity.strategy.blindspot.replace(/^【(.*?)】.*/, '$1')}
      </p>

      {/* 3段目: 純利益・利益率・体制・解剖 */}
      <div className="flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-zinc-500 text-[10px] mr-1">純利</span>
            <span className="text-zinc-200 tabular-nums">
              {formatMoney(entity.pnl.operatingProfit)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] mr-1">営利</span>
            <span className="text-emerald-400/90 tabular-nums">
              {entity.pnl.operatingMargin}%
            </span>
          </div>
          <span className="text-zinc-500 text-[10px]">
            {entity.operations.teamSize === 1 ? '1人' : `${entity.operations.teamSize}人`}
          </span>
        </div>

        <div className="flex items-center text-zinc-500 text-[11px] shrink-0">
          <span>解剖</span>
          <ChevronRight className="w-3 h-3 text-zinc-600" />
        </div>
      </div>
    </div>
  );
};
