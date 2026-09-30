import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { pickListMetric, metricMeasureLabel, formatMetricAmount } from '@/shared/display-text';
import { baremetrics, block, emptyReader, hannahMorgan } from '@/shared/__fixtures__/reader-samples';
import { analyzeScreen } from '../../../../scripts/architecture/screen-text-lib.mjs';
import { allowedUiTexts, isUnknownsLine } from '@/shared/ui-strings';
import { ReaderFacts, ReaderMetrics, ReaderSources, ReaderSummary, ReaderUnknowns } from './ReaderDetail';

function detail(reader: Parameters<typeof ReaderSummary>[0]['reader']): string {
  return renderToStaticMarkup(
    <>
      <ReaderSummary reader={reader} />
      <ReaderMetrics reader={reader} />
      <ReaderFacts reader={reader} />
      <ReaderSources reader={reader} />
      <ReaderUnknowns reader={reader} />
    </>,
  );
}

describe('reader detail', () => {
  it('Baremetrics の一覧の欄は「売却額」になる', () => {
    const m = pickListMetric(baremetrics);
    expect(m && metricMeasureLabel(m)).toBe('売却額');
    expect(m && formatMetricAmount(m)).toBe('$4M');
  });

  it('売上は FILED の年次を、月次の記事より先に選ぶ', () => {
    expect(pickListMetric(block)?.id).toBe('m1');
  });

  it('Block は「推定」が付かない', () => {
    expect(detail(block)).not.toContain('推定');
  });

  it('Hannah Morgan は「昨年」を2024年と書かない', () => {
    const html = detail(hannahMorgan);
    expect(html).toContain('昨年');
    expect(html).not.toContain('2024年');
  });

  it('origin=ESTIMATED の時だけ「推定」を出す', () => {
    const est = { ...block, metrics: [{ ...block.metrics[0], origin: 'ESTIMATED' as const }] };
    expect(detail(est)).toContain('推定');
  });

  it('空の見出しが出ない', () => {
    expect(detail(emptyReader)).toBe('');
    const html = detail(baremetrics);
    expect(html).not.toContain('料金');
    expect(html).not.toContain('チーム');
    for (const heading of html.match(/<h3[^>]*>[^<]*<\/h3>/g) ?? []) expect(heading.length).toBeGreaterThan(0);
  });

  it('件数のラベルを出さず、概要は1回だけ、出典の重複は1つ', () => {
    const html = detail(baremetrics);
    expect(html).not.toMatch(/詳細 \d|特徴 \d|参照先あり/);
    expect(html.match(/data-fact="f1"/g)).toHaveLength(1);
    expect(html.match(/data-source=/g)).toHaveLength(1);
    expect(html).toContain('未確認: 売上・利益');
  });

  it('基準の注記を出す', () => {
    expect(detail(block)).toContain('継続事業ベース');
  });

  it('見本の詳細画面は、出どころの無い文字・空の見出し・fact の重複が0', () => {
    const allowed = allowedUiTexts('Case');
    for (const reader of [baremetrics, block, hannahMorgan, emptyReader]) {
      const r = analyzeScreen(detail(reader), (t: string) => allowed.has(t) || isUnknownsLine(t));
      expect(r.unowned).toEqual([]);
      expect(r.emptyHeadings).toEqual([]);
      expect(r.dupFacts).toEqual([]);
    }
  });
});
