import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  env: {} as Record<string, string | undefined>,
  run: vi.fn(),
  createDeps: vi.fn(),
}));

vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: async (name: string) => state.env[name] }));
vi.mock('@/lib/notifications/digest', () => ({ runDigest: state.run }));
vi.mock('@/lib/notifications/digest-runtime', () => ({ createRuntimeDigestDeps: state.createDeps }));

import { POST } from './route';

const SECRET = 'a-long-random-cron-secret';

function request(headers: Record<string, string> = { 'x-cron-secret': SECRET }, url = 'https://make-money.example.jp/api/notifications/digest') {
  return new NextRequest(url, { method: 'POST', headers });
}

beforeEach(() => {
  state.env = {
    NOTIFY_CRON_SECRET: SECRET,
    RESEND_API_KEY: 're_test_key',
    NOTIFY_FROM_EMAIL: 'Make Money <notify@make-money.example.jp>',
    NEXT_PUBLIC_APP_URL: 'https://make-money.example.jp/',
  };
  state.run.mockReset().mockResolvedValue({ release: '20260929-09', sent: 3, skipped: 1, failed: 0 });
  state.createDeps.mockReset().mockReturnValue({ marker: 'deps' });
});

describe('POST /api/notifications/digest: who may run it', () => {
  it('answers 503 when the cron secret is not configured, and does nothing', async () => {
    state.env.NOTIFY_CRON_SECRET = undefined;
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(state.run).not.toHaveBeenCalled();
  });

  it('does not open up when the secret is unset and the caller sends an empty or arbitrary header', async () => {
    state.env.NOTIFY_CRON_SECRET = undefined;
    const attempts: Array<Record<string, string>> = [{ 'x-cron-secret': '' }, { 'x-cron-secret': 'anything' }, {}];
    for (const headers of attempts) {
      expect((await POST(request(headers))).status).toBe(503);
    }
    expect(state.run).not.toHaveBeenCalled();
  });

  it.each<[string, Record<string, string>]>([
    ['no header', {}],
    ['an empty header', { 'x-cron-secret': '' }],
    ['a blank header', { 'x-cron-secret': '   ' }],
    ['a wrong secret', { 'x-cron-secret': 'not-the-secret' }],
    ['the secret plus extra characters', { 'x-cron-secret': `${SECRET}x` }],
    ['a prefix of the secret', { 'x-cron-secret': SECRET.slice(0, -1) }],
    ['the secret in different case', { 'x-cron-secret': SECRET.toUpperCase() }],
    ['the secret in the wrong header', { authorization: `Bearer ${SECRET}` }],
    ['the secret in another header name', { 'x-foundation-ingest-token': SECRET }],
  ])('answers 401 for %s, before touching mail, storage or the digest', async (_label, headers) => {
    const response = await POST(request(headers));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(state.run).not.toHaveBeenCalled();
    expect(state.createDeps).not.toHaveBeenCalled();
  });

  it('does not accept the secret in the URL', async () => {
    const response = await POST(request({}, `https://make-money.example.jp/api/notifications/digest?x-cron-secret=${SECRET}`));
    expect(response.status).toBe(401);
    expect(state.run).not.toHaveBeenCalled();
  });

  it('accepts the exact secret, ignoring surrounding whitespace', async () => {
    expect((await POST(request({ 'x-cron-secret': `  ${SECRET}  ` }))).status).toBe(200);
    expect(state.run).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/notifications/digest: when mail is not set up', () => {
  it.each([['RESEND_API_KEY'], ['NOTIFY_FROM_EMAIL']])('returns { skipped } without reading or sending anything when %s is missing', async (missing) => {
    state.env[missing] = undefined;
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ skipped: 'email_not_configured' });
    expect(state.run).not.toHaveBeenCalled();
    expect(state.createDeps).not.toHaveBeenCalled();
  });

  it('checks the secret first, so an outsider cannot learn whether mail is configured', async () => {
    state.env.RESEND_API_KEY = undefined;
    const response = await POST(request({ 'x-cron-secret': 'wrong' }));
    expect(response.status).toBe(401);
    expect(await response.json()).not.toHaveProperty('skipped');
  });
});

describe('POST /api/notifications/digest: running it', () => {
  it('runs the digest with the site URL from the configuration and returns the counts', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ release: '20260929-09', sent: 3, skipped: 1, failed: 0 });
    expect(state.createDeps).toHaveBeenCalledWith('https://make-money.example.jp');
    expect(state.run).toHaveBeenCalledWith({ marker: 'deps' }, { appUrl: 'https://make-money.example.jp' });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('falls back to the address the request came in on when the site URL is not configured', async () => {
    state.env.NEXT_PUBLIC_APP_URL = undefined;
    await POST(request());
    expect(state.run).toHaveBeenCalledWith(expect.anything(), { appUrl: 'https://make-money.example.jp' });
  });

  it('ignores a configured site URL that is not http(s)', async () => {
    state.env.NEXT_PUBLIC_APP_URL = 'javascript:alert(1)';
    await POST(request());
    expect(state.run).toHaveBeenCalledWith(expect.anything(), { appUrl: 'https://make-money.example.jp' });
  });

  it('passes the "run again" flag through when a bound stopped the run', async () => {
    state.run.mockResolvedValue({ release: '20260929-09', sent: 200, skipped: 0, failed: 0, truncated: true });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ truncated: true });
  });

  it('reports "no edition yet" as a normal result', async () => {
    state.run.mockResolvedValue({ release: null, sent: 0, skipped: 0, failed: 0 });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ release: null, sent: 0, skipped: 0, failed: 0 });
  });

  it('answers 502 with the counts when some sends failed, so a scheduler notices and can safely run again', async () => {
    state.run.mockResolvedValue({ release: '20260929-09', sent: 2, skipped: 0, failed: 1 });
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ release: '20260929-09', sent: 2, skipped: 0, failed: 1 });
  });

  it('answers 502 without leaking details when the digest itself throws', async () => {
    state.run.mockRejectedValue(new Error('R2 credentials rejected: re_test_key'));
    const response = await POST(request());
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body).toEqual({ error: '配信を実行できませんでした' });
    expect(JSON.stringify(body)).not.toContain('re_test_key');
  });
});
