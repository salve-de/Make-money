import { VERIFICATION_WINDOW_DAYS, type StripeReadPermission } from '@/shared/verification';
import { siteDomain } from './site-domain';

/**
 * 運営者が渡した読み取り専用キーで、Stripeの売上とMRRを読む。
 *
 * - 読むだけ（GET）。書き込み系のAPIは呼ばない。
 * - 売上は「残高の取引」から数える。成功した支払い（charge）の合計から返金（refund）を引く。
 *   金額は決済アカウントの既定通貨の取引だけを足す。
 * - MRRは有効なサブスクリプションの各明細を月額に換算して足す。
 * - Stripeが返すエラーの本文はキーの一部を含むことがあるため、保持も出力もしない。
 */

/** 残高の取引を読むページ数の上限（1ページ100件）。これを超える規模は自動では確認しない。 */
export const MAX_BALANCE_PAGES = 20;
/** サブスクリプションを読むページ数の上限（1ページ100件）。 */
export const MAX_SUBSCRIPTION_PAGES = 10;
const PAGE_SIZE = 100;

/**
 * 売上に数える取引の種類（Stripeのreporting_category）。
 * charge = 成功した支払い、refund = 返金。あとから失敗した支払い・返金の取り消しも、その分だけ戻す。
 * 手数料・入金・紛争は数えない。
 */
const REVENUE_CATEGORIES: ReadonlySet<string> = new Set(['charge', 'charge_failure', 'refund', 'refund_failure']);

/** 1か月あたりの請求回数。year=/12、week=×52/12、day=×365/12。 */
const PERIODS_PER_MONTH: ReadonlyMap<string, number> = new Map([['month', 1], ['year', 1 / 12], ['week', 52 / 12], ['day', 365 / 12]]);

export interface StripePage<T> { data: T[]; has_more: boolean }

export interface StripeAccountLike {
  id: string;
  default_currency?: string;
  business_profile?: { url?: string | null } | null;
}

export interface BalanceTransactionLike {
  id: string;
  amount: number;
  currency: string;
  reporting_category: string;
}

export interface SubscriptionItemLike {
  quantity?: number;
  discounts?: readonly unknown[];
  price: {
    currency: string;
    unit_amount: number | null;
    transform_quantity?: unknown;
    recurring: { interval: string; interval_count: number; usage_type: string } | null;
  };
}

export interface SubscriptionLike {
  id: string;
  status: string;
  currency: string;
  discounts?: readonly unknown[];
  pause_collection?: unknown;
  items: { data: SubscriptionItemLike[]; has_more: boolean };
}

/** 本物の Stripe クライアントのうち、ここで使う読み取りだけ。 */
export interface StripeReadClient {
  accounts: { retrieveCurrent(): Promise<StripeAccountLike> };
  balanceTransactions: {
    list(params: { created: { gte: number; lte: number }; limit: number; starting_after?: string }): Promise<StripePage<BalanceTransactionLike>>;
  };
  subscriptions: {
    list(params: { status: 'active'; limit: number; starting_after?: string }): Promise<StripePage<SubscriptionLike>>;
  };
}

/** Stripeがキーを受け付けなかった（無効・失効）。 */
export class StripeKeyRejectedError extends Error {
  constructor() { super('Stripe rejected the key'); this.name = 'StripeKeyRejectedError'; }
}
/** キーにこの権限がなく、Stripeが拒否した。 */
export class StripePermissionMissingError extends Error {
  constructor(readonly permission: StripeReadPermission) { super('Stripe key lacks a required permission'); this.name = 'StripePermissionMissingError'; }
}
/** Stripeに届かない、時間切れ、Stripe側の障害、予想外の応答。 */
export class StripeUpstreamError extends Error {
  constructor(readonly rateLimited = false) { super('Stripe request failed'); this.name = 'StripeUpstreamError'; }
}
/** 件数が多すぎて自動では確認できない。 */
export class RevenueTooLargeError extends Error {
  constructor() { super('Too many records to verify automatically'); this.name = 'RevenueTooLargeError'; }
}

/** SDKのエラーを、キーを含まない自前のエラーへ置き換える（元のエラーは引き継がない）。 */
function classifyStripeError(error: unknown, permission: StripeReadPermission): Error {
  const candidate = (error && typeof error === 'object' ? error : {}) as { type?: unknown; statusCode?: unknown };
  const type = typeof candidate.type === 'string' ? candidate.type : '';
  const status = typeof candidate.statusCode === 'number' ? candidate.statusCode : 0;
  if (type === 'StripePermissionError' || status === 403) return new StripePermissionMissingError(permission);
  if (type === 'StripeAuthenticationError' || status === 401) return new StripeKeyRejectedError();
  if (type === 'StripeRateLimitError' || status === 429) return new StripeUpstreamError(true);
  return new StripeUpstreamError();
}

async function guarded<T>(permission: StripeReadPermission, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw classifyStripeError(error, permission);
  }
}

async function readRevenueMinor(stripe: StripeReadClient, currency: string, periodStart: number, periodEnd: number): Promise<number> {
  let total = 0;
  let startingAfter: string | undefined;
  for (let page = 0; page < MAX_BALANCE_PAGES; page += 1) {
    const result = await guarded('残高の取引', () => stripe.balanceTransactions.list({
      created: { gte: periodStart, lte: periodEnd },
      limit: PAGE_SIZE,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    }));
    for (const entry of result.data) {
      if (entry.currency?.toLowerCase() !== currency || !REVENUE_CATEGORIES.has(entry.reporting_category)) continue;
      if (!Number.isSafeInteger(entry.amount)) throw new StripeUpstreamError();
      total += entry.amount;
    }
    const last = result.data[result.data.length - 1];
    if (!result.has_more || !last) {
      if (!Number.isSafeInteger(total)) throw new StripeUpstreamError();
      return total;
    }
    startingAfter = last.id;
  }
  throw new RevenueTooLargeError();
}

