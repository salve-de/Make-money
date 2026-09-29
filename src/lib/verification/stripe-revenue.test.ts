import { describe, expect, it, vi } from 'vitest';

import {
  MAX_BALANCE_PAGES,
  MAX_SUBSCRIPTION_PAGES,
  readStripeVerification,
  RevenueTooLargeError,
  StripeKeyRejectedError,
  StripePermissionMissingError,
  StripeUpstreamError,
  type BalanceTransactionLike,
  type StripeAccountLike,
  type StripePage,
  type StripeReadClient,
  type SubscriptionItemLike,
  type SubscriptionLike,
} from './stripe-revenue';

const NOW = 1_800_000_000;
const DAY = 24 * 60 * 60;

const account = (over: Partial<StripeAccountLike> = {}): StripeAccountLike => ({
  id: 'acct_1UnitTestAccount',
  default_currency: 'jpy',
  business_profile: { url: 'https://www.example.com/pricing' },
  ...over,
});
const tx = (id: string, amount: number, category = 'charge', currency = 'jpy'): BalanceTransactionLike => ({
  id, amount, currency, reporting_category: category,
});
const item = (over: Partial<SubscriptionItemLike> = {}, price: Partial<SubscriptionItemLike['price']> = {}): SubscriptionItemLike => ({
  quantity: 1,
  discounts: [],
  price: {
    currency: 'jpy',
    unit_amount: 1000,
    transform_quantity: null,
    recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' },
    ...price,
  },
  ...over,
});
const subscription = (over: Partial<SubscriptionLike> = {}, items: SubscriptionItemLike[] = [item()]): SubscriptionLike => ({
  id: `sub_${Math.random().toString(36).slice(2)}`,
  status: 'active',
  currency: 'jpy',
  discounts: [],
  pause_collection: null,
  items: { has_more: false, data: items },
  ...over,
});
const page = <T>(data: T[], hasMore = false): StripePage<T> => ({ data, has_more: hasMore });
const monthly = (interval: string, unitAmount: number, quantity = 1, intervalCount = 1) =>
  subscription({}, [item({ quantity }, { unit_amount: unitAmount, recurring: { interval, interval_count: intervalCount, usage_type: 'licensed' } })]);

function fakeStripe(parts: {
  account?: StripeAccountLike | (() => Promise<StripeAccountLike>);
  balance?: StripePage<BalanceTransactionLike>[] | (() => Promise<StripePage<BalanceTransactionLike>>);
  subscriptions?: StripePage<SubscriptionLike>[] | (() => Promise<StripePage<SubscriptionLike>>);
} = {}) {
  const pages = <T>(source: StripePage<T>[] | (() => Promise<StripePage<T>>) | undefined) => {
    let index = 0;
    return vi.fn(async () => {
      if (typeof source === 'function') return source();
      const list = source ?? [page<T>([])];
      return list[Math.min(index++, list.length - 1)];
    });
  };
  const retrieveCurrent = vi.fn(async () => (typeof parts.account === 'function' ? parts.account() : parts.account ?? account()));
  const balanceList = pages(parts.balance);
  const subscriptionList = pages(parts.subscriptions);
  const stripe: StripeReadClient = {
    accounts: { retrieveCurrent },
    balanceTransactions: { list: balanceList },
    subscriptions: { list: subscriptionList },
  };
  return { stripe, retrieveCurrent, balanceList, subscriptionList };
}

const run = (stripe: StripeReadClient, officialDomain = 'example.com') => readStripeVerification(stripe, { officialDomain, now: NOW });

