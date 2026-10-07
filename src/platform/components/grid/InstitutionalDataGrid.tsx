'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import { MobileFeedCard } from './MobileFeedCard';
import { Bookmark, X } from 'lucide-react';
import { sectorLabel } from './sectorLabel';
import { useVerifiedEntityIds } from '@/platform/hooks/useVerifiedEntityIds';
import { VerifiedMark } from './VerifiedMark';
import { pickEntityLogo } from '@/shared/media-display';
import { useEntityMedia } from '../../hooks/useEntityMedia';
import { EntityLogo } from './EntityLogo';
import { UI, uiFormat } from '@/shared/ui-strings';
import { ListDescription, ListMetricCell, listColumnsOf } from './ReaderListCells';

const PAGE_SIZE = 250;

/**
 * PC一覧の見出しバー（事例一覧・条件・件数）。一覧の外側（スクロールしない位置）に置く。
 * 件数は事例のデータではないので、行の中身の検査（screen-text の一覧）とは分けて描く。
 */
export function LedgerListTitle({ count, conditionsLabel }: { count: number; conditionsLabel?: string }) {
  return (
    <div className="term-panel-title hidden shrink-0 lg:flex">
      <span className="term-panel-name">{UI.LIST_TITLE}</span>
      <span className="truncate">{conditionsLabel || UI.LIST_NO_CONDITIONS}</span>
      <span className="term-num ml-auto shrink-0">{count.toLocaleString('ja-JP')}件</span>
    </div>
  );
}

/**
 * スマホ幅（上部の検索欄が無い幅）の一覧見出し。検索語が入っている間だけ「検索「語」・N件」を出し、×で消せる。
 * PC の見出し（LedgerListTitle）とは別部品にして、見出しの作り替えと独立して差し込めるようにしている。
 */
