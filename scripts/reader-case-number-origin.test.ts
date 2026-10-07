import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { ReaderCase } from '../src/shared/reader-case';
import { checkCase } from './reader-case/analysis-lib';

const reader = {
  sources: [],
  facts: [
    { id: 'f1', kind: 'DESCRIPTION', text: '月額29ドルの購読で、有料客は約350人。' },
    { id: 'f2', kind: 'EVENT', text: '2015年6月に公開し、2日以内に最初の有料客がついた。' },
  ],
  metrics: [{ id: 'm1', measure: 'REVENUE', periodKind: 'MONTH', period: '2026-05', amount: 10150, currency: 'USD', origin: 'SELF_REPORTED', sourceId: 's1' }],
  unknowns: [],
  analysis: [],
} as unknown as ReaderCase;

const run = (item: Record<string, unknown>, strict = true) => checkCase('ent_x', [item], reader, { strictNumbers: strict });
const reasons = (item: Record<string, unknown>, strict = true) => run(item, strict).dropped.map((d) => d.reason);

test('出典の事実・数値に同じ値がある数字は通る（presentation 付きの推定も）', () => {
  assert.equal(run({ item: 'BUSINESS_MODEL', text: '月額29ドルを約350人から取る。', basis: ['f1'], formula: '$29 × 350', presentation: 'FACT_SUMMARY' }).kept.length, 1);
  assert.equal(run({ item: 'COST_STRUCTURE', text: '決済手数料は約$294。', basis: ['m1'], formula: '$10,150 × 2.9% = $294', presentation: 'ESTIMATE' }).kept.length, 1);
});

test('出典IDの値に無い数字（仮置き）は落ちる', () => {
  assert.deepEqual(reasons({ item: 'TAKE_HOME', text: '手残りは月$9,000。', basis: ['m1'], formula: '$10,150 − $1,150' }), ['number-not-in-evidence']);
});

test('「仮置き・想定・相場」と数字が同居する文・式は落ちる', () => {
  assert.deepEqual(reasons({ item: 'COST_STRUCTURE', text: '費用は想定で月$200。', basis: ['m1'], formula: '$200' }), ['placeholder-number']);
  assert.deepEqual(reasons({ item: 'COST_STRUCTURE', text: '費用は月$294。', basis: ['m1'], formula: '$10,150 × 2.9% + 仮置きのサーバー費 $30' }), ['placeholder-number']);
  assert.deepEqual(reasons({ item: 'REFERRAL', text: '紹介料は売上の30%。', basis: ['f1'], formula: '業界標準の率 30%' }), ['placeholder-number']);
});

test('Stripe など標準手数料の数字は式の入力に使える', () => {
  assert.equal(run({ item: 'COST_STRUCTURE', text: '決済手数料は約$294。', basis: ['m1'], formula: '$10,150 × 2.9% ≒ $294（Stripe標準）' }).kept.length, 1);
});

test('推定は式と、事実の値を入力にした式が要る', () => {
  assert.deepEqual(reasons({ item: 'TAKE_HOME', text: '手残りは約$5,000。', basis: ['m1'], formula: '$5,000', presentation: 'ESTIMATE' }), ['estimate-without-fact-inputs']);
  assert.deepEqual(reasons({ item: 'TAKE_HOME', text: '推定の見立て。', basis: ['m1'], presentation: 'ESTIMATE' }), ['estimate-without-fact-inputs']);
});

test('数字の無い文は影響を受けない。事実が無い数字なしの推論も従来どおり', () => {
  assert.equal(run({ item: 'CUSTOMER_PAIN', text: '集計の手間が重い。', basis: ['f1'] }).kept.length, 1);
});

test('strictNumbers を付けない既存経路（公開評価・監査の直し）の挙動は変えない', () => {
  assert.equal(run({ item: 'TAKE_HOME', text: '手残りは月$9,000。', basis: ['m1'], formula: '$10,150 − 仮置き $1,150' }, false).kept.length, 1);
});

test('confidence は無くても通り、あれば残る（旧データの互換）', () => {
  const noConf = run({ item: 'CUSTOMER_PAIN', text: '集計の手間が重い。', basis: ['f1'] }).kept[0];
  assert.equal(noConf.confidence, undefined);
  assert.equal(run({ item: 'CUSTOMER_PAIN', text: '集計の手間が重い。', basis: ['f1'], confidence: 'LOW' }).kept[0].confidence, 'LOW');
});

test('式の無い事実の言い換えは、数字がすべて basis の事実にある時だけ「出典に載っている値」で通る', () => {
  const ok = run({ item: 'PRICING', text: '月額29ドルの購読。', basis: ['f1'], presentation: 'FACT_SUMMARY' });
  assert.equal(ok.kept.length, 1);
  assert.equal(ok.kept[0]!.formula, '数字は出典に載っている値');
  assert.deepEqual(reasons({ item: 'PRICING', text: '月額49ドルの購読。', basis: ['f1'], presentation: 'FACT_SUMMARY' }), ['number-without-formula']);
  assert.deepEqual(reasons({ item: 'PRICING', text: '月額29ドルの購読。', basis: ['f1'] }, false), ['number-without-formula']);
});
