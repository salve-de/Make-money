import { queryD1 } from '@/lib/storage/d1';
import { MARKETPLACE_CATEGORIES, REVIEW_NOTE_MAX_LENGTH, type MarketplaceCategory } from '@/shared/marketplace-listing';
import { isBusinessSaleCategory } from '@/shared/business-sale-input';
import type { BusinessSaleCategory } from '@/shared/business-sale';
import { validListingUrl } from './listing-url';

/**
 * 掲載の審査（運営者だけが使う）。
 * - 審査待ち（pending_review）の掲載だけを読み、承認で published、却下で rejected にする。
 * - 承認・却下は「審査者が読んだ版（revision）」にだけ効く。読んだ後に掲載者が内容を保存したら、
 *   revision が進んでいるので conflict になり、見ていない内容を承認してしまわない。
 * - どちらも状態を条件に付けた UPDATE 1本で行い、同時操作で二重に承認・却下されない。
 */
export type ReviewKind = 'listing' | 'business';

export interface PendingListingReview {
  kind: 'listing';
  id: string;
  revision: number;
  slug: string;
  sourceType: 'builder' | 'external';
  title: string;
  summary: string;
  category: MarketplaceCategory;
  productUrl: string | null;
  checkoutUrl: string | null;
  priceLabel: string;
  sellerName: string;
  updatedAt: string;
}

export interface PendingBusinessReview {
  kind: 'business';
  id: string;
  revision: number;
  slug: string;
  title: string;
  summary: string;
  category: BusinessSaleCategory;
  establishedYear: number;
  monthlyRevenueJpy: number;
  monthlyProfitJpy: number;
  askingPriceJpy: number;
  reasonForSale: string;
  includedAssets: string;
  sellerName: string;
  updatedAt: string;
}

export type PendingReview = PendingListingReview | PendingBusinessReview;

export const REVIEW_LIST_LIMIT = 50;

function asRow(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid review row');
  return value as Record<string, unknown>;
}

function text(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') throw new Error(`Invalid review row: ${key}`);
  return value;
}

function nullableText(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value !== null && typeof value !== 'string') throw new Error(`Invalid review row: ${key}`);
  return value;
}

function integer(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error(`Invalid review row: ${key}`);
  return value;
}

