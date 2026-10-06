import { describe, expect, it } from 'vitest';
import type { ReaderCase, ReaderMetric } from '@/shared/reader-case';
import samples from '../../../data/fixtures/reader-case.sample.json';
import { buildCaseTrends, summarizeCaseTrends } from './case-trends';

const source = { id: 's1', publisher: 'Example', url: 'https://example.com/reports', kind: 'OFFICIAL' as const,
  publishedAt: '2026-09-30', checkedAt: '2026-10-02' };
const metric = (id: string, period: string, amount: number, patch: Partial<ReaderMetric> = {}): ReaderMetric => ({
  id, measure: 'REVENUE', periodKind: 'MONTH', period, amount, currency: 'USD', origin: 'SELF_REPORTED', sourceId: 's1', ...patch,
});
function reader(metrics: ReaderMetric[], patch: Partial<ReaderCase> = {}): ReaderCase {
  return { sources: [source], facts: [{ id: 'f1', kind: 'DESCRIPTION', text: '公開の事業説明。', sourceId: 's1', attribution: 'OFFICIAL' }],
    metrics, unknowns: [], analysis: [], ...patch };
}
const project = (r: ReaderCase) => buildCaseTrends({ id: 'ent_fixture', name: 'Fixture', reader: r });

describe('sourced case changes', () => {
  it('orders target periods and compares the latest two, preserving source dates and original units', () => {
    const result = project(reader([metric('m3', '2026-09', 150), metric('m1', '2026-07', 80), metric('m2', '2026年8月', 100)]));
    expect(result.series[0].points.map((p) => p.metricId)).toEqual(['m1', 'm2', 'm3']);
    expect(result.series[0].change).toMatchObject({ status: 'COMPARABLE', delta: 50, percentageChange: 50,
      from: { metricId: 'm2' }, to: { metricId: 'm3', period: '2026-09', source }, direction: 'increasing' });
  });

  it('keeps revenue unobserved without inventing it from description, profit, analysis or legacy fields', () => {
    const r = reader([metric('profit', 'FY2025', 50, { measure: 'NET_INCOME', periodKind: 'FISCAL_YEAR' })]);
    const result = buildCaseTrends({ id: 'ent_fixture', name: 'Fixture', reader: r, monthlyRevenue: 999, growthRateYoY: 500 } as Parameters<typeof buildCaseTrends>[0], 'REVENUE');
    expect(result).toMatchObject({ status: 'NOT_OBSERVED', reason: 'NO_METRICS', series: [] });
    expect(result.records[0].text).toBe('公開の事業説明。');
    expect(project(r).series[0].scope.measure).toBe('NET_INCOME');
    expect(JSON.stringify(project(r))).not.toContain('TAKE_HOME');
  });

  it.each(['昨年', '月', '2026-02-30', '2026-13', '2026-10-02 取得時点の直近30日'])(
    'does not turn retrieval/publication dates or ambiguous period %s into measurements', (period) => {
      const result = project(reader([metric('m1', period, 100), metric('m2', period, 120)]));
      expect(result.series[0].change).toMatchObject({ status: 'NOT_COMPARABLE', reason: 'UNRESOLVED_PERIOD', percentageChange: null });
      expect(result.series[0].points.every((p) => p.periodKey === null)).toBe(true);
    });

  it.each<Partial<ReaderMetric>>([
    { currency: 'JPY' }, { measure: 'NET_INCOME' }, { periodKind: 'YEAR', period: '2026' },
    { origin: 'ARTICLE' }, { basis: '連結' }, { label: '別製品' },
  ])('does not mix currency, measure, accounting scope, attribution or period kind: %j', (patch) => {
    const result = project(reader([metric('m1', '2026-08', 100), metric('m2', '2026-09', 120, patch)]));
    expect(result.series).toHaveLength(2);
    expect(result.series.every((s) => s.change.percentageChange === null)).toBe(true);
  });

  it('separates providers and repeated observations do not create a new period', () => {
    const r = reader([metric('m1', '2026-08', 100), metric('m2', '2026-08', 100), metric('m3', '2026-09', 120, { sourceId: 's2' })],
      { sources: [source, { ...source, id: 's2', publisher: 'Reporter', url: 'https://reporter.example/article' }] });
    expect(project(r).series.every((s) => s.change.status === 'NOT_OBSERVED')).toBe(true);
    r.metrics.push(metric('m4', '2026-08', 130));
    expect(project(r).series[0].change).toMatchObject({ status: 'CONFLICTED', reason: 'CONFLICTING_PERIOD', delta: null });
  });

  it('uses null for a zero/negative percentage baseline and retains numeric changes', () => {
    for (const amount of [0, -100]) {
      const change = project(reader([metric('a', '2026-08', amount), metric('b', '2026-09', 50)])).series[0].change;
      expect(change).toMatchObject({ status: 'COMPARABLE', percentageChange: null, delta: 50 - amount });
    }
  });

  it('retains estimates, period-less flows and individual transactions without promoting them to measured growth', () => {
    for (const [patch, reason] of [
      [{ origin: 'ESTIMATED' }, 'ESTIMATED'], [{ periodKind: 'POINT' }, 'FLOW_WITHOUT_PERIOD'],
      [{ measure: 'EXIT_VALUE' }, 'EVENT_AMOUNT'], [{ measure: 'REVENUE', currency: undefined, unit: '人' }, 'MISSING_UNIT'],
    ] as const) {
      const result = project(reader([metric('a', '2026-08', 100, patch), metric('b', '2026-09', 120, patch)]));
      expect(result.series[0].points).toHaveLength(2);
      expect(result.series[0].change).toMatchObject({ status: 'NOT_COMPARABLE', reason });
    }
  });

  it('compares explicit fiscal years and equal rolling windows without blending different window lengths', () => {
    const fy = project(reader([metric('a', 'FY2024', 100, { periodKind: 'FISCAL_YEAR' }), metric('b', 'FY2025', 120, { periodKind: 'FISCAL_YEAR' })]));
    expect(fy.series[0].change.percentageChange).toBe(20);
    const rolling = project(reader([metric('a', '30日・2026-08-31終了', 100, { periodKind: 'TRAILING_DAYS' }),
      metric('b', '30日・2026-09-30終了', 150, { periodKind: 'TRAILING_DAYS' }),
      metric('c', '7日・2026-09-30終了', 40, { periodKind: 'TRAILING_DAYS' })]));
    expect(rolling.series).toHaveLength(2);
    expect(rolling.series[0].change.percentageChange).toBe(50);
    expect(rolling.series[1].change.percentageChange).toBeNull();
  });

  it('keeps discussion counts separate from sales and reports catalog coverage with denominators', () => {
    const discussion = project(reader([metric('a', '2026-08', 10, { measure: 'OTHER', label: '投稿数', currency: undefined, unit: '件' }),
      metric('b', '2026-09', 20, { measure: 'OTHER', label: '投稿数', currency: undefined, unit: '件' })]));
    expect(discussion.series[0].scope).toMatchObject({ measure: 'OTHER', label: '投稿数', unit: '件', currency: null });
    expect(summarizeCaseTrends([discussion, project(reader([]))])).toMatchObject({ scope: 'CATALOG_SNAPSHOT', cases: 2,
      observedMetricCases: 1, comparableCases: 1, comparedSeries: 1, seriesDirections: { increasing: 1 } });
  });

  it('validates reader input and does not leak unsafe links or private source metadata', () => {
    expect(buildCaseTrends({ id: 'x', name: 'X', reader: {} }).reason).toBe('READER_UNAVAILABLE');
    expect(project(reader([], { sources: [{ ...source, url: 'javascript:alert(1)' }] })).reason).toBe('READER_UNAVAILABLE');
    const result = project(reader([], { sources: [{ ...source, privateBody: 'never publish' } as typeof source] }));
    expect(JSON.stringify(result)).not.toContain('never publish');
  });

  it('reads the five existing fixtures without inventing historical points or growth', () => {
    const cases = Object.entries(samples).map(([id, r]) => buildCaseTrends({ id, name: id, reader: r }));
    expect(cases).toHaveLength(5);
    expect(cases.every((c) => c.readerForm === 'detail')).toBe(true);
    expect(cases.every((c) => c.series.length > 0 && c.status !== 'COMPARABLE')).toBe(true);
    expect(summarizeCaseTrends(cases).comparableCases).toBe(0);
  });
});
