import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import Stripe from 'stripe';
import { NextRequest } from 'next/server';

type Obj = Record<string, unknown>;
const state = vi.hoisted(() => ({
  database: null as DatabaseSync | null, offline: false, providerOffline: false, stripeConfigured: true, live: false,
  user: { uid: 'u1', email: 'a@example.com' } as { uid: string; email: string } | null,
  session: {} as Record<string, unknown>, event: {} as Record<string, unknown>,
  charges: new Map<string, Record<string, unknown>>(), subscriptions: new Map<string, Record<string, unknown>>(),
  invoices: new Map<string, { status: string; charge?: string; subscription?: string; created: number }>(), checkoutParams: [] as Record<string, unknown>[],
  portalParams: [] as Record<string, unknown>[], portalFails: false,
}));
vi.mock('@/lib/storage/d1', () => ({
  queryD1: vi.fn(async (sql: string, params: (string | number | null)[] = []) => { if (state.offline) throw new Error('Offline'); return state.database!.prepare(sql).all(...params); }),
  executeD1: vi.fn(async (sql: string, params: (string | number | null)[] = []) => { if (state.offline) throw new Error('Offline'); return state.database!.prepare(sql).run(...params); }),
  batchD1: vi.fn(async (statements: { sql: string; params: (string | number | null)[] }[]) => {
    if (state.offline) throw new Error('Offline'); const db = state.database!; db.exec('BEGIN');
    try { const result = statements.map((s) => db.prepare(s.sql).run(...s.params)); db.exec('COMMIT'); return result; }
    catch (e) { db.exec('ROLLBACK'); throw e; }
  }),
}));
const stripe = vi.hoisted(() => {
  const empty = () => (async function* () { /* nothing to list */ })();
  return {
    checkout: { sessions: {
      create: vi.fn(async (params: Record<string, unknown>) => { state.checkoutParams.push(params); return { url: 'https://checkout.stripe.com/test' }; }),
      retrieve: vi.fn(async () => state.session), list: vi.fn(empty),
    } },
    paymentIntents: { retrieve: vi.fn(async (id: string) => ({ latest_charge: id.replace('pi_', 'ch_'), status: 'succeeded' })) },
    charges: { retrieve: vi.fn(async (id: string) => { const charge = state.charges.get(id); if (!charge) throw new Error('Unavailable'); return charge; }) },
    disputes: { list: vi.fn(empty) },
    subscriptions: {
      retrieve: vi.fn(async (id: string) => {
        if (state.providerOffline) throw new Error('Provider offline');
        const subscription = state.subscriptions.get(id); if (!subscription) throw new Error('No such subscription'); return subscription;
      }),
      list: vi.fn(empty),
    },
    invoices: {
      retrieve: vi.fn(async (id: string) => { const invoice = state.invoices.get(id); if (!invoice) throw new Error('No such invoice'); return { id, status: invoice.status }; }),
      // Newest first, like Stripe. Auto-pagination is not modelled: callers must only trust data[0] when they ask for limit 1.
      list: vi.fn(async ({ subscription, status, limit }: { subscription: string; status: string; limit: number }) => ({
        data: [...state.invoices].filter(([, invoice]) => invoice.subscription === subscription && invoice.status === status)
          .sort(([, a], [, b]) => b.created - a.created).slice(0, limit).map(([id, invoice]) => ({ id, status: invoice.status })),
      })),
    },
    invoicePayments: { list: vi.fn(({ invoice }: { invoice: string }) => (async function* () { const found = state.invoices.get(invoice); if (found?.charge) yield { status: 'paid', payment: { charge: found.charge } }; })()) },
    billingPortal: { sessions: { create: vi.fn(async (params: Record<string, unknown>) => {
      if (state.portalFails) throw new Error('No configuration provided');
      state.portalParams.push(params); return { url: 'https://billing.stripe.com/session/test' };
    }) } },
    webhooks: { constructEventAsync: vi.fn() },
  };
});
vi.mock('@/lib/stripe', () => ({ getStripeClient: vi.fn(async () => (state.stripeConfigured ? stripe : null)), paymentLiveMode: vi.fn(async () => state.live) }));
vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: vi.fn(async () => state.user) }));
import { POST as checkout } from '@/app/api/checkout/route';
import { POST as checkoutStatus } from '@/app/api/checkout/status/route';
import { POST as webhook } from '@/app/api/webhooks/stripe/route';
import { GET as plans } from '@/app/api/billing/plans/route';
import { GET as billingStatus } from '@/app/api/billing/status/route';
import { POST as portal } from '@/app/api/billing/portal/route';
import { authorizePro, getProEntitlement, recordPaymentFacts } from './entitlement';
import { getBillingStatus } from './billing';
import { paymentRecord } from './lifecycle';
import { parsePriceJpy } from './plans';

