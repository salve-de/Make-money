'use client';

import React from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import type { BusinessScale, MoatType } from '../../types/terminal';
import { countScreenerMatches, screenerFacetAvailability } from '../../model/entity-filter';
import type { ScreenerFilterState } from '../screener/AdvancedScreenerModal';

/**
 * PC（xl 以上）の事例一覧の左に置く絞り込みパネル。
 * 条件の実体は AdvancedScreenerModal と同じ ScreenerFilterState を使う。
 */
export interface LedgerFilterRailProps {
  filters: ScreenerFilterState | null;
  onChangeFilters: (filters: ScreenerFilterState | null) => void;
  onOpenAdvanced: () => void;
  /** 件数は一覧の見出しと状態バーに出すため、この欄には表示しない（受け口のみ維持）。 */
  resultCount: number;
  catalogTotal: number;
  /**
   * 公開中の全事例（全件が手元に読めている時だけ渡す）。渡された時は、1件も当たらない条件を押せない表示にする。
   * 一部しか読めていない時は渡さない（手元の分だけで「0件」と決めつけない）。
   */
  allEntities?: readonly FinancialEntity[];
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

function Row({ selected, onClick, label, role = 'checkbox', empty = false }: { selected: boolean; onClick: () => void; label: string; role?: 'checkbox' | 'radio'; empty?: boolean }) {
  // 1件も当たらない条件は押せない（選択中なら外せるように押せるまま残す）
  const disabled = empty && !selected;
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      disabled={disabled}
      title={disabled ? '該当する事例がありません' : undefined}
      className={`flex h-6 w-full items-center gap-2 border-b border-term-line-soft px-2.5 text-left text-xs ${
        selected ? 'bg-term-select text-term-fg-strong' : disabled ? 'cursor-not-allowed text-term-dim' : 'text-term-fg hover:bg-term-head'
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
  allEntities,
}) => {
  const current = filters ?? EMPTY;
  // 全件が手元にある時、1件も当たらないまとまりは出さない（押せない項目の壁を作らない）
  const facets = allEntities ? screenerFacetAvailability(allEntities) : null;
  const shows = (key: 'scales' | 'margin' | 'capital' | 'moats') => !facets || facets[key];
  const hasTags = (current.selectedTags?.length ?? 0) > 0;
  if (facets && !facets.scales && !facets.margin && !facets.capital && !facets.moats && !hasTags) return null;
  // その条件だけを当てた時に1件も残らないか（全件が手元にある時だけ判定する）
  const isEmptyOption = (patch: Partial<ScreenerFilterState>): boolean =>
    Boolean(allEntities) && countScreenerMatches(allEntities ?? [], { ...EMPTY, ...patch }) === 0;
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
          className="ml-auto h-6 px-1 text-xs text-term-muted hover:text-term-fg-strong disabled:text-term-dim"
        >
          解除
        </button>
      </div>

      {shows('scales') && (
        <>
      <GroupHeader>運営人数</GroupHeader>
      {SCALES.map((item) => (
        <Row key={item.id} label={item.label} empty={isEmptyOption({ scales: [item.id] })} selected={current.scales.includes(item.id)} onClick={() => update({ scales: toggle(current.scales, item.id) })} />
      ))}
        </>
      )}

      {shows('margin') && (
        <>
      <GroupHeader>営業利益率</GroupHeader>
      {MARGINS.map((item) => (
        <Row
          key={item.value}
          role="radio"
          label={item.label}
          empty={isEmptyOption({ minMargin: item.value })}
          selected={current.minMargin === item.value}
          onClick={() => update({ minMargin: current.minMargin === item.value ? 0 : item.value })}
        />
      ))}
        </>
      )}

      {shows('capital') && (
        <>
      <GroupHeader>初期資金</GroupHeader>
      {CAPITALS.map((item) => (
        <Row
          key={item.value}
          role="radio"
          label={item.label}
          empty={isEmptyOption({ maxCapital: item.value })}
          selected={current.maxCapital === item.value}
          onClick={() => update({ maxCapital: current.maxCapital === item.value ? null : item.value })}
        />
      ))}
        </>
      )}

      {shows('moats') && (
        <>
      <GroupHeader>参入障壁</GroupHeader>
      {MOATS.map((item) => (
        <Row key={item.id} label={item.label} empty={isEmptyOption({ moats: [item.id] })} selected={current.moats.includes(item.id)} onClick={() => update({ moats: toggle(current.moats, item.id) })} />
      ))}
        </>
      )}

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

    </aside>
  );
};
