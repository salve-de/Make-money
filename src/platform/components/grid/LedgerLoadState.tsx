import React from 'react';

import { UI } from '@/shared/ui-strings';

const ROWS = Array.from({ length: 8 }, (_, index) => index);

/**
 * 一覧が空の間の状態表示。読み込み中は行の骨格、時間がかかる時はその旨と再試行、失敗した時は理由と再試行。
 * 行が1件でもある時は使わない（その場合は InstitutionalDataGrid の末尾に再試行を出す）。
 */
export function LedgerLoadState({
  state,
  slow = false,
  onRetry,
}: {
  state: 'loading' | 'failed';
  slow?: boolean;
  onRetry?: () => void;
}) {
  const failed = state === 'failed';
  return (
    <div role={failed ? 'alert' : 'status'} aria-live="polite" className="border-b border-term-line bg-term-panel">
      <div className="flex flex-wrap items-center gap-3 px-3 py-3 text-sm text-term-fg lg:text-[13px]">
        <span>{failed ? UI.LIST_LOAD_FAILED : slow ? UI.LIST_LOAD_SLOW : UI.LIST_LOADING}</span>
        {(failed || slow) && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-sm border border-term-accent px-3 text-sm text-term-accent hover:bg-term-head lg:min-h-8 lg:text-xs"
          >
            {UI.LIST_RETRY}
          </button>
        )}
      </div>
      {!failed && (
        <div aria-hidden="true">
          {ROWS.map((row) => (
            <div key={row} className={`flex h-11 items-center gap-4 border-t border-term-line-soft px-3 lg:h-[29px] ${row % 2 ? 'bg-term-row-alt' : ''}`}>
              <div className="h-2.5 w-1/3 animate-pulse bg-term-head motion-reduce:animate-none" />
              <div className="h-2.5 w-1/6 animate-pulse bg-term-head motion-reduce:animate-none" />
              <div className="ml-auto h-2.5 w-14 animate-pulse bg-term-head motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
