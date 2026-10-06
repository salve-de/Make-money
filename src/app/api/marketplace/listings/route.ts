import { NextRequest, NextResponse } from 'next/server';

import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { getOwnedBuildSession } from '@/lib/builder/session';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { getOwnedMarketplaceListing, getOwnedMarketplaceListingById } from '@/lib/marketplace/listing-store';
import { validListingUrl } from '@/lib/marketplace/listing-url';
import { executeD1 } from '@/lib/storage/d1';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import {
  MARKETPLACE_CATEGORIES,
  type MarketplaceCategory,
  type MarketplaceListingSource,
  type MarketplaceListingRequestedStatus,
  type MarketplaceListingStatus,
  type OwnedMarketplaceListing,
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
  status: MarketplaceListingRequestedStatus;
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
  const productUrl = validListingUrl(row.productUrl, status === 'pending_review');
  const checkoutUrl = validListingUrl(row.checkoutUrl, false);
  if (
    (listingId !== null && listingId.length > 128)
    || (sessionId !== null && sessionId.length > 128)
    || (sourceType !== 'builder' && sourceType !== 'external')
    || (sourceType === 'builder' && !sessionId)
    || (sourceType === 'external' && sessionId !== null)
    || title.length < 2 || title.length > 100
    || summary.length > 240 || (status === 'pending_review' && summary.length < 12)
    || !MARKETPLACE_CATEGORIES.includes(category as MarketplaceCategory)
    || (status !== 'draft' && status !== 'pending_review')
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
    status: status as MarketplaceListingRequestedStatus,
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
    let result: { changes: number };
    if (existing) {
      // 公開（published）は運営者の審査でだけ付く。公開中の掲載は、内容を変えたら審査待ちに戻す。
      const status = nextStatus(existing, input);
      const keepReview = status === 'published' ? 1 : 0;
      result = await executeD1(
        `UPDATE marketplace_listings SET
          title=?,summary=?,category=?,product_url=?,checkout_url=?,price_label=?,seller_name=?,status=?,
          review_note=CASE WHEN ?=1 THEN review_note ELSE NULL END,
          reviewed_at=CASE WHEN ?=1 THEN reviewed_at ELSE NULL END,
          reviewed_by=CASE WHEN ?=1 THEN reviewed_by ELSE NULL END,
          revision=revision+1,updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND user_id=? AND status=?`,
        [input.title, input.summary, input.category, input.productUrl, input.checkoutUrl, input.priceLabel,
          input.sellerName, status, keepReview, keepReview, keepReview, listingId, userId, existing.status],
      );
    } else {
      result = await executeD1(
        `INSERT INTO marketplace_listings(
          id,user_id,build_session_id,source_type,slug,title,summary,category,product_url,checkout_url,price_label,seller_name,status,updated_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
        [listingId, userId, input.sessionId, input.sourceType, slug, input.title, input.summary, input.category,
          input.productUrl, input.checkoutUrl, input.priceLabel, input.sellerName, input.status],
      );
    }
    if (result.changes !== 1) return response({ error: 'Listing could not be saved' }, 503);
    const listing = await getOwnedMarketplaceListingById(userId, listingId);
    if (!listing) return response({ error: 'Listing save could not be verified' }, 503);
    return response({ success: true, listing });
  } catch (error) {
    console.error('[marketplace/listings] save failed:', error);
    return response({ error: 'Listing could not be saved' }, 503);
  }
}

/**
 * 保存後の状態。掲載者が決められるのは下書きか審査待ちだけ。
 * 公開中の掲載は、内容が同じなら公開のまま、変えたら審査待ちに戻す。
 * 却下された掲載は、下書きへ戻すか、審査に出し直した時だけ状態が変わる。
 */
function nextStatus(existing: OwnedMarketplaceListing, input: ListingInput): MarketplaceListingStatus {
  if (input.status === 'draft') return 'draft';
  if (existing.status !== 'published') return 'pending_review';
  const unchanged = existing.title === input.title && existing.summary === input.summary
    && existing.category === input.category && (existing.productUrl || null) === input.productUrl
    && (existing.checkoutUrl || null) === input.checkoutUrl && existing.priceLabel === input.priceLabel
    && existing.sellerName === input.sellerName;
  return unchanged ? 'published' : 'pending_review';
}

function slugPart(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'product';
}
