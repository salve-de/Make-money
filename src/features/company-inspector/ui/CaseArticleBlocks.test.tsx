import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CaseArticleSchema, type CaseArticleBlock } from '@/shared/case-article';
import { ArticleBlock, blockSpacing, readAmount } from './CaseArticleBlocks';
import { CaseArticleView } from './CaseArticleView';

const article = CaseArticleSchema.parse({
  listLine: 'アクセス解析',
  headline: '見出し',
  lead: '見出しの下の文。',
  sources: [{ no: 1, label: '公式', url: 'https://example.com/' }],
  topics: [
    {
      id: 'overview',
      title: '何を売り、誰が買っているのか',
      blocks: [
        { type: 'list', items: [{ lead: '画面が1つ', text: '使い方を覚えなくても読める。' }, { lead: '軽い', text: 'コードが小さい。' }] },
        { type: 'list', ordered: true, items: [{ text: 'コードを貼る。' }, { text: '記録される。' }, { text: '画面で見る。' }] },
        { type: 'subheading', text: '小見出し' },
        { type: 'rates', caption: '月の売上', bars: true, rows: [{ label: '2019年5月', value: '64ドル' }, { label: '2022年6月', value: '8万3,637ドル', yen: '約1,250万円' }] },
        { type: 'rates', bars: true, rows: [{ label: 'Free', value: '無料' }, { label: 'Pro', value: '29ドル' }] },
        { type: 'paragraph', tone: 'note', text: '補足。' },
      ],
    },
  ],
});
const blocks = article.topics[0].blocks;
const render = (b: CaseArticleBlock) => renderToStaticMarkup(<ArticleBlock block={b} article={article} />);

describe('記事のブロックの見え方', () => {
  it('金額の先頭の数と単位を読む（万・億・区切りの点・約）', () => {
    expect(readAmount('8万3,637ドル')).toEqual({ amount: 83637, unit: 'ドル' });
    expect(readAmount('7億353万SEK')).toEqual({ amount: 703530000, unit: 'SEK' });
    expect(readAmount('約50万1,000ドル')).toEqual({ amount: 501000, unit: 'ドル' });
    expect(readAmount('無料')).toBeNull();
  });
  it('章の見出し（事例ごと）は、あれば分類の名前の下に出る', () => {
    const html = renderToStaticMarkup(<CaseArticleView article={article} />);
    expect(html).toMatch(/data-case-article-title[^>]*>何を売り、誰が買っているのか</);
  });
  it('全部の行に行頭の見出しがある箇条書きは、見出しを立てた行で出す', () => {
    const html = render(blocks[0]);
    expect(html).toContain('data-case-article-leads');
    expect(html).toContain('<strong');
    expect(html).not.toContain('list-disc');
  });
  it('番号つきの箇条書きは、流れとして番号を付けて出す', () => {
    const html = render(blocks[1]);
    expect(html).toContain('data-case-article-flow');
    expect(html.match(/<li/g)).toHaveLength(3);
  });
  it('棒は、値の比のとおりの長さで出す', () => {
    const html = render(blocks[3]);
    expect(html).toContain('data-case-article-bars');
    expect(html).toContain('data-value="83637" style="width:100%"');
    expect(html).toMatch(/data-value="64" style="width:0\.07\d+%"/);
  });
  it('数として読めない値がある時は、棒を出さず数字だけの行で出す', () => {
    expect(render(blocks[4])).not.toContain('data-case-article-bars');
  });
  it('小見出しと題つきの表は線で区切り、補足は前に寄せる', () => {
    expect(blockSpacing(blocks[0], undefined)).toBe('');
    expect(blockSpacing(blocks[2], blocks[1])).toContain('border-t');
    expect(blockSpacing(blocks[3], blocks[2])).toBe('mt-2.5');
    expect(blockSpacing(blocks[4], blocks[1])).toBe('mt-5');
    expect(blockSpacing(blocks[3], blocks[1])).toContain('border-t');
    expect(blockSpacing(blocks[5], blocks[4])).toBe('mt-2');
  });
});
