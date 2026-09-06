'use client';

import React from 'react';
import { FinancialEntity } from '../../types/terminal';
import { ChevronRight, ShieldCheck, Bookmark } from 'lucide-react';

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
      className={`p-3 border-b border-white/[0.08] active:bg-white/[0.06] transition-colors cursor-pointer select-none ${
        isSelected ? 'bg-emerald-500/[0.08] border-l-2 border-l-emerald-400' : 'bg-[#090D14]'
      }`}
    >
      {/* 1段目: ティッカー/社名 & 月商 */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1 py-0.2 rounded shrink-0">
            {entity.ticker}
          </span>
          <span className="font-bold text-xs text-white truncate">
            {entity.name}
          </span>
          {entity.verifiedBadge && (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-mono">月商</span>
            <span className="text-xs font-mono font-bold text-white tabular-nums">
              {formatMoney(entity.pnl.monthlyRevenue)}
            </span>
          </div>
          <button
            onClick={onToggleBookmark}
            className="p-1 text-slate-400 hover:text-amber-400"
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-amber-400 fill-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2段目: 突いた業界の盲点 */}
      <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">
        <span className="text-amber-400/90 font-medium">【盲点】</span>
        {entity.strategy.blindspot}
      </p>

      {/* 3段目: 純利益・利益率・体制バッジ & 解剖導線 */}
      <div className="flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <div>
            <span className="text-slate-400 mr-1">手残り:</span>
            <span className="text-emerald-400 font-bold tabular-nums">
              {formatMoney(entity.pnl.operatingProfit)}/月
            </span>
          </div>
          <span className="text-emerald-300 bg-emerald-950/80 border border-emerald-800/50 px-1.5 py-0.2 rounded font-semibold tabular-nums">
            粗利 {entity.pnl.grossMargin}% / 営利 {entity.pnl.operatingMargin}%
          </span>
          <span className="text-slate-400 bg-white/[0.06] px-1.5 py-0.2 rounded">
            {entity.operations.teamSize === 1 ? '1人' : `${entity.operations.teamSize}人`}
          </span>
        </div>

        <div className="flex items-center text-emerald-400 text-[11px] font-medium shrink-0">
          <span>解剖</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
