import type Stripe from 'stripe';
import { loadEntitlementInputs, subscriptionResourceIds } from './entitlement';
import { FOUNDING_PASS } from './founding-pass';
import type { PlanId } from './plans';
import { chargeStillEntitled, subscriptionEntitledFrom } from './provider-state';
import { isActiveSubscriptionStatus, isManageableSubscription, planOfSubscription, subscriptionPeriodEnd, subscriptionRenewal } from './subscription';

/**
 * 利用者に見せる契約の状態。isPro は getProEntitlement と同じ資源・同じ Stripe 再確認で決める。
 * 台帳か Stripe が読めないときは例外を投げ、推測で権利を与えない（呼び出し側が 503 にする）。
 */
export interface BillingStatus {
  isPro: boolean;
  /** 有効な月額・年額があればそのプラン、なければ創刊版。権利が無いときと、旧契約で種類が分からないときは null。 */
  plan: PlanId | null;
  /** 次の更新日。解約予約があるときは利用できる最終日。Unix ミリ秒（new Date(renewsAt) でそのまま使える）。月額・年額だけ。 */
  renewsAt: number | null;
  cancelAtPeriodEnd: boolean;
  /** Stripe の契約管理画面（支払い方法の変更・解約）を開ける契約があるか。支払い失敗中の契約も含む。 */
  canManage: boolean;
}
export interface BillingInspection extends BillingStatus {
  /** 更新される有効な月額・年額があるか（二重購入の防止に使う。API には出さない）。 */
  activeSubscription: boolean;
}

export async function inspectBilling(uid: string): Promise<BillingInspection> {
  const { stripe, records, resources } = await loadEntitlementInputs(uid);
  const ledgerSubscriptions = subscriptionResourceIds(records, uid);
  const none: BillingInspection = { isPro: false, plan: null, renewsAt: null, cancelAtPeriodEnd: false, canManage: false, activeSubscription: false };
  if (!resources.length && !ledgerSubscriptions.length) return none;
  if (!stripe) throw new Error('Payment verification unavailable');
  const retrieved = new Map<string, Stripe.Subscription>();
  const subscription = async (id: string) => {
    let value = retrieved.get(id);
    if (!value) { value = await stripe.subscriptions.retrieve(id); retrieved.set(id, value); }
    return value;
  };
  let foundingPass = false;
  const entitled: Stripe.Subscription[] = [];
  for (const resource of resources) {
    if (resource.startsWith('ch_')) foundingPass = foundingPass || await chargeStillEntitled(stripe, resource);
    else if (resource.startsWith('sub_')) {
      const current = await subscription(resource);
      if (await subscriptionEntitledFrom(stripe, current)) entitled.push(current);
    }
  }
  let canManage = false;
  for (const id of ledgerSubscriptions) {
    if (canManage) break;
    canManage = isManageableSubscription(await subscription(id));
  }
  const current = [...entitled].sort((a, b) => subscriptionPeriodEnd(b) - subscriptionPeriodEnd(a))[0];
  if (current) {
    return { isPro: true, plan: planOfSubscription(current), ...subscriptionRenewal(current, Date.now() / 1000), canManage, activeSubscription: true };
  }
  return { ...none, isPro: foundingPass, plan: foundingPass ? FOUNDING_PASS.id : null, canManage };
}

export async function getBillingStatus(uid: string): Promise<BillingStatus> {
  const { isPro, plan, renewsAt, cancelAtPeriodEnd, canManage } = await inspectBilling(uid);
  return { isPro, plan, renewsAt, cancelAtPeriodEnd, canManage };
}

/**
 * 契約の管理画面を開く対象。台帳で本人に結び付いた契約だけを Stripe で読み、
 * 終わっていないものから、有効なもの→新しいものの順に選ぶ。無ければ null。
 */
export async function findManageableSubscription(uid: string): Promise<Stripe.Subscription | null> {
  const { stripe, records } = await loadEntitlementInputs(uid);
  const ids = subscriptionResourceIds(records, uid);
  if (!ids.length) return null;
  if (!stripe) throw new Error('Payment verification unavailable');
  const candidates: Stripe.Subscription[] = [];
  for (const id of ids) {
    const current = await stripe.subscriptions.retrieve(id);
    if (isManageableSubscription(current)) candidates.push(current);
  }
  candidates.sort((a, b) => Number(isActiveSubscriptionStatus(b.status)) - Number(isActiveSubscriptionStatus(a.status)) || (b.created ?? 0) - (a.created ?? 0));
  return candidates[0] ?? null;
}
