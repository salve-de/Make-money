'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import { MobileFeedCard } from './MobileFeedCard';
import { Bookmark } from 'lucide-react';
import { sectorLabel } from './sectorLabel';
import { entityDescription } from '@/platform/utils/entityDescription';

const PAGE_SIZE = 250;

export function shouldLoadMoreGridPage(visibleCount: number, entityCount: number, hasMore: boolean, retryAvailable = false): boolean {
  return visibleCount >= entityCount && hasMore && !retryAvailable;
}

export function shouldRenderGridContinuation(visibleCount: number, entityCount: number, hasMore: boolean): boolean {
  return visibleCount < entityCount || hasMore;
}

function financialStatusLabel(entity: FinancialEntity): string {
  if (isRevenueUnknown(entity)) return '未確認';
  switch (entity.pnl.financialStatus) {
    case 'VERIFIED': return '一次資料';
    case 'REPORTED': return '報道';
    case 'ESTIMATED': return '推計';
    case 'POST_MORTEM': return '事後記録';
    default: return '根拠未登録';
  }
}

function financialStatusTone(entity: FinancialEntity): string {
  if (isRevenueUnknown(entity)) return 'text-zinc-400';
  switch (entity.pnl.financialStatus) {
    case 'VERIFIED': return 'text-emerald-300';
    case 'REPORTED': return 'text-sky-300';
    case 'ESTIMATED': return 'text-amber-300';
    case 'POST_MORTEM': return 'text-rose-300';
    default: return 'text-zinc-400';
  }
}

function isRevenueUnknown(entity: FinancialEntity): boolean {
  return entity.pnl.isRevenueUnconfirmed === true || entity.pnl.financialStatus === 'UNAVAILABLE';
}

function isProfitUnknown(entity: FinancialEntity): boolean {
  return entity.pnl.financialStatus === 'UNAVAILABLE' || entity.pnl.isOperatingProfitUnconfirmed === true;
}

function isMarginUnknown(entity: FinancialEntity): boolean {
  return entity.pnl.financialStatus === 'UNAVAILABLE' || entity.pnl.isMarginUnconfirmed === true;
}

function teamSizeLabel(entity: FinancialEntity): string {
  const teamSize = entity.operations?.teamSize;
  if (entity.operations?.isTeamSizeUnconfirmed || teamSize == null) return '未確認';
  return `${teamSize.toLocaleString()}人`;
}

interface InstitutionalDataGridProps {
  entities: FinancialEntity[];
  selectedEntityId: string | null;
  onSelectEntity: (id: string) => void;
  currency: 'JPY' | 'USD';
  bookmarkedIds: Set<string>;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  isSplitView?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  retryAvailable?: boolean;
  onRetry?: () => void;
}

