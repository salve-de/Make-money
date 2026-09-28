import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runStoredStage, collectStageUsage, snapshotStageUsage} from './gemini-stage-store.mjs';

function directory(t) {
  const dir = mkdtempSync(join(tmpdir(), 'gemini-stage-test-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  return dir;
}
const input = {model: 'test-model', prompt: 'broad research', search: true};
const response = {candidates: [{finishReason: 'STOP'}], usageMetadata: {promptTokenCount: 10, candidatesTokenCount: 4}};
test('identical resume performs no second paid call', async t => {
  const dir = directory(t); let calls = 0;
  const execute = async () => { calls++; return response; };
  await runStoredStage(dir, 'research', input, execute);
  assert.deepEqual(await runStoredStage(dir, 'research', input, execute), response);
  assert.equal(calls, 1);
});
test('changed prompt cannot consume an old conversion', async t => {
  const dir = directory(t);
  await runStoredStage(dir, 'structured', input, async () => response);
  await assert.rejects(runStoredStage(dir, 'structured', {...input, prompt: 'includes enrichment'}, async () => response), /INPUT_CHANGED/);
});
test('uncertain failed request stops, retains usage uncertainty and never retries', async t => {
  const dir = directory(t); let calls = 0;
  const execute = async () => { calls++; throw Error('network timeout'); };
  await assert.rejects(runStoredStage(dir, 'research', input, execute), /timeout/);
  await assert.rejects(runStoredStage(dir, 'research', input, execute), /OUTCOME_UNKNOWN/);
  assert.equal(calls, 1);
  assert.equal(collectStageUsage(dir).hasUnknownUsage, true);
});
test('ledger includes enrichment and rejected/truncated results, snapshots idempotently', async t => {
  const dir = directory(t);
  await runStoredStage(dir, 'research', input, async () => response);
  await runStoredStage(dir, 'enrichment', input, async () => ({...response, candidates: [{finishReason: 'MAX_TOKENS'}]}));
  writeFileSync(join(dir, 'unfinished.input.json'), JSON.stringify(input));
  const {path, report} = snapshotStageUsage(dir);
  assert.equal(report.calls.length, 3);
  assert.equal(report.totalsOfReportedUsage.promptTokenCount, 20);
  assert.equal(report.hasUnknownUsage, true);
  assert.equal(snapshotStageUsage(dir).path, path);
});
test('normalized null token counts are unknown usage, never a known zero bill', async t=>{
  const dir=directory(t);
  await runStoredStage(dir,'source-extraction',input,async()=>({usageMetadata:{promptTokenCount:null,candidatesTokenCount:null,totalTokenCount:null}}));
  const ledger=collectStageUsage(dir);
  assert.equal(ledger.hasUnknownUsage,true);
  assert.equal(ledger.calls[0].status,'usage_incomplete');
  assert.deepEqual(ledger.totalsOfReportedUsage,{});
});
