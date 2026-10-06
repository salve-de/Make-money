import { ReaderCaseSchema, type Measure, type ReaderFact, type ReaderMetric, type ReaderSource } from '@/shared/reader-case';
import { sha256Sync } from '@/shared/sha256';

/** Inputs must come from the current publication, never the private ingestion index. */
export interface TrendCaseInput {
  id: string;
  name: string;
  sector?: string;
  reader?: unknown;
}

/** Publication identity carried through case → trend → idea. Confirmation time is not request time. */
export interface TrendCorpus {
  version: number;
  hash: string;
  publishedCaseCount: number;
  checkedAt: string | null;
}

/** The imported manifest supplies the whole object, including its detail hashes. */
export function buildTrendCorpus(manifest: { version: number; publishedCount: number }): TrendCorpus {
  return { version: manifest.version, hash: sha256Sync(JSON.stringify(manifest)),
    publishedCaseCount: manifest.publishedCount, checkedAt: null };
}

export type TrendUnavailableReason = 'READER_UNAVAILABLE' | 'NO_METRICS' | 'INSUFFICIENT_PERIODS'
  | 'UNRESOLVED_PERIOD' | 'MISSING_UNIT' | 'ESTIMATED' | 'CONFLICTING_PERIOD' | 'FLOW_WITHOUT_PERIOD'
  | 'EVENT_AMOUNT' | 'NON_FINITE_CHANGE';

export interface TrendPoint {
  metricId: string;
  period: string;
  /** Target period only. Publication/retrieval dates never substitute for it. */
  periodKey: string | null;
  amount: number;
  statedAt: string | null;
  source: ReaderSource;
}

export interface TrendChange {
  status: 'COMPARABLE' | 'NOT_OBSERVED' | 'NOT_COMPARABLE' | 'CONFLICTED';
  reason: TrendUnavailableReason | null;
  from: TrendPoint | null;
  to: TrendPoint | null;
  delta: number | null;
  percentageChange: number | null;
  direction: 'increasing' | 'decreasing' | 'unchanged' | null;
}

export interface MetricTrendSeries {
  scope: Pick<ReaderMetric, 'measure' | 'periodKind' | 'origin'> & {
    currency: string | null;
    unit: string | null;
    basis: string | null;
    label: string | null;
    sourceFamily: string;
    periodConvention: string | null;
  };
  points: TrendPoint[];
  change: TrendChange;
}

export interface CaseTrends {
  entityId: string;
  name: string;
  sector: string | null;
  readerForm: 'summary' | 'detail' | 'unavailable';
  status: TrendChange['status'];
  reason: TrendUnavailableReason | null;
  series: MetricTrendSeries[];
  /** Dated statements, not inferred dates of the events they describe. */
  records: Array<ReaderFact & { source: ReaderSource }>;
}

function unavailable(reason: TrendUnavailableReason, status: TrendChange['status'] = 'NOT_COMPARABLE'): TrendChange {
  return { status, reason, from: null, to: null, delta: null, percentageChange: null, direction: null };
}

function calendarKey(raw: string, precision: 'year' | 'month' | 'day'): string | null {
  const normalized = raw.replace(/年/g, '-').replace(/月/g, '-').replace(/日/g, '').replace(/-$/, '');
  const patterns = { year: /^(\d{4})$/, month: /^(\d{4})-(\d{1,2})$/, day: /^(\d{4})-(\d{1,2})-(\d{1,2})$/ };
  const match = normalized.match(patterns[precision]);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2] ?? 1);
  const day = Number(match[3] ?? 1);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return [match[1], ...(precision !== 'year' ? [String(month).padStart(2, '0')] : []),
    ...(precision === 'day' ? [String(day).padStart(2, '0')] : [])].join('-');
}

