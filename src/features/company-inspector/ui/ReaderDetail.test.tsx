import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { pickListMetric, metricMeasureLabel, formatMetricAmount } from '@/shared/display-text';
import { baremetrics, block, emptyReader, hannahMorgan } from '@/shared/__fixtures__/reader-samples';
import { analyzeScreen } from '../../../../scripts/architecture/screen-text-lib.mjs';
import { allowedUiTexts, isUnknownsLine } from '@/shared/ui-strings';
import { ANALYSIS_ITEMS, type ReaderCase } from '@/shared/reader-case';
import { ReaderAnalyses, ReaderAnalysisIntro, ReaderFacts, ReaderLedger, ReaderMetrics, ReaderSources, ReaderSummary, ReaderUnknowns } from './ReaderDetail';

const withAnalysis: ReaderCase = {
  ...baremetrics,
  analysis: [
    { id: 'a-take-home', item: 'TAKE_HOME', text: '費用を抑えれば手残りが増えると考えられる。', formula: '売上 − 運営費 = 手残り', basis: ['m1', 'f2'], confidence: 'LOW' },
    { id: 'a-story', item: 'STORY', text: '前夜：集計が面倒だった。隙：既存の数字が使えた。突破：集計を自動化した。金が回る仕組み：継続課金。', basis: ['f1'], confidence: 'MEDIUM' },
    { id: 'a-model', item: 'BUSINESS_MODEL', text: '集計の手間を減らし、継続課金で回す事業と考えられる。', basis: [], confidence: 'LOW' },
    { id: 'a-headline', item: 'HEADLINE', text: '面倒な集計を引き受けて、継続課金を積み上げる。', basis: ['f1'], confidence: 'HIGH' },
  ],
};

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

describe('reader analysis', () => {
  const ledger = (reader: ReaderCase) => renderToStaticMarkup(<ReaderLedger reader={reader} />);

  it('冒頭に大きい HEADLINE と STORY を各1回、両方に推測の印と確度を出す', () => {
    const html = ledger(withAnalysis);
    const intro = renderToStaticMarkup(<ReaderAnalysisIntro reader={withAnalysis} />);
    expect(intro).toMatch(/<h3 class="[^"]*text-lg[^"]*">面倒な集計/);
    expect(intro.match(/>推測</g)).toHaveLength(2);
    expect(intro).toContain('確度: 高');
    expect(intro).toContain('確度: 中');
    expect(html.match(/data-analysis="a-headline"/g)).toHaveLength(1);
    expect(html.match(/data-analysis="a-story"/g)).toHaveLength(1);
    expect(html.indexOf('a-headline')).toBeLessThan(html.indexOf('a-story'));
    expect(html.indexOf('a-story')).toBeLessThan(html.indexOf('data-fact="f1"'));
  });

  it('事実の後に推測欄を出し、項目名・本文・計算・確度を表示する', () => {
    const html = ledger(withAnalysis);
    expect(html.indexOf('section-analysis')).toBeGreaterThan(html.indexOf('data-fact="f2"'));
    expect(html).toContain('アナリストの推測');
    expect(html).toContain('事業の形');
    expect(html).toContain('手残り');
    expect(html).toContain(withAnalysis.analysis[0].text);
    expect(html).toContain('計算: </span>売上 − 運営費 = 手残り');
    expect(html).toContain('確度: 低');
    const rows = renderToStaticMarkup(<ReaderAnalyses reader={withAnalysis} />);
    expect(rows.match(/>推測</g)).toHaveLength(2);
    expect(rows).not.toContain('a-headline');
    expect(rows).not.toContain('a-story');
  });

  it('入力順によらず ANALYSIS_ITEMS の順で全項目を並べる', () => {
    const items = ANALYSIS_ITEMS.filter((item) => item !== 'HEADLINE' && item !== 'STORY');
    const html = ledger({ ...baremetrics, analysis: [...items].reverse().map((item) => ({
      id: `a-${item}`, item, text: `${item}のテスト用推論`, basis: [], confidence: 'LOW',
    })) });
    const ids = [...html.matchAll(/data-analysis="a-([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toEqual(items);
  });

  it('basis は概要・事実・数値の実在する行へのページ内リンクになる', () => {
    const html = ledger(withAnalysis);
    const links = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
    expect(links).toHaveLength(4);
    for (const id of links) expect(html).toContain(`id="${id}"`);
    expect(links.some((id) => id.endsWith('-evidence-f1'))).toBe(true);
    expect(links.some((id) => id.endsWith('-evidence-f2'))).toBe(true);
    expect(links.some((id) => id.endsWith('-evidence-m1'))).toBe(true);
    expect(html).toMatch(/href="#[^"]+-evidence-m1"[^>]*>売却額 2023 \$4M<\/a>/);
    expect(html).toMatch(/href="#[^"]+-evidence-f2"[^>]*>2023年に別の会社へ売却された。<\/a>/);
  });

  it('analysis が空・reader が無い時は推測欄も HEADLINE も出さない', () => {
    for (const reader of [emptyReader, baremetrics, undefined]) {
      expect(renderToStaticMarkup(<ReaderAnalysisIntro reader={reader} />)).toBe('');
      expect(renderToStaticMarkup(<ReaderAnalyses reader={reader} />)).toBe('');
    }
    expect(ledger(baremetrics)).not.toContain('section-analysis');
    expect(ledger(emptyReader)).toBe('');
  });

  it('根拠・計算が無い時は空のラベルを出さず、STORY だけでも表示する', () => {
    const reader = { ...emptyReader, analysis: [withAnalysis.analysis[1], withAnalysis.analysis[2]] };
    const intro = renderToStaticMarkup(<ReaderAnalysisIntro reader={{ ...reader, analysis: [{ ...reader.analysis[0], basis: [] }] }} />);
    expect(intro).toContain('物語');
    expect(intro).not.toContain('<h3');
    const rows = renderToStaticMarkup(<ReaderAnalyses reader={reader} />);
    expect(rows).not.toContain('根拠:');
    expect(rows).not.toContain('計算:');
  });

  it('複数の詳細を描いても根拠の飛び先が衝突しない', () => {
    const html = renderToStaticMarkup(<><ReaderLedger reader={withAnalysis} /><ReaderLedger reader={withAnalysis} /></>);
    const ids = [...html.matchAll(/id="([^"]+-evidence-[^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('根拠の id に日本語・空白・% があってもリンク先が一致する', () => {
    const id = '創業 100%';
    const html = ledger({ ...emptyReader,
      facts: [{ ...baremetrics.facts[1], id }],
      analysis: [{ ...withAnalysis.analysis[2], basis: [id] }],
    });
    const href = html.match(/href="#([^"]+)"/)?.[1];
    expect(href).toBeDefined();
    expect(html).toContain(`id="${decodeURIComponent(href!)}"`);
  });

  it('推測を fact と偽装せず、画面の文字検査も通る', () => {
    const allowed = allowedUiTexts('Case');
    const result = analyzeScreen(ledger(withAnalysis), (t: string) => allowed.has(t) || isUnknownsLine(t));
    expect(result.unowned).toEqual([]);
    expect(result.emptyHeadings).toEqual([]);
    expect(result.dupFacts).toEqual([]);
    expect(result.factCount).toBe(withAnalysis.facts.length);
  });
});
