import Stripe from 'stripe';
import { getRuntimeEnvValue } from './runtime/cloudflare';

/** Resolve actual Worker secrets too; never instantiate a fake Stripe client. */
export async function getStripeClient(): Promise<Stripe | null> {
  const secret = await getRuntimeEnvValue('STRIPE_SECRET_KEY');
  return secret ? new Stripe(secret, { typescript: true, timeout: 10000, maxNetworkRetries: 1 }) : null;
}
/**
 * Client for a key the caller supplied (a read-only restricted key for revenue
 * verification). It lives for one request: never cache it, and never store or
 * log the key or the raw SDK errors, whose text can echo part of the key.
 */
export function createStripeClientForKey(key: string): Stripe {
  return new Stripe(key, { typescript: true, timeout: 8000, maxNetworkRetries: 1 });
}
export async function paymentLiveMode(): Promise<boolean> {
  const secret = await getRuntimeEnvValue('STRIPE_SECRET_KEY');
  if (secret?.startsWith('sk_live_') || secret?.startsWith('rk_live_')) return true;
  if (secret?.startsWith('sk_test_') || secret?.startsWith('rk_test_')) return false;
  throw new Error('Stripe mode unavailable');
}
