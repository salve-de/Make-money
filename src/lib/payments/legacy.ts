import type Stripe from 'stripe';
import { queryD1 } from '@/lib/storage/d1';
import { paymentRecord, purchaseFacts } from './lifecycle';
import { stripeId, subscriptionStillEntitled } from './provider-state';
import type { PaymentRecord } from './ledger';

/** Reconcile only an existing server-side customer/UID binding, never an email
 * supplied at checkout. The historical isPro bit alone cannot authorize access. */
export async function legacyPaymentFacts(stripe: Stripe, uid: string, livemode: boolean): Promise<PaymentRecord[]> {
  const [legacy] = await queryD1<{ stripe_customer_id: string | null; stripe_subscription_id: string | null; legacy_is_pro: number }>(
    'SELECT stripe_customer_id,stripe_subscription_id,legacy_is_pro FROM users WHERE id = ?', [uid]);
  if (!legacy?.stripe_customer_id && !legacy?.stripe_subscription_id) return [];
  const facts: PaymentRecord[] = [];
  const now = Math.floor(Date.now() / 1000);
  if (legacy.stripe_customer_id) {
    for await (const session of stripe.checkout.sessions.list({ customer: legacy.stripe_customer_id, limit: 100 })) {
      if (session.livemode !== livemode || stripeId(session.customer) !== legacy.stripe_customer_id) continue;
      if (session.client_reference_id && session.client_reference_id !== uid) continue;
      if (!session.client_reference_id && legacy.legacy_is_pro !== 1) continue;
      if (session.metadata?.userId && session.metadata.userId !== uid) continue;
      facts.push(...await purchaseFacts(stripe, session, `legacy_${session.id}`, session.created, uid));
    }
  }
  const subscriptions: Stripe.Subscription[] = [];
  if (legacy.stripe_subscription_id) subscriptions.push(await stripe.subscriptions.retrieve(legacy.stripe_subscription_id));
  else if (legacy.stripe_customer_id && legacy.legacy_is_pro === 1) {
    for await (const subscription of stripe.subscriptions.list({ customer: legacy.stripe_customer_id, status: 'all', limit: 100 })) subscriptions.push(subscription);
  }
  for (const subscription of subscriptions) {
    if (subscription.livemode !== livemode || (legacy.stripe_customer_id && stripeId(subscription.customer) !== legacy.stripe_customer_id)) continue;
    if (subscription.metadata?.userId && subscription.metadata.userId !== uid) continue;
    const expiresAt = Math.max(0, ...subscription.items.data.map((item) => item.current_period_end));
    const active = await subscriptionStillEntitled(stripe, subscription.id);
    facts.push(paymentRecord(`legacy_${subscription.id}_${subscription.status}_${expiresAt}`, subscription.id, now, livemode,
      { kind: 'subscription', userId: uid, active, expiresAt }));
  }
  return facts;
}
