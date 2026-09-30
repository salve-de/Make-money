import React, { useId } from 'react';

import { ANALYSIS_ITEMS, type ReaderAnalysis, type ReaderCase, type ReaderFact, type ReaderSource } from '@/shared/reader-case';
import {
  dedupeReaderSources,
  formatMetricAmount,
  metricMeasureLabel,
  metricOriginLabel,
  readerSummaryFact,
} from '@/shared/display-text';
import { ANALYSIS_LABELS, CONFIDENCE_LABELS, FACT_SECTIONS, UI, UNKNOWN_LABELS } from '@/shared/ui-strings';
import { ReaderSection } from './ReaderSection';

const sourceMap = (reader: ReaderCase): Map<string, ReaderSource> => new Map(reader.sources.map((s) => [s.id, s]));

type ReaderProps = { reader?: ReaderCase; evidencePrefix?: string };
const evidenceAnchor = (prefix: string, id: string) => `${prefix}-evidence-${encodeURIComponent(id)}`;

/** 概要の1行（summaryFactId の事実）。無ければ出さない。 */
export function ReaderSummary({ reader, evidencePrefix = 'reader' }: ReaderProps) {
  const fact = readerSummaryFact(reader);
  if (!reader || !fact) return null;
  return (
    <p id={evidenceAnchor(evidencePrefix, fact.id)} data-fact={fact.id} className="scroll-mt-8 border-b border-term-line px-2.5 py-2 text-sm leading-relaxed text-term-fg-strong sm:px-3">
      {fact.text}
    </p>
  );
}

