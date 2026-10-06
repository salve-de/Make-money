import React from 'react';

import type { AnalysisItem, ReaderAnalysis, ReaderCase, ReaderFact, ReaderMetric } from '@/shared/reader-case';
import { formatMetricAmount, metricMeasureLabel, metricOriginLabel, pickListMetric, plainAnalysisText, plainFactText } from '@/shared/display-text';
import { ANALYSIS_LABELS, UI } from '@/shared/ui-strings';

/**
 * 詳しい欄の上半分。外部の見やすさの原理に合わせた作り:
 * - 結論を先頭に（強い一行）→ 主要な数字の帯 → 4段の物語 → まとまりごとの推測（項目名は細く・中身を主役に）
 * - 事実は実線、推測は点線の左罫と「推測」の印で見分ける（色だけに頼らない）
 * 推論は必ず「推測」の印と確度を付けて出す（OWNER_INTENT 3章）。
 */

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
function StripCell({ label, inferred, children, attrs }: { label: string; inferred: boolean; children: React.ReactNode; attrs?: Record<string, string> }) {
  return (
    <div {...attrs} className={`min-w-0 border-t-2 ${inferred ? 'border-dashed border-term-accent-line' : 'border-solid border-term-sub'} bg-term-panel px-2.5 pb-2 pt-1.5`}>
      <div className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-term-label">
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

function AnalysisCell({ analysis }: { analysis: ReaderAnalysis }) {
  return (
    <StripCell label={ANALYSIS_LABELS[analysis.item]} inferred attrs={{ 'data-analysis': analysis.id }}>
      <p className="text-[13px] leading-snug text-term-fg-strong [overflow-wrap:anywhere]">{plainAnalysisText(analysis.text)}</p>
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
  take('VIABILITY');
  return { metric, priceFact, analyses, usage };
}

/** 主要な数字の帯: 売上（事実の数値。無ければ売上の推測）・料金・手残り・今も通用するか。 */
export function KeyStrip({ reader, plan }: { reader: ReaderCase; plan: ReturnType<typeof planKeyStrip> }) {
  const { metric, priceFact, analyses } = plan;
  const cells: React.ReactNode[] = [];
  if (metric) {
    const series = seriesFor(reader, metric);
    cells.push(
      <StripCell key="metric" label={metricMeasureLabel(metric)} inferred={false} attrs={{ 'data-metric': metric.id }}>
        <div className="flex items-end justify-between gap-2">
          <span className="term-num text-[22px] font-semibold leading-none text-term-fg-strong">{formatMetricAmount(metric)}</span>
          {series.length > 0 && <Sparkline points={series.map((m) => m.amount)} />}
        </div>
        <div className="mt-1.5 text-[11px] leading-snug text-term-label">
          {metric.period} ・ {metricOriginLabel(metric)}
        </div>
      </StripCell>,
    );
  }
  if (priceFact) {
    cells.push(
      <StripCell key="price" label={ANALYSIS_LABELS.PRICING} inferred={false} attrs={{ 'data-fact': priceFact.id }}>
        <p className="text-[13px] leading-snug text-term-fg-strong [overflow-wrap:anywhere]">{plainFactText(priceFact.text)}</p>
      </StripCell>,
    );
  }
  for (const a of analyses) cells.push(<AnalysisCell key={a.id} analysis={a} />);
  if (cells.length === 0) return null;
  // 奇数個なら最後のマスを横いっぱいに（空きマスを作らない）
  return <div className="grid grid-cols-1 gap-px border-b border-term-line bg-term-line sm:grid-cols-2 sm:[&>*:last-child:nth-child(odd)]:col-span-2">{cells}</div>;
}

/** 強い一行。結論を先頭に大きく。 */
export function Headline({ reader, tight = false }: { reader: ReaderCase; tight?: boolean }) {
  const a = byItem(reader, 'HEADLINE');
  if (!a) return null;
  return (
    <div data-analysis={a.id} className={`${tight ? '' : 'border-b border-term-line '}px-2.5 pb-2 pt-3 sm:px-3`}>
      <h3 className="text-[19px] font-semibold leading-snug text-term-fg-strong [overflow-wrap:anywhere]">{plainAnalysisText(a.text)}</h3>
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
    <div data-analysis={story.id} className="border-b border-term-line px-2.5 py-2.5 sm:px-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <h4 className="text-term-label">{ANALYSIS_LABELS.STORY}</h4>
      </div>
      {steps ? (
        <ol className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
          {steps.map(({ step, body }, i) => (
            <li key={step} className="relative min-w-0 border-l border-dashed border-term-accent-line pl-2.5">
              <span className="mb-0.5 flex items-center gap-1.5 text-[11px] text-term-accent">
                <span className="term-num">{i + 1}</span>
                <span>{step}</span>
              </span>
              <span className="block text-[13px] leading-snug text-term-fg [overflow-wrap:anywhere]">{body}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="whitespace-pre-line text-[13px] leading-relaxed text-term-fg">{plainAnalysisText(story.text)}</p>
      )}
    </div>
  );
}

/** 推測を4つのまとまりに。読む人の問い（どう稼ぐ・誰から・なぜ勝てる・いま真似できるか）の順。 */
export const ANALYSIS_GROUPS: Array<{ title: string; items: AnalysisItem[] }> = [
  { title: UI.GROUP_MONEY, items: ['BUSINESS_MODEL', 'PRICING', 'REVENUE_ESTIMATE', 'COST_STRUCTURE', 'TAKE_HOME', 'UPFRONT_CASH', 'CAPITAL_AND_TEAM'] },
  { title: UI.GROUP_CUSTOMERS, items: ['CUSTOMER', 'CUSTOMER_PAIN', 'FIRST_CUSTOMERS', 'CHANNELS', 'REFERRAL'] },
  { title: UI.GROUP_EDGE, items: ['WHY_IT_WORKED', 'INCUMBENT_BLINDSPOT', 'LOCK_IN', 'COMPETITION', 'DEPENDENCIES', 'TOOLS'] },
  { title: UI.GROUP_NOW, items: ['VIABILITY', 'TIMELINE', 'PIVOTS', 'FAILURE_CAUSE', 'LESSON'] },
];

/** まとまりごとに「項目名（細く）｜中身（主役）｜確度」の3列。推測は点線の左罫。 */
export function AnalysisGroups({ reader, usage }: { reader: ReaderCase; usage: OverviewUsage }) {
  return (
    <>
      {ANALYSIS_GROUPS.map(({ title, items }) => {
        const rows = items.filter((item) => !usage.items.has(item)).flatMap((item) => reader.analysis.filter((a) => a.item === item));
        if (rows.length === 0) return null;
        return (
          <section key={title} className="border-b border-term-line">
            <div className="flex items-center gap-2 bg-term-head px-2.5 py-1 sm:px-3">
              <h3 className="text-xs font-semibold text-term-fg-strong">{title}</h3>
            </div>
            <dl className="divide-y divide-term-line-soft px-2.5 sm:px-3">
              {rows.map((a) => (
                <div key={a.id} data-analysis={a.id} className="grid grid-cols-1 gap-x-3 gap-y-0.5 py-2 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                  <dt className="flex flex-wrap items-center gap-x-2 text-[11px] text-term-label sm:flex-col sm:items-start sm:gap-1">
                    <span>{ANALYSIS_LABELS[a.item]}</span>
                  </dt>
                  <dd className="min-w-0 whitespace-pre-line border-l border-dashed border-term-accent-line pl-2.5 text-[13px] leading-relaxed text-term-fg-strong [overflow-wrap:anywhere]">{plainAnalysisText(a.text)}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </>
  );
}
