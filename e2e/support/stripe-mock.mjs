#!/usr/bin/env node
/**
 * ローカル専用の Stripe 偽装サーバー（e2e/account-flow.spec.ts 用）。本物の Stripe には一切つながず、請求も起きない。
 *
 * アプリ側は、開発時（NODE_ENV!=='production'）かつ STRIPE_LOCAL_MOCK_HOST=127.0.0.1:<port> かつ
 * STRIPE_SECRET_KEY が sk_test_ で始まるときだけ、ここへつなぐ（src/lib/stripe.ts の resolveLocalStripeHost）。
 *
 * 使い方:
 *   STRIPE_MOCK_PORT=12111 STRIPE_MOCK_APP_URL=http://127.0.0.1:3131 STRIPE_MOCK_WEBHOOK_SECRET=whsec_local_mock node e2e/support/stripe-mock.mjs
 *
 * 再現する範囲: 月額・年額の Checkout（作成・支払い・完了通知）、契約・請求書・支払い・課金の読み取り、
 * 契約の管理画面（解約予約だけ）、創刊版（買い切り＝mode=payment の Checkout と支払い意図の読み取り）。返金・異議申立ては再現しない。
 */
import { createServer } from 'node:http';
import { createHmac, randomBytes } from 'node:crypto';

const port = Number(process.env.STRIPE_MOCK_PORT || 12111);
const appUrl = (process.env.STRIPE_MOCK_APP_URL || 'http://127.0.0.1:3131').replace(/\/$/, '');
const webhookSecret = process.env.STRIPE_MOCK_WEBHOOK_SECRET || 'whsec_local_mock';
const self = `http://127.0.0.1:${port}`;

const store = { sessions: new Map(), subscriptions: new Map(), invoices: new Map(), charges: new Map(), intents: new Map() };
const id = (prefix) => `${prefix}_test_${randomBytes(8).toString('hex')}`;
const now = () => Math.floor(Date.now() / 1000);

/** Stripe の form 形式（a[b][0][c]=1）を入れ子のオブジェクトに直す */
function parseForm(text) {
  const out = {};
  for (const [rawKey, value] of new URLSearchParams(text)) {
    const keys = rawKey.replace(/\]/g, '').split('[');
    let node = out;
    keys.forEach((key, index) => {
      if (index === keys.length - 1) node[key] = value;
      else node = node[key] ??= {};
    });
  }
  return out;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}
const notFound = (res, what) => send(res, 404, { error: { type: 'invalid_request_error', message: `No such ${what}` } });
const list = (data, url) => ({ object: 'list', data, has_more: false, url });

