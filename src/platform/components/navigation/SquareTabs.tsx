'use client';

import React from 'react';

export interface SquareTab<K extends string> {
  key: K;
  label: string;
  /** 件数など、ラベル右に小さく添える値 */
  count?: number | string;
}

interface SquareTabsProps<K extends string> {
  tabs: ReadonlyArray<SquareTab<K>>;
  value: K;
  onChange: (key: K) => void;
  ariaLabel: string;
  className?: string;
}

/** 端末型UIの四角いタブ。選択中は下端2pxの橙。 */
export function SquareTabs<K extends string>({ tabs, value, onChange, ariaLabel, className = '' }: SquareTabsProps<K>) {
  return (
    <nav aria-label={ariaLabel} className={`flex min-w-0 overflow-x-auto ${className}`}>
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            aria-pressed={selected}
            className={`flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 border-r border-term-line px-3 text-sm lg:min-h-[28px] lg:text-xs ${
              selected
                ? 'bg-[var(--surface-overlay)] text-term-fg-strong shadow-[inset_0_-2px_0_var(--term-accent)]'
                : 'text-term-muted hover:bg-term-head hover:text-term-fg'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && <span className="term-num text-xs text-term-accent">{tab.count}</span>}
          </button>
        );
      })}
    </nav>
  );
}
