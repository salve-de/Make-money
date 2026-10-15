import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { baremetrics } from '@/shared/__fixtures__/reader-samples';
import type { CaseArticle } from '@/shared/case-article';
import type { ReaderCase } from '@/shared/reader-case';
import { ReaderLedger } from './ReaderDetail';

const svg = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="5"/>').toString('base64')}`;

const article: CaseArticle = {
  listLine: '駄菓子の定期便',
  headline: '無料の競合に挑み、4人で100万ドルの継続収益を達成',
  lead: '訪問数を一画面で見られる有料の解析を出している。',
  kpis: [
    { label: '年換算継続収益', value: '100万ドル', yen: '約1.5億円', period: '2022年6月' },
    { label: '当時のチーム', value: '4人' },
  ],
  topics: [
    {
      id: 'overview',
      lead: { text: '概要の結論の文。', cites: [1] },
      blocks: [
        { type: 'facts', variant: 'text', rows: [{ label: '提供', text: '訪問数を表示する。', cites: [1, 2] }] },
        { type: 'facts', variant: 'amount', rows: [{ label: '人件費', text: '月3万ドル', cites: [] }] },
        { type: 'paragraph', tone: 'body', text: '本文の段落。', cites: [] },
        { type: 'paragraph', tone: 'note', text: '小さな補足の文。', cites: [] },
        { type: 'subheading', text: '小見出しの文' },
      ],
    },
    {
      id: 'revenue',
      blocks: [
        { type: 'steps', items: [{ title: '手順の題', text: '手順の文。', cites: [] }] },
        { type: 'rates', caption: '料金の表題', rows: [{ label: '月払い', value: '9ドル', yen: '約1,350円', note: '年払いなら安い', cites: [2] }] },
        {
          type: 'table',
          caption: '決算の比較',
          columns: ['項目', '2021年', '2022年'],
          rows: [{ label: '売上', cells: [{ text: '50万ドル', yen: '約7,500万円' }, { text: '100万ドル' }], cites: [] }],
        },
        { type: 'figure', figureId: 'fig-1' },
      ],
    },
    {
      id: 'history',
      blocks: [
        { type: 'timeline', items: [{ when: '2018年', title: '始めた', text: '個人で公開した。', cites: [] }] },
        { type: 'list', ordered: false, items: [{ lead: '2019年1月', text: '有料にした。', cites: [] }] },
      ],
    },
  ],
  sources: [
    { no: 1, label: '公式サイト', url: 'https://www.example.com/pricing' },
    { no: 2, label: '創業者のブログ', url: 'https://blog.example.org/post' },
  ],
  figures: [{ id: 'fig-1', alt: '収益の推移を示す図', width: 10, height: 5, src: svg }],
};

const media = <div data-testid="media-slot">画像欄そのまま</div>;
const render = (a: CaseArticle) => renderToStaticMarkup(<ReaderLedger reader={{ ...baremetrics, display: { caseArticle: a } } as ReaderCase} media={media} />);

