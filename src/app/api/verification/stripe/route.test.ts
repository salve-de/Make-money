import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { inspect } from 'node:util';
import { NextRequest } from 'next/server';

import { MAX_BALANCE_PAGES, type StripeAccountLike, type StripePage, type StripeReadClient } from '@/lib/verification/stripe-revenue';
import { STRIPE_READ_PERMISSIONS, VERIFICATION_COOLDOWN_SECONDS } from '@/shared/verification';

const T0 = 1_800_000_000;
const KEY = 'rk_test_51UnitTestKeyZQXJKVWMARKER0123456789abcdef';
const ACCOUNT_ID = 'acct_1UnitTestAccountQ7';

type Site = { entityId: string; url: string | null };
const state = vi.hoisted(() => ({
  user: { uid: 'owner-1' } as { uid: string } | null,
  live: false,
  liveError: false,
  attemptAllowed: true,
  attemptError: false,
  entities: {} as Record<string, { entityId: string; url: string | null }>,
  entityError: false,
  account: null as unknown,
  balance: null as unknown,
  subscriptions: null as unknown,
  failure: {} as { account?: unknown; balance?: unknown; subscriptions?: unknown },
  onAccountRead: null as null | (() => void),
  database: null as DatabaseSync | null,
  offline: false,
  keysSeen: [] as string[],
}));

vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: async () => state.user }));
vi.mock('@/lib/security/rate-limit', () => ({
  consumeRequestRateLimit: vi.fn(async () => {
    if (state.attemptError) throw new Error('rate limit store down');
    return state.attemptAllowed;
  }),
}));
vi.mock('@/lib/verification/entity-site', () => ({
  findEntitySite: vi.fn(async (id: string): Promise<Site | null> => {
    if (state.entityError) throw new Error('catalog unavailable');
    return state.entities[id.toLowerCase()] ?? null;
  }),
}));
vi.mock('@/lib/storage/d1', () => ({
  queryD1: vi.fn(async (sql: string, params: (string | number | null)[] = [], parse?: (row: unknown) => unknown) => {
    if (state.offline) throw new Error('D1 offline');
    const rows = state.database!.prepare(sql).all(...params);
    return parse ? rows.map(parse) : rows;
  }),
  executeD1: vi.fn(async (sql: string, params: (string | number | null)[] = []) => {
    if (state.offline) throw new Error('D1 offline');
    const result = state.database!.prepare(sql).run(...params);
    return { changes: Number(result.changes), lastRowId: null };
  }),
}));
vi.mock('@/lib/stripe', () => ({
  paymentLiveMode: vi.fn(async () => {
    if (state.liveError) throw new Error('Stripe mode unavailable');
    return state.live;
  }),
  createStripeClientForKey: vi.fn((key: string) => {
    state.keysSeen.push(key);
    return fakeStripe();
  }),
}));

import { createStripeClientForKey } from '@/lib/stripe';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import { POST } from './route';

