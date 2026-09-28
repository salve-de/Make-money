'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import { MobileFeedCard } from './MobileFeedCard';
import { CONFIRM_TONE_CLASS, confirmStatus, monthlyRevenueParts, teamSizeText } from './ledgerRow';
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
  /** 見出しバーに出す現在の絞り込み条件の文言（任意） */
  conditionsLabel?: string;
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
  conditionsLabel,
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

  return (
    <div ref={scrollContainerRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-term-bg pb-16 lg:pb-0">
      {/* スマホ・タブレット一覧 */}
      <div className="lg:hidden">
        {visibleEntities.map((entity, index) => (
          <MobileFeedCard
            key={entity.id}
            entity={entity}
            isSelected={selectedEntityId === entity.id}
            onSelect={() => onSelectEntity(entity.id)}
            currency={currency}
            isBookmarked={bookmarkedIds.has(entity.id)}
            onToggleBookmark={(e) => onToggleBookmark(entity.id, e)}
            zebra={index % 2 === 1}
          />
        ))}
        {entities.length === 0 && (
          <div className="px-3 py-8 text-sm text-term-muted">条件に合う事例がありません。条件を減らすか、検索語を変えてください。</div>
        )}
      </div>

      {/* PC一覧（表） */}
      <div className="hidden w-full lg:block">
        <div className="term-panel-title sticky top-0 z-10">
          <span className="term-panel-name">事例一覧</span>
          <span className="truncate">{conditionsLabel || '条件なし'}</span>
          <span className="term-num ml-auto shrink-0">{entities.length.toLocaleString('ja-JP')}件</span>
        </div>
        <table className="w-full table-fixed border-collapse text-left text-[13px]">
          <colgroup>
            <col className="w-10" />
            <col className={isSplitView ? 'w-[38%]' : 'w-[22%]'} />
            {!isSplitView && <col />}
            {!isSplitView && <col className="w-[110px]" />}
            <col className="w-[60px]" />
            <col className="w-[84px]" />
            <col className="w-[60px]" />
            <col className="w-8" />
          </colgroup>
          <thead>
            <tr className="h-[26px] border-b border-term-line bg-term-head text-xs text-term-label">
              <th className="px-2 text-right font-normal">#</th>
              <th className="px-2 font-normal">事例</th>
              {!isSplitView && <th className="px-2 font-normal">概要</th>}
              {!isSplitView && <th className="px-2 font-normal">分野</th>}
              <th className="px-2 text-right font-normal">人数</th>
              <th className="px-2 text-right font-normal" title="売上は月額換算値です。">月商 {currency === 'USD' ? 'USD' : '万円'}</th>
              <th className="px-2 font-normal">確認</th>
              <th className="px-1"><span className="sr-only">保存</span></th>
            </tr>
          </thead>
          <tbody>
            {visibleEntities.map((entity, index) => {
              const isSelected = selectedEntityId === entity.id;
              const isBookmarked = bookmarkedIds.has(entity.id);
              const revenue = monthlyRevenueParts(entity, currency);
              const team = teamSizeText(entity);
              const status = confirmStatus(entity);
              const description = entityDescription(entity);
              return (
                <tr
                  key={entity.id}
                  data-entity-id={entity.id}
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
                  className={`h-[29px] cursor-pointer border-b border-term-line-soft focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-term-accent ${
                    isSelected
                      ? 'bg-term-select text-term-fg-strong'
                      : `${index % 2 === 1 ? 'bg-term-row-alt' : ''} hover:bg-term-head`
                  }`}
                >
                  <td className="term-num px-2 text-right text-xs text-term-dim">{index + 1}</td>
                  <td className="truncate px-2 font-semibold text-term-fg-strong" title={entity.name}>{entity.name}</td>
                  {!isSplitView && (
                    <td className="truncate px-2 text-term-muted" title={description}>{description}</td>
                  )}
                  {!isSplitView && (
                    <td className="truncate px-2 text-xs text-term-muted">{sectorLabel(entity.sector)}</td>
                  )}
                  <td className={`term-num px-2 text-right ${team ? 'text-term-fg' : 'text-term-dim'}`}>{team ?? '—'}</td>
                  <td className={`term-num px-2 text-right ${revenue ? 'text-term-fg-strong' : 'text-term-dim'}`}>{revenue ? revenue.value : '—'}</td>
                  <td className={`px-2 text-xs ${CONFIRM_TONE_CLASS[status.tone]}`}>{status.label}</td>
                  <td className="px-0 text-center">
                    <button
                      type="button"
                      onClick={(e) => onToggleBookmark(entity.id, e)}
                      aria-label={isBookmarked ? `${entity.name}の保存を解除` : `${entity.name}を保存`}
                      aria-pressed={isBookmarked}
                      className={`inline-flex h-[22px] w-[22px] items-center justify-center rounded-sm hover:bg-term-line ${isBookmarked ? 'text-term-accent' : 'text-term-dim hover:text-term-fg'}`}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {entities.length === 0 && (
              <tr><td colSpan={isSplitView ? 6 : 8} className="px-3 py-6 text-sm text-term-muted">条件に合う事例がありません。条件を減らすか、検索語を変えてください。</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 追加読み込みトリガー */}
      {(shouldRenderGridContinuation(visibleCount, entities.length, hasMore) || retryAvailable) && (
        <div ref={observerTargetRef} className="term-num px-3 py-3 text-center text-xs text-term-muted" aria-live="polite">
          {isLoadingMore ? (
            <span>追加取得中（現在 {entities.length.toLocaleString('ja-JP')}件）</span>
          ) : retryAvailable && onRetry ? (
            <button type="button" onClick={onRetry} className="h-8 rounded-sm border border-term-accent px-3 text-term-accent hover:bg-term-accent-bg">
              追加取得を再試行
            </button>
          ) : visibleCount < entities.length ? (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, entities.length))}
              className="h-8 rounded-sm border border-term-line px-3 text-term-fg hover:bg-term-head"
            >
              次の{Math.min(PAGE_SIZE, entities.length - visibleCount).toLocaleString('ja-JP')}件を表示
              <span className="ml-1 text-term-label">（{visibleCount.toLocaleString('ja-JP')} / {entities.length.toLocaleString('ja-JP')}件）</span>
            </button>
          ) : hasMore && onLoadMore ? (
            <button type="button" onClick={onLoadMore} className="h-8 rounded-sm border border-term-line px-3 text-term-fg hover:bg-term-head">
              次のデータを読み込む
              <span className="ml-1 text-term-label">（現在 {entities.length.toLocaleString('ja-JP')}件）</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};
