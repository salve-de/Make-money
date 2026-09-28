import { queryD1 } from '@/lib/storage/d1';
import {
  MARKETPLACE_CATEGORIES,
  type MarketplaceCategory,
  type MarketplaceListingSource,
  type MarketplaceListingStatus,
  type OwnedMarketplaceListing,
  type PublicMarketplaceListing,
} from '@/shared/marketplace-listing';

interface ListingRow {
  id: string;
  sessionId: string | null;
  sourceType: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  productUrl: string | null;
  checkoutUrl: string | null;
  priceLabel: string;
  sellerName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function parseRow(value: unknown): ListingRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid marketplace listing');
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== 'string' || (row.sessionId !== null && typeof row.sessionId !== 'string')
    || typeof row.sourceType !== 'string' || (row.sourceType !== 'builder' && row.sourceType !== 'external')
    || typeof row.slug !== 'string' || typeof row.title !== 'string'
    || typeof row.summary !== 'string' || typeof row.category !== 'string'
    || (row.productUrl !== null && typeof row.productUrl !== 'string')
    || (row.checkoutUrl !== null && typeof row.checkoutUrl !== 'string')
    || typeof row.priceLabel !== 'string' || typeof row.sellerName !== 'string'
    || (row.status !== 'draft' && row.status !== 'published')
    || typeof row.createdAt !== 'string' || typeof row.updatedAt !== 'string'
    || !MARKETPLACE_CATEGORIES.includes(row.category as MarketplaceCategory)
  ) throw new Error('Invalid marketplace listing');

  return {
    id: row.id,
    sessionId: row.sessionId,
    sourceType: row.sourceType,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    productUrl: row.productUrl,
    checkoutUrl: row.checkoutUrl,
    priceLabel: row.priceLabel,
    sellerName: row.sellerName,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const SELECT = `SELECT
  id,build_session_id AS sessionId,source_type AS sourceType,
  slug,title,summary,category,product_url AS productUrl,checkout_url AS checkoutUrl,
  price_label AS priceLabel,seller_name AS sellerName,status,
  created_at AS createdAt,updated_at AS updatedAt
FROM marketplace_listings`;

function toOwned(row: ListingRow): OwnedMarketplaceListing {
  return {
    listingId: row.id,
    sourceType: row.sourceType as MarketplaceListingSource,
    sessionId: row.sessionId,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category as MarketplaceCategory,
    productUrl: row.productUrl ?? '',
    checkoutUrl: row.checkoutUrl,
    priceLabel: row.priceLabel,
    sellerName: row.sellerName,
    status: row.status as MarketplaceListingStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toPublic(row: ListingRow): PublicMarketplaceListing {
  if (row.status !== 'published' || !row.productUrl) throw new Error('Listing is not public');
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category as MarketplaceCategory,
    productUrl: row.productUrl,
    checkoutUrl: row.checkoutUrl,
    priceLabel: row.priceLabel,
    sellerName: row.sellerName,
    updatedAt: row.updatedAt,
  };
}

export async function getOwnedMarketplaceListing(userId: string, sessionId: string): Promise<OwnedMarketplaceListing | null> {
  const rows = await queryD1(
    `${SELECT} WHERE user_id=? AND build_session_id=? LIMIT 1`,
    [userId, sessionId],
    parseRow,
  );
  return rows[0] ? toOwned(rows[0]) : null;
}

export async function getOwnedMarketplaceListingById(userId: string, listingId: string): Promise<OwnedMarketplaceListing | null> {
  const rows = await queryD1(
    `${SELECT} WHERE user_id=? AND id=? LIMIT 1`,
    [userId, listingId],
    parseRow,
  );
  return rows[0] ? toOwned(rows[0]) : null;
}

export const MARKETPLACE_PAGE_SIZE = 60;
export const MAX_MARKETPLACE_OFFSET = 2_147_483_000;

export function parseMarketplaceOffset(value: string | string[] | undefined): number {
  if (value === undefined) return 0;
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) throw new Error('Invalid marketplace offset');
  const offset = Number(value);
  if (!Number.isSafeInteger(offset) || offset > MAX_MARKETPLACE_OFFSET) throw new Error('Invalid marketplace offset');
  return offset;
}

export async function listPublishedMarketplaceListings(limit = MARKETPLACE_PAGE_SIZE, offset = 0): Promise<{
  listings: PublicMarketplaceListing[];
  hasMore: boolean;
  nextOffset: number | null;
}> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100
    || !Number.isSafeInteger(offset) || offset < 0 || offset > MAX_MARKETPLACE_OFFSET) {
    throw new Error('Invalid marketplace pagination');
  }
  const rows = await queryD1(
    `${SELECT} WHERE status='published' AND product_url IS NOT NULL ORDER BY updated_at DESC, id ASC LIMIT ? OFFSET ?`,
    [limit + 1, offset],
    parseRow,
  );
  const hasMore = rows.length > limit;
  return { listings: rows.slice(0, limit).map(toPublic), hasMore, nextOffset: hasMore ? offset + limit : null };
}

export async function getPublishedMarketplaceListing(slug: string): Promise<PublicMarketplaceListing | null> {
  const rows = await queryD1(
    `${SELECT} WHERE slug=? AND status='published' AND product_url IS NOT NULL LIMIT 1`,
    [slug],
    parseRow,
  );
  return rows[0] ? toPublic(rows[0]) : null;
}
