import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';

const state = vi.hoisted(() => ({
  db: null as DatabaseSync | null,
  beforeQuery: null as ((sql: string) => void) | null,
}));

// 実際の migration を流した SQLite を D1 の代わりにする。UPDATE の直前に割り込めるようにしてある。
vi.mock('@/lib/storage/d1', async () => {
  const real = (await import('./testing/sqlite-d1')).sqliteD1Module(() => state.db!);
  return {
    ...real,
    queryD1: async (sql: string, params?: unknown[], parseRow?: (value: unknown) => unknown) => {
      state.beforeQuery?.(sql);
      return real.queryD1(sql, params, parseRow);
    },
  };
});

import {
  createBusinessSaleDraft,
  getOwnedBusinessSale,
  getPublishedBusinessSaleBySlug,
  getPublishedBusinessSaleForInquiry,
  insertBusinessSaleInquiry,
  listOwnedBusinessSalesWithInquiries,
  listPublishedBusinessSales,
  updateBusinessSale,
} from './business-store';
import { listingFields as fields, listingRow as rowOf, seedBusinessSale, type SeedOptions } from './testing/fixtures';
import { openBusinessSaleTestDatabase } from './testing/sqlite-d1';

const seed = (options: SeedOptions = {}) => seedBusinessSale(state.db!, options);

beforeEach(() => {
  state.db = openBusinessSaleTestDatabase();
  state.beforeQuery = null;
});
afterEach(() => {
  state.db?.close();
});

