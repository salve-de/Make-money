import Stripe from 'stripe';
import { getRuntimeEnvValue } from './runtime/cloudflare';

/** Resolve actual Worker secrets too; never instantiate a fake Stripe client. */
export async function getStripeClient(): Promise<Stripe | null> {
  const secret = await getRuntimeEnvValue('STRIPE_SECRET_KEY');
  return secret ? new Stripe(secret, { typescript: true, timeout: 10000, maxNetworkRetries: 1 }) : null;
}
export async function paymentLiveMode(): Promise<boolean> {
  const secret = await getRuntimeEnvValue('STRIPE_SECRET_KEY');
  if (secret?.startsWith('sk_live_') || secret?.startsWith('rk_live_')) return true;
  if (secret?.startsWith('sk_test_') || secret?.startsWith('rk_test_')) return false;
  throw new Error('Stripe mode unavailable');
}