describe('readStripeVerification: account and site', () => {
  it('reads a verified result when the payment account site matches the official site', async () => {
    const { stripe } = fakeStripe({ balance: [page([tx('txn_1', 5000)])] });
    const result = await run(stripe);
    expect(result).toEqual({
      status: 'verified',
      accountId: 'acct_1UnitTestAccount',
      accountDomain: 'example.com',
      currency: 'JPY',
      last30dRevenueMinor: 5000,
      mrrMinor: 0,
      activeSubscriptions: 0,
      periodStart: NOW - 30 * DAY,
      periodEnd: NOW,
    });
  });

  it('ignores www., case, path and scheme when comparing sites', async () => {
    const { stripe } = fakeStripe({ account: account({ business_profile: { url: 'HTTP://WWW.Example.COM/a/b?c=d' } }) });
    expect((await run(stripe)).status).toBe('verified');
  });

  it('stops before reading revenue when the site differs', async () => {
    const { stripe, balanceList, subscriptionList } = fakeStripe({ account: account({ business_profile: { url: 'https://other.example.org' } }) });
    expect(await run(stripe)).toEqual({ status: 'site_mismatch' });
    expect(balanceList).not.toHaveBeenCalled();
    expect(subscriptionList).not.toHaveBeenCalled();
  });

  it('does not treat a subdomain or a look-alike as the same site', async () => {
    for (const url of ['https://shop.example.com', 'https://example.com.evil.test', 'https://notexample.com']) {
      const { stripe } = fakeStripe({ account: account({ business_profile: { url } }) });
      expect(await run(stripe)).toEqual({ status: 'site_mismatch' });
    }
  });

  it.each([
    ['no business profile', { business_profile: null }],
    ['no url', { business_profile: { url: null } }],
    ['unparseable url', { business_profile: { url: 'not a url' } }],
  ])('reports a missing site for %s', async (_label, over) => {
    const { stripe, balanceList } = fakeStripe({ account: account(over as Partial<StripeAccountLike>) });
    expect(await run(stripe)).toEqual({ status: 'stripe_site_missing' });
    expect(balanceList).not.toHaveBeenCalled();
  });

  it('reports a missing default currency instead of guessing one', async () => {
    const { stripe, balanceList } = fakeStripe({ account: account({ default_currency: undefined }) });
    expect(await run(stripe)).toEqual({ status: 'currency_missing' });
    expect(balanceList).not.toHaveBeenCalled();
  });
});

