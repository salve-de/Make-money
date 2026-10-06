import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { pickListMetric, metricMeasureLabel, formatMetricAmount } from '@/shared/display-text';
import { baremetrics, block, emptyReader, hannahMorgan } from '@/shared/__fixtures__/reader-samples';
import { analyzeScreen } from '../../../../scripts/architecture/screen-text-lib.mjs';
import { allowedUiTexts, isUnknownsLine } from '@/shared/ui-strings';
import { type ReaderCase } from '@/shared/reader-case';
import { ReaderEvidence, ReaderLedger } from './ReaderDetail';

const withAnalysis: ReaderCase = {
  ...baremetrics,
  analysis: [
    { id: 'a-take-home', item: 'TAKE_HOME', text: '費用を抑えれば手残りが増えると考えられる。', formula: '売上 − 運営費 = 手残り', basis: ['m1', 'f2'], confidence: 'LOW' },
    { id: 'a-story', item: 'STORY', text: '前夜：集計が面倒だった。隙：既存の数字が使えた。突破：集計を自動化した。金が回る仕組み：継続課金。', basis: ['f1'], confidence: 'MEDIUM' },
    { id: 'a-model', item: 'BUSINESS_MODEL', text: '集計の手間を減らし、継続課金で回す事業と考えられる。', basis: [], confidence: 'LOW' },
    { id: 'a-headline', item: 'HEADLINE', text: '面倒な集計を引き受けて、継続課金を積み上げる。', basis: ['f1'], confidence: 'HIGH' },
  ],
};

