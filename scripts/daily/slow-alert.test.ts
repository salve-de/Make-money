// 遅れの見張り。偽の呼び出しだけで確かめる（本物の通知・GitHub は呼ばない）
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { alertSlow, checkRunSlow, findSlow, latestRunId, limitsFor, readRows, type AlertDeps, type StageRow } from './slow-alert';

const row = (stage: string, seconds: number, ids = 1, runId = 'r1', detail?: Record<string, unknown>): StageRow => ({ runId, stage, seconds, ids, ...(detail ? { detail } : {}) });

test('1件の1段が15分を超えたら遅れ。ちょうど15分は遅れでない', () => {
  assert.equal(findSlow([row('analyze', 900)]).length, 0);
  const f = findSlow([row('analyze', 901)]);
  assert.equal(f.length, 1);
  assert.equal(f[0].stage, 'analyze');
});

test('並列の波で割る: 8件を並列4で流した段は、2波ぶんの時間まで許す', () => {
  assert.equal(findSlow([row('verify', 1800, 8)]).filter((x) => x.stage).length, 0);
  assert.equal(findSlow([row('verify', 1900, 8)]).filter((x) => x.stage).length, 1);
  assert.equal(findSlow([row('verify', 1900, 8, 'r1', { concurrency: 8 })]).filter((x) => x.stage).length, 1); // 1波で1900秒は遅い
});

test('実行全体は1件あたり30分。段ごとは上限内でも合計で超えれば知らせる', () => {
  const rows = [row('a', 800), row('b', 800), row('c', 400)]; // 合計2000秒=33分、1件
  const f = findSlow(rows);
  assert.deepEqual(f.map((x) => x.key), ['run:r1']);
  assert.equal(findSlow([row('a', 800, 2), row('b', 800, 2)]).length, 0); // 2件で26分
});

test('回ごとに別々に数える', () => {
  const f = findSlow([row('a', 1000, 1, 'r1'), row('a', 100, 1, 'r2')]);
  assert.deepEqual(f.map((x) => x.runId), ['r1']);
});

test('固まり検出の分数が大きい時は、1段の上限もそれに5分足した値まで広げる', () => {
  assert.equal(limitsFor().stageMinutes, 15);
  assert.equal(limitsFor({ stallMinutes: 20 }).stageMinutes, 25);
  assert.equal(limitsFor({ stageMinutes: 7 }).stageMinutes, 7);
});

function fakeDeps(existing: { number: number; title: string }[] = []) {
  const calls: string[][] = []; const notices: string[] = [];
  const deps: AlertDeps = {
    exec: async (argv) => { calls.push(argv); return { code: 0, stdout: argv[1] === 'issue' && argv[2] === 'list' ? JSON.stringify(existing) : '', stderr: '' }; },
    notify: async (_t, b) => { notices.push(b); },
  };
  return { deps, calls, notices };
}

test('知らせ: Mac の通知と GitHub の新しい issue。同じ理由が開いていればコメント', async () => {
  const f = findSlow([row('analyze', 1200)]);
  const a = fakeDeps();
  assert.deepEqual(await alertSlow(f, a.deps), ['新しい issue']);
  assert.equal(a.notices.length, 1);
  assert.ok(a.calls.some((c) => c[2] === 'create'));
  const created = a.calls.find((c) => c[2] === 'create')!;
  const issueTitle = created[created.indexOf('--title') + 1];
  const b = fakeDeps([{ number: 7, title: issueTitle }]);
  assert.deepEqual(await alertSlow(f, b.deps), ['コメント #7']);
  assert.ok(b.calls.some((c) => c[2] === 'comment' && c[3] === '7'));
});

test('遅れが無ければ何も知らせない／記録ファイルから読む', async () => {
  const root = mkdtempSync(join(tmpdir(), 'slow-'));
  mkdirSync(join(root, 'data/pipeline'), { recursive: true });
  const file = join(root, 'data/pipeline/case-run.jsonl');
  writeFileSync(file, `${JSON.stringify(row('a', 10, 1, 'ok1'))}\nnot json\n${JSON.stringify(row('b', 2000, 1, 'slow1'))}\n`);
  assert.equal(readRows(file).length, 2);
  assert.equal(latestRunId(readRows(file)), 'slow1');
  const quiet = fakeDeps();
  assert.equal((await checkRunSlow(root, 'ok1', { deps: quiet.deps, log: () => undefined })).length, 0);
  assert.equal(quiet.calls.length, 0);
  const loud = fakeDeps();
  assert.equal((await checkRunSlow(root, 'slow1', { deps: loud.deps, log: () => undefined })).length, 2); // 段も実行全体も超えた
  assert.equal(loud.notices.length, 2);
});
