import { NextRequest } from 'next/server';

import { marketplaceUserId } from '@/lib/marketplace/commerce/auth';
import { logCommerceFailure, privateJson } from '@/lib/marketplace/commerce/http';
import { refundOrder } from '@/lib/marketplace/commerce/store';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

/** テスト購入の取り消し（出品者だけ）。紹介報酬も取り消す。本文は読まない。 */
export async function POST(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const userId = await marketplaceUserId(request);
  if (!userId) return privateJson({ error: 'ログインが必要です' }, 401);
  const { orderId } = await context.params;
  if (!/^[0-9a-f-]{36}$/.test(orderId)) return privateJson({ error: '注文が見つかりません' }, 404);
  try {
    if (!await consumeRequestRateLimit(request, 'commerce-refund', { limit: 30, windowMs: 60 * 60 * 1000, subject: userId })) {
      return privateJson({ error: '操作の回数が上限に達しました。しばらくしてからもう一度お試しください' }, 429);
    }
    const result = await refundOrder(userId, orderId);
    if (!result.ok) return privateJson({ error: '注文が見つかりません' }, 404);
    return privateJson({ success: true, order: result.order });
  } catch (error) {
    logCommerceFailure('order-refund', error);
    return privateJson({ error: '取り消しを記録できませんでした' }, 503);
  }
}
