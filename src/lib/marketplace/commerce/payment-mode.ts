import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';
import type { CommercePaymentMode } from '@/shared/marketplace-commerce';

/**
 * Make-Money 内の購入をどの方式で受け付けるか。
 *
 * - 開発環境（NODE_ENV!=='production'）は既定で 'test'（実際の請求なし）。
 * - 本番は MARKETPLACE_PAYMENTS を明示しない限り 'off'（購入ボタンを出さず、掲載者の外部リンクだけ）。
 * - MARKETPLACE_PAYMENTS=stripe_test は、STRIPE_SECRET_KEY が Stripe のテスト鍵（sk_test_）の時だけ有効。
 *   本番鍵（sk_live_ など）では決して有効にしない。Stripe への接続自体は未実装で、注文 API は 503 を返す。
 */
export async function resolveCommercePaymentMode(): Promise<CommercePaymentMode> {
  const flag = (await getRuntimeEnvValue('MARKETPLACE_PAYMENTS'))?.toLowerCase();
  if (flag === 'off') return 'off';
  if (flag === 'stripe_test') {
    const key = await getRuntimeEnvValue('STRIPE_SECRET_KEY');
    return key?.startsWith('sk_test_') ? 'stripe_test' : 'off';
  }
  if (flag === 'test') return 'test';
  return process.env.NODE_ENV === 'production' ? 'off' : 'test';
}
