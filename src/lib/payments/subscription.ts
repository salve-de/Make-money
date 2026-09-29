import type Stripe from 'stripe';
import { isSubscriptionPlanId, type SubscriptionPlanId } from './plans';

/** Stripe のサブスクリプションを読むだけの部品。ここでは権利（isPro）を決めない。 */
const ACTIVE_STATUSES: readonly string[] = ['active', 'trialing'];
/** もう終わっていて、契約の管理画面で触れるものが残っていない状態。 */
const ENDED_STATUSES: readonly string[] = ['canceled', 'incomplete_expired'];

/** 台帳へ「有効」と書いてよい状態。実際に権利を与えるかは、読むたびに Stripe 側の支払いで再確認する。 */
export function isActiveSubscriptionStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(status);
}
/** 支払い失敗（past_due など）は管理画面で支払い方法を直せるので、まだ管理できる契約として扱う。 */
export function isManageableSubscription(subscription: Pick<Stripe.Subscription, 'status'>): boolean {
  return !ENDED_STATUSES.includes(subscription.status);
}

/** 今の請求期間の終わり（Unix 秒）。値が読めない項目は 0 として扱い、負数・小数・NaN を台帳へ入れない。 */
export function subscriptionPeriodEnd(subscription: Pick<Stripe.Subscription, 'items'>): number {
  return Math.max(0, ...subscription.items.data.map((item) => (Number.isSafeInteger(item.current_period_end) ? item.current_period_end : 0)));
}

/** どのプランか。自分たちが付けた metadata を優先し、無い旧契約は請求間隔（1か月ごと／1年ごと）から判定する。 */
export function planOfSubscription(subscription: Pick<Stripe.Subscription, 'metadata' | 'items'>): SubscriptionPlanId | null {
  const product = subscription.metadata?.product;
  if (isSubscriptionPlanId(product)) return product;
  const recurring = subscription.items.data[0]?.price?.recurring;
  if (!recurring || (recurring.interval_count ?? 1) !== 1) return null;
  return recurring.interval === 'month' ? 'pro-monthly' : recurring.interval === 'year' ? 'pro-yearly' : null;
}

/**
 * 次の更新日（解約予約があるときは利用できる最終日）と、解約予約の有無。
 * renewsAt は Unix ミリ秒（new Date(renewsAt) でそのまま使える）。
 */
export function subscriptionRenewal(
  subscription: Pick<Stripe.Subscription, 'items' | 'cancel_at' | 'cancel_at_period_end'>,
  nowSeconds: number,
): { renewsAt: number | null; cancelAtPeriodEnd: boolean } {
  const periodEnd = subscriptionPeriodEnd(subscription);
  const cancelAt = typeof subscription.cancel_at === 'number' && subscription.cancel_at > nowSeconds ? subscription.cancel_at : null;
  const endsAt = cancelAt !== null && (periodEnd === 0 || cancelAt < periodEnd) ? cancelAt : periodEnd;
  return { renewsAt: endsAt > 0 ? endsAt * 1000 : null, cancelAtPeriodEnd: subscription.cancel_at_period_end === true || cancelAt !== null };
}
