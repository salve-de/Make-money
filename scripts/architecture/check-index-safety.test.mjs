import test from 'node:test';
import assert from 'node:assert/strict';
import { checkIndexSafety } from './check-index-safety.mjs';

const defaultPnl = {
  isRevenueUnconfirmed: true,
  isMarginUnconfirmed: true,
  financialStatus: 'REPORTED',
  sourceDoc: 'reported source note',
};

const valid = (overrides = {}) => ({
  id: 'ent_photoai',
  name: 'Photo AI',
  ...overrides,
  pnl: {
    ...defaultPnl,
    ...(overrides.pnl || {}),
  },
});

test('accepts canonical unknown records with explicit provenance flags', () => {
  const index = [
    valid(),
    { id: 'ent_clubhouse_audio', name: 'Clubhouse (Alpha Exploration)', pnl: { isRevenueUnconfirmed: true, isMarginUnconfirmed: true, financialStatus: 'UNAVAILABLE', sourceDoc: 'loss source note' } },
    { id: 'ent_quibi_failure', name: 'Quibi', pnl: { isRevenueUnconfirmed: true, isMarginUnconfirmed: true, financialStatus: 'UNAVAILABLE', sourceDoc: 'loss source note' } },
  ];
  assert.deepEqual(checkIndexSafety(index), []);
});

test('rejects duplicate identities and an unconfirmed verified amount', () => {
  const index = [
    valid({ pnl: { isRevenueUnconfirmed: true, isMarginUnconfirmed: true, financialStatus: 'VERIFIED' } }),
    valid({ id: 'ent_duplicate', name: 'Photo AI', pnl: { isRevenueUnconfirmed: false, isMarginUnconfirmed: false, financialStatus: 'REPORTED' } }),
    { id: 'ent_clubhouse_audio', name: 'Clubhouse (Alpha Exploration)', pnl: { isRevenueUnconfirmed: true, isMarginUnconfirmed: true, financialStatus: 'UNAVAILABLE', sourceDoc: 'loss source note' } },
    { id: 'ent_quibi_failure', name: 'Quibi', pnl: { isRevenueUnconfirmed: true, isMarginUnconfirmed: true, financialStatus: 'UNAVAILABLE', sourceDoc: 'loss source note' } },
  ];
  assert.deepEqual(checkIndexSafety(index).sort(), [
    'duplicate entity name: Photo AI',
    'ent_photoai: verified financial record cannot contain unconfirmed fields',
  ].sort());
});

test('requires provenance and a reproducible formula for estimated financials', () => {
  const index = [
    valid(),
    { id: 'ent_estimated', name: 'Estimated', pnl: { financialStatus: 'ESTIMATED', sourceDoc: 'source note' } },
    { id: 'ent_clubhouse_audio', name: 'Clubhouse (Alpha Exploration)', pnl: { isRevenueUnconfirmed: true, isMarginUnconfirmed: true, financialStatus: 'UNAVAILABLE', sourceDoc: 'loss source note' } },
    { id: 'ent_quibi_failure', name: 'Quibi', pnl: { isRevenueUnconfirmed: true, isMarginUnconfirmed: true, financialStatus: 'UNAVAILABLE', sourceDoc: 'loss source note' } },
  ];
  assert.deepEqual(checkIndexSafety(index), ['ent_estimated: ESTIMATED financial record requires estimationLogic']);
});
