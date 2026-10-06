import type { SiteOwnershipChallenge, VerificationErrorResponse, VerifiedEntity, VerifiedRevenue } from '@/shared/verification';

/** Stripeが小数を持たない通貨（金額の最小単位＝そのままの額）。 */
const ZERO_DECIMAL = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
/** 小数3桁の通貨。 */
const THREE_DECIMAL = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);

/** 確認からこの日数を過ぎたら「今の売上とは違うかもしれない」と添える。 */
export const VERIFICATION_STALE_DAYS = 60;

const DAY_SECONDS = 24 * 60 * 60;
const DATE = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' });
const DATE_TIME = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export function minorUnitDigits(currency: string): number {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL.has(code)) return 0;
  if (THREE_DECIMAL.has(code)) return 3;
  return 2;
}

/** 通貨の最小単位の額を、その通貨の表記にする。円は「1,234円」、ほかは記号つき（$1,234.56）。 */
export function formatMinorAmount(minor: number, currency: string): string {
  const code = currency.toUpperCase();
  const digits = minorUnitDigits(code);
  const major = minor / 10 ** digits;
  if (code === 'JPY') return `${major.toLocaleString('ja-JP')}円`;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(major);
  } catch {
    return `${major.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${code}`;
  }
}

export const formatVerificationDate = (unixSeconds: number) => DATE.format(new Date(unixSeconds * 1000));
export const formatVerificationDateTime = (unixSeconds: number) => DATE_TIME.format(new Date(unixSeconds * 1000));

export interface VerifiedRevenueRow {
  label: string;
  value: string;
  /** false のときは数えられなかった項目（「—」と出す）。0とは書かない。 */
  confirmed: boolean;
}

export function verifiedRevenueRows(verification: VerifiedRevenue): VerifiedRevenueRow[] {
  const { currency } = verification;
  return [
    { label: '30日間の売上', value: formatMinorAmount(verification.last30dRevenueMinor, currency), confirmed: true },
    {
      label: '月額の継続売上（MRR）',
      value: verification.mrrMinor === null ? '—' : formatMinorAmount(verification.mrrMinor, currency),
      confirmed: verification.mrrMinor !== null,
    },
    {
      label: '有効な契約',
      value: verification.activeSubscriptions === null ? '—' : `${verification.activeSubscriptions.toLocaleString('ja-JP')}件`,
      confirmed: verification.activeSubscriptions !== null,
    },
    { label: '集計期間', value: `${formatVerificationDate(verification.periodStart)} 〜 ${formatVerificationDate(verification.periodEnd)}`, confirmed: true },
    { label: '照合したサイト', value: verification.accountDomain, confirmed: true },
    { label: '確認日時', value: formatVerificationDateTime(verification.verifiedAt), confirmed: true },
  ];
}

/** 確認から何日たったか。`VERIFICATION_STALE_DAYS` を過ぎたときだけ数を返す。 */
export function staleVerificationDays(verifiedAt: number, nowSeconds = Math.floor(Date.now() / 1000)): number | null {
  const days = Math.floor((nowSeconds - verifiedAt) / DAY_SECONDS);
  return days > VERIFICATION_STALE_DAYS ? days : null;
}

const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const isNullableInteger = (value: unknown): value is number | null => value === null || isInteger(value);

/** APIの応答を画面に出す前に形を確かめる。崩れていたら出さない。 */
export function readVerifiedRevenue(value: unknown): VerifiedRevenue | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.entityId !== 'string' || v.provider !== 'stripe' || typeof v.accountDomain !== 'string' || !v.accountDomain
    || typeof v.currency !== 'string' || !/^[A-Z]{3}$/.test(v.currency)
    || !isInteger(v.last30dRevenueMinor) || !isNullableInteger(v.mrrMinor) || !isNullableInteger(v.activeSubscriptions)
    || !isInteger(v.periodStart) || !isInteger(v.periodEnd) || !isInteger(v.verifiedAt)) return null;
  return v as unknown as VerifiedRevenue;
}

export function readVerifiedEntities(value: unknown): VerifiedEntity[] {
  const list = (value as { verified?: unknown } | null)?.verified;
  if (!Array.isArray(list)) return [];
  return list.filter((row): row is VerifiedEntity => Boolean(row) && typeof row.entityId === 'string' && isInteger(row.verifiedAt));
}

/** 失敗時の応答から、画面に出す文と、Stripeで付けてほしい権限を取り出す。 */
export function readVerificationError(value: unknown, fallback: string): { error: string; permissions?: readonly string[]; ownership?: SiteOwnershipChallenge } {
  const body = (value && typeof value === 'object' ? value : {}) as Partial<VerificationErrorResponse>;
  const ownership = body.ownership;
  return {
    error: typeof body.error === 'string' && body.error ? body.error : fallback,
    permissions: Array.isArray(body.permissions) ? body.permissions.filter((item) => typeof item === 'string') : undefined,
    ownership: ownership && typeof ownership === 'object'
      && [ownership.domain, ownership.token, ownership.fileUrl, ownership.dnsName].every((item) => typeof item === 'string')
      ? ownership : undefined,
  };
}
