import assert from 'node:assert/strict';
import { test } from 'node:test';

import { analyzeScreen } from './screen-text-lib.mjs';

const allowed = new Set(['数値', '売上']);
const ok = (t) => allowed.has(t);

test('fact・metric・source の中の文字は通り、外の未登録の文字は失敗にする', () => {
  const html = '<div><p data-fact="f1">事実の文。<span>出典名</span></p><table><tr data-metric="m1"><td>売上</td><td>1億円</td></tr></table><p>その他の情報</p></div>';
  const r = analyzeScreen(html, ok);
  assert.deepEqual(r.unowned, ['その他の情報']);
  assert.equal(r.factCount, 1);
  assert.equal(r.metricCount, 1);
});

test('許可リストの文字と属性の文字は通り、未登録の aria-label は失敗にする', () => {
  const r = analyzeScreen('<button aria-label="売上">売上</button><a aria-label="怪しい" href="/x"></a>', ok);
  assert.deepEqual(r.unowned, ['怪しい']);
});

test('中身の無い見出しを検出する', () => {
  assert.deepEqual(analyzeScreen('<section><h3>数値</h3></section>', ok).emptyHeadings, ['数値']);
  assert.deepEqual(analyzeScreen('<section><h3>数値</h3><ul><li data-fact="f1">文</li></ul></section>', ok).emptyHeadings, []);
});

test('同じ fact ID の2回目を検出する', () => {
  const r = analyzeScreen('<p data-fact="f1">a</p><li data-fact="f1">a</li><li data-fact="f2">b</li>', ok);
  assert.deepEqual(r.dupFacts, ['f1']);
});

test('data-variant が違う（幅違いの同じ行）なら同じ fact ID でも重複にしない', () => {
  const r = analyzeScreen('<div data-variant="a"><p data-fact="f1">x</p></div><div data-variant="b"><p data-fact="f1">x</p></div>', ok);
  assert.deepEqual(r.dupFacts, []);
});
