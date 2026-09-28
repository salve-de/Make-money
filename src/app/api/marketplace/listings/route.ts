import { NextRequest, NextResponse } from 'next/server';

import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { getOwnedBuildSession } from '@/lib/builder/session';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { getOwnedMarketplaceListing, getOwnedMarketplaceListingById } from '@/lib/marketplace/listing-store';
import { executeD1 } from '@/lib/storage/d1';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import {
  MARKETPLACE_CATEGORIES,
  type MarketplaceCategory,
  type MarketplaceListingSource,
  type MarketplaceListingStatus,
} from '@/shared/marketplace-listing';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
const MAX_BODY_BYTES = 16 * 1024;

async function userIdFrom(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return (await verifyFirebaseIdToken(auth.slice(7)))?.uid ?? null;
}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

function validProductUrl(value: unknown, required: boolean): string | null | false {
  if (typeof value !== 'string' || !value.trim()) return required ? false : null;
  const raw = value.trim();
  if (raw.length > 2048) return false;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    const ipLiteral = host.startsWith('[') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
    if (url.protocol !== 'https:' || url.username || url.password || !host || ipLiteral || host === 'localhost'
      || host.endsWith('.localhost') || host.endsWith('.local') || host === '::1'
      || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)
      || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    return url.toString();
  } catch {
    return false;
  }
}

interface ListingInput {
  listingId: string | null;
  sessionId: string | null;
  sourceType: MarketplaceListingSource;
  title: string;
  summary: string;
  category: MarketplaceCategory;
  productUrl: string | null;
  checkoutUrl: string | null;
  priceLabel: string;
  sellerName: string;
  status: MarketplaceListingStatus;
}

function parseInput(value: unknown): ListingInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid listing');
  const row = value as Record<string, unknown>;
  const allowed = new Set(['listingId', 'sessionId', 'sourceType', 'title', 'summary', 'category', 'productUrl', 'checkoutUrl', 'priceLabel', 'sellerName', 'status']);
  if (Object.keys(row).some((key) => !allowed.has(key))) throw new Error('Invalid listing fields');
  const listingId = typeof row.listingId === 'string' && row.listingId.trim() ? row.listingId.trim() : null;
  const sessionId = typeof row.sessionId === 'string' && row.sessionId.trim() ? row.sessionId.trim() : null;
  const sourceType = row.sourceType;
  const title = typeof row.title === 'string' ? row.title.trim() : '';
  const summary = typeof row.summary === 'string' ? row.summary.trim() : '';
  const category = row.category;
  const status = row.status;
  const priceLabel = typeof row.priceLabel === 'string' ? row.priceLabel.trim() : '';
  const sellerName = typeof row.sellerName === 'string' ? row.sellerName.trim() : '';
  const productUrl = validProductUrl(row.productUrl, status === 'published');
  const checkoutUrl = validProductUrl(row.checkoutUrl, false);
  if (
    (listingId !== null && listingId.length > 128)
    || (sessionId !== null && sessionId.length > 128)
    || (sourceType !== 'builder' && sourceType !== 'external')
    || (sourceType === 'builder' && !sessionId)
    || (sourceType === 'external' && sessionId !== null)
    || title.length < 2 || title.length > 100
    || summary.length > 240 || (status === 'published' && summary.length < 12)
    || !MARKETPLACE_CATEGORIES.includes(category as MarketplaceCategory)
    || (status !== 'draft' && status !== 'published')
    || productUrl === false || checkoutUrl === false
    || priceLabel.length > 80 || sellerName.length > 50
  ) throw new Error('Invalid listing fields');
  return {
    listingId,
    sessionId,
    sourceType: sourceType as MarketplaceListingSource,
    title,
    summary,
    category: category as MarketplaceCategory,
    productUrl,
    checkoutUrl,
    priceLabel,
    sellerName,
    status: status as MarketplaceListingStatus,
  };
}

