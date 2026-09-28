'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, X } from 'lucide-react';
import { BusinessScale, MoatType } from '../../types/terminal';

interface AdvancedScreenerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: ScreenerFilterState) => void;
  availableTags?: string[];
  tagCounts?: Record<string, number>;
  initialFilters?: ScreenerFilterState | null;
}

export interface ScreenerFilterState {
  scales: BusinessScale[];
  minMargin: number;
  maxCapital: number | null;
  moats: MoatType[];
  selectedTags?: string[];
}

const optionClass = (selected: boolean) => `
  flex min-h-11 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a1ceff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080e13]
  ${selected
    ? 'border-[#5aa8f5] bg-[#193b56] text-white'
    : 'border-white/[0.14] bg-white/[0.035] text-zinc-300 hover:border-white/[0.25] hover:bg-white/[0.07] hover:text-white'}
`;

const fieldsetClass = 'space-y-3 border-b border-white/[0.12] pb-5';

export const AdvancedScreenerModal: React.FC<AdvancedScreenerModalProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  availableTags = [],
  tagCounts = {},
  initialFilters,
}) => {
  const [scales, setScales] = useState<BusinessScale[]>(initialFilters?.scales || []);
  const [minMargin, setMinMargin] = useState<number>(initialFilters?.minMargin || 0);
  const [maxCapital, setMaxCapital] = useState<number | null>(initialFilters?.maxCapital ?? null);
  const [moats, setMoats] = useState<MoatType[]>(initialFilters?.moats || []);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialFilters?.selectedTags || []);
  const [tagQuery, setTagQuery] = useState('');
  const [previousInputs, setPreviousInputs] = useState({ initialFilters, isOpen });
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
        className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-[2px]"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advanced-screener-title"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden border border-white/[0.18] bg-[#101820] shadow-2xl sm:rounded-xl"
      >
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-white/[0.14] bg-[#192630] px-4 py-3 sm:px-5">
          <div>
            <h2 id="advanced-screener-title" className="text-base font-semibold text-white sm:text-lg">
              事例を条件で絞り込む
            </h2>

          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a1ceff]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5">
          <fieldset className={fieldsetClass}>
            <legend className="mb-3 w-full text-sm font-semibold text-white">
              事業の規模 <span className="ml-2 text-xs font-normal text-zinc-400">複数選択可</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'SOLO' as BusinessScale, label: '一人で運営' },
                { id: 'SMALL_TEAM' as BusinessScale, label: '2〜10人' },
                { id: 'SCALEUP' as BusinessScale, label: '11〜100人' },
                { id: 'ENTERPRISE' as BusinessScale, label: '101人以上' },
              ].map((item) => {
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
                    {selected && <Check className="h-4 w-4 shrink-0 text-[#a1ceff]" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className="mb-3 flex w-full items-center justify-between gap-3 text-sm font-semibold text-white">
              <span>営業利益率の下限</span>
              <span className="text-xs font-normal text-zinc-300">{minMargin === 0 ? '指定なし' : `${minMargin}%以上`}</span>
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[0, 30, 50, 80].map((value) => {
                const selected = minMargin === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setMinMargin(value)}
                    className={`${optionClass(selected)} justify-center text-center`}
                  >
                    {value === 0 ? '指定なし' : `${value}%以上`}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className="mb-3 flex w-full items-center justify-between gap-3 text-sm font-semibold text-white">
              <span>初期資金の上限</span>
              <span className="text-xs font-normal text-zinc-300">{maxCapital === null ? '上限なし' : maxCapital === 0 ? '0円' : '100万円以内'}</span>
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 0, label: '0円' },
                { value: 1000000, label: '100万円以内' },
                { value: null, label: '上限なし' },
              ].map((item) => {
                const selected = maxCapital === item.value;
                return (
                  <button
                    key={String(item.value)}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setMaxCapital(item.value)}
                    className={`${optionClass(selected)} justify-center text-center`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className="mb-3 w-full text-sm font-semibold text-white">
              事業の参入障壁 <span className="ml-2 text-xs font-normal text-zinc-400">複数選択可</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'COUNTER_POSITIONING' as MoatType, label: '競合と異なる土俵' },
                { id: 'SWITCHING_COST' as MoatType, label: '乗り換えにくさ' },
                { id: 'NETWORK_EFFECT' as MoatType, label: '利用者が増えるほど価値が増す' },
                { id: 'CORNERED_RESOURCE' as MoatType, label: '独自の資源' },
                { id: 'SCALE_ECONOMIES' as MoatType, label: '規模の経済' },
                { id: 'PROCESS_POWER' as MoatType, label: '独自の業務プロセス' },
              ].map((item) => {
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
                    {selected && <Check className="h-4 w-4 shrink-0 text-[#a1ceff]" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {availableTags.length > 0 && (
            <fieldset className="space-y-3 pb-1">
              <legend className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 text-sm font-semibold text-white">
                <span>事例の特徴 <span className="ml-2 text-xs font-normal text-zinc-400">複数選択可</span></span>
                {selectedTags.length > 0 && (
                  <span className="rounded border border-[#5aa8f5]/50 bg-[#193b56] px-2 py-1 text-xs font-medium text-[#d9ecff]">
                    {selectedTags.length}件選択中
                  </span>
                )}
              </legend>
              <input type="search" aria-label="特徴タグを検索" placeholder="特徴タグを検索" value={tagQuery} onChange={(event) => setTagQuery(event.target.value)} className="h-10 w-full rounded-md border border-white/[0.16] bg-black/20 px-3 text-sm text-white outline-none focus:border-sky-300" />
              <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-md border border-white/[0.14] bg-black/10 p-2">
                {availableTags.filter((tag) => tag.toLowerCase().includes(tagQuery.trim().toLowerCase())).map((tag) => {
                  const selected = selectedTags.includes(tag);
                  const count = tagCounts[tag];
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleTag(tag)}
                      className={`flex min-h-10 items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a1ceff] ${
                        selected
                          ? 'border-[#5aa8f5] bg-[#193b56] font-medium text-white'
                          : 'border-white/[0.14] bg-white/[0.035] text-zinc-300 hover:border-white/[0.25] hover:bg-white/[0.07] hover:text-white'
                      }`}
                    >
                      <span>{tag}</span>
                      {count !== undefined && <span className="tabular-nums text-xs text-zinc-300">{count}件</span>}
                      {selected && <Check className="h-4 w-4 shrink-0 text-[#a1ceff]" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              {selectedTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTags([])}
                  className="min-h-10 rounded px-2 text-sm text-zinc-300 underline decoration-white/30 underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a1ceff]"
                >
                  特徴タグをすべて解除
                </button>
              )}
            </fieldset>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-white/[0.14] bg-[#192630] p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <button
            type="button"
            onClick={handleReset}
            aria-label="条件をリセット"
            className="flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a1ceff] sm:justify-start"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">条件をリセット</span>
          </button>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-md border border-white/[0.18] px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a1ceff]"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="min-h-11 rounded-md bg-[#5aa8f5] px-4 text-sm font-semibold text-[#08121b] transition-colors hover:bg-[#a1ceff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#192630]"
            >
              条件を適用
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
