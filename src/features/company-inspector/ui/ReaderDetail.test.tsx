import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { pickListMetric, metricMeasureLabel, formatMetricAmount } from '@/shared/display-text';
import { baremetrics, block, emptyReader, hannahMorgan } from '@/shared/__fixtures__/reader-samples';
import { analyzeScreen } from '../../../../scripts/architecture/screen-text-lib.mjs';
import { allowedUiTexts } from '@/shared/ui-strings';
import { type ReaderCase } from '@/shared/reader-case';
import { ReaderAnalyses, ReaderAnalysisIntro, ReaderEvidence, ReaderFacts, ReaderLedger, ReaderMetrics, ReaderSources, ReaderStory, ReaderSummary } from './ReaderDetail';

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
    expect(html).not.toContain('チーム');
    for (const heading of html.match(/<h3[^>]*>[^<]*<\/h3>/g) ?? []) expect(heading.length).toBeGreaterThan(0);
  });

  it('件数のラベルを出さず、概要は1回だけ、出典の重複は1つ', () => {
    const html = detail(baremetrics);
    expect(html).not.toMatch(/詳細 \d|特徴 \d|参照先あり/);
    expect(html.match(/data-fact="f1"/g)).toHaveLength(1);
    expect(html.match(/data-source=/g)).toHaveLength(1);
    // 取れていない項目を「未確認」で埋めない
    expect(html).not.toContain('未確認');
  });

  it('基準の注記を出す', () => {
    expect(detail(block)).toContain('継続事業ベース');
  });

  it('見本の詳細画面は、出どころの無い文字・空の見出し・fact の重複が0', () => {
    const allowed = allowedUiTexts('Case');
    for (const reader of [baremetrics, block, hannahMorgan, emptyReader]) {
      const r = analyzeScreen(detail(reader), (t: string) => allowed.has(t));
      expect(r.unowned).toEqual([]);
      expect(r.emptyHeadings).toEqual([]);
      expect(r.dupFacts).toEqual([]);
    }
  });
});

