import React, { useId } from 'react';

import { ANALYSIS_ITEMS, type ReaderAnalysis, type ReaderCase } from '@/shared/reader-case';
import {
  dedupeReaderSources,
  formatMetricAmount,
  metricMeasureLabel,
  metricOriginLabel,
  readerSummaryFact,
} from '@/shared/display-text';
import { ANALYSIS_LABELS, FACT_SECTIONS, STORY_STAGE_LABELS, UI } from '@/shared/ui-strings';
import { analysisChapters, barRatio, displayFactKind, keyMetrics, splitStory } from '@/shared/reader-display-model';
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

/** 棒の幅（%）。0 は 0、それ以外は最低2%で見えるようにする。 */
const barWidthPercent = (ratio: number): number => (ratio <= 0 ? 0 : Math.max(2, Math.round(ratio * 100)));

/** 推論である印。事実と見分けるため小さく薄い灰色で添える。 */
function InferenceMark() {
  return <span className="ml-1.5 whitespace-nowrap text-xs text-term-label">{UI.ANALYSIS_MARK}</span>;
}

/** 冒頭の強い一行（推測の印つき）。無ければ出さない。 */
export function ReaderAnalysisIntro({ reader }: { reader?: ReaderCase }) {
  const headline = reader?.analysis.find((a) => a.item === 'HEADLINE');
  if (!reader || !headline) return null;
  return (
    <div data-analysis={headline.id} className="min-w-0 border-b border-term-line px-2.5 pb-1 pt-3 sm:px-3 [overflow-wrap:anywhere]">
      <h3 className="text-lg font-semibold leading-snug text-term-fg-strong">
        {headline.text}
        <InferenceMark />
      </h3>
    </div>
  );
}

/** 概要の1行（summaryFactId の事実）。無ければ出さない。 */
export function ReaderSummary({ reader, evidencePrefix = 'reader' }: ReaderProps) {
  const fact = readerSummaryFact(reader);
  if (!reader || !fact) return null;
  return (
    <p id={evidenceAnchor(evidencePrefix, fact.id)} data-fact={fact.id} className="scroll-mt-8 border-b border-term-line px-2.5 py-2 text-sm leading-relaxed text-term-fg sm:px-3">
      {fact.text}
    </p>
  );
}

