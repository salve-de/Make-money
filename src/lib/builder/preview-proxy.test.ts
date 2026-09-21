import { afterEach, describe, expect, it, vi } from 'vitest';
import { proxyV0PreviewRequest } from './preview-proxy';

afterEach(() => vi.unstubAllGlobals());

describe('builder preview proxy', () => {
  it('strips Make-Money credentials and injects only the v0 preview token', async () => {
    let forwarded: RequestInit | undefined;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://preview.example/assets/app.js?x=1');
      forwarded = init;
      return new Response('ok', {
        status: 200,
        headers: {
          'content-type': 'text/plain',
          'set-cookie': 'preview=should-not-leak',
          'x-vercel-cache': 'HIT',
        },
      });
    }));

    const response = await proxyV0PreviewRequest(
      new Request('https://make-money.example/api/build/preview/build_1/assets/app.js?x=1', {
        headers: {
          authorization: 'Bearer firebase-secret',
          cookie: 'session=secret',
          'x-forwarded-for': '127.0.0.1',
          accept: '*/*',
        },
      }),
      {
        url: 'https://preview.example/',
        token: 'v0-preview-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
      ['assets', 'app.js'],
    );

    const headers = new Headers(forwarded?.headers);
    expect(headers.get('authorization')).toBeNull();
    expect(headers.get('cookie')).toBeNull();
    expect(headers.get('x-forwarded-for')).toBeNull();
    expect(headers.get('x-v0-preview-token')).toBe('v0-preview-token');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('x-vercel-cache')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
