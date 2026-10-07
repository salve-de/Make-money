'use client';

import React from 'react';
import Link from 'next/link';

import { buildHref } from '@/platform/model/build-material';
import type { FinancialEntity } from '@/shared/terminal';
import { buildTaste, composeIdeas, DIM_LABELS, similarCases, summaryLine, toTasteInput, type TasteTrait } from '../model/taste';

interface Props {
  allEntities: readonly FinancialEntity[];
  bookmarkedIds: ReadonlySet<string>;
  onOpenCase?: (id: string) => void;
}

const traitText = (trait: TasteTrait) => `${DIM_LABELS[trait.dim]}「${trait.label}」`;

/**
 * 保存した事例から「あなたの好み」を数え、近い事例と事業の案の組み合わせを出す。
 * 件数は保存した事例の記録から数えた事実、好みと案は推測。真似の手順は出さず、組み合わせを参考として見せるだけ。
 */
export const SavedTasteIdeas: React.FC<Props> = ({ allEntities, bookmarkedIds, onOpenCase }) => {
  const result = React.useMemo(() => {
    const saved = allEntities.filter((entity) => bookmarkedIds.has(entity.id)).map(toTasteInput);
    const taste = buildTaste(saved);
    const names = new Map(saved.map((input) => [input.id, input.name]));
    const similar = similarCases(taste, allEntities.map(toTasteInput), bookmarkedIds);
    return { taste, names, similar, ideas: composeIdeas(taste), line: summaryLine(taste) };
  }, [allEntities, bookmarkedIds]);

  const { taste, names, similar, ideas, line } = result;
  if (taste.saved < 2) return null;
  if (!line) {
    return (
      <p className="shrink-0 border-b border-term-line bg-term-panel px-3 py-2 text-sm text-term-muted">
        保存した事例に共通する特徴が見つかると、ここに好みと事業の案が出ます。
      </p>
    );
  }

  return (
    <details className="group shrink-0 border-b border-term-line bg-term-panel" data-testid="taste-ideas">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-term-fg lg:min-h-8 lg:text-[13px] [&::-webkit-details-marker]:hidden">
        <span className="shrink-0 text-term-label">あなたの好み</span>
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]" data-testid="taste-line">{line}</span>
        <span className="shrink-0 text-xs text-term-muted">推測</span>
        <span aria-hidden className="shrink-0 text-xs text-term-muted after:content-['▼'] group-open:after:content-['▲']" />
      </summary>
      <div className="max-h-[50vh] space-y-4 overflow-y-auto border-t border-term-line-soft px-3 py-3">
        <section aria-label="好みの事業案">
          <h3 className="mb-1.5 text-base font-semibold text-term-fg-strong lg:text-sm">好みを組み合わせた事業の案<span className="ml-2 text-xs font-normal text-term-muted">推測</span></h3>
          {ideas.length === 0 ? (
            <p className="text-sm text-term-muted">分野・料金・形のうち2つ以上に共通点が出ると、組み合わせを出せます。</p>
          ) : (
            <ul className="divide-y divide-term-line-soft">
              {ideas.map((idea) => (
                <li key={idea.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] leading-relaxed text-term-fg-strong [overflow-wrap:anywhere] lg:text-[13px]">{idea.traits.map(traitText).join(' × ')}</p>
                    <p className="text-xs text-term-label [overflow-wrap:anywhere]">
                      {idea.traits.map((trait) => `${trait.label} ${trait.count}件`).join('、')}（保存した事例の記録から数えた件数）
                    </p>
                  </div>
                  <Link href={buildHref(idea.anchorId)} className="inline-flex min-h-11 shrink-0 items-center text-sm text-term-accent underline underline-offset-2 lg:min-h-8" aria-label={`${names.get(idea.anchorId) ?? ''}をもとに、この組み合わせで事業を作る`}>
                    これで作る
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        {similar.length > 0 && (
          <section aria-label="好みに近い事例">
            <h3 className="mb-1.5 text-base font-semibold text-term-fg-strong lg:text-sm">好みに近い、まだ保存していない事例</h3>
            <ul className="divide-y divide-term-line-soft">
              {similar.map((row) => (
                <li key={row.id} className="py-2">
                  <button type="button" onClick={() => onOpenCase?.(row.id)} className="flex min-h-11 w-full flex-col items-start text-left lg:min-h-8">
                    <span className="text-[15px] text-term-fg-strong underline underline-offset-2 lg:text-[13px]">{row.name}</span>
                    <span className="text-xs text-term-label">共通: {row.shared.map((s) => s.label).join('、')}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </details>
  );
};
