import Stripe from 'stripe';
import { getRuntimeEnvValue } from './runtime/cloudflare';
import { currentUserAgent } from './firebase/emulator';

/**
 * ローカル開発専用：Stripe の代わりに手元の偽装サーバー（e2e/support/stripe-mock.mjs）へつなぐ宛先。
 * 本番ビルド・Workers・localhost 以外・テスト用でない鍵では必ず null（本物の Stripe を使う）。
 */
export function resolveLocalStripeHost(input: { nodeEnv: string | undefined; host: string | undefined; secret: string | undefined; userAgent?: string }): { host: string; port: number } | null {
  if (input.nodeEnv === 'production' || input.userAgent === 'Cloudflare-Workers') return null;
  const match = /^(localhost|127\.0\.0\.1):([1-9][0-9]{0,4})$/.exec(input.host?.trim() ?? '');
  if (!match || Number(match[2]) > 65535 || !input.secret?.startsWith('sk_test_')) return null;
  return { host: match[1], port: Number(match[2]) };
}

/** Resolve actual Worker secrets too; never instantiate a fake Stripe client. */
export async function getStripeClient(): Promise<Stripe | null> {
  const secret = await getRuntimeEnvValue('STRIPE_SECRET_KEY');
  if (!secret) return null;
  const local = resolveLocalStripeHost({ nodeEnv: process.env.NODE_ENV, host: process.env.STRIPE_LOCAL_MOCK_HOST, secret, userAgent: currentUserAgent() });
  return local
    ? new Stripe(secret, { typescript: true, timeout: 10000, maxNetworkRetries: 0, host: local.host, port: local.port, protocol: 'http' })
    : new Stripe(secret, { typescript: true, timeout: 10000, maxNetworkRetries: 1 });
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
