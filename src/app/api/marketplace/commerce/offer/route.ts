import { NextRequest } from 'next/server';

import { marketplaceUserId } from '@/lib/marketplace/commerce/auth';
import { resolveCommercePaymentMode } from '@/lib/marketplace/commerce/payment-mode';
import { logCommerceFailure, privateJson, readCommerceWrite } from '@/lib/marketplace/commerce/http';
import { getOwnedOffer, saveOffer } from '@/lib/marketplace/commerce/store';
import { parseOfferInput } from '@/shared/marketplace-commerce-input';

export const dynamic = 'force-dynamic';

/** 自分の掲載の販売条件。未設定なら offer は null。購入方式（mode）も返す。 */
export async function GET(request: NextRequest) {
  const userId = await marketplaceUserId(request);
  if (!userId) return privateJson({ error: 'ログインが必要です' }, 401);
  const listingId = request.nextUrl.searchParams.get('listingId')?.trim() || '';
  if (!listingId || listingId.length > 128) return privateJson({ error: '掲載を指定してください' }, 400);
  try {
    return privateJson({ success: true, offer: await getOwnedOffer(userId, listingId), mode: await resolveCommercePaymentMode() });
  } catch (error) {
    logCommerceFailure('offer-get', error);
    return privateJson({ error: '販売条件を読み込めませんでした' }, 503);
  }
}

/** 販売条件を保存する（ログイン必須・自分の掲載だけ）。 */
export async function PUT(request: NextRequest) {
  const input = await readCommerceWrite(request, parseOfferInput, { scope: 'commerce-offer', limit: 30, windowMs: 60 * 60 * 1000 });
  if (!input.ok) return input.response;
  try {
    const offer = await saveOffer(input.userId, input.value);
    if (!offer) return privateJson({ error: '掲載が見つかりません' }, 404);
    return privateJson({ success: true, offer, mode: await resolveCommercePaymentMode() });
  } catch (error) {
    logCommerceFailure('offer-put', error);
    return privateJson({ error: '販売条件を保存できませんでした' }, 503);
  }
}
