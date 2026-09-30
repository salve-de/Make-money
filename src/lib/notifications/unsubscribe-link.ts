import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';

/**
 * Signed "stop sending" links for the newsletter.
 *
 * The database keeps only a hash of the one-time token an anonymous subscriber was given
 * at sign-up, so it cannot be rebuilt into a link for an email. Instead each link carries
 * the subscriber id and an HMAC of it. Ids are random and the signature needs the server
 * secret, so a link only works for the person whose email it was in.
 */
const SIGNATURE_HEX = /^[0-9a-f]{64}$/;
const encoder = new TextEncoder();

/**
 * NOTIFY_UNSUBSCRIBE_SECRET is preferred so the cron secret can be rotated without breaking
 * links in old emails. It falls back to NOTIFY_CRON_SECRET, which the digest already requires.
 */
async function readSecret(): Promise<string | null> {
  return (await getRuntimeEnvValue('NOTIFY_UNSUBSCRIBE_SECRET')) ?? (await getRuntimeEnvValue('NOTIFY_CRON_SECRET')) ?? null;
}

async function hmacKey(secret: string, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

function payload(subscriberId: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(`newsletter-unsubscribe:v1:${subscriberId}`);
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(hex.match(/../g) ?? [], (pair) => parseInt(pair, 16));
}

export async function signNewsletterUnsubscribe(subscriberId: string): Promise<string | null> {
  const secret = await readSecret();
  if (!secret) return null;
  return toHex(await crypto.subtle.sign('HMAC', await hmacKey(secret, 'sign'), payload(subscriberId)));
}

/** Constant-time check (WebCrypto verify). Any malformed input is simply "not valid". */
export async function verifyNewsletterUnsubscribe(subscriberId: string, signature: string): Promise<boolean> {
  if (!subscriberId || subscriberId.length > 128 || !SIGNATURE_HEX.test(signature)) return false;
  const secret = await readSecret();
  if (!secret) return false;
  return crypto.subtle.verify('HMAC', await hmacKey(secret, 'verify'), fromHex(signature), payload(subscriberId));
}

/** The link put in newsletter emails, or null when no secret is configured (then no newsletter is sent). */
export async function buildNewsletterUnsubscribeUrl(appUrl: string, subscriberId: string): Promise<string | null> {
  const signature = await signNewsletterUnsubscribe(subscriberId);
  if (!signature) return null;
  return `${appUrl}/api/notifications/unsubscribe?u=${encodeURIComponent(subscriberId)}&s=${signature}`;
}
