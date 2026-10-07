import React from 'react';

import type { AnalysisItem, ReaderAnalysis, ReaderCase, ReaderFact, ReaderMetric } from '@/shared/reader-case';
import { listLineFor } from '@/shared/list-lines';
import { formatMetricAmount, metricListLabel, metricOriginLabel, pickListMetric, plainAnalysisText, plainFactText } from '@/shared/display-text';
import { checkLead } from '@/shared/lead-standard';
import { ANALYSIS_LABELS, UI } from '@/shared/ui-strings';

/**
 * 詳しい欄の上半分。外部の見やすさの原理に合わせた作り:
 * - 結論を先頭に（強い一行）→ 主要な数字の帯 → 4段の物語 → まとまりごとの推測（項目名は細く・中身を主役に）
 * - 事実は実線、推測は点線の左罫と「推測」の印で見分ける（色だけに頼らない）
 * 推論は必ず言葉の印を付けて出す（確度は出さない。事実の要約は印なし）（OWNER_INTENT 3章）。
 */

/** 推論の印。薄灰色の言葉。ESTIMATE=「推定」、FACT_SUMMARY=印なし、未指定の旧データ=従来どおり（式あり=推定、無し=推測）。 */
function InferenceMark({ analysis }: { analysis: ReaderAnalysis }) {
  if (analysis.presentation === 'FACT_SUMMARY') return null;
  const estimate = analysis.presentation === 'ESTIMATE' || (analysis.presentation === undefined && Boolean(analysis.formula));
  return <span className="text-xs text-term-muted">{estimate ? UI.ESTIMATED_MARK : UI.ANALYSIS_MARK}</span>;
}

/** 帯に出した推論・事実。下の一覧で同じものを2回出さないために使う。 */
export type OverviewUsage = { items: Set<AnalysisItem>; factIds: Set<string> };

const byItem = (reader: ReaderCase, item: AnalysisItem) => reader.analysis.find((a) => a.item === item);

/**
 * 推移の線に使う点。同じ種類・通貨・期間の型・呼び名で、日付が付いた数値だけを古い順に。
 * 日付の無い点や意味の違う点を混ぜると、実際と逆向きの線になりうるので入れない。3点未満なら線は引かない。
 */
function seriesFor(reader: ReaderCase, lead: ReaderMetric): ReaderMetric[] {
  const points = reader.metrics
    .filter((m) => m.measure === lead.measure && m.currency === lead.currency && m.unit === lead.unit && m.periodKind === lead.periodKind && m.label === lead.label && m.origin !== 'ESTIMATED' && m.statedAt)
    .sort((a, b) => (a.statedAt ?? '').localeCompare(b.statedAt ?? ''));
  const dates = new Set(points.map((m) => m.statedAt));
  return points.length >= 3 && dates.size === points.length ? points : [];
}

