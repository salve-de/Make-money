import { queryD1 } from '@/lib/storage/d1';
import {
  BUSINESS_SALE_LIST_LIMIT,
  BUSINESS_SALE_REVENUE_BASES,
  type BusinessSaleFields,
  type BusinessSaleInquiryView,
  type BusinessSaleRevenueBasis,
  type OwnedBusinessSaleListing,
  type OwnedBusinessSaleWithInquiries,
  type PublicBusinessSaleListing,
  type PublicBusinessSaleSummary,
} from '@/shared/business-sale';
import {
  isBusinessSaleCategory,
  isBusinessSaleStatus,
  planBusinessSaleUpdate,
  type BusinessSaleFilter,
  type BusinessSaleUpdateInput,
} from '@/shared/business-sale-input';

/**
 * 事業の売買の保存。公開側のクエリは user_id を最初から読まないので、
 * 売り手の識別子は公開用の型に混ざりようがない。売り手の操作は必ず user_id で絞る。
 */
const SUMMARY_COLUMNS = `id,slug,title,summary,category,
  established_year AS establishedYear,monthly_revenue_jpy AS monthlyRevenueJpy,
  monthly_profit_jpy AS monthlyProfitJpy,asking_price_jpy AS askingPriceJpy,
  revenue_basis AS revenueBasis,seller_name AS sellerName,updated_at AS updatedAt`;
const DETAIL_COLUMNS = `${SUMMARY_COLUMNS},reason_for_sale AS reasonForSale,included_assets AS includedAssets`;
const OWNER_COLUMNS = `${DETAIL_COLUMNS},status,created_at AS createdAt`;

function asRow(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid business sale row');
  return value as Record<string, unknown>;
}

function text(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') throw new Error(`Invalid business sale row: ${key}`);
  return value;
}

function integer(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error(`Invalid business sale row: ${key}`);
  return value;
}

