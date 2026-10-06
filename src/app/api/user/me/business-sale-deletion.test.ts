import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { DatabaseSync } from 'node:sqlite';

const state = vi.hoisted(() => ({
  db: null as DatabaseSync | null,
  user: { uid: 'seller-1' } as { uid: string } | null,
}));

vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: async () => state.user }));
vi.mock('@/lib/storage/d1', async () => (await import('@/lib/marketplace/testing/sqlite-d1')).sqliteD1Module(() => state.db!));
vi.mock('@/lib/payments/entitlement', () => ({ getProEntitlement: async () => false }));
vi.mock('@/lib/payments/billing', () => ({ findManageableSubscription: async () => null }));

import { DELETE } from './route';
import { seedBusinessSale } from '@/lib/marketplace/testing/fixtures';
import { openFullTestDatabase } from '@/lib/marketplace/testing/sqlite-d1';

const request = () => new NextRequest('http://localhost/api/user/me', { method: 'DELETE', headers: { Authorization: 'Bearer test' } });

function addUser(id: string) {
  state.db!.prepare('INSERT INTO users(id,email) VALUES(?,?)').run(id, `${id}@example.com`);
}
function addInquiry(id: string, listingId: string, buyer: string, message = `${id} の問い合わせ本文です。`) {
  state.db!.prepare('INSERT INTO business_sale_inquiries(id,listing_id,buyer_user_id,message,contact_email) VALUES(?,?,?,?,?)')
    .run(id, listingId, buyer, message, `${buyer}@example.com`);
}
const ids = (table: string) => (state.db!.prepare(`SELECT id FROM ${table} ORDER BY id`).all() as { id: string }[]).map((row) => row.id);

/**
 * seller-1: 掲載2件（公開中1・下書き1）。公開中に buyer-1 と seller-2 から問い合わせ。
 * seller-2: 掲載1件。seller-1 と buyer-1 から問い合わせ。
 */
function seedScenario() {
  for (const id of ['seller-1', 'seller-2', 'buyer-1']) addUser(id);
  seedBusinessSale(state.db!, { id: 'listing-s1-published', userId: 'seller-1', slug: 's1-pub' });
  seedBusinessSale(state.db!, { id: 'listing-s1-draft', userId: 'seller-1', slug: 's1-draft', status: 'draft' });
  seedBusinessSale(state.db!, { id: 'listing-s2', userId: 'seller-2', slug: 's2' });
  addInquiry('inq-buyer1-to-s1', 'listing-s1-published', 'buyer-1');
  addInquiry('inq-s2-to-s1', 'listing-s1-published', 'seller-2');
  addInquiry('inq-s1-to-s2', 'listing-s2', 'seller-1');
  addInquiry('inq-buyer1-to-s2', 'listing-s2', 'buyer-1');
}

beforeEach(() => {
  state.db = openFullTestDatabase();
  state.user = { uid: 'seller-1' };
});
afterEach(() => {
  state.db?.close();
});

describe('DELETE /api/user/me and business sale data', () => {
  it('deletes the seller\'s listings, the inquiries they received and the ones they sent, and nothing of anyone else', async () => {
    seedScenario();
    const response = await DELETE(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, scope: 'application_data' });

    expect(ids('business_sale_listings')).toEqual(['listing-s2']);
    // seller-1 宛て（買い手の連絡先・本文を含む）と seller-1 が送ったものは消え、他人どうしの問い合わせは残る
    expect(ids('business_sale_inquiries')).toEqual(['inq-buyer1-to-s2']);
    expect(ids('users')).toEqual(['buyer-1', 'seller-2']);
  });

  it('deletes the inquiries a buyer sent, and leaves the listings and other people\'s inquiries alone', async () => {
    seedScenario();
    state.user = { uid: 'buyer-1' };
    expect((await DELETE(request())).status).toBe(200);

    expect(ids('business_sale_listings')).toEqual(['listing-s1-draft', 'listing-s1-published', 'listing-s2']);
    expect(ids('business_sale_inquiries')).toEqual(['inq-s1-to-s2', 'inq-s2-to-s1']);
    const remainingBuyers = (state.db!.prepare('SELECT DISTINCT buyer_user_id AS b FROM business_sale_inquiries ORDER BY b').all() as { b: string }[]).map((row) => row.b);
    expect(remainingBuyers).not.toContain('buyer-1');
  });

  it('removes every trace of the deleted user\'s contact details and messages', async () => {
    seedScenario();
    await DELETE(request());
    const everything = JSON.stringify([
      state.db!.prepare('SELECT * FROM business_sale_listings').all(),
      state.db!.prepare('SELECT * FROM business_sale_inquiries').all(),
    ]);
    expect(everything).not.toContain('seller-1@example.com');
    expect(everything).not.toContain('inq-s1-to-s2 の問い合わせ本文');
    expect(everything).not.toContain('inq-buyer1-to-s1 の問い合わせ本文');
  });

  it('succeeds for a user who has no business sale data', async () => {
    addUser('seller-1');
    expect((await DELETE(request())).status).toBe(200);
    expect(ids('users')).toEqual([]);
  });

  it('still deletes the account on a database that has not applied migration 0014', async () => {
    state.db!.close();
    state.db = openFullTestDatabase(['0014_business_sale_listings.sql', '0016_listing_review.sql']);
    addUser('seller-1');
    expect((await DELETE(request())).status).toBe(200);
    expect(ids('users')).toEqual([]);
  });

  it('fails closed, without reporting success, if business sale data remains after the deletion', async () => {
    seedScenario();
    // 削除された掲載の代わりに、同じ持ち主の掲載が書き戻される状況を作る
    state.db!.exec(`CREATE TRIGGER resurrect AFTER DELETE ON business_sale_listings WHEN OLD.id != 'ghost'
      BEGIN
        INSERT OR IGNORE INTO business_sale_listings(id,user_id,slug,title,category,established_year,monthly_revenue_jpy,monthly_profit_jpy,asking_price_jpy)
        VALUES('ghost',OLD.user_id,'ghost-slug','Ghost','saas',2020,1,1,1);
      END`);
    expect((await DELETE(request())).status).toBe(503);
  });

  it('touches nothing without a valid login', async () => {
    seedScenario();
    state.user = null;
    expect((await DELETE(request())).status).toBe(401);
    expect(ids('business_sale_listings')).toHaveLength(3);
    expect(ids('business_sale_inquiries')).toHaveLength(4);
  });
});