describe('readStripeVerification: last 30 days revenue', () => {
  it('asks only for the last 30 days, 100 at a time', async () => {
    const { stripe, balanceList } = fakeStripe();
    await run(stripe);
    expect(balanceList).toHaveBeenCalledWith({ created: { gte: NOW - 30 * DAY, lte: NOW }, limit: 100 });
  });

  it('sums successful payments and subtracts refunds, in the default currency only', async () => {
    const { stripe } = fakeStripe({
      balance: [page([
        tx('t1', 10000), tx('t2', 5000), tx('t3', 300, 'charge', 'usd'),
        tx('t4', -2000, 'refund'), tx('t5', -50, 'refund', 'usd'),
        tx('t6', -12000, 'payout'), tx('t7', -300, 'fee'), tx('t8', -3000, 'dispute'),
      ])],
    });
    expect(await run(stripe)).toMatchObject({ status: 'verified', last30dRevenueMinor: 13000, currency: 'JPY' });
  });

  it('gives back a refund that failed and takes back a payment that failed later', async () => {
    const { stripe } = fakeStripe({
      balance: [page([tx('t1', 10000), tx('t2', -4000, 'refund'), tx('t3', 4000, 'refund_failure'), tx('t4', -1000, 'charge_failure')])],
    });
    expect(await run(stripe)).toMatchObject({ last30dRevenueMinor: 9000 });
  });

  it('keeps a negative total when refunds exceed payments', async () => {
    const { stripe } = fakeStripe({ balance: [page([tx('t1', 1000), tx('t2', -3500, 'refund')])] });
    expect(await run(stripe)).toMatchObject({ last30dRevenueMinor: -2500 });
  });

  it('uses the account default currency, whatever it is, and the amounts Stripe reports', async () => {
    const usd = fakeStripe({ account: account({ default_currency: 'usd' }), balance: [page([tx('t1', 1999, 'charge', 'usd'), tx('t2', -500, 'refund', 'usd'), tx('t3', 90000)])] });
    expect(await run(usd.stripe)).toMatchObject({ currency: 'USD', last30dRevenueMinor: 1499 });
  });

  it('follows pages with starting_after until Stripe says there are no more', async () => {
    const { stripe, balanceList } = fakeStripe({
      balance: [page([tx('t1', 100), tx('t2', 200)], true), page([tx('t3', 300)], true), page([tx('t4', 400)], false)],
    });
    expect(await run(stripe)).toMatchObject({ last30dRevenueMinor: 1000 });
    expect(balanceList).toHaveBeenCalledTimes(3);
    expect(balanceList.mock.calls[1]).toEqual([{ created: { gte: NOW - 30 * DAY, lte: NOW }, limit: 100, starting_after: 't2' }]);
    expect(balanceList.mock.calls[2]).toEqual([{ created: { gte: NOW - 30 * DAY, lte: NOW }, limit: 100, starting_after: 't3' }]);
  });

  it('refuses to guess when there are more records than the page limit', async () => {
    const { stripe, balanceList, subscriptionList } = fakeStripe({ balance: () => Promise.resolve(page([tx('t1', 1)], true)) });
    await expect(run(stripe)).rejects.toBeInstanceOf(RevenueTooLargeError);
    expect(balanceList).toHaveBeenCalledTimes(MAX_BALANCE_PAGES);
    expect(subscriptionList).not.toHaveBeenCalled();
  });

  it('accepts exactly the page limit when the last page is the end', async () => {
    let call = 0;
    const { stripe, balanceList } = fakeStripe({ balance: () => Promise.resolve(page([tx(`t${call}`, 10)], ++call < MAX_BALANCE_PAGES)) });
    expect(await run(stripe)).toMatchObject({ last30dRevenueMinor: 10 * MAX_BALANCE_PAGES });
    expect(balanceList).toHaveBeenCalledTimes(MAX_BALANCE_PAGES);
  });

  it('fails closed on an amount that is not an integer', async () => {
    const { stripe } = fakeStripe({ balance: [page([tx('t1', 10.5)])] });
    await expect(run(stripe)).rejects.toBeInstanceOf(StripeUpstreamError);
  });
});

