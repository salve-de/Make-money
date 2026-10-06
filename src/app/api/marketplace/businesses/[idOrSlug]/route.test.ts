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

import { GET, PATCH } from './route';
import { jsonRequest, listingRow, seedBusinessSale } from '@/lib/marketplace/testing/fixtures';
import { openBusinessSaleTestDatabase } from '@/lib/marketplace/testing/sqlite-d1';

const BASE = 'http://localhost/api/marketplace/businesses';
const context = (idOrSlug: string) => ({ params: Promise.resolve({ idOrSlug }) });
const patch = (id: string, body: unknown, token: string | null = 'seller-token') =>
  PATCH(jsonRequest(`${BASE}/${id}`, { method: 'PATCH', body, token }), context(id));

beforeEach(() => {
  state.db = openBusinessSaleTestDatabase();
  state.tokens = { 'seller-token': { uid: 'seller-1' }, 'other-token': { uid: 'seller-2' } };
  state.denied.clear();
});
afterEach(() => {
  state.db?.close();
  vi.restoreAllMocks();
});

describe('GET /api/marketplace/businesses/[slug]', () => {
  it('returns a published listing with a short shared cache and no personal data', async () => {
    seedBusinessSale(state.db!, { slug: 'camera-shop-0123456789', userId: 'secret-seller-uid' });
    state.db!.prepare(
      "INSERT INTO business_sale_inquiries(id,listing_id,buyer_user_id,message,contact_email) SELECT 'i1',id,'buyer-secret-uid','十分な長さのメッセージです。','buyer-secret@example.com' FROM business_sale_listings",
    ).run();
    const response = await GET(jsonRequest(`${BASE}/camera-shop-0123456789`), context('camera-shop-0123456789'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=0, s-maxage=30, stale-while-revalidate=60');
    const text = await response.text();
    expect(JSON.parse(text)).toMatchObject({
      success: true,
      listing: { slug: 'camera-shop-0123456789', revenueBasis: 'self_reported', reasonForSale: '本業に専念するため', includedAssets: expect.any(String) },
    });
    for (const secret of ['secret-seller-uid', 'buyer-secret-uid', 'buyer-secret@example.com', 'userId', 'contactEmail', '"status"']) {
      expect(text).not.toContain(secret);
    }
  });

  it('answers 404 for drafts, closed listings and unknown slugs, and does not cache the error', async () => {
    seedBusinessSale(state.db!, { slug: 'a-draft', status: 'draft' });
    seedBusinessSale(state.db!, { slug: 'a-closed', status: 'closed' });
    for (const slug of ['a-draft', 'a-closed', 'nothing-here']) {
      const response = await GET(jsonRequest(`${BASE}/${slug}`), context(slug));
      expect(response.status, slug).toBe(404);
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
  });

  it('answers 404 for malformed slugs without touching the database', async () => {
    state.db!.close();
    for (const slug of ['UPPER', 'with space', 'a/b', "x'--", '-leading', 'trailing-', 'a'.repeat(81), '日本語']) {
      expect((await GET(jsonRequest(`${BASE}/x`), context(slug))).status, slug).toBe(404);
    }
    state.db = openBusinessSaleTestDatabase();
  });

  it('answers 503 without details when the database fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    state.db!.close();
    const response = await GET(jsonRequest(`${BASE}/valid-slug`), context('valid-slug'));
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    state.db = openBusinessSaleTestDatabase();
  });
});

describe('PATCH /api/marketplace/businesses/[id]', () => {
  it('requires a valid login', async () => {
    const id = seedBusinessSale(state.db!, { status: 'draft' });
    for (const token of [null, 'unknown']) {
      const response = await patch(id, { title: 'ハッキング' }, token);
      expect(response.status).toBe(401);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(listingRow(state.db!, id)).toMatchObject({ title: expect.not.stringContaining('ハッキング') });
    expect(state.rateLimit).not.toHaveBeenCalled();
  });

  it('lets the owner edit the content', async () => {
    const id = seedBusinessSale(state.db!, { status: 'draft' });
    const response = await patch(id, { title: '更新後の事業名', askingPriceJpy: 5_000_000, sellerName: '' });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toMatchObject({ success: true, listing: { id, title: '更新後の事業名', askingPriceJpy: 5_000_000, status: 'draft' } });
    expect(listingRow(state.db!, id)).toMatchObject({ title: '更新後の事業名', asking_price_jpy: 5_000_000, seller_name: '' });
    expect(state.rateLimit).toHaveBeenCalledWith(expect.anything(), 'business-sale-update', expect.objectContaining({ subject: 'seller-1' }));
  });

  it('refuses to let anyone but the owner update, publish or close a listing', async () => {
    const draft = seedBusinessSale(state.db!, { userId: 'seller-1', status: 'draft' });
    const published = seedBusinessSale(state.db!, { userId: 'seller-1', status: 'published' });
    const before = [listingRow(state.db!, draft), listingRow(state.db!, published)];

    expect((await patch(draft, { title: '乗っ取り' }, 'other-token')).status).toBe(404);
    expect((await patch(draft, { status: 'pending_review' }, 'other-token')).status).toBe(404);
    expect((await patch(published, { status: 'closed' }, 'other-token')).status).toBe(404);
    expect((await patch(published, { askingPriceJpy: 1 }, 'other-token')).status).toBe(404);
    expect([listingRow(state.db!, draft), listingRow(state.db!, published)]).toEqual(before);
  });

  it('answers 404 for unknown and malformed ids', async () => {
    for (const id of [crypto.randomUUID(), 'not-a-uuid', '1', "x'--", 'ABCDEF01-0000-0000-0000-000000000000']) {
      expect((await patch(id, { title: '存在しない掲載' })).status, id).toBe(404);
    }
  });

  it('moves a complete draft to pending_review, stays hidden until approved, then can be closed', async () => {
    const id = seedBusinessSale(state.db!, { status: 'draft' });
    const slug = String(listingRow(state.db!, id)!.slug);
    expect(await (await patch(id, { status: 'pending_review' })).json()).toMatchObject({ listing: { status: 'pending_review' } });
    expect((await GET(jsonRequest(`${BASE}/x`), context(slug))).status).toBe(404);
    state.db!.prepare("UPDATE business_sale_listings SET status='published' WHERE id=?").run(id); // 運営者の承認
    expect(await (await GET(jsonRequest(`${BASE}/x`), context(slug))).json()).toMatchObject({ listing: { id } });
    expect(await (await patch(id, { status: 'closed' })).json()).toMatchObject({ listing: { status: 'closed' } });
    expect((await GET(jsonRequest(`${BASE}/x`), context(slug))).status).toBe(404);
  });

  it('never lets the owner publish or reject their own listing', async () => {
    const id = seedBusinessSale(state.db!, { status: 'draft' });
    for (const status of ['published', 'rejected']) {
      const response = await patch(id, { status });
      expect(response.status, status).toBe(400);
      expect(await response.json()).toMatchObject({ field: 'status' });
    }
    expect(listingRow(state.db!, id)).toMatchObject({ status: 'draft' });
  });

  it('puts an edited published listing back to review and takes it off the public page', async () => {
    const id = seedBusinessSale(state.db!, { status: 'published' });
    const slug = String(listingRow(state.db!, id)!.slug);
    expect((await GET(jsonRequest(`${BASE}/x`), context(slug))).status).toBe(200);
    expect(await (await patch(id, { askingPriceJpy: 1_000_000 })).json()).toMatchObject({ listing: { status: 'pending_review', askingPriceJpy: 1_000_000 } });
    expect((await GET(jsonRequest(`${BASE}/x`), context(slug))).status).toBe(404);
  });

  it('answers 400 with the field when a draft is not ready for review', async () => {
    const id = seedBusinessSale(state.db!, { status: 'draft' });
    state.db!.prepare("UPDATE business_sale_listings SET included_assets='' WHERE id=?").run(id);
    const response = await patch(id, { status: 'pending_review' });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ field: 'includedAssets' });
    expect(listingRow(state.db!, id)).toMatchObject({ status: 'draft' });
  });

  it('answers 409 for a state change that skips or goes back', async () => {
    const draft = seedBusinessSale(state.db!, { status: 'draft' });
    const published = seedBusinessSale(state.db!, { status: 'published' });
    const closed = seedBusinessSale(state.db!, { status: 'closed' });
    for (const [id, body] of [[draft, { status: 'closed' }], [published, { status: 'draft' }], [closed, { status: 'pending_review' }], [closed, { title: '終了後の編集' }]] as const) {
      expect((await patch(id, body)).status, JSON.stringify(body)).toBe(409);
    }
    expect([draft, published, closed].map((id) => listingRow(state.db!, id)!.status)).toEqual(['draft', 'published', 'closed']);
  });

  it('never accepts a revenue basis, a verification record or other unknown keys', async () => {
    const id = seedBusinessSale(state.db!, { status: 'draft' });
    const before = listingRow(state.db!, id);
    for (const body of [
      { revenueBasis: 'stripe_verified' }, { revenue_basis: 'stripe_verified' }, { verificationId: 'ver-1' },
      { verification_id: 'ver-1' }, { userId: 'seller-2' }, { slug: 'other' }, { id: 'other' }, { url: 'https://example.com' },
      { title: '通る項目', revenueBasis: 'stripe_verified' },
    ]) {
      const response = await patch(id, body);
      expect(response.status, JSON.stringify(body)).toBe(400);
    }
    expect(listingRow(state.db!, id)).toEqual(before);
  });

  it('answers 400 for an empty update, invalid values and broken bodies', async () => {
    const id = seedBusinessSale(state.db!, { status: 'draft' });
    for (const body of [{}, { title: '' }, { askingPriceJpy: -1 }, { askingPriceJpy: 1.5 }, { status: 'archived' }, { monthlyRevenueJpy: 10 }]) {
      expect((await patch(id, body)).status, JSON.stringify(body)).toBe(400);
    }
    for (const rawBody of ['{oops', '[]', 'null', '']) {
      const response = await PATCH(jsonRequest(`${BASE}/${id}`, { method: 'PATCH', rawBody, token: 'seller-token' }), context(id));
      expect(response.status, rawBody).toBe(400);
    }
  });

  it('bounds the request body', async () => {
    const id = seedBusinessSale(state.db!, { status: 'draft' });
    const rawBody = JSON.stringify({ summary: 'あ' }).padEnd(20_000, ' ');
    const response = await PATCH(jsonRequest(`${BASE}/${id}`, { method: 'PATCH', rawBody, token: 'seller-token' }), context(id));
    expect(response.status).toBe(413);
  });

  it('drops the verified label when the revenue is edited', async () => {
    const id = seedBusinessSale(state.db!, { revenueBasis: 'stripe_verified', verificationId: 'ver-1' });
    await patch(id, { askingPriceJpy: 3_000_000 });
    expect(listingRow(state.db!, id)).toMatchObject({ revenue_basis: 'stripe_verified', verification_id: 'ver-1' });
    const response = await patch(id, { monthlyRevenueJpy: 2_000_000 });
    expect(await response.json()).toMatchObject({ listing: { revenueBasis: 'self_reported' } });
    expect(listingRow(state.db!, id)).toMatchObject({ revenue_basis: 'self_reported', verification_id: null });
  });

  it('limits the number of updates and changes nothing when limited', async () => {
    const id = seedBusinessSale(state.db!, { status: 'draft' });
    const before = listingRow(state.db!, id);
    state.denied.add('business-sale-update');
    expect((await patch(id, { title: '更新の上限テスト' })).status).toBe(429);
    expect(listingRow(state.db!, id)).toEqual(before);
  });

  it('answers 503 without details when saving fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const id = seedBusinessSale(state.db!, { status: 'draft' });
    state.db!.close();
    const response = await patch(id, { title: '保存失敗のテスト' });
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toMatch(/sqlite|not open|business_sale/i);
    state.db = openBusinessSaleTestDatabase();
  });
});
