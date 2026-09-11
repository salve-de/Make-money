import type Stripe from 'stripe';
import { FOUNDING_PASS, isPaidFoundingPass } from './founding-pass';
import { stripeId } from './provider-state';
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
export async function factsForStripeEvent(stripe: Stripe, event: Stripe.Event): Promise<PaymentRecord[]> {
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    return purchaseFacts(stripe, event.data.object as Stripe.Checkout.Session, event.id, event.created);
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
    if (!uid || subscription.status === 'active') return [];
    return [paymentRecord(event.id, subscription.id, event.created, event.livemode, { kind: 'subscription', userId: uid,
      active: subscription.status === 'active', expiresAt: Math.max(0, ...subscription.items.data.map((item) => item.current_period_end)) })];
  }
  return [];
}
