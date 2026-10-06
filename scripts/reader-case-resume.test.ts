import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import type { StoredAnalysis } from './reader-case/analysis-lib';
import { bundleName, trackEvidence, type FillPlan } from './reader-case/build-fill-batches';
import { loadRawItems, reevaluatedIds } from './reader-case/load-readers';
import { mergeAnalysisItems } from './reader-case/merge-items';
import { appendRecord, currentStates, readCaseRecords, resolveStuck, summarize } from './reader-case/ledger';

const tmp = (p: string) => mkdtempSync(`${tmpdir()}/${p}-`);
const dig = (n: string) => ({ facts: { f1: n }, metrics: {}, sources: {} });
const item = (name: string, text: string) => ({ id: `a-${name}`, item: name, text, basis: ['f1'], presentation: 'ESTIMATE' }) as unknown as StoredAnalysis;

test('(a) 再評価の束を作っただけでは評価済みにならない。追加束・新しい根拠なしは進む', () => {
  const re: FillPlan = { kind: 'reevaluate', onlyItems: ['STORY'], extra: {} };
  const add: FillPlan = { kind: 'add', onlyItems: ['STORY'], extra: {} };
  const t = trackEvidence(re, dig('old'), dig('new'));
  assert.equal(t.reviewed, undefined);
  assert.deepEqual(t.pending, dig('new'));
  assert.deepEqual(trackEvidence(add, dig('old'), dig('new')).reviewed, dig('new'));
  assert.deepEqual(trackEvidence(null, undefined, dig('new')), { reviewed: dig('new'), baselined: true });
});

test('(b) 束の名前に中身の指紋が入り、中身が変われば古い出力は使われない', () => {
  const a = [{ entityId: 'e1', onlyItems: ['STORY'] }];
  const b = [{ entityId: 'e1', onlyItems: ['STORY', 'LESSON'] }];
  assert.notEqual(bundleName('add-', 1, a), bundleName('add-', 1, b));
  assert.equal(bundleName('add-', 1, a), bundleName('add-', 1, [...a]));
  const root = tmp('bundle');
  const out = `${root}/out`; const batches = `${root}/batches`;
  mkdirSync(out); mkdirSync(batches);
  const oldName = bundleName('add-', 1, a); const newName = bundleName('add-', 1, b);
  const doc = (n: string, text: string) => JSON.stringify({ batch: n, analysis: [{ entityId: 'e1', items: [{ item: 'STORY', text }] }] });
  writeFileSync(`${out}/batch-001.json`, JSON.stringify({ analysis: [{ entityId: 'e1', items: [] }] }));
  writeFileSync(`${out}/${oldName}.json`, doc(oldName, '古い出力'));
  writeFileSync(`${batches}/${newName}.json`, '{}'); // 今ある束は新しい中身だけ
  assert.deepEqual(loadRawItems(out, batches).get('e1'), []); // 古い出力は取り込まれない
  writeFileSync(`${out}/${newName}.json`, doc(newName, '新しい出力'));
  assert.equal((loadRawItems(out, batches).get('e1') as { text: string }[])[0]!.text, '新しい出力');
  assert.equal(reevaluatedIds(out, batches).size, 0);
});

test('(c) 項目単位のマージ: 全部落ちても既存は消えず、一部の出力は既存を丸ごと置換しない', () => {
  const existing = [item('STORY', '既存の物語'), item('LESSON', '既存の学び')];
  const allDropped = mergeAnalysisItems(existing, []);
  assert.deepEqual(allDropped.items, existing);
  assert.equal(allDropped.allRejected, true);
  const partial = mergeAnalysisItems(existing, [item('STORY', '新しい物語'), item('CHANNELS', '新しい集客')]);
  assert.deepEqual(partial.items.map((i) => `${i.item}:${i.text}`), ['STORY:新しい物語', 'LESSON:既存の学び', 'CHANNELS:新しい集客']);
  assert.equal(partial.retained, 1);
  assert.equal(partial.allRejected, false);
  assert.equal(mergeAnalysisItems(undefined, []).allRejected, false);
});

test('(d) 台帳: 同じ事例×段階×理由の保留は1件に畳み、解消（成功）で止まっている一覧から外れる', () => {
  const dir = tmp('ledger');
  const hold = { caseId: 'c1', stage: 'ANALYZE', status: 'HOLD', reasonCode: 'NO_SOURCE_TEXT', reasonText: '出典に本文が無い' } as const;
  for (let i = 0; i < 5; i++) appendRecord(hold, dir);
  assert.equal(readCaseRecords('c1', dir).length, 1);
  appendRecord({ ...hold, reasonText: '別の理由の文' }, dir);
  assert.equal(readCaseRecords('c1', dir).length, 2);
  assert.equal(summarize(currentStates(dir)).stuck.length, 1);
  assert.equal(resolveStuck('c1', 'ANALYZE', dir, 'test'), true);
  assert.equal(summarize(currentStates(dir)).stuck.length, 0);
  assert.equal(resolveStuck('c1', 'ANALYZE', dir), false);
  // 解消後に同じ保留が再発したら、新しい記録として残る
  appendRecord(hold, dir);
  assert.equal(summarize(currentStates(dir)).stuck.length, 1);
  // 実行全体の失敗も成功後に閉じられる
  appendRecord({ caseId: '_run:x1', stage: 'ANALYZE', status: 'FAILED', reasonCode: 'RUN_ABORTED' }, dir);
  assert.equal(resolveStuck('_run:x1', 'ANALYZE', dir), true);
});