const page = <T,>(data: T[], hasMore = false): StripePage<T> => ({ data, has_more: hasMore });
const monthlySubscription = (id: string, unitAmount: number) => ({
  id, status: 'active', currency: 'jpy', discounts: [], pause_collection: null,
  items: { has_more: false, data: [{ quantity: 1, discounts: [], price: { currency: 'jpy', unit_amount: unitAmount, transform_quantity: null, recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' } } }] },
});

function fakeStripe(): StripeReadClient {
  const read = <T,>(failure: unknown, value: unknown) => {
    if (failure) return Promise.reject(failure);
    return Promise.resolve(value as T);
  };
  return {
    accounts: {
      retrieveCurrent: async () => {
        state.onAccountRead?.();
        return read<StripeAccountLike>(state.failure.account, state.account);
      },
    },
    balanceTransactions: { list: async () => read(state.failure.balance, state.balance) },
    subscriptions: { list: async () => read(state.failure.subscriptions, state.subscriptions) },
  } as StripeReadClient;
}

function stripeError(type: string, statusCode: number) {
  return Object.assign(new Error(`Invalid API Key provided: ${KEY}`), { type, statusCode });
}

function request(body: unknown, options: { auth?: string | null; text?: string } = {}) {
  const auth = options.auth === undefined ? 'Bearer valid-token' : options.auth;
  return new NextRequest('http://localhost/api/verification/stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: options.text ?? JSON.stringify(body),
  });
}
const submit = (over: Record<string, unknown> = {}, options: { auth?: string | null } = {}) =>
  POST(request({ entityId: 'ent_example', restrictedKey: KEY, ...over }, options));

const rows = () => state.database!.prepare('SELECT * FROM verified_revenue ORDER BY verified_at').all() as Record<string, unknown>[];
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

let consoleSpies: ReturnType<typeof vi.spyOn>[] = [];
// util.inspect, not JSON: it also prints an Error's message and stack, which is where a key would leak.
const logged = () => inspect(consoleSpies.flatMap((spy) => spy.mock.calls), { depth: 8, maxStringLength: null, breakLength: Infinity });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(T0 * 1000));
  state.user = { uid: 'owner-1' };
  state.live = false;
  state.liveError = false;
  state.attemptAllowed = true;
  state.attemptError = false;
  state.entities = { ent_example: { entityId: 'ent_example', url: 'https://example.com' } };
  state.entityError = false;
  state.account = { id: ACCOUNT_ID, default_currency: 'jpy', business_profile: { url: 'https://www.example.com/' } };
  state.balance = page([
    { id: 'txn_1', amount: 300000, currency: 'jpy', reporting_category: 'charge' },
    { id: 'txn_2', amount: -50000, currency: 'jpy', reporting_category: 'refund' },
    { id: 'txn_3', amount: 999, currency: 'usd', reporting_category: 'charge' },
    { id: 'txn_4', amount: -100000, currency: 'jpy', reporting_category: 'payout' },
  ]);
  state.subscriptions = page([monthlySubscription('sub_1', 30000), monthlySubscription('sub_2', 30000)]);
  state.failure = {};
  state.onAccountRead = null;
  state.offline = false;
  state.keysSeen = [];
  state.database = new DatabaseSync(':memory:');
  state.database.exec(readFileSync('migrations/d1/0012_verified_revenue.sql', 'utf8'));
  vi.clearAllMocks();
  consoleSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) => vi.spyOn(console, method).mockImplementation(() => {}));
});
afterEach(() => {
  state.database?.close();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function expectFailure(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(body).toMatchObject({ code });
  expect(typeof body.error).toBe('string');
  expect(JSON.stringify(body)).not.toContain(KEY);
  expect(JSON.stringify(body)).not.toContain('ZQXJKVWMARKER');
  expect(rows()).toHaveLength(0);
  return body as { error: string; code: string; permissions?: string[]; retryAfterSeconds?: number };
}

describe('POST /api/verification/stripe: access and input', () => {
  it('requires a signed-in user and does nothing else for anyone else', async () => {
    await expectFailure(await submit({}, { auth: null }), 401, 'unauthorized');
    await expectFailure(await submit({}, { auth: 'Basic abc' }), 401, 'unauthorized');
    state.user = null;
    await expectFailure(await submit(), 401, 'unauthorized');
    expect(createStripeClientForKey).not.toHaveBeenCalled();
    expect(consumeRequestRateLimit).not.toHaveBeenCalled();
  });

  it.each([
    ['not JSON', { text: 'not json' }],
    ['empty object', { body: {} }],
    ['no key', { body: { entityId: 'ent_example' } }],
    ['no case', { body: { restrictedKey: KEY } }],
    ['blank case', { body: { entityId: '   ', restrictedKey: KEY } }],
    ['case id too long', { body: { entityId: 'e'.repeat(201), restrictedKey: KEY } }],
    ['key is not a string', { body: { entityId: 'ent_example', restrictedKey: 12345 } }],
    ['unknown extra field', { body: { entityId: 'ent_example', restrictedKey: KEY, userId: 'someone-else' } }],
    ['array body', { body: [KEY] }],
  ])('rejects a bad request: %s', async (_label, input: { text?: string; body?: unknown }) => {
    const response = await POST(request(input.body, { text: input.text }));
    await expectFailure(response, 400, 'invalid_request');
    expect(createStripeClientForKey).not.toHaveBeenCalled();
  });

  it('reads at most a small body', async () => {
    const response = await POST(request({ entityId: 'ent_example', restrictedKey: KEY, padding: 'x'.repeat(20_000) }));
    await expectFailure(response, 413, 'too_large');
    expect(createStripeClientForKey).not.toHaveBeenCalled();
  });
});

describe('POST /api/verification/stripe: the key', () => {
  it.each([
    ['a secret key', 'sk_live_51AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'],
    ['a test secret key', 'sk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'],
    ['a publishable key', 'pk_live_51AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'],
    ['something else', 'hello'],
    ['a key with a restricted-looking word inside', 'my_rk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'],
  ])('refuses %s with the fixed message', async (_label, restrictedKey) => {
    const body = await expectFailure(await submit({ restrictedKey }), 400, 'key_not_restricted');
    expect(body.error).toBe('読み取り専用の制限付きキー（rk_で始まるキー）を使ってください');
    expect(createStripeClientForKey).not.toHaveBeenCalled();
    expect(logged()).not.toContain(restrictedKey);
  });

  it.each(['rk_test_short', 'rk_test_ 51AbCdEfGhIjKlMnOpQrStUv', 'rk_live_51AbCdEfGh\nIjKlMnOpQrStUv', 'rk_test_51AbCdEfGhIjKlMnOp$$$$'])(
    'refuses a malformed restricted key %j',
    async (restrictedKey) => {
      await expectFailure(await submit({ restrictedKey }), 400, 'key_malformed');
      expect(createStripeClientForKey).not.toHaveBeenCalled();
    },
  );

  it('refuses a test key in a live environment and a live key in a test environment', async () => {
    state.live = true;
    const inLive = await expectFailure(await submit(), 400, 'mode_mismatch');
    expect(inLive.error).toContain('rk_live_');
    state.live = false;
    const inTest = await expectFailure(await submit({ restrictedKey: KEY.replace('rk_test_', 'rk_live_') }), 400, 'mode_mismatch');
    expect(inTest.error).toContain('rk_test_');
    expect(createStripeClientForKey).not.toHaveBeenCalled();
  });

  it('accepts a live key in a live environment', async () => {
    state.live = true;
    const response = await submit({ restrictedKey: KEY.replace('rk_test_', 'rk_live_') });
    expect(response.status).toBe(200);
  });

  it('says so when the payment mode cannot be determined, without guessing', async () => {
    state.liveError = true;
    await expectFailure(await submit(), 503, 'unavailable');
    expect(createStripeClientForKey).not.toHaveBeenCalled();
  });

  it('limits attempts before touching Stripe', async () => {
    state.attemptAllowed = false;
    await expectFailure(await submit(), 429, 'too_many_attempts');
    expect(consumeRequestRateLimit).toHaveBeenCalledWith(expect.anything(), 'verification-stripe', { limit: 30, windowMs: 3_600_000 });
    expect(createStripeClientForKey).not.toHaveBeenCalled();
  });

  it('answers 503 when the attempt counter cannot be used', async () => {
    state.attemptError = true;
    await expectFailure(await submit(), 503, 'unavailable');
    expect(createStripeClientForKey).not.toHaveBeenCalled();
  });
});

describe('POST /api/verification/stripe: the case and the site', () => {
  it('returns 404 for a case that is not public', async () => {
    await expectFailure(await submit({ entityId: 'ent_hidden' }), 404, 'not_found');
    expect(createStripeClientForKey).not.toHaveBeenCalled();
  });

  it('answers 503 when the case cannot be looked up', async () => {
    state.entityError = true;
    await expectFailure(await submit(), 503, 'unavailable');
    expect(createStripeClientForKey).not.toHaveBeenCalled();
  });

  it('refuses a case that has no official site to compare with', async () => {
    state.entities.ent_example = { entityId: 'ent_example', url: null };
    await expectFailure(await submit(), 403, 'entity_site_missing');
    state.entities.ent_example = { entityId: 'ent_example', url: 'not a url' };
    await expectFailure(await submit(), 403, 'entity_site_missing');
    expect(createStripeClientForKey).not.toHaveBeenCalled();
  });

  it('refuses a case whose official site is a page on a shared service', async () => {
    state.entities.ent_example = { entityId: 'ent_example', url: 'https://github.com/acme/app' };
    state.account = { id: ACCOUNT_ID, default_currency: 'jpy', business_profile: { url: 'https://github.com/acme' } };
    await expectFailure(await submit(), 403, 'entity_site_shared');
    expect(createStripeClientForKey).not.toHaveBeenCalled();
  });

  it('refuses with the fixed message when the payment account site differs', async () => {
    state.account = { id: ACCOUNT_ID, default_currency: 'jpy', business_profile: { url: 'https://someone-else.example.org' } };
    const body = await expectFailure(await submit(), 403, 'site_mismatch');
    expect(body.error).toBe('決済アカウントのサイトと、事例の公式サイトが一致しません');
    expect(createStripeClientForKey).toHaveBeenCalledOnce();
  });

  it('matches sites regardless of www., case, scheme and path', async () => {
    state.entities.ent_example = { entityId: 'ent_example', url: 'HTTP://Example.COM/about' };
    state.account = { id: ACCOUNT_ID, default_currency: 'jpy', business_profile: { url: 'https://WWW.example.com/pricing?a=1' } };
    expect((await submit()).status).toBe(200);
  });

  it('asks the operator to register a site when the payment account has none', async () => {
    state.account = { id: ACCOUNT_ID, default_currency: 'jpy', business_profile: { url: null } };
    await expectFailure(await submit(), 403, 'stripe_site_missing');
  });

  it('does not guess a currency', async () => {
    state.account = { id: ACCOUNT_ID, business_profile: { url: 'https://example.com' } };
    await expectFailure(await submit(), 422, 'currency_missing');
  });

  it('finds the case by any spelling of its id and stores the canonical one', async () => {
    const response = await submit({ entityId: '  ENT_Example ' });
    expect(response.status).toBe(200);
    expect(rows().map((row) => row.entity_id)).toEqual(['ent_example']);
    expect((await response.json()).verification.entityId).toBe('ent_example');
  });
});

describe('POST /api/verification/stripe: what Stripe says', () => {
  it.each([
    ['アカウント', { account: stripeError('StripePermissionError', 403) }],
    ['残高の取引', { balance: stripeError('StripePermissionError', 403) }],
    ['サブスクリプション', { subscriptions: stripeError('StripePermissionError', 403) }],
  ])('names the permission Stripe refused (%s) and lists every permission the key needs', async (label, failure) => {
    state.failure = failure;
    const body = await expectFailure(await submit(), 400, 'permission_missing');
    expect(body.error).toContain(`「${label}」`);
    for (const permission of STRIPE_READ_PERMISSIONS) expect(body.error).toContain(permission);
    expect(body.error).toContain('読み取り');
    expect(body.permissions).toEqual([...STRIPE_READ_PERMISSIONS]);
  });

  it('tells the operator when Stripe does not accept the key', async () => {
    state.failure = { account: stripeError('StripeAuthenticationError', 401) };
    await expectFailure(await submit(), 400, 'key_rejected');
  });

  it('says there are too many records, and nothing more, for a very large account', async () => {
    state.balance = page([{ id: 'txn_1', amount: 1, currency: 'jpy', reporting_category: 'charge' }], true);
    const body = await expectFailure(await submit(), 422, 'too_many_records');
    expect(body.error).toBe('件数が多すぎるため自動確認できません');
    expect(MAX_BALANCE_PAGES).toBeGreaterThan(1);
  });

  it('separates a Stripe outage from a Stripe rate limit', async () => {
    state.failure = { balance: stripeError('StripeConnectionError', 0) };
    await expectFailure(await submit(), 502, 'stripe_unavailable');
    state.failure = { balance: stripeError('StripeRateLimitError', 429) };
    await expectFailure(await submit(), 429, 'stripe_unavailable');
  });
});

describe('POST /api/verification/stripe: a verified result', () => {
  it('returns the public result and stores one row', async () => {
    const response = await submit();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      verification: {
        entityId: 'ent_example',
        provider: 'stripe',
        accountDomain: 'example.com',
        currency: 'JPY',
        last30dRevenueMinor: 250000,
        mrrMinor: 60000,
        activeSubscriptions: 2,
        periodStart: T0 - 30 * 86400,
        periodEnd: T0,
        verifiedAt: T0,
      },
    });
    expect(rows()).toHaveLength(1);
  });

  it('never puts the user, the payment account or the key in the response', async () => {
    const text = await (await submit()).text();
    expect(text).not.toContain('owner-1');
    expect(text).not.toContain(ACCOUNT_ID);
    expect(text).not.toContain(sha256(ACCOUNT_ID));
    expect(text).not.toContain(KEY);
    expect(text).not.toMatch(/userId|user_id|accountId|accountIdHash|restrictedKey/);
  });

  it('keeps who verified and the hash of the payment account, never the key or the account id', async () => {
    await submit();
    const [row] = rows();
    expect(row).toMatchObject({
      entity_id: 'ent_example', user_id: 'owner-1', provider: 'stripe', account_id_hash: sha256(ACCOUNT_ID),
      account_domain: 'example.com', currency: 'JPY', last30d_revenue_minor: 250000, mrr_minor: 60000, active_subscriptions: 2, verified_at: T0,
    });
    // Everything the database holds, in every table, without the key or the raw account id.
    const tables = (state.database!.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((table) => table.name);
    const dump = JSON.stringify(tables.flatMap((name) => state.database!.prepare(`SELECT * FROM "${name}"`).all()));
    expect(dump).not.toContain(KEY);
    expect(dump).not.toContain('ZQXJKVWMARKER');
    expect(dump).not.toContain(ACCOUNT_ID);
  });

  it('hands the key only to the one-off Stripe client', async () => {
    await submit({ restrictedKey: `  ${KEY}\n` });
    expect(state.keysSeen).toEqual([KEY]);
  });

  it('never writes the key, the account or the user to the logs, on success or on any failure', async () => {
    const scenarios: (typeof state.failure)[] = [
      {},
      { account: stripeError('StripePermissionError', 403) },
      { account: stripeError('StripeAuthenticationError', 401) },
      { balance: stripeError('StripeAPIError', 500) },
      { subscriptions: new Error(`boom ${KEY}`) },
    ];
    for (const [index, failure] of scenarios.entries()) {
      state.user = { uid: `uid-${index}` };
      state.failure = failure;
      await submit();
    }
    state.failure = {};
    state.user = { uid: 'uid-offline' };
    state.offline = true;
    await submit();
    // Something is logged for the upstream and storage failures ...
    expect(consoleSpies.some((spy) => spy.mock.calls.length > 0)).toBe(true);
    // ... but never the key, the payment account, or the user.
    for (const secret of [KEY, 'ZQXJKVWMARKER', ACCOUNT_ID, 'uid-']) expect(logged()).not.toContain(secret);
  });

  it('reports a negative total and empty subscription fields as they are', async () => {
    state.balance = page([
      { id: 'txn_1', amount: 1000, currency: 'jpy', reporting_category: 'charge' },
      { id: 'txn_2', amount: -3500, currency: 'jpy', reporting_category: 'refund' },
    ]);
    state.subscriptions = page([{ ...monthlySubscription('sub_usd', 900), currency: 'usd' }]);
    const body = await (await submit()).json();
    expect(body.verification).toMatchObject({ last30dRevenueMinor: -2500, mrrMinor: null, activeSubscriptions: null });
  });

  it('does not add a row when it cannot be saved', async () => {
    state.onAccountRead = () => { state.offline = true; };
    await expectFailure(await submit(), 503, 'unavailable');
  });

  it('answers 503 before reading Stripe when the database is down', async () => {
    state.offline = true;
    const body = await submit();
    expect(body.status).toBe(503);
    expect(createStripeClientForKey).not.toHaveBeenCalled();
  });
});

describe('POST /api/verification/stripe: once per hour per user and case', () => {
  it('refuses the same user for the same case within the hour, without calling Stripe again', async () => {
    expect((await submit()).status).toBe(200);
    vi.setSystemTime(new Date((T0 + 600) * 1000));
    const body = await (async () => {
      const response = await submit();
      expect(response.status).toBe(429);
      expect(response.headers.get('retry-after')).toBe(String(VERIFICATION_COOLDOWN_SECONDS - 600));
      return response.json();
    })();
    expect(body).toMatchObject({ code: 'cooldown', retryAfterSeconds: VERIFICATION_COOLDOWN_SECONDS - 600 });
    expect(createStripeClientForKey).toHaveBeenCalledOnce();
    expect(rows()).toHaveLength(1);
  });

  it('allows it again after the hour', async () => {
    await submit();
    vi.setSystemTime(new Date((T0 + VERIFICATION_COOLDOWN_SECONDS) * 1000));
    expect((await submit()).status).toBe(200);
    expect(rows()).toHaveLength(2);
  });

  it('does not slow down a failed attempt: fixing the key can be retried at once', async () => {
    state.failure = { balance: stripeError('StripePermissionError', 403) };
    expect((await submit()).status).toBe(400);
    state.failure = {};
    expect((await submit()).status).toBe(200);
  });

  it('treats another user or another case separately', async () => {
    await submit();
    state.user = { uid: 'owner-2' };
    expect((await submit()).status).toBe(200);
    state.user = { uid: 'owner-1' };
    state.entities.ent_other = { entityId: 'ent_other', url: 'https://example.com' };
    expect((await submit({ entityId: 'ent_other' })).status).toBe(200);
    expect(rows()).toHaveLength(3);
  });

  it('still refuses when a second request slips in while Stripe is being read', async () => {
    state.onAccountRead = () => {
      state.database!.prepare(
        `INSERT INTO verified_revenue(id,entity_id,user_id,provider,account_id_hash,account_domain,currency,last30d_revenue_minor,mrr_minor,active_subscriptions,period_start,period_end,verified_at)
         VALUES('race','ent_example','owner-1','stripe',?, 'example.com','JPY',1,0,0,1,2,?)`,
      ).run('c'.repeat(64), T0 - 5);
      state.onAccountRead = null;
    };
    const response = await submit();
    expect(response.status).toBe(429);
    expect((await response.json()).code).toBe('cooldown');
    expect(rows()).toHaveLength(1);
  });
});
