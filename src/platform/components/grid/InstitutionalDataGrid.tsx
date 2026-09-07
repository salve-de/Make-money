'use client';

import React from 'react';
import { FinancialEntity } from '../../types/terminal';
import { MobileFeedCard } from './MobileFeedCard';
import { Bookmark } from 'lucide-react';

interface InstitutionalDataGridProps {
  entities: FinancialEntity[];
  selectedEntityId: string | null;
  onSelectEntity: (id: string) => void;
  currency: 'JPY' | 'USD';
  bookmarkedIds: Set<string>;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  isSplitView?: boolean;
  activeTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
}

export const InstitutionalDataGrid: React.FC<InstitutionalDataGridProps> = ({
  entities,
  selectedEntityId,
  onSelectEntity,
  currency,
  bookmarkedIds,
  onToggleBookmark,
  isSplitView = false,
  activeTag,
  onSelectTag,
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
    <div className="flex-1 overflow-y-auto bg-[#07080B] select-none">
      {/* 1. モバイル（390px以下）: 親指最適化フィード */}
      <div className="md:hidden divide-y divide-white/[0.05]">
        {entities.map((entity) => (
          <MobileFeedCard
            key={entity.id}
            entity={entity}
            isSelected={selectedEntityId === entity.id}
            onSelect={() => onSelectEntity(entity.id)}
            currency={currency}
            isBookmarked={bookmarkedIds.has(entity.id)}
            onToggleBookmark={(e) => onToggleBookmark(entity.id, e)}
            activeTag={activeTag}
            onSelectTag={onSelectTag}
          />
        ))}
        {entities.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-600 font-mono">
            該当する銘柄が見つかりません
          </div>
        )}
      </div>

      {/* 2. スプリット表示時（インスペクター展開時）または狭小PC: 厳選4カラム高密度表 */}
      <div className={`hidden md:block ${isSplitView ? 'block' : 'xl:hidden'} w-full`}>
        <table className="w-full table-fixed border-collapse text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#090A0D] text-zinc-500 text-[11px]">
              <th className="w-[66%] py-2 px-3 font-medium">銘柄 / 構造の型 ＆ 現場の配管</th>
              <th className="w-[20%] py-2 px-2 font-medium text-right">月商 / 実効純利</th>
              <th className="w-[14%] py-2 px-3 font-medium text-right">利益率 / 体制</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {entities.map((entity) => {
              const isSelected = selectedEntityId === entity.id;
              const isBookmarked = bookmarkedIds.has(entity.id);
              return (
                <tr
                  key={entity.id}
                  onClick={() => onSelectEntity(entity.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-white/[0.08] border-l-2 border-emerald-500'
                      : 'hover:bg-white/[0.02] border-l-2 border-transparent'
                  }`}
                >
                  {/* 社名・ティッカー・構造の型・配管・人質 */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <button
                        onClick={(e) => onToggleBookmark(entity.id, e)}
                        className="text-zinc-600 hover:text-zinc-300 shrink-0 mt-0.5"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-zinc-300 fill-zinc-300' : ''}`} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                            {entity.ticker}
                          </span>
                          <span className="font-medium text-xs text-white truncate font-sans">
                            {entity.name}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                            {entity.architecturePattern}
                          </span>
                        </div>
                        <div 
                          className="text-[11px] text-zinc-300 font-sans tracking-tight leading-snug mt-1 line-clamp-2"
                          title={entity.tagline}
                        >
                          {entity.tagline}
                        </div>
                        <div className="mt-1.5 space-y-1 text-[10px]">
                          <div className="flex items-start gap-1.5 text-zinc-300 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.05]" title={entity.pipelineStack}>
                            <span className="text-zinc-500 text-[9px] shrink-0 font-mono mt-0.5">配管</span>
                            <span className="font-mono line-clamp-1 break-all">{entity.pipelineStack}</span>
                          </div>
                          <div className="flex items-start gap-1.5 text-zinc-400 bg-white/[0.02] px-1.5 py-0.5 rounded border border-white/[0.04]" title={entity.targetPainWallet}>
                            <span className="text-zinc-600 text-[9px] shrink-0 font-mono mt-0.5">人質</span>
                            <span className="font-sans line-clamp-1 break-all">{entity.targetPainWallet}</span>
                          </div>
                        </div>

                        {/* 特徴タグ（横スクロール対応） */}
                        {entity.tags && entity.tags.length > 0 && (
                          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none mt-1.5 pt-0.5">
                            {entity.tags.map((tag) => {
                              const isActive = activeTag === tag;
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectTag) onSelectTag(isActive ? null : tag);
                                  }}
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded transition-colors shrink-0 border ${
                                    isActive
                                      ? 'bg-emerald-500/20 text-emerald-300 font-medium border-emerald-500/40 shadow-xs'
                                      : 'bg-white/[0.02] border-white/[0.05] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
                                  }`}
                                >
                                  #{tag}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 月商 / 実効純利益（上下2段組） */}
                  <td className="py-2.5 px-2 text-right tabular-nums align-middle">
                    <div className="text-white text-xs font-medium">
                      <span className="text-[9px] text-zinc-500 mr-1 font-mono">月</span>
                      {formatMoney(entity.pnl.monthlyRevenue)}
                    </div>
                    <div className="text-zinc-400 text-[10px] mt-0.5">
                      <span className="text-[9px] text-zinc-500 mr-1 font-mono">純</span>
                      {formatMoney(entity.pnl.operatingProfit)}
                    </div>
                  </td>

                  {/* 営業利益率 ＆ 体制 */}
                  <td className="py-2.5 px-3 text-right truncate align-middle tabular-nums">
                    <div className="text-emerald-400/90 font-medium text-xs">
                      {entity.pnl.operatingMargin}%
                    </div>
                    <div className="text-zinc-500 text-[10px] mt-0.5 font-sans">
                      {entity.operations.teamSize === 1 ? '完全1人' : `${entity.operations.teamSize}人`}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. ワイドPC全画面表示時（インスペクター非表示時）: 9カラム超高密度金融台帳 */}
      {!isSplitView && (
        <div className="hidden xl:block w-full">
        <table className="w-full table-fixed border-collapse text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#090A0D] text-zinc-500 text-[11px]">
              <th className="w-[22%] py-2 px-3 font-medium">銘柄 / 歪みの手口</th>
              <th className="w-[7%] py-2 px-2 font-medium">構造の型</th>
              <th className="w-[22%] py-2 px-2 font-medium">現場の配管 (スタック)</th>
              <th className="w-[24%] py-2 px-2 font-medium">人質にした財布・痛み</th>
              <th className="w-[12%] py-2 px-2 font-medium text-right">月商 / 実効純利</th>
              <th className="w-[7%] py-2 px-2 font-medium text-right">利益率 / 体制</th>
              <th className="w-[6%] py-2 px-2 font-medium text-right">初期資本</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {entities.map((entity) => {
              const isSelected = selectedEntityId === entity.id;
              const isBookmarked = bookmarkedIds.has(entity.id);
              return (
                <tr
                  key={entity.id}
                  onClick={() => onSelectEntity(entity.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-white/[0.08] border-l-2 border-emerald-500'
                      : 'hover:bg-white/[0.02] border-l-2 border-transparent'
                  }`}
                >
                  {/* ティッカー・銘柄・急所ワンライナー */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <button
                        onClick={(e) => onToggleBookmark(entity.id, e)}
                        className="text-zinc-600 hover:text-zinc-300 shrink-0 mt-0.5"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-zinc-300 fill-zinc-300' : ''}`} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                            {entity.ticker}
                          </span>
                          <span className="font-medium text-xs text-white truncate font-sans">
                            {entity.name}
                          </span>
                        </div>
                        <div 
                          className="text-[11px] text-zinc-400 font-sans tracking-tight leading-snug mt-1 line-clamp-2"
                          title={entity.tagline}
                        >
                          {entity.tagline}
                        </div>
                        {/* 特徴タグ（横スクロール対応） */}
                        {entity.tags && entity.tags.length > 0 && (
                          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none mt-1.5 pt-0.5">
                            {entity.tags.map((tag) => {
                              const isActive = activeTag === tag;
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectTag) onSelectTag(isActive ? null : tag);
                                  }}
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded transition-colors shrink-0 border ${
                                    isActive
                                      ? 'bg-emerald-500/20 text-emerald-300 font-medium border-emerald-500/40 shadow-xs'
                                      : 'bg-white/[0.02] border-white/[0.05] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
                                  }`}
                                >
                                  #{tag}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 構造の型 */}
                  <td className="py-2.5 px-2 align-middle">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block shrink-0" title={entity.architecturePattern}>
                      {entity.architecturePattern}
                    </span>
                  </td>

                  {/* 現場の配管 */}
                  <td className="py-2.5 px-2 align-middle font-mono text-[11px] text-zinc-300">
                    <div className="bg-white/[0.03] px-2 py-1 rounded border border-white/[0.05] line-clamp-2 leading-snug break-all" title={entity.pipelineStack}>
                      {entity.pipelineStack}
                    </div>
                  </td>

                  {/* 人質にした財布・痛み */}
                  <td className="py-2.5 px-2 align-middle text-[11px] text-zinc-300 font-sans">
                    <div className="bg-white/[0.02] px-2 py-1 rounded border border-white/[0.04] line-clamp-2 leading-snug break-all" title={entity.targetPainWallet}>
                      {entity.targetPainWallet}
                    </div>
                  </td>

                  {/* 月商 / 実効純利益（上下2段組） */}
                  <td className="py-2.5 px-2 text-right tabular-nums align-middle">
                    <div className="text-white text-xs font-medium">
                      <span className="text-[9px] text-zinc-500 mr-1 font-mono">月</span>
                      {formatMoney(entity.pnl.monthlyRevenue)}
                    </div>
                    <div className="text-zinc-400 text-[10px] mt-0.5">
                      <span className="text-[9px] text-zinc-500 mr-1 font-mono">純</span>
                      {formatMoney(entity.pnl.operatingProfit)}
                    </div>
                  </td>

                  {/* 利益率 / 体制（上下2段組） */}
                  <td className="py-2.5 px-2 text-right tabular-nums align-middle">
                    <div className="text-emerald-400/90 font-medium text-xs">
                      {entity.pnl.operatingMargin}%
                    </div>
                    <div className="text-zinc-500 text-[10px] mt-0.5 font-sans">
                      {entity.operations.teamSize === 1 ? '完全1人' : `${entity.operations.teamSize}人`}
                    </div>
                  </td>

                  {/* 初期投下資本 */}
                  <td className="py-2.5 px-2 text-right text-zinc-500 tabular-nums truncate align-middle">
                    {entity.operations.initialCapitalRequired === 0 ? '0円' : formatMoney(entity.operations.initialCapitalRequired)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
};
