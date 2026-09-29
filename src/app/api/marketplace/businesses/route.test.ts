import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';

const state = vi.hoisted(() => ({
  db: null as DatabaseSync | null,
  tokens: {} as Record<string, { uid: string }>,
  denied: new Set<string>(),
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/firebase/server', () => ({
  verifyFirebaseIdToken: async (token: string) => state.tokens[token] ?? null,
}));
vi.mock('@/lib/storage/d1', async () => (await import('@/lib/marketplace/testing/sqlite-d1')).sqliteD1Module(() => state.db!));
vi.mock('@/lib/security/rate-limit', () => ({
  consumeRequestRateLimit: async (...args: unknown[]) => {
    state.rateLimit(...args);
    return !state.denied.has(args[1] as string);
  },
}));

import { GET, POST } from './route';
import { createBody, inquiryRows, jsonRequest, seedBusinessSale } from '@/lib/marketplace/testing/fixtures';
import { openBusinessSaleTestDatabase } from '@/lib/marketplace/testing/sqlite-d1';

const URL_BASE = 'http://localhost/api/marketplace/businesses';
const listings = () => state.db!.prepare('SELECT * FROM business_sale_listings').all() as Record<string, unknown>[];

beforeEach(() => {
  state.db = openBusinessSaleTestDatabase();
  state.tokens = { 'seller-token': { uid: 'seller-1' }, 'other-token': { uid: 'seller-2' } };
  state.denied.clear();
});
afterEach(() => {
  state.db?.close();
  vi.restoreAllMocks();
});

describe('GET /api/marketplace/businesses', () => {
  it('lists published listings with a short shared cache and no personal data', async () => {
    seedBusinessSale(state.db!, { slug: 'published-one', userId: 'secret-seller-uid' });
    seedBusinessSale(state.db!, { slug: 'a-draft', status: 'draft' });
    seedBusinessSale(state.db!, { slug: 'a-closed', status: 'closed' });
    state.db!.prepare(
      "INSERT INTO business_sale_inquiries(id,listing_id,buyer_user_id,message,contact_email) SELECT 'i1',id,'buyer-secret-uid','十分な長さのメッセージです。','buyer-secret@example.com' FROM business_sale_listings WHERE slug='published-one'",
    ).run();

    const response = await GET(jsonRequest(URL_BASE));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=0, s-maxage=30, stale-while-revalidate=60');
    expect(response.headers.get('vary')).toBeNull();
    const text = await response.text();
    expect(JSON.parse(text)).toMatchObject({ success: true, listings: [{ slug: 'published-one', revenueBasis: 'self_reported' }] });
    for (const secret of ['secret-seller-uid', 'buyer-secret-uid', 'buyer-secret@example.com', 'userId', 'contactEmail', 'a-draft', 'a-closed']) {
      expect(text).not.toContain(secret);
    }
  });

  it('filters by category and maximum price', async () => {
    seedBusinessSale(state.db!, { slug: 'saas-cheap', category: 'saas', askingPriceJpy: 1_000_000, updatedAt: '2026-09-02 00:00:00' });
    seedBusinessSale(state.db!, { slug: 'saas-pricey', category: 'saas', askingPriceJpy: 9_000_000, updatedAt: '2026-09-03 00:00:00' });
    seedBusinessSale(state.db!, { slug: 'shop-cheap', category: 'ecommerce', askingPriceJpy: 1_000_000, updatedAt: '2026-09-04 00:00:00' });
    const slugs = async (query: string) =>
      ((await (await GET(jsonRequest(`${URL_BASE}${query}`))).json()) as { listings: { slug: string }[] }).listings.map((item) => item.slug);

    expect(await slugs('')).toEqual(['shop-cheap', 'saas-pricey', 'saas-cheap']);
    expect(await slugs('?category=saas')).toEqual(['saas-pricey', 'saas-cheap']);
    expect(await slugs('?maxPrice=1000000')).toEqual(['shop-cheap', 'saas-cheap']);
    expect(await slugs('?category=saas&maxPrice=1000000')).toEqual(['saas-cheap']);
    expect(await slugs('?maxPrice=0')).toEqual([]);
  });

  it('returns at most 100 listings', async () => {
    for (let index = 0; index < 103; index += 1) seedBusinessSale(state.db!);
    const body = await (await GET(jsonRequest(URL_BASE))).json() as { listings: unknown[] };
    expect(body.listings).toHaveLength(100);
  });

  it.each([
    '?category=crypto', '?maxPrice=-1', '?maxPrice=1.5', '?maxPrice=abc', '?maxPrice=99999999999999',
    '?category=saas&category=media', '?maxPrice=1&maxPrice=2',
  ])('rejects the filter %s without caching the error', async (query) => {
    const response = await GET(jsonRequest(`${URL_BASE}${query}`));
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toHaveProperty('error');
  });

  it('answers 503 without details when the database fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    state.db!.close();
    const response = await GET(jsonRequest(URL_BASE));
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(JSON.stringify(await response.json())).not.toMatch(/sqlite|database is not open|business_sale/i);
    state.db = openBusinessSaleTestDatabase();
  });
});