function targetPeriod(metric: ReaderMetric): { key: string; convention: string } | null {
  const period = metric.period.trim();
  if (metric.periodKind === 'MONTH' || metric.periodKind === 'YEAR') {
    const precision = metric.periodKind === 'MONTH' ? 'month' : 'year';
    const key = calendarKey(period, precision);
    return key ? { key, convention: `calendar-${precision}` } : null;
  }
  if (metric.periodKind === 'FISCAL_YEAR') {
    const match = period.match(/^FY\s?(\d{4})$/i);
    return match && calendarKey(match[1], 'year') ? { key: match[1], convention: 'fiscal-year' } : null;
  }
  if (metric.periodKind === 'QUARTER') {
    const match = period.match(/^(\d{4})[- ]?Q([1-4])$/i);
    return match && calendarKey(match[1], 'year') ? { key: `${match[1]}-Q${match[2]}`, convention: 'calendar-quarter' } : null;
  }
  if (metric.periodKind === 'TRAILING_DAYS') {
    const match = period.match(/^(\d{1,3})日・(\d{4}-\d{2}-\d{2})終了$/);
    const key = match ? calendarKey(match[2], 'day') : null;
    return match && Number(match[1]) > 0 && key ? { key, convention: `trailing-${Number(match[1])}-days` } : null;
  }
  if (metric.periodKind === 'POINT') {
    const raw = period.replace(/\s*時点$/, '');
    for (const precision of ['day', 'month', 'year'] as const) {
      const key = calendarKey(raw, precision);
      if (key) return { key, convention: `point-${precision}` };
    }
  }
  // Relative periods, undated recurring amounts, ranges and cumulative totals remain visible.
  return null;
}

const FLOW_MEASURES = new Set<Measure>(['REVENUE', 'PROFIT', 'OPERATING_INCOME', 'NET_INCOME', 'COST']);
const MONEY_MEASURES = new Set<Measure>([...FLOW_MEASURES, 'PRICE', 'EXIT_VALUE', 'FUNDING', 'VALUATION']);

function compareSeries(series: MetricTrendSeries): TrendChange {
  if (series.scope.origin === 'ESTIMATED') return unavailable('ESTIMATED');
  if ((!series.scope.currency && !series.scope.unit)
    || (MONEY_MEASURES.has(series.scope.measure) && (!series.scope.currency || series.scope.unit))
    || (series.scope.measure === 'USERS' && (!series.scope.unit || series.scope.currency))) return unavailable('MISSING_UNIT');
  if (series.scope.measure === 'EXIT_VALUE' || series.scope.measure === 'FUNDING') return unavailable('EVENT_AMOUNT');
  if (FLOW_MEASURES.has(series.scope.measure) && series.scope.periodKind === 'POINT') return unavailable('FLOW_WITHOUT_PERIOD');
  if (!series.scope.periodConvention) return unavailable('UNRESOLVED_PERIOD');
  const byPeriod = new Map<string, TrendPoint[]>();
  for (const point of series.points) {
    if (point.periodKey) byPeriod.set(point.periodKey, [...(byPeriod.get(point.periodKey) ?? []), point]);
  }
  // A later retrieval does not resolve contradictory amounts for the same target period.
  if ([...byPeriod.values()].some((points) => new Set(points.map((point) => point.amount)).size > 1)) {
    return unavailable('CONFLICTING_PERIOD', 'CONFLICTED');
  }
  const periods = [...byPeriod.keys()].sort();
  if (periods.length < 2) return unavailable('INSUFFICIENT_PERIODS', 'NOT_OBSERVED');
  const from = byPeriod.get(periods[periods.length - 2])![0];
  const to = byPeriod.get(periods[periods.length - 1])![0];
  const delta = to.amount - from.amount;
  if (!Number.isFinite(delta)) return unavailable('NON_FINITE_CHANGE');
  const ratio = from.amount > 0 ? delta / from.amount * 100 : null;
  return { status: 'COMPARABLE', reason: null, from, to, delta,
    percentageChange: ratio !== null && Number.isFinite(ratio) ? ratio : null,
    direction: delta > 0 ? 'increasing' : delta < 0 ? 'decreasing' : 'unchanged' };
}