describe('事例の記事（case-article）の詳細画面', () => {
  const html = render(article);
  it('見出し・見出しの下の文・数字の帯・画像欄を出す', () => {
    expect(html).toContain('無料の競合に挑み、4人で100万ドルの継続収益を達成');
    expect(html).toContain('訪問数を一画面で見られる有料の解析を出している。');
    for (const t of ['年換算継続収益', '100万ドル', '約1.5億円', '2022年6月', '当時のチーム', '4人']) expect(html).toContain(t);
    expect(html).toContain('画像欄そのまま');
    expect(html.indexOf('画像欄そのまま')).toBeGreaterThan(html.indexOf('当時のチーム'));
  });
  it('目次はデータにある分類と出典だけを決まった順で出し、集客・運営・仕組みは出さない', () => {
    const nav = html.slice(html.indexOf('<nav'), html.indexOf('</nav>'));
    const labels = [...nav.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map((m) => m[1]);
    expect(labels).toEqual(['概要', 'お金', '経緯', '出典']);
    expect(nav).toContain('aria-current="true"');
    expect(html).not.toContain('section-article-mechanism');
  });
  it('本文7分類と最後の出典を同じ順で表示する', () => {
    const ids = ['overview', 'mechanism', 'revenue', 'acquisition', 'operations', 'history', 'reasons'] as const;
    const topics: CaseArticle['topics'] = ids.map((id) => ({ id, blocks: [{ type: 'paragraph' as const, tone: 'body' as const, text: '事業の具体的な説明。', cites: [1] }] }));
    const full = render({ ...article, topics });
    const nav = full.slice(full.indexOf('<nav'), full.indexOf('</nav>'));
    const labels = [...nav.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map((m) => m[1]);
    expect(labels).toEqual(['概要', '仕組み', 'お金', '集客', '運営', '経緯', '成功の理由', '出典']);
    expect(full).not.toContain('成功・失敗の理由');
  });
  it('全種類のブロックの文を出す', () => {
    for (const t of ['概要の結論の文。', '訪問数を表示する。', '月3万ドル', '本文の段落。', '小さな補足の文。', '小見出しの文', '手順の題', '手順の文。', '料金の表題', '月払い', '9ドル', '約1,350円', '年払いなら安い', '決算の比較', '2021年', '売上', '50万ドル', '約7,500万円', '2018年', '始めた', '個人で公開した。', '2019年1月', '有料にした。']) expect(html).toContain(t);
  });
  it('出典の番号は行ごとに出さず、章の終わりに1回だけ、重なりを除いて小さい順に出す。押すと出典の URL を新しいタブで開く', () => {
    expect(html).toMatch(/<a href="https:\/\/www\.example\.com\/pricing"[^>]*target="_blank"[^>]*title="公式サイト"[^>]*aria-label="公式サイト"[^>]*>1<\/a>/);
    const row = html.slice(html.indexOf('訪問数を表示する。'), html.indexOf('月3万ドル'));
    expect(row).not.toContain('data-cite');
    const overview = html.slice(html.indexOf('id="section-article-overview"'), html.indexOf('id="section-article-revenue"'));
    expect(overview.match(/data-case-article-cites/g)).toHaveLength(1);
    expect(overview.match(/data-cite="1"/g)).toHaveLength(1);
    expect(overview.indexOf('data-cite="1"')).toBeLessThan(overview.indexOf('data-cite="2"'));
    expect(overview.indexOf('小さな補足の文。')).toBeLessThan(overview.indexOf('data-case-article-cites'));
    expect(html).toContain('href="https://blog.example.org/post"');
  });
  it('出典の章は番号・ラベルのリンク・ドメインを出し、各行に id がある', () => {
    expect(html).toContain('id="case-article-source-1"');
    expect(html).toContain('id="case-article-source-2"');
    expect(html).toContain('example.com');
    expect(html).toContain('blog.example.org');
  });
  it('図は alt と大きさのある画像で出し、押すと拡大する', () => {
    expect(html).toMatch(/<img src="data:image\/svg\+xml;base64,[^"]+" alt="収益の推移を示す図" width="10" height="5"/);
    expect(html).toContain('<dialog');
  });
  it('旧形式（casePage）の事例は従来どおりで、記事の部品は出ない', () => {
    const page = { listLine: '駄菓子の定期便', overview: '概要の文。', secrets: [{ head: '見抜いた', body: '' }], did: ['やった。'], setbacks: [], pricing: ['月12ドル'], timeline: [{ when: '2011年', what: '始める。' }], sources: [{ no: 1, label: '公式', url: 'https://example.com/' }], notes: [] };
    const old = renderToStaticMarkup(<ReaderLedger reader={{ ...baremetrics, display: { casePage: page } } as ReaderCase} />);
    expect(old).toContain('数字と出典');
    expect(old).not.toContain('data-case-article-nav');
  });
});