const localStripe = new Stripe('sk_test_unit');
const secret = 'whsec_unit_test';
const ENV_NAMES = ['STRIPE_WEBHOOK_SECRET', 'PRO_MONTHLY_PRICE_JPY', 'PRO_YEARLY_PRICE_JPY', 'FOUNDING_PASS_ENABLED', 'NEXT_PUBLIC_APP_URL'];
const savedEnv = new Map<string, string | undefined>();
const nowSeconds = () => Math.floor(Date.now() / 1000);
const DAY = 24 * 60 * 60;
const post = (url: string, body: unknown, auth = true) => new NextRequest(`http://localhost${url}`, { method: 'POST', headers: auth ? { authorization: 'Bearer valid' } : {}, body: JSON.stringify(body) });
const get = (url: string, auth = true) => new NextRequest(`http://localhost${url}`, { headers: auth ? { authorization: 'Bearer valid' } : {} });
const buy = (product: unknown, auth = true) => checkout(post('/api/checkout', { product }, auth));
const charge = (id: string, amount = 1980): Obj => ({ id, currency: 'jpy', paid: true, captured: true, refunded: false, amount, amount_captured: amount, amount_refunded: 0, disputed: false, livemode: false });
/** A Stripe subscription plus its paid invoice and the charge behind it. */
function addSubscription(id = 'sub_1', overrides: Obj = {}) {
  state.charges.set(`ch_${id}`, charge(`ch_${id}`, 980));
  state.invoices.set(`in_${id}`, { status: 'paid', charge: `ch_${id}`, subscription: id, created: 1000 });
  const subscription: Obj = { id, status: 'active', customer: 'cus_1', livemode: false, created: 1000, cancel_at: null, cancel_at_period_end: false,
    metadata: { product: 'pro-monthly', userId: 'u1' }, latest_invoice: `in_${id}`,
    items: { data: [{ current_period_end: nowSeconds() + 30 * DAY, price: { recurring: { interval: 'month', interval_count: 1 } } }] }, ...overrides };
  state.subscriptions.set(id, subscription);
  return subscription;
}
const periodEnd = (subscription: Obj) => (subscription.items as { data: { current_period_end: number }[] }).data[0].current_period_end;
const subscriptionSession = (overrides: Obj = {}): Obj => ({ id: 'cs_sub_1', created: 100, mode: 'subscription', status: 'complete', payment_status: 'paid', currency: 'jpy', amount_total: 980,
  metadata: { product: 'pro-monthly', userId: 'u1' }, client_reference_id: 'u1', customer: 'cus_1', subscription: 'sub_1', livemode: false, ...overrides });
function foundingSession(): Obj {
  return { id: 'cs_founding', created: 100, mode: 'payment', status: 'complete', payment_status: 'paid', currency: 'jpy', amount_total: 1980,
    metadata: { product: 'founding-pass', userId: 'u1' }, client_reference_id: 'u1', customer: 'cus_f', payment_intent: 'pi_f', livemode: false };
}
function deliver(type: string, object: unknown, id = 'evt_1', created = 100, livemode = false, signWith = secret) {
  const payload = JSON.stringify({ id, type, created, livemode, data: { object } });
  const signature = localStripe.webhooks.generateTestHeaderString({ payload, secret: signWith });
  return webhook(new Request('http://localhost/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': signature }, body: payload }));
}
const rows = () => state.database!.prepare('SELECT id, resource_id, user_id, kind, livemode, fact FROM payment_events ORDER BY occurred_at, id').all() as { id: string; resource_id: string; user_id: string | null; kind: string; livemode: number; fact: string }[];
/** Completes a paid monthly checkout the way Stripe would tell us. */
async function completeSubscription(overrides: Obj = {}, subscriptionOverrides: Obj = {}, eventId = 'evt_sub') {
  const subscription = addSubscription('sub_1', subscriptionOverrides);
  const status = await deliver('checkout.session.completed', subscriptionSession(overrides), eventId);
  expect(status.status).toBe(200);
  return subscription;
}
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks(); consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  state.database = new DatabaseSync(':memory:'); state.offline = false; state.providerOffline = false; state.stripeConfigured = true; state.live = false; state.portalFails = false;
  state.database.exec(readFileSync('migrations/d1/0001_users.sql', 'utf8')); state.database.exec(readFileSync('migrations/d1/0002_payments.sql', 'utf8'));
  state.user = { uid: 'u1', email: 'a@example.com' }; state.charges = new Map(); state.subscriptions = new Map(); state.invoices = new Map(); state.checkoutParams = []; state.portalParams = []; state.session = {};
  for (const name of ENV_NAMES) { savedEnv.set(name, process.env[name]); delete process.env[name]; }
  process.env.STRIPE_WEBHOOK_SECRET = secret; process.env.PRO_MONTHLY_PRICE_JPY = '980'; process.env.PRO_YEARLY_PRICE_JPY = '9800';
  stripe.webhooks.constructEventAsync.mockImplementation((payload, signature, key) => localStripe.webhooks.constructEventAsync(payload, signature, key));
});
afterEach(() => {
  state.database?.close(); consoleError.mockRestore();
  for (const name of ENV_NAMES) { const value = savedEnv.get(name); if (value === undefined) delete process.env[name]; else process.env[name] = value; }
});