function detail(reader: ReaderCase): string {
  return renderToStaticMarkup(<ReaderLedger reader={reader} />);
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
    expect(detail(emptyReader)).not.toContain('<h3');
    const html = detail(baremetrics);
    expect(html).not.toContain('チーム');
    for (const heading of html.match(/<h3[^>]*>[^<]*<\/h3>/g) ?? []) expect(heading.length).toBeGreaterThan(0);
  });

  it('件数のラベルを出さず、概要は1回だけ、出典の重複は1つ', () => {
    const html = detail(baremetrics);
    expect(html).not.toMatch(/詳細 \d|特徴 \d|参照先あり/);
    expect(html.match(/data-fact(-part)?="f1"/g)?.length ?? 0).toBeGreaterThan(0);
    expect(html.match(/data-source=/g)).toHaveLength(1);
    expect(html).not.toContain('未確認');
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

  it('見どころは身元カード、物語は4段で経緯に出し、推論には薄い印を付ける', () => {
    const html = ledger(withAnalysis);
    expect(html.match(/data-analysis="a-headline"/g)).toHaveLength(1);
    expect(html).toContain('見どころ');
    expect(html).toContain('集計を自動化した');
    for (const step of ['前夜', '隙', '突破', '金が回る仕組み']) expect(html).toContain(`>${step}<`);
    expect(html).toMatch(/>(推測|推定)</);
    expect(html).not.toContain('確度');
    expect(html.indexOf('a-headline')).toBeLessThan(html.indexOf('section-story'));
  });

  it('目次と区画の見出しが対応し、空の区画は出さない', () => {
    const html = ledger(withAnalysis);
    const nav = html.slice(html.indexOf('<nav'), html.indexOf('</nav>'));
    const targets = [...nav.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    expect(targets.length).toBeGreaterThan(1);
    for (const id of targets) expect(html).toContain(`id="${id}"`);
    expect(ledger(emptyReader)).not.toContain('<nav');
  });

  it('同じ文を2回出さない', () => {
    const html = ledger(withAnalysis);
    const texts = [...html.matchAll(/<li class="relative[^>]*>(.*?)<\/li>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
    expect(new Set(texts).size).toBe(texts.length);
    expect(html.match(/data-analysis="a-take-home"/g)).toHaveLength(1);
  });

  it('印は presentation で変わる: ESTIMATE=推定、FACT_SUMMARY=印なし、無し=従来（式無しは推測）', () => {
    const one = (presentation?: 'ESTIMATE' | 'FACT_SUMMARY') => ledger({ ...baremetrics, analysis: [{ id: 'a-model', item: 'BUSINESS_MODEL', text: 'テスト用の推論です。', basis: ['f1'], ...(presentation ? { presentation } : {}) }] });
    expect(one('ESTIMATE')).toContain('>推定<');
    expect(one('FACT_SUMMARY')).not.toMatch(/>(推測|推定)</);
    expect(one()).toContain('>推測<');
  });

  it('計算式は計算がある推論だけ、根拠の区画に1回出す。定型の式は出さない', () => {
    const html = ledger(withAnalysis);
    expect(html.match(/計算・前提: /g)).toHaveLength(1);
    expect(html).toContain('計算・前提: </span>売上 − 運営費 = 手残り');
    expect(html.indexOf('計算・前提: ')).toBeGreaterThan(html.indexOf('section-basis'));
    expect(renderToStaticMarkup(<ReaderEvidence reader={baremetrics} />)).toBe('');
    const boiler = { ...withAnalysis, analysis: withAnalysis.analysis.map((a) => ({ ...a, formula: '数字は出典に載っている値' })) };
    expect(ledger(boiler)).not.toContain('出典に載っている値');
  });

  it('文の後ろの出典番号は、根拠の区画の出典一覧の行へ飛ぶ（番号体系は1つ）', () => {
    const html = ledger(withAnalysis);
    const refs = [...html.matchAll(/href="#([^"]+-source-\d+)"/g)].map((match) => match[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const id of refs) expect(html).toContain(`id="${id}"`);
    expect(html).not.toContain('data-evidence="basis"');
    expect(html.indexOf(withAnalysis.sources[0].publisher)).toBeGreaterThan(html.indexOf('section-sources'));
  });

  it('analysis が無ければ推論の印は出ない', () => {
    expect(ledger(baremetrics)).not.toContain('data-analysis');
  });

  it('複数の詳細を描いても飛び先の id が衝突しない', () => {
    const html = renderToStaticMarkup(<><ReaderLedger reader={withAnalysis} /><ReaderLedger reader={withAnalysis} /></>);
    const ids = [...html.matchAll(/id="(reader-[^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('画面の文字検査（出どころ・空の見出し・fact の重複）を通る', () => {
    const allowed = allowedUiTexts('Case');
    const result = analyzeScreen(ledger(withAnalysis), (t: string) => allowed.has(t) || isUnknownsLine(t));
    expect(result.unowned).toEqual([]);
    expect(result.emptyHeadings).toEqual([]);
    expect(result.dupFacts).toEqual([]);
  });
});

describe('詳細の取得状態（準備中と取り違えない）', () => {
  it('取得中は「準備中」ではなく読み込み中を出す', () => {
    const html = renderToStaticMarkup(<ReaderLedger detailState="loading" />);
    expect(html).toContain('詳細を読み込んでいます');
    expect(html).not.toContain('準備中');
  });
  it('取得に失敗したら失敗と再読み込みを出す', () => {
    const html = renderToStaticMarkup(<ReaderLedger detailState="failed" onRetry={() => undefined} />);
    expect(html).toContain('詳細の読み込みに失敗しました。');
    expect(html).toContain('再読み込み');
    expect(html).not.toContain('準備中');
  });
  it('取得が終わって reader が無い時だけ「準備中」を出す', () => {
    expect(renderToStaticMarkup(<ReaderLedger />)).toContain('準備中');
  });
  it('完全な reader があれば取得状態に関わらず中身だけを出す', () => {
    const html = renderToStaticMarkup(<ReaderLedger reader={baremetrics} detailState="failed" />);
    expect(html).not.toContain('詳細の読み込みに失敗しました。');
  });
  it('一覧用の reader（listForm）しか無い時は、失敗と再読み込みを中身の上に出す', () => {
    const html = renderToStaticMarkup(<ReaderLedger reader={{ ...baremetrics, listForm: true }} detailState="failed" onRetry={() => undefined} />);
    expect(html).toContain('詳細の読み込みに失敗しました。');
    expect(html).toContain('再読み込み');
  });
});
