import { NextResponse } from 'next/server';
import { getStripeClient, paymentLiveMode } from '@/lib/stripe';
import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';
import { factsForStripeEvent } from '@/lib/payments/lifecycle';
import { recordPaymentFacts } from '@/lib/payments/entitlement';
import { readTextBody, RequestBodyTooLargeError } from '@/lib/api/input';

export const dynamic = 'force-dynamic';
const MAX_STRIPE_WEBHOOK_BYTES = 2 * 1024 * 1024;
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secret = await getRuntimeEnvValue('STRIPE_WEBHOOK_SECRET');
  const stripe = await getStripeClient();
  if (!signature || !secret || !stripe) return NextResponse.json({ error: 'Stripe webhook is not configured' }, { status: 400 });
  let event;
  let rawBody: string;
  try { rawBody = await readTextBody(request, MAX_STRIPE_WEBHOOK_BYTES); }
  catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: 'Webhook payload is too large' }, { status: 413 });
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }
  try { event = await stripe.webhooks.constructEventAsync(rawBody, signature, secret); }
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