/** 数値の表。列は 項目・期間・金額・由来・出典。 */
export function ReaderMetrics({ reader, evidencePrefix = 'reader' }: ReaderProps) {
  if (!reader) return null;
  const sources = sourceMap(reader);
  return (
    <ReaderSection id="section-metrics" title={UI.SECTION_METRICS} empty={reader.metrics.length === 0}>
      {/* 狭い画面では横に送る。キーボードでも送れるようにフォーカスを受ける */}
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={UI.SECTION_METRICS}>
        <table className="w-full min-w-[480px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="h-[26px] border-b border-term-line bg-term-head text-xs text-term-label">
              <th scope="col" className="px-2 font-normal">{UI.COL_MEASURE}</th>
              <th scope="col" className="px-2 font-normal">{UI.COL_PERIOD}</th>
              <th scope="col" className="px-2 text-right font-normal">{UI.COL_AMOUNT}</th>
              <th scope="col" className="px-2 font-normal">{UI.COL_ORIGIN}</th>
              <th scope="col" className="px-2 font-normal">{UI.COL_SOURCE}</th>
            </tr>
          </thead>
          <tbody>
            {reader.metrics.map((m) => {
              const src = sources.get(m.sourceId);
              return (
                <tr key={m.id} id={evidenceAnchor(evidencePrefix, m.id)} data-metric={m.id} className="scroll-mt-8 border-b border-term-line-soft align-top">
                  <td className="px-2 py-1.5 text-term-fg-strong">
                    {metricMeasureLabel(m)}
                    {m.basis && <span className="block text-xs text-term-label">{m.basis}</span>}
                  </td>
                  <td className="px-2 py-1.5 text-term-fg">
                    {m.period}
                    {m.statedAt && !m.period.includes(m.statedAt) && <span className="block text-xs text-term-label">{m.statedAt} {UI.METRIC_STATED_AT_SUFFIX}</span>}
                  </td>
                  <td className={`term-num px-2 py-1.5 text-right ${m.origin === 'ESTIMATED' ? 'text-term-accent' : 'text-term-fg-strong'}`}>{formatMetricAmount(m)}</td>
                  <td className={`px-2 py-1.5 text-xs ${m.origin === 'ESTIMATED' ? 'text-term-accent' : 'text-term-muted'}`}>{metricOriginLabel(m)}</td>
                  <td className="px-2 py-1.5 text-xs text-term-label">{src?.publisher}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ReaderSection>
  );
}

/** 事実を種類ごとに。各事実の後ろに出典名を小さく付ける。概要の事実は上で出すので除く。 */
export function ReaderFacts({ reader, evidencePrefix = 'reader' }: ReaderProps) {
  if (!reader) return null;
  const sources = sourceMap(reader);
  return (
    <>
      {FACT_SECTIONS.map(({ kind, title }) => {
        const facts: ReaderFact[] = reader.facts.filter((f) => f.kind === kind && f.id !== reader.summaryFactId);
        return (
          <ReaderSection key={kind} id={`section-facts-${kind.toLowerCase()}`} title={title} empty={facts.length === 0}>
            <ul className="divide-y divide-term-line-soft">
              {facts.map((f) => (
                <li key={f.id} id={evidenceAnchor(evidencePrefix, f.id)} data-fact={f.id} className="scroll-mt-8 py-1.5 leading-relaxed text-term-fg">
                  {f.text}
                  {sources.get(f.sourceId) && (
                    <span className="ml-1.5 text-xs text-term-label">{sources.get(f.sourceId)?.publisher}</span>
                  )}
                </li>
              ))}
            </ul>
          </ReaderSection>
        );
      })}
    </>
  );
}

function AnalysisEntry({ analysis, reader, evidencePrefix, headline = false }: {
  analysis: ReaderAnalysis;
  reader: ReaderCase;
  evidencePrefix: string;
  headline?: boolean;
}) {
  return (
    <div data-analysis={analysis.id} className="min-w-0 py-2 [overflow-wrap:anywhere]">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        {!headline && <h4 className="text-term-label">{ANALYSIS_LABELS[analysis.item]}</h4>}
        <span className="text-term-accent">{UI.ANALYSIS_MARK}</span>
        <span className="text-term-label">{UI.ANALYSIS_CONFIDENCE_PREFIX}{CONFIDENCE_LABELS[analysis.confidence]}</span>
      </div>
      {headline ? (
        <h3 className="text-lg font-semibold leading-relaxed text-term-fg-strong">{analysis.text}</h3>
      ) : (
        <p className="whitespace-pre-line text-sm leading-relaxed text-term-fg lg:text-[13px]">{analysis.text}</p>
      )}
      {analysis.formula && (
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-term-sub lg:text-[13px]">
          <span className="text-term-label">{UI.ANALYSIS_FORMULA_PREFIX}</span>{analysis.formula}
        </p>
      )}
      {analysis.basis.length > 0 && (
        <div className="mt-1 text-xs text-term-label">
          <span>{UI.ANALYSIS_BASIS_PREFIX}</span>
          <ul className="min-w-0">
            {analysis.basis.map((id) => {
              const fact = reader.facts.find((f) => f.id === id);
              const metric = reader.metrics.find((m) => m.id === id);
              const label = fact?.text ?? (metric && `${metricMeasureLabel(metric)} ${metric.period} ${formatMetricAmount(metric)}`);
              if (!label) return null;
              return (
                <li key={id}>
                  <a href={`#${encodeURIComponent(evidenceAnchor(evidencePrefix, id))}`} className="inline-flex min-h-11 min-w-6 max-w-full items-center py-1 text-term-sub underline underline-offset-2 hover:text-term-fg-strong lg:min-h-6">
                    {label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 強い一行と物語。推論である印はそれぞれに付ける。 */
export function ReaderAnalysisIntro({ reader, evidencePrefix = 'reader' }: ReaderProps) {
  if (!reader) return null;
  const intro = ['HEADLINE', 'STORY'].flatMap((item) => reader.analysis.filter((a) => a.item === item));
  if (intro.length === 0) return null;
  return (
    <div className="min-w-0 border-b border-term-line px-2.5 py-1 sm:px-3">
      {intro.map((a) => <AnalysisEntry key={a.id} analysis={a} reader={reader} evidencePrefix={evidencePrefix} headline={a.item === 'HEADLINE'} />)}
    </div>
  );
}

/** 残りの推論をスキーマの項目順に。事実の区画とは分けて出す。 */
export function ReaderAnalyses({ reader, evidencePrefix = 'reader' }: ReaderProps) {
  if (!reader) return null;
  const analysis = ANALYSIS_ITEMS.filter((item) => item !== 'HEADLINE' && item !== 'STORY')
    .flatMap((item) => reader.analysis.filter((a) => a.item === item));
  return (
    <ReaderSection id="section-analysis" title={UI.SECTION_ANALYSIS} empty={analysis.length === 0}>
      <div className="min-w-0 divide-y divide-term-line-soft">
        {analysis.map((a) => <AnalysisEntry key={a.id} analysis={a} reader={reader} evidencePrefix={evidencePrefix} />)}
      </div>
    </ReaderSection>
  );
}

/** 出典: 出版元・題名・日付・リンク。重複は1つ。 */
export function ReaderSources({ reader }: { reader?: ReaderCase }) {
  if (!reader) return null;
  const sources = dedupeReaderSources(reader.sources);
  return (
    <ReaderSection id="section-sources" title={UI.SECTION_SOURCES} empty={sources.length === 0}>
      <ul className="divide-y divide-term-line-soft">
        {sources.map((s) => (
          <li key={s.id} data-source={s.id} className="py-1.5 leading-relaxed text-term-fg">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-6 items-center text-term-fg underline underline-offset-2 hover:text-term-fg-strong">
              {s.publisher}
              {s.title ? ` ${s.title}` : ''}
            </a>
            {(s.publishedAt ?? s.checkedAt) && (
              <span className="ml-1.5 text-xs text-term-label">{s.publishedAt ?? s.checkedAt}</span>
            )}
          </li>
        ))}
      </ul>
    </ReaderSection>
  );
}

/** 未確認の1行: 「未確認: 売上・利益」。 */
export function ReaderUnknowns({ reader }: { reader?: ReaderCase }) {
  if (!reader || reader.unknowns.length === 0) return null;
  const line = `${UI.UNKNOWN_PREFIX}${reader.unknowns.map((u) => UNKNOWN_LABELS[u]).join(UI.UNKNOWN_JOINER)}`;
  return <p className="border-b border-term-line px-2.5 py-2 text-xs text-term-dim sm:px-3">{line}</p>;
}

/** 詳細画面（台帳タブ）の中身。reader だけを読む。screen-text の検査も同じ部品を描く。 */
export function ReaderLedger({ reader }: { reader?: ReaderCase }) {
  const evidencePrefix = `reader-${useId()}`;
  if (!reader) return <p className="px-2.5 py-3 text-sm text-term-muted sm:px-3">{UI.NO_READER}</p>;
  return (
    <>
      <ReaderAnalysisIntro reader={reader} evidencePrefix={evidencePrefix} />
      <ReaderSummary reader={reader} evidencePrefix={evidencePrefix} />
      <ReaderMetrics reader={reader} evidencePrefix={evidencePrefix} />
      <ReaderFacts reader={reader} evidencePrefix={evidencePrefix} />
      <ReaderAnalyses reader={reader} evidencePrefix={evidencePrefix} />
      <ReaderSources reader={reader} />
      <ReaderUnknowns reader={reader} />
    </>
  );
}