/** D1 は UTC の 'YYYY-MM-DD HH:MM:SS' を返す。API では曖昧さのない ISO 形式にそろえる。 */
function toIso(value: string): string {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(' ', 'T')}Z` : value;
}

function parseSummaryRow(value: unknown): PublicBusinessSaleSummary {
  const row = asRow(value);
  const category = row.category;
  const revenueBasis = row.revenueBasis;
  if (!isBusinessSaleCategory(category)) throw new Error('Invalid business sale row: category');
  if (!(BUSINESS_SALE_REVENUE_BASES as readonly unknown[]).includes(revenueBasis)) throw new Error('Invalid business sale row: revenueBasis');
  return {
    id: text(row, 'id'),
    slug: text(row, 'slug'),
    title: text(row, 'title'),
    summary: text(row, 'summary'),
    category,
    establishedYear: integer(row, 'establishedYear'),
    monthlyRevenueJpy: integer(row, 'monthlyRevenueJpy'),
    monthlyProfitJpy: integer(row, 'monthlyProfitJpy'),
    askingPriceJpy: integer(row, 'askingPriceJpy'),
    revenueBasis: revenueBasis as BusinessSaleRevenueBasis,
    sellerName: text(row, 'sellerName'),
    updatedAt: toIso(text(row, 'updatedAt')),
  };
}

function parseDetailRow(value: unknown): PublicBusinessSaleListing {
  const row = asRow(value);
  return { ...parseSummaryRow(row), reasonForSale: text(row, 'reasonForSale'), includedAssets: text(row, 'includedAssets') };
}

function parseOwnedRow(value: unknown): OwnedBusinessSaleListing {
  const row = asRow(value);
  const status = row.status;
  if (!isBusinessSaleStatus(status)) throw new Error('Invalid business sale row: status');
  return { ...parseDetailRow(row), status, createdAt: toIso(text(row, 'createdAt')) };
}

function slugBase(title: string): string {
  const base = title.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
  return base || 'business';
}

/** 表示用の slug。末尾のランダム10桁で URL を推測されにくくし、重複時は作り直す。 */
function makeSlug(title: string): string {
  return `${slugBase(title)}-${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`;
}

/** 公開中の一覧。買い手の連絡先や売り手の user_id は読まない。 */
export async function listPublishedBusinessSales(
  filter: BusinessSaleFilter = {},
  limit: number = BUSINESS_SALE_LIST_LIMIT,
): Promise<PublicBusinessSaleSummary[]> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > BUSINESS_SALE_LIST_LIMIT) throw new Error('Invalid business sale list limit');
  const conditions = ["status='published'"];
  const params: (string | number)[] = [];
  if (filter.category) {
    conditions.push('category=?');
    params.push(filter.category);
  }
  if (filter.maxPrice !== undefined) {
    conditions.push('asking_price_jpy<=?');
    params.push(filter.maxPrice);
  }
  return queryD1(
    `SELECT ${SUMMARY_COLUMNS} FROM business_sale_listings WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC,id ASC LIMIT ?`,
    [...params, limit],
    parseSummaryRow,
  );
}

export async function getPublishedBusinessSaleBySlug(slug: string): Promise<PublicBusinessSaleListing | null> {
  const rows = await queryD1(
    `SELECT ${DETAIL_COLUMNS} FROM business_sale_listings WHERE slug=? AND status='published' LIMIT 1`,
    [slug],
    parseDetailRow,
  );
  return rows[0] ?? null;
}

export interface InquiryTarget {
  id: string;
  sellerUserId: string;
  title: string;
}

/** 問い合わせ先の確認用。公開中の掲載だけを返し、売り手本人の判定とメール通知に使う。 */
export async function getPublishedBusinessSaleForInquiry(id: string): Promise<InquiryTarget | null> {
  const rows = await queryD1(
    "SELECT id,user_id AS sellerUserId,title FROM business_sale_listings WHERE id=? AND status='published' LIMIT 1",
    [id],
    (value): InquiryTarget => {
      const row = asRow(value);
      return { id: text(row, 'id'), sellerUserId: text(row, 'sellerUserId'), title: text(row, 'title') };
    },
  );
  return rows[0] ?? null;
}

export async function getOwnedBusinessSale(userId: string, id: string): Promise<OwnedBusinessSaleListing | null> {
  const rows = await queryD1(
    `SELECT ${OWNER_COLUMNS} FROM business_sale_listings WHERE id=? AND user_id=? LIMIT 1`,
    [id, userId],
    parseOwnedRow,
  );
  return rows[0] ?? null;
}

/** 下書きを作る。売上の根拠は常に本人申告で、検証の記録（verification_id）はここでは付けない。 */
export async function createBusinessSaleDraft(userId: string, fields: BusinessSaleFields): Promise<OwnedBusinessSaleListing> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const rows = await queryD1(
      `INSERT INTO business_sale_listings(
         id,user_id,slug,title,summary,category,established_year,monthly_revenue_jpy,monthly_profit_jpy,
         asking_price_jpy,revenue_basis,reason_for_sale,included_assets,seller_name,status
       ) VALUES(?,?,?,?,?,?,?,?,?,?,'self_reported',?,?,?,'draft')
       ON CONFLICT DO NOTHING
       RETURNING ${OWNER_COLUMNS}`,
      [
        crypto.randomUUID(), userId, makeSlug(fields.title), fields.title, fields.summary, fields.category,
        fields.establishedYear, fields.monthlyRevenueJpy, fields.monthlyProfitJpy, fields.askingPriceJpy,
        fields.reasonForSale, fields.includedAssets, fields.sellerName,
      ],
      parseOwnedRow,
    );
    if (rows[0]) return rows[0];
  }
  throw new Error('Could not allocate a unique business sale slug');
}

export type UpdateOutcome =
  | { kind: 'ok'; listing: OwnedBusinessSaleListing }
  | { kind: 'not_found' }
  | { kind: 'invalid'; field?: string; message: string }
  | { kind: 'conflict'; field?: string; message: string };

/**
 * 本人の掲載だけを更新する。他人の掲載は存在しないものとして扱う（not_found）。
 * 状態の変更は現在の状態を条件に付けた UPDATE で行い、同時操作で飛び越えられないようにする。
 * 月商を書き換えたら、検証済みの表示と検証の記録を外して本人申告に戻す。
 */
export async function updateBusinessSale(userId: string, id: string, patch: BusinessSaleUpdateInput): Promise<UpdateOutcome> {
  const current = await getOwnedBusinessSale(userId, id);
  if (!current) return { kind: 'not_found' };
  const plan = planBusinessSaleUpdate(current, patch);
  if (!plan.ok) return { kind: plan.kind, field: plan.field, message: plan.message };

  const { next } = plan;
  const resetVerification = plan.revenueChanged ? 1 : 0;
  const rows = await queryD1(
    `UPDATE business_sale_listings SET
       title=?,summary=?,category=?,established_year=?,monthly_revenue_jpy=?,monthly_profit_jpy=?,
       asking_price_jpy=?,reason_for_sale=?,included_assets=?,seller_name=?,status=?,
       revenue_basis=CASE WHEN ?=1 THEN 'self_reported' ELSE revenue_basis END,
       verification_id=CASE WHEN ?=1 THEN NULL ELSE verification_id END,
       updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND user_id=? AND status=?
     RETURNING ${OWNER_COLUMNS}`,
    [
      next.title, next.summary, next.category, next.establishedYear, next.monthlyRevenueJpy, next.monthlyProfitJpy,
      next.askingPriceJpy, next.reasonForSale, next.includedAssets, next.sellerName, next.status,
      resetVerification, resetVerification, id, userId, current.status,
    ],
    parseOwnedRow,
  );
  return rows[0]
    ? { kind: 'ok', listing: rows[0] }
    : { kind: 'conflict', message: '他の操作と重なったため保存できませんでした。画面を読み込み直してください' };
}

const MINE_LISTING_LIMIT = 50;
const MINE_INQUIRIES_PER_LISTING = 50;

interface InquiryRow extends BusinessSaleInquiryView {
  listingId: string;
}

/** 自分の掲載と、そこに届いた問い合わせ。問い合わせは自分の掲載分だけを引く。 */
export async function listOwnedBusinessSalesWithInquiries(userId: string): Promise<OwnedBusinessSaleWithInquiries[]> {
  const listings = await queryD1(
    `SELECT ${OWNER_COLUMNS} FROM business_sale_listings WHERE user_id=? ORDER BY updated_at DESC,id ASC LIMIT ?`,
    [userId, MINE_LISTING_LIMIT],
    parseOwnedRow,
  );
  if (listings.length === 0) return [];

  const ownListingIds = 'SELECT id FROM business_sale_listings WHERE user_id=?';
  const inquiries = await queryD1(
    `SELECT id,listing_id AS listingId,message,contact_email AS contactEmail,created_at AS createdAt FROM (
       SELECT i.*,ROW_NUMBER() OVER (PARTITION BY i.listing_id ORDER BY i.created_at DESC,i.id DESC) AS rn
       FROM business_sale_inquiries i WHERE i.listing_id IN (${ownListingIds})
     ) WHERE rn<=? ORDER BY createdAt DESC,id DESC`,
    [userId, MINE_INQUIRIES_PER_LISTING],
    (value): InquiryRow => {
      const row = asRow(value);
      return {
        id: text(row, 'id'),
        listingId: text(row, 'listingId'),
        message: text(row, 'message'),
        contactEmail: text(row, 'contactEmail'),
        createdAt: toIso(text(row, 'createdAt')),
      };
    },
  );
  const counts = await queryD1(
    `SELECT listing_id AS listingId,COUNT(*) AS total FROM business_sale_inquiries WHERE listing_id IN (${ownListingIds}) GROUP BY listing_id`,
    [userId],
    (value) => {
      const row = asRow(value);
      return { listingId: text(row, 'listingId'), total: integer(row, 'total') };
    },
  );
  const totalByListing = new Map(counts.map(({ listingId, total }) => [listingId, total]));
  return listings.map((listing) => ({
    ...listing,
    inquiryCount: totalByListing.get(listing.id) ?? 0,
    inquiries: inquiries
      .filter((inquiry) => inquiry.listingId === listing.id)
      .map(({ id: inquiryId, message, contactEmail, createdAt }) => ({ id: inquiryId, message, contactEmail, createdAt })),
  }));
}

export type InquiryInsertResult =
  | { status: 'inserted'; id: string }
  | { status: 'duplicate' }
  | { status: 'closed' };

/**
 * 問い合わせを1件保存する。
 * 「公開中であること」と「同じ買い手から同じ掲載への直近24時間の問い合わせがないこと」を
 * INSERT の条件に入れ、同時送信でも1日1回を破れないようにする。
 */
export async function insertBusinessSaleInquiry(input: {
  listingId: string;
  buyerUserId: string;
  message: string;
  contactEmail: string;
}): Promise<InquiryInsertResult> {
  const recent = "SELECT 1 FROM business_sale_inquiries WHERE listing_id=? AND buyer_user_id=? AND created_at>datetime('now','-1 day')";
  const inserted = await queryD1(
    `INSERT INTO business_sale_inquiries(id,listing_id,buyer_user_id,message,contact_email)
     SELECT ?,?,?,?,?
     WHERE EXISTS (SELECT 1 FROM business_sale_listings WHERE id=? AND status='published')
       AND NOT EXISTS (${recent})
     RETURNING id`,
    [
      crypto.randomUUID(), input.listingId, input.buyerUserId, input.message, input.contactEmail,
      input.listingId, input.listingId, input.buyerUserId,
    ],
    (value) => text(asRow(value), 'id'),
  );
  if (inserted[0]) return { status: 'inserted', id: inserted[0] };
  const duplicate = await queryD1(`${recent} LIMIT 1`, [input.listingId, input.buyerUserId]);
  return duplicate.length > 0 ? { status: 'duplicate' } : { status: 'closed' };
}
