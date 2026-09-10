'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FinancialEntity } from '../../types/terminal';
import { MobileFeedCard } from './MobileFeedCard';
import { Bookmark } from 'lucide-react';

const PAGE_SIZE = 100;

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
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const observerTargetRef = useRef<HTMLDivElement>(null);

  // フィルタや検索で entities が変更された場合は表示件数を初期化
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [entities]);

  // 1000件スケール耐性: 初期100件から段階的にDOM展開するプログレッシブ・ウィンドウイング
  const visibleEntities = useMemo(() => {
    return entities.slice(0, visibleCount);
  }, [entities, visibleCount]);

  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, entities.length));
        }
      },
      { threshold: 0.1, rootMargin: '300px' }
    );
    observer.observe(target);
    return () => {
      observer.unobserve(target);
    };
  }, [entities.length]);

  const formatMoney = (yen: number) => {
    if (!yen || yen <= 0) return '非公開';
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
        {visibleEntities.map((entity) => (
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
            {visibleEntities.map((entity) => {
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
                          {entity.temporal && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-500/30 shrink-0">
                              {entity.temporal.foundedYear}年
                            </span>
                          )}
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
                    {entity.pnl.monthlyRevenue > 0 ? (
                      <>
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
                      </>
                    ) : (
                      <>
                        <div className="text-zinc-500 text-xs">
                          非公開
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-0.5">
                          推定未算出
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. ワイドPC全画面表示時（インスペクター非表示時）: 【Bloomberg型 2段組純化スプレッドシート】 */}
      {!isSplitView && (
        <div className="hidden xl:block w-full">
          <table className="w-full table-fixed border-collapse text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#090A0D] text-zinc-500 text-[11px] h-9">
                <th className="w-[58%] py-2.5 px-4 font-medium">銘柄 / 歪みの手口</th>
                <th className="w-[14%] py-2.5 px-3 font-medium text-right">月商</th>
                <th className="w-[18%] py-2.5 px-3 font-medium text-right">実効純利 (率)</th>
                <th className="w-[10%] py-2.5 px-3 font-medium text-right">体制</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {visibleEntities.map((entity) => {
                const isSelected = selectedEntityId === entity.id;
                const isBookmarked = bookmarkedIds.has(entity.id);
                return (
                  <tr
                    key={entity.id}
                    onClick={() => onSelectEntity(entity.id)}
                    className={`cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-white/[0.08] border-l-2 border-emerald-500'
                        : 'hover:bg-white/[0.03] border-l-2 border-transparent'
                    }`}
                  >
                    {/* 1. 銘柄名 ＆ 歪みの手口（2段組: 58%の広大幅） */}
                    <td className="py-2.5 px-4 align-middle">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <button
                          onClick={(e) => onToggleBookmark(entity.id, e)}
                          className="text-zinc-600 hover:text-zinc-300 shrink-0 cursor-pointer mt-0.5"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-zinc-300 fill-zinc-300' : ''}`} />
                        </button>
                        <div className="min-w-0 flex-1">
                          {/* 1段目: 社名 + 型バッジ */}
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-xs text-white truncate font-sans group-hover:text-emerald-300 transition-colors">
                              {entity.name}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                              {entity.architecturePattern}
                            </span>
                            {entity.temporal && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-500/30 shrink-0">
                                {entity.temporal.foundedYear}年
                              </span>
                            )}
                          </div>
                          {/* 2段目: 歪みの手口（ワンライナー） */}
                          <div 
                            className="text-[11px] text-zinc-400 font-sans tracking-tight leading-snug mt-0.5 line-clamp-1 truncate group-hover:text-zinc-300 transition-colors"
                            title={entity.tagline}
                          >
                            {entity.tagline}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. 月商（白文字・等幅） */}
                    <td className="py-2.5 px-3 text-right tabular-nums align-middle font-mono text-xs">
                      {entity.pnl.monthlyRevenue > 0 ? (
                        <span className="font-bold text-white">
                          {formatMoney(entity.pnl.monthlyRevenue)}
                        </span>
                      ) : (
                        <span className="text-zinc-500 font-normal">
                          非公開
                        </span>
                      )}
                    </td>

                    {/* 3. 実効純利 ＋ 利益率 */}
                    <td className="py-2.5 px-3 text-right tabular-nums align-middle font-mono text-xs">
                      {entity.pnl.monthlyRevenue > 0 ? (
                        <>
                          <span className="text-zinc-200 font-medium">
                            {formatMoney(entity.pnl.operatingProfit)}
                          </span>
                          <span className="text-emerald-400 font-semibold ml-1.5 text-[11px]">
                            ({entity.pnl.operatingMargin}%)
                          </span>
                        </>
                      ) : (
                        <span className="text-zinc-600 font-normal">
                          推定未算出
                        </span>
                      )}
                    </td>

                    {/* 4. 体制 */}
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

      {/* 1000件スケール時・無限スクロール感知トリガー */}
      {visibleCount < entities.length && (
        <div ref={observerTargetRef} className="py-4 text-center text-[10px] text-zinc-500 font-mono">
          読み込み中... ({visibleCount} / {entities.length}件)
        </div>
      )}
    </div>
  );
};
