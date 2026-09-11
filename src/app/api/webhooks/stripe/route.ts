import { NextResponse } from 'next/server';
import { getStripeClient, paymentLiveMode } from '@/lib/stripe';
import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';
import { factsForStripeEvent } from '@/lib/payments/lifecycle';
import { recordPaymentFacts } from '@/lib/payments/entitlement';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secret = await getRuntimeEnvValue('STRIPE_WEBHOOK_SECRET');
  const stripe = await getStripeClient();
  if (!signature || !secret || !stripe) return NextResponse.json({ error: 'Stripe webhook is not configured' }, { status: 400 });
  let event;
  try { event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret); }
  catch { return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 }); }
  try {
    if (event.livemode !== await paymentLiveMode()) return NextResponse.json({ error: 'Payment mode mismatch' }, { status: 400 });
    const facts = await factsForStripeEvent(stripe, event);
    await recordPaymentFacts(facts);
    return NextResponse.json({ received: true });
  } catch {
    // Persist all normalized facts atomically or let Stripe retry the whole event.
    return NextResponse.json({ error: 'Payment fulfillment requires retry or account reconciliation' }, { status: 503 });
  }
}
