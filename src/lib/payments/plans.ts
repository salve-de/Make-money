import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';
import { getStripeClient } from '@/lib/stripe';
import { FOUNDING_PASS } from './founding-pass';

/** 売っているプランの定義。月額・年額の金額はコードに持たず、実行時の環境変数だけで決める。 */
export type SubscriptionPlanId = 'pro-monthly' | 'pro-yearly';
export type PlanId = typeof FOUNDING_PASS.id | SubscriptionPlanId;
export type PlanInterval = 'once' | 'month' | 'year';

export const PLAN_IDS: readonly PlanId[] = [FOUNDING_PASS.id, 'pro-monthly', 'pro-yearly'];
export const SUBSCRIPTION_PLANS = {
  'pro-monthly': { name: '金鉱録 PRO 月額', interval: 'month', priceEnv: 'PRO_MONTHLY_PRICE_JPY' },
  'pro-yearly': { name: '金鉱録 PRO 年額', interval: 'year', priceEnv: 'PRO_YEARLY_PRICE_JPY' },
} as const satisfies Record<SubscriptionPlanId, { name: string; interval: 'month' | 'year'; priceEnv: string }>;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as readonly string[]).includes(value);
}
export function isSubscriptionPlanId(value: unknown): value is SubscriptionPlanId {
  return value === 'pro-monthly' || value === 'pro-yearly';
}

/** 正の整数（円）だけを金額として認める。空・小数・0・負数・桁区切り・8桁超は「値段が決まっていない」扱い。 */
export function parsePriceJpy(raw: string | undefined): number | null {
  if (!raw || !/^[1-9][0-9]{0,7}$/.test(raw)) return null;
  return Number(raw);
}

/** 創刊版は FOUNDING_PASS_ENABLED が 0 のときだけ販売停止。それ以外は今までどおり販売する。 */
export async function isFoundingPassOnSale(): Promise<boolean> {
  return (await getRuntimeEnvValue('FOUNDING_PASS_ENABLED')) !== '0';
}

export interface SubscriptionOffer {
  id: SubscriptionPlanId;
  name: string;
  interval: 'month' | 'year';
  priceJpy: number;
}
/** 金額が環境変数で正しく決まっているときだけ販売中。決まっていなければ null。 */
export async function getSubscriptionOffer(id: SubscriptionPlanId): Promise<SubscriptionOffer | null> {
  const plan = SUBSCRIPTION_PLANS[id];
  const priceJpy = parsePriceJpy(await getRuntimeEnvValue(plan.priceEnv));
  return priceJpy === null ? null : { id, name: plan.name, interval: plan.interval, priceJpy };
}

/** 決済に必要な Stripe の秘密鍵と Webhook 秘密の両方があるときだけ、購入を始められる。 */
export async function paymentsConfigured(): Promise<boolean> {
  return Boolean(await getStripeClient()) && Boolean(await getRuntimeEnvValue('STRIPE_WEBHOOK_SECRET'));
}

export interface PlanListing {
  id: PlanId;
  name: string;
  priceJpy: number | null;
  interval: PlanInterval;
  available: boolean;
}
export async function listPlans(): Promise<PlanListing[]> {
  const configured = await paymentsConfigured();
  const foundingOnSale = await isFoundingPassOnSale();
  const monthly = await getSubscriptionOffer('pro-monthly');
  const yearly = await getSubscriptionOffer('pro-yearly');
  return [
    { id: FOUNDING_PASS.id, name: FOUNDING_PASS.name, priceJpy: FOUNDING_PASS.priceJpy, interval: 'once', available: configured && foundingOnSale },
    { id: 'pro-monthly', name: SUBSCRIPTION_PLANS['pro-monthly'].name, priceJpy: monthly?.priceJpy ?? null, interval: 'month', available: configured && monthly !== null },
    { id: 'pro-yearly', name: SUBSCRIPTION_PLANS['pro-yearly'].name, priceJpy: yearly?.priceJpy ?? null, interval: 'year', available: configured && yearly !== null },
  ];
}

/** 支払いまで済んだ月額・年額の Checkout だけを、そのプランとして認める（創刊版の isPaidFoundingPass と対）。 */
export function paidSubscriptionPlan(session: {
  mode: string | null;
  status: string | null;
  payment_status: string;
  currency: string | null;
  metadata: Record<string, string> | null;
}): SubscriptionPlanId | null {
  if (session.mode !== 'subscription' || session.status !== 'complete' || session.payment_status !== 'paid' || session.currency !== 'jpy') return null;
  const product = session.metadata?.product;
  return isSubscriptionPlanId(product) ? product : null;
}