/** D1 は UTC の 'YYYY-MM-DD HH:MM:SS' を返す。API では曖昧さのない ISO 形式にそろえる。 */
function toIso(value: string): string {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(' ', 'T')}Z` : value;
}

const LISTING_COLUMNS = `id,revision,slug,source_type AS sourceType,title,summary,category,
  product_url AS productUrl,checkout_url AS checkoutUrl,price_label AS priceLabel,
  seller_name AS sellerName,updated_at AS updatedAt`;
const BUSINESS_COLUMNS = `id,revision,slug,title,summary,category,established_year AS establishedYear,
  monthly_revenue_jpy AS monthlyRevenueJpy,monthly_profit_jpy AS monthlyProfitJpy,
  asking_price_jpy AS askingPriceJpy,reason_for_sale AS reasonForSale,included_assets AS includedAssets,
  seller_name AS sellerName,updated_at AS updatedAt`;

function parseListing(value: unknown): PendingListingReview {
  const row = asRow(value);
  const category = text(row, 'category');
  const sourceType = text(row, 'sourceType');
  if (!MARKETPLACE_CATEGORIES.includes(category as MarketplaceCategory)) throw new Error('Invalid review row: category');
  if (sourceType !== 'builder' && sourceType !== 'external') throw new Error('Invalid review row: sourceType');
  return {
    kind: 'listing',
    id: text(row, 'id'),
    revision: integer(row, 'revision'),
    slug: text(row, 'slug'),
    sourceType,
    title: text(row, 'title'),
    summary: text(row, 'summary'),
    category: category as MarketplaceCategory,
    productUrl: nullableText(row, 'productUrl'),
    checkoutUrl: nullableText(row, 'checkoutUrl'),
    priceLabel: text(row, 'priceLabel'),
    sellerName: text(row, 'sellerName'),
    updatedAt: toIso(text(row, 'updatedAt')),
  };
}

function parseBusiness(value: unknown): PendingBusinessReview {
  const row = asRow(value);
  const category = row.category;
  if (!isBusinessSaleCategory(category)) throw new Error('Invalid review row: category');
  return {
    kind: 'business',
    id: text(row, 'id'),
    revision: integer(row, 'revision'),
    slug: text(row, 'slug'),
    title: text(row, 'title'),
    summary: text(row, 'summary'),
    category,
    establishedYear: integer(row, 'establishedYear'),
    monthlyRevenueJpy: integer(row, 'monthlyRevenueJpy'),
    monthlyProfitJpy: integer(row, 'monthlyProfitJpy'),
    askingPriceJpy: integer(row, 'askingPriceJpy'),
    reasonForSale: text(row, 'reasonForSale'),
    includedAssets: text(row, 'includedAssets'),
    sellerName: text(row, 'sellerName'),
    updatedAt: toIso(text(row, 'updatedAt')),
  };
}

/** 審査待ちの掲載を、申請が古い順に返す。kind を渡すとその種類だけ。 */
export async function listPendingReviews(kind?: ReviewKind, limit = REVIEW_LIST_LIMIT): Promise<PendingReview[]> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > REVIEW_LIST_LIMIT) throw new Error('Invalid review list limit');
  const listings = kind === 'business'
    ? []
    : await queryD1(
      `SELECT ${LISTING_COLUMNS} FROM marketplace_listings WHERE status='pending_review' ORDER BY updated_at ASC,id ASC LIMIT ?`,
      [limit],
      parseListing,
    );
  const businesses = kind === 'listing'
    ? []
    : await queryD1(
      `SELECT ${BUSINESS_COLUMNS} FROM business_sale_listings WHERE status='pending_review' ORDER BY updated_at ASC,id ASC LIMIT ?`,
      [limit],
      parseBusiness,
    );
  return [...listings, ...businesses]
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export type ReviewOutcome =
  | { kind: 'done' }
  | { kind: 'not_found' }
  /** 審査待ちでない、または読んだ後に掲載者が内容を変えた */
  | { kind: 'conflict' }
  /** 承認時の URL 検査に通らなかった（承認していない） */
  | { kind: 'invalid_url'; field: 'productUrl' | 'checkoutUrl' };

interface ReviewTarget {
  table: 'marketplace_listings' | 'business_sale_listings';
}

function target(kind: ReviewKind): ReviewTarget {
  return { table: kind === 'listing' ? 'marketplace_listings' : 'business_sale_listings' };
}

async function currentState(kind: ReviewKind, id: string): Promise<{ status: string; revision: number } | null> {
  const rows = await queryD1(
    `SELECT status,revision FROM ${target(kind).table} WHERE id=? LIMIT 1`,
    [id],
    (value) => {
      const row = asRow(value);
      return { status: text(row, 'status'), revision: integer(row, 'revision') };
    },
  );
  return rows[0] ?? null;
}

/**
 * 承認する。公開中にするのは、審査待ちで、かつ審査者が読んだ版のままの掲載だけ。
 * Builder・外部サービスの掲載は、ここで URL の検査をもう一度かけ、通らなければ承認しない。
 */
export async function approveReview(input: { kind: ReviewKind; id: string; revision: number; reviewerId: string }): Promise<ReviewOutcome> {
  const { kind, id, revision, reviewerId } = input;
  const current = await currentState(kind, id);
  if (!current) return { kind: 'not_found' };
  if (current.status !== 'pending_review' || current.revision !== revision) return { kind: 'conflict' };

  if (kind === 'listing') {
    const rows = await queryD1(
      'SELECT product_url AS productUrl,checkout_url AS checkoutUrl FROM marketplace_listings WHERE id=? LIMIT 1',
      [id],
      (value) => {
        const row = asRow(value);
        return { productUrl: nullableText(row, 'productUrl'), checkoutUrl: nullableText(row, 'checkoutUrl') };
      },
    );
    const urls = rows[0];
    if (!urls) return { kind: 'not_found' };
    if (validListingUrl(urls.productUrl, true) === false) return { kind: 'invalid_url', field: 'productUrl' };
    if (validListingUrl(urls.checkoutUrl, false) === false) return { kind: 'invalid_url', field: 'checkoutUrl' };
  }

  const updated = await queryD1(
    `UPDATE ${target(kind).table} SET status='published',review_note=NULL,reviewed_at=CURRENT_TIMESTAMP,reviewed_by=?,updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND status='pending_review' AND revision=? RETURNING id`,
    [reviewerId, id, revision],
    (value) => text(asRow(value), 'id'),
  );
  return updated[0] ? { kind: 'done' } : { kind: 'conflict' };
}

/** 却下する。理由（短文）は掲載者本人だけが見る。 */
export async function rejectReview(input: {
  kind: ReviewKind;
  id: string;
  revision: number;
  reviewerId: string;
  reason: string;
}): Promise<ReviewOutcome> {
  const { kind, id, revision, reviewerId, reason } = input;
  if (reason.length === 0 || Array.from(reason).length > REVIEW_NOTE_MAX_LENGTH) throw new Error('Invalid review reason');
  const current = await currentState(kind, id);
  if (!current) return { kind: 'not_found' };
  if (current.status !== 'pending_review' || current.revision !== revision) return { kind: 'conflict' };

  const updated = await queryD1(
    `UPDATE ${target(kind).table} SET status='rejected',review_note=?,reviewed_at=CURRENT_TIMESTAMP,reviewed_by=?,updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND status='pending_review' AND revision=? RETURNING id`,
    [reason, reviewerId, id, revision],
    (value) => text(asRow(value), 'id'),
  );
  return updated[0] ? { kind: 'done' } : { kind: 'conflict' };
}
