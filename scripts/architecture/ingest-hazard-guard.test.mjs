import assert from 'node:assert/strict';
import test from 'node:test';
import { entityFinancialStatus, hazardStatusViolation } from './ingest-hazard-guard.mjs';

test('canonical pnl financialStatus satisfies the hazard guard without a legacy root field', () => {
  const entity = {
    name: 'Canonical hazard',
    tags: ['失敗・撤退の検証'],
    evidenceCards: [{ type: 'FATAL_BLEED' }],
    pnl: { financialStatus: 'POST_MORTEM' },
  };

  assert.equal(Object.hasOwn(entity, 'financialStatus'), false);
  assert.equal(entityFinancialStatus(entity), 'POST_MORTEM');
  assert.equal(hazardStatusViolation(entity), null);
});

test('canonical hazard status wins over a stale legacy root field', () => {
  const entity = {
    name: 'Canonical wins',
    financialStatus: 'VERIFIED',
    evidenceCards: [{ type: 'FATAL_BLEED' }],
    pnl: { financialStatus: 'POST_MORTEM' },
  };

  assert.equal(entityFinancialStatus(entity), 'POST_MORTEM');
  assert.equal(hazardStatusViolation(entity), null);
});

test('a hazard without POST_MORTEM status is rejected', () => {
  const entity = {
    name: 'Bad hazard',
    tags: ['破綻'],
    pnl: { financialStatus: 'REPORTED' },
  };

  assert.match(hazardStatusViolation(entity) || '', /Hazard Status Mismatch/);
});

test('legacy root status remains a backward-compatible fallback only', () => {
  const entity = {
    name: 'Legacy hazard',
    financialStatus: 'POST_MORTEM',
    evidenceCards: [{ type: 'FATAL_BLEED' }],
  };

  assert.equal(entityFinancialStatus(entity), 'POST_MORTEM');
  assert.equal(hazardStatusViolation(entity), null);
});
