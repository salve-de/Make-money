import { readNotifySecret } from './unsubscribe-link';

/**
 * Signed, expiring links for confirming a newsletter sign-up (double opt-in).
 *
 * Same scheme as the unsubscribe link (HMAC-SHA256 with NOTIFY_UNSUBSCRIBE_SECRET, or
 * NOTIFY_CRON_SECRET as fallback), but the signed text carries a different purpose prefix
 * and an expiry, so an unsubscribe signature can never confirm anything and vice versa.
 * The link holds the subscriber id and the expiry only; the address is never in the URL.
 */
export const CONFIRM_LINK_TTL_SECONDS = 48 * 60 * 60;
const SIGNATURE_HEX = /^[0-9a-f]{64}$/;
const encoder = new TextEncoder();

async function hmacKey(secret: string, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

function payload(subscriberId: string, expiresAt: number): Uint8Array<ArrayBuffer> {
  return encoder.encode(`newsletter-confirm:v1:${subscriberId}:${expiresAt}`);
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(hex.match(/../g) ?? [], (pair) => parseInt(pair, 16));
}

export type ConfirmLinkCheck = 'valid' | 'expired' | 'invalid';

/** Returns null when no secret is configured (then no confirmation mail can be sent). */
export async function buildNewsletterConfirmUrl(
  appUrl: string,
  subscriberId: string,
  nowMs: number = Date.now(),
): Promise<string | null> {
  const secret = await readNotifySecret();
  if (!secret) return null;
  const expiresAt = Math.floor(nowMs / 1000) + CONFIRM_LINK_TTL_SECONDS;
  const signature = toHex(await crypto.subtle.sign('HMAC', await hmacKey(secret, 'sign'), payload(subscriberId, expiresAt)));
  return `${appUrl}/api/newsletter/confirm?u=${encodeURIComponent(subscriberId)}&e=${expiresAt}&s=${signature}`;
}

/** Signature is checked first (constant time), so an expired-but-genuine link is told apart from a forged one. */
export async function checkNewsletterConfirmLink(
  subscriberId: string,
  expiresAtRaw: string,
  signature: string,
  nowMs: number = Date.now(),
): Promise<ConfirmLinkCheck> {
  if (!subscriberId || subscriberId.length > 128 || !SIGNATURE_HEX.test(signature) || !/^\d{1,12}$/.test(expiresAtRaw)) return 'invalid';
  const secret = await readNotifySecret();
  if (!secret) return 'invalid';
  const expiresAt = Number(expiresAtRaw);
  const genuine = await crypto.subtle.verify('HMAC', await hmacKey(secret, 'verify'), fromHex(signature), payload(subscriberId, expiresAt));
  if (!genuine) return 'invalid';
  return Math.floor(nowMs / 1000) > expiresAt ? 'expired' : 'valid';
}
