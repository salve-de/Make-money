import type Stripe from 'stripe';
import { FOUNDING_PASS, isPaidFoundingPass } from './founding-pass';
import { paidSubscriptionPlan } from './plans';
import { stripeId } from './provider-state';
import { isActiveSubscriptionStatus, subscriptionPeriodEnd } from './subscription';
import type { PaymentFact, PaymentRecord } from './ledger';

export function paymentRecord(id: string, resourceId: string, occurredAt: number, livemode: boolean, fact: PaymentFact): PaymentRecord {
  return { id, resourceId, occurredAt, livemode, userId: 'userId' in fact ? fact.userId : null, kind: fact.kind, fact };
}
export async function purchaseFacts(stripe: Stripe, session: Stripe.Checkout.Session, eventId: string, occurredAt: number, legacyUid?: string): Promise<PaymentRecord[]> {
  if (!isPaidFoundingPass(session)) return [];
  const uid = session.client_reference_id || legacyUid;
  if (!uid || (session.metadata?.userId && session.metadata.userId !== uid)
    || (!legacyUid && session.metadata?.userId !== uid)) throw new Error('Payment has no verified account binding');
  const intentId = stripeId(session.payment_intent);
  if (!intentId) throw new Error('Paid checkout has no payment intent');
  const intent = await stripe.paymentIntents.retrieve(intentId);
  const chargeId = stripeId(intent.latest_charge);
  if (!chargeId || intent.status !== 'succeeded') throw new Error('Paid charge is not available');
  const charge = await stripe.charges.retrieve(chargeId);
  if (!charge.paid || !charge.captured || charge.amount_captured !== FOUNDING_PASS.priceJpy || charge.currency !== 'jpy' || charge.livemode !== session.livemode) throw new Error('Charge is not captured');
  const facts: PaymentRecord[] = [paymentRecord(eventId, chargeId, occurredAt, session.livemode,
    { kind: 'purchase', userId: uid, amount: charge.amount_captured, sessionId: session.id })];
  if (charge.amount_refunded > 0) facts.push(paymentRecord(`${eventId}_refund`, chargeId, occurredAt, session.livemode, { kind: 'refund', amountRefunded: charge.amount_refunded }));
  if (charge.disputed) {
    for await (const dispute of stripe.disputes.list({ charge: charge.id, limit: 100 })) {
      facts.push(paymentRecord(`${eventId}_${dispute.id}`, chargeId, occurredAt, session.livemode, { kind: 'dispute', disputeId: dispute.id, status: dispute.status }));
    }
  }
  return facts;
}
/** A paid monthly/yearly checkout. The fact belongs to the subscription ID; whether access continues
 * (renewal, cancellation, failed payment, refund) is rechecked against Stripe on every read. */
export async function subscriptionFacts(stripe: Stripe, session: Stripe.Checkout.Session, eventId: string, occurredAt: number): Promise<PaymentRecord[]> {
  const plan = paidSubscriptionPlan(session);
  if (!plan) return [];
  const uid = session.client_reference_id;
  if (!uid || session.metadata?.userId !== uid) throw new Error('Subscription has no verified account binding');
  const subscriptionId = stripeId(session.subscription);
  if (!subscriptionId) throw new Error('Paid checkout has no subscription');
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (subscription.livemode !== session.livemode || subscription.metadata?.userId !== uid || subscription.metadata?.product !== plan) {
    throw new Error('Subscription does not match its checkout');
  }
  return [paymentRecord(eventId, subscription.id, occurredAt, session.livemode,
    { kind: 'subscription', userId: uid, active: isActiveSubscriptionStatus(subscription.status), expiresAt: subscriptionPeriodEnd(subscription) })];
}
export async function factsForStripeEvent(stripe: Stripe, event: Stripe.Event): Promise<PaymentRecord[]> {
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    return session.mode === 'subscription'
      ? subscriptionFacts(stripe, session, event.id, event.created)
      : purchaseFacts(stripe, session, event.id, event.created);
  }
  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    return [paymentRecord(event.id, charge.id, event.created, event.livemode, { kind: 'refund', amountRefunded: charge.amount_refunded })];
  }
  if (['charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.closed', 'charge.dispute.funds_withdrawn', 'charge.dispute.funds_reinstated'].includes(event.type)) {
    const dispute = event.data.object as Stripe.Dispute;
    const chargeId = stripeId(dispute.charge);
    if (!chargeId) throw new Error('Dispute charge unavailable');
    return [paymentRecord(event.id, chargeId, event.created, event.livemode, { kind: 'dispute', disputeId: dispute.id, status: dispute.status })];
  }
  // Existing subscription rights are rechecked directly against Stripe on reads.
  // These events add expiry/cancellation facts without changing any one-time grant.
  if (['customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
    const subscription = event.data.object as Stripe.Subscription;
    const uid = subscription.metadata?.userId;
    if (!uid || isActiveSubscriptionStatus(subscription.status)) return [];
    return [paymentRecord(event.id, subscription.id, event.created, event.livemode, { kind: 'subscription', userId: uid,
      active: false, expiresAt: subscriptionPeriodEnd(subscription) })];
  }
  return [];
}
