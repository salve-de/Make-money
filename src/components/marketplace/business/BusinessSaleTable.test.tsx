import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { BusinessSaleTable } from './BusinessSaleTable';
import { expectTerminalStyle, summary, visibleText } from './testing';

vi.mock('next/link', () => ({
  default: ({ children, prefetch: _prefetch, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }>) => {
    void _prefetch;
    return <a {...props}>{children}</a>;
  },
}));

/** 各行（<a>）の、画面に見える文字。先頭は表の見出しなので除く。 */
function rowTexts(html: string): string[] {
  return html.split('<a ').slice(1).map((row) => visibleText(`<a ${row}`));
}

describe('BusinessSaleTable', () => {
  it('shows name, category, start year, revenue, profit, asking price, multiple and revenue basis in each row', () => {
    const html = renderToStaticMarkup(<BusinessSaleTable listings={[summary()]} />);
    const [row] = rowTexts(html);
    expect(row).toContain('中古カメラ専門のネットショップ');
    expect(row).toContain('EC・ネット販売');
    expect(row).toContain('2021');
    expect(row).toContain('月商 120万円');
    expect(row).toContain('月の利益 10万円');
    expect(row).toContain('希望価格 300万円');
    expect(row).toContain('2.5倍');
    expect(row).toContain('本人申告');
    expect(html).toContain('href="/marketplace/businesses/camera-shop-0123456789"');
  });

  it('labels the columns for the desktop table, with the multiple explained', () => {
    const header = visibleText(renderToStaticMarkup(<BusinessSaleTable listings={[summary()]} />).split('<a ')[0]);
    for (const label of ['事業名', '区分', '開始年', '月商', '月の利益', '希望価格', '倍率', '売上の根拠']) expect(header).toContain(label);
    expect(renderToStaticMarkup(<BusinessSaleTable listings={[summary()]} />)).toContain('希望価格 ÷ (月の利益 × 12)');
  });

  it('computes the multiple as asking price divided by twelve months of profit', () => {
    const html = renderToStaticMarkup(
      <BusinessSaleTable
        listings={[
          summary({ slug: 'a-1', askingPriceJpy: 1_200_000, monthlyProfitJpy: 100_000 }),
          summary({ slug: 'a-2', askingPriceJpy: 6_000_000, monthlyProfitJpy: 200_000 }),
          summary({ slug: 'a-3', askingPriceJpy: 150_000_000, monthlyProfitJpy: 100_000 }),
        ]}
      />,
    );
    const [first, second, third] = rowTexts(html);
    expect(first).toContain('1.0倍');
    expect(second).toContain('2.5倍');
    expect(third).toContain('125倍');
  });

  it('shows no multiple when the monthly profit is zero', () => {
    const html = renderToStaticMarkup(
      <BusinessSaleTable listings={[summary({ slug: 'zero-profit', monthlyProfitJpy: 0 }), summary({ slug: 'with-profit' })]} />,
    );
    const [zero, withProfit] = rowTexts(html);
    expect(zero).not.toMatch(/\d(?:\.\d)?倍/);
    expect(zero).toContain('倍率 —');
    expect(withProfit).toMatch(/2\.5倍/);
    // 数字の代わりに出す「—」には、出さない理由を付けておく
    expect(html).toContain('月の利益が0円以下のため、倍率は出しません');
  });

  it('shows no multiple for a negative profit that should never be stored', () => {
    const html = renderToStaticMarkup(<BusinessSaleTable listings={[summary({ monthlyProfitJpy: -10_000 })]} />);
    expect(rowTexts(html)[0]).not.toMatch(/\d(?:\.\d)?倍/);
  });

  it('tells self reported figures apart from Stripe verified ones', () => {
    const html = renderToStaticMarkup(
      <BusinessSaleTable listings={[summary({ slug: 'self' }), summary({ slug: 'verified', revenueBasis: 'stripe_verified' })]} />,
    );
    const [self, verified] = rowTexts(html);
    expect(self).toContain('本人申告');
    expect(self).not.toContain('Stripeで確認済み');
    expect(verified).toContain('Stripeで確認済み');
    expect(verified).not.toContain('本人申告');
    expect(html).toContain('text-term-positive');
    expect(html).toContain('text-term-muted');
  });

  it('puts every number in the monospace tabular style', () => {
    const html = renderToStaticMarkup(<BusinessSaleTable listings={[summary()]} />);
    // 開始年・月商・月の利益・希望価格・倍率の5つ
    expect((html.match(/term-num/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it('escapes user text and never contains an owner or buyer identifier', () => {
    const html = renderToStaticMarkup(<BusinessSaleTable listings={[summary({ title: '<script>alert(1)</script>' })]} />);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    for (const forbidden of ['userId', 'user_id', 'contactEmail', 'buyer']) expect(html).not.toContain(forbidden);
  });

  it('encodes the slug in the link and stays inside the terminal style rules', () => {
    const html = renderToStaticMarkup(<BusinessSaleTable listings={[summary({ slug: 'a-b-0123456789' })]} />);
    expect(html).toContain('href="/marketplace/businesses/a-b-0123456789"');
    expectTerminalStyle(html);
  });

  it('keeps long titles from widening the page on a phone', () => {
    const html = renderToStaticMarkup(<BusinessSaleTable listings={[summary({ title: 'あ'.repeat(100) })]} />);
    expect(html).toContain('truncate');
    expect(html).toContain('min-h-11');
  });
});
