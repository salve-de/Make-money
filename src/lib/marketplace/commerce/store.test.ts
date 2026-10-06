import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';

const state = vi.hoisted(() => ({ db: null as DatabaseSync | null }));
vi.mock('@/lib/storage/d1', async () => (await import('../testing/sqlite-d1')).sqliteD1Module(() => state.db!));

import { openFullTestDatabase } from '../testing/sqlite-d1';
import {
  createTestOrder,
  getCommerceActivity,
  getOrCreateReferralLink,
  getPublicOffer,
  recordReferralVisit,
  refundOrder,
  saveOffer,
} from './store';

const SELLER = 'seller-1';
const BUYER = 'buyer-1';
const REFERRER = 'referrer-1';

function seedListing(id: string, slug: string, userId = SELLER, status = 'published') {
  state.db!.prepare(
    `INSERT INTO marketplace_listings(id,user_id,source_type,slug,title,summary,category,product_url,status)
     VALUES(?,?,'external',?,?,?,'other','https://example.com',?)`,
  ).run(id, userId, slug, `商品 ${slug}`, '十分に長い説明文を入れておきます', status);
}

beforeEach(() => {
  state.db = openFullTestDatabase();
  seedListing('l1', 'svc-one');
  seedListing('l2', 'svc-two');
});
afterEach(() => state.db?.close());

const offer = (listingId: string, priceJpy = 3000, referralRateBp = 1000, enabled = true) =>
  saveOffer(SELLER, { listingId, enabled, priceJpy, referralRateBp });

describe('販売条件', () => {
  it('自分の掲載にだけ保存でき、公開ページ向けには有効なものだけ返る', async () => {
    expect(await saveOffer('someone-else', { listingId: 'l1', enabled: true, priceJpy: 3000, referralRateBp: 0 })).toBeNull();
    const saved = await offer('l1');
    expect(saved).toMatchObject({ priceJpy: 3000, referralRatePercent: 10, enabled: true });
    expect(await getPublicOffer('svc-one', 'test')).toEqual({ priceJpy: 3000, referralRatePercent: 10, mode: 'test' });
    await offer('l1', 3000, 1000, false);
    expect(await getPublicOffer('svc-one', 'test')).toBeNull();
  });

  it('下書きの掲載は購入条件として公開されない', async () => {
    seedListing('l3', 'svc-draft', SELLER, 'draft');
    await saveOffer(SELLER, { listingId: 'l3', enabled: true, priceJpy: 1000, referralRateBp: 0 });
    expect(await getPublicOffer('svc-draft', 'test')).toBeNull();
    expect(await createTestOrder(BUYER, { slug: 'svc-draft', requestKey: 'key-draft-1', referralCode: null })).toEqual({ ok: false, reason: 'not_found' });
  });
});