describe('plan prices come only from the environment', () => {
  it('accepts positive whole yen amounts and nothing else', () => {
    expect(parsePriceJpy('980')).toBe(980);
    expect(parsePriceJpy('99999999')).toBe(99_999_999);
    for (const bad of [undefined, '', '0', '-980', '9.5', '1e3', '0980', '+980', '1,980', '９８０', 'abc', ' 980', '100000000']) expect(parsePriceJpy(bad), String(bad)).toBeNull();
  });
  it('lists every plan with its price, and sells only what is configured', async () => {
    const response = await plans();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ plans: [
      { id: 'founding-pass', name: '金鉱録 PRO 創刊版（永久アクセス権）', priceJpy: 1980, interval: 'once', available: true },
      { id: 'pro-monthly', name: '金鉱録 PRO 月額', priceJpy: 980, interval: 'month', available: true },
      { id: 'pro-yearly', name: '金鉱録 PRO 年額', priceJpy: 9800, interval: 'year', available: true },
    ] });
  });
  it('needs no login to read the plan list', async () => {
    state.user = null;
    expect((await plans()).status).toBe(200);
  });
  it('marks every plan unavailable without the Stripe secret key or the webhook secret', async () => {
    state.stripeConfigured = false;
    expect((await (await plans()).json()).plans.map((plan: Obj) => plan.available)).toEqual([false, false, false]);
    state.stripeConfigured = true; delete process.env.STRIPE_WEBHOOK_SECRET;
    const body = await (await plans()).json();
    expect(body.plans.map((plan: Obj) => plan.available)).toEqual([false, false, false]);
    expect(body.plans.map((plan: Obj) => plan.priceJpy)).toEqual([1980, 980, 9800]);
  });
  it('treats a missing or invalid price as not for sale, without touching the other plans', async () => {
    delete process.env.PRO_MONTHLY_PRICE_JPY; process.env.PRO_YEARLY_PRICE_JPY = '9,800';
    expect((await (await plans()).json()).plans).toEqual([
      expect.objectContaining({ id: 'founding-pass', available: true }),
      expect.objectContaining({ id: 'pro-monthly', priceJpy: null, available: false }),
      expect.objectContaining({ id: 'pro-yearly', priceJpy: null, available: false }),
    ]);
  });
  it('stops selling the founding pass only when FOUNDING_PASS_ENABLED is 0', async () => {
    const founding = async () => (await (await plans()).json()).plans[0].available;
    process.env.FOUNDING_PASS_ENABLED = '0'; expect(await founding()).toBe(false);
    for (const value of ['1', 'true', 'false', 'off', '00']) { process.env.FOUNDING_PASS_ENABLED = value; expect(await founding(), value).toBe(true); }
    delete process.env.FOUNDING_PASS_ENABLED; expect(await founding()).toBe(true);
  });
});

describe('checkout for monthly and yearly plans', () => {
  it.each([
    ['pro-monthly', 'month', 980, '金鉱録 PRO 月額'],
    ['pro-yearly', 'year', 9800, '金鉱録 PRO 年額'],
  ])('starts a subscription checkout bound to the verified account: %s', async (product, interval, amount, name) => {
    const response = await checkout(post('/api/checkout', { product, userId: 'other', amount: 1, price: 'price_x' }));
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ url: 'https://checkout.stripe.com/test' });
    expect(state.checkoutParams).toHaveLength(1);
    const params = state.checkoutParams[0];
    expect(params).toMatchObject({ mode: 'subscription', client_reference_id: 'u1', customer_email: 'a@example.com',
      metadata: { product, userId: 'u1' }, subscription_data: { metadata: { product, userId: 'u1' } },
      line_items: [{ quantity: 1, price_data: { currency: 'jpy', unit_amount: amount, recurring: { interval }, product_data: { name } } }],
      success_url: 'http://localhost/success?session_id={CHECKOUT_SESSION_ID}', cancel_url: 'http://localhost/' });
    expect(params).not.toHaveProperty('customer_creation');
  });
  it('uses NEXT_PUBLIC_APP_URL for the return addresses when it is set', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example';
    await buy('pro-yearly');
    expect(state.checkoutParams[0]).toMatchObject({ success_url: 'https://app.example/success?session_id={CHECKOUT_SESSION_ID}', cancel_url: 'https://app.example/' });
  });
  it('refuses a plan that is not for sale with a plain message', async () => {
    delete process.env.PRO_MONTHLY_PRICE_JPY; process.env.PRO_YEARLY_PRICE_JPY = '0';
    for (const product of ['pro-monthly', 'pro-yearly']) {
      const response = await buy(product);
      expect(response.status, product).toBe(400); expect(await response.json()).toEqual({ error: 'このプランは現在販売していません' });
    }
    expect(state.checkoutParams).toHaveLength(0);
  });
  it('stops the founding pass with FOUNDING_PASS_ENABLED=0 while monthly keeps selling', async () => {
    process.env.FOUNDING_PASS_ENABLED = '0';
    const response = await buy('founding-pass');
    expect(response.status).toBe(400); expect(await response.json()).toEqual({ error: 'このプランは現在販売していません' });
    expect(state.checkoutParams).toHaveLength(0);
    expect((await buy('pro-monthly')).status).toBe(200);
  });
  it('rejects unknown, missing and non-string products', async () => {
    for (const body of [{ product: 'pro-weekly' }, { product: 'constructor' }, { product: 1 }, { product: null }, {}, [], 'pro-monthly', null]) {
      expect((await checkout(post('/api/checkout', body))).status, JSON.stringify(body)).toBe(400);
    }
    expect((await checkout(new NextRequest('http://localhost/api/checkout', { method: 'POST', headers: { authorization: 'Bearer valid' }, body: '{oops' }))).status).toBe(400);
    expect(state.checkoutParams).toHaveLength(0);
  });
  it('keeps the login, database, payment configuration and body-size guards for subscriptions', async () => {
    expect((await buy('pro-monthly', false)).status).toBe(401);
    state.offline = true; expect((await buy('pro-monthly')).status).toBe(503); state.offline = false;
    delete process.env.STRIPE_WEBHOOK_SECRET; expect((await buy('pro-monthly')).status).toBe(503);
    process.env.STRIPE_WEBHOOK_SECRET = secret; state.stripeConfigured = false; expect((await buy('pro-yearly')).status).toBe(503); state.stripeConfigured = true;
    const oversized = await checkout(post('/api/checkout', { product: 'pro-monthly', padding: 'x'.repeat(40_000) }));
    expect(oversized.status).toBe(413);
    expect(state.checkoutParams).toHaveLength(0);
  });
  it('does not start a second subscription while one is renewing or still paid through a scheduled cancellation', async () => {
    const subscription = await completeSubscription();
    const blocked = await buy('pro-yearly');
    expect(blocked.status).toBe(409); expect((await blocked.json()).error).toContain('すでに月額・年額プランに加入しています');
    subscription.cancel_at_period_end = true;
    const pending = await buy('pro-yearly');
    expect(pending.status).toBe(409); expect((await pending.json()).error).toContain('解約予約中の契約が期間の終わりまで有効です');
    expect(state.checkoutParams).toHaveLength(0);
  });
  it('allows a new subscription after the old one ended, or to a founding-pass holder', async () => {
    const subscription = await completeSubscription();
    subscription.status = 'canceled';
    expect((await buy('pro-monthly')).status).toBe(200);
    state.subscriptions.clear(); state.database!.exec('DELETE FROM payment_events');
    state.charges.set('ch_f', charge('ch_f')); await deliver('checkout.session.completed', foundingSession(), 'evt_founding');
    expect((await getBillingStatus('u1')).plan).toBe('founding-pass');
    expect((await buy('pro-yearly')).status).toBe(200);
  });
  it('does not guess when the current purchases cannot be verified', async () => {
    await completeSubscription();
    state.providerOffline = true;
    expect((await buy('pro-monthly')).status).toBe(503);
    expect(state.checkoutParams).toHaveLength(0);
  });
});

