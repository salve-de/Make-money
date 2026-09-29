'use client';

import React from 'react';
import { Check, Layers, Search, SlidersHorizontal, X } from 'lucide-react';
import { ScreenerFilterState } from '../screener/AdvancedScreenerModal';
import { KNOWN_INGEST_BATCHES } from '@/shared/terminal';

interface DataGridToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  /** ヘッダーの検索欄で絞り込むときは、この欄を出さない（検索欄の重複を避ける）。 */
  hideSearch?: boolean;
  totalCount: number;
  onOpenScreener: () => void;
  screenerFilters?: ScreenerFilterState | null;
  onResetScreener?: () => void;
  activeTags?: string[];
  onToggleTag?: (tag: string | null) => void;
  newlyCollectedCount?: number;
  onApproveAllCollected?: () => void;
  selectedBatch?: string;
  onSelectBatch?: (batchId: string) => void;
  batchCounts?: Record<string, number>;
  catalogTotal?: number | null;
}

export const DataGridToolbar: React.FC<DataGridToolbarProps> = ({
  searchQuery,
  onSearchChange,
  hideSearch = false,
  totalCount,
  onOpenScreener,
  screenerFilters,
  onResetScreener,
  activeTags = [],
  onToggleTag,
  onApproveAllCollected,
  selectedBatch = 'ALL',
  onSelectBatch,
  batchCounts = {},
  catalogTotal = null,
}) => {
  const batchOptions = React.useMemo(() => {
    const knownMap = new Map(KNOWN_INGEST_BATCHES.map((batch) => [batch.id, batch]));
    const options = KNOWN_INGEST_BATCHES.map((batch) => ({
      id: batch.id,
      label: batch.shortLabel,
      count: batchCounts[batch.id] || 0,
    }));

    for (const [id, count] of Object.entries(batchCounts)) {
      if (!knownMap.has(id) && id !== 'ALL') {
        options.push({ id, label: id.replace(/^batch-/, ''), count });
      }
    }

    return options;
  }, [batchCounts]);

  const totalAllBatches = React.useMemo(() => {
    if (catalogTotal !== null) return catalogTotal;
    const sum = Object.values(batchCounts).reduce((total, count) => total + count, 0);
    return sum > 0 ? sum : totalCount;
  }, [batchCounts, catalogTotal, totalCount]);

  const activeScreenerCount = React.useMemo(() => {
    if (!screenerFilters) return 0;
    let count = 0;
    if (screenerFilters.scales.length > 0) count += screenerFilters.scales.length;
    if (screenerFilters.minMargin > 0) count += 1;
    if (screenerFilters.maxCapital !== null) count += 1;
    if (screenerFilters.moats.length > 0) count += screenerFilters.moats.length;
    if (screenerFilters.selectedTags?.length) count += screenerFilters.selectedTags.length;
    return count;
  }, [screenerFilters]);

  const hasActiveScreener = activeScreenerCount > 0;

  const btn = 'inline-flex items-center gap-1.5 rounded-sm border px-2.5 text-xs transition-colors';
  const btnOff = 'border-term-line bg-transparent text-term-fg hover:bg-term-head';
  const btnOn = 'border-term-accent text-term-accent';

  return (
    <section aria-label="事例を検索・絞り込み" className="shrink-0 border-b border-term-line bg-term-panel px-3 py-2 lg:px-2.5 lg:py-1.5">
      <div className={hideSearch ? 'flex flex-wrap items-center gap-2' : 'flex flex-col gap-2 lg:gap-1.5'}>
        {/* 検索欄を出さないときは「条件を絞る」を登録回の行の右端へ寄せ、空の行を作らない */}
        <div className={hideSearch ? 'order-last ml-auto flex items-center gap-2' : 'flex items-center gap-2'}>
          {hideSearch ? null : (
          <div className="relative min-w-0 flex-1">
            <label htmlFor="company-search" className="sr-only">会社名、ティッカー、事業の特徴で検索</label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-term-label" />
            <input
              id="company-search"
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="会社名・ティッカー・事業の特徴で検索"
              className="[&::-webkit-search-cancel-button]:appearance-none h-11 w-full rounded-sm border border-term-line bg-term-bg pl-9 pr-9 text-sm text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent lg:h-8 lg:text-[13px] sm:pr-14"
            />
            {!searchQuery ? (
              <kbd className="term-num pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 border border-term-line px-1 text-xs text-term-label sm:inline-flex">
                ⌘ K
              </kbd>
            ) : (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="検索語を消去"
                className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm text-term-muted hover:bg-term-head hover:text-term-fg-strong"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          )}

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenScreener}
              aria-label={hasActiveScreener ? `条件を絞る、現在${activeScreenerCount}件の条件` : '条件を絞る'}
              className={`${btn} min-h-11 flex-1 justify-center text-sm sm:flex-none lg:min-h-8 lg:text-xs ${hasActiveScreener ? btnOn : btnOff}`}
              title="業種や規模などの条件を設定"
            >
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
              <span className="sm:hidden">絞込</span><span className="hidden sm:inline">条件を絞る</span>
              {hasActiveScreener && <span className="term-num">{activeScreenerCount}</span>}
            </button>
            {hasActiveScreener && onResetScreener && (
              <button
                type="button"
                onClick={onResetScreener}
                aria-label="絞り込み条件をすべて解除"
                className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-term-line text-term-muted hover:bg-term-head hover:text-term-fg-strong lg:h-8 lg:w-8"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className={`flex flex-wrap items-center gap-2 ${hideSearch ? 'min-w-0 flex-1' : ''}`}>
          <label className="inline-flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-sm border border-term-line px-2.5 text-xs text-term-label sm:flex-none lg:min-h-7">
            <Layers aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="hidden shrink-0 whitespace-nowrap sm:inline">登録回</span>
            <select
              aria-label="登録回で絞り込み"
              value={selectedBatch}
              onChange={(event) => onSelectBatch?.(event.target.value)}
              className="min-h-11 min-w-0 w-full max-w-40 bg-transparent text-xs text-term-fg outline-none sm:max-w-48 lg:min-h-6"
            >
              <option value="ALL" className="bg-term-panel text-term-fg">すべて ({catalogTotal === null ? '確認中' : totalAllBatches.toLocaleString()})</option>
              {batchOptions.map((batch) => (
                <option key={batch.id} value={batch.id} className="bg-term-panel text-term-fg">
                  {batch.label} ({batch.count}件)
                </option>
              ))}
            </select>
          </label>

          {onToggleTag && (
            <button
              type="button"
              onClick={() => onToggleTag('収集事例')}
              aria-pressed={activeTags.includes('収集事例')}
              title="新しく登録された事例を表示"
              className={`${btn} min-h-9 lg:min-h-7 ${activeTags.includes('収集事例') ? btnOn : btnOff}`}
            >
              <span>新着事例</span>
            </button>
          )}

          {activeTags.filter((tag) => tag !== '収集事例').map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag?.(tag)}
              aria-label={`${tag}の絞り込みを解除`}
              className={`${btn} min-h-9 lg:min-h-7 ${btnOn}`}
            >
              <span>{tag}</span>
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          ))}

          {activeTags.includes('収集事例') && onApproveAllCollected && (
            <button
              type="button"
              onClick={onApproveAllCollected}
              className={`${btn} ${btnOff} min-h-9 lg:min-h-7`}
              title="表示中の事例を台帳に登録"
            >
              <Check aria-hidden="true" className="h-3.5 w-3.5" />
              表示中を登録
            </button>
          )}

          <p className="term-num ml-auto shrink-0 whitespace-nowrap text-xs text-term-label" aria-live="polite">
            <span className="text-term-fg">{totalCount.toLocaleString()}</span> / {catalogTotal === null ? '…' : catalogTotal.toLocaleString()}件
          </p>
        </div>
      </div>
    </section>
  );
};
