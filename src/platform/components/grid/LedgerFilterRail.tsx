'use client';

import React from 'react';
import type { ScreenerFilterState } from '../screener/AdvancedScreenerModal';

/**
 * PC（xl 以上）の事例一覧の左に置く絞り込みパネル。
 * 条件の実体は AdvancedScreenerModal と同じ ScreenerFilterState を使う。
 */
export interface LedgerFilterRailProps {
  filters: ScreenerFilterState | null;
  onChangeFilters: (filters: ScreenerFilterState | null) => void;
  onOpenAdvanced: () => void;
  resultCount: number;
  catalogTotal: number;
}

export const LedgerFilterRail: React.FC<LedgerFilterRailProps> = ({ resultCount, catalogTotal }) => (
  <aside aria-label="絞り込み" className="flex w-[220px] shrink-0 flex-col border-r border-term-line bg-term-bg">
    <div className="term-panel-title"><span className="term-panel-name">絞り込み</span></div>
    <div className="px-2.5 py-2 text-xs text-term-label">
      <span className="term-num text-term-fg">{resultCount.toLocaleString('ja-JP')}</span> / {catalogTotal.toLocaleString('ja-JP')} 件
    </div>
  </aside>
);
