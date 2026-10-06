import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  env: {} as Record<string, string | undefined>,
  query: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: async (name: string) => state.env[name] }));
vi.mock('@/lib/storage/d1', () => ({ queryD1: state.query, executeD1: state.execute }));

import { buildNewsletterConfirmUrl, CONFIRM_LINK_TTL_SECONDS } from '@/lib/notifications/confirm-link';
import { GET, POST } from './route';

const APP = 'https://make-money.example.jp';
const link = async (id = 'sub-1', nowMs = Date.now()) => (await buildNewsletterConfirmUrl(APP, id, nowMs))!;
const get = (url: string) => new NextRequest(url, { method: 'GET' });
const post = (url: string) => new NextRequest(url, { method: 'POST' });

beforeEach(() => {
  state.env = { NOTIFY_CRON_SECRET: 'cron-secret-value' };
  state.execute.mockReset().mockResolvedValue({ changes: 1, lastRowId: null });
  state.query.mockReset().mockResolvedValue([{ confirmedAt: '2026-10-06 00:00:00' }]);
});

describe('/api/newsletter/confirm', () => {
  it('GET shows a button and does not confirm anyone (mail scanners fetch links)', async () => {
    const response = await GET(get(await link()));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('登録を完了しますか？');
    expect(html).toContain('<form method="post"');
    expect(state.execute).not.toHaveBeenCalled();
  });

  it('POST confirms a pending row and the page does not contain any address', async () => {
    const response = await POST(post(await link()));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('登録が完了しました');
    expect(state.execute).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('confirmed_at IS NULL'),
      ['sub-1'],
    );
  });

  it('POST on an already confirmed row is still a success (idempotent)', async () => {
    state.execute.mockResolvedValue({ changes: 0, lastRowId: null });
    expect((await POST(post(await link()))).status).toBe(200);
  });

  it('POST for a row that was cancelled creates nothing and says so', async () => {
    state.query.mockResolvedValue([]);
    const response = await POST(post(await link()));
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('登録が見つかりません');
  });

  it('rejects an expired link on both GET and POST without touching the database', async () => {
    const old = await link('sub-1', Date.now() - (CONFIRM_LINK_TTL_SECONDS + 60) * 1000);
    const getResponse = await GET(get(old));
    expect(getResponse.status).toBe(410);
    expect(await getResponse.text()).toContain('有効期限が切れています');
    expect((await POST(post(old))).status).toBe(410);
    expect(state.execute).not.toHaveBeenCalled();
  });

  it('rejects a tampered link on both GET and POST', async () => {
    const url = new URL(await link());
    url.searchParams.set('u', 'sub-2');
    expect((await GET(get(url.toString()))).status).toBe(400);
    expect((await POST(post(url.toString()))).status).toBe(400);
    expect((await POST(post(`${APP}/api/newsletter/confirm`))).status).toBe(400);
    expect(state.execute).not.toHaveBeenCalled();
  });

  it('returns 503 without a fake success when storage fails', async () => {
    state.execute.mockRejectedValue(new Error('down'));
    const response = await POST(post(await link()));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('登録が完了しました');
  });
});
