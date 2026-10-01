import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { ReaderCase } from '../src/shared/reader-case';
import { applyAudit, type StoredAnalysis } from './reader-case/analysis-lib';

const reader = { facts: [{ id: 'f1', kind: 'PRICING' }], metrics: [] } as unknown as ReaderCase;
const item: StoredAnalysis = { id: 'a-upfront_cash', item: 'UPFRONT_CASH', text: '年額$200を先に受け取る。', basis: ['f1'], formula: '$20×10=$200', confidence: 'MEDIUM' } as StoredAnalysis;

test('監査の直しは本文だけでなく、fixFormula があれば式も置き換える', () => {
  const { kept } = applyAudit('ent_x', [item], [{ analysisId: 'a-upfront_cash', kind: 'UNSUPPORTED_NUMBER', severity: 'FIX', fix: '年額$192を先に受け取る。', fixFormula: '$16×12=$192' }], reader);
  assert.equal(kept[0].text, '年額$192を先に受け取る。');
  assert.equal(kept[0].formula, '$16×12=$192');
});

test('fixFormula が無ければ式は元のまま', () => {
  const { kept } = applyAudit('ent_x', [item], [{ analysisId: 'a-upfront_cash', kind: 'WEAK', severity: 'FIX', fix: '年額$200を前払いで受け取る。' }], reader);
  assert.equal(kept[0].formula, '$20×10=$200');
});