describe('subscription fulfillment', () => {
  it('records a verified paid subscription and grants access only through it', async () => {
    const subscription = await completeSubscription();
    expect(rows()).toHaveLength(1);
    const [row] = rows();
    expect(row).toMatchObject({ id: 'evt_sub', resource_id: 'sub_1', user_id: 'u1', kind: 'subscription', livemode: 0 });
    expect(JSON.parse(row.fact)).toEqual({ kind: 'subscription', userId: 'u1', active: true, expiresAt: periodEnd(subscription) });
    expect(await getProEntitlement('u1')).toBe(true);
    expect(await authorizePro(get('/api/anything'))).toEqual({ status: 200, uid: 'u1' });
    expect(await getProEntitlement('other')).toBe(false);
  });
  it('stores the latest period end across all subscription items', async () => {
    const soon = nowSeconds() + DAY; const later = nowSeconds() + 400 * DAY;
    await completeSubscription({}, { items: { data: [{ current_period_end: soon, price: {} }, { current_period_end: later, price: {} }] } });
    expect(JSON.parse(rows()[0].fact).expiresAt).toBe(later);
  });
  it('fulfills a delayed payment once it succeeds, without double granting on replay', async () => {
    addSubscription();
    expect((await deliver('checkout.session.async_payment_succeeded', subscriptionSession(), 'evt_async')).status).toBe(200);
    expect((await deliver('checkout.session.async_payment_succeeded', subscriptionSession(), 'evt_async')).status).toBe(200);
    expect(rows()).toHaveLength(1); expect(await getProEntitlement('u1')).toBe(true);
  });
  it('ignores sessions that are unpaid, incomplete, in another currency, or not one of our plans', async () => {
    addSubscription();
    for (const fields of [{ payment_status: 'unpaid' }, { payment_status: 'no_payment_required' }, { status: 'open' }, { currency: 'usd' }, { metadata: { product: 'other', userId: 'u1' } }, { metadata: { userId: 'u1' } }, { mode: 'payment' }]) {
      expect((await deliver('checkout.session.completed', subscriptionSession(fields), `evt_${JSON.stringify(fields).length}`)).status, JSON.stringify(fields)).toBe(200);
    }
    expect(rows()).toHaveLength(0); expect(await getProEntitlement('u1')).toBe(false);
  });
  it.each([
    ['no client_reference_id', { client_reference_id: null }, {}],
    ['metadata userId is another account', { metadata: { product: 'pro-monthly', userId: 'other' } }, {}],
    ['metadata userId is missing', { metadata: { product: 'pro-monthly' } }, {}],
    ['the subscription belongs to another account', {}, { metadata: { product: 'pro-monthly', userId: 'other' } }],
    ['the subscription has no account', {}, { metadata: {} }],
    ['the subscription is for another plan', {}, { metadata: { product: 'pro-yearly', userId: 'u1' } }],
    ['the subscription is from the other Stripe mode', {}, { livemode: true }],
    ['the checkout has no subscription', { subscription: null }, {}],
  ])('asks Stripe to retry and grants nothing when %s', async (_name, sessionFields, subscriptionFields) => {
    addSubscription('sub_1', subscriptionFields);
    expect((await deliver('checkout.session.completed', subscriptionSession(sessionFields), 'evt_bad')).status).toBe(503);
    expect(rows()).toHaveLength(0); expect(await getProEntitlement('u1')).toBe(false);
  });
  it('accepts an expanded subscription object on the session', async () => {
    addSubscription();
    await deliver('checkout.session.completed', subscriptionSession({ subscription: { id: 'sub_1' } }), 'evt_expanded');
    expect(await getProEntitlement('u1')).toBe(true);
  });
  it('returns a retryable error when the ledger is down and succeeds on replay', async () => {
    addSubscription();
    state.offline = true; expect((await deliver('checkout.session.completed', subscriptionSession(), 'evt_retry')).status).toBe(503); state.offline = false;
    expect((await deliver('checkout.session.completed', subscriptionSession(), 'evt_retry')).status).toBe(200);
    expect((await deliver('checkout.session.completed', subscriptionSession(), 'evt_retry')).status).toBe(200);
    expect(rows()).toHaveLength(1);
  });
  it('rejects a webhook from the other Stripe mode or with a wrong signature', async () => {
    addSubscription();
    expect((await deliver('checkout.session.completed', subscriptionSession(), 'evt_live', 100, true)).status).toBe(400);
    expect((await deliver('checkout.session.completed', subscriptionSession(), 'evt_forged', 100, false, 'whsec_wrong')).status).toBe(400);
    expect(rows()).toHaveLength(0);
  });
  it('keeps live-mode ledger facts out of a test-mode account', async () => {
    addSubscription();
    await recordPaymentFacts([paymentRecord('evt_live', 'sub_1', 100, true, { kind: 'subscription', userId: 'u1', active: true, expiresAt: nowSeconds() + DAY })]);
    expect(await getProEntitlement('u1')).toBe(false);
    expect(await getBillingStatus('u1')).toMatchObject({ isPro: false, canManage: false });
  });
  it('does not grant while the first payment is still incomplete, then grants when it succeeds', async () => {
    const subscription = await completeSubscription({}, { status: 'incomplete' });
    expect(JSON.parse(rows()[0].fact).active).toBe(false);
    expect(await getProEntitlement('u1')).toBe(false);
    subscription.status = 'active';
    await deliver('checkout.session.async_payment_succeeded', subscriptionSession(), 'evt_later', 200);
    expect(await getProEntitlement('u1')).toBe(true);
  });
  it('keeps access after a renewal even though the saved period has passed', async () => {
    const subscription = await completeSubscription({}, { items: { data: [{ current_period_end: nowSeconds() - 60, price: {} }] } });
    expect(await getProEntitlement('u1')).toBe(false);
    (subscription.items as { data: Obj[] }).data[0].current_period_end = nowSeconds() + 30 * DAY;
    expect(await getProEntitlement('u1')).toBe(true);
  });
  it('stops access when Stripe cancels the subscription and records the cancellation', async () => {
    const subscription = await completeSubscription();
    expect(await getProEntitlement('u1')).toBe(true);
    subscription.status = 'canceled';
    expect(await getProEntitlement('u1')).toBe(false);
    await deliver('customer.subscription.deleted', subscription, 'evt_deleted', 300);
    expect(rows().map((row) => row.kind)).toEqual(['subscription', 'subscription']);
    expect(JSON.parse(rows()[1].fact)).toMatchObject({ kind: 'subscription', userId: 'u1', active: false });
    expect(await getProEntitlement('u1')).toBe(false);
  });
  it('keeps access while a cancellation is only scheduled, and loses it when payment fails', async () => {
    const subscription = await completeSubscription();
    subscription.cancel_at_period_end = true;
    expect((await deliver('customer.subscription.updated', subscription, 'evt_scheduled', 200)).status).toBe(200);
    expect(rows()).toHaveLength(1); expect(await getProEntitlement('u1')).toBe(true);
    subscription.status = 'past_due';
    await deliver('customer.subscription.updated', subscription, 'evt_past_due', 300);
    expect(rows()).toHaveLength(2); expect(await getProEntitlement('u1')).toBe(false);
    subscription.status = 'active';
    await deliver('customer.subscription.updated', subscription, 'evt_recovered', 400);
    expect(rows()).toHaveLength(2); expect(await getProEntitlement('u1')).toBe(true);
  });
  it('revokes access when the paid invoice is refunded or disputed', async () => {
    await completeSubscription();
    expect(await getProEntitlement('u1')).toBe(true);
    state.charges.get('ch_sub_1')!.refunded = true; expect(await getProEntitlement('u1')).toBe(false);
    state.charges.get('ch_sub_1')!.refunded = false; state.charges.get('ch_sub_1')!.disputed = true; expect(await getProEntitlement('u1')).toBe(false);
  });
  it.each(['draft', 'open'])('keeps access while a renewal invoice is still %s, on the strength of the last paid invoice', async (renewalStatus) => {
    const subscription = await completeSubscription();
    state.invoices.set('in_renewal', { status: renewalStatus, subscription: 'sub_1', created: 2000 });
    subscription.latest_invoice = 'in_renewal';
    expect(await getProEntitlement('u1')).toBe(true);
    expect((await getBillingStatus('u1')).isPro).toBe(true);
    state.charges.get('ch_sub_1')!.refunded = true;
    expect(await getProEntitlement('u1')).toBe(false);
    expect((await getBillingStatus('u1')).isPro).toBe(false);
  });
  it('does not let an older paid invoice cover a refunded newer one during a renewal', async () => {
    const subscription = await completeSubscription();
    state.charges.set('ch_sub_2', charge('ch_sub_2', 980));
    state.invoices.set('in_second', { status: 'paid', charge: 'ch_sub_2', subscription: 'sub_1', created: 1500 });
    state.invoices.set('in_renewal', { status: 'draft', subscription: 'sub_1', created: 2000 });
    subscription.latest_invoice = 'in_renewal';
    expect(await getProEntitlement('u1')).toBe(true);
    state.charges.get('ch_sub_2')!.refunded = true;
    expect(await getProEntitlement('u1')).toBe(false);
  });
  it('gives no access when the latest invoice is unpaid and nothing was ever paid', async () => {
    const subscription = await completeSubscription();
    state.invoices.delete('in_sub_1');
    state.invoices.set('in_first', { status: 'open', subscription: 'sub_1', created: 1000 });
    subscription.latest_invoice = 'in_first';
    expect(await getProEntitlement('u1')).toBe(false);
  });
  it.each(['uncollectible', 'void'])('gives no access when the latest invoice is %s', async (invoiceStatus) => {
    const subscription = await completeSubscription();
    state.invoices.set('in_bad', { status: invoiceStatus, subscription: 'sub_1', created: 2000 });
    subscription.latest_invoice = 'in_bad';
    expect(await getProEntitlement('u1')).toBe(false);
  });
  it('stops access at once when a renewal payment fails, even with an older paid invoice', async () => {
    const subscription = await completeSubscription();
    state.invoices.set('in_renewal', { status: 'open', subscription: 'sub_1', created: 2000 });
    subscription.latest_invoice = 'in_renewal'; subscription.status = 'past_due';
    expect(await getProEntitlement('u1')).toBe(false);
  });
  it('keeps a founding pass when the subscription ends', async () => {
    state.charges.set('ch_f', charge('ch_f')); await deliver('checkout.session.completed', foundingSession(), 'evt_founding');
    const subscription = await completeSubscription();
    subscription.status = 'canceled';
    expect(await getProEntitlement('u1')).toBe(true);
    state.charges.get('ch_f')!.refunded = true;
    expect(await getProEntitlement('u1')).toBe(false);
  });
  it('ignores subscription events that carry no account', async () => {
    const subscription = await completeSubscription();
    subscription.status = 'canceled'; subscription.metadata = {};
    await deliver('customer.subscription.deleted', subscription, 'evt_legacy', 300);
    expect(rows()).toHaveLength(1);
  });
  it('does not put an unreadable period end into the ledger', async () => {
    await completeSubscription({}, { items: { data: [{ price: {} }] } });
    expect(JSON.parse(rows()[0].fact).expiresAt).toBe(0);
    expect(await getProEntitlement('u1')).toBe(false);
  });
});

