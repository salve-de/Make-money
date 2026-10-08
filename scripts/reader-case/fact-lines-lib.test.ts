import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkLabels, checkLine, collectTargets, newTokens, replaceEntity, type FactTarget } from './fact-lines-lib';
import type { ReaderCase } from '../../src/shared/reader-case';

const target = (original: string, kind: FactTarget['kind'] = 'fact'): FactTarget => ({ key: `${kind}:x`, kind, targetId: 'x', where: '出典を見る > 補足', original, max: 200 });
const none = () => [];

test('言い直しに元に無い数字・年・名前が入ると落とす。円はコードが付けるので書かせない', () => {
  const original = '公式ブログは、ARRが2億ドルを超え、8か月で倍増したと発表した。Benchmarkが出資した。';
  assert.deepEqual(newTokens('年間の定期売上が2億ドルを超え、8か月で倍増したと公式が発表した。', original, original), []);
  assert.ok(newTokens('年間の定期売上が2億ドル（約300億円）を超えた。', original, original).length > 0);
  assert.ok(newTokens('年間の定期売上が3億ドルを超えた。', original, original).includes('3億ドル'));
  assert.ok(newTokens('Sequoiaが出資した。', original, original).includes('sequoia'));
});

test('日付の形の言い換え（2026-06-25 → 2026年6月25日）は新しい数字としない', () => {
  assert.deepEqual(newTokens('2026年6月25日の発表', '2026-06-25の発表', ''), []);
});

test('字数の上限と、式の骨格（数字と記号）の変更を落とす', () => {
  assert.ok(checkLine(target('あ'.repeat(10)), 'あ'.repeat(201), '', none).some((p) => p.includes('上限')));
  const f = target('参考計算：200,000,000÷2.70≒74,074,074ドルと仮定する。', 'formula');
  assert.deepEqual(checkLine(f, '次の前提で計算した。200,000,000÷2.70≒74,074,074ドル。', '', none), []);
  assert.ok(checkLine(f, '次の前提で計算した。200,000,000×2.70≒74,074,074ドル。', '', none).some((p) => p.includes('計算式')));
});

test('欄の洗い出し: 事実・数値の注記と期間・式・帯の推論。概要の事実と定型の式は除く', () => {
  const reader = {
    sources: [], unknowns: [], summaryFactId: 'f1',
    facts: [{ id: 'f1', kind: 'DESCRIPTION', text: '概要。', sourceId: 's' }, { id: 'f2', kind: 'PRICING', text: '月29ドル。', sourceId: 's' }],
    metrics: [{ id: 'm1', measure: 'REVENUE', period: '2019年5月1日の投稿（月の売上70K）', amount: 1, origin: 'SELF_REPORTED', sourceId: 's', basis: '出典は「25,000人超」と書く' }, { id: 'm2', measure: 'USERS', period: '2016年', amount: 1, origin: 'SELF_REPORTED', sourceId: 's' }],
    analysis: [
      { id: 'a-pricing', item: 'PRICING', text: '月29ドルから。', basis: [], formula: '数字は出典に載っている値' },
      { id: 'a-cap', item: 'CAPITAL_AND_TEAM', text: '資本。', basis: [], formula: '200÷2.7≒74' },
    ],
  } as unknown as ReaderCase;
  const keys = collectTargets(reader).map((t) => t.key).sort();
  assert.deepEqual(keys, ['analysis:a-pricing', 'basis:m1', 'fact:f2', 'formula:a-cap', 'period:m1'].sort());
  assert.ok(collectTargets(reader).find((t) => t.key === 'fact:f2')!.where.includes('料金'));
});

test('事例ごとに差し替える（他の事例は動かさない）', () => {
  const e = (entityId: string, targetId: string) => ({ entityId, kind: 'fact' as const, targetId, hash: 'h', text: 't' });
  const out = replaceEntity([e('b', 'f1'), e('a', 'f1'), e('a', 'f2')], 'a', [e('a', 'f3')]);
  assert.deepEqual(out.map((x) => `${x.entityId}:${x.targetId}`), ['a:f3', 'b:f1']);
});

test('札の検査: 長い・運営の印・既にある・文字でない', () => {
  const op = new Set(['収集事例']);
  assert.deepEqual(checkLabels(['ブラウザ拡張'], ['SaaS'], op), []);
  assert.equal(checkLabels(['収集事例', 'SaaS', 'あ'.repeat(15), '123'], ['SaaS'], op).length, 4);
});
