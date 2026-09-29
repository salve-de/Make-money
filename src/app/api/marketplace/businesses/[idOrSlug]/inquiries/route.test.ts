import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';

const state = vi.hoisted(() => ({
  db: null as DatabaseSync | null,
  tokens: {} as Record<string, { uid: string }>,
  env: {} as Record<string, string | undefined>,
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
vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: async (name: string) => state.env[name] }));

import { POST } from './route';
import { inquiryRows, jsonRequest, seedBusinessSale } from '@/lib/marketplace/testing/fixtures';
import { openBusinessSaleTestDatabase } from '@/lib/marketplace/testing/sqlite-d1';

const MESSAGE = '売上の推移と、引き継ぎに必要な期間を教えていただけますか。';
const goodBody = { message: MESSAGE, contactEmail: 'buyer@example.com' };
const MAIL = { RESEND_API_KEY: 're_test_secret_key', NOTIFY_FROM_EMAIL: 'notify@mail.example.org' };

const context = (id: string) => ({ params: Promise.resolve({ idOrSlug: id }) });
const send = (id: string, body: unknown = goodBody, token: string | null = 'buyer-token') =>
  POST(jsonRequest(`http://localhost/api/marketplace/businesses/${id}/inquiries`, { body, token }), context(id));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  state.db = openBusinessSaleTestDatabase();
  state.tokens = { 'seller-token': { uid: 'seller-1' }, 'buyer-token': { uid: 'buyer-1' }, 'buyer2-token': { uid: 'buyer-2' } };
  state.env = {};
  state.denied.clear();
  fetchMock = vi.fn(async () => new Response('{"id":"email-1"}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  state.db?.close();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /api/marketplace/businesses/[id]/inquiries', () => {
  it('requires a valid login and stores nothing without one', async () => {
    const id = seedBusinessSale(state.db!);
    for (const token of [null, 'unknown']) {
      const response = await send(id, goodBody, token);
      expect(response.status).toBe(401);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(inquiryRows(state.db!)).toEqual([]);
    expect(state.rateLimit).not.toHaveBeenCalled();
  });

  it('stores the inquiry for the logged-in buyer', async () => {
    const id = seedBusinessSale(state.db!, { userId: 'seller-1' });
    const response = await send(id);
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const body = await response.json() as Record<string, unknown>;
    expect(body).toEqual({ success: true, inquiryId: expect.any(String) });
    expect(inquiryRows(state.db!)).toEqual([
      expect.objectContaining({ id: body.inquiryId, listing_id: id, buyer_user_id: 'buyer-1', message: MESSAGE, contact_email: 'buyer@example.com' }),
    ]);
    expect(state.rateLimit).toHaveBeenCalledWith(expect.anything(), 'business-sale-inquiry', expect.objectContaining({ subject: 'buyer-1' }));
  });

  it('does not let a seller inquire about their own listing', async () => {
    const id = seedBusinessSale(state.db!, { userId: 'seller-1' });
    state.env = { ...MAIL };
    state.db!.prepare('INSERT INTO users(id,email) VALUES(?,?)').run('seller-1', 'seller@example.com');
    const response = await send(id, goodBody, 'seller-token');
    expect(response.status).toBe(403);
    expect(inquiryRows(state.db!)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('only accepts inquiries for published listings', async () => {
    const draft = seedBusinessSale(state.db!, { status: 'draft' });
    const closed = seedBusinessSale(state.db!, { status: 'closed' });
    for (const id of [draft, closed, crypto.randomUUID(), 'not-a-uuid', "x'--"]) {
      expect((await send(id)).status, id).toBe(404);
    }
    expect(inquiryRows(state.db!)).toEqual([]);
  });

  it('allows one inquiry per buyer and listing per day', async () => {
    const id = seedBusinessSale(state.db!);
    expect((await send(id)).status).toBe(201);

    const again = await send(id, { message: '追加で確認したいことがあります。', contactEmail: 'buyer@example.com' });
    expect(again.status).toBe(429);
    expect(await again.json()).toEqual({ error: expect.stringContaining('1日1回') });
    expect(inquiryRows(state.db!)).toHaveLength(1);

    // 別の買い手は同じ掲載に送れる。同じ買い手も別の掲載には送れる。
    expect((await send(id, goodBody, 'buyer2-token')).status).toBe(201);
    expect((await send(seedBusinessSale(state.db!))).status).toBe(201);
    expect(inquiryRows(state.db!)).toHaveLength(3);

    // 24時間たてばもう一度送れる。
    state.db!.prepare("UPDATE business_sale_inquiries SET created_at=datetime('now','-25 hours') WHERE buyer_user_id='buyer-1' AND listing_id=?").run(id);
    expect((await send(id)).status).toBe(201);
  });

  it('cannot exceed the daily limit with simultaneous requests', async () => {
    const id = seedBusinessSale(state.db!);
    const statuses = (await Promise.all([send(id), send(id), send(id)])).map((response) => response.status).sort();
    expect(statuses).toEqual([201, 429, 429]);
    expect(inquiryRows(state.db!)).toHaveLength(1);
  });

  it('limits how many inquiries one user can send per hour', async () => {
    const id = seedBusinessSale(state.db!);
    state.denied.add('business-sale-inquiry');
    expect((await send(id)).status).toBe(429);
    expect(inquiryRows(state.db!)).toEqual([]);
  });

  it.each([
    ['a short message', { message: '短すぎる問い合わせ', contactEmail: 'buyer@example.com' }, 'message'],
    ['a message that is too long', { message: 'あ'.repeat(2001), contactEmail: 'buyer@example.com' }, 'message'],
    ['a missing message', { contactEmail: 'buyer@example.com' }, 'message'],
    ['a missing email', { message: MESSAGE }, 'contactEmail'],
    ['an invalid email', { message: MESSAGE, contactEmail: 'buyer' }, 'contactEmail'],
    ['an email that could add mailto parameters', { message: MESSAGE, contactEmail: 'buyer@example.com?bcc=x@y.jp' }, 'contactEmail'],
    ['a buyer id in the body', { ...goodBody, buyerUserId: 'someone-else' }, 'buyerUserId'],
    ['a listing id in the body', { ...goodBody, listingId: 'other' }, 'listingId'],
  ])('rejects %s', async (_name, body, field) => {
    const id = seedBusinessSale(state.db!);
    const response = await send(id, body);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ field });
    expect(inquiryRows(state.db!)).toEqual([]);
  });

  it('rejects broken JSON and bounds the body', async () => {
    const id = seedBusinessSale(state.db!);
    const url = `http://localhost/api/marketplace/businesses/${id}/inquiries`;
    for (const rawBody of ['{oops', '[]', 'null', '']) {
      expect((await POST(jsonRequest(url, { rawBody, token: 'buyer-token' }), context(id))).status, rawBody).toBe(400);
    }
    const padded = JSON.stringify(goodBody).padEnd(20_000, ' ');
    expect((await POST(jsonRequest(url, { rawBody: padded, token: 'buyer-token' }), context(id))).status).toBe(413);
    expect(inquiryRows(state.db!)).toEqual([]);
  });

  it('answers 503 without details when saving fails', async () => {
    const id = seedBusinessSale(state.db!);
    state.db!.close();
    const response = await send(id);
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toMatch(/sqlite|not open|business_sale/i);
    state.db = openBusinessSaleTestDatabase();
  });
});

describe('seller notification by email', () => {
  function publishedListing(sellerEmail: string | null = 'seller@example.com') {
    if (sellerEmail) state.db!.prepare('INSERT INTO users(id,email) VALUES(?,?)').run('seller-1', sellerEmail);
    return seedBusinessSale(state.db!, { userId: 'seller-1', title: 'Camera Shop' });
  }

  it('sends nothing when the mail settings are absent, and the inquiry is still saved', async () => {
    const id = publishedListing();
    expect((await send(id)).status).toBe(201);
    expect(inquiryRows(state.db!)).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(state.rateLimit).toHaveBeenCalledTimes(1);
    expect(console.warn).not.toHaveBeenCalled();

    state.env = { RESEND_API_KEY: MAIL.RESEND_API_KEY };
    expect((await send(id, goodBody, 'buyer2-token')).status).toBe(201);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('tells the seller an inquiry arrived without including what the buyer wrote', async () => {
    const id = publishedListing();
    state.env = { ...MAIL };
    expect((await send(id)).status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${MAIL.RESEND_API_KEY}`);
    const mail = JSON.parse(String(init.body)) as { from: string; to: string[]; subject: string; text: string };
    expect(mail.from).toBe(MAIL.NOTIFY_FROM_EMAIL);
    expect(mail.to).toEqual(['seller@example.com']);
    expect(mail.subject).toContain('問い合わせが届きました');
    expect(mail.text).toContain('Camera Shop');
    expect(mail.text).not.toContain(MESSAGE);
    expect(mail.text).not.toContain('buyer@example.com');
    expect(mail.text).not.toContain('引き継ぎ');
  });

  it('does not mail a seller whose address is unknown, and still saves', async () => {
    const id = publishedListing(null);
    state.env = { ...MAIL };
    expect((await send(id)).status).toBe(201);
    expect(inquiryRows(state.db!)).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('[business-sale] inquiry notice not sent', { reason: 'no_recipient', listingId: id });
  });

  it('does not mail a placeholder address made for anonymous accounts', async () => {
    const id = publishedListing('seller-1@anon.example.com');
    state.env = { ...MAIL };
    expect((await send(id)).status).toBe(201);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the saved inquiry when the mail provider fails', async () => {
    const id = publishedListing();
    state.env = { ...MAIL };
    fetchMock.mockRejectedValueOnce(new Error('provider down'));
    expect((await send(id)).status).toBe(201);
    fetchMock.mockResolvedValueOnce(new Response('quota', { status: 429 }));
    expect((await send(id, goodBody, 'buyer2-token')).status).toBe(201);
    expect(inquiryRows(state.db!)).toHaveLength(2);
    const logged = JSON.stringify((console.warn as ReturnType<typeof vi.fn>).mock.calls);
    expect(logged).toContain('failed');
    expect(logged).not.toContain('seller@example.com');
    expect(logged).not.toContain(MAIL.RESEND_API_KEY);
  });

  it('does not mail when the per-listing notice limit is used up', async () => {
    const id = publishedListing();
    state.env = { ...MAIL };
    state.denied.add('business-sale-notice');
    expect((await send(id)).status).toBe(201);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends no mail for a rejected inquiry', async () => {
    const id = publishedListing();
    state.env = { ...MAIL };
    await send(id, { message: '短い', contactEmail: 'buyer@example.com' });
    await send(id, goodBody, 'seller-token');
    await send(crypto.randomUUID());
    expect((await send(id)).status).toBe(201);
    fetchMock.mockClear();
    expect((await send(id)).status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
