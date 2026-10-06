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
vi.mock('@/lib/security/rate-limit', () => ({ consumeRequestRateLimit: async () => true }));
vi.mock('@/lib/builder/session', () => ({ getOwnedBuildSession: async () => null }));
vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: async () => undefined }));

import { GET as listReviews } from './route';
import { POST as approve } from './approve/route';
import { POST as reject } from './reject/route';
import { GET as getOwnedListing, PUT as putListing } from '../listings/route';
import { PATCH as patchBusiness } from '../businesses/[idOrSlug]/route';
import { POST as postInquiry } from '../businesses/[idOrSlug]/inquiries/route';
import { GET as getMine } from '../businesses/mine/route';
import { GET as getPublicBusiness } from '../businesses/[idOrSlug]/route';
import { GET as getPublicBusinessList } from '../businesses/route';
import { getPublishedMarketplaceListing, listPublishedMarketplaceListings } from '@/lib/marketplace/listing-store';
import { inquiryRows, jsonRequest, seedBusinessSale } from '@/lib/marketplace/testing/fixtures';
import { openBusinessSaleTestDatabase } from '@/lib/marketplace/testing/sqlite-d1';

const BASE = 'http://localhost/api/marketplace';
const ctx = (idOrSlug: string) => ({ params: Promise.resolve({ idOrSlug }) });

const listingBody = (overrides: Record<string, unknown> = {}) => ({
  sourceType: 'external',
  title: 'My Service',
  summary: 'A useful product for independent creators.',
  category: 'business_tool',
  productUrl: 'https://maker.example/',
  checkoutUrl: '',
  priceLabel: '',
  sellerName: 'Maker',
  status: 'pending_review',
  ...overrides,
});

async function saveListing(body: Record<string, unknown>, token = 'seller-token') {
  const response = await putListing(jsonRequest(`${BASE}/listings`, { method: 'PUT', body, token }) as never);
  return { response, json: await response.json() as { listing?: { listingId: string; slug: string; status: string; reviewNote: string | null }; error?: string } };
}

const reviewList = (token: string | null, query = '') => listReviews(jsonRequest(`${BASE}/reviews${query}`, { token }) as never);
const decide = (kind: 'approve' | 'reject', body: unknown, token: string | null = 'admin-token') =>
  (kind === 'approve' ? approve : reject)(jsonRequest(`${BASE}/reviews/${kind}`, { body, token }) as never);

function revisionOf(table: string, id: string): number {
  return Number((state.db!.prepare(`SELECT revision FROM ${table} WHERE id=?`).get(id) as { revision: number }).revision);
}

beforeEach(() => {
  state.db = openBusinessSaleTestDatabase();
  state.tokens = {
    'seller-token': { uid: 'seller-1' },
    'other-token': { uid: 'seller-2' },
    'buyer-token': { uid: 'buyer-1' },
    'admin-token': { uid: 'admin-1' },
  };
  const insert = state.db.prepare('INSERT INTO users(id,email,role) VALUES(?,?,?)');
  insert.run('seller-1', 'seller@example.com', 'member');
  insert.run('seller-2', 'other@example.com', 'member');
  insert.run('buyer-1', 'buyer@example.com', 'member');
  insert.run('admin-1', 'admin@example.com', 'admin');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  state.db?.close();
  vi.restoreAllMocks();
});