describe('POST /api/marketplace/businesses', () => {
  it('requires a valid login and writes nothing without one', async () => {
    for (const token of [null, 'not-a-known-token']) {
      const response = await POST(jsonRequest(URL_BASE, { body: createBody(), token }));
      expect(response.status).toBe(401);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(listings()).toEqual([]);
    expect(state.rateLimit).not.toHaveBeenCalled();
  });

  it('creates a draft owned by the caller that is always self reported', async () => {
    const response = await POST(jsonRequest(URL_BASE, { body: createBody(), token: 'seller-token' }));
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('vary')).toBe('Authorization');
    const { listing } = await response.json() as { listing: Record<string, unknown> };
    expect(listing).toMatchObject({ status: 'draft', revenueBasis: 'self_reported', title: 'Camera Shop', monthlyProfitJpy: 300_000 });
    expect(listing).not.toHaveProperty('userId');
    expect(listing).not.toHaveProperty('verificationId');
    expect(listings()).toEqual([expect.objectContaining({
      id: listing.id, user_id: 'seller-1', status: 'draft', revenue_basis: 'self_reported', verification_id: null,
    })]);
    expect(state.rateLimit).toHaveBeenCalledWith(expect.anything(), 'business-sale-create', expect.objectContaining({ subject: 'seller-1' }));
  });

  it('a draft is not visible in the public list until it is published', async () => {
    await POST(jsonRequest(URL_BASE, { body: createBody(), token: 'seller-token' }));
    const body = await (await GET(jsonRequest(URL_BASE))).json() as { listings: unknown[] };
    expect(body.listings).toEqual([]);
  });

  it.each([
    ['status', { status: 'published' }],
    ['revenueBasis', { revenueBasis: 'stripe_verified' }],
    ['revenue_basis', { revenue_basis: 'stripe_verified' }],
    ['verificationId', { verificationId: 'ver-1' }],
    ['verification_id', { verification_id: 'ver-1' }],
    ['userId', { userId: 'someone-else' }],
    ['url', { url: 'https://example.com' }],
    ['productUrl', { productUrl: 'https://example.com' }],
    ['slug', { slug: 'chosen-slug' }],
    ['id', { id: 'chosen-id' }],
  ])('rejects the extra key %s and writes nothing', async (_key, extra) => {
    const response = await POST(jsonRequest(URL_BASE, { body: createBody(extra), token: 'seller-token' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty('field');
    expect(listings()).toEqual([]);
  });

  it.each([
    ['fractional amount', { monthlyRevenueJpy: 1000.5 }, 'monthlyRevenueJpy'],
    ['negative amount', { askingPriceJpy: -1 }, 'askingPriceJpy'],
    ['amount as text', { monthlyProfitJpy: '300000' }, 'monthlyProfitJpy'],
    ['amount over the cap', { askingPriceJpy: 10_000_000_001 }, 'askingPriceJpy'],
    ['amount beyond safe integers', { monthlyRevenueJpy: 1e21 }, 'monthlyRevenueJpy'],
    ['unknown category', { category: 'crypto' }, 'category'],
    ['future year', { establishedYear: 2100 }, 'establishedYear'],
    ['title with a URL', { title: 'Shop https://evil.example' }, 'title'],
    ['profit above revenue', { monthlyRevenueJpy: 100, monthlyProfitJpy: 101 }, 'monthlyProfitJpy'],
    ['missing title', { title: undefined }, 'title'],
  ])('rejects %s with a field name', async (_name, override, field) => {
    const response = await POST(jsonRequest(URL_BASE, { body: createBody(override), token: 'seller-token' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ field });
    expect(listings()).toEqual([]);
  });

  it('rejects broken JSON and bodies that are not objects', async () => {
    for (const rawBody of ['{not json', '[]', 'null', '"text"', '']) {
      const response = await POST(jsonRequest(URL_BASE, { rawBody, token: 'seller-token' }));
      expect(response.status, rawBody).toBe(400);
    }
    expect(listings()).toEqual([]);
  });

  it('bounds the request body', async () => {
    const padded = JSON.stringify(createBody({ summary: 'あ'.repeat(600) })).padEnd(20_000, ' ');
    const response = await POST(jsonRequest(URL_BASE, { rawBody: padded, token: 'seller-token' }));
    expect(response.status).toBe(413);
    expect(listings()).toEqual([]);
  });

  it('limits how many drafts one user can create', async () => {
    state.denied.add('business-sale-create');
    const response = await POST(jsonRequest(URL_BASE, { body: createBody(), token: 'seller-token' }));
    expect(response.status).toBe(429);
    expect(listings()).toEqual([]);
  });

  it('answers 503 without details when saving fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    state.db!.exec('DROP TABLE business_sale_inquiries; DROP TABLE business_sale_listings;');
    const response = await POST(jsonRequest(URL_BASE, { body: createBody(), token: 'seller-token' }));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toMatch(/sqlite|no such table|business_sale/i);
    state.db = openBusinessSaleTestDatabase();
    expect(inquiryRows(state.db)).toEqual([]);
  });
});
