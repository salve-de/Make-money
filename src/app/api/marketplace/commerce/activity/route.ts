import { NextRequest } from 'next/server';

import { marketplaceUserId } from '@/lib/marketplace/commerce/auth';
import { resolveCommercePaymentMode } from '@/lib/marketplace/commerce/payment-mode';
import { logCommerceFailure, privateJson } from '@/lib/marketplace/commerce/http';
import { getCommerceActivity } from '@/lib/marketplace/commerce/store';

export const dynamic = 'force-dynamic';

/** 自分の掲載・購入・販売・紹介の一覧（ログイン必須）。他人の利用者IDは含まない。 */
export async function GET(request: NextRequest) {
  const userId = await marketplaceUserId(request);
  if (!userId) return privateJson({ error: 'ログインが必要です' }, 401);
  try {
    return privateJson({ success: true, mode: await resolveCommercePaymentMode(), activity: await getCommerceActivity(userId) });
  } catch (error) {
    logCommerceFailure('activity', error);
    return privateJson({ error: '取引の記録を読み込めませんでした' }, 503);
  }
}
