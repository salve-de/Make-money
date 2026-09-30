import { NextRequest } from 'next/server';

import {
  authenticatedUserId,
  logBusinessSaleFailure,
  privateJson,
  readBusinessSaleBody,
} from '@/lib/marketplace/business-http';
import { notifySellerOfInquiry } from '@/lib/marketplace/business-notify';
import { getPublishedBusinessSaleForInquiry, insertBusinessSaleInquiry } from '@/lib/marketplace/business-store';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import { BUSINESS_SALE_ID_PATTERN } from '@/shared/business-sale';
import { parseBusinessSaleInquiry } from '@/shared/business-sale-input';

export const dynamic = 'force-dynamic';

/**
 * 問い合わせを保存する（ログイン必須）。[idOrSlug] は掲載の id。
 * 売り手本人は自分の掲載に送れない。同じ買い手から同じ掲載へは1日1回まで。
 * 保存できたら売り手へ通知メールを試みる（未設定・送れない場合は保存結果に影響しない）。
 */
export async function POST(request: NextRequest, context: { params: Promise<{ idOrSlug: string }> }) {
  const userId = await authenticatedUserId(request);
  if (!userId) return privateJson({ error: 'ログインが必要です' }, 401);
  const { idOrSlug: listingId } = await context.params;
  if (!BUSINESS_SALE_ID_PATTERN.test(listingId)) return privateJson({ error: '掲載が見つかりません' }, 404);

  const body = await readBusinessSaleBody(request);
  if (!body.ok) return body.response;
  const parsed = parseBusinessSaleInquiry(body.value);
  if (!parsed.ok) return privateJson({ error: parsed.message, field: parsed.field }, 400);

  try {
    const allowed = await consumeRequestRateLimit(request, 'business-sale-inquiry', {
      limit: 10,
      windowMs: 60 * 60 * 1000,
      subject: userId,
    });
    if (!allowed) return privateJson({ error: '問い合わせの回数が上限に達しました。しばらくしてからもう一度お試しください' }, 429);

    const target = await getPublishedBusinessSaleForInquiry(listingId);
    if (!target) return privateJson({ error: '掲載が見つからないか、募集を終了しています' }, 404);
    if (target.sellerUserId === userId) return privateJson({ error: '自分の掲載には問い合わせできません' }, 403);

    const result = await insertBusinessSaleInquiry({
      listingId,
      buyerUserId: userId,
      message: parsed.value.message,
      contactEmail: parsed.value.contactEmail,
    });
    if (result.status === 'duplicate') {
      return privateJson({ error: '同じ掲載への問い合わせは1日1回までです。明日以降にもう一度お試しください' }, 429);
    }
    if (result.status === 'closed') return privateJson({ error: '掲載が見つからないか、募集を終了しています' }, 404);

    await notifySellerOfInquiry(request, { listingId, sellerUserId: target.sellerUserId, listingTitle: target.title });
    return privateJson({ success: true, inquiryId: result.id }, 201);
  } catch (error) {
    logBusinessSaleFailure('inquiry', error);
    return privateJson({ error: '問い合わせを保存できませんでした' }, 503);
  }
}
