import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { pickListMetric, metricMeasureLabel, formatMetricAmount } from '@/shared/display-text';
import { baremetrics, block, emptyReader, hannahMorgan } from '@/shared/__fixtures__/reader-samples';
import { analyzeScreen } from '../../../../scripts/architecture/screen-text-lib.mjs';
import { allowedUiTexts, isUnknownsLine } from '@/shared/ui-strings';
import { ANALYSIS_ITEMS, type ReaderCase } from '@/shared/reader-case';
import { ANALYSIS_GROUPS, AnalysisGroups, Headline, planKeyStrip, StorySteps } from './ReaderOverview';
import { ReaderEvidence, ReaderFacts, ReaderLedger, ReaderMetrics, ReaderSources, ReaderSummary, ReaderUnknowns } from './ReaderDetail';

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

  it('先頭に大きい HEADLINE、続いて4段の STORY。どちらにも推測の印と確度を出す', () => {
    const html = ledger(withAnalysis);
    const head = renderToStaticMarkup(<Headline reader={withAnalysis} />);
    expect(head).toMatch(/<h3 class="[^"]*text-\[19px\][^"]*">面倒な集計/);
    const story = renderToStaticMarkup(<StorySteps reader={withAnalysis} />);
    expect(story.match(/<li /g)).toHaveLength(4);
    expect(story).toContain('集計を自動化した');
    expect(html.match(/data-analysis="a-headline"/g)).toHaveLength(1);
    expect(html.match(/data-analysis="a-story"/g)).toHaveLength(1);
    expect(html.indexOf('a-headline')).toBeLessThan(html.indexOf('a-story'));
    expect(html.indexOf('a-story')).toBeLessThan(html.indexOf('data-fact="f2"'));
    // 推論には必ず薄灰色の言葉の印が付く（確度ラベルは出さない）
    expect(head).toMatch(/>(推測|推定)</);
    expect(story).toMatch(/>(推測|推定)</);
    expect(html).not.toContain('確度');
  });

  it('4段の形でない STORY はそのまま1つの文で出す', () => {
    const story = renderToStaticMarkup(<StorySteps reader={{ ...withAnalysis, analysis: [{ ...withAnalysis.analysis[1], text: '集計を自動化した。' }] }} />);
    expect(story).not.toContain('<li');
    expect(story).toContain('集計を自動化した。');
  });

  it('推測は問いごとのまとまりで、事実の前に、項目名・結論・確度だけを出す。数値の表は下の畳み欄に入る', () => {
    const html = ledger(withAnalysis);
    expect(html.indexOf('どう稼ぐか')).toBeLessThan(html.indexOf('data-fact="f2"'));
    expect(html.indexOf('section-metrics')).toBeGreaterThan(html.indexOf('<details'));
    expect(html).toContain('事業の形');
    expect(html).toContain('手残り');
    expect(html).toContain('費用を抑えれば手残りが増える。');
    const rows = renderToStaticMarkup(<AnalysisGroups reader={withAnalysis} usage={planKeyStrip(withAnalysis).usage} />);
    expect(rows).not.toContain('a-headline');
    expect(rows).not.toContain('a-story');
    expect(rows).not.toContain('a-take-home');
    expect(rows).not.toContain('計算・前提:');
    expect(rows).not.toContain('根拠:');
    expect(rows).not.toContain('href=');
  });

  it('主要な数字の帯に出した推測は、下のまとまりに2回出さない', () => {
    const html = ledger(withAnalysis);
    expect(html.match(/data-analysis="a-take-home"/g)).toHaveLength(1);
    expect(html.indexOf('a-take-home')).toBeLessThan(html.indexOf('a-model'));
  });

  it('印は presentation で変わる: ESTIMATE=推定、FACT_SUMMARY=印なし、無し=従来（式無しは推測）', () => {
    const one = (presentation?: 'ESTIMATE' | 'FACT_SUMMARY') => renderToStaticMarkup(<AnalysisGroups reader={{ ...baremetrics, analysis: [{ id: 'a-model', item: 'BUSINESS_MODEL', text: 'テスト', basis: ['f1'], ...(presentation ? { presentation } : {}) }] }} usage={{ items: new Set(), factIds: new Set() }} />);
    expect(one('ESTIMATE')).toContain('>推定<');
    expect(one('FACT_SUMMARY')).not.toMatch(/>(推測|推定)</);
    expect(one()).toContain('>推測<');
    expect(one('ESTIMATE')).not.toContain('確度');
  });

  it('リードは基準を通った時だけ出す（断り書き付き・出典に無い数字・製品説明は出さない）', () => {
    const show = (text: string) => renderToStaticMarkup(<Headline reader={{ ...withAnalysis, analysis: [{ id: 'a-headline', item: 'HEADLINE', text, basis: ['f1'] }] }} />);
    expect(show('面倒な集計を引き受けて、継続課金を積み上げる。')).toContain('<h3');
    expect(show('集計を自動化し、月$2万売上（本人公表）。')).not.toContain('<h3');
    expect(show('集計を引き受け、月$9,999,999を稼ぐ。')).not.toContain('<h3');
    expect(show('集計をまとめるツールを提供する。')).not.toContain('<h3');
    expect(show('集計を引き受け、月$2万〜5万を稼ぐ。')).not.toContain('<h3');
  });

  it('計算と根拠は事実の後・出典の前の1区画にまとめる', () => {
    const html = ledger(withAnalysis);
    const at = html.indexOf('section-reasoning');
    expect(at).toBeGreaterThan(html.indexOf('data-fact="f2"'));
    expect(at).toBeLessThan(html.indexOf('section-sources'));
    expect(html.match(/計算・前提: /g)).toHaveLength(1);
    expect(html).toContain('計算・前提: </span>売上 − 運営費 = 手残り');
    expect(html.indexOf('計算・前提: ')).toBeGreaterThan(at);
    expect(html.indexOf('根拠: ')).toBeGreaterThan(at);
    expect(renderToStaticMarkup(<ReaderEvidence reader={baremetrics} />)).toBe('');
  });

  it('事実と数値の行は出典名の代わりに番号を付け、番号は下の出典一覧の行へ飛ぶ', () => {
    const html = ledger(withAnalysis);
    const publisher = withAnalysis.sources[0].publisher;
    expect(html.indexOf(publisher)).toBeGreaterThan(html.indexOf('section-sources'));
    const refs = [...html.matchAll(/href="#([^"]+-source-\d+)"/g)].map((match) => match[1]);
    expect(refs.length).toBe(withAnalysis.facts.length + withAnalysis.metrics.length - 1);
    for (const id of refs) expect(html).toContain(`id="${id}"`);
  });

  it('入力順によらず、帯 → 問いのまとまりの順で全項目を1回ずつ並べる', () => {
    const items = ANALYSIS_ITEMS.filter((item) => item !== 'HEADLINE' && item !== 'STORY');
    const reader: ReaderCase = { ...baremetrics, analysis: [...items].reverse().map((item) => ({
      id: `a-${item}`, item, text: `${item}のテスト用推論`, basis: [], confidence: 'LOW',
    })) };
    const html = ledger(reader);
    const ids = [...html.matchAll(/data-analysis="a-([^"]+)"/g)].map((match) => match[1]);
    const plan = planKeyStrip(reader);
    const expected = [...plan.analyses.map((a) => a.item), ...ANALYSIS_GROUPS.flatMap((g) => g.items).filter((i) => !plan.usage.items.has(i))];
    expect(ids).toEqual(expected);
    expect([...ids].sort()).toEqual([...items].sort());
  });

  it('根拠は番号で示し、使った事実は下に1回だけ並べる', () => {
    const html = ledger(withAnalysis);
    const links = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => decodeURIComponent(match[1])).filter((id) => id.includes('-evidence-basis-'));
    // HEADLINE(f1) + STORY(f1) + TAKE_HOME(m1, f2) = 4本、使った事実は f1・m1・f2 の3つ
    expect(links).toHaveLength(4);
    for (const id of links) expect(html).toContain(`id="${id}"`);
    expect(new Set(links).size).toBe(3);
    const list = html.slice(html.indexOf('data-evidence="basis"'), html.indexOf('section-sources'));
    expect(list.match(/<li /g)).toHaveLength(3);
    expect(list).toContain('売却額 2023 $4M');
    const est = ledger({ ...withAnalysis, metrics: [{ ...withAnalysis.metrics[0], origin: 'ESTIMATED' as const }] });
    expect(est.slice(est.indexOf('data-evidence="basis"'))).toContain('売却額 2023 $4M 推定');
    expect(list).toContain('2023年に別の会社へ売却された。');
  });

  it('analysis が空・reader が無い時は推測のまとまりも HEADLINE も出さない', () => {
    for (const reader of [emptyReader, baremetrics]) {
      expect(renderToStaticMarkup(<Headline reader={reader} />)).toBe('');
      expect(renderToStaticMarkup(<StorySteps reader={reader} />)).toBe('');
      expect(renderToStaticMarkup(<AnalysisGroups reader={reader} usage={planKeyStrip(reader).usage} />)).toBe('');
    }
    expect(ledger(baremetrics)).not.toContain('data-analysis');
    expect(ledger(emptyReader)).toBe('');
  });

  it('根拠・計算が無い時は空のラベルを出さず、STORY だけでも表示する', () => {
    const reader = { ...emptyReader, analysis: [withAnalysis.analysis[1], withAnalysis.analysis[2]] };
    const story = renderToStaticMarkup(<StorySteps reader={{ ...reader, analysis: [{ ...reader.analysis[0], basis: [] }] }} />);
    expect(story).toContain('物語');
    expect(story).not.toContain('<h3');
    const rows = renderToStaticMarkup(<><AnalysisGroups reader={reader} usage={planKeyStrip(reader).usage} /><ReaderEvidence reader={{ ...reader, analysis: [withAnalysis.analysis[2]] }} /></>);
    expect(rows).not.toContain('根拠:');
    expect(rows).not.toContain('計算・前提:');
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
    expect(html).toContain('data-evidence="basis"');
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
