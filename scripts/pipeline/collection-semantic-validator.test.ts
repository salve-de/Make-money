import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateCollectionGeneratedPayload,
} from './collection-semantic-validator';

function codes(payload: unknown, requireSectorEvidence = false) {
  return validateCollectionGeneratedPayload(payload, { requireSectorEvidence })
    .map((violation) => violation.code);
}

function unknownSectorEntity(extra: Record<string, unknown> = {}) {
  return {
    id: 'ent_test',
    sector: 'UNKNOWN',
    verifiedBadge: false,
    pnl: {
      financialStatus: 'UNAVAILABLE',
      isRevenueUnconfirmed: true,
      isMarginUnconfirmed: true,
    },
    ...extra,
  };
}

test('owner tenure keeps value, time unit, and null currency separate', () => {
  const payload = {
    metrics: [{
      metric_id: 'mt_owner_tenure',
      metric_type: 'owner_tenure',
      value: 25,
      unit: 'years',
      currency: null,
      verification_status: 'UNVERIFIED',
    }],
  };

  assert.deepEqual(validateCollectionGeneratedPayload(payload), []);
});

test('owner tenure can never acquire a monetary currency', () => {
  const payload = {
    metrics: [{
      metric_id: 'mt_owner_tenure',
      metric_type: 'owner_tenure',
      value: 25,
      unit: 'years',
      currency: 'USD',
      verification_status: 'UNVERIFIED',
    }],
  };

  const result = codes(payload);
  assert.ok(result.includes('CURRENCY_ON_NON_MONETARY_UNIT'));
  assert.ok(result.includes('TENURE_CURRENCY_CORRUPTION'));
});

test('monetary magnitude preserves value, unit, and currency without collapsing fields', () => {
  const payload = {
    metrics: [{
      metric_id: 'mt_revenue',
      metric_type: 'revenue',
      value: 49.6,
      unit: 'million',
      currency: 'USD',
      verification_status: 'UNVERIFIED',
    }],
  };

  assert.deepEqual(validateCollectionGeneratedPayload(payload), []);
});

test('ungrounded sector classification is rejected', () => {
  const payload = unknownSectorEntity({
    sector: 'AI_AUTOMATION',
  });

  assert.ok(codes(payload, true).includes('UNGROUNDED_SECTOR_CLASSIFICATION'));
});

test('UNKNOWN sector is accepted without invented classification evidence', () => {
  assert.deepEqual(validateCollectionGeneratedPayload(unknownSectorEntity(), {
    requireSectorEvidence: true,
  }), []);
});

test('grounded sector classification is accepted', () => {
  const payload = unknownSectorEntity({
    sector: 'AI_AUTOMATION',
    sectorEvidence: {
      value: 'AI_AUTOMATION',
      verificationStatus: 'SUPPORTED',
      sourceUrls: ['https://example.com/product'],
    },
  });

  assert.deepEqual(validateCollectionGeneratedPayload(payload, {
    requireSectorEvidence: true,
  }), []);
});

test('SUPPORTED records without evidence are rejected', () => {
  const payload = {
    observations: [{
      text: 'A supported claim with no evidence',
      verificationStatus: 'SUPPORTED',
    }],
  };

  assert.ok(codes(payload).includes('SUPPORTED_WITHOUT_EVIDENCE'));
});

test('duplicate semantic IDs are rejected before persistence', () => {
  const payload = {
    metrics: [
      { metric_id: 'mt_duplicate', value: 1 },
      { metric_id: 'mt_duplicate', value: 2 },
    ],
  };

  assert.ok(codes(payload).includes('DUPLICATE_ID'));
});

test('financial arithmetic mismatch is rejected', () => {
  const payload = unknownSectorEntity({
    pnl: {
      financialStatus: 'REPORTED',
      monthlyRevenue: 100,
      cogs: 20,
      grossProfit: 90,
      isRevenueUnconfirmed: false,
      isCostsUnconfirmed: true,
    },
  });

  assert.ok(codes(payload).includes('PNL_GROSS_ARITHMETIC_MISMATCH'));
});

test('annual revenue cannot be coerced into monthly revenue by dividing by twelve', () => {
  const payload = unknownSectorEntity({
    pnl: {
      financialStatus: 'ESTIMATED',
      estimationLogic: '年商 1200万円 ÷ 12 = 月商 100万円',
      dataSnapshotPeriod: '2025年通期',
      sourceDoc: 'https://example.com/annual-report',
      isRevenueUnconfirmed: true,
      isMarginUnconfirmed: true,
    },
  });

  assert.ok(codes(payload).includes('ANNUAL_TO_MONTHLY_COERCION'));
});

test('CANDIDATE and HIGH_SIGNAL tiers are preserved and accepted', () => {
  for (const tier of ['CANDIDATE', 'HIGH_SIGNAL'] as const) {
    const payload = unknownSectorEntity({ collectionTier: tier });
    const before = JSON.stringify(payload);
    assert.deepEqual(validateCollectionGeneratedPayload(payload, {
      requireSectorEvidence: true,
    }), []);
    assert.equal(JSON.stringify(payload), before);
    assert.equal(payload.collectionTier, tier);
  }
});

test('invalid collection tier is rejected rather than silently remapped', () => {
  const payload = unknownSectorEntity({ collectionTier: 'PROMOTED' });
  assert.ok(codes(payload, true).includes('INVALID_COLLECTION_TIER'));
});
