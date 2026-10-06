import { fail, record, reference, relayOrigin } from './contract';

/**
 * SellRelay への接続口。サーバーが本人確認をした短命の接続だけを扱う。
 * ブラウザから SellRelay の利用者ID・資格情報・接続先を受け取らない。Firebase の UID と SellRelay の利用者IDを同じものとみなさない。
 */
export interface RelaySession {
  /** SellRelay 側の本人ID */
  subject: string;
  request(path: string, input: { method: 'GET' | 'POST'; body?: unknown; signal: AbortSignal }): Promise<Response>;
}

export interface RelayClient {
  mode: 'contract-test' | 'live';
  origin: string;
  /** Make-Money の利用者に対応する SellRelay の接続。対応が無ければ null。 */
  forUser(localUserId: string): Promise<RelaySession | null>;
  /** 紹介リンク（/r/{code}）を、転送を追わずに開く。 */
  visit(path: string, input: { redirect: 'manual'; signal: AbortSignal }): Promise<Response>;
}

/** SellRelay の GET /api/state に載る商品（必要な項目だけ）。 */
export interface RelayProduct {
  id: string;
  owner_id: string;
  website: string;
  name: string;
  tagline: string;
  description: string;
  audience: string;
  category: string;
  platforms: string[];
  price: number;
  currency: string;
  rate: number;
  months: number;
  ready?: boolean;
  removed?: number;
}

const TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 1024 * 1024;

/** 応答本文を1MBまで読んでJSONにする。大きすぎる・壊れている時は RELAY_UNAVAILABLE。 */
export async function readRelayJson(response: Response): Promise<unknown> {
  if (!response.body) fail('RELAY_UNAVAILABLE', 502);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        fail('RELAY_UNAVAILABLE', 502);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return fail('RELAY_UNAVAILABLE', 502);
  }
}

export function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(TIMEOUT_MS);
}

export async function sessionFor(client: RelayClient, userId: string): Promise<RelaySession | null> {
  relayOrigin(client.origin);
  const session = await client.forUser(userId);
  if (!session) return null;
  reference(session.subject);
  return session;
}

async function relayState(session: RelaySession): Promise<{ user: Record<string, unknown>; products: unknown[] }> {
  const response = await session.request('/api/state', { method: 'GET', signal: timeoutSignal() });
  if (!response.ok) fail('RELAY_UNAVAILABLE', 502);
  const state = record(await readRelayJson(response));
  const user = record(state.user);
  if (user.id !== session.subject || !Array.isArray(state.products)) fail('RELAY_IDENTITY_MISMATCH', 403);
  return { user, products: state.products };
}

/** 本人が持つ、削除されていない SellRelay 商品の一覧。 */
export async function ownedProducts(session: RelaySession): Promise<RelayProduct[]> {
  const { products } = await relayState(session);
  return products
    .map((item) => record(item))
    .filter((row) => row.owner_id === session.subject && !row.removed)
    .map((row) => {
      reference(row.id);
      return row as unknown as RelayProduct;
    });
}

/**
 * この利用者がこの商品を紹介できるか。SellRelay 側で本人確認済み・有効、商品が販売準備済み、
 * 自分の商品ではなく、紹介者の方針で許可されている時だけ true。
 */
export async function canRefer(session: RelaySession, productId: string): Promise<boolean> {
  const { user, products } = await relayState(session);
  if (!user.verified || user.account_state !== 'ACTIVE') return false;
  const product = products.map((item) => record(item)).find((row) => row.id === productId);
  if (!product || product.ready !== true || product.owner_id === session.subject) return false;
  const policy = await session.request(`/api/programs/${reference(productId)}/partner-policy`, { method: 'GET', signal: timeoutSignal() });
  if (!policy.ok) fail('RELAY_UNAVAILABLE', 502);
  const value = record(await readRelayJson(policy));
  if (value.product_id !== productId) fail('RELAY_IDENTITY_MISMATCH', 403);
  return value.can_create_referral === true && value.is_owner === false;
}
