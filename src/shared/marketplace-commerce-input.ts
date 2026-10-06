import {
  COMMERCE_PRICE_MAX_JPY,
  COMMERCE_PRICE_MIN_JPY,
  REFERRAL_RATE_MAX_PERCENT,
} from '@/shared/marketplace-commerce';

/** 購入・紹介・販売条件 API の入力検査。画面と API の両方で同じ規則を使う。 */
export type CommerceParse<T> = { ok: true; value: T } | { ok: false; message: string };

function record(value: unknown, allowed: readonly string[]): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return Object.keys(row).every((key) => allowed.includes(key)) ? row : null;
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,127}$/;
const CODE = /^[a-z0-9]{8,32}$/;
const REQUEST_KEY = /^[A-Za-z0-9_-]{8,64}$/;

export function isSlug(value: unknown): value is string {
  return typeof value === 'string' && SLUG.test(value);
}

export function isReferralCode(value: unknown): value is string {
  return typeof value === 'string' && CODE.test(value);
}

export interface OfferInput {
  listingId: string;
  enabled: boolean;
  priceJpy: number;
  /** 0.01% 単位。画面の「%」は 0.5 刻みまで入れられる。 */
  referralRateBp: number;
}

export function parseOfferInput(value: unknown): CommerceParse<OfferInput> {
  const row = record(value, ['listingId', 'enabled', 'priceJpy', 'referralRatePercent']);
  if (!row) return { ok: false, message: '販売条件の項目が正しくありません' };
  const listingId = typeof row.listingId === 'string' ? row.listingId.trim() : '';
  if (!listingId || listingId.length > 128) return { ok: false, message: '掲載を指定してください' };
  if (typeof row.enabled !== 'boolean') return { ok: false, message: '販売の有無を指定してください' };
  const price = row.priceJpy;
  if (typeof price !== 'number' || !Number.isInteger(price) || price < COMMERCE_PRICE_MIN_JPY || price > COMMERCE_PRICE_MAX_JPY) {
    return { ok: false, message: `価格は${COMMERCE_PRICE_MIN_JPY.toLocaleString('ja-JP')}円から${COMMERCE_PRICE_MAX_JPY.toLocaleString('ja-JP')}円の整数で入れてください` };
  }
  const percent = row.referralRatePercent;
  if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > REFERRAL_RATE_MAX_PERCENT) {
    return { ok: false, message: `紹介報酬は0%から${REFERRAL_RATE_MAX_PERCENT}%で入れてください` };
  }
  const bp = Math.round(percent * 100);
  if (Math.abs(bp - percent * 100) > 1e-6) return { ok: false, message: '紹介報酬は0.01%刻みまでです' };
  return { ok: true, value: { listingId, enabled: row.enabled, priceJpy: price, referralRateBp: bp } };
}

export interface OrderInput {
  slug: string;
  requestKey: string;
  referralCode: string | null;
}

export function parseOrderInput(value: unknown): CommerceParse<OrderInput> {
  const row = record(value, ['slug', 'requestKey', 'referralCode']);
  if (!row || !isSlug(row.slug)) return { ok: false, message: '購入する掲載を指定してください' };
  if (typeof row.requestKey !== 'string' || !REQUEST_KEY.test(row.requestKey)) return { ok: false, message: '購入の識別子が正しくありません' };
  const code = row.referralCode;
  if (code !== undefined && code !== null && !isReferralCode(code)) return { ok: false, message: '紹介コードが正しくありません' };
  return { ok: true, value: { slug: row.slug, requestKey: row.requestKey, referralCode: typeof code === 'string' ? code : null } };
}

export function parseSlugInput(value: unknown): CommerceParse<{ slug: string }> {
  const row = record(value, ['slug']);
  return row && isSlug(row.slug) ? { ok: true, value: { slug: row.slug } } : { ok: false, message: '掲載を指定してください' };
}

export function parseVisitInput(value: unknown): CommerceParse<{ code: string }> {
  const row = record(value, ['code']);
  return row && isReferralCode(row.code) ? { ok: true, value: { code: row.code } } : { ok: false, message: '紹介コードが正しくありません' };
}