describe('review API access', () => {
  it('lets only an operator (users.role = admin) list, approve or reject', async () => {
    const saved = await saveListing(listingBody());
    const id = saved.json.listing!.listingId;
    const revision = revisionOf('marketplace_listings', id);

    expect((await reviewList(null)).status).toBe(401);
    expect((await reviewList('unknown')).status).toBe(401);
    for (const token of ['seller-token', 'other-token', 'buyer-token']) {
      expect((await reviewList(token)).status, token).toBe(403);
      expect((await decide('approve', { kind: 'listing', id, revision }, token)).status, token).toBe(403);
      expect((await decide('reject', { kind: 'listing', id, revision, reason: '乗っ取り' }, token)).status, token).toBe(403);
    }
    expect((await decide('approve', { kind: 'listing', id, revision }, null)).status).toBe(401);
    expect(state.db!.prepare('SELECT status FROM marketplace_listings WHERE id=?').get(id)).toMatchObject({ status: 'pending_review' });
    expect(await listPublishedMarketplaceListings()).toMatchObject({ listings: [] });
  });

  it('does not accept a cross-origin review request', async () => {
    const request = new Request(`${BASE}/reviews`, { headers: { Authorization: 'Bearer admin-token', Origin: 'https://evil.example' } });
    const { NextRequest } = await import('next/server');
    expect((await listReviews(new NextRequest(request))).status).toBe(403);
  });

  it('never caches review responses', async () => {
    const response = await reviewList('admin-token');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});

describe('Builder / external listings', () => {
  it('stays hidden after the owner requests publication, and appears only after approval', async () => {
    const { response, json } = await saveListing(listingBody());
    expect(response.status).toBe(200);
    expect(json.listing).toMatchObject({ status: 'pending_review', reviewNote: null });
    const { listingId: id, slug } = json.listing!;

    expect(await getPublishedMarketplaceListing(slug)).toBeNull();
    expect((await listPublishedMarketplaceListings()).listings).toEqual([]);

    const pending = await (await reviewList('admin-token')).json() as { reviews: { kind: string; id: string; revision: number; productUrl: string }[] };
    expect(pending.reviews).toHaveLength(1);
    expect(pending.reviews[0]).toMatchObject({ kind: 'listing', id, productUrl: 'https://maker.example/' });
    expect(JSON.stringify(pending)).not.toContain('seller-1');

    const approved = await decide('approve', { kind: 'listing', id, revision: pending.reviews[0].revision });
    expect(approved.status).toBe(200);
    expect(await getPublishedMarketplaceListing(slug)).toMatchObject({ slug, title: 'My Service', productUrl: 'https://maker.example/' });
    expect((await listPublishedMarketplaceListings()).listings.map((item) => item.slug)).toEqual([slug]);
    expect(await (await reviewList('admin-token')).json()).toMatchObject({ reviews: [] });
    expect(state.db!.prepare('SELECT reviewed_by FROM marketplace_listings WHERE id=?').get(id)).toMatchObject({ reviewed_by: 'admin-1' });
  });

  it('cannot be published by the owner directly', async () => {
    const { response } = await saveListing(listingBody({ status: 'published' }));
    expect(response.status).toBe(400);
    expect(state.db!.prepare('SELECT COUNT(*) AS n FROM marketplace_listings').get()).toMatchObject({ n: 0 });
  });

  it('goes back to review when the owner edits a published listing, and is hidden meanwhile', async () => {
    const { json } = await saveListing(listingBody());
    const { listingId: id, slug } = json.listing!;
    await decide('approve', { kind: 'listing', id, revision: revisionOf('marketplace_listings', id) });
    expect(await getPublishedMarketplaceListing(slug)).not.toBeNull();

    // 内容が同じなら公開のまま
    expect((await saveListing(listingBody({ listingId: id }))).json.listing).toMatchObject({ status: 'published' });
    expect(await getPublishedMarketplaceListing(slug)).not.toBeNull();

    // 決済 URL を差し替えたら、承認前の内容は出さない
    const edited = await saveListing(listingBody({ listingId: id, checkoutUrl: 'https://pay.example/swap' }));
    expect(edited.json.listing).toMatchObject({ status: 'pending_review' });
    expect(await getPublishedMarketplaceListing(slug)).toBeNull();
    expect((await listPublishedMarketplaceListings()).listings).toEqual([]);
  });

  it('shows the rejection reason only to its owner, never publicly or to others', async () => {
    const { json } = await saveListing(listingBody());
    const { listingId: id, slug } = json.listing!;
    const rejected = await decide('reject', { kind: 'listing', id, revision: revisionOf('marketplace_listings', id), reason: '説明が実態と合っていません' });
    expect(rejected.status).toBe(200);

    expect(await getPublishedMarketplaceListing(slug)).toBeNull();
    const own = await getOwnedListing(jsonRequest(`${BASE}/listings?listingId=${id}`, { token: 'seller-token' }) as never);
    expect(await own.json()).toMatchObject({ listing: { status: 'rejected', reviewNote: '説明が実態と合っていません' } });
    const stranger = await getOwnedListing(jsonRequest(`${BASE}/listings?listingId=${id}`, { token: 'other-token' }) as never);
    expect(stranger.status).toBe(404);
    expect(JSON.stringify(await stranger.json())).not.toContain('説明が実態');
    expect(JSON.stringify(await listPublishedMarketplaceListings())).not.toContain('説明が実態');

    // 直して出し直すと、理由は消えて審査待ちに戻る
    const again = await saveListing(listingBody({ listingId: id, summary: 'Fixed description of the product for makers.' }));
    expect(again.json.listing).toMatchObject({ status: 'pending_review', reviewNote: null });
  });

  it('re-checks the URL on approval and refuses to publish an unsafe one', async () => {
    const { json } = await saveListing(listingBody());
    const id = json.listing!.listingId;
    // 保存時の検査をすり抜けた行（過去のデータなど）を想定して、DB に直接入れる
    for (const bad of ['http://maker.example/', 'https://user:pass@maker.example/', 'https://127.0.0.1/', 'https://localhost/', 'https://192.168.0.5/']) {
      state.db!.prepare('UPDATE marketplace_listings SET product_url=? WHERE id=?').run(bad, id);
      const response = await decide('approve', { kind: 'listing', id, revision: revisionOf('marketplace_listings', id) });
      expect(response.status, bad).toBe(422);
      expect(await response.json()).toMatchObject({ field: 'productUrl' });
    }
    state.db!.prepare("UPDATE marketplace_listings SET product_url='https://maker.example/',checkout_url='http://pay.example/' WHERE id=?").run(id);
    const response = await decide('approve', { kind: 'listing', id, revision: revisionOf('marketplace_listings', id) });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ field: 'checkoutUrl' });
    expect(state.db!.prepare('SELECT status FROM marketplace_listings WHERE id=?').get(id)).toMatchObject({ status: 'pending_review' });
  });

  it('refuses to approve a version the reviewer did not read', async () => {
    const { json } = await saveListing(listingBody());
    const id = json.listing!.listingId;
    const seen = revisionOf('marketplace_listings', id);
    // 審査者が一覧を読んだ後で、掲載者が決済 URL を差し替える
    await saveListing(listingBody({ listingId: id, checkoutUrl: 'https://pay.example/swap' }));
    expect((await decide('approve', { kind: 'listing', id, revision: seen })).status).toBe(409);
    expect((await decide('reject', { kind: 'listing', id, revision: seen, reason: '古い版' })).status).toBe(409);
    expect(state.db!.prepare('SELECT status FROM marketplace_listings WHERE id=?').get(id)).toMatchObject({ status: 'pending_review' });
    expect((await decide('approve', { kind: 'listing', id, revision: revisionOf('marketplace_listings', id) })).status).toBe(200);
  });

  it('refuses a second decision and unknown ids', async () => {
    const { json } = await saveListing(listingBody());
    const id = json.listing!.listingId;
    const revision = revisionOf('marketplace_listings', id);
    expect((await decide('approve', { kind: 'listing', id, revision })).status).toBe(200);
    expect((await decide('approve', { kind: 'listing', id, revision })).status).toBe(409);
    expect((await decide('reject', { kind: 'listing', id, revision, reason: '遅れた却下' })).status).toBe(409);
    expect((await decide('approve', { kind: 'listing', id: crypto.randomUUID(), revision: 0 })).status).toBe(404);
  });

  it('validates the review request body', async () => {
    const { json } = await saveListing(listingBody());
    const id = json.listing!.listingId;
    const revision = revisionOf('marketplace_listings', id);
    for (const body of [
      {}, { kind: 'other', id, revision }, { kind: 'listing', revision }, { kind: 'listing', id, revision: -1 },
      { kind: 'listing', id, revision: 1.5 }, { kind: 'listing', id, revision: '0' }, { kind: 'listing', id, revision, status: 'published' },
    ]) {
      expect((await decide('approve', body)).status, JSON.stringify(body)).toBe(400);
    }
    for (const reason of ['', '   ', 'x'.repeat(201), 'a\nb', undefined]) {
      expect((await decide('reject', { kind: 'listing', id, revision, reason })).status, String(reason)).toBe(400);
    }
    expect(state.db!.prepare('SELECT status FROM marketplace_listings WHERE id=?').get(id)).toMatchObject({ status: 'pending_review' });
  });
});

