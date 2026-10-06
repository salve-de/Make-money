import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ db: null as DatabaseSync | null, user: null as string | null, allowed: true }));
vi.mock('@/lib/storage/d1', async () => (await import('@/lib/marketplace/testing/sqlite-d1')).sqliteD1Module(() => state.db!));
vi.mock('@/lib/marketplace/commerce/auth', () => ({ marketplaceUserId: async () => state.user }));
vi.mock('@/lib/security/rate-limit', () => ({ consumeRequestRateLimit: async () => state.allowed }));

import { openFullTestDatabase } from '@/lib/marketplace/testing/sqlite-d1';
import { distributionFixture } from '@/lib/marketplace/testing/distribution-fixture';
import { withDistributionClient } from '@/lib/marketplace/distribution/runtime';
import { GET as go } from '@/app/marketplace/go/[code]/route';
import { GET, POST } from './route';

const TERMS = {
  name: '請求書チェッカー', tagline: '請求書の抜けを一晩で洗い出す',
  description: '中小企業の経理担当が月末に請求書の抜け漏れを確認するための道具です。', audience: '経理担当者',
  category: 'business', platforms: ['web'], price: 2980, currency: 'JPY', rate: 2000, months: 12,
};

const get = (query: string) => GET(new NextRequest(`http://127.0.0.1/api/marketplace/distribution?${query}`));
const post = (body: unknown) => POST(new NextRequest('http://127.0.0.1/api/marketplace/distribution', {
  method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' },
}));

beforeEach(() => {
  state.db = openFullTestDatabase();
  state.user = null;
  state.allowed = true;
  for (const id of ['owner-A', 'partner-B']) state.db.prepare('INSERT INTO users(id,email) VALUES(?,?)').run(id, `${id}@example.com`);
  state.db.prepare(
    `INSERT INTO marketplace_listings(id,user_id,source_type,slug,title,summary,category,product_url,checkout_url,status)
     VALUES('l1','owner-A','external','svc-one','商品 svc-one','十分に長い説明文を入れておきます','business_tool','https://maker.example.com/','https://maker.example.com/checkout?plan=monthly','published')`,
  ).run();
});
afterEach(() => state.db?.close());

describe('/api/marketplace/distribution', () => {
  it('未接続では掲載のみを返し、応答は共有キャッシュに載せない', async () => {
    const response = await get('slug=svc-one');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ state: 'listing_only', mode: null, canLink: false, canRefer: false, referralUrl: null });
  });

  it('指定の過不足・未ログイン・不正な本文は日本語の理由とコードで断る', async () => {
    expect((await get('')).status).toBe(400);
    expect((await get('slug=svc-one&listingId=l1')).status).toBe(400);
    const anonymous = await get('listingId=l1');
    expect(anonymous.status).toBe(401);
    expect(await anonymous.json()).toEqual({ error: 'ログインが必要です', code: 'AUTH_REQUIRED' });
    expect((await post({ action: 'referral', slug: 'svc-one', kind: 'partner' })).status).toBe(401);
    state.user = 'partner-B';
    expect((await post('{')).status).toBe(400);
    expect((await post({ action: 'referral', slug: 'svc-one' })).status).toBe(400);
    expect((await post({ action: 'other' })).status).toBe(400);
    state.allowed = false;
    expect((await post({ action: 'referral', slug: 'svc-one', kind: 'partner' })).status).toBe(429);
  });

  it('偽接続の範囲では、作成→承認→紹介→転送まで通り、外部のIDを返さない', async () => {
    const relay = distributionFixture();
    await withDistributionClient(relay.client, async () => {
      state.user = 'owner-A';
      const linked = await post({ action: 'connect', listingId: 'l1', terms: TERMS });
      expect(await linked.json()).toMatchObject({ state: 'linked', mode: 'contract-test' });
      relay.approve();
      state.user = 'partner-B';
      const issued = await (await post({ action: 'referral', slug: 'svc-one', kind: 'partner' })).json();
      expect(issued.referralUrl).toMatch(/^\/marketplace\/go\/[a-f0-9]{32}$/);
      const body = JSON.stringify(issued);
      for (const secret of ['relay-owner-A', 'relay-partner-B', String(relay.catalog[0].id), String(relay.referrals[0].code)]) {
        expect(body).not.toContain(secret);
      }
      const redirect = await go(new Request('http://127.0.0.1/'), { params: Promise.resolve({ code: issued.referralUrl.split('/').pop() }) });
      expect(redirect.status).toBe(303);
      expect(redirect.headers.get('location')).toBe('https://maker.example.com/checkout?plan=monthly&sr_attribution=contract-test-only');
      expect(redirect.headers.get('referrer-policy')).toBe('no-referrer');
    });
  });

  it('知らないコードの転送は移動せずに断る', async () => {
    const response = await go(new Request('http://127.0.0.1/'), { params: Promise.resolve({ code: 'f'.repeat(32) }) });
    expect(response.status).toBe(404);
    expect(response.headers.get('location')).toBeNull();
    expect(await response.text()).toContain('紹介リンクを確認できませんでした');
  });
});
