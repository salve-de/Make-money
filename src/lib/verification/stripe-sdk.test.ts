import { describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';

import { readStripeVerification, StripeKeyRejectedError, StripeUpstreamError } from './stripe-revenue';

/**
 * The same calculation, run through the real Stripe SDK with only the HTTP layer replaced.
 * This pins what the SDK actually sends (paths, parameters, key header) and how its own
 * error classes map onto ours, which the structural fakes elsewhere cannot show.
 */

const NOW = 1_800_000_000;
const KEY = 'rk_test_51SdkContractKeyZQXJKVWMARKER0123456789';

type Reply = { status?: number; body: unknown };
function sdk(replies: Record<string, Reply | Reply[]>) {
  const calls: { path: string; query: URLSearchParams; method: string; authorization: string | null }[] = [];
  const fetchFn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url);
    const headers = new Headers(init?.headers);
    calls.push({ path: url.pathname, query: url.searchParams, method: init?.method ?? 'GET', authorization: headers.get('authorization') });
    const queue = replies[url.pathname];
    const reply = Array.isArray(queue) ? queue.shift() : queue;
    if (!reply) throw new Error(`Unexpected request: ${url.pathname}`);
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'request-id': 'req_sdk_test' },
    });
  });
  const client = new Stripe(KEY, { httpClient: Stripe.createFetchHttpClient(fetchFn as typeof fetch), maxNetworkRetries: 0, telemetry: false });
  return { client, calls };
}

const list = (data: unknown[], hasMore = false, url = '/v1/x') => ({ status: 200, body: { object: 'list', data, has_more: hasMore, url } });
const account = { status: 200, body: { id: 'acct_1SdkTest', object: 'account', default_currency: 'jpy', business_profile: { url: 'https://www.example.com/' } } };
const run = (client: Stripe) => readStripeVerification(client, { officialDomain: 'example.com', now: NOW });