export const InstitutionalDataGrid: React.FC<InstitutionalDataGridProps> = ({
  entities,
  selectedEntityId,
  onSelectEntity,
  currency,
  bookmarkedIds,
  onToggleBookmark,
  isSplitView = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  retryAvailable = false,
  onRetry,
}) => {
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const observerTargetRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // フィルタや検索で entities が変更された場合は表示件数を初期化
  const [previousRows, setPreviousRows] = useState(entities);
  if (previousRows !== entities) {
    setPreviousRows(entities);
    setVisibleCount(PAGE_SIZE);
  }

  // 1000件スケール耐性: 初期250件から段階的にDOM展開するプログレッシブ・ウィンドウイング
  const visibleEntities = useMemo(() => {
    return entities.slice(0, visibleCount);
  }, [entities, visibleCount]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    const target = observerTargetRef.current;
    if (!root || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore) {
          if (shouldLoadMoreGridPage(visibleCount, entities.length, hasMore, retryAvailable) && onLoadMore) {
            onLoadMore();
            return;
          }
          if (visibleCount < entities.length) {
            setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, entities.length));
          }
        }
      },
      { root, threshold: 0, rootMargin: '600px 0px' }
    );
    observer.observe(target);
    return () => {
      observer.unobserve(target);
    };
  }, [entities.length, hasMore, isLoadingMore, onLoadMore, retryAvailable, visibleCount]);

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
    <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto bg-[#0c1016] pb-16 md:pb-0">
      {/* モバイル一覧 */}
      <div className="divide-y divide-white/[0.08] md:hidden">
        {visibleEntities.map((entity) => (
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
          <div className="p-10 text-center text-sm text-zinc-400">
            条件に合う事例がありません
          </div>
        )}
      </div>

      {/* 詳細表示中、またはタブレット幅の一覧 */}
      <div className={`hidden md:block ${isSplitView ? 'block' : 'xl:hidden'} w-full`}>
        <table className="w-full table-fixed border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.09] bg-[#10161f] text-zinc-400 text-xs">
              <th className="w-[72%] px-3 py-3 font-medium">企業・事業内容</th>
              <th className="w-[28%] px-3 py-3 text-right font-medium" title="売上と営業利益は月額換算値です。根拠と対象時期は各行に表示しています。">売上・営業利益（月額換算）</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {visibleEntities.map((entity) => {
                const isSelected = selectedEntityId === entity.id;
                const isBookmarked = bookmarkedIds.has(entity.id);
                const isCandidate = entity.tags?.includes('未精査候補') === true;
                const foundedYear = entity.temporal?.foundedYear;
              return (
                <tr
                  key={entity.id}
                  onClick={() => onSelectEntity(entity.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectEntity(entity.id);
                    }
                  }}
                  tabIndex={0}
                  aria-selected={isSelected}
                  className={`cursor-pointer border-l-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300 ${
                    isSelected
                      ? 'border-sky-300 bg-sky-300/[0.15] shadow-[inset_0_0_0_1px_rgba(90,168,245,0.16)]'
                      : 'border-transparent hover:bg-white/[0.035]'
                  }`}
                >
                  {/* 左: 事業名、業種、登録情報 */}
                  <td className="px-3 py-3.5">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <button
                        onClick={(e) => onToggleBookmark(entity.id, e)}
                        aria-label={isBookmarked ? `${entity.name}の保存を解除` : `${entity.name}を保存`}
                        aria-pressed={isBookmarked}
                        className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
                      >
                        <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current text-sky-200' : ''}`} />
                      </button>
                      <div className="min-w-0 flex-1">
                        {/* 1段目: 社名 + 中立的な業種表示 */}
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span className="min-w-0 shrink truncate font-semibold text-sm text-zinc-100">
                            {entity.name}
                          </span>
                          <span
                            className="max-w-[150px] shrink-0 truncate rounded border border-white/[0.12] bg-white/[0.035] px-1.5 py-0.5 text-[11px] text-zinc-300"
                            title="登録された業種分類"
                          >
                            {sectorLabel(entity.sector)}
                          </span>
                          {isCandidate && (
                            <span className="shrink-0 rounded border border-amber-300/30 bg-amber-300/[0.08] px-1.5 py-0.5 text-[11px] text-amber-200">
                              確認中
                            </span>
                          )}
                          {entity.architecturePattern?.startsWith('地雷:') && (
                            <span className="shrink-0 rounded border border-rose-300/30 bg-rose-300/[0.08] px-1.5 py-0.5 text-[11px] text-rose-200">
                              撤退事例
                            </span>
                          )}
                          {foundedYear !== undefined && foundedYear > 0 && !entity.architecturePattern?.startsWith('地雷:') && (
                            <span className="shrink-0 rounded border border-white/[0.12] px-1.5 py-0.5 text-[11px] text-zinc-400">
                              {foundedYear}年創業
                            </span>
                          )}
                        </div>
                        {/* 2段目: 台帳に登録された事業説明 */}
                        <p
                          className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-300"
                          title={entityDescription(entity)}
                        >
                          {entityDescription(entity)}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3.5 text-right align-middle tabular-nums">
                    <div className="font-mono text-sm font-semibold">
                      {isRevenueUnknown(entity) ? (
                        <span className="font-sans text-xs font-normal text-zinc-300">
                          {entity.pnl.revenueLabel || '未確認'}
                        </span>
                      ) : (
                        <span className="text-zinc-100">
                          {formatMoney(entity.pnl.monthlyRevenue)}
                        </span>
                      )}
                    </div>
                    {!isRevenueUnknown(entity) && (
                      <div className={`mt-1 text-[11px] ${financialStatusTone(entity)}`}>
                        {financialStatusLabel(entity)}
                        {entity.pnl.dataSnapshotPeriod ? ` · ${entity.pnl.dataSnapshotPeriod}` : ''}
                      </div>
                    )}
                    {(!isProfitUnknown(entity) || !isMarginUnknown(entity)) && (
                      <div className="mt-1 font-mono text-xs text-zinc-300">
                        {!isProfitUnknown(entity) && formatMoney(entity.pnl.operatingProfit)}
                        {!isMarginUnknown(entity) && <span className="ml-1.5 text-zinc-400">{entity.pnl.operatingMargin}%</span>}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ワイド画面の一覧 */}
      {!isSplitView && (
        <div className="hidden xl:block w-full">
          <table className="w-full table-fixed border-collapse text-left text-[13px]">
            <thead>
              <tr className="h-11 border-b border-white/[0.09] bg-[#10161f] text-xs text-zinc-400">
                <th className="w-[58%] px-4 py-3 font-medium">企業・事業内容</th>
                <th className="w-[14%] px-3 py-3 text-right font-medium">売上（月額換算）</th>
                <th className="w-[18%] px-3 py-3 text-right font-medium">営業利益（月額換算）・利益率</th>
                <th className="w-[10%] px-3 py-3 text-right font-medium">人数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {visibleEntities.map((entity) => {
                const isSelected = selectedEntityId === entity.id;
                const isBookmarked = bookmarkedIds.has(entity.id);
                const isCandidate = entity.tags?.includes('未精査候補') === true;
                const foundedYear = entity.temporal?.foundedYear;
                return (
                  <tr
                    key={entity.id}
                    onClick={() => onSelectEntity(entity.id)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectEntity(entity.id);
                      }
                    }}
                    tabIndex={0}
                    aria-selected={isSelected}
                    className={`cursor-pointer border-l-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300 ${
                      isSelected
                        ? 'border-sky-300 bg-sky-300/[0.15] shadow-[inset_0_0_0_1px_rgba(90,168,245,0.16)]'
                        : 'border-transparent hover:bg-white/[0.035]'
                    }`}
                  >
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <button
                          onClick={(e) => onToggleBookmark(entity.id, e)}
                          aria-label={isBookmarked ? `${entity.name}の保存を解除` : `${entity.name}を保存`}
                          aria-pressed={isBookmarked}
                          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
                        >
                          <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current text-sky-200' : ''}`} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="min-w-0 shrink truncate text-sm font-semibold text-zinc-100 transition-colors group-hover:text-sky-100">
                              {entity.name}
                            </span>
                            <span className="max-w-[160px] shrink-0 truncate rounded border border-white/[0.12] bg-white/[0.035] px-1.5 py-0.5 text-[11px] text-zinc-300" title="登録された業種分類">
                              {sectorLabel(entity.sector)}
                            </span>
                            {isCandidate && <span className="shrink-0 rounded border border-amber-300/30 bg-amber-300/[0.08] px-1.5 py-0.5 text-[11px] text-amber-200">確認中</span>}
                            {entity.architecturePattern?.startsWith('地雷:') && <span className="shrink-0 rounded border border-rose-300/30 bg-rose-300/[0.08] px-1.5 py-0.5 text-[11px] text-rose-200">撤退事例</span>}
                            {foundedYear !== undefined && foundedYear > 0 && !entity.architecturePattern?.startsWith('地雷:') && <span className="shrink-0 text-[11px] text-zinc-400">{foundedYear}年創業</span>}
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-300" title={entityDescription(entity)}>
                            {entityDescription(entity)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-right align-middle tabular-nums">
                      <div className="font-mono text-sm font-semibold text-zinc-100">
                        {isRevenueUnknown(entity) ? (entity.pnl.revenueLabel || '未確認') : formatMoney(entity.pnl.monthlyRevenue)}
                      </div>
                      {!isRevenueUnknown(entity) && <div className={`mt-1 text-[11px] ${financialStatusTone(entity)}`}>
                        {financialStatusLabel(entity)}
                        {entity.pnl.dataSnapshotPeriod ? ` · ${entity.pnl.dataSnapshotPeriod}` : ''}
                      </div>}
                    </td>

                    <td className="px-3 py-3.5 text-right align-middle tabular-nums">
                      <div className="font-mono text-sm text-zinc-200">
                        {isProfitUnknown(entity) ? '未確認' : formatMoney(entity.pnl.operatingProfit)}
                      </div>
                      <div className="mt-1 font-mono text-xs text-zinc-400">
                        {isMarginUnknown(entity) ? '' : `利益率 ${entity.pnl.operatingMargin}%`}
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-right align-middle text-sm tabular-nums text-zinc-300">
                      {teamSizeLabel(entity)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 1000件スケール時・無限スクロール感知トリガー */}
      {(shouldRenderGridContinuation(visibleCount, entities.length, hasMore) || retryAvailable) && (
        <div ref={observerTargetRef} className="py-4 text-center text-[10px] text-zinc-500 font-mono" aria-live="polite">
          {isLoadingMore ? (
            <span>R2から追加取得中...（現在 {entities.length.toLocaleString()}件）</span>
          ) : retryAvailable && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded border border-amber-500/30 bg-amber-500/[0.08] px-3 py-1.5 text-amber-300 transition-colors hover:bg-amber-500/[0.15]"
            >
              追加取得を再試行
            </button>
          ) : visibleCount < entities.length ? (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, entities.length))}
              className="rounded border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              次の{Math.min(PAGE_SIZE, entities.length - visibleCount).toLocaleString()}件を表示
              <span className="ml-1 text-zinc-500">（{visibleCount.toLocaleString()} / {entities.length.toLocaleString()}件）</span>
            </button>
          ) : hasMore && onLoadMore ? (
            <button
              type="button"
              onClick={onLoadMore}
              className="rounded border border-cyan-500/30 bg-cyan-500/[0.08] px-3 py-1.5 text-cyan-300 transition-colors hover:bg-cyan-500/[0.15] hover:text-cyan-200"
            >
              次のデータを読み込む
              <span className="ml-1 text-cyan-500/80">（現在 {entities.length.toLocaleString()}件）</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};
