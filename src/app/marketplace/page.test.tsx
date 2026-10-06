import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/lib/marketplace/listing-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/marketplace/listing-store')>()),
  listPublishedMarketplaceListings: state.list,
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/platform/components/navigation/GlobalHeader', () => ({
  GlobalHeader: () => <header data-testid="global-header" />,
}));
vi.mock('next/link', () => ({
  default: ({ children, prefetch: _prefetch, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }>) => {
    void _prefetch;
    return <a {...props}>{children}</a>;
  },
}));

import { visibleText } from '@/components/marketplace/business/testing';
import MarketplacePage from './page';

const listing = {
  slug: 'my-service-a1b2c3d4',
  title: '小さな工場向けの図面検索',
  summary: '紙図面を検索できるデータへ変換します。',
  category: 'business_tool' as const,
  productUrl: 'https://maker.example/',
  checkoutUrl: null,
  priceLabel: '月額 2,980円',
  sellerName: '山田工房',
  updatedAt: '2026-09-24T00:00:00.000Z',
};

const render = async (searchParams: { offset?: string | string[] } = {}) =>
  renderToStaticMarkup(await MarketplacePage({ searchParams: Promise.resolve(searchParams) }));

beforeEach(() => {
  state.list.mockReset().mockResolvedValue({ listings: [listing], hasMore: false, nextOffset: null });
});

describe('/marketplace (product listings)', () => {
  it('shows the product list with the list-yours and build entrances, and no way into business sales', async () => {
    const html = await render();
    const text = visibleText(html);
    expect(html).not.toContain('マーケットの種類');
    expect(html).not.toContain('/marketplace/businesses');
    expect(text).not.toContain('事業の売買');
    expect(text).toContain('小さな工場向けの図面検索');
    expect(html).toContain('href="/marketplace/my-service-a1b2c3d4"');
    expect(html).toContain('href="/marketplace/new"');
    expect(text).toContain('出品する');
    expect(html).toContain('href="/build"');
  });

  it('still shows its empty and error states', async () => {
    state.list.mockResolvedValue({ listings: [], hasMore: false, nextOffset: null });
    expect(visibleText(await render())).toContain('まだ掲載サービスはありません');
    state.list.mockRejectedValue(new Error('down'));
    expect(visibleText(await render())).toContain('掲載サービスを読み込めませんでした');
  });

  it('still pages through the product list', async () => {
    state.list.mockResolvedValue({ listings: [listing], hasMore: true, nextOffset: 60 });
    const html = await render({ offset: '0' });
    expect(html).toContain('href="/marketplace?offset=60"');
  });
});
