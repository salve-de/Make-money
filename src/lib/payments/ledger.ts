export type PaymentFact =
  | { kind: 'purchase'; userId: string; amount: number; sessionId: string }
  | { kind: 'refund'; amountRefunded: number }
  | { kind: 'dispute'; disputeId: string; status: string }
  | { kind: 'subscription'; userId: string; active: boolean; expiresAt: number };
export interface PaymentRecord {
  id: string;
  resourceId: string;
  userId: string | null;
  kind: string;
  livemode: boolean;
  occurredAt: number;
  fact: PaymentFact;
}

/** An individual full refund removes only that purchase. Partial refunds retain
 * access; open/lost disputes suspend it until won/closed. No boolean user downgrade. */
export function activePaymentResources(records: PaymentRecord[], uid: string, now: number): string[] {
  const resources = new Map<string, PaymentRecord[]>();
  for (const record of records) {
    const group = resources.get(record.resourceId) || [];
    group.push(record); resources.set(record.resourceId, group);
  }
  const active: string[] = [];
  for (const [resourceId, group] of resources) {
    const purchases = group.filter((r) => r.fact.kind === 'purchase' && r.fact.userId === uid);
    const amount = Math.max(0, ...purchases.map((r) => r.fact.kind === 'purchase' ? r.fact.amount : 0));
    const refunded = Math.max(0, ...group.map((r) => r.fact.kind === 'refund' ? r.fact.amountRefunded : 0));
    const disputes = new Map<string, PaymentRecord>();
    for (const record of group) {
      if (record.fact.kind !== 'dispute') continue;
      const previous = disputes.get(record.fact.disputeId);
      // Same-second snapshots: a closed result takes precedence over an open one.
      const terminal = (r: PaymentRecord) => r.fact.kind !== 'dispute' ? 0 : r.fact.status === 'lost' ? 2 : ['won', 'warning_closed'].includes(r.fact.status) ? 1 : 0;
      if (!previous || record.occurredAt > previous.occurredAt || (record.occurredAt === previous.occurredAt && terminal(record) > terminal(previous))) {
        disputes.set(record.fact.disputeId, record);
      }
    }
    const blocked = [...disputes.values()].some((r) => r.fact.kind === 'dispute' && !['won', 'warning_closed'].includes(r.fact.status));
    if (amount > 0 && refunded < amount && !blocked) { active.push(resourceId); continue; }
    const subscriptions = group.filter((r) => r.fact.kind === 'subscription' && r.fact.userId === uid)
      .sort((a, b) => b.occurredAt - a.occurredAt || Number(a.fact.kind === 'subscription' && a.fact.active) - Number(b.fact.kind === 'subscription' && b.fact.active));
    const latest = subscriptions[0]?.fact;
    if (latest?.kind === 'subscription' && latest.active && latest.expiresAt > now) active.push(resourceId);
  }
  return active;
}
