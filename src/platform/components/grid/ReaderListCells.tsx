import React from 'react';

import {
  firstSentence,
  formatMetricAmount,
  metricListLabel,
  metricMeasureLabel,
  pickListMetric,
  pickProfitMetric,
  readerSummaryFact,
  screenText,
} from '@/shared/display-text';
import type { Measure, ReaderCase, ReaderMetric } from '@/shared/reader-case';
import { UI } from '@/shared/ui-strings';
import { listLineFor, trimLineEnd } from '@/shared/list-lines';

/** 一覧の行が読むのは entity.reader だけ。売上欄と利益欄の1件ずつを選ぶ。 */
export function listMetricsOf(reader: ReaderCase | undefined): { main: ReaderMetric | null; profit: ReaderMetric | null } {
  const main = pickListMetric(reader);
  const profit = pickProfitMetric(reader);
  return { main, profit: profit && profit.id !== main?.id ? profit : null };
}

/**
 * 一覧の2つの数値欄。売上の欄は売上だけ（無ければ空）、規模の欄は売上以外（利用者数・調達額など）を名前付きで出す。
 * 種類の違う数字を同じ欄に混ぜない。
 */
export function listColumnsOf(reader: ReaderCase | undefined): { revenue: ReaderMetric | null; scale: ReaderMetric | null; profit: ReaderMetric | null } {
  if (!reader) return { revenue: null, scale: null, profit: null };
  const revenue = pickListMetric({ ...reader, metrics: reader.metrics.filter((m) => m.measure === 'REVENUE') });
  const scale = pickListMetric({ ...reader, metrics: reader.metrics.filter((m) => m.measure !== 'REVENUE' && !['OPERATING_INCOME', 'NET_INCOME', 'PROFIT'].includes(m.measure)) });
  return { revenue, scale, profit: pickProfitMetric(reader) };
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
  // 画面用の短い1行があれば、それを出す（元の要約と一致する時だけ）。無ければ元の要約の1文目
  const text = listLineFor(reader?.display, fact) ?? trimLineEnd(screenText(firstSentence(fact.text)));
  return (
    <span className={className} data-fact={fact.id} title={text}>
      {text}
    </span>
  );
}

/**
 * 表の1マス用（1行）。金額だけを出し、列の想定と違う種類（売却額・調達額など）の時だけ名前を前に付ける。
 * 期間は title に入れる。無ければ「—」。
 */
export function ListMetricCell({ metric, expected, aligned = false }: { metric: ReaderMetric | null; expected?: readonly Measure[]; aligned?: boolean }) {
  if (!metric) return <span className="block text-right font-sans text-xs text-term-dim">{UI.LIST_REVENUE_UNKNOWN}</span>;
  const label = metricListLabel(metric);
  // 列の見出しと同じ種類でも、売上は月・年・累計で呼び分けるので、見出しと違う名前の時は前に付ける
  const showLabel = !expected || !expected.includes(metric.measure) || label !== metricMeasureLabel(metric);
  const estimated = metric.origin === 'ESTIMATED';
  // 由来の語は一覧に出さない。推定だけは色に頼らず、読み上げ用の文字と title で伝える
  const amount = <span className={estimated ? 'text-term-accent' : 'text-term-fg-strong'}>{screenText(formatMetricAmount(metric))}{estimated && <span className="sr-only">（推定）</span>}</span>;
  const title = `${label} ${metric.period}${estimated ? ' · 推定' : ''}`;
  // 名前は左・金額は右に固定し、行をまたいで数字の右端が揃うようにする
  if (aligned) {
    return (
      <span data-metric={metric.id} title={title} className="grid grid-cols-[3.75rem_1fr] items-baseline gap-x-1 whitespace-nowrap text-right">
        <span className="text-left font-sans text-xs text-term-label">{showLabel ? label : ''}</span>
        {amount}
      </span>
    );
  }
  return (
    <span data-metric={metric.id} title={title}>
      {showLabel && <span className="mr-1 font-sans text-xs text-term-label">{label}</span>}
      {amount}
    </span>
  );
}
