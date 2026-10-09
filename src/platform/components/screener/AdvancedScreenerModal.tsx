'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, Search, X } from 'lucide-react';
import { BusinessScale, MoatType } from '../../types/terminal';
import { countFacetMatches, type FacetRow } from '../../model/entity-filter';
import { CAPITAL_OPTIONS, MARGIN_OPTIONS, MOAT_OPTIONS, SCALE_OPTIONS, SCREENER_LABELS, TAG_AXES, selectionWithOnly } from './screener-options';

interface AdvancedScreenerModalProps {
  /** 公開中の全事例（全件が手元にある時だけ）。1件も当たらないまとまりは出さない。 */
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: ScreenerFilterState) => void;
  /** 公開中の全事例（全件が手元にある時だけ）。各項目の件数に使う。 */
  /** 公開中の全件の件数用の最小の値。無い間は件数を出さない */
  facets?: readonly FacetRow[];
  initialFilters?: ScreenerFilterState | null;
  /** 渡すと、スマホ幅（PC の上部検索が無い幅）で最上部に検索欄を出す。入力はすぐ一覧に反映される */
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export interface ScreenerFilterState {
  scales: BusinessScale[];
  minMargin: number;
  maxCapital: number | null;
  moats: MoatType[];
  selectedTags?: string[];
}

const optionClass = (selected: boolean) => `
  flex min-h-11 w-full items-center justify-between gap-2 rounded-sm border px-3 py-1.5 text-left text-[13px] lg:min-h-8
  focus-visible:outline-1 focus-visible:outline-term-accent
  ${selected
    ? 'border-term-accent bg-term-select text-term-fg-strong'
    : 'border-term-line bg-transparent text-term-fg hover:bg-term-head'}
`;

const fieldsetClass = 'space-y-2 border-b border-term-line-soft pb-4';
const legendClass = 'mb-2 flex w-full items-center justify-between gap-3 text-xs text-term-accent';
const hintClass = 'ml-2 text-xs font-normal text-term-label';

