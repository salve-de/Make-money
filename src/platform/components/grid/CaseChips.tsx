import React from 'react';

import { caseLabels } from '@/shared/display-text';
import type { FinancialEntity } from '@/shared/terminal';

/** タグの見た目（一覧・スマホ・詳細で共通）。罫線の枠でなく薄い塗りにして、説明文と見分けやすくする */
export const TAG_CLASS = 'inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-[2px] px-1.5 text-xs';
export const TAG_STATIC = 'bg-term-line text-term-sub';

/**
 * 一覧の行のタグ（種類）。タグは全部押せて、押すとその言葉で絞り込む（左の絞り込みと同じ言葉の一覧）。
 * 折り返して並べる。運営の印は出さない（caseLabels）。タグが無ければ何も出さない。年は名前の右（YearChip）。
 */
export function CaseChips({ entity, selectedTags = [], onToggleTag, className = '' }: {
  entity: FinancialEntity;
  selectedTags?: readonly string[];
  onToggleTag?: (tag: string) => void;
  className?: string;
}) {
  const labels = caseLabels(entity);
  if (labels.length === 0) return null;
  return (
    <span data-testid="case-chips" className={`flex flex-wrap items-center gap-1 ${className}`}>
      {labels.map((tag) => {
        if (!onToggleTag) return <span key={tag} className={`${TAG_CLASS} ${TAG_STATIC}`}>{tag}</span>;
        const on = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={on}
            onClick={(event) => { event.stopPropagation(); onToggleTag(tag); }}
            className={`${TAG_CLASS} ${on ? 'bg-term-accent-line text-term-accent' : `${TAG_STATIC} hover:text-term-fg-strong`}`}
          >
            {tag}
          </button>
        );
      })}
    </span>
  );
}