describe('createBusinessSaleDraft', () => {
  it('creates a draft that is self reported and unverified', async () => {
    const listing = await createBusinessSaleDraft('seller-1', fields);
    expect(listing).toMatchObject({ ...fields, status: 'draft', revenueBasis: 'self_reported' });
    expect(listing.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(listing.slug).toMatch(/^camera-shop-[0-9a-f]{10}$/);
    expect(listing.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    const stored = rowOf(state.db!, listing.id)!;
    expect(stored).toMatchObject({ user_id: 'seller-1', status: 'draft', revenue_basis: 'self_reported', verification_id: null });
  });

  it('gives every listing its own slug, including a fallback for non-latin titles', async () => {
    const [first, second, japanese] = [
      await createBusinessSaleDraft('seller-1', fields),
      await createBusinessSaleDraft('seller-1', fields),
      await createBusinessSaleDraft('seller-1', { ...fields, title: '中古カメラ専門店' }),
    ];
    expect(first.slug).not.toBe(second.slug);
    expect(japanese.slug).toMatch(/^business-[0-9a-f]{10}$/);
  });

  it('keeps slugs to lowercase ASCII words even for messy titles', async () => {
    const listing = await createBusinessSaleDraft('seller-1', { ...fields, title: '  --ＥＣ  Shop!!  -- ' });
    expect(listing.slug).toMatch(/^ec-shop-[0-9a-f]{10}$/);
  });
});

describe('public reads', () => {
  it('returns only published listings by slug and never exposes the seller', async () => {
    const draft = seed({ slug: 'draft-slug', status: 'draft' });
    const closed = seed({ slug: 'closed-slug', status: 'closed' });
    const published = seed({ slug: 'published-slug', status: 'published', userId: 'seller-secret-uid' });
    expect(draft && closed).toBeTruthy();

    expect(await getPublishedBusinessSaleBySlug('draft-slug')).toBeNull();
    expect(await getPublishedBusinessSaleBySlug('closed-slug')).toBeNull();
    expect(await getPublishedBusinessSaleBySlug('missing')).toBeNull();
    const listing = await getPublishedBusinessSaleBySlug('published-slug');
    expect(listing).toMatchObject({ id: published, slug: 'published-slug', revenueBasis: 'self_reported', reasonForSale: fields.reasonForSale });
    expect(Object.keys(listing!)).not.toContain('userId');
    expect(Object.keys(listing!)).not.toContain('status');
    expect(JSON.stringify(listing)).not.toContain('seller-secret-uid');
  });

  it('lists published listings newest first and filters by category and price', async () => {
    seed({ slug: 'old', updatedAt: '2026-09-01 00:00:00', category: 'saas', askingPriceJpy: 1_000_000 });
    seed({ slug: 'new', updatedAt: '2026-09-20 00:00:00', category: 'ecommerce', askingPriceJpy: 9_000_000 });
    seed({ slug: 'mid', updatedAt: '2026-09-10 00:00:00', category: 'saas', askingPriceJpy: 3_000_000 });
    seed({ slug: 'hidden-draft', status: 'draft' });
    seed({ slug: 'hidden-closed', status: 'closed' });

    expect((await listPublishedBusinessSales()).map((item) => item.slug)).toEqual(['new', 'mid', 'old']);
    expect((await listPublishedBusinessSales({ category: 'saas' })).map((item) => item.slug)).toEqual(['mid', 'old']);
    expect((await listPublishedBusinessSales({ maxPrice: 3_000_000 })).map((item) => item.slug)).toEqual(['mid', 'old']);
    expect((await listPublishedBusinessSales({ category: 'saas', maxPrice: 1_000_000 })).map((item) => item.slug)).toEqual(['old']);
    expect(await listPublishedBusinessSales({ maxPrice: 0 })).toEqual([]);
  });

  it('caps the list at 100 rows and never returns owner or buyer data', async () => {
    for (let index = 0; index < 105; index += 1) seed({ userId: 'seller-secret-uid' });
    const list = await listPublishedBusinessSales();
    expect(list).toHaveLength(100);
    expect(JSON.stringify(list)).not.toContain('seller-secret-uid');
    for (const row of list) {
      expect(Object.keys(row).sort()).toEqual([
        'askingPriceJpy', 'category', 'establishedYear', 'id', 'monthlyProfitJpy', 'monthlyRevenueJpy',
        'revenueBasis', 'sellerName', 'slug', 'summary', 'title', 'updatedAt',
      ]);
    }
    await expect(listPublishedBusinessSales({}, 101)).rejects.toThrow();
    await expect(listPublishedBusinessSales({}, 0)).rejects.toThrow();
  });

  it('fails closed when a stored row is malformed', async () => {
    seed({ slug: 'ok' });
    state.db!.exec('PRAGMA ignore_check_constraints=ON');
    seed({ slug: 'bad', category: 'not-a-category' });
    await expect(listPublishedBusinessSales()).rejects.toThrow('category');
  });
});

describe('getPublishedBusinessSaleForInquiry', () => {
  it('returns the seller only for a published listing', async () => {
    const published = seed({ userId: 'seller-1' });
    const draft = seed({ status: 'draft' });
    const closed = seed({ status: 'closed' });
    expect(await getPublishedBusinessSaleForInquiry(published)).toMatchObject({ id: published, sellerUserId: 'seller-1' });
    expect(await getPublishedBusinessSaleForInquiry(draft)).toBeNull();
    expect(await getPublishedBusinessSaleForInquiry(closed)).toBeNull();
    expect(await getPublishedBusinessSaleForInquiry('nope')).toBeNull();
  });
});

describe('updateBusinessSale', () => {
  it('updates the owner listing and bumps updated_at', async () => {
    const id = seed({ status: 'draft', updatedAt: '2026-01-01 00:00:00' });
    const outcome = await updateBusinessSale('seller-1', id, { askingPriceJpy: 5_000_000, title: '新しい事業名' });
    expect(outcome.kind).toBe('ok');
    const stored = rowOf(state.db!, id)!;
    expect(stored).toMatchObject({ asking_price_jpy: 5_000_000, title: '新しい事業名', status: 'draft' });
    expect(String(stored.updated_at) > '2026-01-01 00:00:00').toBe(true);
  });

  it('treats another user\'s listing as missing and leaves it untouched', async () => {
    const id = seed({ userId: 'seller-1', status: 'draft' });
    const before = rowOf(state.db!, id);
    expect(await updateBusinessSale('intruder', id, { title: '乗っ取り', status: 'published' })).toEqual({ kind: 'not_found' });
    expect(await updateBusinessSale('seller-1', crypto.randomUUID(), { title: 'x'.repeat(5) })).toEqual({ kind: 'not_found' });
    expect(rowOf(state.db!, id)).toEqual(before);
  });

  it('publishes a complete draft and then closes it, and nothing can go back', async () => {
    const id = seed({ status: 'draft' });
    expect(await updateBusinessSale('seller-1', id, { status: 'published' })).toMatchObject({ kind: 'ok', listing: { status: 'published' } });
    expect((await listPublishedBusinessSales()).map((item) => item.id)).toContain(id);
    expect(await updateBusinessSale('seller-1', id, { status: 'draft' })).toMatchObject({ kind: 'conflict' });
    expect(await updateBusinessSale('seller-1', id, { status: 'closed' })).toMatchObject({ kind: 'ok', listing: { status: 'closed' } });
    expect((await listPublishedBusinessSales()).map((item) => item.id)).not.toContain(id);
    expect(await updateBusinessSale('seller-1', id, { title: '終了後の変更' })).toMatchObject({ kind: 'conflict' });
    expect(await updateBusinessSale('seller-1', id, { status: 'published' })).toMatchObject({ kind: 'conflict' });
    expect(rowOf(state.db!, id)).toMatchObject({ status: 'closed', title: expect.not.stringContaining('終了後') });
  });

  it('refuses to publish an incomplete draft', async () => {
    const id = seed({ status: 'draft' });
    state.db!.prepare("UPDATE business_sale_listings SET reason_for_sale='' WHERE id=?").run(id);
    expect(await updateBusinessSale('seller-1', id, { status: 'published' })).toMatchObject({ kind: 'invalid', field: 'reasonForSale' });
    expect(rowOf(state.db!, id)).toMatchObject({ status: 'draft' });
  });

  it('drops the verified label and record when the revenue is edited, but not for other edits', async () => {
    const id = seed({ status: 'published', revenueBasis: 'stripe_verified', verificationId: 'ver-1' });
    await updateBusinessSale('seller-1', id, { monthlyProfitJpy: 250_000, askingPriceJpy: 4_000_000 });
    expect(rowOf(state.db!, id)).toMatchObject({ revenue_basis: 'stripe_verified', verification_id: 'ver-1' });
    await updateBusinessSale('seller-1', id, { monthlyRevenueJpy: 1_200_000 });
    expect(rowOf(state.db!, id)).toMatchObject({ revenue_basis: 'stripe_verified', verification_id: 'ver-1' });
    const outcome = await updateBusinessSale('seller-1', id, { monthlyRevenueJpy: 2_000_000 });
    expect(outcome).toMatchObject({ kind: 'ok', listing: { revenueBasis: 'self_reported', monthlyRevenueJpy: 2_000_000 } });
    expect(rowOf(state.db!, id)).toMatchObject({ revenue_basis: 'self_reported', verification_id: null });
  });

  it('does not let a concurrent state change be overwritten', async () => {
    const id = seed({ status: 'draft' });
    state.beforeQuery = (sql) => {
      if (sql.startsWith('UPDATE business_sale_listings')) {
        state.beforeQuery = null;
        state.db!.prepare("UPDATE business_sale_listings SET status='published' WHERE id=?").run(id);
      }
    };
    const outcome = await updateBusinessSale('seller-1', id, { title: '同時編集', status: 'published' });
    expect(outcome).toMatchObject({ kind: 'conflict' });
    expect(rowOf(state.db!, id)).toMatchObject({ status: 'published', title: expect.not.stringContaining('同時編集') });
  });

  it('never writes the revenue basis or verification record from input', async () => {
    const id = seed({ status: 'draft' });
    await updateBusinessSale('seller-1', id, { title: '別の事業名' });
    expect(rowOf(state.db!, id)).toMatchObject({ revenue_basis: 'self_reported', verification_id: null });
    expect(await getOwnedBusinessSale('seller-1', id)).toMatchObject({ title: '別の事業名' });
    expect(await getOwnedBusinessSale('intruder', id)).toBeNull();
  });
});

describe('insertBusinessSaleInquiry', () => {
  const message = '売上の推移を教えていただけますか。';
  const base = { buyerUserId: 'buyer-1', message, contactEmail: 'buyer@example.com' };

  it('stores an inquiry for a published listing', async () => {
    const listingId = seed();
    const result = await insertBusinessSaleInquiry({ ...base, listingId });
    expect(result).toMatchObject({ status: 'inserted' });
    expect(state.db!.prepare('SELECT * FROM business_sale_inquiries').all()).toEqual([
      expect.objectContaining({ listing_id: listingId, buyer_user_id: 'buyer-1', message, contact_email: 'buyer@example.com' }),
    ]);
  });

  it('allows one inquiry per buyer and listing per day, then again after a day', async () => {
    const listingId = seed();
    expect(await insertBusinessSaleInquiry({ ...base, listingId })).toMatchObject({ status: 'inserted' });
    expect(await insertBusinessSaleInquiry({ ...base, listingId })).toEqual({ status: 'duplicate' });
    expect(state.db!.prepare('SELECT count(*) AS n FROM business_sale_inquiries').get()).toEqual({ n: 1 });

    state.db!.prepare("UPDATE business_sale_inquiries SET created_at=datetime('now','-25 hours')").run();
    expect(await insertBusinessSaleInquiry({ ...base, listingId })).toMatchObject({ status: 'inserted' });
    state.db!.prepare("UPDATE business_sale_inquiries SET created_at=datetime('now','-23 hours')").run();
    expect(await insertBusinessSaleInquiry({ ...base, listingId })).toEqual({ status: 'duplicate' });
  });

  it('counts the daily limit per buyer and per listing', async () => {
    const first = seed();
    const second = seed();
    expect(await insertBusinessSaleInquiry({ ...base, listingId: first })).toMatchObject({ status: 'inserted' });
    expect(await insertBusinessSaleInquiry({ ...base, listingId: second })).toMatchObject({ status: 'inserted' });
    expect(await insertBusinessSaleInquiry({ ...base, buyerUserId: 'buyer-2', listingId: first })).toMatchObject({ status: 'inserted' });
  });

  it('cannot exceed one a day even when two requests race', async () => {
    const listingId = seed();
    const results = await Promise.all([
      insertBusinessSaleInquiry({ ...base, listingId }),
      insertBusinessSaleInquiry({ ...base, listingId }),
      insertBusinessSaleInquiry({ ...base, listingId }),
    ]);
    expect(results.filter((result) => result.status === 'inserted')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'duplicate')).toHaveLength(2);
    expect(state.db!.prepare('SELECT count(*) AS n FROM business_sale_inquiries').get()).toEqual({ n: 1 });
  });

  it('refuses drafts, closed listings and unknown ids without storing anything', async () => {
    for (const listingId of [seed({ status: 'draft' }), seed({ status: 'closed' }), crypto.randomUUID()]) {
      expect(await insertBusinessSaleInquiry({ ...base, listingId })).toEqual({ status: 'closed' });
    }
    expect(state.db!.prepare('SELECT count(*) AS n FROM business_sale_inquiries').get()).toEqual({ n: 0 });
  });
});

describe('listOwnedBusinessSalesWithInquiries', () => {
  it('returns own listings with inquiries and counts, and nothing from other sellers', async () => {
    const mine = seed({ userId: 'seller-1', slug: 'mine', updatedAt: '2026-09-20 00:00:00' });
    const other = seed({ userId: 'seller-2', slug: 'other' });
    await insertBusinessSaleInquiry({ listingId: mine, buyerUserId: 'buyer-1', message: '最初の問い合わせです。よろしく。', contactEmail: 'one@example.com' });
    await insertBusinessSaleInquiry({ listingId: mine, buyerUserId: 'buyer-2', message: '二番目の問い合わせです。よろしく。', contactEmail: 'two@example.com' });
    await insertBusinessSaleInquiry({ listingId: other, buyerUserId: 'buyer-1', message: '他人の掲載への問い合わせです。', contactEmail: 'one@example.com' });

    const result = await listOwnedBusinessSalesWithInquiries('seller-1');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: mine, slug: 'mine', status: 'published', inquiryCount: 2 });
    expect(result[0].inquiries.map((item) => item.contactEmail).sort()).toEqual(['one@example.com', 'two@example.com']);
    expect(JSON.stringify(result)).not.toContain('他人の掲載');
    expect(JSON.stringify(result)).not.toContain('buyer-1');
    expect(Object.keys(result[0].inquiries[0]).sort()).toEqual(['contactEmail', 'createdAt', 'id', 'message']);

    const otherView = await listOwnedBusinessSalesWithInquiries('seller-2');
    expect(otherView).toHaveLength(1);
    expect(otherView[0].inquiries.map((item) => item.message)).toEqual(['他人の掲載への問い合わせです。']);
    expect(await listOwnedBusinessSalesWithInquiries('nobody')).toEqual([]);
  });

  it('includes drafts and closed listings, newest first, and caps inquiries per listing', async () => {
    const draft = seed({ userId: 'seller-1', status: 'draft', updatedAt: '2026-09-01 00:00:00' });
    const closed = seed({ userId: 'seller-1', status: 'closed', updatedAt: '2026-09-10 00:00:00' });
    expect(draft).toBeTruthy();
    const insert = state.db!.prepare(
      "INSERT INTO business_sale_inquiries(id,listing_id,buyer_user_id,message,contact_email,created_at) VALUES(?,?,?,?,?,datetime('now',?))",
    );
    for (let index = 0; index < 60; index += 1) {
      insert.run(`inq-${String(index).padStart(2, '0')}`, closed, `buyer-${index}`, `問い合わせ ${index} 番目です。`, 'b@example.com', `-${60 - index} minutes`);
    }
    const result = await listOwnedBusinessSalesWithInquiries('seller-1');
    expect(result.map((item) => item.status)).toEqual(['closed', 'draft']);
    expect(result[0].inquiryCount).toBe(60);
    expect(result[0].inquiries).toHaveLength(50);
    expect(result[0].inquiries[0].message).toBe('問い合わせ 59 番目です。');
    expect(result[1].inquiryCount).toBe(0);
  });
});