function html(res, body) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>テスト用の決済</title>
<body style="font-family:sans-serif;background:#111;color:#eee;padding:24px;max-width:480px;margin:auto">
<p style="border:1px solid #f90;padding:8px">ローカル確認用の偽の決済画面です。本物の請求は起きません。</p>${body}</body></html>`);
}

async function sendWebhook(type, object) {
  const event = { id: id('evt'), object: 'event', api_version: '2025-01-01', created: now(), livemode: false, type, data: { object }, pending_webhooks: 1, request: null };
  const payload = JSON.stringify(event);
  const t = now();
  const signature = createHmac('sha256', webhookSecret).update(`${t}.${payload}`).digest('hex');
  const response = await fetch(`${appUrl}/api/webhooks/stripe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${t},v1=${signature}` }, body: payload,
  });
  console.log(`[stripe-mock] webhook ${type} -> ${response.status}`);
  return response.status;
}

function completePayment(session) {
  const customer = id('cus');
  const charge = { id: id('ch'), object: 'charge', paid: true, captured: true, refunded: false, disputed: false,
    amount: session.amount_total, amount_captured: session.amount_total, amount_refunded: 0, currency: 'jpy', livemode: false };
  store.charges.set(charge.id, charge);
  const intent = { id: id('pi'), object: 'payment_intent', status: 'succeeded', latest_charge: charge.id, livemode: false };
  store.intents.set(intent.id, intent);
  Object.assign(session, { status: 'complete', payment_status: 'paid', payment_intent: intent.id, customer });
}

function completeCheckout(session) {
  const customer = id('cus');
  const charge = { id: id('ch'), object: 'charge', paid: true, captured: true, refunded: false, disputed: false,
    amount: session.amount_total, amount_captured: session.amount_total, amount_refunded: 0, currency: 'jpy', livemode: false };
  store.charges.set(charge.id, charge);
  const invoice = { id: id('in'), object: 'invoice', status: 'paid', charge: charge.id, payments: [{ id: id('inpay'), object: 'invoice_payment', status: 'paid', payment: { type: 'charge', charge: charge.id } }] };
  store.invoices.set(invoice.id, invoice);
  const interval = session.line_items?.[0]?.price_data?.recurring?.interval || 'month';
  const periodEnd = now() + (interval === 'year' ? 365 : 30) * 86400;
  const subscription = {
    id: id('sub'), object: 'subscription', status: 'active', livemode: false, customer, created: now(),
    cancel_at: null, cancel_at_period_end: false, latest_invoice: invoice.id,
    metadata: session.subscription_data?.metadata || session.metadata || {},
    items: { object: 'list', data: [{ id: id('si'), object: 'subscription_item', current_period_end: periodEnd, price: { recurring: { interval, interval_count: 1 } } }] },
  };
  store.subscriptions.set(subscription.id, subscription);
  Object.assign(session, { status: 'complete', payment_status: 'paid', subscription: subscription.id, customer });
  return subscription;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, self);
  const path = url.pathname;
  const body = req.method === 'POST' ? parseForm(await readBody(req)) : {};
  try {
    // --- API ---
    if (req.method === 'POST' && path === '/v1/checkout/sessions') {
      if (body.mode !== 'subscription' && body.mode !== 'payment') return send(res, 400, { error: { type: 'invalid_request_error', message: 'この偽装サーバーは月額・年額・買い切りだけ扱います' } });
      const item = body.line_items?.['0'] ?? {};
      const session = {
        id: id('cs'), object: 'checkout.session', mode: body.mode, status: 'open', payment_status: 'unpaid', currency: 'jpy', livemode: false,
        client_reference_id: body.client_reference_id ?? null, customer_email: body.customer_email ?? null,
        metadata: body.metadata ?? {}, subscription_data: body.subscription_data ?? {}, line_items: [item],
        amount_total: Number(item.price_data?.unit_amount ?? 0), success_url: body.success_url, cancel_url: body.cancel_url,
        subscription: null, payment_intent: null, customer: null,
      };
      session.url = `${self}/pay/${session.id}`;
      store.sessions.set(session.id, session);
      return send(res, 200, session);
    }
    let match;
    if (req.method === 'GET' && (match = /^\/v1\/checkout\/sessions\/([^/]+)$/.exec(path))) {
      const session = store.sessions.get(match[1]);
      return session ? send(res, 200, session) : notFound(res, 'checkout.session');
    }
    if (req.method === 'GET' && (match = /^\/v1\/payment_intents\/([^/]+)$/.exec(path))) {
      const intent = store.intents.get(match[1]);
      return intent ? send(res, 200, intent) : notFound(res, 'payment_intent');
    }
    if (req.method === 'GET' && (match = /^\/v1\/subscriptions\/([^/]+)$/.exec(path))) {
      const subscription = store.subscriptions.get(match[1]);
      return subscription ? send(res, 200, subscription) : notFound(res, 'subscription');
    }
    if (req.method === 'GET' && (match = /^\/v1\/invoices\/([^/]+)$/.exec(path))) {
      const invoice = store.invoices.get(match[1]);
      return invoice ? send(res, 200, invoice) : notFound(res, 'invoice');
    }
    if (req.method === 'GET' && path === '/v1/invoices') {
      const subscription = store.subscriptions.get(url.searchParams.get('subscription'));
      const invoice = subscription ? store.invoices.get(subscription.latest_invoice) : null;
      return send(res, 200, list(invoice ? [invoice] : [], '/v1/invoices'));
    }
    if (req.method === 'GET' && path === '/v1/invoice_payments') {
      const invoice = store.invoices.get(url.searchParams.get('invoice'));
      return send(res, 200, list(invoice ? invoice.payments : [], '/v1/invoice_payments'));
    }
    if (req.method === 'GET' && (match = /^\/v1\/charges\/([^/]+)$/.exec(path))) {
      const charge = store.charges.get(match[1]);
      return charge ? send(res, 200, charge) : notFound(res, 'charge');
    }
    if (req.method === 'GET' && path === '/v1/disputes') return send(res, 200, list([], '/v1/disputes'));
    if (req.method === 'POST' && path === '/v1/billing_portal/sessions') {
      return send(res, 200, { id: id('bps'), object: 'billing_portal.session', url: `${self}/portal?customer=${encodeURIComponent(body.customer)}&return_url=${encodeURIComponent(body.return_url)}` });
    }

    // --- 偽の決済画面・契約管理画面 ---
    if (req.method === 'GET' && (match = /^\/pay\/([^/]+)$/.exec(path))) {
      const session = store.sessions.get(match[1]);
      if (!session) return notFound(res, 'checkout.session');
      return html(res, `<h1>お支払い（テスト）</h1><p>¥${session.amount_total.toLocaleString('ja-JP')}</p>
<form method="post"><button type="submit" style="min-height:44px;padding:0 16px">支払う（テスト）</button></form>
<p><a style="color:#9cf" href="${session.cancel_url}">やめる</a></p>`);
    }
    if (req.method === 'POST' && (match = /^\/pay\/([^/]+)$/.exec(path))) {
      const session = store.sessions.get(match[1]);
      if (!session) return notFound(res, 'checkout.session');
      if (session.status !== 'complete') {
        if (session.mode === 'payment') completePayment(session);
        else completeCheckout(session);
        await sendWebhook('checkout.session.completed', session);
      }
      res.writeHead(303, { Location: session.success_url.replace('{CHECKOUT_SESSION_ID}', session.id) });
      return res.end();
    }
    if (path === '/portal') {
      const customer = url.searchParams.get('customer');
      const returnUrl = url.searchParams.get('return_url') || appUrl;
      const subscription = [...store.subscriptions.values()].find((value) => value.customer === customer);
      if (req.method === 'POST' && subscription) {
        subscription.cancel_at_period_end = true;
        await sendWebhook('customer.subscription.updated', subscription);
        res.writeHead(303, { Location: returnUrl });
        return res.end();
      }
      return html(res, `<h1>契約の管理（テスト）</h1><p>${subscription ? (subscription.cancel_at_period_end ? '解約予約済み' : '契約中') : '契約なし'}</p>
<form method="post"><button type="submit" style="min-height:44px;padding:0 16px">解約する（テスト）</button></form>
<p><a style="color:#9cf" href="${returnUrl}">サービスに戻る</a></p>`);
    }
    if (path === '/health') return send(res, 200, { ok: true });
    return notFound(res, `route ${req.method} ${path}`);
  } catch (error) {
    console.error('[stripe-mock]', error);
    return send(res, 500, { error: { type: 'api_error', message: 'mock failure' } });
  }
});

server.listen(port, '127.0.0.1', () => console.log(`[stripe-mock] listening on ${self} (app ${appUrl})`));
