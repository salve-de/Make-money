import { NextRequest } from 'next/server';

import { resolveCommercePaymentMode } from '@/lib/marketplace/commerce/payment-mode';
import { logCommerceFailure, privateJson, readCommerceWrite } from '@/lib/marketplace/commerce/http';
import { createTestOrder } from '@/lib/marketplace/commerce/store';
import { parseOrderInput } from '@/shared/marketplace-commerce-input';

export const dynamic = 'force-dynamic';

/**
 * 購入する（ログイン必須）。現在はテスト購入だけで、実際の請求は行わない。
 * 同じ requestKey の再送は同じ注文を返す（二重購入にならない）。
 */
export async function POST(request: NextRequest) {
  const input = await readCommerceWrite(request, parseOrderInput, { scope: 'commerce-order', limit: 20, windowMs: 60 * 60 * 1000 });
  if (!input.ok) return input.response;
  try {
    const mode = await resolveCommercePaymentMode();
    if (mode === 'off') return privateJson({ error: 'この環境では購入を受け付けていません' }, 503);
    if (mode === 'stripe_test') return privateJson({ error: 'Stripeのテスト決済はまだ接続していません' }, 503);
    const result = await createTestOrder(input.userId, input.value);
    if (!result.ok) {
      return result.reason === 'own_listing'
        ? privateJson({ error: '自分の掲載は購入できません' }, 409)
        : privateJson({ error: 'この掲載は購入できません（公開されていないか、販売が止まっています）' }, 404);
    }
    return privateJson({ success: true, order: result.order, replayed: result.replayed }, result.replayed ? 200 : 201);
  } catch (error) {
    logCommerceFailure('order-create', error);
    return privateJson({ error: '購入を記録できませんでした。もう一度お試しください' }, 503);
  }
}
