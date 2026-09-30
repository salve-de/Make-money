import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/marketplace/business-store', () => ({ getPublishedBusinessSaleBySlug: state.get }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/platform/components/navigation/GlobalHeader', () => ({
  GlobalHeader: () => <header data-testid="global-header" />,
}));
vi.mock('@/components/marketplace/business/InquiryForm', () => ({
  InquiryForm: ({ listingId }: { listingId: string }) => <div data-testid="inquiry-form" data-listing-id={listingId} />,
}));
vi.mock('next/link', () => ({
  default: ({ children, prefetch: _prefetch, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }>) => {
    void _prefetch;
    return <a {...props}>{children}</a>;
  },
}));

import { BUSINESS_SALE_NOTICE } from '@/shared/business-sale';
import { detail, expectTerminalStyle, visibleText } from '@/components/marketplace/business/testing';
import BusinessSaleDetailPage, { generateMetadata } from './page';

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });
const render = async (slug = 'camera-shop-0123456789') => renderToStaticMarkup(await BusinessSaleDetailPage(params(slug)));

beforeEach(() => {
  state.get.mockReset().mockResolvedValue(detail());
});

describe('/marketplace/businesses/[slug]', () => {
  it('shows the listing, the inquiry form for that listing, and the notice', async () => {
    const html = await render();
    const text = visibleText(html);
    expect(text).toContain('中古カメラ専門のネットショップ');
    expect(text).toContain('希望価格300万円');
    expect(text).toContain('手放す理由本業に専念するため');
    expect(html).toContain('data-listing-id="11111111-1111-4111-8111-111111111111"');
    expect(html).toContain('href="/marketplace/businesses"');
    expect(state.get).toHaveBeenCalledWith('camera-shop-0123456789');
  });

  it('puts the inquiry form after the details and the notice at the very end', async () => {
    const html = await render();
    expect(html.indexOf('data-testid="inquiry-form"')).toBeGreaterThan(html.indexOf('手放す理由'));
    const footer = html.indexOf('<footer');
    expect(footer).toBeGreaterThan(html.indexOf('data-testid="inquiry-form"'));
    expect(html.slice(footer)).toContain(BUSINESS_SALE_NOTICE);
  });

  it('has exactly one heading, the business name', async () => {
    const html = await render();
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
  });

  it('answers not found for an unknown, unpublished or closed business', async () => {
    state.get.mockResolvedValue(null);
    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('answers not found for a malformed slug without querying the database', async () => {
    for (const slug of ['UPPER', 'with space', '-x', 'x-', 'a'.repeat(81), '日本語']) {
      await expect(render(slug), slug).rejects.toThrow('NEXT_NOT_FOUND');
    }
    expect(state.get).not.toHaveBeenCalled();
  });

  it('shows an error, not a not-found page, when the database is unavailable', async () => {
    state.get.mockRejectedValue(new Error('database unavailable'));
    const html = await render();
    expect(html).toContain('role="alert"');
    expect(visibleText(html)).toContain('この事業のページを読み込めませんでした');
    expect(html).not.toContain('data-testid="inquiry-form"');
    expect(html).toContain(BUSINESS_SALE_NOTICE);
  });

  it('never exposes an owner or buyer identifier and stays inside the terminal style rules', async () => {
    const html = await render();
    for (const forbidden of ['userId', 'user_id', 'contactEmail', 'buyer']) expect(html).not.toContain(forbidden);
    expectTerminalStyle(html);
  });
});

describe('generateMetadata', () => {
  it('uses the business name and the start of the description', async () => {
    state.get.mockResolvedValue(detail({ summary: 'あ'.repeat(300) }));
    const metadata = await generateMetadata(params('camera-shop-0123456789'));
    expect(metadata.title).toBe('中古カメラ専門のネットショップ | 事業の売買 | Make-Money');
    expect(String(metadata.description)).toHaveLength(120);
  });

  it('falls back to a generic title when the listing is missing, malformed or the database fails', async () => {
    state.get.mockResolvedValue(null);
    expect((await generateMetadata(params('camera-shop-0123456789'))).title).toBe('事業の売買 | Make-Money');
    expect((await generateMetadata(params('UPPER'))).title).toBe('事業の売買 | Make-Money');
    state.get.mockRejectedValue(new Error('down'));
    expect((await generateMetadata(params('camera-shop-0123456789'))).title).toBe('事業の売買 | Make-Money');
  });
});
