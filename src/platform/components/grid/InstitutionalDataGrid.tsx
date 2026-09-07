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
  activeTags?: string[];
  onToggleTag?: (tag: string | null) => void;
}

export const InstitutionalDataGrid: React.FC<InstitutionalDataGridProps> = ({
  entities,
  selectedEntityId,
  onSelectEntity,
  currency,
  bookmarkedIds,
  onToggleBookmark,
  isSplitView = false,
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
            activeTags={activeTags}
            onToggleTag={onToggleTag}
          />
        ))}
        {entities.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-600 font-mono">
            該当する銘柄が見つかりません
          </div>
        )}
      </div>

      {/* 2. スプリット表示時（インスペクター展開時）または狭小PC: 【黄金の2段組（Two-Line Weapon）】 */}
      <div className={`hidden md:block ${isSplitView ? 'block' : 'xl:hidden'} w-full`}>
        <table className="w-full table-fixed border-collapse text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#090A0D] text-zinc-500 text-[11px]">
              <th className="w-[74%] py-2 px-3 font-medium">銘柄 / 歪みの手口</th>
              <th className="w-[26%] py-2 px-3 font-medium text-right">月商 / 利益</th>
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
                  {/* 左: 2段組（上段: ティッカー・社名・型 / 下段: 歪みの手口1行） */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <button
                        onClick={(e) => onToggleBookmark(entity.id, e)}
                        className="text-zinc-600 hover:text-zinc-300 shrink-0 mt-0.5"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-zinc-300 fill-zinc-300' : ''}`} />
                      </button>
                      <div className="min-w-0 flex-1">
                        {/* 1段目: 社名 + 型バッジ */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-xs text-white truncate font-sans">
                            {entity.name}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                            {entity.architecturePattern}
                          </span>
                        </div>
                        {/* 2段目: 歪みの手口（1行スニペット） */}
                        <div 
                          className="text-[11px] text-zinc-400 font-sans tracking-tight leading-snug mt-1 line-clamp-1 truncate"
                          title={entity.tagline}
                        >
                          {entity.tagline}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 右: 2段組（上段: 月商 / 下段: 純利 + 利益率） */}
                  <td className="py-2.5 px-3 text-right tabular-nums align-middle">
                    {/* 1段目: 月商 */}
                    <div className="text-white text-xs font-semibold">
                      {formatMoney(entity.pnl.monthlyRevenue)}
                    </div>
                    {/* 2段目: 純利 + 利益率 */}
                    <div className="flex items-center justify-end gap-1.5 text-[10px] mt-0.5">
                      <span className="text-zinc-400">
                        {formatMoney(entity.pnl.operatingProfit)}
                      </span>
                      <span className="text-emerald-400 font-medium">
                        ({entity.pnl.operatingMargin}%)
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. ワイドPC全画面表示時（インスペクター非表示時）: 【Bloomberg型 純化スプレッドシート（文字切れゼロ・完全水平垂直整列）】 */}
      {!isSplitView && (
        <div className="hidden xl:block w-full">
          <table className="w-full table-fixed border-collapse text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#090A0D] text-zinc-500 text-[11px] h-9">
                <th className="w-[20%] py-2.5 px-3 font-medium">銘柄名</th>
                <th className="w-[10%] py-2.5 px-2 font-medium">構造の型</th>
                <th className="w-[42%] py-2.5 px-3 font-medium">歪みの手口（急所ワンライナー）</th>
                <th className="w-[11%] py-2.5 px-3 font-medium text-right">月商</th>
                <th className="w-[11%] py-2.5 px-3 font-medium text-right">実効純利 (率)</th>
                <th className="w-[6%] py-2.5 px-3 font-medium text-right">体制</th>
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
                    className={`cursor-pointer transition-colors h-12 group ${
                      isSelected
                        ? 'bg-white/[0.08] border-l-2 border-emerald-500'
                        : 'hover:bg-white/[0.03] border-l-2 border-transparent'
                    }`}
                  >
                    {/* 1. 銘柄名・サービス名（絶対に省略されない20%幅） */}
                    <td className="py-2.5 px-3 align-middle">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={(e) => onToggleBookmark(entity.id, e)}
                          className="text-zinc-600 hover:text-zinc-300 shrink-0 cursor-pointer"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-zinc-300 fill-zinc-300' : ''}`} />
                        </button>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-xs text-white truncate font-sans group-hover:text-emerald-300 transition-colors">
                            {entity.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. 構造の型（バッジが窮屈にならず綺麗に収まる10%幅） */}
                    <td className="py-2.5 px-2 align-middle">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block shrink-0">
                        {entity.architecturePattern}
                      </span>
                    </td>

                    {/* 3. 歪みの手口（42%の広大な幅を与え、省略なしで読ませる急所ワンライナー） */}
                    <td className="py-2.5 px-3 align-middle font-sans text-xs text-zinc-200 tracking-tight leading-snug">
                      <div className="line-clamp-1 group-hover:text-white transition-colors" title={entity.tagline}>
                        {entity.tagline}
                      </div>
                    </td>

                    {/* 4. 月商（白文字・等幅） */}
                    <td className="py-2.5 px-3 text-right tabular-nums align-middle font-mono text-xs font-bold text-white">
                      {formatMoney(entity.pnl.monthlyRevenue)}
                    </td>

                    {/* 5. 実効純利 ＋ 利益率 */}
                    <td className="py-2.5 px-3 text-right tabular-nums align-middle font-mono text-xs">
                      <span className="text-zinc-200 font-medium">
                        {formatMoney(entity.pnl.operatingProfit)}
                      </span>
                      <span className="text-emerald-400 font-semibold ml-1.5 text-[11px]">
                        ({entity.pnl.operatingMargin}%)
                      </span>
                    </td>

                    {/* 6. 体制（数字が切れない6%幅） */}
                    <td className="py-2.5 px-3 text-right tabular-nums align-middle font-mono text-xs text-zinc-400">
                      {entity.operations.teamSize === 1 ? '1人' : `${entity.operations.teamSize.toLocaleString()}人`}
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