describe('GET /api/billing/status', () => {
  const status = async (auth = true) => { const response = await billingStatus(get('/api/billing/status', auth)); return { response, body: await response.json() }; };
  it('requires login and keeps the answer private', async () => {
    state.user = null;
    const { response } = await status(false);
    expect(response.status).toBe(401); expect(response.headers.get('vary')).toBe('Authorization');
    state.user = { uid: 'u1', email: 'a@example.com' };
    const signedIn = await status();
    expect(signedIn.response.headers.get('cache-control')).toBe('private, no-store');
  });
  it('says not PRO for a member with no purchases', async () => {
    const { response, body } = await status();
    expect(response.status).toBe(200);
    expect(body).toEqual({ isPro: false, plan: null, renewsAt: null, cancelAtPeriodEnd: false, canManage: false });
  });
  it('reports the founding pass as a permanent plan with nothing to manage', async () => {
    state.charges.set('ch_f', charge('ch_f')); await deliver('checkout.session.completed', foundingSession(), 'evt_founding');
    expect((await status()).body).toEqual({ isPro: true, plan: 'founding-pass', renewsAt: null, cancelAtPeriodEnd: false, canManage: false });
  });
  it.each([
    ['pro-monthly', 'month', 'sub_1'],
    ['pro-yearly', 'year', 'sub_1'],
  ])('reports an active %s subscription with its renewal date', async (product, interval, id) => {
    const subscription = addSubscription(id, { metadata: { product, userId: 'u1' }, items: { data: [{ current_period_end: nowSeconds() + 30 * DAY, price: { recurring: { interval, interval_count: 1 } } }] } });
    await deliver('checkout.session.completed', subscriptionSession({ metadata: { product, userId: 'u1' } }), 'evt_sub');
    const { body } = await status();
    expect(body).toEqual({ isPro: true, plan: product, renewsAt: periodEnd(subscription) * 1000, cancelAtPeriodEnd: false, canManage: true });
    expect(body.isPro).toBe(await getProEntitlement('u1'));
  });
  it('shows a scheduled cancellation and the last day of access', async () => {
    const subscription = await completeSubscription({}, { cancel_at_period_end: true });
    expect((await status()).body).toEqual({ isPro: true, plan: 'pro-monthly', renewsAt: periodEnd(subscription) * 1000, cancelAtPeriodEnd: true, canManage: true });
    const earlier = nowSeconds() + 5 * DAY;
    Object.assign(subscription, { cancel_at_period_end: false, cancel_at: earlier });
    expect((await status()).body).toMatchObject({ isPro: true, renewsAt: earlier * 1000, cancelAtPeriodEnd: true });
    Object.assign(subscription, { cancel_at: nowSeconds() - DAY });
    expect((await status()).body).toMatchObject({ isPro: true, renewsAt: periodEnd(subscription) * 1000, cancelAtPeriodEnd: false });
  });
  it('drops PRO for a canceled subscription and offers nothing to manage', async () => {
    const subscription = await completeSubscription();
    subscription.status = 'canceled';
    expect((await status()).body).toEqual({ isPro: false, plan: null, renewsAt: null, cancelAtPeriodEnd: false, canManage: false });
  });
  it('keeps the management screen open for a failed payment so the card can be fixed', async () => {
    const subscription = await completeSubscription();
    subscription.status = 'past_due';
    expect((await status()).body).toEqual({ isPro: false, plan: null, renewsAt: null, cancelAtPeriodEnd: false, canManage: true });
  });
  it('withdraws PRO after a refund', async () => {
    await completeSubscription();
    state.charges.get('ch_sub_1')!.refunded = true;
    expect((await status()).body).toMatchObject({ isPro: false, plan: null });
  });
  it('shows the subscription plan when a founding pass and a subscription are both valid', async () => {
    state.charges.set('ch_f', charge('ch_f')); await deliver('checkout.session.completed', foundingSession(), 'evt_founding');
    await completeSubscription();
    expect((await status()).body).toMatchObject({ isPro: true, plan: 'pro-monthly', canManage: true });
  });
  it('prefers the subscription that lasts longest when two are valid', async () => {
    const monthly = addSubscription('sub_1'); const yearly = addSubscription('sub_2', { metadata: { product: 'pro-yearly', userId: 'u1' }, items: { data: [{ current_period_end: nowSeconds() + 300 * DAY, price: {} }] } });
    await deliver('checkout.session.completed', subscriptionSession(), 'evt_a');
    await deliver('checkout.session.completed', subscriptionSession({ id: 'cs_sub_2', subscription: 'sub_2', metadata: { product: 'pro-yearly', userId: 'u1' } }), 'evt_b');
    expect(periodEnd(yearly)).toBeGreaterThan(periodEnd(monthly));
    expect((await status()).body).toMatchObject({ plan: 'pro-yearly', renewsAt: periodEnd(yearly) * 1000 });
  });
  it('never shows another member\'s subscription', async () => {
    await completeSubscription();
    state.user = { uid: 'other', email: 'b@example.com' };
    expect((await status()).body).toEqual({ isPro: false, plan: null, renewsAt: null, cancelAtPeriodEnd: false, canManage: false });
  });
  it('fails with 503 and no guess when the ledger or Stripe cannot be read', async () => {
    await completeSubscription();
    state.offline = true;
    const ledgerDown = await status();
    expect(ledgerDown.response.status).toBe(503); expect(ledgerDown.body).toEqual({ error: '契約状況を確認できません。時間をおいて再度お試しください' });
    state.offline = false; state.providerOffline = true;
    const providerDown = await status();
    expect(providerDown.response.status).toBe(503); expect(providerDown.body).not.toHaveProperty('isPro');
    state.providerOffline = false; state.stripeConfigured = false;
    expect((await status()).response.status).toBe(503);
  });
  it('answers not PRO without Stripe when the member has never paid', async () => {
    state.stripeConfigured = false;
    expect((await status()).body).toMatchObject({ isPro: false, canManage: false });
  });
  it('reads a migrated legacy subscription and names its plan from the billing interval', async () => {
    state.database!.prepare('INSERT INTO users (id,email,legacy_is_pro,stripe_customer_id,stripe_subscription_id) VALUES (?,?,1,?,?)').run('u1', 'a@example.com', 'cus_1', 'sub_legacy');
    const legacy = addSubscription('sub_legacy', { metadata: {}, items: { data: [{ current_period_end: nowSeconds() + 100 * DAY, price: { recurring: { interval: 'year', interval_count: 1 } } }] } });
    expect((await status()).body).toEqual({ isPro: true, plan: 'pro-yearly', renewsAt: periodEnd(legacy) * 1000, cancelAtPeriodEnd: false, canManage: true });
    legacy.items = { data: [{ current_period_end: nowSeconds() + 100 * DAY, price: { recurring: { interval: 'month', interval_count: 3 } } }] };
    expect((await status()).body).toMatchObject({ isPro: true, plan: null });
  });
});

