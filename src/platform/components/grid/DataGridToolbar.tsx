'use client';

import React from 'react';
import { Check, Layers, Search, SlidersHorizontal, X } from 'lucide-react';
import { ScreenerFilterState } from '../screener/AdvancedScreenerModal';
import { KNOWN_INGEST_BATCHES } from '@/shared/terminal';

interface DataGridToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
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

  return (
    <section aria-label="事例を検索・絞り込み" className="shrink-0 border-b border-white/[0.12] bg-surface px-3 py-2 sm:px-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="company-search" className="sr-only">会社名、ティッカー、事業の特徴で検索</label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="company-search"
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="会社名・ティッカー・事業の特徴で検索"
              className="[&::-webkit-search-cancel-button]:appearance-none h-11 w-full rounded-md border border-white/[0.12] bg-[#0b1016] pl-10 pr-9 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors focus:border-sky-300/60 focus:ring-2 focus:ring-sky-300/15 sm:pr-16"
            />
            {!searchQuery ? (
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-zinc-400 sm:inline-flex">
                ⌘ K
              </kbd>
            ) : (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="検索語を消去"
                className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenScreener}
              aria-label={hasActiveScreener ? `条件を絞る、現在${activeScreenerCount}件の条件` : '条件を絞る'}
              className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors sm:flex-none ${
                hasActiveScreener
                  ? 'border-sky-300/55 bg-sky-300/[0.16] text-sky-50 ring-1 ring-inset ring-sky-300/20'
                  : 'border-white/[0.16] bg-white/[0.045] text-zinc-100 hover:border-white/[0.24] hover:bg-white/[0.08]'
              }`}
              title="業種や規模などの条件を設定"
            >
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
              <span className="sm:hidden">絞込</span><span className="hidden sm:inline">条件を絞る</span>
              {hasActiveScreener && <span className="tabular-nums text-sky-200">{activeScreenerCount}</span>}
            </button>
            {hasActiveScreener && onResetScreener && (
              <button
                type="button"
                onClick={onResetScreener}
                aria-label="絞り込み条件をすべて解除"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/[0.12] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.025] px-2.5 text-xs text-zinc-400 sm:flex-none">
            <Layers aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="hidden shrink-0 whitespace-nowrap sm:inline">登録回</span>
            <select
              aria-label="登録回で絞り込み"
              value={selectedBatch}
              onChange={(event) => onSelectBatch?.(event.target.value)}
              className="min-w-0 w-full max-w-40 bg-transparent text-xs text-zinc-100 outline-none sm:max-w-48"
            >
              <option value="ALL" className="bg-[#111821] text-zinc-100">すべて ({catalogTotal === null ? '確認中' : totalAllBatches.toLocaleString()})</option>
              {batchOptions.map((batch) => (
                <option key={batch.id} value={batch.id} className="bg-[#111821] text-zinc-100">
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
              className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-2.5 text-xs transition-colors ${
                activeTags.includes('収集事例')
                  ? 'border-sky-300/55 bg-sky-300/[0.16] text-sky-50 ring-1 ring-inset ring-sky-300/20'
                  : 'border-white/[0.14] bg-white/[0.04] text-zinc-200 hover:border-white/[0.22] hover:bg-white/[0.07]'
              }`}
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
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-sky-300/35 bg-sky-300/[0.1] px-2.5 text-xs text-sky-50 transition-colors hover:border-sky-300/55 hover:bg-sky-300/[0.16]"
            >
              <span>{tag}</span>
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          ))}

          {activeTags.includes('収集事例') && onApproveAllCollected && (
            <button
              type="button"
              onClick={onApproveAllCollected}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-white/[0.12] px-2.5 text-xs text-zinc-200 transition-colors hover:bg-white/[0.06]"
              title="表示中の事例を台帳に登録"
            >
              <Check aria-hidden="true" className="h-3.5 w-3.5" />
              表示中を登録
            </button>
          )}

          <p className="ml-auto shrink-0 whitespace-nowrap text-xs tabular-nums text-zinc-400" aria-live="polite">
            <span className="font-semibold text-sky-100">{totalCount.toLocaleString()}</span> / {catalogTotal === null ? '…' : catalogTotal.toLocaleString()}件
          </p>
        </div>
      </div>
    </section>
  );
};
