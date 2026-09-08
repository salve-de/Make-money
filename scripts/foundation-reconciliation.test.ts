import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileCollection } from '../src/lib/foundation/reconciliation';
import { assessCoverage, DIMENSIONS } from '../src/lib/foundation/coverage';
import { productFields } from './foundation-product-fields';
const fixture = () => {
  const audit = { kind: 'collection_audit.v1', scope: 'Test only', reviewer: 'test second pass',
    requirements: [{ id: 'net_profit', status: 'captured', record_refs: ['metrics/0'] }],
    product_fields: [{ id: 'pnl.profit', status: 'captured', record_refs: ['metrics/0'] }],
    sources: [{ evidence_id: 'ev_test', status: 'reviewed', reviewed_at: '2026-09-08T00:00:00Z', sections: ['table row'], inventory: [
      { id: 'row1', statement: 'FY25 profit USD 10', status: 'captured', record_refs: ['metrics/0'], checks: [{ pointer: '/metrics/0/value', equals: 10 }] }
    ] }], search_log: ['Actual fixture search'], remaining_leads: [] as string[] };
  return { metrics: [{ value: 10 }], evidence: [{ evidence_id: 'ev_test' }], observations: [audit] };
};
test('source row matches saved value and current field list', () => {
  assert.equal(reconcileCollection(fixture(), ['net_profit'], ['pnl.profit']).status, 'RECONCILED_WITHIN_SCOPE');
});
test('missing historical row is uncollected, not unavailable', () => {
  const b = fixture(); b.observations[0].sources[0].inventory[0].status = 'pending';
  assert.match(reconcileCollection(b, ['net_profit']).gaps.join(' '), /uncollected/);
});
test('different saved amount fails', () => {
  const b = fixture(); b.metrics[0].value = 20;
  assert.match(reconcileCollection(b, ['net_profit']).gaps.join(' '), /differs/);
});
test('missing source, requirement, new product field and unresolved lead fail', () => {
  const b = fixture(); b.evidence.push({ evidence_id: 'ev_missing' }); b.observations[0].remaining_leads.push('Unread history');
  const result = reconcileCollection(b, ['net_profit', 'tax'], ['newField']);
  assert.equal(result.status, 'REVIEW_REQUIRED');
  for (const pattern of ['no source review', 'tax', 'newField', 'leads']) assert.ok(result.gaps.some(x => x.includes(pattern)));
});
test('entity-only coverage cannot claim completion even with all boxes checked', () => {
  const b = { entities: [{ name: 'test' }], money_signals: [], collection_coverage: DIMENSIONS.map(dimension => ({ dimension, status: 'found', note: 'intentionally bad test', record_refs: ['entities/0'] })) };
  assert.equal(assessCoverage(b).status, 'REVIEW_REQUIRED');
});
test('current FinancialEntity contract is extracted, not a saved field count', () => {
  const result = productFields();
  assert.ok(result.fields.includes('pnl.operatingExpenses.serverAndApi'));
  assert.ok(result.fields.includes('operations.toolStack[].monthlyCost'));
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
});