describe('POST /api/billing/portal', () => {
  const open = async (auth = true) => { const response = await portal(post('/api/billing/portal', {}, auth)); return { response, body: await response.json() }; };
  it('requires login', async () => {
    state.user = null;
    expect((await open(false)).response.status).toBe(401); expect(state.portalParams).toHaveLength(0);
  });
  it('returns 404 when the member has no subscription', async () => {
    const { response, body } = await open();
    expect(response.status).toBe(404); expect(body).toEqual({ error: '管理できる契約が見つかりません' }); expect(state.portalParams).toHaveLength(0);
    state.charges.set('ch_f', charge('ch_f')); await deliver('checkout.session.completed', foundingSession(), 'evt_founding');
    expect((await open()).response.status).toBe(404);
  });
  it('opens the Stripe customer portal for the member\'s own subscription and comes back to the top page', async () => {
    await completeSubscription();
    const { response, body } = await open();
    expect(response.status).toBe(200); expect(body).toEqual({ url: 'https://billing.stripe.com/session/test' });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(state.portalParams).toEqual([{ customer: 'cus_1', return_url: 'http://localhost/account' }]);
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example';
    await open();
    expect(state.portalParams[1]).toEqual({ customer: 'cus_1', return_url: 'https://app.example/account' });
  });
  it('never opens another member\'s subscription', async () => {
    await completeSubscription();
    state.user = { uid: 'other', email: 'b@example.com' };
    expect((await open()).response.status).toBe(404); expect(state.portalParams).toHaveLength(0);
  });
  it('chooses the live subscription over ended ones, and a failed payment over an ended one', async () => {
    const now = nowSeconds();
    addSubscription('sub_old', { status: 'canceled', customer: 'cus_old', created: 100 });
    addSubscription('sub_new', { customer: 'cus_new', created: 200 });
    addSubscription('sub_late', { status: 'past_due', customer: 'cus_late', created: 300 });
    await recordPaymentFacts(['sub_old', 'sub_new', 'sub_late'].map((id, index) => paymentRecord(`evt_${id}`, id, 100 + index, false, { kind: 'subscription', userId: 'u1', active: true, expiresAt: now + DAY })));
    await open();
    expect(state.portalParams[0]).toMatchObject({ customer: 'cus_new' });
    state.subscriptions.get('sub_new')!.status = 'canceled';
    await open();
    expect(state.portalParams[1]).toMatchObject({ customer: 'cus_late' });
    state.subscriptions.get('sub_late')!.status = 'canceled';
    expect((await open()).response.status).toBe(404);
  });
  it('reports 503 without exposing details when Stripe or the ledger fails', async () => {
    await completeSubscription();
    state.portalFails = true;
    const portalDown = await open();
    expect(portalDown.response.status).toBe(503); expect(portalDown.body).toEqual({ error: '契約の管理画面を開けませんでした。時間をおいて再度お試しください' });
    state.portalFails = false; state.providerOffline = true; expect((await open()).response.status).toBe(503);
    state.providerOffline = false; state.offline = true; expect((await open()).response.status).toBe(503);
    state.offline = false; state.stripeConfigured = false; expect((await open()).response.status).toBe(503);
  });
});

