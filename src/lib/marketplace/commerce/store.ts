import { batchD1, executeD1, queryD1, type D1Value } from '@/lib/storage/d1';
import {
  referralRewardJpy,
  type CommerceActivity,
  type CommerceOrderView,
  type OwnedCommerceOffer,
  type OwnListingRow,
  type PublicCommerceOffer,
  type ReferralLedgerEntry,
  type ReferralNote,
  type ReferralSummary,
} from '@/shared/marketplace-commerce';
import type { CommercePaymentMode } from '@/shared/marketplace-commerce';

/**
 * 販売条件・テスト購入・紹介の保存。実際の請求は一切行わない（mode は 'test' 固定）。
 * 注文・支払い・紹介台帳は追記だけ。状態は出来事から導く。
 */

const LIST_LIMIT = 100;
const REFERRAL_NOTES: readonly string[] = ['none', 'credited', 'self_excluded', 'seller_excluded', 'other_listing', 'no_reward'];

type Row = Record<string, unknown>;

function asRow(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid commerce row');
  return value as Row;
}
function str(row: Row, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') throw new Error('Invalid commerce row');
  return value;
}
function strOrNull(row: Row, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error('Invalid commerce row');
  return value;
}
function int(row: Row, key: string): number {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new Error('Invalid commerce row');
  return value;
}
function intOrNull(row: Row, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  return int(row, key);
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const nowIso = () => new Date().toISOString();

// ---- 販売条件 ----

/** 掲載ページに出す販売条件。公開中で販売が有効なときだけ返す。 */
export async function getPublicOffer(slug: string, mode: CommercePaymentMode): Promise<PublicCommerceOffer | null> {
  const rows = await queryD1(
    `SELECT o.price_jpy AS priceJpy, o.referral_rate_bp AS rateBp
     FROM commerce_offers o JOIN marketplace_listings l ON l.id=o.listing_id AND l.user_id=o.seller_id
     WHERE l.slug=? AND l.status='published' AND o.enabled=1 LIMIT 1`,
    [slug],
    asRow,
  );
  const row = rows[0];
  if (!row) return null;
  return { priceJpy: int(row, 'priceJpy'), referralRatePercent: int(row, 'rateBp') / 100, mode };
}

export async function getOwnedOffer(sellerId: string, listingId: string): Promise<OwnedCommerceOffer | null> {
  const rows = await queryD1(
    `SELECT o.listing_id AS listingId, o.enabled AS enabled, o.price_jpy AS priceJpy, o.referral_rate_bp AS rateBp, o.updated_at AS updatedAt
     FROM commerce_offers o JOIN marketplace_listings l ON l.id=o.listing_id AND l.user_id=o.seller_id
     WHERE o.listing_id=? AND o.seller_id=? LIMIT 1`,
    [listingId, sellerId],
    asRow,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    listingId: str(row, 'listingId'),
    enabled: int(row, 'enabled') === 1,
    priceJpy: int(row, 'priceJpy'),
    referralRatePercent: int(row, 'rateBp') / 100,
    updatedAt: str(row, 'updatedAt'),
  };
}

/** 自分の掲載にだけ販売条件を付けられる。掲載が無い・他人のものなら null。 */
export async function saveOffer(
  sellerId: string,
  input: { listingId: string; enabled: boolean; priceJpy: number; referralRateBp: number },
): Promise<OwnedCommerceOffer | null> {
  const owned = await queryD1(`SELECT id FROM marketplace_listings WHERE id=? AND user_id=? LIMIT 1`, [input.listingId, sellerId], asRow);
  if (owned.length !== 1) return null;
  const now = nowIso();
  const result = await executeD1(
    `INSERT INTO commerce_offers(listing_id,seller_id,enabled,price_jpy,referral_rate_bp,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?)
     ON CONFLICT(listing_id) DO UPDATE SET enabled=excluded.enabled,price_jpy=excluded.price_jpy,
       referral_rate_bp=excluded.referral_rate_bp,updated_at=excluded.updated_at
     WHERE commerce_offers.seller_id=excluded.seller_id`,
    [input.listingId, sellerId, input.enabled ? 1 : 0, input.priceJpy, input.referralRateBp, now, now],
  );
  if (result.changes !== 1) throw new Error('Offer was not saved');
  return getOwnedOffer(sellerId, input.listingId);
}

// ---- 紹介リンク ----

const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
function newReferralCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

interface OfferedListing {
  listingId: string;
  slug: string;
  title: string;
  sellerId: string;
  priceJpy: number;
  rateBp: number;
}

async function findOfferedListing(slug: string): Promise<OfferedListing | null> {
  const rows = await queryD1(
    `SELECT l.id AS listingId, l.slug AS slug, l.title AS title, l.user_id AS sellerId,
            o.price_jpy AS priceJpy, o.referral_rate_bp AS rateBp
     FROM marketplace_listings l JOIN commerce_offers o ON o.listing_id=l.id AND o.seller_id=l.user_id
     WHERE l.slug=? AND l.status='published' AND o.enabled=1 LIMIT 1`,
    [slug],
    asRow,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    listingId: str(row, 'listingId'),
    slug: str(row, 'slug'),
    title: str(row, 'title'),
    sellerId: str(row, 'sellerId'),
    priceJpy: int(row, 'priceJpy'),
    rateBp: int(row, 'rateBp'),
  };
}

export type ReferralLinkResult =
  | { ok: true; code: string; listingSlug: string }
  | { ok: false; reason: 'not_found' | 'own_listing' };

/** 掲載ごと・紹介者ごとに1本。何度呼んでも同じコードを返す。出品者本人は作れない。 */
export async function getOrCreateReferralLink(referrerId: string, slug: string): Promise<ReferralLinkResult> {
  const listing = await findOfferedListing(slug);
  if (!listing) return { ok: false, reason: 'not_found' };
  if (listing.sellerId === referrerId) return { ok: false, reason: 'own_listing' };
  const read = async () => (await queryD1(
    `SELECT code FROM commerce_referral_links WHERE listing_id=? AND referrer_id=? LIMIT 1`,
    [listing.listingId, referrerId],
    asRow,
  ))[0];
  let row = await read();
  if (!row) {
    await executeD1(
      `INSERT OR IGNORE INTO commerce_referral_links(id,code,listing_id,referrer_id,created_at) VALUES(?,?,?,?,?)`,
      [crypto.randomUUID(), newReferralCode(), listing.listingId, referrerId, nowIso()],
    );
    row = await read();
  }
  if (!row) throw new Error('Referral link was not saved');
  return { ok: true, code: str(row, 'code'), listingSlug: listing.slug };
}

/** 紹介リンクの訪問を数える。同じ日・同じ接続元は1回。接続元は一方向の要約だけを残す。 */
export async function recordReferralVisit(code: string, clientKey: string): Promise<boolean> {
  const links = await queryD1(`SELECT id FROM commerce_referral_links WHERE code=? LIMIT 1`, [code], asRow);
  const link = links[0];
  if (!link) return false;
  const day = nowIso().slice(0, 10);
  const visitorHash = await sha256Hex(`${str(link, 'id')}|${day}|${clientKey}`);
  await executeD1(
    `INSERT OR IGNORE INTO commerce_referral_clicks(link_id,visitor_hash,created_at) VALUES(?,?,?)`,
    [str(link, 'id'), visitorHash, nowIso()],
  );
  return true;
}

// ---- 注文 ----

const ORDER_SELECT = `SELECT o.id AS orderId, o.listing_slug AS listingSlug, o.title_snapshot AS title, o.price_jpy AS priceJpy,
  o.mode AS mode, o.created_at AS createdAt, o.referral_note AS note, o.referral_rate_bp AS rateBp,
  o.buyer_id AS buyerId, o.seller_id AS sellerId,
  (SELECT e.created_at FROM commerce_order_events e WHERE e.order_id=o.id AND e.kind='paid') AS paidAt,
  (SELECT e.created_at FROM commerce_order_events e WHERE e.order_id=o.id AND e.kind='refunded') AS refundedAt,
  (SELECT COALESCE(SUM(g.amount_jpy),0) FROM commerce_referral_ledger g WHERE g.order_id=o.id) AS rewardNet
FROM commerce_orders o`;

function toOrderView(row: Row, viewerId: string): CommerceOrderView {
  const note = str(row, 'note');
  if (!REFERRAL_NOTES.includes(note)) throw new Error('Invalid commerce row');
  const viewerRole = str(row, 'sellerId') === viewerId ? 'seller' : 'buyer';
  const credited = note === 'credited';
  const refundedAt = strOrNull(row, 'refundedAt');
  return {
    orderId: str(row, 'orderId'),
    listingSlug: str(row, 'listingSlug'),
    title: str(row, 'title'),
    priceJpy: int(row, 'priceJpy'),
    mode: 'test',
    status: refundedAt ? 'refunded' : 'paid',
    createdAt: str(row, 'createdAt'),
    paidAt: strOrNull(row, 'paidAt'),
    refundedAt,
    viewerRole,
    referral: {
      note: note as ReferralNote,
      ratePercent: viewerRole === 'seller' && (credited || note === 'no_reward') ? int(row, 'rateBp') / 100 : null,
      rewardJpy: viewerRole === 'seller' && credited ? int(row, 'rewardNet') : null,
    },
  };
}

async function orderById(orderId: string, viewerId: string): Promise<CommerceOrderView | null> {
  const rows = await queryD1(`${ORDER_SELECT} WHERE o.id=? AND (o.buyer_id=? OR o.seller_id=?) LIMIT 1`, [orderId, viewerId, viewerId], asRow);
  return rows[0] ? toOrderView(rows[0], viewerId) : null;
}

export type CreateOrderResult =
  | { ok: true; order: CommerceOrderView; replayed: boolean }
  | { ok: false; reason: 'not_found' | 'own_listing' };

/**
 * テスト購入を1件作る（請求なし）。同じ購入識別子の再送は同じ注文を返す。
 * 紹介コードがあっても、自分の紹介・出品者本人の紹介・別の商品の紹介・不明なコードでは報酬を付けない。
 */
export async function createTestOrder(
  buyerId: string,
  input: { slug: string; requestKey: string; referralCode: string | null },
): Promise<CreateOrderResult> {
  const requestKeyHash = await sha256Hex(`order|${input.requestKey}`);
  const replay = await queryD1(`SELECT id FROM commerce_orders WHERE buyer_id=? AND request_key_hash=? LIMIT 1`, [buyerId, requestKeyHash], asRow);
  if (replay[0]) {
    const existing = await orderById(str(replay[0], 'id'), buyerId);
    if (existing) return { ok: true, order: existing, replayed: true };
  }
  const listing = await findOfferedListing(input.slug);
  if (!listing) return { ok: false, reason: 'not_found' };
  if (listing.sellerId === buyerId) return { ok: false, reason: 'own_listing' };

  let linkId: string | null = null;
  let referrerId: string | null = null;
  let note: ReferralNote = 'none';
  if (input.referralCode) {
    const links = await queryD1(`SELECT id, listing_id AS listingId, referrer_id AS referrerId FROM commerce_referral_links WHERE code=? LIMIT 1`, [input.referralCode], asRow);
    const link = links[0];
    if (link) {
      const linkReferrer = str(link, 'referrerId');
      if (linkReferrer === buyerId) note = 'self_excluded';
      else if (linkReferrer === listing.sellerId) note = 'seller_excluded';
      else if (str(link, 'listingId') !== listing.listingId) note = 'other_listing';
      else {
        linkId = str(link, 'id');
        referrerId = linkReferrer;
        note = listing.rateBp > 0 ? 'credited' : 'no_reward';
      }
    }
  }

  const orderId = crypto.randomUUID();
  const now = nowIso();
  const statements: { sql: string; params: D1Value[] }[] = [
    {
      sql: `INSERT INTO commerce_orders(id,listing_id,listing_slug,seller_id,buyer_id,mode,title_snapshot,price_jpy,request_key_hash,
              referral_link_id,referrer_id,referral_rate_bp,referral_note,created_at)
            VALUES(?,?,?,?,?,'test',?,?,?,?,?,?,?,?)`,
      params: [orderId, listing.listingId, listing.slug, listing.sellerId, buyerId, listing.title, listing.priceJpy, requestKeyHash,
        linkId, referrerId, linkId ? listing.rateBp : 0, note, now],
    },
    { sql: `INSERT INTO commerce_order_events(order_id,kind,actor_id,created_at) VALUES(?,'paid',?,?)`, params: [orderId, buyerId, now] },
  ];
  if (note === 'credited' && linkId && referrerId) {
    statements.push({
      sql: `INSERT INTO commerce_referral_ledger(order_id,link_id,referrer_id,listing_id,kind,amount_jpy,rate_bp,created_at)
            VALUES(?,?,?,?,'accrued',?,?,?)`,
      params: [orderId, linkId, referrerId, listing.listingId, referralRewardJpy(listing.priceJpy, listing.rateBp), listing.rateBp, now],
    });
  }
  try {
    await batchD1(statements);
  } catch (error) {
    // 同時に同じ購入識別子が届いた場合は、先に入った注文を返す。
    const again = await queryD1(`SELECT id FROM commerce_orders WHERE buyer_id=? AND request_key_hash=? LIMIT 1`, [buyerId, requestKeyHash], asRow);
    const existing = again[0] ? await orderById(str(again[0], 'id'), buyerId) : null;
    if (existing) return { ok: true, order: existing, replayed: true };
    throw error;
  }
  const order = await orderById(orderId, buyerId);
  if (!order) throw new Error('Order save could not be verified');
  return { ok: true, order, replayed: false };
}

export type RefundResult = { ok: true; order: CommerceOrderView } | { ok: false; reason: 'not_found' };

/** 出品者による返金（テスト購入の取り消し）。紹介報酬は負の行で取り消す。2回目は何もしない。 */
export async function refundOrder(sellerId: string, orderId: string): Promise<RefundResult> {
  const current = await queryD1(`SELECT id FROM commerce_orders WHERE id=? AND seller_id=? LIMIT 1`, [orderId, sellerId], asRow);
  if (!current[0]) return { ok: false, reason: 'not_found' };
  const now = nowIso();
  try {
    await batchD1([
      { sql: `INSERT INTO commerce_order_events(order_id,kind,actor_id,created_at) VALUES(?,'refunded',?,?)`, params: [orderId, sellerId, now] },
      {
        sql: `INSERT OR IGNORE INTO commerce_referral_ledger(order_id,link_id,referrer_id,listing_id,kind,amount_jpy,rate_bp,created_at)
              SELECT order_id,link_id,referrer_id,listing_id,'reversed',-amount_jpy,rate_bp,? FROM commerce_referral_ledger WHERE order_id=? AND kind='accrued'`,
        params: [now, orderId],
      },
    ]);
  } catch (error) {
    // すでに返金済み（UNIQUE）なら、その状態を返す。
    const done = await queryD1(`SELECT id FROM commerce_order_events WHERE order_id=? AND kind='refunded' LIMIT 1`, [orderId], asRow);
    if (!done[0]) throw error;
  }
  const order = await orderById(orderId, sellerId);
  if (!order) return { ok: false, reason: 'not_found' };
  return { ok: true, order };
}

// ---- 自分の取引一覧 ----

export async function getCommerceActivity(userId: string): Promise<CommerceActivity> {
  const [purchases, sales, referrals, ledger, listings] = await Promise.all([
    queryD1(`${ORDER_SELECT} WHERE o.buyer_id=? ORDER BY o.created_at DESC, o.id ASC LIMIT ${LIST_LIMIT}`, [userId], asRow),
    queryD1(`${ORDER_SELECT} WHERE o.seller_id=? ORDER BY o.created_at DESC, o.id ASC LIMIT ${LIST_LIMIT}`, [userId], asRow),
    queryD1(
      `SELECT k.code AS code, k.created_at AS createdAt,
         COALESCE(l.slug,'') AS slug, COALESCE(l.title,'（掲載は削除されました）') AS title,
         COALESCE(f.referral_rate_bp,0) AS rateBp,
         (SELECT COUNT(*) FROM commerce_referral_clicks c WHERE c.link_id=k.id) AS clicks,
         (SELECT COUNT(*) FROM commerce_orders r WHERE r.referral_link_id=k.id) AS orders,
         (SELECT COUNT(*) FROM commerce_orders r JOIN commerce_order_events e ON e.order_id=r.id AND e.kind='refunded' WHERE r.referral_link_id=k.id) AS refundedOrders,
         (SELECT COALESCE(SUM(g.amount_jpy),0) FROM commerce_referral_ledger g WHERE g.link_id=k.id AND g.kind='accrued') AS accrued,
         (SELECT COALESCE(SUM(g.amount_jpy),0) FROM commerce_referral_ledger g WHERE g.link_id=k.id AND g.kind='reversed') AS reversed
       FROM commerce_referral_links k
       LEFT JOIN marketplace_listings l ON l.id=k.listing_id
       LEFT JOIN commerce_offers f ON f.listing_id=k.listing_id
       WHERE k.referrer_id=? ORDER BY k.created_at DESC, k.id ASC LIMIT ${LIST_LIMIT}`,
      [userId],
      asRow,
    ),
    queryD1(
      `SELECT g.order_id AS orderId, o.title_snapshot AS title, g.kind AS kind, g.amount_jpy AS amount, g.rate_bp AS rateBp, g.created_at AS createdAt
       FROM commerce_referral_ledger g JOIN commerce_orders o ON o.id=g.order_id
       WHERE g.referrer_id=? ORDER BY g.id DESC LIMIT ${LIST_LIMIT}`,
      [userId],
      asRow,
    ),
    queryD1(
      `SELECT l.id AS listingId, l.slug AS slug, l.title AS title, l.status AS status, o.price_jpy AS priceJpy, o.enabled AS enabled, l.updated_at AS updatedAt
       FROM marketplace_listings l LEFT JOIN commerce_offers o ON o.listing_id=l.id AND o.seller_id=l.user_id
       WHERE l.user_id=? ORDER BY l.updated_at DESC, l.id ASC LIMIT ${LIST_LIMIT}`,
      [userId],
      asRow,
    ),
  ]);

  return {
    purchases: purchases.map((row) => toOrderView(row, userId)),
    sales: sales.map((row) => toOrderView(row, userId)),
    referrals: referrals.map((row): ReferralSummary => ({
      code: str(row, 'code'),
      listingSlug: str(row, 'slug'),
      title: str(row, 'title'),
      ratePercent: int(row, 'rateBp') / 100,
      clicks: int(row, 'clicks'),
      orders: int(row, 'orders'),
      refundedOrders: int(row, 'refundedOrders'),
      accruedJpy: int(row, 'accrued'),
      reversedJpy: int(row, 'reversed'),
      createdAt: str(row, 'createdAt'),
    })),
    ledger: ledger.map((row): ReferralLedgerEntry => {
      const kind = str(row, 'kind');
      if (kind !== 'accrued' && kind !== 'reversed') throw new Error('Invalid commerce row');
      return {
        orderId: str(row, 'orderId'),
        title: str(row, 'title'),
        kind,
        amountJpy: int(row, 'amount'),
        ratePercent: int(row, 'rateBp') / 100,
        createdAt: str(row, 'createdAt'),
      };
    }),
    listings: listings.map((row): OwnListingRow => {
      const status = str(row, 'status');
      if (status !== 'draft' && status !== 'published') throw new Error('Invalid commerce row');
      return {
        listingId: str(row, 'listingId'),
        slug: str(row, 'slug'),
        title: str(row, 'title'),
        status,
        priceJpy: intOrNull(row, 'priceJpy'),
        offerEnabled: intOrNull(row, 'enabled') === 1,
        updatedAt: str(row, 'updatedAt'),
      };
    }),
  };
}
