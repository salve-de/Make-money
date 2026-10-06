import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { REASON_CODE_LIST, REASON_CODES, appendRecord, currentStates, readCaseRecords, renderStatus, summarize } from './reader-case/ledger';
import { casesWithoutSourceText } from './reader-case/pipeline-status';

const tmp = () => mkdtempSync(`${tmpdir()}/ledger-`);

test('検証A: 出典なしの事例が HOLD NO_SOURCE_TEXT として理由つきで status に出る', () => {
  const dir = tmp();
  const batch = { cases: [{ entityId: 'fx_ok', sources: [{ text: '本文あり' }] }, { entityId: 'fx_none', sources: [{ text: '  ' }] }, { entityId: 'fx_nosrc', sources: [] }] };
  const ids = casesWithoutSourceText(batch);
  assert.deepEqual(ids, ['fx_none', 'fx_nosrc']);
  appendRecord({ caseId: 'fx_ok', stage: 'ANALYZE', status: 'DONE' }, dir);
  for (const id of ids) appendRecord({ caseId: id, stage: 'ANALYZE', status: 'HOLD', reasonCode: 'NO_SOURCE_TEXT', reasonText: '出典に本文が1件も無い' }, dir);
  const text = renderStatus(summarize(currentStates(dir)));
  assert.match(text, /fx_none \[ANALYZE\] 保留 NO_SOURCE_TEXT（出典の本文が無い）: 出典に本文が1件も無い/);
  assert.match(text, /止まっている 2 件/);
  assert.doesNotMatch(text, /fx_ok \[/);
});

test('現在の状態は最後の記録。履歴は消えず、attempts は RUNNING のたびに増える', () => {
  const dir = tmp();
  appendRecord({ caseId: 'c1', stage: 'AUDIT', status: 'RUNNING' }, dir);
  appendRecord({ caseId: 'c1', stage: 'AUDIT', status: 'FAILED', reasonCode: 'AUDIT_BLOCK' }, dir);
  appendRecord({ caseId: 'c1', stage: 'AUDIT', status: 'RUNNING' }, dir);
  appendRecord({ caseId: 'c1', stage: 'AUDIT', status: 'DONE' }, dir);
  assert.equal(readCaseRecords('c1', dir).length, 4);
  const [cur] = currentStates(dir);
  assert.equal(cur.status, 'DONE');
  assert.equal(cur.attempts, 2);
  assert.equal(summarize(currentStates(dir)).stuck.length, 0);
});

test('理由なしの HOLD/FAILED や未知の値は書けない', () => {
  const dir = tmp();
  assert.throws(() => appendRecord({ caseId: 'c', stage: 'AUDIT', status: 'HOLD' }, dir), /理由コード/);
  assert.throws(() => appendRecord({ caseId: 'c', stage: 'NOPE' as never, status: 'DONE' }, dir), /未知の段階/);
  assert.throws(() => appendRecord({ caseId: 'c', stage: 'AUDIT', status: 'HOLD', reasonCode: 'X' as never }, dir), /未知の理由/);
  assert.equal(readdirSync(dir).length, 0);
});

test('並行追記: 別プロセス8本が同じ事例に各50行足しても、行が欠けず壊れない', async () => {
  const dir = tmp();
  const script = `const m = await import('./scripts/reader-case/ledger.ts'); const appendRecord = m.appendRecord ?? m.default.appendRecord;
    for (let i = 0; i < 50; i++) appendRecord({ caseId: 'shared', stage: 'ANALYZE', status: 'DONE', reasonText: process.argv[1] + ':' + i + ':' + 'x'.repeat(2000), attempts: 1 }, ${JSON.stringify(dir)});`;
  await Promise.all(Array.from({ length: 8 }, (_, w) => new Promise<void>((res, rej) => {
    const p = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script, String(w)], { stdio: 'inherit' });
    p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`worker ${w} exit ${c}`))));
  })));
  const raw = readFileSync(`${dir}/shared.jsonl`, 'utf8').split('\n').filter(Boolean);
  assert.equal(raw.length, 400);
  for (const l of raw) JSON.parse(l);
  assert.equal(new Set(readCaseRecords('shared', dir).map((r) => r.reasonText)).size, 400);
});

test('reasonCode 網羅: 設計書の12種がすべてあり、日本語の説明が付いている', () => {
  const required = ['NO_SOURCE_TEXT', 'VERIFY_UNRESOLVED', 'ANALYSIS_REJECTED', 'AUDIT_BLOCK', 'LEAD_NOT_PASSED', 'NO_IMAGE', 'RIGHTS_BLOCKED', 'THIN', 'NO_NEW_EVIDENCE', 'CI_FAILED', 'REVIEW_OPEN', 'READBACK_MISMATCH'];
  for (const c of required) assert.ok(REASON_CODE_LIST.includes(c as never), c);
  for (const c of REASON_CODE_LIST) assert.match(REASON_CODES[c], /[ぁ-んァ-ヶ一-龠]/, `${c} の説明が日本語でない`);
  // 各コードで HOLD を書き、status にコードと説明が出る
  const dir = tmp();
  REASON_CODE_LIST.forEach((c, i) => appendRecord({ caseId: `case${i}`, stage: 'SELECT', status: 'HOLD', reasonCode: c }, dir));
  const text = renderStatus(summarize(currentStates(dir)));
  for (const c of REASON_CODE_LIST) assert.ok(text.includes(`${c}（${REASON_CODES[c]}）`), c);
});
