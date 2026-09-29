import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';

const state = vi.hoisted(() => ({
  db: null as DatabaseSync | null,
  env: {} as Record<string, string | undefined>,
  throttled: false,
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: async (name: string) => state.env[name] }));
vi.mock('@/lib/storage/d1', async () => (await import('./testing/sqlite-d1')).sqliteD1Module(() => state.db!));
vi.mock('@/lib/security/rate-limit', () => ({
  consumeRequestRateLimit: async (...args: unknown[]) => {
    state.rateLimit(...args);
    return !state.throttled;
  },
}));

import { composeInquiryNotice, notifySellerOfInquiry, readEmailConfig, sendResendEmail } from './business-notify';
import { openBusinessSaleTestDatabase } from './testing/sqlite-d1';

const CONFIG = { RESEND_API_KEY: 're_test_secret_key', NOTIFY_FROM_EMAIL: '金鉱録 <notify@mail.example.org>' };
const input = { listingId: 'listing-1', sellerUserId: 'seller-1', listingTitle: '中古カメラ専門のネットショップ' };
const request = new Request('http://localhost/api/x', { method: 'POST' });

let fetchMock: ReturnType<typeof vi.fn>;
let warn: ReturnType<typeof vi.spyOn>;

function addUser(id: string, email: string) {
  state.db!.prepare('INSERT INTO users(id,email) VALUES(?,?)').run(id, email);
}