/** 数字の横の小さな推移の線（軸・枠なし）。最後の点だけ色を付けて大きな数字とひも付ける。 */
function Sparkline({ points }: { points: number[] }) {
  const w = 72;
  const h = 22;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const xy = points.map((v, i) => [(i / (points.length - 1)) * (w - 4) + 2, h - 3 - ((v - min) / span) * (h - 6)] as const);
  const last = xy[xy.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <polyline points={xy.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="var(--term-sub)" strokeWidth="1.25" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.25" fill="var(--term-accent)" />
    </svg>
  );
}

/** 帯の1マス。事実は実線の上罫、推測は点線の上罫。 */
function StripCell({ label, mark, inferred, children, attrs }: { label: string; mark?: React.ReactNode; inferred: boolean; children: React.ReactNode; attrs?: Record<string, string> }) {
  return (
    <div {...attrs} className={`min-w-0 border-t-2 ${inferred ? 'border-dashed border-term-accent-line' : 'border-solid border-term-sub'} bg-term-panel px-2.5 pb-2 pt-1.5`}>
      <div className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-term-label">
        <span>{label}</span>
        {mark}
      </div>
      {children}
    </div>
  );
}

function AnalysisCell({ analysis }: { analysis: ReaderAnalysis }) {
  return (
    <StripCell label={ANALYSIS_LABELS[analysis.item]} mark={ANALYSIS_LABELS[analysis.item].includes('推') ? undefined : <InferenceMark analysis={analysis} />} inferred attrs={{ 'data-analysis': analysis.id }}>
      <p className="text-sm lg:text-[13px] leading-snug text-term-fg-strong [overflow-wrap:anywhere]">{plainAnalysisText(analysis.text)}</p>
    </StripCell>
  );
}

/** 帯に何を出すかを先に決める。下の一覧から同じものを外すのにも使う（描画中に状態を書き換えない）。 */
export function planKeyStrip(reader: ReaderCase) {
  const usage: OverviewUsage = { items: new Set(), factIds: new Set() };
  const lead = pickListMetric(reader);
  const metric = lead && lead.origin !== 'ESTIMATED' ? lead : null;
  const analyses: ReaderAnalysis[] = [];
  const take = (item: AnalysisItem) => {
    const a = byItem(reader, item);
    if (a) { usage.items.add(item); analyses.push(a); }
  };
  if (!metric) take('REVENUE_ESTIMATE');
  const priceFact: ReaderFact | undefined = reader.facts.find((f) => f.kind === 'PRICING' && f.id !== reader.summaryFactId);
  if (priceFact) usage.factIds.add(priceFact.id);
  else take('PRICING');
  take('TAKE_HOME');
  return { metric, priceFact, analyses, usage };
}

/** 主要な数字の帯: 売上（事実の数値。無ければ売上の推測）・料金・手残り。 */
export function KeyStrip({ reader, plan }: { reader: ReaderCase; plan: ReturnType<typeof planKeyStrip> }) {
  const { metric, priceFact, analyses } = plan;
  const cells: React.ReactNode[] = [];
  if (metric) {
    const series = seriesFor(reader, metric);
    cells.push(
      <StripCell key="metric" label={metricListLabel(metric)} inferred={false} attrs={{ 'data-metric': metric.id }}>
        <div className="flex items-end justify-between gap-2">
          <span className="term-num text-[22px] font-semibold leading-none text-term-fg-strong">{formatMetricAmount(metric)}</span>
          {series.length > 0 && <Sparkline points={series.map((m) => m.amount)} />}
        </div>
        <div className="mt-1.5 text-xs leading-snug text-term-label">
          {metric.period} ・ {metricOriginLabel(metric)}
        </div>
      </StripCell>,
    );
  }
  if (priceFact) {
    cells.push(
      <StripCell key="price" label={ANALYSIS_LABELS.PRICING} inferred={false} attrs={{ 'data-fact': priceFact.id }}>
        <p className="text-sm lg:text-[13px] leading-snug text-term-fg-strong [overflow-wrap:anywhere]">{plainFactText(priceFact.text)}</p>
      </StripCell>,
    );
  }
  for (const a of analyses) cells.push(<AnalysisCell key={a.id} analysis={a} />);
  if (cells.length === 0) return null;
  // 奇数個なら最後のマスを横いっぱいに（空きマスを作らない）
  return <div className="grid grid-cols-1 gap-px border-b border-term-line bg-term-line sm:grid-cols-2 sm:[&>*:last-child:nth-child(odd)]:col-span-2">{cells}</div>;
}

/** 概要。最初の1文を最上部に大きく、続きは畳まずそのまま下に出す。 */
export function WhatIs({ fact, entityId }: { fact: ReaderFact | null | undefined; entityId?: string }) {
  if (!fact) return null;
  const text = plainFactText(fact.text);
  const end = text.indexOf('。');
  // 一覧と同じ「短い1行」があればそれを大きく出し、元の要約は全文を下に続ける
  const short = entityId ? listLineFor(entityId, fact) : null;
  const first = short ?? (end >= 0 ? text.slice(0, end + 1) : text);
  const rest = short ? text : end >= 0 ? text.slice(end + 1).trim() : '';
  return (
    <div data-fact={fact.id} className="px-2.5 pb-3 pt-3 sm:px-3">
      <p className="mb-1 text-xs text-term-label">{UI.WHAT_IS}</p>
      <p className="text-[20px] font-semibold leading-snug text-term-fg-strong [overflow-wrap:anywhere]">{first}</p>
      {rest && <p className="mt-2 text-sm leading-relaxed text-term-fg [overflow-wrap:anywhere]">{rest}</p>}
    </div>
  );
}

/** ひとこと（強い一行）。主役は「何の事業か」と数字の帯なので、ここでは小さめに。 */
export function Headline({ reader }: { reader: ReaderCase }) {
  const a = byItem(reader, 'HEADLINE');
  // リードは基準（lead-standard.ts）を通った時だけ出す
  if (!a || !checkLead(a, reader).ok) return null;
  return (
    <div data-analysis={a.id} className="border-b border-term-line bg-term-head px-2.5 py-3 sm:px-3">
      <div className="mb-1 flex items-center gap-2 text-xs text-term-label">
        <span>{UI.HEADLINE_LABEL}</span>
        <InferenceMark analysis={a} />
      </div>
      <h3 className="text-[18px] font-semibold leading-snug text-term-fg-strong [overflow-wrap:anywhere]">{plainAnalysisText(a.text)}</h3>
    </div>
  );
}

const STORY_STEPS = ['前夜', '隙', '突破', '金が回る仕組み'] as const;

/** 「前夜：…。隙：…。突破：…。金が回る仕組み：…」を4段に分ける。形が違えば null。 */
function splitStory(text: string): Array<{ step: string; body: string }> | null {
  const re = new RegExp(`(${STORY_STEPS.join('|')})[:：]`, 'g');
  const marks = [...text.matchAll(re)];
  if (marks.length !== STORY_STEPS.length || marks.some((m, i) => m[1] !== STORY_STEPS[i])) return null;
  return marks.map((m, i) => ({
    step: m[1],
    body: text.slice((m.index ?? 0) + m[0].length, i + 1 < marks.length ? marks[i + 1].index : undefined).trim().replace(/[。.]$/, ''),
  }));
}

/** 物語を4段の流れで。各段の名前は原文の語のまま（推論の本文の一部）。 */
export function StorySteps({ reader }: { reader: ReaderCase }) {
  const story = byItem(reader, 'STORY');
  if (!story) return null;
  const steps = splitStory(story.text);
  return (
    <Fold id="section-story" title={UI.GROUP_ORIGIN} defaultOpen mark={<InferenceMark analysis={story} />} attrs={{ 'data-analysis': story.id }}>
      {steps ? (
        <ol className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
          {steps.map(({ step, body }, i) => (
            <li key={step} className="relative min-w-0 border-l border-dashed border-term-accent-line pl-2.5">
              <span className="mb-0.5 flex items-center gap-1.5 text-xs text-term-accent">
                <span className="term-num">{i + 1}</span>
                <span>{step}</span>
              </span>
              <span className="block text-sm lg:text-[13px] leading-snug text-term-fg [overflow-wrap:anywhere]">{body}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="whitespace-pre-line text-sm lg:text-[13px] leading-relaxed text-term-fg">{plainAnalysisText(story.text)}</p>
      )}
    </Fold>
  );
}

/** 推測を、読む人の疑問の順に並べる: 誰に売る → なぜ始めたか（着想） → 最初の客 → 金の回り → なぜ他に取られないか → 経緯。story は物語の4段（前夜・隙・突破…）をその位置に出す。 */
export const ANALYSIS_GROUPS: Array<{ title: string; items: AnalysisItem[]; story?: boolean }> = [
  { title: UI.GROUP_CUSTOMERS, items: ['CUSTOMER', 'CUSTOMER_PAIN'] },
  { title: UI.GROUP_ORIGIN, items: [], story: true },
  { title: UI.GROUP_FIRST, items: ['FIRST_CUSTOMERS', 'CHANNELS', 'REFERRAL'] },
  { title: UI.GROUP_MONEY, items: ['BUSINESS_MODEL', 'PRICING', 'REVENUE_ESTIMATE', 'COST_STRUCTURE', 'TAKE_HOME', 'UPFRONT_CASH', 'CAPITAL_AND_TEAM'] },
  { title: UI.GROUP_EDGE, items: ['WHY_IT_WORKED', 'INCUMBENT_BLINDSPOT', 'LOCK_IN', 'COMPETITION', 'DEPENDENCIES', 'TOOLS'] },
  { title: UI.GROUP_NOW, items: ['TIMELINE', 'PIVOTS', 'FAILURE_CAUSE', 'LESSON'] },
];

/** 区切りの見える折りたたみ。見出しは大きく太く、背景帯と矢印で「ここから別の話」と分かるようにする。 */
export function Fold({ id, title, mark, defaultOpen = false, attrs, children }: { id: string; title: string; mark?: React.ReactNode; defaultOpen?: boolean; attrs?: Record<string, string>; children: React.ReactNode }) {
  return (
    <details id={id} data-fold={id} open={defaultOpen} {...attrs} className="group scroll-mt-12 border-b border-term-line">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 bg-term-head px-2.5 text-sm font-semibold text-term-fg-strong hover:bg-term-line sm:px-3 lg:min-h-9 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="inline-block h-0 w-0 border-y-[5px] border-l-[6px] border-y-transparent border-l-term-accent transition-transform group-open:rotate-90" />
        <span className="min-w-0 flex-1">{title}</span>
        {mark}
      </summary>
      <div className="px-2.5 py-2.5 sm:px-3">{children}</div>
    </details>
  );
}

export const GROUP_IDS = ['section-group-customers', 'section-story', 'section-group-first', 'section-group-money', 'section-group-edge', 'section-group-now'] as const;

/** まとまりごとに「項目名（細く）｜中身（主役）」の2列。全部開いたまま並べる（読む人に開かせない）。推測は点線の左罫。 */
export function AnalysisGroups({ reader, usage }: { reader: ReaderCase; usage: OverviewUsage }) {
  return (
    <>
      {ANALYSIS_GROUPS.map(({ title, items, story }, index) => {
        if (story) return <StorySteps key={title} reader={reader} />;
        const rows = items.filter((item) => !usage.items.has(item)).flatMap((item) => reader.analysis.filter((a) => a.item === item));
        if (rows.length === 0) return null;
        return (
          <Fold key={title} id={GROUP_IDS[index]} title={title} defaultOpen>
            <dl className="divide-y divide-term-line-soft">
              {rows.map((a) => (
                <div key={a.id} data-analysis={a.id} className="grid grid-cols-1 gap-x-3 gap-y-0.5 py-2 first:pt-0 last:pb-0 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                  <dt className="flex flex-wrap items-center gap-x-2 text-xs text-term-label sm:flex-col sm:items-start sm:gap-1">
                    <span>{ANALYSIS_LABELS[a.item]}</span>
                    <InferenceMark analysis={a} />
                  </dt>
                  <dd className="min-w-0 whitespace-pre-line border-l border-dashed border-term-accent-line pl-2.5 text-sm lg:text-[13px] leading-relaxed text-term-fg-strong [overflow-wrap:anywhere]">{plainAnalysisText(a.text)}</dd>
                </div>
              ))}
            </dl>
          </Fold>
        );
      })}
    </>
  );
}

/** 数字・ひとことの帯と、章の並びの境目。目次の代わりに、1本の太めの区切りだけを置く。 */
export function SectionGap() {
  return <div aria-hidden="true" className="h-3 border-b border-term-line bg-term-bg" />;
}
