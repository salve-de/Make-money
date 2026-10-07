import React, { useId } from 'react';

import { ANALYSIS_ITEMS, type ReaderCase, type ReaderFact } from '@/shared/reader-case';
import {
  dedupeReaderSources,
  formatMetricAmount,
  metricListLabel,
  metricOriginLabel,
  plainFactText,
  readerSummaryFact,
} from '@/shared/display-text';
import { createSentenceMemory, splitSentences } from '@/shared/case-text';
import { ANALYSIS_LABELS, FACT_SECTIONS, UI } from '@/shared/ui-strings';
import { AnalysisGroups, Fold, Headline, headlineOf, KeyStrip, planKeyStrip, SectionGap, WhatIs } from './ReaderOverview';
import { ReaderSection } from './ReaderSection';

type ReaderProps = { reader?: ReaderCase; evidencePrefix?: string };
const evidenceAnchor = (prefix: string, id: string) => `${prefix}-evidence-${encodeURIComponent(id)}`;
const sourceAnchor = (prefix: string, n: number) => `${prefix}-source-${n}`;

/** sourceId → 下の出典一覧での番号（重複をまとめた後の並び）。 */
function sourceNumbers(reader: ReaderCase): Map<string, number> {
  const list = dedupeReaderSources(reader.sources);
  const key = (url: string) => url.replace(/#.*$/, '').replace(/\/$/, '');
  const byKey = new Map(list.map((s, i) => [key(s.url), i + 1]));
  return new Map(reader.sources.map((s) => [s.id, byKey.get(key(s.url)) ?? 0]));
}

/** 事実・数値の後ろに付ける小さい出典番号。押すと下の出典一覧へ飛ぶ。 */
function SourceRef({ n, prefix }: { n?: number; prefix: string }) {
  if (!n) return null;
  return (
    <a href={`#${sourceAnchor(prefix, n)}`} className="ml-1 inline-flex min-h-6 min-w-6 items-center justify-center align-baseline text-xs text-term-label underline underline-offset-2 hover:text-term-fg-strong">
      {n}
    </a>
  );
}

/** 概要の1行（summaryFactId の事実）。無ければ出さない。 */
export function ReaderSummary({ reader, evidencePrefix = 'reader' }: ReaderProps) {
  const fact = readerSummaryFact(reader);
  if (!reader || !fact) return null;
  return (
    <p id={evidenceAnchor(evidencePrefix, fact.id)} data-fact={fact.id} className="scroll-mt-8 border-b border-term-line px-2.5 pb-3 pt-0 text-sm leading-relaxed text-term-sub sm:px-3 lg:text-[13px]">
      {plainFactText(fact.text)}
    </p>
  );
}

/** 数値の表。列は 項目・期間・金額・由来。出典は番号だけ付け、中身は下の一覧にまとめる。 */
export function ReaderMetrics({ reader, evidencePrefix = 'reader' }: ReaderProps) {
  if (!reader) return null;
  const sourceNo = sourceNumbers(reader);
  return (
    <ReaderSection id="section-metrics" title={UI.SECTION_METRICS} empty={reader.metrics.length === 0}>
      {/* 狭い画面では横に送る。キーボードでも送れるようにフォーカスを受ける */}
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={UI.SECTION_METRICS}>
        <table className="w-full min-w-[400px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="h-[26px] border-b border-term-line bg-term-head text-xs text-term-label">
              <th scope="col" className="px-2 font-normal">{UI.COL_MEASURE}</th>
              <th scope="col" className="px-2 font-normal">{UI.COL_PERIOD}</th>
              <th scope="col" className="px-2 text-right font-normal">{UI.COL_AMOUNT}</th>
              <th scope="col" className="px-2 font-normal">{UI.COL_ORIGIN}</th>
            </tr>
          </thead>
          <tbody>
            {reader.metrics.map((m) => {
              return (
                <tr key={m.id} id={evidenceAnchor(evidencePrefix, m.id)} data-metric={m.id} className="scroll-mt-8 border-b border-term-line-soft align-top">
                  <td className="px-2 py-1.5 text-term-fg-strong">
                    {metricListLabel(m)}
                    <SourceRef n={sourceNo.get(m.sourceId)} prefix={evidencePrefix} />
                    {m.basis && <span className="block text-xs text-term-label">{m.basis}</span>}
                  </td>
                  <td className="px-2 py-1.5 text-term-fg">
                    {m.period}
                    {m.statedAt && !m.period.includes(m.statedAt) && <span className="block text-xs text-term-label">{m.statedAt} {UI.METRIC_STATED_AT_SUFFIX}</span>}
                  </td>
                  <td className={`term-num px-2 py-1.5 text-right ${m.origin === 'ESTIMATED' ? 'text-term-accent' : 'text-term-fg-strong'}`}>{formatMetricAmount(m)}</td>
                  <td className={`px-2 py-1.5 text-xs ${m.origin === 'ESTIMATED' ? 'text-term-accent' : 'text-term-muted'}`}>{metricOriginLabel(m)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ReaderSection>
  );
}

/** 概要と、先に出す事実に書いた文と同じ内容しか言っていない事実は、2回出さない（文が全部出済みの事実だけを除く）。 */
function newFactIds(reader: ReaderCase): Set<string> {
  const memory = createSentenceMemory();
  const summary = readerSummaryFact(reader);
  if (summary) splitSentences(plainFactText(summary.text)).forEach((sentence) => memory.take(sentence));
  const keep = new Set<string>();
  for (const fact of reader.facts) {
    const sentences = splitSentences(plainFactText(fact.text));
    const fresh = sentences.filter((sentence) => memory.take(sentence));
    if (fresh.length > 0) keep.add(fact.id);
  }
  return keep;
}

/** 事実を種類ごとに。出典は番号だけ付け、中身は下の一覧にまとめる。概要の事実は上で出すので除く。 */
export function ReaderFacts({ reader, evidencePrefix = 'reader', exclude }: ReaderProps & { exclude?: Set<string> }) {
  if (!reader) return null;
  const sourceNo = sourceNumbers(reader);
  const fresh = newFactIds(reader);
  return (
    <>
      {FACT_SECTIONS.map(({ kind, title }) => {
        const facts: ReaderFact[] = reader.facts.filter((f) => f.kind === kind && f.id !== reader.summaryFactId && !exclude?.has(f.id) && fresh.has(f.id));
        return (
          <ReaderSection key={kind} id={`section-facts-${kind.toLowerCase()}`} title={title} empty={facts.length === 0}>
            <ul className="divide-y divide-term-line-soft">
              {facts.map((f) => (
                <li key={f.id} id={evidenceAnchor(evidencePrefix, f.id)} data-fact={f.id} className="scroll-mt-8 py-1.5 leading-relaxed text-term-fg">
                  {plainFactText(f.text)}
                  <SourceRef n={sourceNo.get(f.sourceId)} prefix={evidencePrefix} />
                </li>
              ))}
            </ul>
          </ReaderSection>
        );
      })}
    </>
  );
}

/** 推定の計算と前提。式のある項目だけを出す（「数字は出典に載っている値」のような式でない定型文と、事実の再掲は出さない）。 */
const BOILERPLATE_FORMULA = /^数字は出典に載っている値$/;
export function ReaderEvidence({ reader }: ReaderProps) {
  if (!reader) return null;
  const rows = ANALYSIS_ITEMS.flatMap((item) => reader.analysis.filter((a) => a.item === item))
    .filter((a) => a.formula && !BOILERPLATE_FORMULA.test(a.formula.trim()));
  return (
    <ReaderSection id="section-reasoning" title={UI.SECTION_EVIDENCE} empty={rows.length === 0}>
      <ul className="min-w-0 divide-y divide-term-line-soft text-xs [overflow-wrap:anywhere]">
        {rows.map((a) => (
          <li key={a.id} data-evidence={a.id} className="py-1.5 leading-relaxed">
            <span className="block text-term-label">{ANALYSIS_LABELS[a.item]}</span>
            <p className="whitespace-pre-line text-term-sub">{a.formula}</p>
          </li>
        ))}
      </ul>
    </ReaderSection>
  );
}

/** 出典: 出版元・題名・日付・リンク。重複は1つ。 */
export function ReaderSources({ reader, evidencePrefix = 'reader' }: ReaderProps) {
  if (!reader) return null;
  const sources = dedupeReaderSources(reader.sources);
  return (
    <ReaderSection id="section-sources" title={UI.SECTION_SOURCES} empty={sources.length === 0}>
      <ul className="divide-y divide-term-line-soft">
        {sources.map((s, i) => (
          <li key={s.id} id={sourceAnchor(evidencePrefix, i + 1)} data-source={s.id} className="flex scroll-mt-8 gap-2 py-1.5 leading-relaxed text-term-fg">
            <span className="term-num shrink-0 text-xs text-term-label">{i + 1}</span>
            <span className="min-w-0">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-6 items-center text-term-fg underline underline-offset-2 hover:text-term-fg-strong">
              {s.publisher}
              {s.title ? ` ${s.title}` : ''}
            </a>
            {(s.publishedAt ?? s.checkedAt) && (
              <span className="ml-1.5 text-xs text-term-label">{s.publishedAt ?? s.checkedAt}</span>
            )}
            </span>
          </li>
        ))}
      </ul>
    </ReaderSection>
  );
}

/** 詳細画面（台帳タブ）の中身。reader だけを読む。screen-text の検査も同じ部品を描く。 */
export function ReaderLedger({ reader, entityId, detailState, onRetry, media }: {
  reader?: ReaderCase;
  /** 一覧と同じ短い1行を概要に使うための事例の番号 */
  entityId?: string;
  /** 詳細の取得状態。取得中・失敗を「準備中」と取り違えて出さないために使う */
  detailState?: 'loading' | 'failed';
  onRetry?: () => void;
  /** 製品画面。主要な数字の直後に置く */
  media?: React.ReactNode;
}) {
  const evidencePrefix = `reader-${useId()}`;
  // 一覧用に削った reader（listForm）は詳細の代わりにならない。完全な reader が無い間は取得状態を出す
  const incomplete = !reader || Boolean(reader.listForm);
  const status = incomplete && detailState === 'failed' ? (
    <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-term-line px-2.5 py-3 text-sm text-term-muted sm:px-3">
      <span>{UI.DETAIL_LOAD_FAILED}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="min-h-11 rounded-sm border border-term-line px-3 text-sm text-term-sub hover:border-term-accent-line hover:text-term-accent lg:min-h-8">
          {UI.DETAIL_RELOAD}
        </button>
      )}
    </div>
  ) : incomplete && detailState === 'loading' ? (
    <p role="status" className="border-b border-term-line px-2.5 py-3 text-sm text-term-muted sm:px-3">{UI.DETAIL_LOADING}</p>
  ) : null;
  if (!reader && status) return status;
  if (!reader) return <p className="px-2.5 py-3 text-sm text-term-muted sm:px-3">{UI.NO_READER}</p>;
  const plan = planKeyStrip(reader);
  const summary = readerSummaryFact(reader);
  const hasDetails = reader.facts.length > 0 || reader.metrics.length > 0 || reader.sources.length > 0 || reader.analysis.some((a) => a.formula);
  // 並び: 何の事業か → 製品画面（横に送る。開いてすぐ見える位置） → 主要な数字 → ひとこと → 目次 → 稼ぎ方・客・強み・経緯（畳む） → 出典つきの事実・数値（畳む）
  return (
    <>
      {status}
      <Headline reader={reader} entityId={entityId} />
      <WhatIs fact={summary} entityId={entityId} lead={!headlineOf(reader)} />
      <KeyStrip reader={reader} plan={plan} />
      {media}
      {(hasDetails || reader.analysis.some((a) => a.item !== 'HEADLINE')) && <SectionGap />}
      {reader.analysis.some((a) => a.item !== 'HEADLINE') && (
        <div id="section-analysis" data-section="section-analysis" className="scroll-mt-8">
          <AnalysisGroups reader={reader} usage={plan.usage} entityId={entityId} />
        </div>
      )}
      {hasDetails && (
        <Fold id="section-details" title={UI.SECTION_DETAILS}>
          <ReaderFacts reader={reader} evidencePrefix={evidencePrefix} exclude={new Set([...plan.usage.factIds, ...(summary ? [summary.id] : [])])} />
          <ReaderMetrics reader={reader} evidencePrefix={evidencePrefix} />
          <ReaderEvidence reader={reader} evidencePrefix={evidencePrefix} />
          <ReaderSources reader={reader} evidencePrefix={evidencePrefix} />
        </Fold>
      )}
    </>
  );
}
