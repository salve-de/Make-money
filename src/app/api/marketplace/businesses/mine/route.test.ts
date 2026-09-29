import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';

const state = vi.hoisted(() => ({
  db: null as DatabaseSync | null,
  tokens: {} as Record<string, { uid: string }>,
}));

vi.mock('@/lib/firebase/server', () => ({
  verifyFirebaseIdToken: async (token: string) => state.tokens[token] ?? null,
}));
vi.mock('@/lib/storage/d1', async () => (await import('@/lib/marketplace/testing/sqlite-d1')).sqliteD1Module(() => state.db!));

import { GET } from './route';
import { jsonRequest, seedBusinessSale } from '@/lib/marketplace/testing/fixtures';
import { openBusinessSaleTestDatabase } from '@/lib/marketplace/testing/sqlite-d1';

const URL_MINE = 'http://localhost/api/marketplace/businesses/mine';

function addInquiry(listingId: string, buyer: string, email: string, message = '十分な長さのメッセージです。') {
  state.db!.prepare(
    'INSERT INTO business_sale_inquiries(id,listing_id,buyer_user_id,message,contact_email) VALUES(?,?,?,?,?)',
  ).run(crypto.randomUUID(), listingId, buyer, message, email);
}

beforeEach(() => {
  state.db = openBusinessSaleTestDatabase();
  state.tokens = { 'seller-token': { uid: 'seller-1' }, 'other-token': { uid: 'seller-2' }, 'buyer-token': { uid: 'buyer-1' } };
});
afterEach(() => {
  state.db?.close();
  vi.restoreAllMocks();
});

describe('GET /api/marketplace/businesses/mine', () => {
  it('requires a valid login', async () => {
    for (const token of [null, 'unknown']) {
      const response = await GET(jsonRequest(URL_MINE, { token }));
      expect(response.status).toBe(401);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
  });

  it('returns only the caller\'s listings with the inquiries they received', async () => {
    const draft = seedBusinessSale(state.db!, { userId: 'seller-1', status: 'draft', slug: 'my-draft', updatedAt: '2026-09-01 00:00:00' });
    const published = seedBusinessSale(state.db!, { userId: 'seller-1', slug: 'my-published', updatedAt: '2026-09-10 00:00:00' });
    const others = seedBusinessSale(state.db!, { userId: 'seller-2', slug: 'their-listing' });
    addInquiry(published, 'buyer-1', 'buyer@example.com', 'こちらの掲載の売上を教えてください。');
    addInquiry(others, 'buyer-1', 'buyer@example.com', 'これは他の売り手宛ての問い合わせです。');

    const response = await GET(jsonRequest(URL_MINE, { token: 'seller-token' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('vary')).toBe('Authorization');
    const text = await response.text();
    const body = JSON.parse(text) as { listings: { id: string; slug: string; status: string; inquiryCount: number; inquiries: { contactEmail: string; message: string }[] }[] };
    expect(body.listings.map((listing) => listing.id)).toEqual([published, draft]);
    expect(body.listings[0]).toMatchObject({ inquiryCount: 1, inquiries: [{ contactEmail: 'buyer@example.com', message: 'こちらの掲載の売上を教えてください。' }] });
    expect(body.listings[1]).toMatchObject({ status: 'draft', inquiryCount: 0, inquiries: [] });
    for (const secret of ['their-listing', 'これは他の売り手宛て', others, 'buyer-1', 'seller-1', 'userId', 'buyerUserId']) {
      expect(text).not.toContain(secret);
    }
  });

  it('never shows one seller\'s inquiries to another user', async () => {
    const listing = seedBusinessSale(state.db!, { userId: 'seller-1' });
    addInquiry(listing, 'buyer-1', 'private-buyer@example.com');
    for (const token of ['other-token', 'buyer-token']) {
      const text = await (await GET(jsonRequest(URL_MINE, { token }))).text();
      expect(JSON.parse(text)).toEqual({ success: true, listings: [] });
      expect(text).not.toContain('private-buyer@example.com');
    }
  });

  it('answers 503 without details when the database fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    state.db!.close();
    const response = await GET(jsonRequest(URL_MINE, { token: 'seller-token' }));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toMatch(/sqlite|not open|business_sale/i);
    state.db = openBusinessSaleTestDatabase();
  });
});
