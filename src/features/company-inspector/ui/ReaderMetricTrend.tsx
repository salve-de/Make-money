import React from 'react';

import { formatMetricAmount, metricMeasureLabel, metricPeriodSuffix } from '@/shared/display-text';
import type { ReaderCase, ReaderMetric } from '@/shared/reader-case';
import { UI, uiFormat } from '@/shared/ui-strings';

/**
 * 同じ種類・同じ期間の単位・同じ通貨の数字が2時点以上ある時だけ、古い順に横棒で並べる（例: MRR が $2,300 → $5,000）。
 * 棒の長さは金額に比例（0 から）。単位が違う物は混ぜない。推定は橙。数字そのものは変えない。
 */
export function trendSeries(reader: ReaderCase | undefined): ReaderMetric[] {
  if (!reader) return [];
  const groups = new Map<string, ReaderMetric[]>();
  for (const m of reader.metrics) {
    if (!m.statedAt || m.amount <= 0) continue;
    if (m.periodKind === 'CUMULATIVE' || m.periodKind === 'POINT' || m.periodKind === 'TRAILING_DAYS') continue;
    const key = [m.measure, m.periodKind, m.currency ?? m.unit ?? ''].join('|');
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  const best = [...groups.values()]
    .map((list) => {
      // 同じ日付の重複は1つ（後の物）
      const byDate = new Map(list.map((m) => [m.statedAt as string, m]));
      return [...byDate.values()].sort((a, b) => (a.statedAt as string).localeCompare(b.statedAt as string));
    })
    .filter((list) => list.length >= 2)
    .sort((a, b) => (a[0].measure === 'REVENUE' ? -1 : 0) - (b[0].measure === 'REVENUE' ? -1 : 0) || b.length - a.length)[0];
  return best ?? [];
}

export function ReaderMetricTrend({ reader }: { reader?: ReaderCase }) {
  const series = trendSeries(reader);
  if (series.length < 2) return null;
  const max = Math.max(...series.map((m) => m.amount));
  const first = series[0];
  const title = uiFormat(UI.TREND_TITLE, `${metricMeasureLabel(first)}${metricPeriodSuffix(first) ? `（${metricPeriodSuffix(first)}）` : ''}`);
  return (
    <figure data-trend className="m-0 border-b border-term-line-soft pb-2 pt-1">
      <figcaption className="mb-1.5 text-xs text-term-label">{title}</figcaption>
      <ol className="space-y-1">
        {series.map((m) => {
          const pct = Math.max(2, (m.amount / max) * 100);
          const estimated = m.origin === 'ESTIMATED';
          return (
            <li key={m.id} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-xs">
              <span className="term-num text-term-label">{(m.statedAt as string).slice(0, 7)}</span>
              <span className="h-3 overflow-hidden rounded-sm bg-term-line-soft">
                <span
                  data-value={m.amount}
                  style={{ width: `${pct}%` }}
                  className={`block h-full rounded-sm ${estimated ? 'bg-term-accent' : 'bg-term-sub'}`}
                />
              </span>
              <span className={`term-num text-right ${estimated ? 'text-term-accent' : 'text-term-fg-strong'}`}>{formatMetricAmount(m)}</span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
