import { describe, expect, it } from 'vitest';
import { activePaymentResources, type PaymentFact, type PaymentRecord } from './ledger';
const row = (id: string, resourceId: string, occurredAt: number, fact: PaymentFact): PaymentRecord => ({ id, resourceId, occurredAt, livemode: false,
  userId: 'userId' in fact ? fact.userId : null, kind: fact.kind, fact });
const purchase = (resource = 'ch_1', uid = 'u1') => row(`purchase_${resource}`, resource, 1, { kind: 'purchase', userId: uid, amount: 1980, sessionId: 'cs_1' });
const refund = (resource = 'ch_1', amount = 1980) => row(`refund_${resource}`, resource, 2, { kind: 'refund', amountRefunded: amount });
const entitlement = (records: PaymentRecord[], uid = 'u1') => activePaymentResources(records, uid, 50);

describe('payment lifecycle independent of event arrival order', () => {
  it('a paid order belongs only to its verified UID', () => {
    expect(entitlement([purchase()])).toEqual(['ch_1']);
    expect(entitlement([purchase()], 'other')).toEqual([]);
  });
  it('a refund revokes whether it arrives before or after completion', () => {
    expect(entitlement([purchase(), refund()])).toEqual([]);
    expect(entitlement([refund(), purchase()])).toEqual([]);
  });
  it('retains access on a partial refund but not cumulative full refund', () => {
    expect(entitlement([purchase(), refund('ch_1', 500)])).toEqual(['ch_1']);
    expect(entitlement([refund(), purchase(), refund('ch_1', 500)])).toEqual([]);
  });
  it('a separate repurchase survives the old purchase refund', () => {
    expect(entitlement([purchase(), purchase('ch_2'), refund()])).toEqual(['ch_2']);
    expect(entitlement([purchase(), purchase('ch_2'), refund(), refund('ch_2')])).toEqual([]);
  });
  it('duplicate delivery cannot restore or multiply a refunded entitlement', () => {
    expect(entitlement([purchase(), refund(), purchase(), refund()])).toEqual([]);
  });
  it('suspends open/lost disputes and restores won disputes in either delivery order', () => {
    const open = row('evt_open', 'ch_1', 3, { kind: 'dispute', disputeId: 'dp_1', status: 'needs_response' });
    const won = row('evt_won', 'ch_1', 4, { kind: 'dispute', disputeId: 'dp_1', status: 'won' });
    const lost = row('evt_lost', 'ch_1', 4, { kind: 'dispute', disputeId: 'dp_1', status: 'lost' });
    expect(entitlement([purchase(), open])).toEqual([]);
    expect(entitlement([purchase(), won, open])).toEqual(['ch_1']);
    expect(entitlement([purchase(), open, lost])).toEqual([]);
    expect(entitlement([won, purchase(), open, refund()])).toEqual([]);
  });
  it('closed dispute wins same-second tie, but another open dispute still blocks', () => {
    const won = row('evt_won', 'ch_1', 3, { kind: 'dispute', disputeId: 'dp_1', status: 'won' });
    const open = row('evt_open', 'ch_1', 3, { kind: 'dispute', disputeId: 'dp_1', status: 'needs_response' });
    expect(entitlement([purchase(), won, open])).toEqual(['ch_1']);
    expect(entitlement([purchase(), open, won])).toEqual(['ch_1']);
    expect(entitlement([purchase(), won, row('evt_other', 'ch_1', 5, { kind: 'dispute', disputeId: 'dp_2', status: 'under_review' })])).toEqual([]);
  });
  it('subscription cancellation does not revoke an unrelated one-time purchase', () => {
    const active = row('evt_active', 'sub_1', 1, { kind: 'subscription', userId: 'u1', active: true, expiresAt: 100 });
    const canceled = row('evt_cancel', 'sub_1', 2, { kind: 'subscription', userId: 'u1', active: false, expiresAt: 100 });
    expect(entitlement([active])).toEqual(['sub_1']);
    expect(entitlement([canceled, active])).toEqual([]);
    expect(entitlement([canceled, active, purchase()])).toEqual(['ch_1']);
    expect(activePaymentResources([active], 'u1', 101)).toEqual([]);
  });
});
