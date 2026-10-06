import React from 'react';

import type { ReaderAnalysis, ReaderCase } from '@/shared/reader-case';
import { splitKeyNumbers } from '@/shared/case-text';
import { ANALYSIS_LABELS, UI } from '@/shared/ui-strings';
import type { DetailSection, SectionItem } from '../model/case-detail-plan';
import { SourceRef, sourceNumbers } from './ReaderRefs';

/** 推論の印。ESTIMATE=「推定」、FACT_SUMMARY=印なし、未指定の旧データ=式あり「推定」・無し「推測」。 */
export function inferenceMark(analysis: ReaderAnalysis): string {
  if (analysis.presentation === 'FACT_SUMMARY') return '';
  const estimate = analysis.presentation === 'ESTIMATE' || (analysis.presentation === undefined && Boolean(analysis.formula));
  return estimate ? UI.ESTIMATED_MARK : UI.ANALYSIS_MARK;
}

/** 要の数字（金額・割合・件数）だけ太字にして、文の中で目に入るようにする。 */
function Emphasis({ text }: { text: string }) {
  return (
    <>
      {splitKeyNumbers(text).map((part, i) =>
        part.strong ? <strong key={i} className="font-semibold text-term-fg-strong">{part.text}</strong> : <React.Fragment key={i}>{part.text}</React.Fragment>,
      )}
    </>
  );
}

function Item({ item, sourceNo, prefix, sectionTitle }: { item: SectionItem; sourceNo: Map<string, number>; prefix: string; sectionTitle: string }) {
  const owner = { [item.owner.attr]: item.owner.id } as Record<string, string>;
  const mark = item.analysis && !item.step ? inferenceMark(item.analysis) : '';
  const label = item.analysis ? ANALYSIS_LABELS[item.analysis.item] : undefined;
  const head = item.step ?? (label !== sectionTitle ? label : undefined);
  return (
    <div {...owner} className="py-2.5">
      {(head || mark) && (
        <div className="mb-1 flex items-center gap-2 text-xs text-term-label">
          {head && <span className={item.step ? 'text-term-accent' : ''}>{head}</span>}
          {mark && <span className="text-term-muted">{mark}</span>}
        </div>
      )}
      <ul className="space-y-1.5">
        {item.sentences.map((sentence, i) => (
          <li
            key={i}
            className="relative pl-3.5 text-[15px] leading-relaxed text-term-fg [overflow-wrap:anywhere] before:absolute before:left-0 before:top-[0.72em] before:h-1 before:w-1 before:bg-term-muted lg:text-[13px]"
          >
            <Emphasis text={sentence} />
            {i === item.sentences.length - 1 && item.sourceId && <SourceRef n={sourceNo.get(item.sourceId)} prefix={prefix} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 目次つきの本文の区画。区画ごとに背景の帯の見出し、中身は文ごとの箇条書き。 */
export function CaseSections({ reader, sections, evidencePrefix }: { reader: ReaderCase; sections: readonly DetailSection[]; evidencePrefix: string }) {
  const sourceNo = sourceNumbers(reader);
  return (
    <>
      {sections.map((section) => (
        <section key={section.id} id={section.id} data-section={section.id} className="scroll-mt-12 border-b border-term-line lg:scroll-mt-9">
          <h3 className="border-b border-term-line bg-term-head px-3 py-2 text-base font-semibold text-term-fg-strong lg:py-1.5 lg:text-sm">{section.title}</h3>
          <div className="divide-y divide-term-line-soft px-3">
            {section.items.map((item) => (
              <Item key={item.key} item={item} sourceNo={sourceNo} prefix={evidencePrefix} sectionTitle={section.title} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