describe('migration constraints', () => {
  const insertRaw = (overrides: Record<string, string | number | null>) => {
    const row = {
      id: crypto.randomUUID(), user_id: 'u', slug: crypto.randomUUID(), title: 'Title', summary: '', category: 'saas',
      established_year: 2020, monthly_revenue_jpy: 1, monthly_profit_jpy: 1, asking_price_jpy: 1, revenue_basis: 'self_reported',
      reason_for_sale: '', included_assets: '', seller_name: '', status: 'draft', ...overrides,
    };
    const keys = Object.keys(row);
    state.db!.prepare(`INSERT INTO business_sale_listings(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`).run(...Object.values(row));
  };

  it('accepts a valid row and rejects invalid values at the database level', () => {
    expect(() => insertRaw({})).not.toThrow();
    const badRows: Array<Record<string, string | number | null>> = [
      { title: 'x' }, { title: 'x'.repeat(101) }, { summary: 'x'.repeat(601) }, { category: 'crypto' },
      { established_year: 1899 }, { established_year: 2101 }, { monthly_revenue_jpy: -1 }, { monthly_profit_jpy: -1 },
      { asking_price_jpy: -1 }, { revenue_basis: 'verified' }, { reason_for_sale: 'x'.repeat(401) },
      { included_assets: 'x'.repeat(401) }, { seller_name: 'x'.repeat(51) }, { status: 'archived' },
    ];
    for (const bad of badRows) expect(() => insertRaw(bad), JSON.stringify(bad)).toThrow();
    expect(() => insertRaw({ slug: 'same' })).not.toThrow();
    expect(() => insertRaw({ slug: 'same' })).toThrow();
  });

  it('constrains inquiries and cascades their deletion with the listing', () => {
    const listingId = seed();
    const insert = (values: (string | number)[]) => state.db!.prepare(
      'INSERT INTO business_sale_inquiries(id,listing_id,buyer_user_id,message,contact_email) VALUES(?,?,?,?,?)',
    ).run(...values);
    expect(() => insert(['a', listingId, 'b', '短い', 'x@example.com'])).toThrow();
    expect(() => insert(['b', listingId, 'b', 'x'.repeat(2001), 'x@example.com'])).toThrow();
    expect(() => insert(['c', listingId, 'b', '十分な長さのメッセージです。', 'x@'])).toThrow();
    expect(() => insert(['d', 'missing-listing', 'b', '十分な長さのメッセージです。', 'x@example.com'])).toThrow();
    expect(() => insert(['e', listingId, 'b', '十分な長さのメッセージです。', 'x@example.com'])).not.toThrow();

    state.db!.prepare('DELETE FROM business_sale_listings WHERE id=?').run(listingId);
    expect(state.db!.prepare('SELECT count(*) AS n FROM business_sale_inquiries').get()).toEqual({ n: 0 });
  });

  it('has the indexes for the public list, the owner list and the inquiry list', () => {
    const names = (state.db!.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as { name: string }[]).map((row) => row.name);
    expect(names).toEqual(expect.arrayContaining([
      'business_sale_listings_public', 'business_sale_listings_owner', 'business_sale_inquiries_listing',
    ]));
  });
});
