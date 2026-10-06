import React, { useId } from 'react';

import { ANALYSIS_ITEMS, type ReaderCase, type ReaderFact } from '@/shared/reader-case';
import {
  dedupeReaderSources,
  formatMetricAmount,
  metricMeasureLabel,
  metricOriginLabel,
  plainFactText,
  readerSummaryFact,
} from '@/shared/display-text';
import { ANALYSIS_LABELS, FACT_SECTIONS, UI, UNKNOWN_LABELS } from '@/shared/ui-strings';
import { AnalysisGroups, Headline, KeyStrip, planKeyStrip, StorySteps } from './ReaderOverview';
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
                    {metricMeasureLabel(m)}
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

/** 事実を種類ごとに。出典は番号だけ付け、中身は下の一覧にまとめる。概要の事実は上で出すので除く。 */
export function ReaderFacts({ reader, evidencePrefix = 'reader', exclude }: ReaderProps & { exclude?: Set<string> }) {
  if (!reader) return null;
  const sourceNo = sourceNumbers(reader);
  return (
    <>
      {FACT_SECTIONS.map(({ kind, title }) => {
        const facts: ReaderFact[] = reader.facts.filter((f) => f.kind === kind && f.id !== reader.summaryFactId && !exclude?.has(f.id));
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

/** 推測の計算と根拠。結論を読む邪魔にならないよう、ページの下に1か所でまとめる。根拠の事実は番号を振って1回だけ出す。 */
export function ReaderEvidence({ reader, evidencePrefix = 'reader' }: ReaderProps) {
  if (!reader) return null;
  const basisLabel = (id: string) => {
    const fact = reader.facts.find((f) => f.id === id);
    const metric = reader.metrics.find((m) => m.id === id);
    if (fact) return fact.text;
    if (!metric) return undefined;
    return [metricMeasureLabel(metric), metric.period, formatMetricAmount(metric), metricOriginLabel(metric), metric.basis].filter(Boolean).join(' ');
  };
  const rows = ANALYSIS_ITEMS.flatMap((item) => reader.analysis.filter((a) => a.item === item))
    .map((a) => ({ a, basis: a.basis.filter((id) => basisLabel(id)) }))
    .filter(({ a, basis }) => a.formula || basis.length > 0);
  const used = [...new Set(rows.flatMap(({ basis }) => basis))];
  const no = (id: string) => used.indexOf(id) + 1;
  const anchor = (id: string) => evidenceAnchor(evidencePrefix, `basis-${id}`);
  return (
    <ReaderSection id="section-reasoning" title={UI.SECTION_EVIDENCE} empty={rows.length === 0}>
      <ul className="min-w-0 divide-y divide-term-line-soft text-xs [overflow-wrap:anywhere]">
        {rows.map(({ a, basis }) => (
          <li key={a.id} data-evidence={a.id} className="py-1 leading-relaxed">
            <div className="flex flex-wrap items-center gap-x-3">
              <span className="text-term-label">{ANALYSIS_LABELS[a.item]}</span>
              {basis.length > 0 && (
                <span className="flex flex-wrap items-center gap-x-1 text-term-label">
                  <span>{UI.ANALYSIS_BASIS_PREFIX}</span>
                  {basis.map((id) => (
                    <a key={id} href={`#${encodeURIComponent(anchor(id))}`} className="inline-flex min-h-11 min-w-6 items-center justify-center text-term-sub underline underline-offset-2 hover:text-term-fg-strong lg:min-h-6">
                      {no(id)}
                    </a>
                  ))}
                </span>
              )}
            </div>
            {a.formula && (
              <p className="whitespace-pre-line text-term-sub">
                <span className="text-term-label">{UI.ANALYSIS_FORMULA_PREFIX}</span>{a.formula}
              </p>
            )}
          </li>
        ))}
      </ul>
      {used.length > 0 && (
        <ol data-evidence="basis" className="mt-1 border-t border-term-line-soft pt-1 text-xs leading-relaxed text-term-sub [overflow-wrap:anywhere]">
          {used.map((id) => (
            <li key={id} id={anchor(id)} className="flex scroll-mt-8 gap-2 py-0.5">
              <span className="term-num shrink-0 text-term-label">{no(id)}</span>
              <span className="min-w-0">{basisLabel(id)}</span>
            </li>
          ))}
        </ol>
      )}
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

/** 未確認の1行: 「未確認: 売上・利益」。 */
export function ReaderUnknowns({ reader }: { reader?: ReaderCase }) {
  if (!reader || reader.unknowns.length === 0) return null;
  const line = `${UI.UNKNOWN_PREFIX}${reader.unknowns.map((u) => UNKNOWN_LABELS[u]).join(UI.UNKNOWN_JOINER)}`;
  return <p className="border-b border-term-line px-2.5 py-2 text-xs text-term-dim sm:px-3">{line}</p>;
}

/** 詳細画面（台帳タブ）の中身。reader だけを読む。screen-text の検査も同じ部品を描く。 */
export function ReaderLedger({ reader, detailState, onRetry, media }: {
  reader?: ReaderCase;
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
  const hasDetails = reader.metrics.length > 0 || reader.sources.length > 0 || reader.analysis.some((a) => a.formula || a.basis.length > 0);
  // 並び: 結論 → 概要 → 主要な数字 → 製品画面 → 物語 → 推測（4つの問い） → 事実 → 根拠・出典・数値の一覧（畳む）
  return (
    <>
      {status}
      <Headline reader={reader} tight={Boolean(readerSummaryFact(reader))} />
      <ReaderSummary reader={reader} evidencePrefix={evidencePrefix} />
      <KeyStrip reader={reader} plan={plan} />
      {media}
      <StorySteps reader={reader} />
      <AnalysisGroups reader={reader} usage={plan.usage} />
      <ReaderFacts reader={reader} evidencePrefix={evidencePrefix} exclude={plan.usage.factIds} />
      {hasDetails && <details className="group border-b border-term-line">
        <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 bg-term-head px-2.5 text-xs text-term-sub hover:text-term-fg-strong sm:px-3 [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="inline-block h-0 w-0 border-y-[4px] border-l-[5px] border-y-transparent border-l-current transition-transform group-open:rotate-90" />
          <span>{UI.SECTION_DETAILS}</span>
        </summary>
        <ReaderMetrics reader={reader} evidencePrefix={evidencePrefix} />
        <ReaderEvidence reader={reader} evidencePrefix={evidencePrefix} />
        <ReaderSources reader={reader} evidencePrefix={evidencePrefix} />
      </details>}
      <ReaderUnknowns reader={reader} />
    </>
  );
}
