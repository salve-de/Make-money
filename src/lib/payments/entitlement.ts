import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { batchD1, queryD1 } from '@/lib/storage/d1';
import { getStripeClient, paymentLiveMode } from '@/lib/stripe';
import { activePaymentResources, type PaymentRecord } from './ledger';
import { legacyPaymentFacts } from './legacy';
import { chargeStillEntitled, subscriptionStillEntitled } from './provider-state';

export async function assertPaymentStoreAvailable() {
  await queryD1('SELECT id FROM payment_events LIMIT 1');
}
export async function recordPaymentFacts(records: PaymentRecord[]) {
  if (!records.length) return;
  // One transactional batch: a grant and its observed revocations appear together.
  await batchD1(records.map((r) => ({
    sql: 'INSERT INTO payment_events (id,resource_id,user_id,kind,occurred_at,livemode,fact) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',
    params: [r.id, r.resourceId, r.userId, r.kind, r.occurredAt, r.livemode ? 1 : 0, JSON.stringify(r.fact)],
  })));
}
export function parsePaymentRecord(value: unknown): PaymentRecord {
  if (!value || typeof value !== 'object') throw new Error('Invalid payment record');
  const row = value as Record<string, unknown>;
  const r = { id: row.id, resourceId: row.resource_id, userId: row.user_id, kind: row.kind,
    occurredAt: row.occurred_at, livemode: row.livemode === 1, fact: typeof row.fact === 'string' ? JSON.parse(row.fact) : null } as PaymentRecord;
  if (typeof r.id !== 'string' || typeof r.resourceId !== 'string' || !Number.isSafeInteger(r.occurredAt)
    || (row.livemode !== 0 && row.livemode !== 1) || (r.userId !== null && typeof r.userId !== 'string') || !r.fact || r.kind !== r.fact.kind) throw new Error('Invalid payment record');
  const f = r.fact;
  const nonnegative = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
  if (f.kind === 'purchase' && typeof f.userId === 'string' && f.userId === r.userId && nonnegative(f.amount) && typeof f.sessionId === 'string') return r;
  if (f.kind === 'refund' && nonnegative(f.amountRefunded)) return r;
  if (f.kind === 'dispute' && typeof f.disputeId === 'string' && typeof f.status === 'string') return r;
  if (f.kind === 'subscription' && typeof f.userId === 'string' && f.userId === r.userId && typeof f.active === 'boolean' && nonnegative(f.expiresAt)) return r;
  throw new Error('Invalid payment fact');
}
export async function getPaymentRecords(uid: string): Promise<PaymentRecord[]> {
  const rows = await queryD1('SELECT * FROM payment_events WHERE resource_id IN (SELECT resource_id FROM payment_events WHERE user_id = ?) AND livemode = ?', [uid, (await paymentLiveMode()) ? 1 : 0]);
  return rows.map(parsePaymentRecord);
}
export async function getProEntitlement(uid: string): Promise<boolean> {
  let records = await getPaymentRecords(uid);
  const stripe = await getStripeClient();
  if (!records.some((r) => r.userId === uid && (r.fact.kind === 'purchase' || (r.fact.kind === 'subscription' && r.fact.active)))) {
    const [legacy] = await queryD1<{ stripe_customer_id: string | null; stripe_subscription_id: string | null }>(
      'SELECT stripe_customer_id,stripe_subscription_id FROM users WHERE id = ?', [uid]);
    if (legacy?.stripe_customer_id || legacy?.stripe_subscription_id) {
      if (!stripe) throw new Error('Payment verification unavailable');
      const facts = await legacyPaymentFacts(stripe, uid, await paymentLiveMode());
      await recordPaymentFacts(facts);
      records = await getPaymentRecords(uid);
    }
  }
  const resources = activePaymentResources(records, uid, Math.floor(Date.now() / 1000));
  // An established subscription can renew beyond its old snapshot expiry. Its
  // current paid invoice, refunds and status are checked at the provider below.
  for (const r of records) if (r.fact.kind === 'subscription' && r.fact.active && r.fact.userId === uid && !resources.includes(r.resourceId)) resources.push(r.resourceId);
  if (!resources.length) return false;
  if (!stripe) throw new Error('Payment verification unavailable');
  for (const resource of resources) {
    if (resource.startsWith('ch_') && await chargeStillEntitled(stripe, resource)) return true;
    if (resource.startsWith('sub_') && await subscriptionStillEntitled(stripe, resource)) return true;
  }
  return false;
}
export async function authorizePro(request: Request): Promise<{ uid: string; status: 200 } | { status: 401 | 403 | 503 }> {
  const header = request.headers.get('authorization');
  const user = header?.startsWith('Bearer ') ? await verifyFirebaseIdToken(header.slice(7)) : null;
  if (!user) return { status: 401 };
  try { return await getProEntitlement(user.uid) ? { uid: user.uid, status: 200 } : { status: 403 }; }
  catch { return { status: 503 }; }
}