describe('reader analysis', () => {
  const ledger = (reader: ReaderCase) => renderToStaticMarkup(<ReaderLedger reader={reader} />);

  it('冒頭に強い一行（推測の印つき）。確度のラベルは出さない', () => {
    const html = ledger(withAnalysis);
    const intro = renderToStaticMarkup(<ReaderAnalysisIntro reader={withAnalysis} />);
    expect(intro).toMatch(/<h3 class="[^"]*text-lg[^"]*">面倒な集計/);
    expect(intro).toContain('推測');
    expect(html).not.toContain('確度');
    expect(html.match(/data-analysis="a-headline"/g)).toHaveLength(1);
    expect(html.match(/data-analysis="a-story"/g)).toHaveLength(1);
    // 強い一行 → 概要 → 数字 → 物語 → 章 → 事実
    expect(html.indexOf('a-headline')).toBeLessThan(html.indexOf('data-fact="f1"'));
    expect(html.indexOf('data-fact="f1"')).toBeLessThan(html.indexOf('section-metrics'));
    expect(html.indexOf('section-metrics')).toBeLessThan(html.indexOf('a-story'));
    expect(html.indexOf('a-story')).toBeLessThan(html.indexOf('section-analysis-what'));
  });

  it('物語は前夜・隙・突破・金が回る仕組みの段に分け、「物語」という独立の見出しは作らない', () => {
    const story = renderToStaticMarkup(<ReaderStory reader={withAnalysis} />);
    for (const stage of ['前夜', '隙', '突破', '金が回る仕組み']) expect(story).toContain(`>${stage}<`);
    expect(story).not.toContain('<h3');
    expect(story).toContain('集計が面倒だった。');
  });

  it('推論は章ごと。材料のある章だけ出し、項目名と結論に「推測」の薄い印を付ける', () => {
    const html = ledger(withAnalysis);
    expect(html).toContain('何を、誰に売っているのか');
    expect(html).toContain('いくら残るのか');
    expect(html).not.toContain('最初の一件は');
    expect(html).toContain('事業の形');
    expect(html).toContain('手残り');
    expect(html).toContain(withAnalysis.analysis[0].text);
    const rows = renderToStaticMarkup(<ReaderAnalyses reader={withAnalysis} />);
    expect(rows.match(/>推測</g)).toHaveLength(2);
    expect(rows).not.toContain('a-headline');
    expect(rows).not.toContain('a-story');
    expect(rows).not.toContain('計算・前提:');
    expect(rows).not.toContain('根拠:');
    expect(rows).not.toContain('href=');
  });

  it('勝因・教訓・大手の死角は、事実に結ばれている時だけ出す', () => {
    const base = { ...emptyReader, analysis: [
      { id: 'a-why', item: 'WHY_IT_WORKED' as const, text: '一般論の勝因。', basis: [], confidence: 'LOW' as const },
      { id: 'a-lesson', item: 'LESSON' as const, text: '一般論の教訓。', basis: [], confidence: 'LOW' as const },
    ] };
    expect(renderToStaticMarkup(<ReaderAnalyses reader={base} />)).toBe('');
    const grounded = { ...baremetrics, analysis: [{ id: 'a-why', item: 'WHY_IT_WORKED' as const, text: '導入が数分で済んだ点が効いたと考えられる。', basis: ['f1'], confidence: 'LOW' as const }] };
    expect(renderToStaticMarkup(<ReaderAnalyses reader={grounded} />)).toContain('導入が数分で済んだ');
  });

  it('計算と根拠は事実の後・出典の前に、1か所だけ（畳んだ区画）でまとめる', () => {
    const html = ledger(withAnalysis);
    const at = html.indexOf('section-reasoning');
    expect(at).toBeGreaterThan(html.indexOf('data-fact="f2"'));
    expect(at).toBeLessThan(html.indexOf('section-sources'));
    expect(html).toContain('<details>');
    expect(html).toContain('計算・前提と根拠を見る');
    expect(html.match(/計算・前提と根拠を見る/g)).toHaveLength(1);
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
    expect(refs.length).toBeGreaterThan(0);
    for (const id of refs) expect(html).toContain(`id="${id}"`);
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

  it('analysis が空・reader が無い時は章も強い一行も出さない', () => {
    for (const reader of [emptyReader, baremetrics, undefined]) {
      expect(renderToStaticMarkup(<ReaderAnalysisIntro reader={reader} />)).toBe('');
      expect(renderToStaticMarkup(<ReaderAnalyses reader={reader} />)).toBe('');
      expect(renderToStaticMarkup(<ReaderStory reader={reader} />)).toBe('');
    }
    expect(ledger(baremetrics)).not.toContain('section-analysis');
    expect(ledger(emptyReader)).toBe('');
  });

  it('段に分けられない物語も、1つの段落として出る', () => {
    const reader = { ...baremetrics, analysis: [{ ...withAnalysis.analysis[1], text: '集計が面倒で、数字を自動で出す道具が生まれた。' }] };
    const story = renderToStaticMarkup(<ReaderStory reader={reader} />);
    expect(story).toContain('集計が面倒で');
    expect(story).not.toContain('<dl');
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
    const result = analyzeScreen(ledger(withAnalysis), (t: string) => allowed.has(t));
    expect(result.unowned).toEqual([]);
    expect(result.emptyHeadings).toEqual([]);
    expect(result.dupFacts).toEqual([]);
    expect(result.factCount).toBe(withAnalysis.facts.length);
  });
});

describe('数値の帯と棒', () => {
  it('主要な数字の帯を出し、推定には「推定」を小さく添え、実線と点線で見分ける', () => {
    const est = { ...block, metrics: [{ ...block.metrics[0], origin: 'ESTIMATED' as const }] };
    const html = renderToStaticMarkup(<ReaderMetrics reader={est} />);
    expect(html).toContain('border-dashed');
    expect(html).toContain('推定');
    expect(renderToStaticMarkup(<ReaderMetrics reader={block} />)).not.toContain('border-dashed');
  });

  it('表の棒は同じ種類の中で、数値の大きさに比例する（最大が100%）', () => {
    const base = block.metrics[0];
    const reader = { ...block, metrics: [
      { ...base, id: 'x1', period: 'FY2023', amount: 100 },
      { ...base, id: 'x2', period: 'FY2024', amount: 50 },
      { ...base, id: 'x3', period: 'FY2025', amount: 25 },
      { ...base, id: 'x4', period: 'FY2026', amount: 10 },
    ] };
    const html = renderToStaticMarkup(<ReaderMetrics reader={reader} />);
    const widths = [...html.matchAll(/style="width:(\d+)%/g)].map((m) => Number(m[1]));
    expect(widths).toEqual([100, 50, 25, 10]);
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