describe('Business sale listings', () => {
  const patch = (id: string, body: unknown, token = 'seller-token') =>
    patchBusiness(jsonRequest(`${BASE}/businesses/${id}`, { method: 'PATCH', body, token }) as never, ctx(id));
  const publicBySlug = (slug: string) => getPublicBusiness(jsonRequest(`${BASE}/businesses/${slug}`) as never, ctx(slug));
  const inquire = (id: string) => postInquiry(
    jsonRequest(`${BASE}/businesses/${id}/inquiries`, { body: { message: '売上の推移を教えていただけますか。', contactEmail: 'buyer@example.com' }, token: 'buyer-token' }) as never,
    ctx(id),
  );
  const slugOf = (id: string) => String((state.db!.prepare('SELECT slug FROM business_sale_listings WHERE id=?').get(id) as { slug: string }).slug);

  it('stays hidden and closed to inquiries until approved, then appears', async () => {
    const id = seedBusinessSale(state.db!, { status: 'draft', userId: 'seller-1' });
    const slug = slugOf(id);
    expect((await patch(id, { status: 'pending_review' })).status).toBe(200);

    expect((await publicBySlug(slug)).status).toBe(404);
    expect(await (await getPublicBusinessList(jsonRequest(`${BASE}/businesses`) as never)).json()).toMatchObject({ listings: [] });
    expect((await inquire(id)).status).toBe(404);
    expect(inquiryRows(state.db!)).toEqual([]);

    const pending = await (await reviewList('admin-token', '?kind=business')).json() as { reviews: { kind: string; id: string; revision: number }[] };
    expect(pending.reviews).toMatchObject([{ kind: 'business', id }]);
    expect((await decide('approve', { kind: 'business', id, revision: pending.reviews[0].revision })).status).toBe(200);

    expect((await publicBySlug(slug)).status).toBe(200);
    expect(await (await getPublicBusinessList(jsonRequest(`${BASE}/businesses`) as never)).json()).toMatchObject({ listings: [{ id }] });
    expect((await inquire(id)).status).toBe(201);
  });

  it('goes back to review on edit and closes the inquiry door and public page again', async () => {
    const id = seedBusinessSale(state.db!, { status: 'published', userId: 'seller-1' });
    const slug = slugOf(id);
    expect((await publicBySlug(slug)).status).toBe(200);
    expect(await (await patch(id, { askingPriceJpy: 1_000_000 })).json()).toMatchObject({ listing: { status: 'pending_review' } });
    expect((await publicBySlug(slug)).status).toBe(404);
    expect((await inquire(id)).status).toBe(404);
  });

  it('shows the rejection reason only in the owner\'s own list', async () => {
    const id = seedBusinessSale(state.db!, { status: 'pending_review', userId: 'seller-1' });
    const slug = slugOf(id);
    const revision = revisionOf('business_sale_listings', id);
    expect((await decide('reject', { kind: 'business', id, revision, reason: '根拠の説明が足りません' })).status).toBe(200);

    expect((await publicBySlug(slug)).status).toBe(404);
    const mine = await getMine(jsonRequest(`${BASE}/businesses/mine`, { token: 'seller-token' }) as never);
    expect(await mine.json()).toMatchObject({ listings: [{ id, status: 'rejected', reviewNote: '根拠の説明が足りません' }] });
    const others = await getMine(jsonRequest(`${BASE}/businesses/mine`, { token: 'other-token' }) as never);
    expect(JSON.stringify(await others.json())).not.toContain('根拠の説明');
    expect(JSON.stringify(await (await getPublicBusinessList(jsonRequest(`${BASE}/businesses`) as never)).json())).not.toContain('根拠の説明');
    // 他人は本人の掲載を直せず、再申請もできない
    expect((await patch(id, { status: 'pending_review' }, 'other-token')).status).toBe(404);
    // 本人が直して出し直すと理由は消える
    expect(await (await patch(id, { status: 'pending_review' })).json()).toMatchObject({ listing: { status: 'pending_review', reviewNote: null } });
  });

  it('does not approve a version the reviewer did not read', async () => {
    const id = seedBusinessSale(state.db!, { status: 'pending_review', userId: 'seller-1' });
    const seen = revisionOf('business_sale_listings', id);
    await patch(id, { askingPriceJpy: 9_999_999 });
    expect((await decide('approve', { kind: 'business', id, revision: seen })).status).toBe(409);
    expect(state.db!.prepare('SELECT status FROM business_sale_listings WHERE id=?').get(id)).toMatchObject({ status: 'pending_review' });
  });

  it('lists both kinds, oldest request first', async () => {
    seedBusinessSale(state.db!, { status: 'pending_review', userId: 'seller-1', updatedAt: '2026-09-02 00:00:00', slug: 'older' });
    seedBusinessSale(state.db!, { status: 'draft', userId: 'seller-1' });
    seedBusinessSale(state.db!, { status: 'rejected', userId: 'seller-1' });
    await saveListing(listingBody());
    const all = await (await reviewList('admin-token')).json() as { reviews: { kind: string; slug: string }[] };
    expect(all.reviews.map((item) => item.kind)).toEqual(['business', 'listing']);
    expect((await reviewList('admin-token', '?kind=nope')).status).toBe(400);
  });
});
