'use client';

import React from 'react';
import { FinancialEntity } from '../../types/terminal';
import { MobileFeedCard } from './MobileFeedCard';
import { Bookmark, ChevronRight } from 'lucide-react';

interface InstitutionalDataGridProps {
  entities: FinancialEntity[];
  selectedEntityId: string | null;
  onSelectEntity: (id: string) => void;
  currency: 'JPY' | 'USD';
  bookmarkedIds: Set<string>;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
}

export const InstitutionalDataGrid: React.FC<InstitutionalDataGridProps> = ({
  entities,
  selectedEntityId,
  onSelectEntity,
  currency,
  bookmarkedIds,
  onToggleBookmark,
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
          />
        ))}
        {entities.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-600 font-mono">
            該当する銘柄が見つかりません
          </div>
        )}
      </div>

      {/* 2. 狭小PC（1024px〜1279px: MacBook Air 13"等）: 厳選5カラム表 */}
      <div className="hidden md:block xl:hidden w-full">
        <table className="w-full table-fixed border-collapse text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#090A0D] text-zinc-500 text-[11px]">
              <th className="w-[32%] py-2 px-3 font-medium">銘柄 / 企業名</th>
              <th className="w-[18%] py-2 px-2 font-medium text-right">直近月商</th>
              <th className="w-[18%] py-2 px-2 font-medium text-right">実効純利益</th>
              <th className="w-[16%] py-2 px-2 font-medium text-center">営業利益率</th>
              <th className="w-[16%] py-2 px-3 font-medium text-right">解剖</th>
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
                  {/* 社名・ティッカー */}
                  <td className="py-2.5 px-3 truncate">
                    <div className="flex items-center gap-2 truncate">
                      <button
                        onClick={(e) => onToggleBookmark(entity.id, e)}
                        className="text-zinc-600 hover:text-zinc-300 shrink-0"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-zinc-300 fill-zinc-300' : ''}`} />
                      </button>
                      <span className="text-[11px] text-zinc-500 font-mono shrink-0">
                        {entity.ticker}
                      </span>
                      <span className="font-medium text-white truncate font-sans">
                        {entity.name}
                      </span>
                    </div>
                  </td>

                  {/* 月商 */}
                  <td className="py-2.5 px-2 text-right text-white tabular-nums truncate">
                    {formatMoney(entity.pnl.monthlyRevenue)}
                  </td>

                  {/* 実効純利益 */}
                  <td className="py-2.5 px-2 text-right text-zinc-300 tabular-nums truncate">
                    {formatMoney(entity.pnl.operatingProfit)}
                  </td>

                  {/* 営業利益率 */}
                  <td className="py-2.5 px-2 text-center truncate">
                    <span className="text-emerald-400/90 font-medium tabular-nums">
                      {entity.pnl.operatingMargin}%
                    </span>
                  </td>

                  {/* 解剖ボタン */}
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEntity(entity.id);
                      }}
                      className="inline-flex items-center gap-0.5 text-zinc-400 hover:text-white px-2 py-0.5 rounded text-[11px] font-sans transition-colors"
                    >
                      <span>解剖</span>
                      <ChevronRight className="w-3 h-3 text-zinc-600" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. ワイドPC（1440px〜1920px+）: 9カラム超高密度金融台帳 */}
      <div className="hidden xl:block w-full">
        <table className="w-full table-fixed border-collapse text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#090A0D] text-zinc-500 text-[11px]">
              <th className="w-[20%] py-2 px-3 font-medium">ティッカー / 銘柄</th>
              <th className="w-[12%] py-2 px-2 font-medium text-right">直近月商</th>
              <th className="w-[12%] py-2 px-2 font-medium text-right">実効純利益</th>
              <th className="w-[8%] py-2 px-2 font-medium text-center">粗利益率</th>
              <th className="w-[9%] py-2 px-2 font-medium text-center">営業利益率</th>
              <th className="w-[9%] py-2 px-2 font-medium text-right">初期資本</th>
              <th className="w-[7%] py-2 px-2 font-medium text-center">体制</th>
              <th className="w-[16%] py-2 px-2 font-medium">突いた盲点</th>
              <th className="w-[7%] py-2 px-3 font-medium text-right">解剖</th>
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
                  {/* ティッカー・銘柄 */}
                  <td className="py-2 px-3 truncate">
                    <div className="flex items-center gap-2 truncate">
                      <button
                        onClick={(e) => onToggleBookmark(entity.id, e)}
                        className="text-zinc-600 hover:text-zinc-300 shrink-0"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-zinc-300 fill-zinc-300' : ''}`} />
                      </button>
                      <span className="text-[11px] text-zinc-500 font-mono shrink-0">
                        {entity.ticker}
                      </span>
                      <span className="font-medium text-white truncate font-sans">
                        {entity.name}
                      </span>
                    </div>
                  </td>

                  {/* 月商 */}
                  <td className="py-2 px-2 text-right text-white tabular-nums truncate">
                    {formatMoney(entity.pnl.monthlyRevenue)}
                  </td>

                  {/* 純利 */}
                  <td className="py-2 px-2 text-right text-zinc-300 tabular-nums truncate">
                    {formatMoney(entity.pnl.operatingProfit)}
                  </td>

                  {/* 粗利率 */}
                  <td className="py-2 px-2 text-center tabular-nums text-zinc-400">
                    {entity.pnl.grossMargin}%
                  </td>

                  {/* 営業利益率 */}
                  <td className="py-2 px-2 text-center">
                    <span className="text-emerald-400/90 font-medium tabular-nums">
                      {entity.pnl.operatingMargin}%
                    </span>
                  </td>

                  {/* 初期投下資本 */}
                  <td className="py-2 px-2 text-right text-zinc-500 tabular-nums truncate">
                    {entity.operations.initialCapitalRequired === 0 ? '0円' : formatMoney(entity.operations.initialCapitalRequired)}
                  </td>

                  {/* 体制 */}
                  <td className="py-2 px-2 text-center text-zinc-500 text-[11px]">
                    {entity.operations.teamSize === 1 ? '1人' : `${entity.operations.teamSize}人`}
                  </td>

                  {/* 突いた盲点 */}
                  <td className="py-2 px-2 text-zinc-400 text-[11px] truncate font-sans" title={entity.strategy.blindspot}>
                    {entity.strategy.blindspot}
                  </td>

                  {/* 解剖ボタン */}
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEntity(entity.id);
                      }}
                      className="inline-flex items-center gap-0.5 text-zinc-400 hover:text-white px-2 py-0.5 rounded text-[11px] font-sans transition-colors"
                    >
                      <span>解剖</span>
                      <ChevronRight className="w-3 h-3 text-zinc-600" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
