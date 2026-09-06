'use client';

import React from 'react';
import { FinancialEntity } from '../../types/terminal';
import { MobileFeedCard } from './MobileFeedCard';
import { ShieldCheck, Bookmark, ChevronRight, TrendingUp } from 'lucide-react';

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
    <div className="flex-1 overflow-y-auto bg-[#080C14] select-none">
      {/* 1. モバイル（390px以下）: 親指最適化フィード */}
      <div className="md:hidden divide-y divide-white/[0.08]">
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
          <div className="p-8 text-center text-xs text-slate-400 font-mono">
            NO MATCHING FINANCIAL ENTITIES
          </div>
        )}
      </div>

      {/* 2. 狭小PC（1024px〜1279px: MacBook Air 13"等）: 厳選5カラム表 */}
      <div className="hidden md:block xl:hidden w-full">
        <table className="w-full table-fixed border-collapse text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-white/[0.1] bg-[#0A0E18] text-slate-400 text-[11px]">
              <th className="w-[30%] py-2.5 px-3 font-medium">銘柄 / 企業名</th>
              <th className="w-[18%] py-2.5 px-2 font-medium text-right">直近月商</th>
              <th className="w-[20%] py-2.5 px-2 font-medium text-right">実効純利益</th>
              <th className="w-[16%] py-2.5 px-2 font-medium text-center">営業利益率</th>
              <th className="w-[16%] py-2.5 px-3 font-medium text-right">解剖</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {entities.map((entity) => {
              const isSelected = selectedEntityId === entity.id;
              const isBookmarked = bookmarkedIds.has(entity.id);
              return (
                <tr
                  key={entity.id}
                  onClick={() => onSelectEntity(entity.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/[0.12] border-l-2 border-l-emerald-400'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {/* 社名・ティッカー */}
                  <td className="py-2.5 px-3 truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <button
                        onClick={(e) => onToggleBookmark(entity.id, e)}
                        className="text-slate-400 hover:text-amber-400 shrink-0"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-amber-400 fill-amber-400' : ''}`} />
                      </button>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40 px-1 py-0.2 rounded shrink-0">
                        {entity.ticker}
                      </span>
                      <span className="font-bold text-white truncate font-sans">
                        {entity.name}
                      </span>
                    </div>
                  </td>

                  {/* 月商 */}
                  <td className="py-2.5 px-2 text-right font-bold text-white tabular-nums truncate">
                    {formatMoney(entity.pnl.monthlyRevenue)}
                  </td>

                  {/* 実効純利益 */}
                  <td className="py-2.5 px-2 text-right font-bold text-emerald-400 tabular-nums truncate">
                    {formatMoney(entity.pnl.operatingProfit)}
                  </td>

                  {/* 営業利益率 */}
                  <td className="py-2.5 px-2 text-center truncate">
                    <span className="bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-bold px-1.5 py-0.5 rounded text-[11px] tabular-nums">
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
                      className="inline-flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px] font-medium"
                    >
                      <span>解剖</span>
                      <ChevronRight className="w-3 h-3" />
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
            <tr className="border-b border-white/[0.1] bg-[#0A0E18] text-slate-400 text-[11px]">
              <th className="w-[20%] py-2.5 px-3 font-medium">ティッカー / 銘柄</th>
              <th className="w-[12%] py-2.5 px-2 font-medium text-right">直近月商</th>
              <th className="w-[12%] py-2.5 px-2 font-medium text-right">実効純利益</th>
              <th className="w-[9%] py-2.5 px-2 font-medium text-center">粗利益率</th>
              <th className="w-[9%] py-2.5 px-2 font-medium text-center">営業利益率</th>
              <th className="w-[9%] py-2.5 px-2 font-medium text-right">初期資本</th>
              <th className="w-[7%] py-2.5 px-2 font-medium text-center">体制</th>
              <th className="w-[14%] py-2.5 px-2 font-medium">突いた盲点</th>
              <th className="w-[7%] py-2.5 px-3 font-medium text-right">解剖</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {entities.map((entity) => {
              const isSelected = selectedEntityId === entity.id;
              const isBookmarked = bookmarkedIds.has(entity.id);
              return (
                <tr
                  key={entity.id}
                  onClick={() => onSelectEntity(entity.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/[0.12] border-l-2 border-l-emerald-400'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {/* ティッカー・銘柄 */}
                  <td className="py-2 px-3 truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <button
                        onClick={(e) => onToggleBookmark(entity.id, e)}
                        className="text-slate-400 hover:text-amber-400 shrink-0"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-amber-400 fill-amber-400' : ''}`} />
                      </button>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40 px-1 py-0.2 rounded shrink-0">
                        {entity.ticker}
                      </span>
                      <span className="font-bold text-white truncate font-sans">
                        {entity.name}
                      </span>
                      {entity.verifiedBadge && (
                        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                      )}
                    </div>
                  </td>

                  {/* 月商 */}
                  <td className="py-2 px-2 text-right font-bold text-white tabular-nums truncate">
                    {formatMoney(entity.pnl.monthlyRevenue)}
                  </td>

                  {/* 純利 */}
                  <td className="py-2 px-2 text-right font-bold text-emerald-400 tabular-nums truncate">
                    {formatMoney(entity.pnl.operatingProfit)}
                  </td>

                  {/* 粗利率 */}
                  <td className="py-2 px-2 text-center tabular-nums text-slate-300">
                    {entity.pnl.grossMargin}%
                  </td>

                  {/* 営業利益率 */}
                  <td className="py-2 px-2 text-center">
                    <span className="bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-bold px-1.5 py-0.2 rounded text-[11px] tabular-nums">
                      {entity.pnl.operatingMargin}%
                    </span>
                  </td>

                  {/* 初期投下資本 */}
                  <td className="py-2 px-2 text-right text-slate-400 tabular-nums truncate">
                    {entity.operations.initialCapitalRequired === 0 ? '0円' : formatMoney(entity.operations.initialCapitalRequired)}
                  </td>

                  {/* 体制 */}
                  <td className="py-2 px-2 text-center">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-sans ${
                      entity.operations.teamSize === 1 
                        ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/40' 
                        : 'bg-white/[0.06] text-slate-400'
                    }`}>
                      {entity.operations.teamSize === 1 ? '1人' : `${entity.operations.teamSize}人`}
                    </span>
                  </td>

                  {/* 突いた盲点 */}
                  <td className="py-2 px-2 text-slate-400 text-[11px] truncate font-sans" title={entity.strategy.blindspot}>
                    {entity.strategy.blindspot}
                  </td>

                  {/* 解剖ボタン */}
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEntity(entity.id);
                      }}
                      className="inline-flex items-center gap-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px] font-medium"
                    >
                      <span>解剖</span>
                      <ChevronRight className="w-3 h-3" />
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