describe('readStripeVerification with the real Stripe SDK', () => {
  it('reads the account, the last 30 days of balance transactions and the active subscriptions', async () => {
    const { client, calls } = sdk({
      '/v1/account': account,
      '/v1/balance_transactions': list([
        { id: 'txn_1', object: 'balance_transaction', amount: 12000, currency: 'jpy', reporting_category: 'charge' },
        { id: 'txn_2', object: 'balance_transaction', amount: -2000, currency: 'jpy', reporting_category: 'refund' },
        { id: 'txn_3', object: 'balance_transaction', amount: 500, currency: 'usd', reporting_category: 'charge' },
      ]),
      '/v1/subscriptions': list([{
        id: 'sub_1', object: 'subscription', status: 'active', currency: 'jpy', discounts: [], pause_collection: null,
        items: {
          object: 'list', has_more: false, url: '/v1/subscription_items',
          data: [{ id: 'si_1', quantity: 2, discounts: [], price: { currency: 'jpy', unit_amount: 6000, transform_quantity: null, recurring: { interval: 'year', interval_count: 1, usage_type: 'licensed' } } }],
        },
      }]),
    });

    expect(await run(client)).toEqual({
      status: 'verified',
      accountId: 'acct_1SdkTest',
      accountDomain: 'example.com',
      currency: 'JPY',
      last30dRevenueMinor: 10000,
      mrrMinor: 1000,
      activeSubscriptions: 1,
      periodStart: NOW - 30 * 86400,
      periodEnd: NOW,
    });

    // Reads only: every call is a GET with the supplied key, and nothing else is requested.
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual(['GET /v1/account', 'GET /v1/balance_transactions', 'GET /v1/subscriptions']);
    expect(calls.every((call) => call.authorization === `Bearer ${KEY}`)).toBe(true);
    const balance = calls[1].query;
    expect(balance.get('created[gte]')).toBe(String(NOW - 30 * 86400));
    expect(balance.get('created[lte]')).toBe(String(NOW));
    expect(balance.get('limit')).toBe('100');
    expect(calls[2].query.get('status')).toBe('active');
    expect(calls[2].query.get('limit')).toBe('100');
  });

  it('pages with starting_after', async () => {
    const { client, calls } = sdk({
      '/v1/account': account,
      '/v1/balance_transactions': [
        list([{ id: 'txn_a', amount: 100, currency: 'jpy', reporting_category: 'charge' }], true),
        list([{ id: 'txn_b', amount: 200, currency: 'jpy', reporting_category: 'charge' }], false),
      ],
      '/v1/subscriptions': list([]),
    });
    expect(await run(client)).toMatchObject({ last30dRevenueMinor: 300 });
    expect(calls.filter((call) => call.path === '/v1/balance_transactions').map((call) => call.query.get('starting_after'))).toEqual([null, 'txn_a']);
  });

  it('does not read revenue when the account site differs', async () => {
    const { client, calls } = sdk({ '/v1/account': { status: 200, body: { ...account.body, business_profile: { url: 'https://other.example.org' } } } });
    expect(await run(client)).toEqual({ status: 'site_mismatch' });
    expect(calls.map((call) => call.path)).toEqual(['/v1/account']);
  });

  const forbidden = { status: 403, body: { error: { type: 'invalid_request_error', message: `The provided key '${KEY}' does not have the required permissions for this endpoint. Having the 'rak_x_read' permission would allow this request to continue.` } } };
  const unauthorized = { status: 401, body: { error: { type: 'invalid_request_error', message: `Invalid API Key provided: ${KEY}` } } };

  it.each([
    ['アカウント', { '/v1/account': forbidden }],
    ['残高の取引', { '/v1/account': account, '/v1/balance_transactions': forbidden }],
    ['サブスクリプション', { '/v1/account': account, '/v1/balance_transactions': list([]), '/v1/subscriptions': forbidden }],
  ])('maps the SDK permission error to the refused permission: %s', async (permission, replies) => {
    const { client } = sdk(replies);
    await expect(run(client)).rejects.toMatchObject({ name: 'StripePermissionMissingError', permission });
  });

  it('maps the SDK authentication error to a rejected key', async () => {
    const { client } = sdk({ '/v1/account': unauthorized });
    await expect(run(client)).rejects.toBeInstanceOf(StripeKeyRejectedError);
  });

  it('maps rate limiting and server errors to upstream failures', async () => {
    const limited = sdk({ '/v1/account': { status: 429, body: { error: { type: 'invalid_request_error', message: 'Too many requests' } } } });
    await expect(run(limited.client)).rejects.toMatchObject({ name: 'StripeUpstreamError', rateLimited: true });
    const broken = sdk({ '/v1/account': account, '/v1/balance_transactions': { status: 500, body: { error: { type: 'api_error', message: 'Boom' } } } });
    await expect(run(broken.client)).rejects.toMatchObject({ name: 'StripeUpstreamError', rateLimited: false });
    const unreachable = new Stripe(KEY, {
      httpClient: Stripe.createFetchHttpClient((async () => { throw new TypeError(`fetch failed for ${KEY}`); }) as unknown as typeof fetch),
      maxNetworkRetries: 0,
      telemetry: false,
    });
    await expect(run(unreachable)).rejects.toBeInstanceOf(StripeUpstreamError);
  });

  it('never lets the key or the SDK error text out, whatever fails', async () => {
    const failures: Record<string, Reply | Reply[]>[] = [
      { '/v1/account': forbidden },
      { '/v1/account': unauthorized },
      { '/v1/account': account, '/v1/balance_transactions': { status: 500, body: { error: { type: 'api_error', message: `Boom ${KEY}` } } } },
    ];
    for (const replies of failures) {
      const { client } = sdk(replies);
      let caught: unknown;
      try { await run(client); } catch (error) { caught = error; }
      expect(caught).toBeInstanceOf(Error);
      const failure = caught as Error;
      expect(`${failure.message} ${failure.stack ?? ''} ${JSON.stringify(failure)}`).not.toContain('ZQXJKVWMARKER');
      expect('cause' in failure).toBe(false);
      expect(failure).not.toBeInstanceOf(Stripe.errors.StripeError);
    }
  });
});
