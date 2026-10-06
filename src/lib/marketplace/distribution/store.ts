import { getOwnedMarketplaceListingById } from '@/lib/marketplace/listing-store';
import { executeD1, queryD1 } from '@/lib/storage/d1';

import { fail } from './contract';

/** 掲載⇔SellRelay 商品の対応（0018_marketplace_distribution.sql）。 */
export interface LinkRow {
  listing_id: string;
  owner_id: string;
  relay_owner_id: string;
  relay_origin: string;
  mode: 'contract-test' | 'live';
  fingerprint: string;
  product_payload: string;
  destination_url: string;
  relay_product_id: string | null;
  state: 'prepared' | 'sending' | 'checking' | 'linked';
}

export interface ReferralRow {
  public_code: string;
  listing_id: string;
  partner_id: string;
  relay_partner_id: string;
  relay_code: string;
}

const LINK_COLUMNS = 'listing_id,owner_id,relay_owner_id,relay_origin,mode,fingerprint,product_payload,destination_url,relay_product_id,state';
const REFERRAL_COLUMNS = 'public_code,listing_id,partner_id,relay_partner_id,relay_code';

/** 公開中の自分の掲載。無ければ LISTING_NOT_FOUND。 */
export async function ownedPublishedListing(owner: string, id: string) {
  const listing = await getOwnedMarketplaceListingById(owner, id);
  if (!listing || listing.status !== 'published') fail('LISTING_NOT_FOUND', 404);
  return listing;
}

/** 公開中の掲載を slug で引き、持ち主も返す（持ち主はサーバーの中だけで使う）。 */
export async function publishedListingBySlug(slug: string) {
  const row = (await queryD1<{ id: string; user_id: string }>(
    "SELECT id,user_id FROM marketplace_listings WHERE slug=? AND status='published' LIMIT 1", [slug]))[0];
  if (!row) fail('LISTING_NOT_FOUND', 404);
  return { owner: row.user_id, listing: await ownedPublishedListing(row.user_id, row.id) };
}

export async function linkFor(listingId: string): Promise<LinkRow | null> {
  return (await queryD1<LinkRow>(`SELECT ${LINK_COLUMNS} FROM marketplace_distribution_links WHERE listing_id=?`, [listingId]))[0] ?? null;
}

/** 対応を prepared で予約する。既にあれば何もせず、今の行を返す。 */
export async function reserveLink(row: Omit<LinkRow, 'relay_product_id' | 'state'>): Promise<LinkRow> {
  await executeD1(
    `INSERT INTO marketplace_distribution_links
      (listing_id,owner_id,relay_owner_id,relay_origin,mode,fingerprint,product_payload,destination_url,state)
     VALUES(?,?,?,?,?,?,?,?,'prepared') ON CONFLICT(listing_id) DO NOTHING`,
    [row.listing_id, row.owner_id, row.relay_owner_id, row.relay_origin, row.mode, row.fingerprint, row.product_payload, row.destination_url],
  );
  const saved = await linkFor(row.listing_id);
  if (!saved) throw new Error('Distribution link was not saved');
  return saved;
}

/** prepared → sending を1つの処理だけが取れる。取れた処理だけが SellRelay に作成を送る。 */
export async function claimLink(listingId: string): Promise<boolean> {
  const result = await executeD1(
    "UPDATE marketplace_distribution_links SET state='sending',updated_at=CURRENT_TIMESTAMP WHERE listing_id=? AND state='prepared'",
    [listingId],
  );
  return result.changes === 1;
}

/** 状態を進める。linked になった行は linked 以外に戻さない。 */
export async function markLink(listingId: string, state: 'prepared' | 'checking' | 'linked', productId: string | null = null): Promise<void> {
  await executeD1(
    state === 'linked'
      ? "UPDATE marketplace_distribution_links SET state='linked',relay_product_id=?,updated_at=CURRENT_TIMESTAMP WHERE listing_id=?"
      : "UPDATE marketplace_distribution_links SET state=?,updated_at=CURRENT_TIMESTAMP WHERE listing_id=? AND state!='linked'",
    state === 'linked' ? [productId, listingId] : [state, listingId],
  );
}

export async function referralFor(listingId: string, partnerId: string): Promise<ReferralRow | null> {
  return (await queryD1<ReferralRow>(
    `SELECT ${REFERRAL_COLUMNS} FROM marketplace_distribution_referrals WHERE listing_id=? AND partner_id=?`, [listingId, partnerId]))[0] ?? null;
}

/** 紹介者ごとに1本。既にあれば今の行を返す（後から来た値で上書きしない）。 */
export async function saveReferral(row: ReferralRow): Promise<ReferralRow> {
  await executeD1(
    `INSERT INTO marketplace_distribution_referrals(${REFERRAL_COLUMNS}) VALUES(?,?,?,?,?) ON CONFLICT(listing_id,partner_id) DO NOTHING`,
    [row.public_code, row.listing_id, row.partner_id, row.relay_partner_id, row.relay_code],
  );
  const saved = await referralFor(row.listing_id, row.partner_id);
  if (!saved) throw new Error('Distribution referral was not saved');
  return saved;
}

export async function referralByCode(code: string): Promise<ReferralRow | null> {
  return (await queryD1<ReferralRow>(`SELECT ${REFERRAL_COLUMNS} FROM marketplace_distribution_referrals WHERE public_code=?`, [code]))[0] ?? null;
}
