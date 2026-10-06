import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildCaseTrends, summarizeCaseTrends, type CaseTrends, type TrendCorpus } from '@/lib/company-access/case-trends';
import type { ReaderFact, ReaderMetric, ReaderSource } from '@/shared/reader-case';
import { CaseTrendsSummary, type CaseTrendsSummaryProps } from './CaseTrendsSummary';

const source: ReaderSource = { id: 's1', publisher: '公開書類', url: 'https://source.example/report', kind: 'FILING', checkedAt: '2026-09-30' };
const corpus: TrendCorpus = { version: 7, hash: 'internal-reference-do-not-display', publishedCaseCount: 323, checkedAt: null };
const metric = (changes: Partial<ReaderMetric> = {}): ReaderMetric => ({ id: 'm1', measure: 'REVENUE', periodKind: 'YEAR', period: '2024', amount: 100, currency: 'USD', origin: 'FILED', sourceId: 's1', ...changes });
const fact = (changes: Partial<ReaderFact> = {}): ReaderFact => ({ id: 'f1', kind: 'DESCRIPTION', text: '予約の受付と顧客メモをまとめるサービス。', sourceId: 's1', attribution: 'OFFICIAL', ...changes });
function item(id = 'ent_example', metrics: ReaderMetric[] = [metric()], records: ReaderFact[] = []): CaseTrends {
  return buildCaseTrends({ id, name: `事例 ${id}`, reader: { sources: [source], facts: records, metrics, unknowns: [], analysis: [] } });
}
const compared = () => item('ent_compared', [metric(), metric({ id: 'm2', period: '2025', amount: 150 })]);
function html(cases: readonly CaseTrends[] = [item()], changes: Partial<CaseTrendsSummaryProps> = {}) {
  return renderToStaticMarkup(<CaseTrendsSummary cases={cases} coverage={summarizeCaseTrends(cases)} corpus={corpus} {...changes} />);
}

