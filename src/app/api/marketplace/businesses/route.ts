import { NextRequest } from 'next/server';

import {
  authenticatedUserId,
  logBusinessSaleFailure,
  privateJson,
  publicError,
  publicJson,
  readBusinessSaleBody,
} from '@/lib/marketplace/business-http';
import { createBusinessSaleDraft, listPublishedBusinessSales } from '@/lib/marketplace/business-store';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import { parseBusinessSaleCreate, parseBusinessSaleFilter } from '@/shared/business-sale-input';

export const dynamic = 'force-dynamic';

/** 公開中の一覧。?category= と ?maxPrice=（円）で絞り込む。最大100件。連絡先や user_id は返さない。 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.getAll('category').length > 1 || params.getAll('maxPrice').length > 1) {
    return publicError('絞り込みの指定が重複しています', 400);
  }
  const filter = parseBusinessSaleFilter({ category: params.get('category'), maxPrice: params.get('maxPrice') });
  if (!filter.ok) return publicError(filter.message, 400);
  try {
    return publicJson({ success: true, listings: await listPublishedBusinessSales(filter.value) });
  } catch (error) {
    logBusinessSaleFailure('list', error);
    return publicError('掲載一覧を読み込めません', 503);
  }
}

/**
 * 下書きを作る（ログイン必須）。状態は常に下書き、売上の根拠は常に本人申告。
 * 決められた項目以外（status・revenueBasis・verificationId・URL など）が付いていたら 400。
 */
export async function POST(request: NextRequest) {
  const userId = await authenticatedUserId(request);
  if (!userId) return privateJson({ error: 'ログインが必要です' }, 401);

  const body = await readBusinessSaleBody(request);
  if (!body.ok) return body.response;
  const parsed = parseBusinessSaleCreate(body.value);
  if (!parsed.ok) return privateJson({ error: parsed.message, field: parsed.field }, 400);

  try {
    const allowed = await consumeRequestRateLimit(request, 'business-sale-create', {
      limit: 10,
      windowMs: 60 * 60 * 1000,
      subject: userId,
    });
    if (!allowed) return privateJson({ error: '作成の回数が上限に達しました。しばらくしてからもう一度お試しください' }, 429);
    return privateJson({ success: true, listing: await createBusinessSaleDraft(userId, parsed.value) }, 201);
  } catch (error) {
    logBusinessSaleFailure('create', error);
    return privateJson({ error: '掲載を保存できませんでした' }, 503);
  }
}