export async function GET(request: NextRequest) {
  const userId = await userIdFrom(request);
  if (!userId) return response({ error: 'Authentication required' }, 401);
  const sessionId = request.nextUrl.searchParams.get('sessionId')?.trim() || '';
  const listingId = request.nextUrl.searchParams.get('listingId')?.trim() || '';
  if (sessionId.length > 128 || listingId.length > 128) return response({ error: 'Invalid listing' }, 400);
  try {
    if (listingId) {
      const listing = await getOwnedMarketplaceListingById(userId, listingId);
      if (!listing) return response({ error: 'Listing not found' }, 404);
      return response({ success: true, defaultTitle: listing.title, listing });
    }
    if (!sessionId) return response({ success: true, defaultTitle: '', listing: null });
    const session = await getOwnedBuildSession(userId, sessionId);
    if (!session || session.status !== 'ready') return response({ error: 'Ready build not found' }, 404);
    const listing = await getOwnedMarketplaceListing(userId, sessionId);
    return response({
      success: true,
      defaultTitle: session.buildSpec.productName,
      listing,
    });
  } catch {
    return response({ error: 'Listing could not be loaded' }, 503);
  }
}

export async function PUT(request: NextRequest) {
  const userId = await userIdFrom(request);
  if (!userId) return response({ error: 'Authentication required' }, 401);

  let input: ListingInput;
  try {
    input = parseInput(await readJsonBody(request, MAX_BODY_BYTES));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return response({ error: 'Listing request is too large' }, 413);
    return response({ error: 'Listing details are invalid' }, 400);
  }

  try {
    const allowed = await consumeRequestRateLimit(request, 'marketplace-listing', {
      limit: 20,
      windowMs: 60 * 60 * 1000,
      subject: userId,
    });
    if (!allowed) return response({ error: 'Listing update limit reached. Try again later.' }, 429);

    const id = crypto.randomUUID();
    let existing: Awaited<ReturnType<typeof getOwnedMarketplaceListing>> = null;
    if (input.listingId) {
      existing = await getOwnedMarketplaceListingById(userId, input.listingId);
      if (!existing || existing.sourceType !== input.sourceType || existing.sessionId !== input.sessionId) {
        return response({ error: 'Listing not found' }, 404);
      }
    } else if (input.sourceType === 'builder' && input.sessionId) {
      const session = await getOwnedBuildSession(userId, input.sessionId);
      if (!session || session.status !== 'ready') return response({ error: 'Ready build not found' }, 404);
      existing = await getOwnedMarketplaceListing(userId, input.sessionId);
    }
    const listingId = existing?.listingId || id;
    const slug = existing?.slug || `${slugPart(input.title)}-${crypto.randomUUID().slice(0, 8)}`;
    const result = await executeD1(
      `INSERT INTO marketplace_listings(
        id,user_id,build_session_id,source_type,slug,title,summary,category,product_url,checkout_url,price_label,seller_name,status,updated_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,summary=excluded.summary,category=excluded.category,
        product_url=excluded.product_url,checkout_url=excluded.checkout_url,
        price_label=excluded.price_label,seller_name=excluded.seller_name,
        status=excluded.status,updated_at=CURRENT_TIMESTAMP
      WHERE marketplace_listings.user_id=excluded.user_id`,
      [listingId, userId, input.sessionId, input.sourceType, slug, input.title, input.summary, input.category,
        input.productUrl, input.checkoutUrl, input.priceLabel, input.sellerName, input.status],
    );
    if (result.changes !== 1) return response({ error: 'Listing could not be saved' }, 503);
    const listing = await getOwnedMarketplaceListingById(userId, listingId);
    if (!listing) return response({ error: 'Listing save could not be verified' }, 503);
    return response({ success: true, listing });
  } catch (error) {
    console.error('[marketplace/listings] save failed:', error);
    return response({ error: 'Listing could not be saved' }, 503);
  }
}

function slugPart(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'product';
}
