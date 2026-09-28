'use client';

import React from 'react';
import type { BusinessScale, MoatType } from '../../types/terminal';
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

const EMPTY: ScreenerFilterState = { scales: [], minMargin: 0, maxCapital: null, moats: [], selectedTags: [] };

const SCALES: { id: BusinessScale; label: string }[] = [
  { id: 'SOLO', label: '一人で運営' },
  { id: 'SMALL_TEAM', label: '2〜10人' },
  { id: 'SCALEUP', label: '11〜100人' },
  { id: 'ENTERPRISE', label: '101人以上' },
];

const MARGINS = [
  { value: 30, label: '30%以上' },
  { value: 50, label: '50%以上' },
  { value: 80, label: '80%以上' },
];

const CAPITALS = [
  { value: 0, label: '0円' },
  { value: 1_000_000, label: '100万円以内' },
];

const MOATS: { id: MoatType; label: string }[] = [
  { id: 'COUNTER_POSITIONING', label: '競合と異なる土俵' },
  { id: 'SWITCHING_COST', label: '乗り換えにくさ' },
  { id: 'NETWORK_EFFECT', label: '利用者が増えるほど価値増' },
  { id: 'CORNERED_RESOURCE', label: '独自の資源' },
  { id: 'SCALE_ECONOMIES', label: '規模の経済' },
  { id: 'PROCESS_POWER', label: '独自の業務プロセス' },
];

function isEmpty(f: ScreenerFilterState): boolean {
  return f.scales.length === 0 && f.minMargin === 0 && f.maxCapital === null && f.moats.length === 0 && !(f.selectedTags?.length);
}

function GroupHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex h-6 items-center bg-term-head px-2.5 text-xs text-term-label">{children}</div>;
}

function Row({ selected, onClick, label, role = 'checkbox' }: { selected: boolean; onClick: () => void; label: string; role?: 'checkbox' | 'radio' }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={`flex h-6 w-full items-center gap-2 border-b border-term-line-soft px-2.5 text-left text-xs ${
        selected ? 'bg-term-select text-term-fg-strong' : 'text-term-fg hover:bg-term-head'
      }`}
    >
      <span
        aria-hidden="true"
        className={`term-num inline-flex h-3 w-3 shrink-0 items-center justify-center border text-xs leading-none ${
          selected ? 'border-term-accent text-term-accent' : 'border-term-dim text-transparent'
        }`}
      >
        {selected ? '✓' : ''}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export const LedgerFilterRail: React.FC<LedgerFilterRailProps> = ({
  filters,
  onChangeFilters,
  onOpenAdvanced,
  resultCount,
  catalogTotal,
}) => {
  const current = filters ?? EMPTY;
  const update = (patch: Partial<ScreenerFilterState>) => {
    const next = { ...current, ...patch };
    onChangeFilters(isEmpty(next) ? null : next);
  };
  const toggle = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <aside aria-label="絞り込み" className="flex w-[220px] shrink-0 flex-col overflow-y-auto border-r border-term-line bg-term-bg">
      <div className="term-panel-title">
        <span className="term-panel-name">絞り込み</span>
        <button
          type="button"
          onClick={() => onChangeFilters(null)}
          disabled={!filters}
          className="ml-auto text-xs text-term-muted hover:text-term-fg-strong disabled:text-term-dim"
        >
          解除
        </button>
      </div>

      <GroupHeader>運営人数</GroupHeader>
      {SCALES.map((item) => (
        <Row key={item.id} label={item.label} selected={current.scales.includes(item.id)} onClick={() => update({ scales: toggle(current.scales, item.id) })} />
      ))}

      <GroupHeader>営業利益率</GroupHeader>
      {MARGINS.map((item) => (
        <Row
          key={item.value}
          role="radio"
          label={item.label}
          selected={current.minMargin === item.value}
          onClick={() => update({ minMargin: current.minMargin === item.value ? 0 : item.value })}
        />
      ))}

      <GroupHeader>初期資金</GroupHeader>
      {CAPITALS.map((item) => (
        <Row
          key={item.value}
          role="radio"
          label={item.label}
          selected={current.maxCapital === item.value}
          onClick={() => update({ maxCapital: current.maxCapital === item.value ? null : item.value })}
        />
      ))}

      <GroupHeader>参入障壁</GroupHeader>
      {MOATS.map((item) => (
        <Row key={item.id} label={item.label} selected={current.moats.includes(item.id)} onClick={() => update({ moats: toggle(current.moats, item.id) })} />
      ))}

      {(current.selectedTags?.length ?? 0) > 0 && (
        <>
          <GroupHeader>特徴タグ</GroupHeader>
          {current.selectedTags?.map((tag) => (
            <Row key={tag} label={tag} selected onClick={() => update({ selectedTags: (current.selectedTags ?? []).filter((t) => t !== tag) })} />
          ))}
        </>
      )}

      <button
        type="button"
        onClick={onOpenAdvanced}
        className="h-7 w-full border-b border-term-line-soft px-2.5 text-left text-xs text-term-accent hover:bg-term-head"
      >
        詳しい条件…
      </button>

      <div className="mt-auto border-t border-term-line px-2.5 py-1.5 text-xs text-term-label">
        <span className="term-num text-term-fg">{resultCount.toLocaleString('ja-JP')}</span>
        <span className="term-num"> / {catalogTotal.toLocaleString('ja-JP')}</span> 件
      </div>
    </aside>
  );
};
