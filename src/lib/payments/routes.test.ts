import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import Stripe from 'stripe';
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({ database: null as DatabaseSync | null, offline: false, user: { uid: 'u1', email: 'a@example.com' } as { uid: string; email: string } | null,
  session: {} as Record<string, unknown>, event: {} as Record<string, unknown>, charges: new Map<string, Record<string, unknown>>(), disputes: [] as { status: string }[], legacySessions: [] as Record<string, unknown>[], subscription: null as Record<string, unknown> | null, live: false }));
vi.mock('@/lib/storage/d1', () => ({
  queryD1: vi.fn(async (sql: string, params: (string | number | null)[] = []) => { if (state.offline) throw new Error('Offline'); return state.database!.prepare(sql).all(...params); }),
  executeD1: vi.fn(async (sql: string, params: (string | number | null)[] = []) => { if (state.offline) throw new Error('Offline'); return state.database!.prepare(sql).run(...params); }),
  batchD1: vi.fn(async (statements: { sql: string; params: (string | number | null)[] }[]) => {
    if (state.offline) throw new Error('Offline'); const db = state.database!; db.exec('BEGIN');
    try { const result = statements.map((s) => db.prepare(s.sql).run(...s.params)); db.exec('COMMIT'); return result; }
    catch (e) { db.exec('ROLLBACK'); throw e; }
  }),
}));
const stripe = vi.hoisted(() => ({ checkout: { sessions: { create: vi.fn(async () => ({ url: 'https://checkout.stripe.com/test' })), retrieve: vi.fn(async () => state.session), list: vi.fn(() => (async function* () { for (const session of state.legacySessions) yield session; })()) } },
  paymentIntents: { retrieve: vi.fn(async (id: string) => ({ latest_charge: id.replace('pi_', 'ch_'), status: 'succeeded' })) },
  charges: { retrieve: vi.fn(async (id: string) => { const charge = state.charges.get(id); if (!charge) throw new Error('Unavailable'); return charge; }) },
  disputes: { list: vi.fn(() => (async function* () { for (const dispute of state.disputes) yield dispute; })()) },
  subscriptions: { retrieve: vi.fn(async () => state.subscription), list: vi.fn(() => (async function* () { if (state.subscription) yield state.subscription; })()) },
  invoices: { retrieve: vi.fn(async () => ({ status: 'paid' })) },
  invoicePayments: { list: vi.fn(() => (async function* () { yield { status: 'paid', payment: { charge: 'ch_sub' } }; })()) },
  webhooks: { constructEventAsync: vi.fn() },
}));
vi.mock('@/lib/stripe', () => ({ getStripeClient: vi.fn(async () => stripe), paymentLiveMode: vi.fn(async () => state.live) }));
vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: vi.fn(async () => state.user) }));
import { POST as checkout } from '@/app/api/checkout/route';
import { POST as status } from '@/app/api/checkout/status/route';
import { POST as webhook } from '@/app/api/webhooks/stripe/route';
import { GET as userStatus } from '@/app/api/user/me/route';
import { queryD1 } from '@/lib/storage/d1';
import { authorizePro, getProEntitlement, recordPaymentFacts } from './entitlement';
import { paymentRecord } from './lifecycle';
const localStripe = new Stripe('sk_test_unit');
const secret = 'whsec_unit_test';
function request(body: unknown = { sessionId: 'cs_test_123' }, auth = true) {
  return new NextRequest('http://localhost/api/checkout', { method: 'POST', headers: auth ? { authorization: 'Bearer valid' } : {}, body: JSON.stringify(body) });
}
function eventRequest(valid = true) {
  const payload = JSON.stringify(state.event);
  const signature = localStripe.webhooks.generateTestHeaderString({ payload, secret: valid ? secret : 'wrong' });
  return new Request('http://localhost/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': signature }, body: payload });
}
const charge = (id = 'ch_1') => ({ id, currency: 'jpy', paid: true, captured: true, refunded: false, amount: 1980, amount_captured: 1980, amount_refunded: 0, disputed: false, livemode: false });
function setEvent(type = 'checkout.session.completed', object: unknown = state.session, id = 'evt_1', created = 100) {
  state.event = { id, type, created, livemode: false, data: { object } };
}
beforeEach(() => {
  vi.clearAllMocks(); state.database = new DatabaseSync(':memory:'); state.offline = false; state.live = false;
  state.database.exec(readFileSync('migrations/d1/0001_users.sql', 'utf8')); state.database.exec(readFileSync('migrations/d1/0002_payments.sql', 'utf8'));
  state.user = { uid: 'u1', email: 'a@example.com' }; state.charges = new Map([['ch_1', charge()]]); state.disputes = []; state.legacySessions = []; state.subscription = null;
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  stripe.webhooks.constructEventAsync.mockImplementation((payload, signature, key) => localStripe.webhooks.constructEventAsync(payload, signature, key));
  state.session = { id: 'cs_test_123', created: 100, mode: 'payment', status: 'complete', payment_status: 'paid', currency: 'jpy', amount_total: 1980,
    metadata: { product: 'founding-pass', userId: 'u1' }, client_reference_id: 'u1', customer: 'cus_1', payment_intent: 'pi_1', livemode: false };
  setEvent();
});
afterEach(() => { state.database?.close(); });