describe('readStripeVerification: monthly recurring revenue', () => {
  it('converts every interval to a month, then rounds once at the end', async () => {
    const { stripe } = fakeStripe({
      subscriptions: [page([
        monthly('month', 1000, 2),        // 2,000
        monthly('year', 12000),           // 12,000 / 12 = 1,000
        monthly('week', 100),             // 100 x 52 / 12 = 433.33
        monthly('day', 10),               // 10 x 365 / 12 = 304.17
        monthly('month', 3000, 1, 3),     // every 3 months: 1,000
        monthly('week', 200, 1, 2),       // every 2 weeks: 433.33
      ])],
    });
    // 2000 + 1000 + 433.33 + 304.17 + 1000 + 433.33 = 5170.83 -> 5171 (rounding each row would give 5170)
    expect(await run(stripe)).toMatchObject({ status: 'verified', mrrMinor: 5171, activeSubscriptions: 6 });
  });

  it('multiplies by quantity and handles several items in one subscription', async () => {
    const { stripe } = fakeStripe({
      subscriptions: [page([subscription({}, [
        item({ quantity: 3 }, { unit_amount: 500 }),
        item({ quantity: 1 }, { unit_amount: 24000, recurring: { interval: 'year', interval_count: 1, usage_type: 'licensed' } }),
      ])])],
    });
    expect(await run(stripe)).toMatchObject({ mrrMinor: 3500, activeSubscriptions: 1 });
  });

  it('reports zero, not null, when there are no active subscriptions', async () => {
    const { stripe } = fakeStripe({ subscriptions: [page([])] });
    expect(await run(stripe)).toMatchObject({ mrrMinor: 0, activeSubscriptions: 0 });
  });

  it('asks only for active subscriptions', async () => {
    const { stripe, subscriptionList } = fakeStripe();
    await run(stripe);
    expect(subscriptionList).toHaveBeenCalledWith({ status: 'active', limit: 100 });
  });

  it('leaves the count and the monthly amount empty when any subscription is in another currency', async () => {
    const other = fakeStripe({ subscriptions: [page([monthly('month', 1000), subscription({ currency: 'usd' }, [item({}, { currency: 'usd' })])])] });
    expect(await run(other.stripe)).toMatchObject({ status: 'verified', mrrMinor: null, activeSubscriptions: null });

    const mixedItem = fakeStripe({ subscriptions: [page([subscription({}, [item(), item({}, { currency: 'eur' })])])] });
    expect(await run(mixedItem.stripe)).toMatchObject({ mrrMinor: null, activeSubscriptions: null });
  });

  it('finds a foreign-currency subscription that appears on a later page', async () => {
    const { stripe } = fakeStripe({
      subscriptions: [page([monthly('month', 1000)], true), page([subscription({ currency: 'usd' }, [item({}, { currency: 'usd' })])])],
    });
    expect(await run(stripe)).toMatchObject({ mrrMinor: null, activeSubscriptions: null });
  });

  it('does not state a monthly amount for discounted subscriptions, but still counts them', async () => {
    const { stripe } = fakeStripe({
      subscriptions: [page([monthly('month', 1000), subscription({ discounts: ['di_1'] }), subscription({}, [item({ discounts: ['di_2'] })])])],
    });
    expect(await run(stripe)).toMatchObject({ mrrMinor: null, activeSubscriptions: 3 });
  });

  it.each([
    ['metered usage', { recurring: { interval: 'month', interval_count: 1, usage_type: 'metered' } }, {}],
    ['tiered or custom price (no unit amount)', { unit_amount: null }, {}],
    ['quantity transform', { transform_quantity: { divide_by: 10, round: 'up' } }, {}],
    ['unknown interval', { recurring: { interval: 'fortnight', interval_count: 1, usage_type: 'licensed' } }, {}],
    ['missing quantity', {}, { quantity: undefined }],
  ])('keeps the count but not the amount for %s', async (_label, price, itemOver) => {
    const { stripe } = fakeStripe({ subscriptions: [page([monthly('month', 1000), subscription({}, [item(itemOver, price)])])] });
    expect(await run(stripe)).toMatchObject({ mrrMinor: null, activeSubscriptions: 2 });
  });

  it('does not state an amount when a subscription has more items than were returned', async () => {
    const many = subscription({}, [item()]);
    many.items.has_more = true;
    const { stripe } = fakeStripe({ subscriptions: [page([many])] });
    expect(await run(stripe)).toMatchObject({ mrrMinor: null, activeSubscriptions: 1 });
  });

  it('leaves out subscriptions that are paused or not active', async () => {
    const { stripe } = fakeStripe({
      subscriptions: [page([
        monthly('month', 1000),
        subscription({ pause_collection: { behavior: 'void' } }),
        subscription({ status: 'trialing' }),
        subscription({ status: 'past_due' }),
      ])],
    });
    expect(await run(stripe)).toMatchObject({ mrrMinor: 1000, activeSubscriptions: 1 });
  });

  it('follows subscription pages', async () => {
    const { stripe, subscriptionList } = fakeStripe({
      subscriptions: [page([{ ...monthly('month', 1000), id: 'sub_a' }], true), page([{ ...monthly('month', 500), id: 'sub_b' }])],
    });
    expect(await run(stripe)).toMatchObject({ mrrMinor: 1500, activeSubscriptions: 2 });
    expect(subscriptionList.mock.calls[1]).toEqual([{ status: 'active', limit: 100, starting_after: 'sub_a' }]);
  });

  it('leaves the count and amount empty, but keeps the revenue, when there are too many subscriptions to read', async () => {
    const { stripe, subscriptionList } = fakeStripe({
      balance: [page([tx('t1', 7000)])],
      subscriptions: () => Promise.resolve(page([monthly('month', 1000)], true)),
    });
    expect(await run(stripe)).toMatchObject({ status: 'verified', last30dRevenueMinor: 7000, mrrMinor: null, activeSubscriptions: null });
    expect(subscriptionList).toHaveBeenCalledTimes(MAX_SUBSCRIPTION_PAGES);
  });
});

