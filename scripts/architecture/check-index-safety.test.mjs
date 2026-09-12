import test from 'node:test';
import assert from 'node:assert/strict';
import { checkIndexSafety } from './check-index-safety.mjs';

const valid = (overrides = {}) => ({
  id: 'ent_photoai',
  name: 'Photo AI',
  pnl: { isRevenueUnconfirmed: true, isMarginUnconfirmed: true, financialStatus: 'REPORTED' },
  ...overrides,
});

test('accepts canonical unknown records with explicit provenance flags', () => {
  const index = [
    valid(),
    { id: 'ent_clubhouse_audio', name: 'Clubhouse (Alpha Exploration)', pnl: { isRevenueUnconfirmed: true, isMarginUnconfirmed: true, financialStatus: 'UNAVAILABLE' } },
    { id: 'ent_quibi_failure', name: 'Quibi', pnl: { isRevenueUnconfirmed: true, isMarginUnconfirmed: true, financialStatus: 'UNAVAILABLE' } },
  ];
  assert.deepEqual(checkIndexSafety(index), []);
});

test('rejects duplicate identities and an unconfirmed verified amount', () => {
  const index = [
    valid({ pnl: { isRevenueUnconfirmed: true, isMarginUnconfirmed: true, financialStatus: 'VERIFIED' } }),
    valid({ id: 'ent_duplicate', name: 'Photo AI', pnl: { isRevenueUnconfirmed: false, isMarginUnconfirmed: false, financialStatus: 'REPORTED' } }),
    { id: 'ent_clubhouse_audio', name: 'Clubhouse (Alpha Exploration)', pnl: { isRevenueUnconfirmed: true, isMarginUnconfirmed: true, financialStatus: 'UNAVAILABLE' } },
    { id: 'ent_quibi_failure', name: 'Quibi', pnl: { isRevenueUnconfirmed: true, isMarginUnconfirmed: true, financialStatus: 'UNAVAILABLE' } },
  ];
  assert.deepEqual(checkIndexSafety(index).sort(), [
    'duplicate entity name: Photo AI',
    'ent_photoai: verified revenue cannot be marked unconfirmed',
  ].sort());
});