/** Pure projection: no requests, collection, currency conversion or fabricated history. */
export function buildCaseTrends(input: TrendCaseInput, measure?: Measure): CaseTrends {
  const empty: CaseTrends = { entityId: input.id, name: input.name, sector: input.sector ?? null,
    readerForm: 'unavailable', status: 'NOT_OBSERVED', reason: 'READER_UNAVAILABLE', series: [], records: [] };
  const parsed = ReaderCaseSchema.safeParse(input.reader);
  if (!parsed.success) return empty;
  const reader = parsed.data;
  if (new Set(reader.sources.map((s) => s.id)).size !== reader.sources.length
    || new Set(reader.metrics.map((m) => m.id)).size !== reader.metrics.length
    || reader.sources.some((s) => !/^https?:\/\//i.test(s.url))) return empty;
  const sources = new Map(reader.sources.map((source) => [source.id, source]));
  const groups = new Map<string, MetricTrendSeries>();
  for (const metric of reader.metrics.filter((m) => !measure || m.measure === measure)) {
    const source = sources.get(metric.sourceId)!;
    const period = targetPeriod(metric);
    const sourceFamily = `${new URL(source.url).hostname.replace(/^www\./, '')}|${source.publisher}|${source.kind}`;
    const scope: MetricTrendSeries['scope'] = { measure: metric.measure, periodKind: metric.periodKind,
      origin: metric.origin, currency: metric.currency ?? null, unit: metric.unit ?? null,
      basis: metric.basis ?? null, label: metric.label ?? null, sourceFamily, periodConvention: period?.convention ?? null };
    const key = JSON.stringify(scope);
    const series = groups.get(key) ?? { scope, points: [], change: unavailable('INSUFFICIENT_PERIODS', 'NOT_OBSERVED') };
    series.points.push({ metricId: metric.id, period: metric.period, periodKey: period?.key ?? null,
      amount: metric.amount, statedAt: metric.statedAt ?? null, source });
    groups.set(key, series);
  }
  const series = [...groups.values()].map((group) => {
    group.points.sort((a, b) => (a.periodKey ?? '\uffff').localeCompare(b.periodKey ?? '\uffff'));
    group.change = compareSeries(group);
    return group;
  });
  const status = series.some((s) => s.change.status === 'COMPARABLE') ? 'COMPARABLE'
    : series.some((s) => s.change.status === 'CONFLICTED') ? 'CONFLICTED'
      : series.some((s) => s.change.status === 'NOT_COMPARABLE') ? 'NOT_COMPARABLE' : 'NOT_OBSERVED';
  const records = reader.facts.map((fact) => ({ ...fact, source: sources.get(fact.sourceId)! }))
    .sort((a, b) => (a.statedAt ?? '\uffff').localeCompare(b.statedAt ?? '\uffff'));
  return { ...empty, readerForm: reader.listForm ? 'summary' : 'detail', status,
    reason: status === 'COMPARABLE' ? null : series.find((s) => s.change.status === status)?.change.reason ?? 'NO_METRICS',
    series, records };
}

/** Coverage of a selected publication cohort, never market size/popularity or a sales ranking. */
export function summarizeCaseTrends(cases: readonly CaseTrends[]) {
  const compared = cases.flatMap((c) => c.series.filter((s) => s.change.status === 'COMPARABLE'));
  return {
    scope: 'CATALOG_SNAPSHOT' as const,
    cases: cases.length,
    observedMetricCases: cases.filter((c) => c.series.length > 0).length,
    comparableCases: cases.filter((c) => c.status === 'COMPARABLE').length,
    conflictedCases: cases.filter((c) => c.series.some((s) => s.change.status === 'CONFLICTED')).length,
    comparedSeries: compared.length,
    seriesDirections: { increasing: compared.filter((s) => s.change.direction === 'increasing').length,
      decreasing: compared.filter((s) => s.change.direction === 'decreasing').length,
      unchanged: compared.filter((s) => s.change.direction === 'unchanged').length },
  };
}
