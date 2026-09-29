import { NextRequest } from 'next/server';

import {
  authenticatedUserId,
  logBusinessSaleFailure,
  privateJson,
  publicError,
  publicJson,
  readBusinessSaleBody,
} from '@/lib/marketplace/business-http';
import { getPublishedBusinessSaleBySlug, updateBusinessSale } from '@/lib/marketplace/business-store';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import {
  BUSINESS_SALE_ID_PATTERN,
  BUSINESS_SALE_SLUG_MAX_LENGTH,
  BUSINESS_SALE_SLUG_PATTERN,
} from '@/shared/business-sale';
import { parseBusinessSaleUpdate } from '@/shared/business-sale-input';

export const dynamic = 'force-dynamic';

/**
 * 同じ階層の動的セグメントは名前をそろえる必要があるため、[idOrSlug] を共用する。
 * GET は slug（公開ページ用）、PATCH と inquiries は掲載の id として読む。
 */
type Context = { params: Promise<{ idOrSlug: string }> };

/** 公開中の1件。連絡先や user_id は返さない。非公開・終了・存在しないものは 404。 */
export async function GET(_request: NextRequest, context: Context) {
  const { idOrSlug: slug } = await context.params;
  if (slug.length > BUSINESS_SALE_SLUG_MAX_LENGTH || !BUSINESS_SALE_SLUG_PATTERN.test(slug)) {
    return publicError('掲載が見つかりません', 404);
  }
  try {
    const listing = await getPublishedBusinessSaleBySlug(slug);
    return listing ? publicJson({ success: true, listing }) : publicError('掲載が見つかりません', 404);
  } catch (error) {
    logBusinessSaleFailure('get', error);
    return publicError('掲載を読み込めません', 503);
  }
}

/**
 * 本人の掲載だけを更新する。内容の更新と、状態の変更（下書き → 公開中 → 募集終了）ができる。
 * 他人の掲載は存在しないものとして 404 にする。
 */
export async function PATCH(request: NextRequest, context: Context) {
  const userId = await authenticatedUserId(request);
  if (!userId) return privateJson({ error: 'ログインが必要です' }, 401);
  const { idOrSlug: id } = await context.params;
  if (!BUSINESS_SALE_ID_PATTERN.test(id)) return privateJson({ error: '掲載が見つかりません' }, 404);

  const body = await readBusinessSaleBody(request);
  if (!body.ok) return body.response;
  const parsed = parseBusinessSaleUpdate(body.value);
  if (!parsed.ok) return privateJson({ error: parsed.message, field: parsed.field }, 400);

  try {
    const allowed = await consumeRequestRateLimit(request, 'business-sale-update', {
      limit: 60,
      windowMs: 60 * 60 * 1000,
      subject: userId,
    });
    if (!allowed) return privateJson({ error: '更新の回数が上限に達しました。しばらくしてからもう一度お試しください' }, 429);

    const outcome = await updateBusinessSale(userId, id, parsed.value);
    switch (outcome.kind) {
      case 'ok': return privateJson({ success: true, listing: outcome.listing });
      case 'not_found': return privateJson({ error: '掲載が見つかりません' }, 404);
      case 'invalid': return privateJson({ error: outcome.message, field: outcome.field }, 400);
      case 'conflict': return privateJson({ error: outcome.message, field: outcome.field }, 409);
    }
  } catch (error) {
    logBusinessSaleFailure('update', error);
    return privateJson({ error: '掲載を保存できませんでした' }, 503);
  }
}
