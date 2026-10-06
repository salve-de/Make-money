import type { RelayClient, RelaySession } from '../distribution/client';

/**
 * テスト専用。SellRelay の HTTP 契約（e53f21ff 時点の route と応答の形）をまねた手元の偽接続。
 * 外部へは一切通信しない。本番コードからは import しない。SellRelay 本体を動かした証拠ではない。
 */
export function distributionFixture() {
  const accounts = new Map([['owner-A', 'relay-owner-A'], ['partner-B', 'relay-partner-B'], ['other-C', 'relay-other-C']]);
  const catalog: Record<string, unknown>[] = [];
  const referrals: Record<string, unknown>[] = [];
  const calls: { user: string; path: string; method: string; body?: unknown }[] = [];
  let createFailure: 'none' | 'lost' | 'reject' | 'unknown' = 'none';
  let destination = 'https://maker.example.com/checkout?plan=monthly';
  let redirectOverride: string | null = null;
  let referralOverride: Record<string, unknown> | null = null;
  let partnerAllowed = true;
  const uuid = () => crypto.randomUUID().replaceAll('-', '');

  const client: RelayClient = {
    origin: 'https://relay.example.com',
    mode: 'contract-test',
    async forUser(uid) {
      const subject = accounts.get(uid);
      if (!subject) return null;
      const session: RelaySession = {
        subject,
        async request(path, input) {
          calls.push({ user: uid, path, method: input.method, body: input.body });
          if (path === '/api/state' && input.method === 'GET') {
            return Response.json({ user: { id: subject, verified: 1, account_state: 'ACTIVE' }, products: catalog });
          }
          const policy = /^\/api\/programs\/([^/]+)\/partner-policy$/.exec(path);
          if (policy && input.method === 'GET') {
            return Response.json({
              product_id: policy[1],
              can_create_referral: partnerAllowed,
              is_owner: catalog.find((row) => row.id === policy[1])?.owner_id === subject,
            });
          }
          if (path === '/api/products' && input.method === 'POST') {
            if (createFailure === 'reject') {
              createFailure = 'none';
              return Response.json({ error: 'invalid' }, { status: 422 });
            }
            if (createFailure === 'unknown') throw new Error('unknown delivery');
            const product = { ...(input.body as Record<string, unknown>), id: `p-${uuid()}`, owner_id: subject, state: 'draft', ready: false };
            catalog.push(product);
            if (createFailure === 'lost') {
              createFailure = 'none';
              throw new Error('lost response after creation');
            }
            return Response.json({ ok: true, id: product.id, slug: product.id });
          }
          const match = /^\/api\/products\/([^/]+)\/referral$/.exec(path);
          if (match && input.method === 'POST') {
            const product = catalog.find((row) => row.id === match[1]);
            if (!product?.ready || product.owner_id === subject) return Response.json({ error: 'not ready' }, { status: 409 });
            let referral = referrals.find((row) => row.product_id === product.id && row.user_id === subject);
            if (!referral) {
              referral = { id: `ref-${uuid()}`, product_id: product.id, user_id: subject, code: uuid() };
              referrals.push(referral);
            }
            return Response.json(referralOverride ?? referral);
          }
          throw new Error('Unexpected SellRelay contract route');
        },
      };
      return session;
    },
    async visit(path, input) {
      if (input.redirect !== 'manual') throw new Error('Redirect following is forbidden');
      const referral = referrals.find((row) => `/r/${String(row.code)}` === path);
      const product = catalog.find((row) => row.id === referral?.product_id);
      if (!referral || !product?.ready) return new Response(null, { status: 409 });
      const url = new URL(destination);
      url.searchParams.set('sr_attribution', 'contract-test-only');
      return new Response(null, { status: 303, headers: { location: redirectOverride ?? url.toString() } });
    },
  };

  return {
    client,
    catalog,
    referrals,
    calls,
    accounts,
    /** SellRelay 側で作者が承認し、販売準備が済んだ状態にする */
    approve() {
      for (const row of catalog) {
        row.state = 'approved';
        row.ready = true;
      }
    },
    failCreate(value: typeof createFailure) { createFailure = value; },
    setDestination(value: string) { destination = value; },
    unsafeRedirect(value: string | null) { redirectOverride = value; },
    wrongReferral(value: Record<string, unknown> | null) { referralOverride = value; },
    allowPartner(value: boolean) { partnerAllowed = value; },
  };
}
