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
        isSelected ? 'bg-white/[0.06] border-l-2 border-emerald-500' : 'bg-[#07080B]'
      }`}
    >
      {/* 1段目: ティッカー/社名/型 & 月商 */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className="font-mono text-[10px] text-zinc-500 shrink-0">
            {entity.ticker}
          </span>
          <span className="font-medium text-xs text-white truncate font-sans">
            {entity.name}
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            {entity.architecturePattern}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <span className="text-[9px] text-zinc-500 font-mono mr-1">月商</span>
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

      {/* 2段目: 歪みの手口（キラー・ワンライナー） */}
      <p className="text-[11px] text-zinc-300 line-clamp-2 mb-1.5 font-sans tracking-tight leading-snug" title={entity.tagline}>
        {entity.tagline}
      </p>

      {/* 3段目: 現場の配管 ＆ 人質にした財布 */}
      <div className="space-y-1 text-[10px] mb-2">
        <div className="flex items-start gap-1.5 text-zinc-300 bg-white/[0.03] px-2 py-1 rounded border border-white/[0.05]" title={entity.pipelineStack}>
          <span className="text-zinc-500 text-[9px] shrink-0 font-mono mt-0.5">配管</span>
          <span className="font-mono line-clamp-1 break-all">{entity.pipelineStack}</span>
        </div>
        <div className="flex items-start gap-1.5 text-zinc-400 bg-white/[0.02] px-2 py-1 rounded border border-white/[0.04]" title={entity.targetPainWallet}>
          <span className="text-zinc-600 text-[9px] shrink-0 font-mono mt-0.5">人質</span>
          <span className="font-sans line-clamp-1 break-all">{entity.targetPainWallet}</span>
        </div>
      </div>

      {/* 4段目: 純利益・利益率・体制 */}
      <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-white/[0.03]">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-zinc-500 text-[10px] mr-1">純利</span>
            <span className="text-zinc-200 tabular-nums font-medium">
              {formatMoney(entity.pnl.operatingProfit)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] mr-1">営利</span>
            <span className="text-emerald-400/90 tabular-nums font-medium">
              {entity.pnl.operatingMargin}%
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
