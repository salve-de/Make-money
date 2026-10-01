'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import { MobileFeedCard } from './MobileFeedCard';
import { Bookmark } from 'lucide-react';
import { sectorLabel } from './sectorLabel';
import { useVerifiedEntityIds } from '@/platform/hooks/useVerifiedEntityIds';
import { VerifiedMark } from './VerifiedMark';
import { pickEntityLogo } from '@/shared/media-display';
import { useEntityMedia } from '../../hooks/useEntityMedia';
import { EntityLogo } from './EntityLogo';
import { UI, uiFormat } from '@/shared/ui-strings';
import { ListDescription, ListMetricCell, ListOriginCell, listMetricsOf } from './ReaderListCells';

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
  /** スマホの一覧で強調する事例。PCで最初の事例を自動で開いていても、スマホでは開いた事例だけを強調する */
  mobileSelectedEntityId?: string | null;
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
  mobileSelectedEntityId,
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
  const verifiedIds = useVerifiedEntityIds();

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

  // 公式ロゴ（許可済みのものだけ）。表示中の行の分をまとめて取得し、無い行は何も出さない。
  const visibleEntityIds = useMemo(() => visibleEntities.map((entity) => entity.id), [visibleEntities]);
  const logos = useEntityMedia(visibleEntityIds);

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
      <div data-variant="mobile" className="lg:hidden">
        {visibleEntities.map((entity, index) => (
          <MobileFeedCard
            key={entity.id}
            entity={entity}
            logo={pickEntityLogo(logos[entity.id])}
            isSelected={(mobileSelectedEntityId === undefined ? selectedEntityId : mobileSelectedEntityId) === entity.id}
            onSelect={() => onSelectEntity(entity.id)}
            currency={currency}
            isBookmarked={bookmarkedIds.has(entity.id)}
            onToggleBookmark={(e) => onToggleBookmark(entity.id, e)}
            zebra={index % 2 === 1}
            isVerified={verifiedIds.has(entity.id)}
          />
        ))}
        {entities.length === 0 && (
          <div className="px-3 py-8 text-sm text-term-muted">{UI.LIST_EMPTY}</div>
        )}
      </div>

      {/* PC一覧（表）。件数は一覧の上の道具欄に出す */}
      <div data-variant="table" className="hidden w-full lg:block">
        <table className="w-full table-fixed border-collapse text-left text-[13px] [counter-reset:ledger-row]">
          <colgroup>
            <col className="w-10" />
            <col className={isSplitView ? 'w-[52%]' : 'w-[22%]'} />
            {!isSplitView && <col />}
            {!isSplitView && <col className="w-[110px]" />}
            <col className="w-[120px]" />
            {!isSplitView && <col className="w-[104px]" />}
            <col className="w-[72px]" />
            <col className="w-8" />
          </colgroup>
          <thead>
            <tr className="h-[26px] border-b border-term-line bg-term-head text-xs text-term-label">
              <th className="px-2 text-right font-normal">{UI.LIST_COL_INDEX}</th>
              <th className="px-2 font-normal">{UI.LIST_COL_NAME}</th>
              {!isSplitView && <th className="px-2 font-normal">{UI.LIST_COL_SUMMARY}</th>}
              {!isSplitView && <th className="px-2 font-normal">{UI.LIST_COL_SECTOR}</th>}
              <th className="px-2 text-right font-normal">{UI.LIST_COL_REVENUE}</th>
              {!isSplitView && <th className="px-2 text-right font-normal">{UI.LIST_COL_PROFIT}</th>}
              <th className="px-2 font-normal">{UI.LIST_COL_ORIGIN}</th>
              <th className="px-1"><span className="sr-only">{UI.SAVE}</span></th>
            </tr>
          </thead>
          <tbody>
            {visibleEntities.map((entity, index) => {
              const isSelected = selectedEntityId === entity.id;
              const isBookmarked = bookmarkedIds.has(entity.id);
              const { main, profit } = listMetricsOf(entity.reader);
              const sector = sectorLabel(entity);
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
                  className={`h-[29px] cursor-pointer border-b border-term-line-soft [counter-increment:ledger-row] focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-term-accent ${
                    isSelected
                      ? 'bg-term-select text-term-fg-strong'
                      : `${index % 2 === 1 ? 'bg-term-row-alt' : ''} hover:bg-term-head`
                  }`}
                >
                  {/* 行番号は CSS の連番で描く（画面の文字は事例の出典・数値・定数だけにする） */}
                  <td className="term-num px-2 text-right text-xs text-term-dim before:content-[counter(ledger-row)]" />
                  <td className="overflow-hidden px-2" title={entity.name}>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <EntityLogo asset={pickEntityLogo(logos[entity.id])} />
                      <span className="truncate font-semibold text-term-fg-strong">{entity.name}</span>
                      {verifiedIds.has(entity.id) && <VerifiedMark />}
                    </span>
                  </td>
                  {!isSplitView && (
                    <td className="overflow-hidden px-2 text-term-muted">
                      <ListDescription reader={entity.reader} className="block truncate" />
                    </td>
                  )}
                  {!isSplitView && (
                    <td className="truncate px-2 text-xs text-term-muted">{sector}</td>
                  )}
                  <td className="term-num truncate px-2 text-right">
                    <ListMetricCell metric={main} expected={['REVENUE']} />
                  </td>
                  {!isSplitView && (
                    <td className="term-num truncate px-2 text-right">
                      {profit ? <ListMetricCell metric={profit} expected={['OPERATING_INCOME']} /> : null}
                    </td>
                  )}
                  <td className="truncate px-2 text-xs">
                    <ListOriginCell metric={main} />
                  </td>
                  <td className="px-0 text-center">
                    <button
                      type="button"
                      onClick={(e) => onToggleBookmark(entity.id, e)}
                      aria-label={uiFormat(isBookmarked ? UI.UNSAVE_ARIA : UI.SAVE_ARIA, entity.name)}
                      aria-pressed={isBookmarked}
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-sm hover:bg-term-line ${isBookmarked ? 'text-term-accent' : 'text-term-dim hover:text-term-fg'}`}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {entities.length === 0 && (
          <div className="px-3 py-6 text-sm text-term-muted">{UI.LIST_EMPTY}</div>
        )}
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
              className="h-11 rounded-sm border border-term-line px-3 text-term-fg hover:bg-term-head lg:h-8"
            >
              次の{Math.min(PAGE_SIZE, entities.length - visibleCount).toLocaleString('ja-JP')}件を表示
              <span className="ml-1 text-term-label">（{visibleCount.toLocaleString('ja-JP')} / {entities.length.toLocaleString('ja-JP')}件）</span>
            </button>
          ) : hasMore && onLoadMore ? (
            <button type="button" onClick={onLoadMore} className="h-11 rounded-sm border border-term-line px-3 text-term-fg hover:bg-term-head lg:h-8">
              次のデータを読み込む
              <span className="ml-1 text-term-label">（現在 {entities.length.toLocaleString('ja-JP')}件）</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};