export const AdvancedScreenerModal: React.FC<AdvancedScreenerModalProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  facets,
  initialFilters,
  searchQuery,
  onSearchChange,
}) => {
  const [scales, setScales] = useState<BusinessScale[]>(initialFilters?.scales || []);
  const [minMargin, setMinMargin] = useState<number>(initialFilters?.minMargin || 0);
  const [maxCapital, setMaxCapital] = useState<number | null>(initialFilters?.maxCapital ?? null);
  const [moats, setMoats] = useState<MoatType[]>(initialFilters?.moats || []);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialFilters?.selectedTags || []);
  const [previousInputs, setPreviousInputs] = useState({ initialFilters, isOpen });
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // 左の欄と同じ数え方。いま選んでいる他の条件はそのままで、その項目を選んだ時の件数を出す
  const staged = { scales, minMargin, maxCapital, moats, selectedTags };
  const countFor = (patch: Partial<ScreenerFilterState>): number | undefined =>
    facets ? countFacetMatches(facets, { ...staged, ...patch }) : undefined;
  const countBadge = (count: number | undefined) =>
    count === undefined ? null : <span className="term-num shrink-0 text-xs text-term-label">{count}</span>;

  if (previousInputs.initialFilters !== initialFilters || previousInputs.isOpen !== isOpen) {
    setPreviousInputs({ initialFilters, isOpen });
    if (initialFilters) {
      setScales(initialFilters.scales || []);
      setMinMargin(initialFilters.minMargin || 0);
      setMaxCapital(initialFilters.maxCapital ?? null);
      setMoats(initialFilters.moats || []);
      setSelectedTags(initialFilters.selectedTags || []);
    } else {
      setScales([]);
      setMinMargin(0);
      setMaxCapital(null);
      setMoats([]);
      setSelectedTags([]);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleScale = (scale: BusinessScale) => {
    setScales((previous) => previous.includes(scale) ? previous.filter((value) => value !== scale) : [...previous, scale]);
  };

  const toggleMoat = (moat: MoatType) => {
    setMoats((previous) => previous.includes(moat) ? previous.filter((value) => value !== moat) : [...previous, moat]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((previous) => previous.includes(tag) ? previous.filter((value) => value !== tag) : [...previous, tag]);
  };

  const handleReset = () => {
    setScales([]);
    setMinMargin(0);
    setMaxCapital(null);
    setMoats([]);
    setSelectedTags([]);
  };

  const handleApply = () => {
    onApplyFilters({ scales, minMargin, maxCapital, moats, selectedTags });
    onClose();
  };

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label="条件選択を閉じる"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-term-bg/80"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advanced-screener-title"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden border border-term-line bg-term-panel shadow-2xl"
      >
        <header className="flex min-h-9 items-center justify-between gap-4 border-b border-term-line bg-term-head pl-3 lg:min-h-6">
          <div>
            <h2 id="advanced-screener-title" className="text-sm font-semibold text-term-accent lg:text-xs">
              事例を条件で絞り込む
            </h2>

          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-11 w-11 shrink-0 items-center justify-center text-term-muted hover:bg-term-line hover:text-term-fg-strong lg:h-6 lg:w-8"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3 sm:px-4">
          {onSearchChange && (
            <div className="border-b border-term-line-soft pb-4 lg:hidden">
              <label htmlFor="screener-search" className="mb-2 block text-xs text-term-accent">事例を検索</label>
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-term-label" />
                <input
                  id="screener-search"
                  type="search"
                  value={searchQuery ?? ''}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="会社名・事業で検索"
                  className="[&::-webkit-search-cancel-button]:appearance-none h-11 w-full rounded-sm border border-term-line bg-term-bg pl-9 pr-11 text-base text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label="検索語を消去"
                    className="absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center text-term-muted hover:text-term-fg-strong"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          )}
          {(
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              {SCREENER_LABELS.scales} <span className={hintClass}>{SCREENER_LABELS.multiple}</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {SCALE_OPTIONS.map((item) => {
                const selected = scales.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleScale(item.id)}
                    className={optionClass(selected)}
                  >
                    <span>{item.label}</span>
                    {countBadge(countFor({ scales: [item.id] }))}
                    {selected && <Check className="h-4 w-4 shrink-0 text-term-accent" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </fieldset>
          )}

          {(
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              <span>{SCREENER_LABELS.margin}</span>
              <span className="term-num text-xs font-normal text-term-muted">{minMargin === 0 ? '指定なし' : `${minMargin}%以上`}</span>
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MARGIN_OPTIONS.map(({ value, label }) => {
                const selected = minMargin === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setMinMargin(value)}
                    className={`${optionClass(selected)} justify-center text-center`}
                  >
                    {label} {countBadge(countFor({ minMargin: value }))}
                  </button>
                );
              })}
            </div>
          </fieldset>
          )}

          {(
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              <span>{SCREENER_LABELS.capital}</span>
              <span className="term-num text-xs font-normal text-term-muted">{maxCapital === null ? '上限なし' : maxCapital === 0 ? '0円' : '100万円以内'}</span>
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {CAPITAL_OPTIONS.map((item) => {
                const selected = maxCapital === item.value;
                return (
                  <button
                    key={String(item.value)}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setMaxCapital(item.value)}
                    className={`${optionClass(selected)} justify-center text-center`}
                  >
                    {item.label} {countBadge(countFor({ maxCapital: item.value }))}
                  </button>
                );
              })}
            </div>
          </fieldset>
          )}

          {(
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              {SCREENER_LABELS.moats} <span className={hintClass}>{SCREENER_LABELS.multiple}</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {MOAT_OPTIONS.map((item) => {
                const selected = moats.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleMoat(item.id)}
                    className={optionClass(selected)}
                  >
                    <span>{item.label}</span>
                    {countBadge(countFor({ moats: [item.id] }))}
                    {selected && <Check className="h-4 w-4 shrink-0 text-term-accent" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </fieldset>
          )}

          {TAG_AXES.map((axis, index) => (
            <fieldset key={axis.id} className={index === TAG_AXES.length - 1 ? 'space-y-2 pb-1' : fieldsetClass}>
              <legend className={`${legendClass} flex-wrap`}>
                <span>{axis.label} {axis.words.length > 1 && <span className={hintClass}>{SCREENER_LABELS.multiple}</span>}</span>
                {index === 0 && selectedTags.length > 0 && (
                  <span className="term-num border border-term-accent px-2 py-0.5 text-xs text-term-accent">
                    {selectedTags.length}件選択中
                  </span>
                )}
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {axis.words.map((word) => {
                  const selected = selectedTags.includes(word);
                  const withWord = countFor({ selectedTags: selectionWithOnly(selectedTags, word) });
                  const disabled = withWord === 0 && !selected;
                  return (
                    <button
                      key={word}
                      type="button"
                      aria-pressed={selected}
                      disabled={disabled}
                      title={disabled ? '該当する事例がありません' : word}
                      onClick={() => toggleTag(word)}
                      className={`flex min-h-11 items-center gap-2 rounded-sm border px-2.5 py-1 text-[13px] focus-visible:outline-1 focus-visible:outline-term-accent lg:min-h-7 ${
                        selected
                          ? 'border-term-accent bg-term-select text-term-fg-strong'
                          : disabled
                            ? 'cursor-not-allowed border-term-line bg-transparent text-term-dim'
                            : 'border-term-line bg-transparent text-term-fg hover:bg-term-head'
                      }`}
                    >
                      <span>{word}</span>
                      {countBadge(withWord)}
                      {selected && <Check className="h-4 w-4 shrink-0 text-term-accent" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              {index === TAG_AXES.length - 1 && selectedTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTags([])}
                  className="min-h-11 px-1 text-xs text-term-muted underline underline-offset-4 hover:text-term-fg-strong lg:min-h-7"
                >
                  {SCREENER_LABELS.tagClear}
                </button>
              )}
            </fieldset>
          ))}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-term-line bg-term-head px-3 py-2">
          <button
            type="button"
            onClick={handleReset}
            aria-label="条件をリセット"
            className="flex min-h-11 items-center justify-center gap-2 rounded-sm px-2 text-xs text-term-muted hover:bg-term-line hover:text-term-fg-strong sm:justify-start lg:min-h-8"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">条件をリセット</span>
          </button>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-sm border border-term-line px-4 text-[13px] text-term-fg hover:bg-term-line lg:min-h-8"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="min-h-11 rounded-sm border border-term-accent px-4 text-[13px] text-term-accent hover:bg-term-accent-bg lg:min-h-8"
            >
              条件を適用
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