beforeEach(() => {
  state.db = openBusinessSaleTestDatabase();
  state.env = { ...CONFIG };
  state.throttled = false;
  fetchMock = vi.fn(async () => new Response('{"id":"email-1"}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  state.db?.close();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('readEmailConfig', () => {
  it('needs both the API key and the sender address', async () => {
    expect(await readEmailConfig()).toEqual({ apiKey: CONFIG.RESEND_API_KEY, from: CONFIG.NOTIFY_FROM_EMAIL });
    state.env = { RESEND_API_KEY: CONFIG.RESEND_API_KEY };
    expect(await readEmailConfig()).toBeNull();
    state.env = { NOTIFY_FROM_EMAIL: CONFIG.NOTIFY_FROM_EMAIL };
    expect(await readEmailConfig()).toBeNull();
    state.env = { RESEND_API_KEY: '', NOTIFY_FROM_EMAIL: '' };
    expect(await readEmailConfig()).toBeNull();
    state.env = {};
    expect(await readEmailConfig()).toBeNull();
  });
});

describe('sendResendEmail', () => {
  const config = { apiKey: 're_key', from: 'notify@mail.example.org' };
  const message = { to: 'seller@example.com', subject: '件名', text: '本文' };

  it('posts JSON to the Resend API with the bearer key', async () => {
    expect(await sendResendEmail(config, message)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: 'Bearer re_key', 'Content-Type': 'application/json' });
    expect(JSON.parse(String(init.body))).toEqual({ from: 'notify@mail.example.org', to: ['seller@example.com'], subject: '件名', text: '本文' });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('reports failure for an error status or a network error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 422 }));
    expect(await sendResendEmail(config, message)).toBe(false);
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    expect(await sendResendEmail(config, message)).toBe(false);
  });
});

describe('composeInquiryNotice', () => {
  it('names the listing, points to the site and carries no inquiry content', () => {
    const text = composeInquiryNotice({ listingTitle: '中古カメラ専門のネットショップ', appOrigin: 'https://kinrokoku.example' });
    expect(text).toContain('「中古カメラ専門のネットショップ」に問い合わせが届きました');
    expect(text).toContain('https://kinrokoku.example/marketplace/businesses/mine');
    expect(text).toContain('問い合わせの内容と連絡先は、このメールには入れていません');
  });

  it('still tells the seller where to look when no site address is configured', () => {
    const text = composeInquiryNotice({ listingTitle: 'Shop', appOrigin: null });
    expect(text).not.toContain('http');
    expect(text).toContain('「事業の売買」の「自分の掲載」');
  });

  it('keeps line breaks and control characters in a title out of the mail', () => {
    const text = composeInquiryNotice({ listingTitle: `A\nBcc: evil@example.com\r\u0007${'x'.repeat(200)}`, appOrigin: null });
    const firstLine = text.split('\n')[0];
    expect(firstLine).toContain('ABcc: evil@example.com');
    expect(firstLine).not.toContain('\u0007');
    expect(firstLine.length).toBeLessThan(190);
  });
});

describe('notifySellerOfInquiry', () => {
  it('does nothing at all when the mail settings are missing', async () => {
    addUser('seller-1', 'seller@example.com');
    for (const env of [{}, { RESEND_API_KEY: CONFIG.RESEND_API_KEY }, { NOTIFY_FROM_EMAIL: CONFIG.NOTIFY_FROM_EMAIL }]) {
      state.env = env;
      expect(await notifySellerOfInquiry(request, input)).toEqual({ sent: false, reason: 'not_configured' });
    }
    expect(fetchMock).not.toHaveBeenCalled();
    expect(state.rateLimit).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('mails the address stored for the seller, without any inquiry content', async () => {
    addUser('seller-1', 'Seller@Example.com');
    state.env = { ...CONFIG, NEXT_PUBLIC_APP_URL: 'https://kinrokoku.example/some/path?x=1' };
    expect(await notifySellerOfInquiry(request, input)).toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      from: CONFIG.NOTIFY_FROM_EMAIL,
      to: ['seller@example.com'],
      subject: '【金鉱録】事業の売買に問い合わせが届きました',
    });
    expect(String(body.text)).toContain('https://kinrokoku.example/marketplace/businesses/mine');
    expect(String(body.text)).not.toContain('some/path');
    expect(state.rateLimit).toHaveBeenCalledWith(request, 'business-sale-notice', { limit: 3, windowMs: 3_600_000, subject: 'listing-1' });
    expect(warn).not.toHaveBeenCalled();
  });

  it('leaves the link out when the configured site address is not a safe origin', async () => {
    addUser('seller-1', 'seller@example.com');
    for (const url of ['http://evil.example', 'not a url', 'javascript:alert(1)']) {
      fetchMock.mockClear();
      state.env = { ...CONFIG, NEXT_PUBLIC_APP_URL: url };
      expect((await notifySellerOfInquiry(request, input)).sent).toBe(true);
      const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as { text: string };
      expect(body.text, url).not.toContain('http');
    }
  });

  it.each([
    ['no users row', () => {}],
    ['a placeholder address for an anonymous account', () => addUser('seller-1', 'seller-1@anon.example.com')],
    ['an address that is not valid', () => addUser('seller-1', 'not-an-address')],
  ])('does not send when the seller has %s', async (_name, setup) => {
    setup();
    expect(await notifySellerOfInquiry(request, input)).toEqual({ sent: false, reason: 'no_recipient' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('[business-sale] inquiry notice not sent', { reason: 'no_recipient', listingId: 'listing-1' });
  });

  it('limits notices per listing', async () => {
    addUser('seller-1', 'seller@example.com');
    state.throttled = true;
    expect(await notifySellerOfInquiry(request, input)).toEqual({ sent: false, reason: 'throttled' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('[business-sale] inquiry notice not sent', { reason: 'throttled', listingId: 'listing-1' });
  });

  it('reports a send failure without leaking the address or the key', async () => {
    addUser('seller-1', 'seller@example.com');
    fetchMock.mockResolvedValueOnce(new Response('bad key', { status: 401 }));
    expect(await notifySellerOfInquiry(request, input)).toEqual({ sent: false, reason: 'failed' });
    fetchMock.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    expect(await notifySellerOfInquiry(request, input)).toEqual({ sent: false, reason: 'failed' });
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain('failed');
    expect(logged).not.toContain('seller@example.com');
    expect(logged).not.toContain(CONFIG.RESEND_API_KEY);
  });

  it('never throws, even when the database is down', async () => {
    state.db!.close();
    await expect(notifySellerOfInquiry(request, input)).resolves.toEqual({ sent: false, reason: 'failed' });
    expect(fetchMock).not.toHaveBeenCalled();
    state.db = openBusinessSaleTestDatabase();
  });
});