export function LedgerMobileSearchSummary({ query, count, onClear }: { query: string; count: number; onClear: () => void }) {
  const term = query.trim();
  if (!term) return null;
  return (
    <div className="flex min-h-11 shrink-0 items-center gap-2 border-b border-term-line bg-term-head pl-3 text-sm text-term-fg lg:hidden" data-testid="mobile-search-summary">
      <span className="min-w-0 flex-1 truncate">検索「{term}」・<span className="term-num">{count.toLocaleString('ja-JP')}件</span></span>
      <button type="button" onClick={onClear} aria-label="検索語を消去" className="flex h-11 w-11 shrink-0 items-center justify-center text-term-muted hover:text-term-fg-strong">
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

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
  /** 読み込み中・失敗の表示を別に出している間は、0件の案内を出さない */
  suppressEmpty?: boolean;
  /** 特徴のボタンを押した時の絞り込み。無ければボタンは出さない */
  selectedTags?: readonly string[];
  onToggleTag?: (tag: string) => void;
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
  suppressEmpty = false,
  selectedTags = [],
  onToggleTag,
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
        {entities.length === 0 && !suppressEmpty && (
          <div className="px-3 py-8 text-sm text-term-muted">
            <p>{UI.LIST_EMPTY}</p>
            <p className="mt-1">{UI.LIST_EMPTY_WHAT}</p>
          </div>
        )}
      </div>

      {/* PC一覧（表）。見出しバー（件数・条件）は一覧の外側（LedgerListTitle）に置く */}
      <div data-variant="table" className="hidden w-full lg:block">
        <table className="w-full table-fixed border-collapse text-left text-[13px] [counter-reset:ledger-row]">
          <colgroup>
            <col />
            {!isSplitView && <col className="w-[110px]" />}
            <col className="w-[176px]" />
            {!isSplitView && <col className="w-[104px]" />}
            <col className="w-7" />
          </colgroup>
          <thead>
            <tr className="h-[26px] border-b border-term-line bg-term-head text-xs text-term-label">
              <th className="px-2 font-normal">{UI.LIST_COL_NAME}</th>
              {!isSplitView && <th className="px-2 font-normal">{UI.LIST_COL_SECTOR}</th>}
              <th className="px-2 text-right font-normal">{UI.LIST_COL_REVENUE}</th>
              {!isSplitView && <th className="px-2 text-right font-normal">{UI.LIST_COL_PROFIT}</th>}
              <th className="px-1"><span className="sr-only">{UI.SAVE}</span></th>
            </tr>
          </thead>
            {visibleEntities.map((entity) => {
              const isSelected = selectedEntityId === entity.id;
              const isBookmarked = bookmarkedIds.has(entity.id);
              const { revenue, scale, profit } = listColumnsOf(entity.reader);
              const headline = revenue ?? scale;
              const sector = sectorLabel(entity);
              return (
                <tbody
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
                  aria-current={isSelected ? "true" : undefined}
                  className={`cursor-pointer focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-term-accent ${
                    isSelected
                      ? 'bg-term-select text-term-fg-strong'
                      : 'hover:bg-term-head'
                  }`}
                >
                  <tr>
                  <td className={`overflow-hidden border-l-2 px-2 pt-2 ${isSelected ? 'border-term-accent' : 'border-transparent'}`} title={entity.name}>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <EntityLogo asset={pickEntityLogo(logos[entity.id])} name={entity.name} />
                      <span className="min-w-0 shrink truncate text-sm font-semibold text-term-fg-strong">{entity.name}</span>
                      {verifiedIds.has(entity.id) && <VerifiedMark />}
                      {onToggleTag && (entity.tags ?? []).slice(0, 3).map((tag) => {
                        const on = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            aria-pressed={on}
                            onClick={(event) => { event.stopPropagation(); onToggleTag(tag); }}
                            className={`hidden h-[18px] shrink-0 items-center whitespace-nowrap border px-1 text-[11px] xl:inline-flex ${on ? 'border-term-accent text-term-accent' : 'border-term-line-soft text-term-label hover:border-term-line hover:text-term-fg'}`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </span>
                  </td>
                  {!isSplitView && (
                    <td className="truncate px-2 pt-1.5 text-xs text-term-muted">{sector}</td>
                  )}
                  <td className="term-num whitespace-nowrap px-2 pt-2 text-right text-sm">
                    <ListMetricCell metric={headline} expected={['REVENUE']} />
                  </td>
                  {!isSplitView && (
                    <td className="term-num truncate px-2 text-right">
                      {profit ? <ListMetricCell metric={profit} expected={['OPERATING_INCOME']} /> : null}
                    </td>
                  )}
                  <td className="px-0 pt-1 text-center">
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
                  <tr className="border-b border-term-line">
                    <td colSpan={isSplitView ? 3 : 5} className={`overflow-hidden border-l-2 px-2 pb-2 pl-[32px] ${isSelected ? 'border-term-accent' : 'border-transparent'}`}>
                      <ListDescription reader={entity.reader} className="mt-0.5 block truncate text-xs text-term-sub" />
                    </td>
                  </tr>
                </tbody>
              );
            })}
        </table>
        {entities.length === 0 && !suppressEmpty && (
          <div className="px-3 py-6 text-sm text-term-muted">
            <p>{UI.LIST_EMPTY}</p>
            <p className="mt-1">{UI.LIST_EMPTY_WHAT}</p>
          </div>
        )}
      </div>

      {/* 追加読み込みトリガー */}
      {(shouldRenderGridContinuation(visibleCount, entities.length, hasMore) || retryAvailable) && (
        <div ref={observerTargetRef} className="term-num px-3 py-3 text-center text-xs text-term-muted" aria-live="polite">
          {isLoadingMore ? (
            <span>追加取得中（現在 {entities.length.toLocaleString('ja-JP')}件）</span>
          ) : retryAvailable && onRetry ? (
            <div role="alert" className="flex flex-wrap items-center justify-center gap-3 text-sm text-term-fg lg:text-xs">
              <span>{UI.LIST_LOAD_MORE_FAILED}</span>
              <button type="button" onClick={onRetry} className="min-h-11 rounded-sm border border-term-accent px-3 text-term-accent hover:bg-term-head lg:min-h-8">
                {UI.LIST_RETRY}
              </button>
            </div>
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
