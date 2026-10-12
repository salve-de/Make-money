import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

const req = (path: string) => new NextRequest(`https://example.test${path}`);

describe('メンテナンスモード', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('MAINTENANCE_MODE が未設定なら通常どおり通す', () => {
    const res = proxy(req('/welcome'));
    expect(res.status).toBe(200);
  });

  it('廃止した /discover は（クエリ付きも）一覧 / へ 308 で送る', () => {
    for (const path of ['/discover', '/discover/', '/discover?q=ai', '/discover/x']) {
      const res = proxy(req(path));
      expect(res.status, path).toBe(308);
      expect(res.headers.get('location'), path).toBe('https://example.test/');
    }
    expect(proxy(req('/discoverable')).status).toBe(200);
  });

  it('MAINTENANCE_MODE=1 で画面は 503 のメンテナンス表示、API は JSON の 503', async () => {
    vi.stubEnv('MAINTENANCE_MODE', '1');
    const page = proxy(req('/welcome'));
    expect(page.status).toBe(503);
    expect(page.headers.get('retry-after')).toBe('3600');
    const api = proxy(req('/api/catalog'));
    expect(api.status).toBe(503);
    expect(await api.json()).toEqual({ error: 'MAINTENANCE' });
  });

  it('robots・sitemap・メンテナンス画面・Stripe の通知口は止めない', () => {
    vi.stubEnv('MAINTENANCE_MODE', '1');
    for (const path of ['/robots.txt', '/sitemap.xml', '/maintenance', '/_next/static/a.js', '/api/webhooks/stripe']) {
      expect(proxy(req(path)).status, path).toBe(200);
    }
  });
});
