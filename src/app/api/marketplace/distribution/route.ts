import { NextRequest } from 'next/server';

import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { marketplaceUserId } from '@/lib/marketplace/commerce/auth';
import { logCommerceFailure, privateJson } from '@/lib/marketplace/commerce/http';
import { DistributionError, record, reference } from '@/lib/marketplace/distribution/contract';
import { connectListing, createReferral, distributionStatus, reconcileListing } from '@/lib/marketplace/distribution/service';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import { distributionErrorMessage } from '@/shared/marketplace-distribution';

export const dynamic = 'force-dynamic';

/** 失敗は理由コードと日本語だけを返す。SellRelay のIDやエラー本文はブラウザへ出さない。 */
function failure(error: unknown) {
  if (error instanceof RequestBodyTooLargeError) return privateJson({ error: distributionErrorMessage('INPUT_TOO_LARGE'), code: 'INPUT_TOO_LARGE' }, 413);
  if (error instanceof DistributionError) return privateJson({ error: distributionErrorMessage(error.code), code: error.code }, error.status);
  logCommerceFailure('distribution', error);
  return privateJson({ error: distributionErrorMessage('RELAY_UNAVAILABLE'), code: 'RELAY_UNAVAILABLE' }, 503);
}

/** 連携の状態。listingId（掲載者本人・ログイン必須）か slug（閲覧者）のどちらか一方を指定する。 */
export async function GET(request: NextRequest) {
  try {
    const listingId = request.nextUrl.searchParams.get('listingId');
    const slug = request.nextUrl.searchParams.get('slug');
    if (!!listingId === !!slug) throw new DistributionError('INVALID_INPUT', 400);
    const userId = await marketplaceUserId(request);
    return privateJson(await distributionStatus(listingId ? { listingId } : { slug: slug! }, userId));
  } catch (error) {
    return failure(error);
  }
}

/** action=connect（商品下書きの作成）／reconcile（照合のやり直し）／referral（紹介リンクの作成）。ログイン必須。 */
export async function POST(request: NextRequest) {
  try {
    const userId = await marketplaceUserId(request);
    if (!userId) throw new DistributionError('AUTH_REQUIRED', 401);
    let body: unknown;
    try {
      body = await readJsonBody(request, 16 * 1024);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) throw error;
      throw new DistributionError('INVALID_INPUT', 400);
    }
    const input = record(body);
    const keys = input.action === 'connect' ? ['action', 'listingId', 'terms']
      : input.action === 'reconcile' ? ['action', 'listingId']
        : input.action === 'referral' ? ['action', 'slug', 'kind'] : null;
    if (!keys || Object.keys(input).length !== keys.length || keys.some((key) => !Object.hasOwn(input, key))) {
      throw new DistributionError('INVALID_INPUT', 400);
    }
    if (!await consumeRequestRateLimit(request, 'marketplace-distribution', { limit: 30, windowMs: 60 * 60 * 1000, subject: userId })) {
      throw new DistributionError('RATE_LIMITED', 429);
    }
    if (input.action === 'connect') return privateJson(await connectListing(userId, reference(input.listingId), input.terms));
    if (input.action === 'reconcile') return privateJson(await reconcileListing(userId, reference(input.listingId)));
    return privateJson(await createReferral(userId, reference(input.slug), input.kind));
  } catch (error) {
    return failure(error);
  }
}
