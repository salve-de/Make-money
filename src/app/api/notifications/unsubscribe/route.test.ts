import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  env: {} as Record<string, string | undefined>,
  remove: vi.fn(),
}));

vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: async (name: string) => state.env[name] }));
vi.mock('@/lib/notifications/recipients', () => ({ deleteNewsletterSubscriber: state.remove }));

import { signNewsletterUnsubscribe } from '@/lib/notifications/unsubscribe-link';
import { GET, POST } from './route';

const ORIGIN = 'https://make-money.example.jp';

async function link(id: string, options: { signature?: string } = {}) {
  const signature = options.signature ?? (await signNewsletterUnsubscribe(id));
  return `${ORIGIN}/api/notifications/unsubscribe?u=${encodeURIComponent(id)}&s=${signature}`;
}
const get = (url: string) => new NextRequest(url, { method: 'GET' });
const post = (url: string, body = 'List-Unsubscribe=One-Click') =>
  new NextRequest(url, { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' } });

beforeEach(() => {
  state.env = { NOTIFY_CRON_SECRET: 'cron-secret-value' };
  state.remove.mockReset().mockResolvedValue(undefined);
});

describe('GET /api/notifications/unsubscribe', () => {
  it('shows a confirmation page and does not unsubscribe anyone, so mail scanners cannot do it', async () => {
    const response = await GET(get(await link('sub-1')));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('配信を停止しますか？');
    expect(html).toContain('<form method="post"');
    expect(html).toContain('u=sub-1');
    expect(state.remove).not.toHaveBeenCalled();
  });

  it('posts the confirmation to the same signed link', async () => {
    const url = await link('sub-1');
    const html = await (await GET(get(url))).text();
    const signature = new URL(url).searchParams.get('s')!;
    expect(html).toContain(`action="/api/notifications/unsubscribe?u=sub-1&amp;s=${signature}"`);
  });

  it('refuses a link with a wrong, missing or malformed signature', async () => {
    const good = await link('sub-1');
    const other = await link('sub-2');
    const badLinks = [
      `${ORIGIN}/api/notifications/unsubscribe?u=sub-1&s=${'0'.repeat(64)}`,
      `${ORIGIN}/api/notifications/unsubscribe?u=sub-1`,
      `${ORIGIN}/api/notifications/unsubscribe?s=${new URL(good).searchParams.get('s')}`,
      `${ORIGIN}/api/notifications/unsubscribe?u=sub-1&s=short`,
      `${ORIGIN}/api/notifications/unsubscribe`,
      // someone else's signature on this id
      `${ORIGIN}/api/notifications/unsubscribe?u=sub-1&s=${new URL(other).searchParams.get('s')}`,
    ];
    for (const url of badLinks) {
      const response = await GET(get(url));
      expect(response.status).toBe(400);
      expect(await response.text()).toContain('このリンクは使えません');
    }
    expect(state.remove).not.toHaveBeenCalled();
  });

  it('is never cached, indexed or embedded, and leaks no referrer', async () => {
    const response = await GET(get(await link('sub-1')));
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    const policy = response.headers.get('content-security-policy')!;
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain('script-src');
  });

  it('cannot be tricked into reflecting markup from the query string', async () => {
    const response = await GET(get(`${ORIGIN}/api/notifications/unsubscribe?u=${encodeURIComponent('"><script>alert(1)</script>')}&s=${'a'.repeat(64)}`));
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain('<script>alert(1)');
  });
});

describe('POST /api/notifications/unsubscribe', () => {
  it('removes the subscriber named by a valid link and confirms', async () => {
    const response = await POST(post(await link('sub-1')));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('配信を停止しました');
    expect(state.remove).toHaveBeenCalledExactlyOnceWith('sub-1');
  });

  it('works as the one-click unsubscribe a mail client sends, with or without that body', async () => {
    expect((await POST(post(await link('sub-1'), 'List-Unsubscribe=One-Click'))).status).toBe(200);
    expect((await POST(new NextRequest(await link('sub-2'), { method: 'POST' }))).status).toBe(200);
    expect(state.remove.mock.calls.map((call) => call[0])).toEqual(['sub-1', 'sub-2']);
  });

  it('can be repeated: unsubscribing twice is not an error', async () => {
    const url = await link('sub-1');
    expect((await POST(post(url))).status).toBe(200);
    expect((await POST(post(url))).status).toBe(200);
  });

  it('removes nobody for a link that is not properly signed', async () => {
    for (const url of [
      `${ORIGIN}/api/notifications/unsubscribe?u=sub-1&s=${'0'.repeat(64)}`,
      `${ORIGIN}/api/notifications/unsubscribe?u=sub-1`,
      `${ORIGIN}/api/notifications/unsubscribe`,
    ]) {
      expect((await POST(post(url))).status).toBe(400);
    }
    expect(state.remove).not.toHaveBeenCalled();
  });

  it('cannot use the signature of one subscriber to remove another', async () => {
    const forged = (await link('sub-1')).replace('u=sub-1', 'u=sub-2');
    expect((await POST(post(forged))).status).toBe(400);
    expect(state.remove).not.toHaveBeenCalled();
  });

  it('stops working when the signing secret changes, and never works without one', async () => {
    const url = await link('sub-1');
    state.env = { NOTIFY_CRON_SECRET: 'rotated' };
    expect((await POST(post(url))).status).toBe(400);
    state.env = {};
    expect((await POST(post(url))).status).toBe(400);
    expect(state.remove).not.toHaveBeenCalled();
  });

  it('does not say it worked when the database fails', async () => {
    state.remove.mockRejectedValue(new Error('D1 unavailable'));
    const response = await POST(post(await link('sub-1')));
    expect(response.status).toBe(503);
    const html = await response.text();
    expect(html).toContain('配信を停止できませんでした');
    expect(html).not.toContain('配信を停止しました');
  });
});
