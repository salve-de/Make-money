// 画面の仕組みの規則（円の形のゆれ・円の二重・作る側の言葉）の誤検出と見逃しを押さえる。落とすべき文は、2026-10-08 に確認役が公開10件の本番画面で見つけた物。
import assert from 'node:assert/strict';
import test from 'node:test';

import { auditStructure, foreignKey, MAKER_HEADINGS, STRUCTURE_RULES, yenDoubles, yenVariants } from './structure-rules.mjs';

const screen = (over = {}) => ({ id: 'x', name: 'Example', list: '', overview: [], cells: [], sections: [], images: 1, icons: 0, ...over });
const section = (id, title, text) => ({ id, title, text, links: [] });

test('外貨の額の鍵: 書き方が違っても同じ額は同じ鍵', () => {
  assert.equal(foreignKey('$5K'), foreignKey('5,000ドル'));
  assert.equal(foreignKey('250ドル'), foreignKey('US$250'));
  assert.notEqual(foreignKey('250ドル'), foreignKey('250ユーロ'));
});

test('円の形のゆれ: 同じ外貨の額に違う円の書き方が付いたら落とす（Referral Rock の月250ドル）', () => {
  const v = yenVariants(['月250ドル（約3万7,500円）', '月250ドル（約3.8万円）', '月250ドル（約3.75万円）']);
  assert.equal(v.length, 1);
  assert.equal(v[0].yens.length, 3);
});

test('円の形のゆれ: 同じ書き方・別の額は通す', () => {
  assert.deepEqual(yenVariants(['月250ドル（約3万7,500円）', '年250ドル（約3万7,500円）', '99ドル（約1万4,850円）']), []);
});

test('円の二重: 「超」をはさんだ二重と、円が先の並びを落とす', () => {
  assert.equal(yenDoubles('2億ドル（約300億円）超（約300億円）').length, 1);
  assert.equal(yenDoubles('月400ドル（約6万円）超（約6万円超）').length, 1);
  assert.equal(yenDoubles('約900万円（6万ドル）').length, 1);
  assert.deepEqual(yenDoubles('2億ドル（約300億円）超'), []);
  assert.deepEqual(yenDoubles('347ドル（約5万2,050円）から2,100ドル（約31万5,000円）'), []);
});

test('作る側の言葉: 章の見出し・列名・注記を落とし、中身の文は通す', () => {
  const hits = auditStructure(screen({ sections: [
    section('section-details', '出典つきの事実・数値', '本文'),
    section('section-metrics', '数値', '項目\n期間\n金額\n由来'),
    section('section-reasoning', '計算の前提', '本人の記述を要約した。計算はない。'),
  ] }));
  const rules = hits.map((h) => h.rule);
  assert.equal(rules.filter((r) => r === STRUCTURE_RULES.MAKER_WORDS).length, 3);
  assert.deepEqual(auditStructure(screen({ sections: [section('section-details', '数字と出典', '年商は約4,500万円\n今までの歩み')] })), []);
  assert.ok(MAKER_HEADINGS.has('その他'));
});
