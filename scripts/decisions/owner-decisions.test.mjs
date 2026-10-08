// オーナー決定の台帳の誤検出・見逃しを押さえる。禁止に当たる文は、本番の画面で実際に見つかった言い回し。
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { loadDecisions, scanScreen } from './owner-decisions-rules.mjs';

const decisions = loadDecisions(resolve(dirname(fileURLToPath(import.meta.url)), '../../data/owner-decisions.json'));
const idsOf = (text) => scanScreen('x', text, decisions).map((v) => v.id);

test('台帳の形: 全件に日付・オーナーの言葉・確かめ方があり、正規表現が読める', () => {
  assert.ok(decisions.length >= 13);
  for (const id of ['no-mna', 'no-pro', 'no-ten-of-ten', 'no-hitokoto', 'no-can-i-do-it', 'no-common-principles', 'no-luck-section', 'no-will-it-last', 'no-negative-section', 'no-howto', 'no-absence-text', 'no-origin-marks']) {
    assert.ok(decisions.some((d) => d.id === id), id);
  }
});

test('出さない物に当たる文は検出する', () => {
  const bad = {
    'no-mna': 'スモールM&Aで売却した',
    'no-pro': '紹介と取引 PRO の内容を見る',
    'no-ten-of-ten': '総合 10/10',
    'no-hitokoto': 'ひとこと: 強い',
    'no-can-i-do-it': '自分にもできるか',
    'no-common-principles': '共通原則',
    'no-luck-section': '運・追い風',
    'no-will-it-last': '続くかどうか。続くか',
    'no-negative-section': 'マイナス面',
    'no-howto': '真似の手順',
    'no-absence-text': '売上は未確認',
    'no-origin-marks': '売上は約575万円（本人申告）',
  };
  for (const [id, text] of Object.entries(bad)) assert.ok(idsOf(text).includes(id), `${id}: ${text}`);
  assert.ok(idsOf('2024年の売上は約575万円と本人申告。').includes('no-origin-marks'));
  assert.ok(idsOf('出典\n本人申告\n').includes('no-origin-marks'));
});

test('通すべき文: 出典名の括弧・推定・普通の数字・小文字の pro は違反にしない', () => {
  for (const ok of ['Churnkey（公式チーム紹介） 2026-10-07', 'Memberful（公式サイト）', '売上は約575万円（推定）', '10/100 の割合', '2010/10 月', 'professional', 'product', '月額 20ドル（約3,000円）']) {
    assert.deepEqual(idsOf(ok), [], ok);
  }
});

test('印の括弧: 本人・第三者・記事・提出書類は時点つきでも検出する', () => {
  for (const bad of ['（本人、2018年5月）', '（第三者）', '（記事）', '（提出書類）', '（公式）', '（公式、選別あり）']) assert.ok(idsOf(`売上が伸びた${bad}`).includes('no-origin-marks'), bad);
});
