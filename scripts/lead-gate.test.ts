/** 公開関門: リード（HEADLINE）が基準外の事例は LEAD_NOT_PASSED で止める。基準を通るリードと、HEADLINE が無い事例（空欄側で止まる）は対象外 */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReaderCase } from '../src/shared/reader-case';
import { leadGateReasons, LEAD_NOT_PASSED_PREFIX } from './reader-case/publication-evaluation';

const reader = (headline?: string): ReaderCase => ({
  facts: [{ id: 'f1', text: '2024年に公開された。', kind: 'EVENT', sourceId: 's1' }],
  metrics: [],
  sources: [],
  analysis: headline === undefined ? [] : [{ id: 'a1', item: 'HEADLINE', text: headline, basis: ['f1'] }],
} as unknown as ReaderCase);

test('製品説明だけのリードは LEAD_NOT_PASSED で止まる', () => {
  const reasons = leadGateReasons(reader('月額29ドルで請求書を自動作成するクラウド型の経理ソフト。'));
  assert.equal(reasons.length, 1);
  assert.ok(reasons[0].startsWith(`${LEAD_NOT_PASSED_PREFIX}:`));
  assert.match(reasons[0], /product-description/);
});

test('人・行動・結果のあるリードは通る', () => {
  assert.deepEqual(leadGateReasons(reader('電話受付をやめた小さな店舗が、予約管理に切り替えた。')), []);
});

test('HEADLINE が無い事例は、この関門の対象外（空欄:HEADLINE が止める）', () => {
  assert.deepEqual(leadGateReasons(reader()), []);
});
