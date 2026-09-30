import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/lib/marketplace/business-store', () => ({ listPublishedBusinessSales: state.list }));
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
import { expectTerminalStyle, summary, visibleText } from '@/components/marketplace/business/testing';
import BusinessSaleListPage from './page';

async function render(query: Record<string, string | string[] | undefined> = {}) {
  return renderToStaticMarkup(await BusinessSaleListPage({ searchParams: Promise.resolve(query) }));
}

beforeEach(() => {
  state.list.mockReset().mockResolvedValue([summary()]);
});

describe('/marketplace/businesses', () => {
  it('lists the published businesses with the multiple and the revenue basis', async () => {
    const html = await render();
    const text = visibleText(html);
    expect(text).toContain('中古カメラ専門のネットショップ');
    expect(text).toContain('2.5倍');
    expect(text).toContain('本人申告');
    expect(html).toContain('href="/marketplace/businesses/camera-shop-0123456789"');
    expect(html).toContain('<span class="term-num text-term-accent">1</span>件');
  });

  it('marks the business sale tab as current and links back to the product list', async () => {
    const html = await render();
    expect(html).toContain('aria-label="マーケットの種類"');
    expect(html.indexOf('aria-current="page"')).toBeGreaterThan(html.indexOf('href="/marketplace"'));
    expect(html.indexOf('aria-current="page"')).toBeLessThan(html.indexOf('>事業の売買</a>'));
  });

  it('links to creating a listing and to my listings and inquiries', async () => {
    const html = await render();
    expect(html).toContain('href="/marketplace/businesses/new"');
    expect(html).toContain('href="/marketplace/businesses/mine"');
  });

  it('reads no filter from a bare URL', async () => {
    await render();
    expect(state.list).toHaveBeenCalledWith({});
  });

  it('passes a valid category and maximum price to the store', async () => {
    await render({ category: 'saas', maxPrice: '3000000' });
    expect(state.list).toHaveBeenCalledWith({ category: 'saas', maxPrice: 3_000_000 });
  });

  it('ignores an invalid value and keeps the valid one', async () => {
    await render({ category: 'crypto', maxPrice: '1000000' });
    expect(state.list).toHaveBeenLastCalledWith({ maxPrice: 1_000_000 });
    await render({ category: 'media', maxPrice: 'abc' });
    expect(state.list).toHaveBeenLastCalledWith({ category: 'media' });
    await render({ category: ['saas', 'media'], maxPrice: ['1', '2'] });
    expect(state.list).toHaveBeenLastCalledWith({});
  });

  it('shows the current filter in the form and offers to clear it', async () => {
    const html = await render({ category: 'saas', maxPrice: '3000000' });
    expect(html).toContain('method="get"');
    expect(html).toContain('action="/marketplace/businesses"');
    expect(html).toMatch(/<option value="saas" selected="">SaaS<\/option>/);
    expect(html).toMatch(/<option value="3000000" selected="">300万円以下<\/option>/);
    expect(visibleText(html)).toContain('絞り込みを解除');
    expect(visibleText(await render())).not.toContain('絞り込みを解除');
  });

  it('keeps a maximum price that is not one of the presets selectable', async () => {
    const html = await render({ maxPrice: '2000000' });
    expect(html).toMatch(/<option value="2000000" selected="">200万円以下<\/option>/);
  });

  it('explains an empty list, differently when a filter is on', async () => {
    state.list.mockResolvedValue([]);
    const bare = visibleText(await render());
    expect(bare).toContain('まだ売り出し中の事業はありません');
    expect(bare).toContain('「事業を掲載する」から下書きを作ります');
    const filtered = visibleText(await render({ category: 'saas' }));
    expect(filtered).toContain('条件に合う事業はありません');
    expect(filtered).toContain('区分や価格の上限を変えてみてください');
  });

  it('says when the list is cut at 100', async () => {
    state.list.mockResolvedValue(Array.from({ length: 100 }, (_, index) => summary({ slug: `s-${index}` })));
    expect(visibleText(await render())).toContain('新しい順に100件まで表示');
    state.list.mockResolvedValue([summary()]);
    expect(visibleText(await render())).not.toContain('100件まで表示');
  });

  it('shows an error, not an empty list, when the database is unavailable', async () => {
    state.list.mockRejectedValue(new Error('database unavailable'));
    const html = await render();
    expect(html).toContain('role="alert"');
    expect(visibleText(html)).toContain('売り出し中の事業を読み込めませんでした');
    expect(visibleText(html)).not.toContain('まだ売り出し中の事業はありません');
  });

  it('ends the page with the notice in every state', async () => {
    for (const setup of [
      () => state.list.mockResolvedValue([summary()]),
      () => state.list.mockResolvedValue([]),
      () => state.list.mockRejectedValue(new Error('down')),
    ]) {
      setup();
      const html = await render();
      const footer = html.indexOf('<footer');
      expect(footer).toBeGreaterThan(-1);
      expect(html.slice(footer)).toContain(BUSINESS_SALE_NOTICE);
    }
  });

  it('never promises a profit and stays inside the terminal style rules', async () => {
    const html = await render({ category: 'saas' });
    expect(html).not.toContain('必ず儲か');
    expectTerminalStyle(html);
  });
});
