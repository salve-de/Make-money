import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { normalizeFormula } from './reader-case/analysis-lib';

test('裏付けの無い「相場」「一般的な」を仮定・仮置きに揃える', () => {
  const out = normalizeFormula('一般的なソフト紹介報酬の相場仮定=対象売上×20〜30%。');
  assert.doesNotMatch(out, /相場|一般的な/);
  assert.match(out, /裏付け資料なし/);
});

test('決済・販売の場の公開手数料はそのまま残す', () => {
  const s = 'App Store部分の一般的な手数料15〜30%を混合して置く。';
  assert.equal(normalizeFormula(s), s);
  assert.match(normalizeFormula('米国Stripe相場2.9%+$0.30を適用'), /Stripe標準2\.9%/);
});

test('何度かけても同じ結果になる', () => {
  const once = normalizeFormula('相場仮定：月$30〜100。一般相場の仮定：月額支援300〜1,500円。');
  assert.equal(normalizeFormula(once), once);
});