describe('購入と紹介', () => {
  it('紹介なしの購入は注文と支払いだけを記録する', async () => {
    await offer('l1');
    const result = await createTestOrder(BUYER, { slug: 'svc-one', requestKey: 'key-0001', referralCode: null });
    expect(result).toMatchObject({ ok: true, replayed: false, order: { priceJpy: 3000, status: 'paid', mode: 'test', viewerRole: 'buyer' } });
    expect(state.db!.prepare('SELECT COUNT(*) AS n FROM commerce_referral_ledger').get()).toEqual({ n: 0 });
  });

  it('同じ購入識別子の再送は二重に買わない', async () => {
    await offer('l1');
    const first = await createTestOrder(BUYER, { slug: 'svc-one', requestKey: 'key-0001', referralCode: null });
    const second = await createTestOrder(BUYER, { slug: 'svc-one', requestKey: 'key-0001', referralCode: null });
    expect(second).toMatchObject({ ok: true, replayed: true });
    expect(first.ok && second.ok && first.order.orderId === second.order.orderId).toBe(true);
    expect(state.db!.prepare('SELECT COUNT(*) AS n FROM commerce_orders').get()).toEqual({ n: 1 });
  });

  it('出品者は自分の掲載を買えず、紹介リンクも作れない', async () => {
    await offer('l1');
    expect(await createTestOrder(SELLER, { slug: 'svc-one', requestKey: 'key-0002', referralCode: null })).toEqual({ ok: false, reason: 'own_listing' });
    expect(await getOrCreateReferralLink(SELLER, 'svc-one')).toEqual({ ok: false, reason: 'own_listing' });
  });

  it('紹介リンク経由の購入は報酬を記録し、紹介者の成果に出る', async () => {
    await offer('l1', 2980, 1250);
    const link = await getOrCreateReferralLink(REFERRER, 'svc-one');
    if (!link.ok) throw new Error('link');
    expect(await getOrCreateReferralLink(REFERRER, 'svc-one')).toEqual(link);
    expect(await recordReferralVisit(link.code, 'ip-a')).toBe(true);
    expect(await recordReferralVisit(link.code, 'ip-a')).toBe(true);
    expect(await recordReferralVisit('unknowncode1', 'ip-a')).toBe(false);
    const order = await createTestOrder(BUYER, { slug: 'svc-one', requestKey: 'key-0003', referralCode: link.code });
    expect(order).toMatchObject({ ok: true, order: { referral: { note: 'credited', ratePercent: null, rewardJpy: null } } });

    const referrer = await getCommerceActivity(REFERRER);
    expect(referrer.referrals).toHaveLength(1);
    expect(referrer.referrals[0]).toMatchObject({ clicks: 1, orders: 1, accruedJpy: 372, reversedJpy: 0, ratePercent: 12.5 });
    expect(referrer.ledger[0]).toMatchObject({ kind: 'accrued', amountJpy: 372 });

    const seller = await getCommerceActivity(SELLER);
    expect(seller.sales[0].referral).toMatchObject({ note: 'credited', ratePercent: 12.5, rewardJpy: 372 });
    expect(seller.listings.map((row) => row.slug).sort()).toEqual(['svc-one', 'svc-two']);
    const buyer = await getCommerceActivity(BUYER);
    expect(buyer.purchases).toHaveLength(1);
    expect(buyer.sales).toHaveLength(0);
    expect(buyer.referrals).toHaveLength(0);
  });

  it('自分の紹介・別の商品の紹介・不明なコードでは報酬を付けない', async () => {
    await offer('l1');
    await offer('l2');
    const own = await getOrCreateReferralLink(BUYER, 'svc-one');
    const other = await getOrCreateReferralLink(REFERRER, 'svc-two');
    if (!own.ok || !other.ok) throw new Error('link');
    const notes = [];
    for (const [index, code] of [own.code, other.code, 'unknowncode1'].entries()) {
      const result = await createTestOrder(index === 0 ? BUYER : `buyer-${index}`, { slug: 'svc-one', requestKey: `key-ex-${index}`, referralCode: code });
      if (!result.ok) throw new Error('order');
      notes.push(result.order.referral.note);
    }
    expect(notes).toEqual(['self_excluded', 'other_listing', 'none']);
    expect(state.db!.prepare('SELECT COUNT(*) AS n FROM commerce_referral_ledger').get()).toEqual({ n: 0 });
  });

  it('報酬率0%の紹介は報酬を記録しない', async () => {
    await offer('l1', 3000, 0);
    const link = await getOrCreateReferralLink(REFERRER, 'svc-one');
    if (!link.ok) throw new Error('link');
    const result = await createTestOrder(BUYER, { slug: 'svc-one', requestKey: 'key-0004', referralCode: link.code });
    expect(result).toMatchObject({ ok: true, order: { referral: { note: 'no_reward' } } });
    expect(state.db!.prepare('SELECT COUNT(*) AS n FROM commerce_referral_ledger').get()).toEqual({ n: 0 });
  });
});

describe('返金', () => {
  it('出品者だけが取り消せ、紹介報酬は負の行で取り消され、2回目は何も増やさない', async () => {
    await offer('l1', 3000, 1000);
    const link = await getOrCreateReferralLink(REFERRER, 'svc-one');
    if (!link.ok) throw new Error('link');
    const created = await createTestOrder(BUYER, { slug: 'svc-one', requestKey: 'key-0005', referralCode: link.code });
    if (!created.ok) throw new Error('order');
    const id = created.order.orderId;
    expect(await refundOrder(BUYER, id)).toEqual({ ok: false, reason: 'not_found' });
    expect(await refundOrder(SELLER, id)).toMatchObject({ ok: true, order: { status: 'refunded', referral: { rewardJpy: 0 } } });
    expect(await refundOrder(SELLER, id)).toMatchObject({ ok: true, order: { status: 'refunded' } });
    expect(state.db!.prepare('SELECT kind, amount_jpy AS amount FROM commerce_referral_ledger ORDER BY id').all()).toEqual([
      { kind: 'accrued', amount: 300 },
      { kind: 'reversed', amount: -300 },
    ]);
    const referrer = await getCommerceActivity(REFERRER);
    expect(referrer.referrals[0]).toMatchObject({ accruedJpy: 300, reversedJpy: -300, refundedOrders: 1 });
  });

  it('記録は追記専用で、更新・削除はデータベースが拒否する', async () => {
    await offer('l1');
    const created = await createTestOrder(BUYER, { slug: 'svc-one', requestKey: 'key-0006', referralCode: null });
    if (!created.ok) throw new Error('order');
    expect(() => state.db!.prepare('UPDATE commerce_orders SET price_jpy=100').run()).toThrow(/append-only/);
    expect(() => state.db!.prepare('DELETE FROM commerce_order_events').run()).toThrow(/append-only/);
  });
});