describe('D1 and Stripe paid-account boundary', () => {
  it('does not create anonymous or unavailable-persistence purchases', async () => {
    expect((await checkout(request({ product: 'founding-pass' }, false))).status).toBe(401);
    state.offline = true; expect((await checkout(request({ product: 'founding-pass' }))).status).toBe(503);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it('refuses checkout when signed fulfillment is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect((await checkout(request({ product: 'founding-pass' }))).status).toBe(503);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it('binds checkout to the verified account and fixed one-time price', async () => {
    expect((await checkout(request({ product: 'founding-pass', userId: 'other', amount: 1 }))).status).toBe(200);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({ mode: 'payment', client_reference_id: 'u1', metadata: { product: 'founding-pass', userId: 'u1' },
      line_items: [expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 1980, currency: 'jpy' }) })] }));
  });
  it('rejects unauthenticated/sessionless/wrong-owner status visits', async () => {
    expect((await status(request({}, false))).status).toBe(401); expect((await status(request({}))).status).toBe(400);
    state.session.client_reference_id = 'other'; expect((await status(request())).status).toBe(403);
  });
  it('requires signed persisted fulfillment, then verifies provider before success', async () => {
    expect(await (await status(request())).json()).toEqual({ status: 'pending' });
    expect((await webhook(eventRequest())).status).toBe(200);
    expect(await (await status(request())).json()).toEqual({ status: 'confirmed' });
    state.charges.get('ch_1')!.refunded = true;
    expect(await (await status(request())).json()).toEqual({ status: 'revoked' });
  });
  it.each([{ payment_status: 'unpaid' }, { amount_total: 1 }, { currency: 'usd' }, { mode: 'subscription' }, { status: 'open' }, { metadata: { product: 'other', userId: 'u1' } }])('does not fulfill an invalid payment %j', async (fields) => {
    Object.assign(state.session, fields); setEvent(); expect((await webhook(eventRequest())).status).toBe(200);
    expect(await getProEntitlement('u1')).toBe(false);
  });
  it('uses real signature verification and rejects wrong environment', async () => {
    expect((await webhook(eventRequest(false))).status).toBe(400);
    state.event.livemode = true; expect((await webhook(eventRequest())).status).toBe(400);
    expect(await getProEntitlement('u1')).toBe(false);
  });
  it('returns retryable errors on persistence failure and succeeds on replay', async () => {
    state.offline = true; expect((await webhook(eventRequest())).status).toBe(503);
    state.offline = false; expect((await webhook(eventRequest())).status).toBe(200);
    expect((await webhook(eventRequest())).status).toBe(200);
    expect(state.database!.prepare('SELECT count(*) AS n FROM payment_events').get()).toMatchObject({ n: 1 });
  });
  it('saves an entire fulfillment batch atomically', async () => {
    const good = paymentRecord('evt_atomic', 'ch_1', 1, false, { kind: 'purchase', userId: 'u1', amount: 1980, sessionId: 'cs_test' });
    await expect(recordPaymentFacts([good, { ...good, id: 'evt_invalid', kind: 'invalid' }])).rejects.toThrow();
    expect(state.database!.prepare('SELECT count(*) AS n FROM payment_events').get()).toMatchObject({ n: 0 });
  });
  it('fulfills delayed payments without double granting', async () => {
    setEvent('checkout.session.async_payment_succeeded'); expect((await webhook(eventRequest())).status).toBe(200);
    expect(await getProEntitlement('u1')).toBe(true);
  });
  it('never assigns anonymous or mismatched account payments by email', async () => {
    state.session.client_reference_id = null; setEvent(); expect((await webhook(eventRequest())).status).toBe(503);
    state.session.client_reference_id = 'u1'; state.session.metadata = { product: 'founding-pass', userId: 'other' }; setEvent();
    expect((await webhook(eventRequest())).status).toBe(503); expect(await getProEntitlement('u1')).toBe(false);
  });
  it.each([true, false])('handles refund before/after completion: %s', async (refundFirst) => {
    const pay = async () => { setEvent(); expect((await webhook(eventRequest())).status).toBe(200); };
    const refund = async () => { state.charges.get('ch_1')!.amount_refunded = 1980; state.charges.get('ch_1')!.refunded = true; setEvent('charge.refunded', state.charges.get('ch_1'), 'evt_refund', 200); expect((await webhook(eventRequest())).status).toBe(200); };
    if (refundFirst) { await refund(); await pay(); } else { await pay(); await refund(); }
    expect(await getProEntitlement('u1')).toBe(false);
  });
  it('keeps a partial refund and a separate repurchase valid', async () => {
    await webhook(eventRequest()); state.charges.get('ch_1')!.amount_refunded = 500;
    setEvent('charge.refunded', state.charges.get('ch_1'), 'evt_partial', 200); await webhook(eventRequest());
    expect(await getProEntitlement('u1')).toBe(true);
    state.charges.get('ch_1')!.refunded = true; state.charges.get('ch_1')!.amount_refunded = 1980;
    setEvent('charge.refunded', state.charges.get('ch_1'), 'evt_full', 300); await webhook(eventRequest());
    state.charges.set('ch_2', charge('ch_2')); state.session.payment_intent = 'pi_2'; state.session.id = 'cs_test_2'; setEvent('checkout.session.completed', state.session, 'evt_second', 400); await webhook(eventRequest());
    expect(await getProEntitlement('u1')).toBe(true); expect(await getProEntitlement('other')).toBe(false);
  });
  it('suspends disputes and restores a won dispute despite reversed event delivery', async () => {
    await webhook(eventRequest()); state.charges.get('ch_1')!.disputed = true;
    state.disputes = [{ status: 'needs_response' }];
    setEvent('charge.dispute.created', { id: 'dp_1', charge: 'ch_1', status: 'needs_response' }, 'evt_open', 200); await webhook(eventRequest());
    expect(await getProEntitlement('u1')).toBe(false);
    state.disputes = [{ status: 'won' }];
    setEvent('charge.dispute.closed', { id: 'dp_1', charge: 'ch_1', status: 'won' }, 'evt_won', 300); await webhook(eventRequest());
    setEvent('charge.dispute.updated', { id: 'dp_1', charge: 'ch_1', status: 'under_review' }, 'evt_delayed', 250); await webhook(eventRequest());
    expect(await getProEntitlement('u1')).toBe(true);
  });
  it('rejects an undercaptured charge even when checkout says paid', async () => {
    state.charges.get('ch_1')!.amount_captured = 1;
    expect((await webhook(eventRequest())).status).toBe(503); expect(await getProEntitlement('u1')).toBe(false);
  });
  it('fails closed on DB/provider failures and refuses another UID', async () => {
    await webhook(eventRequest()); expect(await authorizePro(request())).toEqual({ status: 200, uid: 'u1' });
    state.offline = true; expect(await authorizePro(request())).toEqual({ status: 503 }); state.offline = false;
    state.charges.clear(); expect(await authorizePro(request())).toEqual({ status: 503 });
    state.user = { uid: 'other', email: 'b@example.com' }; expect(await authorizePro(request())).toEqual({ status: 403 });
    state.user = null; expect(await authorizePro(request())).toEqual({ status: 401 });
  });
  it('reconciles a legacy paid customer binding, never a different account', async () => {
    await userStatus(request());
    state.database!.prepare('UPDATE users SET legacy_is_pro=1,stripe_customer_id=? WHERE id=?').run('cus_1', 'u1');
    state.legacySessions = [{ ...state.session, client_reference_id: 'other', metadata: { product: 'founding-pass', userId: 'other' } }];
    expect(await getProEntitlement('u1')).toBe(false);
    state.legacySessions = [{ ...state.session, client_reference_id: null, metadata: { product: 'founding-pass', userId: '' } }];
    expect(await getProEntitlement('u1')).toBe(true);
    expect(await getProEntitlement('other')).toBe(false);
  });
  it('reconciles a legacy subscription, expires it at Stripe, and preserves a separate purchase', async () => {
    await userStatus(request());
    state.database!.prepare('UPDATE users SET legacy_is_pro=1,stripe_customer_id=?,stripe_subscription_id=? WHERE id=?').run('cus_1', 'sub_1', 'u1');
    state.charges.set('ch_sub', charge('ch_sub'));
    state.subscription = { id: 'sub_1', status: 'active', customer: 'cus_1', livemode: false, metadata: {}, latest_invoice: 'in_1', items: { data: [{ current_period_end: Math.floor(Date.now()/1000) + 1000 }] } };
    expect(await getProEntitlement('u1')).toBe(true);
    state.subscription.status = 'canceled'; expect(await getProEntitlement('u1')).toBe(false);
    await webhook(eventRequest()); expect(await getProEntitlement('u1')).toBe(true);
  });
  it('revokes a legacy subscription whose current invoice charge was refunded', async () => {
    await userStatus(request());
    state.database!.prepare('UPDATE users SET legacy_is_pro=1,stripe_customer_id=?,stripe_subscription_id=? WHERE id=?').run('cus_1', 'sub_1', 'u1');
    state.charges.set('ch_sub', charge('ch_sub'));
    state.subscription = { id: 'sub_1', status: 'active', customer: 'cus_1', livemode: false, metadata: {}, latest_invoice: 'in_1', items: { data: [{ current_period_end: Math.floor(Date.now()/1000) + 1000 }] } };
    expect(await getProEntitlement('u1')).toBe(true);
    state.charges.get('ch_sub')!.refunded = true;
    expect(await getProEntitlement('u1')).toBe(false);
  });
  it('keeps user responses private and rejects malformed persisted profiles', async () => {
    const response = await userStatus(request());
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('vary')).toBe('Authorization');
    vi.mocked(queryD1).mockResolvedValueOnce([{ id: 'u1', email: 'a@example.com', display_name: null, role: 'unexpected' }]);
    const malformed = await userStatus(request()); expect(malformed.status).toBe(503);
    expect(malformed.headers.get('cache-control')).toBe('private, no-store');
    state.user = null; const anonymous = await userStatus(request());
    expect(anonymous.status).toBe(401); expect(anonymous.headers.get('vary')).toBe('Authorization');
  });
  it('persists user profile separately and never trusts a migrated isPro bit', async () => {
    expect(await (await userStatus(request())).json()).toMatchObject({ uid: 'u1', isPro: false });
    state.database!.prepare('UPDATE users SET legacy_is_pro = 1 WHERE id = ?').run('u1');
    expect(await (await userStatus(request())).json()).toMatchObject({ uid: 'u1', isPro: false });
    await webhook(eventRequest()); expect(await (await userStatus(request())).json()).toMatchObject({ uid: 'u1', isPro: true });
    state.offline = true; expect((await userStatus(request())).status).toBe(503);
  });
});
