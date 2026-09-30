import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BusinessSaleDetail } from './BusinessSaleDetail';
import { detail, expectTerminalStyle, visibleText } from './testing';

describe('BusinessSaleDetail', () => {
  it('shows the declared figures with the exact yen next to the rounded amount', () => {
    const text = visibleText(renderToStaticMarkup(<BusinessSaleDetail listing={detail({ monthlyRevenueJpy: 1_234_567 })} />));
    expect(text).toContain('開始年2021年');
    expect(text).toContain('月商123万円1,234,567円');
    expect(text).toContain('月の利益10万円100,000円');
    expect(text).toContain('希望価格300万円3,000,000円');
    expect(text).toContain('倍率2.5倍');
    expect(text).toContain('希望価格 ÷ (月の利益 × 12)');
    expect(text).toContain('更新日2026-09-20');
  });

  it('shows the seller text sections and the seller name', () => {
    const text = visibleText(renderToStaticMarkup(<BusinessSaleDetail listing={detail()} />));
    expect(text).toContain('事業の説明');
    expect(text).toContain('中古カメラを仕入れてネットで販売しています');
    expect(text).toContain('手放す理由本業に専念するため');
    expect(text).toContain('引き渡すものドメイン、ショップのアカウント、在庫リスト');
    expect(text).toContain('掲載者山田商店');
  });

  it('says so when the seller left the name empty', () => {
    expect(visibleText(renderToStaticMarkup(<BusinessSaleDetail listing={detail({ sellerName: '' })} />))).toContain('掲載者名なし');
  });

  it('hides the multiple and explains why when the monthly profit is zero', () => {
    const html = renderToStaticMarkup(<BusinessSaleDetail listing={detail({ monthlyProfitJpy: 0 })} />);
    const text = visibleText(html);
    expect(text).not.toMatch(/\d(?:\.\d)?倍/);
    expect(text).toContain('倍率—月の利益が0円のため出しません');
    expect(text).toContain('赤字・利益なしを含む');
  });

  it('marks self reported revenue as the seller\'s own claim', () => {
    const text = visibleText(renderToStaticMarkup(<BusinessSaleDetail listing={detail()} />));
    expect(text).toContain('売上の根拠本人申告数字は売り手の申告です');
    expect(text).not.toContain('Stripeで確認済み');
  });

  it('shows Stripe verified revenue without the seller-claim note', () => {
    const text = visibleText(renderToStaticMarkup(<BusinessSaleDetail listing={detail({ revenueBasis: 'stripe_verified' })} />));
    expect(text).toContain('売上の根拠Stripeで確認済み');
    expect(text).not.toContain('数字は売り手の申告です');
  });

  it('preserves line breaks, wraps long text and escapes markup', () => {
    const html = renderToStaticMarkup(
      <BusinessSaleDetail listing={detail({ summary: '一行目\n二行目 <img src=x onerror=alert(1)>', title: 'あ'.repeat(120) })} />,
    );
    expect(html).toContain('whitespace-pre-wrap');
    expect(html).toContain('break-words');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('<h1');
  });

  it('never carries an owner identifier and stays inside the terminal style rules', () => {
    const html = renderToStaticMarkup(<BusinessSaleDetail listing={detail()} />);
    for (const forbidden of ['userId', 'user_id', 'contactEmail', 'verification']) expect(html).not.toContain(forbidden);
    expect(html).toContain('term-num');
    expectTerminalStyle(html);
  });
});