describe('CaseTrendsSummary', () => {
  it('keeps full filtered coverage distinct from examples on one page', () => {
    const coverage = { ...summarizeCaseTrends([compared()]), cases: 120, observedMetricCases: 90, comparableCases: 20, comparedSeries: 30,
      seriesDirections: { increasing: 12, decreasing: 10, unchanged: 8 } };
    const output = html([item()], { coverage });
    expect(output).toContain('公開323事例のうち、現在の条件に合う120事例');
    expect(output).toMatch(/<dt[^>]*>数値あり<\/dt><dd[^>]*>90<span/);
    expect(output).toMatch(/<dt[^>]*>期間比較<\/dt><dd[^>]*>20<span/);
    expect(output).toContain('表示中の1事例から');
    expect(output).toContain('件数は条件に合う事例全体です');
    expect(output).toContain('対象全体で比較できる30件の指標：増加12・減少10・横ばい8');
  });

  it('offers recorded information when there are no period comparisons', () => {
    const output = html();
    expect(output).toContain('まずは記録された数字や公表内容');
    expect(output).toContain('$100');
    expect(output).toContain('class="term-num break-words text-term-fg-strong">$100</span>');
    expect(output).toContain('2024');
    expect(output).toContain('提出書類');
    expect(output).not.toContain('対象全体で比較できる');
    expect(output).not.toContain('%');
    expect(output).not.toContain('role="alert"');
  });

  it('shows the actual compared amounts, periods and source without deriving another rate', () => {
    const output = html([compared()]);
    expect(output).toContain('$100 → $150');
    expect(output).toContain('2024 → 2025');
    expect(output).toContain('href="https://source.example/report"');
    expect(output.match(/href="https:\/\/source.example\/report"/g)).toHaveLength(1);
    expect(output).toContain('target="_blank" rel="noopener noreferrer"');
    expect(output).not.toContain('50%');
  });

  it('prefers a comparable series over an unrelated single recorded amount', () => {
    const entry = compared();
    entry.series.unshift(item('ent_other', [metric({ measure: 'COST', amount: 999 })]).series[0]);
    const output = html([entry]);
    expect(output).toContain('$100 → $150');
    expect(output).not.toContain('$999');
  });

  it('labels estimates and does not present them as changes', () => {
    const output = html([item('ent_estimated', [metric({ origin: 'ESTIMATED' }), metric({ id: 'm2', period: '2025', amount: 200, origin: 'ESTIMATED' })])]);
    expect(output).toContain('推定');
    expect(output).toContain('class="ml-2 text-xs text-term-label">推定');
    expect(output).toContain('class="term-num break-words text-xs text-term-label">$100</span>');
    expect(output).not.toContain('text-term-accent');
    expect(output).toContain('$100');
    expect(output).not.toContain('$100 → $200');
  });

  it('preserves a recurring amount without inventing a calendar date', () => {
    const output = html([item('ent_month', [metric({ periodKind: 'MONTH', period: '月' })])]);
    expect(output).toContain('月（時期未確定）');
    expect(output).not.toContain('2026-10');
  });

  it('preserves currency and user units without converting them to yen', () => {
    const euro = item('ent_euro', [metric({ currency: 'EUR', amount: 74500, periodKind: 'FISCAL_YEAR', period: 'FY2025' })]);
    const users = item('ent_users', [metric({ measure: 'USERS', currency: undefined, unit: '人', amount: 1000 })]);
    const output = html([euro, users]);
    expect(output).toContain('EUR 74.5K');
    expect(output).toContain('1000人');
    expect(output).not.toContain('円');
  });

  it('keeps a genuinely recorded zero visible', () => {
    expect(html([item('ent_zero', [metric({ amount: 0 })])])).toContain('$0');
  });

  it('shows a sourced statement when there are no numerical records', () => {
    const output = html([item('ent_statement', [], [fact({ statedAt: '2025-09-01', attribution: 'SELF_REPORTED' })])]);
    expect(output).toContain('予約の受付と顧客メモをまとめるサービス。');
    expect(output).toContain('本人申告');
    expect(output).toContain('公表日 2025-09-01');
    expect(output).toContain('公開書類');
    expect(output).not.toContain('対象期間未記録');
  });

  it('does not silently pick an amount from conflicting records', () => {
    const entry = item('ent_conflict', [metric(), metric({ id: 'm2', amount: 200 })], [fact()]);
    expect(entry.status).toBe('CONFLICTED');
    const output = html([entry]);
    expect(output).not.toContain('$100');
    expect(output).not.toContain('$200');
    expect(output).toContain('予約の受付と顧客メモ');
  });

  it('does not present a unitless or non-finite amount as a meaningful example', () => {
    const unitless = item('ent_unitless', [metric({ currency: undefined })]);
    const nonFinite = item('ent_nonfinite');
    nonFinite.series[0].points[0].amount = Number.POSITIVE_INFINITY;
    const output = html([unitless, nonFinite]);
    expect(output).not.toContain('$100');
    expect(output).not.toContain('Infinity');
    expect(output).not.toContain('このページの記録から');
  });

  it('handles an empty filtered result without claiming observations or a current check date', () => {
    const output = html([]);
    expect(output).toContain('現在の条件に合う0事例');
    expect(output).toContain('条件を変えて');
    expect(output).not.toContain('このページの記録から');
    expect(output).not.toContain('確認日');
    expect(output).not.toContain('未観測');
  });

  it('handles unavailable page data without fabricating facts or links', () => {
    const output = html([buildCaseTrends({ id: 'ent_unavailable', name: '未取得' })]);
    expect(output).not.toContain('このページの記録から');
    expect(output).not.toContain('href=');
    expect(output).not.toContain('未記録');
  });

  it('does not expose stale page examples when the filtered cohort has become empty', () => {
    const output = html([compared()], { coverage: summarizeCaseTrends([]) });
    expect(output).toContain('現在の条件に合う0事例');
    expect(output).not.toContain('$100');
    expect(output).not.toContain('href=');
    expect(output).not.toContain('このページの記録から');
  });

  it('does not repeat the sample note or the cohort size when every case is on the page', () => {
    const output = html(Array.from({ length: 3 }, (_, i) => item(`ent_${i}`)), { corpus: { ...corpus, publishedCaseCount: 3 } });
    expect(output).toContain('公開3事例が対象です。');
    expect(output).not.toContain('現在の条件に合う');
    expect(output).not.toContain('表示中の');
    expect(output).not.toContain('期間比較');
  });

  it('limits examples while describing the actual page size, not the sample size', () => {
    const cases = Array.from({ length: 25 }, (_, i) => item(`ent_${i}`));
    const output = html(cases, { coverage: { ...summarizeCaseTrends(cases), cases: 120 } });
    expect(output).toContain('表示中の25事例から');
    expect(output.match(/href="\/\?entity=/g)).toHaveLength(3);
    expect(output).not.toContain('事例 ent_3');
  });

  it('keeps stable existing case URLs safe and encodes the ID', () => {
    const output = html([item('ent_&other=1')]);
    expect(output).toContain('href="/?entity=ent_%26other%3D1"');
    expect(output).not.toContain('/build');
    expect(output).not.toContain('/marketplace');
  });

  it.each(['javascript:alert(1)', 'data:text/html,hello', 'https://user:secret@source.example/', 'https://source.example/\nprivate'])('does not make an unsafe source URL clickable: %s', (url) => {
    const entry = item();
    entry.series[0].points[0].source = { ...source, url };
    const output = html([entry]);
    expect(output).toContain('公開書類');
    expect(output).not.toContain('target="_blank"');
    expect(output).not.toContain('secret');
  });

  it('escapes factual text and labels rather than rendering markup', () => {
    const entry = item('ent_escape', [], [fact({ text: '<script>alert(1)</script>' })]);
    entry.name = '<img src=x>';
    const output = html([entry]);
    expect(output).toContain('&lt;script&gt;');
    expect(output).toContain('&lt;img src=x&gt;');
    expect(output).not.toContain('<script>');
  });

  it('does not mutate readonly page inputs or expose internal corpus references', () => {
    const cases = Object.freeze([item()]);
    const before = JSON.stringify(cases);
    const output = html(cases, { corpus: { ...corpus, checkedAt: '2026-09-30' } });
    expect(JSON.stringify(cases)).toBe(before);
    expect(output).toContain('確認日 2026-09-30');
    expect(output).not.toContain(corpus.hash);
    expect(output).not.toMatch(/CATALOG_SNAPSHOT|COMPARABLE|NOT_OBSERVED|QA|本番接続/);
    expect(output).toContain('aria-label="傾向の見どころ"');
    expect(output).toContain('市場全体の伸びや成功率を表すものではありません');
  });
});
