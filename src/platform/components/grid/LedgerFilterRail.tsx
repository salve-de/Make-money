"use client";

import React, { useState } from "react";
import type { FinancialEntity } from "@/shared/terminal";
import { countScreenerMatches } from "../../model/entity-filter";
import type { ScreenerFilterState } from "../screener/AdvancedScreenerModal";
import {
  CAPITAL_OPTIONS,
  MARGIN_OPTIONS,
  MOAT_OPTIONS,
  SCALE_OPTIONS,
  SCREENER_LABELS,
} from "../screener/screener-options";

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
  /** 事例の特徴タグ（スマホの「絞り込み・検索」と同じ一覧と件数） */
  availableTags?: string[];
  tagCounts?: Record<string, number>;
}

const EMPTY: ScreenerFilterState = {
  scales: [],
  minMargin: 0,
  maxCapital: null,
  moats: [],
  selectedTags: [],
};

function isEmpty(f: ScreenerFilterState): boolean {
  return (
    f.scales.length === 0 &&
    f.minMargin === 0 &&
    f.maxCapital === null &&
    f.moats.length === 0 &&
    !f.selectedTags?.length
  );
}

function GroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-6 items-center bg-term-head px-2.5 text-xs text-term-label">
      {children}
    </div>
  );
}

function Row({
  selected,
  onClick,
  label,
  role = "checkbox",
  empty = false,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  role?: "checkbox" | "radio";
  empty?: boolean;
}) {
  // 1件も当たらない条件は押せない（選択中なら外せるように押せるまま残す）
  const disabled = empty && !selected;
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "該当する事例がありません" : undefined}
      className={`flex h-6 w-full items-center gap-2 border-b border-term-line-soft px-2.5 text-left text-xs ${
        selected
          ? "bg-term-select text-term-fg-strong"
          : disabled
            ? "cursor-not-allowed text-term-dim"
            : "text-term-fg hover:bg-term-head"
      }`}
    >
      <span
        aria-hidden="true"
        className={`term-num inline-flex h-3 w-3 shrink-0 items-center justify-center border text-xs leading-none ${
          selected
            ? "border-term-accent text-term-accent"
            : "border-term-dim text-transparent"
        }`}
      >
        {selected ? "✓" : ""}
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
  availableTags = [],
  tagCounts = {},
}) => {
  const [tagQuery, setTagQuery] = useState("");
  const current = filters ?? EMPTY;
  // その条件だけを当てた時に1件も残らないか（全件が手元にある時だけ判定する）
  const isEmptyOption = (patch: Partial<ScreenerFilterState>): boolean =>
    Boolean(allEntities) &&
    countScreenerMatches(allEntities ?? [], { ...EMPTY, ...patch }) === 0;
  const update = (patch: Partial<ScreenerFilterState>) => {
    const next = { ...current, ...patch };
    onChangeFilters(isEmpty(next) ? null : next);
  };
  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <aside
      aria-label="絞り込み"
      className="flex w-[220px] shrink-0 flex-col overflow-y-auto border-r border-term-line bg-term-bg"
    >
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

      {
        <>
          <GroupHeader>{SCREENER_LABELS.scales}</GroupHeader>
          {SCALE_OPTIONS.map((item) => (
            <Row
              key={item.id}
              label={item.label}
              empty={isEmptyOption({ scales: [item.id] })}
              selected={current.scales.includes(item.id)}
              onClick={() =>
                update({ scales: toggle(current.scales, item.id) })
              }
            />
          ))}
        </>
      }

      {
        <>
          <GroupHeader>{SCREENER_LABELS.margin}</GroupHeader>
          {MARGIN_OPTIONS.map((item) => (
            <Row
              key={item.value}
              role="radio"
              label={item.label}
              empty={isEmptyOption({ minMargin: item.value })}
              selected={current.minMargin === item.value}
              onClick={() => update({ minMargin: item.value })}
            />
          ))}
        </>
      }

      {
        <>
          <GroupHeader>{SCREENER_LABELS.capital}</GroupHeader>
          {CAPITAL_OPTIONS.map((item) => (
            <Row
              key={String(item.value)}
              role="radio"
              label={item.label}
              empty={isEmptyOption({ maxCapital: item.value })}
              selected={current.maxCapital === item.value}
              onClick={() => update({ maxCapital: item.value })}
            />
          ))}
        </>
      }

      {
        <>
          <GroupHeader>{SCREENER_LABELS.moats}</GroupHeader>
          {MOAT_OPTIONS.map((item) => (
            <Row
              key={item.id}
              label={item.label}
              empty={isEmptyOption({ moats: [item.id] })}
              selected={current.moats.includes(item.id)}
              onClick={() => update({ moats: toggle(current.moats, item.id) })}
            />
          ))}
        </>
      }

      {availableTags.length > 0 && (
        <>
          <GroupHeader>{SCREENER_LABELS.tags}</GroupHeader>
          <input
            type="search"
            aria-label={SCREENER_LABELS.tagSearch}
            placeholder={SCREENER_LABELS.tagSearch}
            value={tagQuery}
            onChange={(event) => setTagQuery(event.target.value)}
            className="h-7 w-full border-b border-term-line-soft bg-term-bg px-2.5 text-xs text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent"
          />
          {availableTags
            .filter((tag) =>
              tag.toLowerCase().includes(tagQuery.trim().toLowerCase()),
            )
            .map((tag) => {
              const selected = current.selectedTags?.includes(tag) ?? false;
              const count = tagCounts[tag];
              return (
                <Row
                  key={tag}
                  label={count === undefined ? tag : `${tag}（${count}件）`}
                  selected={selected}
                  onClick={() =>
                    update({
                      selectedTags: toggle(current.selectedTags ?? [], tag),
                    })
                  }
                />
              );
            })}
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
