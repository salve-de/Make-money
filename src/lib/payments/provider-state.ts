import type Stripe from 'stripe';

export function stripeId(value: string | { id: string } | null | undefined): string | null {
  return typeof value === 'string' ? value : value?.id || null;
}
export async function chargeStillEntitled(stripe: Stripe, chargeId: string): Promise<boolean> {
  const charge = await stripe.charges.retrieve(chargeId);
  if (!charge.paid || !charge.captured || charge.refunded || charge.amount_refunded >= charge.amount_captured) return false;
  if (charge.disputed) {
    let found = false;
    for await (const dispute of stripe.disputes.list({ charge: charge.id, limit: 100 })) {
      found = true;
      if (!['won', 'warning_closed'].includes(dispute.status)) return false;
    }
    if (!found) return false;
  }
  return true;
}
export async function subscriptionStillEntitled(stripe: Stripe, subscriptionId: string): Promise<boolean> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (subscription.status !== 'active' || !subscription.items.data.some((item) => item.current_period_end > Date.now() / 1000)) return false;
  const invoiceId = stripeId(subscription.latest_invoice);
  if (!invoiceId) return false;
  const invoice = await stripe.invoices.retrieve(invoiceId);
  if (invoice.status !== 'paid') return false;
  // Legacy subscriptions require an actual, unrefunded current invoice payment.
  for await (const payment of stripe.invoicePayments.list({ invoice: invoiceId, limit: 100 })) {
    if (payment.status !== 'paid') continue;
    let chargeId = stripeId(payment.payment.charge);
    const intentId = stripeId(payment.payment.payment_intent);
    if (!chargeId && intentId) chargeId = stripeId((await stripe.paymentIntents.retrieve(intentId)).latest_charge);
    if (chargeId && await chargeStillEntitled(stripe, chargeId)) return true;
  }
  return false;
}
