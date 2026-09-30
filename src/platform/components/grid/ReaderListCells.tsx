import React from 'react';

import {
  firstSentence,
  formatMetricAmount,
  metricMeasureLabel,
  metricOriginLabel,
  pickListMetric,
  pickProfitMetric,
  readerSummaryFact,
} from '@/shared/display-text';
import type { Measure, ReaderCase, ReaderMetric } from '@/shared/reader-case';
import { UI } from '@/shared/ui-strings';

/** 一覧の行が読むのは entity.reader だけ。売上欄と利益欄の1件ずつを選ぶ。 */
export function listMetricsOf(reader: ReaderCase | undefined): { main: ReaderMetric | null; profit: ReaderMetric | null } {
  const main = pickListMetric(reader);
  const profit = pickProfitMetric(reader);
  return { main, profit: profit && profit.id !== main?.id ? profit : null };
}

/** 事業の説明: summaryFactId の事実の1文目。無ければ強い一行（推測の印つき）。どちらも無ければ何も出さない。 */
export function ListDescription({ reader, className }: { reader?: ReaderCase; className?: string }) {
  const fact = readerSummaryFact(reader);
  if (!fact) {
    const headline = reader?.analysis.find((a) => a.item === 'HEADLINE');
    if (!headline) return null;
    return (
      <span className={className} data-analysis={headline.id} title={headline.text}>
        <span className="mr-1 text-term-accent">{UI.ANALYSIS_MARK}</span>
        {headline.text}
      </span>
    );
  }
  const text = firstSentence(fact.text);
  return (
    <span className={className} data-fact={fact.id} title={text}>
      {text}
    </span>
  );
}

/** 欄の名前・金額・期間・由来。売上が無い時は売却額・調達額などをその名前で出す。 */
export function ListMetric({ metric, compact = false }: { metric: ReaderMetric | null; compact?: boolean }) {
  if (!metric) return <span className="text-xs text-term-dim">{UI.LIST_REVENUE_UNKNOWN}</span>;
  return (
    <span data-metric={metric.id} className="inline-flex flex-col items-end">
      <span className="text-xs text-term-label">{metricMeasureLabel(metric)}</span>
      <span className={`term-num text-sm ${metric.origin === 'ESTIMATED' ? 'text-term-accent' : 'text-term-fg-strong'}`}>{formatMetricAmount(metric)}</span>
      {!compact && (
        <span className={`text-xs ${metric.origin === 'ESTIMATED' ? 'text-term-accent' : 'text-term-label'}`}>
          {metric.period} · {metricOriginLabel(metric)}
        </span>
      )}
    </span>
  );
}

/**
 * 表の1マス用（1行）。金額だけを出し、列の想定と違う種類（売却額・調達額など）の時だけ名前を前に付ける。
 * 期間と由来は title に入れる。無ければ「未確認」。
 */
export function ListMetricCell({ metric, expected }: { metric: ReaderMetric | null; expected?: readonly Measure[] }) {
  if (!metric) return <span className="font-sans text-xs text-term-dim">{UI.LIST_REVENUE_UNKNOWN}</span>;
  const label = metricMeasureLabel(metric);
  const showLabel = !expected || !expected.includes(metric.measure);
  return (
    <span data-metric={metric.id} title={`${label} ${metric.period} · ${metricOriginLabel(metric)}`}>
      {showLabel && <span className="mr-1 font-sans text-xs text-term-label">{label}</span>}
      <span className={metric.origin === 'ESTIMATED' ? 'text-term-accent' : 'text-term-fg-strong'}>{formatMetricAmount(metric)}</span>
    </span>
  );
}

/** 由来の1語（提出書類・本人申告・記事・第三者・推定）。推定だけ橙。数値が無ければ「未確認」。 */
export function ListOriginCell({ metric }: { metric: ReaderMetric | null }) {
  if (!metric) return <span className="text-term-dim">{UI.LIST_REVENUE_UNKNOWN}</span>;
  return (
    <span data-metric={metric.id} className={metric.origin === 'ESTIMATED' ? 'text-term-accent' : 'text-term-muted'}>
      {metricOriginLabel(metric)}
    </span>
  );
}
