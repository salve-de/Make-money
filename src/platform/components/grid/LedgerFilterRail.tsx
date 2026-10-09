"use client";

import React from "react";
import { countFacetMatches, type FacetRow } from "../../model/entity-filter";
import type { ScreenerFilterState } from "../screener/AdvancedScreenerModal";
import {
  CAPITAL_OPTIONS,
  MARGIN_OPTIONS,
  MOAT_OPTIONS,
  SCALE_OPTIONS,
  SCREENER_LABELS,
  TAG_AXES,
  selectionWithOnly,
} from "../screener/screener-options";

/**
 * PC（xl 以上）の事例一覧の左に置く絞り込みパネル。
 * 条件の実体は AdvancedScreenerModal と同じ ScreenerFilterState を使う。
 */
export interface LedgerFilterRailProps {
  filters: ScreenerFilterState | null;
  onChangeFilters: (filters: ScreenerFilterState | null) => void;
  /** 件数は一覧の見出しと状態バーに出すため、この欄には表示しない（受け口のみ維持）。 */
  resultCount: number;
  catalogTotal: number;
  /**
   * 公開中の全件の、件数用の最小の値（/api/catalog/facets）。渡された時は件数を出し、1件も当たらない条件を押せない表示にする。
   * まだ読めていない間は渡さない（手元の分だけで「0件」と決めつけない）。
   */
  facets?: readonly FacetRow[];
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

/** 欄の見出し。押すと開閉する（開いた状態が初期）。 */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="group border-b border-term-line">
      <summary className="flex h-7 cursor-pointer list-none items-center gap-1.5 bg-term-head px-2.5 text-xs text-term-label hover:text-term-fg-strong [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="text-term-muted group-open:rotate-90">▸</span>
        {title}
      </summary>
      {children}
    </details>
  );
}

function Row({
  selected,
  onClick,
  label,
  count,
  role = "checkbox",
  empty = false,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  count?: number;
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
      title={disabled ? "該当する事例がありません" : label}
      className={`flex min-h-6 w-full items-center gap-2 border-b border-term-line-soft px-2.5 py-0.5 text-left text-xs ${
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
          selected ? "border-term-accent text-term-accent" : "border-term-dim text-transparent"
        }`}
      >
        {selected ? "✓" : ""}
      </span>
      <span className="min-w-0 flex-1 break-words leading-snug">{label}</span>
      {count !== undefined && <span className="term-num shrink-0 text-term-label">{count}</span>}
    </button>
  );
}

export const LedgerFilterRail: React.FC<LedgerFilterRailProps> = ({
  filters,
  onChangeFilters,
  facets,
}) => {
  const current = filters ?? EMPTY;
  // その条件を選んだ時の件数（今の他の条件はそのまま。同じ欄の条件は入れ替えて数える）。公開中の全件で数える
  const countFor = (patch: Partial<ScreenerFilterState>): number | undefined =>
    facets ? countFacetMatches(facets, { ...current, ...patch }) : undefined;
  const update = (patch: Partial<ScreenerFilterState>) => {
    const next = { ...current, ...patch };
    onChangeFilters(isEmpty(next) ? null : next);
  };
  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  const selectedTags = current.selectedTags ?? [];
  const optionCount = (patch: Partial<ScreenerFilterState>) => countFor(patch);

  // 選んでいる条件（欄を閉じていても見え、×で外せる）
  const applied: { key: string; label: string; remove: () => void }[] = [
    ...current.scales.map((id) => ({ key: `s-${id}`, label: SCALE_OPTIONS.find((o) => o.id === id)?.label ?? id, remove: () => update({ scales: toggle(current.scales, id) }) })),
    ...(current.minMargin > 0 ? [{ key: "margin", label: `利益率 ${current.minMargin}%以上`, remove: () => update({ minMargin: 0 }) }] : []),
    ...(current.maxCapital !== null ? [{ key: "capital", label: `初期資金 ${CAPITAL_OPTIONS.find((o) => o.value === current.maxCapital)?.label ?? ""}`, remove: () => update({ maxCapital: null }) }] : []),
    ...current.moats.map((id) => ({ key: `m-${id}`, label: MOAT_OPTIONS.find((o) => o.id === id)?.label ?? id, remove: () => update({ moats: toggle(current.moats, id) }) })),
    ...selectedTags.map((tag) => ({ key: `t-${tag}`, label: tag, remove: () => update({ selectedTags: toggle(selectedTags, tag) }) })),
  ];

  return (
    <aside
      aria-label="絞り込み"
      className="flex w-[248px] shrink-0 flex-col overflow-y-auto border-r border-term-line bg-term-bg"
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

      {applied.length > 0 && (
        <ul aria-label="選んでいる条件" className="flex flex-wrap gap-1 border-b border-term-line p-2">
          {applied.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={item.remove}
                aria-label={`${item.label}を外す`}
                className="inline-flex min-h-6 items-center gap-1 border border-term-accent px-1.5 text-xs text-term-fg-strong hover:bg-term-head"
              >
                {item.label}
                <span aria-hidden="true" className="text-term-muted">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Group title={SCREENER_LABELS.scales}>
        {SCALE_OPTIONS.map((item) => {
          const count = optionCount({ scales: toggle(current.scales, item.id) });
          return (
            <Row
              key={item.id}
              label={item.label}
              count={countFor({ scales: [item.id] })}
              empty={count === 0}
              selected={current.scales.includes(item.id)}
              onClick={() => update({ scales: toggle(current.scales, item.id) })}
            />
          );
        })}
      </Group>

      <Group title={SCREENER_LABELS.margin}>
        {MARGIN_OPTIONS.map((item) => (
          <Row
            key={item.value}
            role="radio"
            label={item.label}
            count={countFor({ minMargin: item.value })}
            empty={countFor({ minMargin: item.value }) === 0}
            selected={current.minMargin === item.value}
            onClick={() => update({ minMargin: item.value })}
          />
        ))}
      </Group>

      <Group title={SCREENER_LABELS.capital}>
        {CAPITAL_OPTIONS.map((item) => (
          <Row
            key={String(item.value)}
            role="radio"
            label={item.label}
            count={countFor({ maxCapital: item.value })}
            empty={countFor({ maxCapital: item.value }) === 0}
            selected={current.maxCapital === item.value}
            onClick={() => update({ maxCapital: item.value })}
          />
        ))}
      </Group>

      <Group title={SCREENER_LABELS.moats}>
        {MOAT_OPTIONS.map((item) => (
          <Row
            key={item.id}
            label={item.label}
            count={countFor({ moats: [item.id] })}
            empty={countFor({ moats: [item.id] }) === 0}
            selected={current.moats.includes(item.id)}
            onClick={() => update({ moats: toggle(current.moats, item.id) })}
          />
        ))}
      </Group>

      {TAG_AXES.map((axis) => (
        <Group key={axis.id} title={axis.label}>
          {axis.words.map((word) => {
            const withWord = countFor({ selectedTags: selectionWithOnly(selectedTags, word) });
            return (
              <Row
                key={word}
                label={word}
                count={withWord}
                empty={withWord === 0}
                selected={selectedTags.includes(word)}
                onClick={() => update({ selectedTags: toggle(selectedTags, word) })}
              />
            );
          })}
        </Group>
      ))}
    </aside>
  );
};
