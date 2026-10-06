import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/components/navigation/GlobalHeader', () => ({
  GlobalHeader: () => <header data-testid="global-header" />,
}));
vi.mock('next/link', () => ({
  default: ({ children, prefetch: _prefetch, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }>) => {
    void _prefetch;
    return <a {...props}>{children}</a>;
  },
}));

import { BUSINESS_SALE_NOTICE } from '@/shared/business-sale';
import { BusinessSaleNotice } from './BusinessSaleNotice';
import { BusinessSalePage } from './BusinessSalePage';
import { MarketplaceTabs } from './MarketplaceTabs';
import { expectTerminalStyle, visibleText } from './testing';

describe('BusinessSaleNotice', () => {
  it('states the seller declares the figures and that Make-Money does not broker the sale', () => {
    const html = renderToStaticMarkup(<BusinessSaleNotice />);
    expect(visibleText(html)).toBe(
      '掲載内容は売り手の申告です。金鉱録は売買の仲介・価格の保証・契約の代行をしません。取引の前に、決済記録・契約書・税務書類を必ず確認してください。',
    );
    expect(html).toContain('role="note"');
  });

  it('is at least 12px and never promises a profit', () => {
    const html = renderToStaticMarkup(<BusinessSaleNotice />);
    expect(html).toContain('text-xs');
    expect(html).not.toContain('必ず儲か');
    expectTerminalStyle(html);
  });
});

describe('MarketplaceTabs', () => {
  it('links the product list and the business sale list, and marks the current one', () => {
    const products = renderToStaticMarkup(<MarketplaceTabs active="products" />);
    expect(products).toContain('href="/marketplace"');
    expect(products).toContain('href="/marketplace/businesses"');
    expect((products.match(/aria-current="page"/g) ?? []).length).toBe(1);
    expect(products.indexOf('aria-current="page"')).toBeLessThan(products.indexOf('href="/marketplace/businesses"'));

    const businesses = renderToStaticMarkup(<MarketplaceTabs active="businesses" />);
    expect((businesses.match(/aria-current="page"/g) ?? []).length).toBe(1);
    expect(businesses.indexOf('aria-current="page"')).toBeGreaterThan(businesses.indexOf('href="/marketplace"'));
    expect(visibleText(businesses)).toBe('製品事業の売買取引・紹介');
  });

  it('uses the square tab style with the orange underline on the current tab only', () => {
    const html = renderToStaticMarkup(<MarketplaceTabs active="businesses" />);
    expect((html.match(/inset_0_-2px_0_var\(--term-accent\)/g) ?? []).length).toBe(1);
    expect(html).toContain('min-h-11');
    expectTerminalStyle(html);
  });
});

describe('BusinessSalePage', () => {
  it('always ends the page with the notice, after the page content', () => {
    const html = renderToStaticMarkup(<BusinessSalePage name="事業の売買" srHeading="事業の売買"><p>ページの中身</p></BusinessSalePage>);
    const footer = html.indexOf('<footer');
    expect(footer).toBeGreaterThan(html.indexOf('ページの中身'));
    expect(html.slice(footer)).toContain(BUSINESS_SALE_NOTICE);
    expect(html).toContain('data-testid="global-header"');
    expect(html).toContain('term-page');
  });

  it('shows the panel name, the tabs and a screen-reader heading', () => {
    const html = renderToStaticMarkup(<BusinessSalePage name="自分の掲載" srHeading="自分の掲載と届いた問い合わせ"><p>x</p></BusinessSalePage>);
    expect(html).toContain('term-panel-name');
    expect(visibleText(html)).toContain('自分の掲載');
    expect(html).toContain('<h1 class="sr-only">自分の掲載と届いた問い合わせ</h1>');
    expect(html).toContain('aria-label="マーケットの種類"');
  });

  it('adds no heading of its own when the page has a visible one', () => {
    expect(renderToStaticMarkup(<BusinessSalePage name="事業の詳細"><h1>事業名</h1></BusinessSalePage>).match(/<h1/g)).toHaveLength(1);
  });

  it('stays inside the terminal style rules', () => {
    expectTerminalStyle(renderToStaticMarkup(<BusinessSalePage name="事業の売買"><p>x</p></BusinessSalePage>));
  });
});
