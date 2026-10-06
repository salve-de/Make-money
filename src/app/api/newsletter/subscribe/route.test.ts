import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  user: null as { uid: string } | null,
  env: {} as Record<string, string | undefined>,
  query: vi.fn(),
  execute: vi.fn(),
  send: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/storage/d1', () => ({ queryD1: state.query, executeD1: state.execute }));
vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: vi.fn(async () => state.user) }));
vi.mock('@/lib/security/rate-limit', () => ({ consumeRequestRateLimit: state.rateLimit }));
vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: async (name: string) => state.env[name] }));
vi.mock('@/lib/notifications/email', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/notifications/email')>()),
  sendEmail: state.send,
}));

import { POST } from './route';

const post = (body: unknown, auth = false) => new NextRequest('https://make-money.example.jp/api/newsletter/subscribe', {
  method: 'POST',
  headers: auth ? { authorization: 'Bearer test' } : {},
  body: JSON.stringify(body),
});

beforeEach(() => {
  state.user = null;
  state.env = { NOTIFY_CRON_SECRET: 'cron-secret-value', NEXT_PUBLIC_APP_URL: 'https://make-money.example.jp' };
  state.query.mockReset().mockResolvedValue([{ id: 'sub-1', confirmedAt: null }]);
  state.execute.mockReset().mockResolvedValue({ changes: 1, lastRowId: null });
  state.send.mockReset().mockResolvedValue({ ok: true, id: 'mail-1' });
  state.rateLimit.mockReset().mockResolvedValue(true);
});

describe('POST /api/newsletter/subscribe (double opt-in)', () => {
  it('saves the sign-up as pending and sends a confirmation link; the address is not echoed', async () => {
    const response = await POST(post({ email: 'Reader@Mail.jp' }));
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(JSON.parse(text)).toMatchObject({ success: true, confirmationSent: true });
    expect(text).not.toContain('reader@mail.jp');
    const insert = String(state.execute.mock.calls[0][0]);
    expect(insert).not.toContain('confirmed_at=');
    expect(insert).toContain('WHERE newsletter_subscribers.confirmed_at IS NULL');
    expect(state.send).toHaveBeenCalledTimes(1);
    const mail = state.send.mock.calls[0][0];
    expect(mail.to).toBe('reader@mail.jp');
    expect(mail.text).toMatch(/https:\/\/make-money\.example\.jp\/api\/newsletter\/confirm\?u=sub-1&e=\d+&s=[0-9a-f]{64}/);
    expect(mail.text).not.toContain('reader@mail.jp');
  });

  it('also requires confirmation for a logged-in user, and limits them per account', async () => {
    state.user = { uid: 'user-1' };
    const response = await POST(post({ email: 'reader@mail.jp' }, true));
    expect(response.status).toBe(200);
    expect(state.send).toHaveBeenCalledTimes(1);
    expect(state.rateLimit).toHaveBeenCalledWith(expect.anything(), 'newsletter-subscribe', { subject: 'uid:user-1' });
  });

  it('stays pending and says so when no mail can be sent (no mail settings / send failure)', async () => {
    state.send.mockResolvedValue({ ok: false, status: 0, retryable: false, code: 'not_configured' });
    const body = await (await POST(post({ email: 'reader@mail.jp' }))).json();
    expect(body).toMatchObject({ success: true, confirmationSent: false });
    expect(body.message).toContain('登録はまだ完了していません');
  });

  it('does not send when no signing secret exists', async () => {
    state.env = { NEXT_PUBLIC_APP_URL: 'https://make-money.example.jp' };
    expect((await (await POST(post({ email: 'reader@mail.jp' }))).json()).confirmationSent).toBe(false);
    expect(state.send).not.toHaveBeenCalled();
  });

  it('does not mail an address that is already confirmed, and answers the same way', async () => {
    state.query.mockResolvedValue([{ id: 'sub-1', confirmedAt: '2026-10-01 00:00:00' }]);
    const body = await (await POST(post({ email: 'reader@mail.jp' }))).json();
    expect(body).toMatchObject({ success: true, confirmationSent: true });
    expect(state.send).not.toHaveBeenCalled();
  });

  it('re-registering before confirming sends the confirmation again, within the per-address limit', async () => {
    await POST(post({ email: 'reader@mail.jp' }));
    await POST(post({ email: 'reader@mail.jp' }));
    expect(state.send).toHaveBeenCalledTimes(2);
    expect(state.rateLimit).toHaveBeenCalledWith(expect.anything(), 'newsletter-confirm-address', { subject: 'reader@mail.jp', limit: 3 });
  });

  it('stops sending past the per-address limit without telling the caller', async () => {
    state.rateLimit.mockImplementation(async (_req: unknown, scope: string) => scope !== 'newsletter-confirm-address');
    const response = await POST(post({ email: 'reader@mail.jp' }));
    expect(response.status).toBe(200);
    expect((await response.json()).confirmationSent).toBe(true);
    expect(state.send).not.toHaveBeenCalled();
  });

  it('rate limits the network address first', async () => {
    state.rateLimit.mockResolvedValue(false);
    expect((await POST(post({ email: 'reader@mail.jp' }))).status).toBe(429);
    expect(state.execute).not.toHaveBeenCalled();
    expect(state.send).not.toHaveBeenCalled();
  });
});
