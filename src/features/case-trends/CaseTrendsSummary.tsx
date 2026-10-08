import React from 'react';
import Link from 'next/link';
import type { CaseTrends, MetricTrendSeries, TrendCorpus, TrendPoint, summarizeCaseTrends } from '@/lib/company-access/case-trends';
import { cleanDisplayText, formatDisplayDate, formatMetricAmount, metricMeasureLabel, metricEstimateLabel } from '@/shared/display-text';
import { SourceLink } from './SourceLink';

export interface CaseTrendsSummaryProps {
  coverage: ReturnType<typeof summarizeCaseTrends>;
  corpus: TrendCorpus;
  cases: readonly CaseTrends[];
}

const ACTION = 'inline-flex min-h-11 min-w-0 max-w-full items-center [overflow-wrap:anywhere] text-sm underline underline-offset-2 hover:text-term-fg-strong lg:min-h-6 lg:text-[13px]';

function amount(series: MetricTrendSeries, point: TrendPoint) {
  return formatMetricAmount({ amount: point.amount, currency: series.scope.currency ?? undefined, unit: series.scope.unit ?? undefined });
}

function usableSeries(item: CaseTrends) {
  const eligible = (series: MetricTrendSeries) => series.change.status !== 'CONFLICTED'
    && Boolean(series.scope.currency || series.scope.unit)
    && series.points.some((point) => Number.isFinite(point.amount));
  return item.series.find((series) => eligible(series) && series.scope.origin !== 'ESTIMATED' && series.change.status === 'COMPARABLE')
    ?? item.series.find(eligible);
}

function Example({ item }: { item: CaseTrends }) {
  const series = usableSeries(item);
  const record = item.records.find((fact) => cleanDisplayText(fact.text));
  const change = series?.change;
  const comparison = series && series.scope.origin !== 'ESTIMATED' && change?.status === 'COMPARABLE'
    && change.from && change.to && Number.isFinite(change.from.amount) && Number.isFinite(change.to.amount);
  const point = series?.points.find((entry) => Number.isFinite(entry.amount));
  return <li className="min-w-0 border-t border-term-line-soft py-2">
    <Link href={`/?entity=${encodeURIComponent(item.entityId)}`} prefetch={false} className={`${ACTION} font-semibold text-term-fg-strong`}>
      {cleanDisplayText(item.name) || '事例の詳細'}
    </Link>
    {series && point ? <>
      <p className="break-words text-sm lg:text-[13px]">
        {metricMeasureLabel({ measure: series.scope.measure, label: series.scope.label ?? undefined })}
        <span className="ml-2 text-xs text-term-label">{metricEstimateLabel(series.scope)}</span>
      </p>
      {comparison && change?.from && change.to ? <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="term-num break-words text-sm text-term-fg-strong">{amount(series, change.from)} → {amount(series, change.to)}</p>
        <p className="break-words text-sm text-term-sub">{change.from.period} → {change.to.period}</p>
        <div className="flex max-w-full flex-wrap items-center gap-x-3 text-sm text-term-label">
          <SourceLink source={change.from.source} className={ACTION} />
          {change.to.source.url !== change.from.source.url && <SourceLink source={change.to.source} className={ACTION} />}
        </div>
      </div> : <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className={`term-num break-words ${series.scope.origin === 'ESTIMATED' ? 'text-xs text-term-label' : 'text-term-fg-strong'}`}>{amount(series, point)}</span>
        <span className="break-words text-term-sub">{point.period || '対象期間未記録'}{point.periodKey === null && '（時期未確定）'}</span>
        <span className="max-w-full text-term-label"><SourceLink source={point.source} className={ACTION} /></span>
      </div>}
      {series.scope.basis && <p className="mt-1 break-words text-sm text-term-sub lg:text-[13px]">{cleanDisplayText(series.scope.basis)}</p>}
    </> : record ? <>
      <p className="break-words text-sm lg:text-[13px]">{cleanDisplayText(record.text)}</p>
      <div className="flex max-w-full flex-wrap items-center gap-x-3 text-sm text-term-label">
        {record.statedAt && <span>公表日 {formatDisplayDate(record.statedAt)}</span>}
        <SourceLink source={record.source} className={ACTION} />
      </div>
    </> : null}
  </li>;
}

/** Coverage describes the whole filtered cohort; examples describe only the supplied page. */
export function CaseTrendsSummary({ coverage, corpus, cases }: CaseTrendsSummaryProps) {
  const examples = coverage.cases > 0 ? cases.filter((item) => item.entityId.trim() && (usableSeries(item)
    || item.records.some((record) => cleanDisplayText(record.text)))).slice(0, 3) : [];
  const count = (value: number) => value.toLocaleString('ja-JP');
  return <section aria-label="傾向の見どころ" className="min-w-0 border-b border-term-line px-3 py-3 text-term-fg">
    <h2 className="text-base font-semibold text-term-fg-strong">記録から見えること</h2>
    <p className="mt-1 break-words text-sm text-term-sub lg:text-[13px]">
      {coverage.cases === corpus.publishedCaseCount
        ? `公開${count(corpus.publishedCaseCount)}事例が対象です。`
        : `公開${count(corpus.publishedCaseCount)}事例のうち、現在の条件に合う${count(coverage.cases)}事例が対象です。`}
    </p>
    <dl className="mt-3 grid min-w-0 grid-cols-3 gap-x-2 sm:max-w-xl">
      {([['対象', coverage.cases], ['数値あり', coverage.observedMetricCases], ['期間比較', coverage.comparableCases]] as const).filter(([label, value]) => label !== '期間比較' || value > 0).map(([label, value]) => <div key={label} className="min-w-0">
        <dt className="break-words text-sm text-term-label lg:text-[13px]">{label}</dt>
        <dd className="term-num mt-1 break-words text-base text-term-fg-strong">{count(value)}<span className="ml-1 text-sm">事例</span></dd>
      </div>)}
    </dl>
    <p className="mt-3 break-words text-sm lg:text-[13px]">
      {coverage.cases === 0 ? '条件を変えて、気になる事例の記録を探せます。'
        : coverage.comparableCases > 0 ? '同じ条件で比較できる数字から、期間ごとの変化を確かめられます。'
          : 'まずは記録された数字や公表内容から、事業の違いを見比べられます。'}
    </p>
    {coverage.comparedSeries > 0 && <p className="mt-1 break-words text-sm text-term-sub lg:text-[13px]">
      対象全体で比較できる{count(coverage.comparedSeries)}件の指標：増加{count(coverage.seriesDirections.increasing)}・減少{count(coverage.seriesDirections.decreasing)}・横ばい{count(coverage.seriesDirections.unchanged)}。
    </p>}
    {examples.length > 0 && <div className="mt-3 min-w-0">
      <h3 className="text-sm font-semibold text-term-fg-strong">このページの記録から</h3>
      {cases.length !== coverage.cases && <p className="mt-1 text-sm text-term-sub lg:text-[13px]">下の例は表示中の{count(cases.length)}事例から選んでいます。件数は条件に合う事例全体です。</p>}
      <ul className="mt-1 min-w-0">{examples.map((item) => <Example key={item.entityId} item={item} />)}</ul>
    </div>}
    <p className="mt-3 break-words text-sm text-term-label lg:text-[13px]">
      掲載事例の範囲で見える記録です。市場全体の伸びや成功率を表すものではありません。
      {corpus.checkedAt && ` 確認日 ${formatDisplayDate(corpus.checkedAt)}`}
    </p>
  </section>;
}