type Monthly = { kind: 'amount'; minor: number } | { kind: 'unknown' } | { kind: 'foreign' };

/** 1つの有効なサブスクリプションの月額換算（最小単位）。出せないものは unknown、別通貨は foreign。 */
function subscriptionMonthly(subscription: SubscriptionLike, currency: string): Monthly {
  if (subscription.currency?.toLowerCase() !== currency) return { kind: 'foreign' };
  const items = subscription.items?.data ?? [];
  if (items.some((item) => item.price && item.price.currency?.toLowerCase() !== currency)) return { kind: 'foreign' };
  // 割引は、契約に付いた分だけが見える。正確な月額が出せないので、金額は出さない。
  const discounted = (subscription.discounts?.length ?? 0) > 0 || items.some((item) => (item.discounts?.length ?? 0) > 0);
  if (discounted || subscription.items?.has_more !== false || items.length === 0) return { kind: 'unknown' };

  let minor = 0;
  for (const { price, quantity } of items) {
    const recurring = price?.recurring;
    const perMonth = recurring ? PERIODS_PER_MONTH.get(recurring.interval) : undefined;
    if (
      !recurring || recurring.usage_type === 'metered' || price.transform_quantity
      || perMonth === undefined || !Number.isInteger(recurring.interval_count) || recurring.interval_count < 1
      || typeof price.unit_amount !== 'number' || !Number.isFinite(price.unit_amount) || price.unit_amount < 0
      || typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0
    ) return { kind: 'unknown' };
    minor += (price.unit_amount * quantity * perMonth) / recurring.interval_count;
  }
  return { kind: 'amount', minor };
}

async function readSubscriptions(stripe: StripeReadClient, currency: string): Promise<{ activeSubscriptions: number | null; mrrMinor: number | null }> {
  let count = 0;
  let total = 0;
  let exact = true;
  let startingAfter: string | undefined;
  for (let page = 0; page < MAX_SUBSCRIPTION_PAGES; page += 1) {
    const result = await guarded('サブスクリプション', () => stripe.subscriptions.list({
      status: 'active',
      limit: PAGE_SIZE,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    }));
    for (const subscription of result.data) {
      // 課金を止めている契約は、売上を生まないので数えない。
      if (subscription.status !== 'active' || subscription.pause_collection) continue;
      count += 1;
      const monthly = subscriptionMonthly(subscription, currency);
      if (monthly.kind === 'foreign') return { activeSubscriptions: null, mrrMinor: null };
      if (monthly.kind === 'unknown') exact = false;
      else total += monthly.minor;
    }
    const last = result.data[result.data.length - 1];
    if (!result.has_more || !last) {
      return { activeSubscriptions: count, mrrMinor: exact ? Math.round(total) : null };
    }
    startingAfter = last.id;
  }
  // 数えきれない規模。売上の確認は妨げず、件数とMRRだけ出さない。
  return { activeSubscriptions: null, mrrMinor: null };
}

export type StripeVerificationOutcome =
  | { status: 'stripe_site_missing' }
  | { status: 'site_mismatch' }
  | { status: 'currency_missing' }
  | {
    status: 'verified';
    accountId: string;
    accountDomain: string;
    currency: string;
    last30dRevenueMinor: number;
    mrrMinor: number | null;
    activeSubscriptions: number | null;
    periodStart: number;
    periodEnd: number;
  };

/**
 * 自分のアカウントを引き、サイトのドメインが事例の公式サイトと一致するときだけ、売上とMRRを読む。
 * Stripe側の失敗は StripeKeyRejectedError / StripePermissionMissingError / StripeUpstreamError、
 * 規模が大きすぎるときは RevenueTooLargeError を投げる。
 *
 * @param options.officialDomain siteDomain() で整えた、事例の公式サイトのドメイン
 * @param options.now 現在時刻（UNIX秒）
 */
export async function readStripeVerification(
  stripe: StripeReadClient,
  options: { officialDomain: string; now: number },
): Promise<StripeVerificationOutcome> {
  const account = await guarded('アカウント', () => stripe.accounts.retrieveCurrent());
  if (!account || typeof account.id !== 'string' || !account.id) throw new StripeUpstreamError();

  const accountDomain = siteDomain(account.business_profile?.url);
  if (!accountDomain) return { status: 'stripe_site_missing' };
  if (accountDomain !== options.officialDomain) return { status: 'site_mismatch' };

  const currency = account.default_currency?.toLowerCase();
  if (!currency || !/^[a-z]{3}$/.test(currency)) return { status: 'currency_missing' };

  const periodEnd = options.now;
  const periodStart = periodEnd - VERIFICATION_WINDOW_DAYS * 24 * 60 * 60;
  const last30dRevenueMinor = await readRevenueMinor(stripe, currency, periodStart, periodEnd);
  const { activeSubscriptions, mrrMinor } = await readSubscriptions(stripe, currency);
  return {
    status: 'verified',
    accountId: account.id,
    accountDomain,
    currency: currency.toUpperCase(),
    last30dRevenueMinor,
    mrrMinor,
    activeSubscriptions,
    periodStart,
    periodEnd,
  };
}