describe('POST /api/checkout/status for subscription purchases', () => {
  const check = async (body: unknown = { sessionId: 'cs_sub_1' }) => { const response = await checkoutStatus(post('/api/checkout/status', body)); return { response, body: await response.json() }; };
  it('waits for the signed webhook, then confirms, then reports a lost subscription', async () => {
    const subscription = addSubscription(); state.session = subscriptionSession();
    expect((await check()).body).toEqual({ status: 'pending' });
    await deliver('checkout.session.completed', state.session, 'evt_sub');
    expect((await check()).body).toEqual({ status: 'confirmed' });
    subscription.status = 'canceled';
    expect((await check()).body).toEqual({ status: 'revoked' });
  });
  it('reports a refunded subscription payment as revoked', async () => {
    addSubscription(); state.session = subscriptionSession();
    await deliver('checkout.session.completed', state.session, 'evt_sub');
    state.charges.get('ch_sub_1')!.refunded = true;
    expect((await check()).body).toEqual({ status: 'revoked' });
  });
  it('does not confirm an unpaid checkout or another member\'s checkout', async () => {
    addSubscription(); state.session = subscriptionSession({ payment_status: 'unpaid' });
    expect((await check()).body).toEqual({ status: 'unpaid' });
    state.session = subscriptionSession({ client_reference_id: 'other' });
    expect((await check()).response.status).toBe(403);
    state.session = subscriptionSession({ metadata: { product: 'pro-monthly', userId: 'other' } });
    expect((await check()).response.status).toBe(403);
  });
  it('fails closed when the subscription cannot be read', async () => {
    addSubscription(); state.session = subscriptionSession({ subscription: null });
    expect((await check()).response.status).toBe(503);
    state.session = subscriptionSession(); state.providerOffline = true;
    expect((await check()).response.status).toBe(503);
  });
});
