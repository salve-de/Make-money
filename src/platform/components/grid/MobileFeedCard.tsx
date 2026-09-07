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
          <button
            onClick={onToggleBookmark}
            className="text-zinc-600 hover:text-zinc-300 p-0.5"
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-zinc-300 fill-zinc-300' : ''}`} />
          </button>
          <div className="text-right font-mono">
            <span className="text-white text-xs font-medium">
              {formatMoney(entity.pnl.monthlyRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* 2段目: 歪みの手口（タグライン） */}
      <p className="text-[11px] text-zinc-300 font-sans tracking-tight leading-snug line-clamp-2 mb-1.5">
        {entity.tagline}
      </p>

      {/* 3段目: 配管 & 人質スタック */}
      <div className="space-y-1 mb-1.5 text-[10px]">
        <div className="flex items-start gap-1.5 text-zinc-300 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.05]">
          <span className="text-zinc-500 text-[9px] shrink-0 font-mono mt-0.5">配管</span>
          <span className="font-mono line-clamp-1 break-all">{entity.pipelineStack}</span>
        </div>
        <div className="flex items-start gap-1.5 text-zinc-400 bg-white/[0.02] px-1.5 py-0.5 rounded border border-white/[0.04]">
          <span className="text-zinc-600 text-[9px] shrink-0 font-mono mt-0.5">人質</span>
          <span className="font-sans line-clamp-1 break-all">{entity.targetPainWallet}</span>
        </div>
      </div>

      {/* 4段目: 当該銘柄の特徴タグ（クリックで即時トグル・複数選択対応） */}
      {entity.tags && entity.tags.length > 0 && (
        <div 
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1.5 mb-1.5 border-t border-white/[0.04]"
          onClick={(e) => e.stopPropagation()}
        >
          {entity.tags.map((tag) => {
            const isActive = activeTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onToggleTag) onToggleTag(tag);
                }}
                title={`「#${tag}」で絞り込み（個別詳細は開きません）`}
                className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded transition-all shrink-0 cursor-pointer border ${
                  isActive
                    ? 'bg-emerald-500/25 text-emerald-300 font-semibold border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30'
                    : 'bg-zinc-900/90 text-zinc-300 active:bg-zinc-800 border-zinc-700/60 shadow-xs'
                }`}
              >
                <span className="text-zinc-500">#</span>
                <span>{tag}</span>
                {isActive && <span className="text-emerald-400 text-[10px] font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      )}

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