/** 物語。前夜・隙・突破・金が回る仕組みの段に分けられる時は段ごとに、そうでなければ1つの段落で。 */
export function ReaderStory({ reader }: { reader?: ReaderCase }) {
  const story = reader?.analysis.find((a) => a.item === 'STORY');
  if (!reader || !story) return null;
  const stages = splitStory(story.text);
  const labelOf: Record<string, string> = {
    前夜: STORY_STAGE_LABELS.prelude,
    隙: STORY_STAGE_LABELS.gap,
    突破: STORY_STAGE_LABELS.breakthrough,
    金が回る仕組み: STORY_STAGE_LABELS.engine,
  };
  return (
    <div data-analysis={story.id} className="min-w-0 border-b border-term-line px-2.5 py-1.5 sm:px-3 [overflow-wrap:anywhere]">
      {stages.length > 0 ? (
        <dl className="m-0">
          {stages.map((st) => (
            <div key={st.stage} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 border-b border-dashed border-term-line-soft py-1.5 last:border-b-0 sm:grid-cols-[7rem_minmax(0,1fr)]">
              <dt className="text-xs leading-6 text-term-label">{labelOf[st.stage] ?? st.stage}</dt>
              <dd className="m-0 text-sm leading-relaxed text-term-fg lg:text-[13px]">
                {st.text}
                <InferenceMark />
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="whitespace-pre-line py-1 text-sm leading-relaxed text-term-fg lg:text-[13px]">
          {story.text}
          <InferenceMark />
        </p>
      )}
    </div>
  );
}

/** 数値。上に主要な数字の帯、下に全件の表。棒は同じ種類の中での大きさ（数値と同じ値から描く）。 */
export function ReaderMetrics({ reader, evidencePrefix = 'reader' }: ReaderProps) {
  if (!reader) return null;
  const sourceNo = sourceNumbers(reader);
  const key = keyMetrics(reader);
  return (
    <ReaderSection id="section-metrics" title={UI.SECTION_METRICS} empty={reader.metrics.length === 0}>
      <ul className="m-0 grid list-none grid-cols-1 gap-y-1 p-0 sm:grid-cols-3">
        {key.map((m) => (
          <li key={m.id} data-metric={m.id} className={`min-w-0 border-l px-3 py-1 ${m.origin === 'ESTIMATED' ? 'border-dashed border-term-label' : 'border-term-line'}`}>
            <div className="text-xs text-term-label">{metricMeasureLabel(m)}</div>
            <div className="term-num text-xl font-semibold text-term-fg-strong">
              {formatMetricAmount(m)}
              {m.origin === 'ESTIMATED' && <span className="ml-1.5 font-sans text-xs font-normal text-term-label">{metricOriginLabel(m)}</span>}
            </div>
            <div className="text-xs text-term-label">
              {m.period}
              {m.origin !== 'ESTIMATED' && <> · {metricOriginLabel(m)}</>}
              <SourceRef n={sourceNo.get(m.sourceId)} prefix={evidencePrefix} />
            </div>
            {m.basis && <div className="text-xs text-term-label">{m.basis}</div>}
          </li>
        ))}
      </ul>
      {reader.metrics.length > key.length && (
        // 狭い画面では横に送る。キーボードでも送れるようにフォーカスを受ける
        <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label={UI.SECTION_METRICS_DETAIL}>
          <table className="w-full min-w-[400px] border-collapse text-left text-sm lg:text-[13px]">
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
                const estimated = m.origin === 'ESTIMATED';
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
                    <td className="term-num px-2 py-1.5 text-right text-term-fg-strong">
                      {formatMetricAmount(m)}
                      <span aria-hidden="true" className="ml-auto mt-1 block h-1.5 w-full max-w-24">
                        <span
                          className={`block h-full ${estimated ? 'border border-dashed border-term-label' : 'bg-term-label'}`}
                          style={{ width: `${barWidthPercent(barRatio(m, reader.metrics))}%`, marginLeft: 'auto' }}
                        />
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-xs text-term-label">{metricOriginLabel(m)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ReaderSection>
  );
}

/** 推論1件。項目名と結論。点線の左線＋「推測」の薄い印で、実線の事実と見分ける。計算と根拠は下の ReaderEvidence に1か所でまとめる。 */
function AnalysisEntry({ analysis }: { analysis: ReaderAnalysis }) {
  return (
    <div data-analysis={analysis.id} className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 border-b border-term-line-soft py-1.5 last:border-b-0 sm:grid-cols-[7rem_minmax(0,1fr)] [overflow-wrap:anywhere]">
      <h4 className="text-xs font-normal leading-6 text-term-label">{ANALYSIS_LABELS[analysis.item]}</h4>
      <p className="m-0 whitespace-pre-line border-l border-dashed border-term-line pl-2 text-sm leading-relaxed text-term-fg lg:text-[13px]">
        {analysis.text}
        <InferenceMark />
      </p>
    </div>
  );
}

/** 推論を章ごとに。材料のある章だけ出す（章は事例ごとに違ってよい）。 */
export function ReaderAnalyses({ reader }: { reader?: ReaderCase }) {
  if (!reader) return null;
  return (
    <>
      {analysisChapters(reader).map((chapter) => (
        <ReaderSection key={chapter.id} id={`section-analysis-${chapter.id}`} title={chapter.title} empty={chapter.entries.length === 0}>
          <div className="min-w-0">
            {chapter.entries.map((a) => <AnalysisEntry key={a.id} analysis={a} />)}
          </div>
        </ReaderSection>
      ))}
    </>
  );
}

/** 事実を種類ごとの2列（項目名・事実）で。出典は番号だけ付ける。概要の事実は上で出すので除く。種類と本文が食い違う事実は「その他」に置く。 */
export function ReaderFacts({ reader, evidencePrefix = 'reader' }: ReaderProps) {
  if (!reader) return null;
  const sourceNo = sourceNumbers(reader);
  const rows = FACT_SECTIONS.map(({ kind, title }) => ({
    kind,
    title,
    facts: reader.facts.filter((f) => f.id !== reader.summaryFactId && displayFactKind(f) === kind),
  })).filter((r) => r.facts.length > 0);
  return (
    <ReaderSection id="section-facts" title={UI.SECTION_FACTS} empty={rows.length === 0}>
      <div>
        {rows.map(({ kind, title, facts }) => (
          <div key={kind} data-facts-kind={kind} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 border-b border-term-line-soft py-1.5 last:border-b-0 sm:grid-cols-[7rem_minmax(0,1fr)]">
            <h4 className="text-xs font-normal leading-6 text-term-label">{title}</h4>
            <ul className="m-0 list-none p-0">
              {facts.map((f) => (
                <li key={f.id} id={evidenceAnchor(evidencePrefix, f.id)} data-fact={f.id} className="scroll-mt-8 py-0.5 text-sm leading-relaxed text-term-fg lg:text-[13px]">
                  {f.text}
                  <SourceRef n={sourceNo.get(f.sourceId)} prefix={evidencePrefix} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ReaderSection>
  );
}

/** 推測の計算と根拠。結論を読む邪魔にならないよう、ページの下に1か所でまとめる。根拠の事実は番号を振って1回だけ出す。必要な人だけ開く。 */
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
  if (rows.length === 0) return null;
  const used = [...new Set(rows.flatMap(({ basis }) => basis))];
  const no = (id: string) => used.indexOf(id) + 1;
  const anchor = (id: string) => evidenceAnchor(evidencePrefix, `basis-${id}`);
  return (
    <section id="section-reasoning" data-section="section-reasoning" className="scroll-mt-8 border-b border-term-line">
      <details>
        <summary className="term-panel-title flex min-h-11 cursor-pointer items-center lg:min-h-6">
          <h3 className="term-panel-name truncate">{UI.SECTION_EVIDENCE}</h3>
        </summary>
        <div className="px-2.5 py-1.5 sm:px-3">
          <ul className="min-w-0 list-none divide-y divide-term-line-soft p-0 text-xs [overflow-wrap:anywhere]">
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
            <ol data-evidence="basis" className="mt-1 list-none border-t border-term-line-soft p-0 pt-1 text-xs leading-relaxed text-term-sub [overflow-wrap:anywhere]">
              {used.map((id) => (
                <li key={id} id={anchor(id)} className="flex scroll-mt-8 gap-2 py-0.5">
                  <span className="term-num shrink-0 text-term-label">{no(id)}</span>
                  <span className="min-w-0">{basisLabel(id)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </details>
    </section>
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

/** 詳細画面（台帳タブ）の中身。reader だけを読む。screen-text の検査も同じ部品を描く。
 * 並びは 強い一行・概要・小さな製品画像（media）・数字・物語・章・事実・計算と根拠・出典。 */
export function ReaderLedger({ reader, detailState, onRetry, media }: {
  reader?: ReaderCase;
  /** 詳細の取得状態。取得中・失敗を「準備中」と取り違えて出さないために使う */
  detailState?: 'loading' | 'failed';
  onRetry?: () => void;
  /** 冒頭に並べる小さな製品画面・アイコン（画像が無ければ何も出ない部品を渡す） */
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
    <ReaderSkeleton />
  ) : null;
  if (!reader && status) return status;
  if (!reader) return <p className="px-2.5 py-3 text-sm text-term-muted sm:px-3">{UI.NO_READER}</p>;
  return (
    <>
      {status}
      <ReaderAnalysisIntro reader={reader} />
      <ReaderSummary reader={reader} evidencePrefix={evidencePrefix} />
      {media}
      <ReaderMetrics reader={reader} evidencePrefix={evidencePrefix} />
      <ReaderStory reader={reader} />
      <ReaderAnalyses reader={reader} />
      <ReaderFacts reader={reader} evidencePrefix={evidencePrefix} />
      <ReaderEvidence reader={reader} evidencePrefix={evidencePrefix} />
      <ReaderSources reader={reader} evidencePrefix={evidencePrefix} />
    </>
  );
}

/** 詳細を読み込んでいる間の骨格（行の形だけ。文字は「読み込んでいます」の1行）。 */
function ReaderSkeleton() {
  return (
    <div role="status" aria-live="polite" className="border-b border-term-line px-2.5 py-3 sm:px-3">
      <p className="mb-2 text-sm text-term-muted">{UI.DETAIL_LOADING}</p>
      <div aria-hidden="true" className="space-y-2">
        <div className="h-5 w-4/5 bg-term-head" />
        <div className="h-4 w-full bg-term-head" />
        <div className="h-4 w-3/5 bg-term-head" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="h-10 bg-term-head" />
          <div className="h-10 bg-term-head" />
          <div className="h-10 bg-term-head" />
        </div>
      </div>
    </div>
  );
}