describe('readStripeVerification: Stripe failures', () => {
  const stripeError = (type: string, statusCode: number) => Object.assign(new Error('Invalid key rk_live_SECRETSECRETSECRET1234 rejected'), { type, statusCode });

  it.each([
    ['アカウント', { account: () => Promise.reject(stripeError('StripePermissionError', 403)) }],
    ['残高の取引', { balance: () => Promise.reject(stripeError('StripePermissionError', 403)) }],
    ['サブスクリプション', { subscriptions: () => Promise.reject(stripeError('StripePermissionError', 403)) }],
  ])('names the permission that was refused: %s', async (permission, parts) => {
    const { stripe } = fakeStripe(parts);
    await expect(run(stripe)).rejects.toMatchObject({ name: 'StripePermissionMissingError', permission });
  });

  it('recognizes a refusal by status code alone', async () => {
    const { stripe } = fakeStripe({ balance: () => Promise.reject(Object.assign(new Error('x'), { statusCode: 403 })) });
    await expect(run(stripe)).rejects.toBeInstanceOf(StripePermissionMissingError);
  });

  it('reports a key Stripe does not accept', async () => {
    const { stripe } = fakeStripe({ account: () => Promise.reject(stripeError('StripeAuthenticationError', 401)) });
    await expect(run(stripe)).rejects.toBeInstanceOf(StripeKeyRejectedError);
  });

  it('separates Stripe rate limiting from other upstream failures', async () => {
    const limited = fakeStripe({ account: () => Promise.reject(stripeError('StripeRateLimitError', 429)) });
    await expect(run(limited.stripe)).rejects.toMatchObject({ name: 'StripeUpstreamError', rateLimited: true });
    const broken = fakeStripe({ balance: () => Promise.reject(stripeError('StripeConnectionError', 0)) });
    await expect(run(broken.stripe)).rejects.toMatchObject({ name: 'StripeUpstreamError', rateLimited: false });
    const plain = fakeStripe({ subscriptions: () => Promise.reject(new Error('boom')) });
    await expect(run(plain.stripe)).rejects.toBeInstanceOf(StripeUpstreamError);
  });

  it('never carries the SDK error text, which can echo part of the key', async () => {
    for (const parts of [
      { account: () => Promise.reject(stripeError('StripePermissionError', 403)) },
      { account: () => Promise.reject(stripeError('StripeAuthenticationError', 401)) },
      { balance: () => Promise.reject(stripeError('StripeAPIError', 500)) },
    ]) {
      const { stripe } = fakeStripe(parts);
      let caught: unknown;
      try { await run(stripe); } catch (error) { caught = error; }
      expect(caught).toBeInstanceOf(Error);
      const failure = caught as Error;
      expect(`${failure.message} ${failure.stack ?? ''} ${JSON.stringify(failure)}`).not.toContain('SECRET');
      expect('cause' in failure).toBe(false);
    }
  });

  it('fails closed on an account without an id', async () => {
    const { stripe } = fakeStripe({ account: { ...account(), id: '' } });
    await expect(run(stripe)).rejects.toBeInstanceOf(StripeUpstreamError);
  });
});
