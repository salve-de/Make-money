/* eslint-disable @typescript-eslint/no-explicit-any -- 結果 JSON を任意の形に壊して検査するため */
/**
 * run-daily.sh（定期実行）の検査。fixture の束を置いた一時ルートに scripts をコピーし、本物の runner・台帳・run-daily.sh を走らせる。
 * run-pipeline.sh の代わりに、runner の分析工程だけを呼ぶ代役（stub-pipeline.sh）を差し込む（実データ・公開側には触れない）。
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { prefixesOf } from '../daily-state';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const fx = (n: string): any => JSON.parse(readFileSync(join(here, '__fixtures__', n), 'utf8'));

const STUB = `#!/usr/bin/env bash
# run-pipeline.sh の代役: 本物の runner の分析工程 → 結果から決まる下流の出力。待ちの時は本物と同じく FAILED を台帳に残して終了コード1
P="$1"; cd "$(dirname "$0")" || exit 1
echo "$P" >> data/pipeline/stub-calls.log
[ -z "\${STUB_SLEEP:-}" ] || sleep "$STUB_SLEEP"
ANALYZE_PREFIX="$P" bash scripts/reader-case/run-analyze.sh; rc=$?
if [ $rc != 0 ]; then
  node --import tsx scripts/reader-case/pipeline-status.ts record --case "_run:\${P%-}" --stage ANALYZE --status FAILED --reason RUN_ABORTED --text "分析はサブエージェント待ちまたは保留" >/dev/null 2>&1
  echo "停止: 分析は未完了（終了コード $rc）"; exit 1
fi
cat data/analyze/out/\${P}*.json | shasum > data/pipeline/stub-downstream.sha
echo x >> data/pipeline/stub-downstream.count
`;

interface Box { root: string; run: (args?: string[], env?: Record<string, string>) => { code: number; out: string }; calls: () => number; batch: (n: string, cases: any[]) => void; result: (n: string, ids: string[]) => void }

/** 3束（各1事例 fx-001..003、接頭辞 batch-fx-）を置いた一時ルート */
function sandbox(): Box {
  const root = mkdtempSync(join(tmpdir(), 'daily-'));
  mkdirSync(join(root, 'scripts'), { recursive: true });
  cpSync(join(repo, 'scripts/reader-case'), join(root, 'scripts/reader-case'), { recursive: true });
  for (const l of ['src', 'node_modules', 'package.json', 'tsconfig.json']) symlinkSync(join(repo, l), join(root, l));
  mkdirSync(join(root, 'data/analyze/batches'), { recursive: true });
  mkdirSync(join(root, 'data/pipeline'), { recursive: true });
  writeFileSync(join(root, 'stub-pipeline.sh'), STUB);
  const base = fx('analyze-batch.json');
  const box: Box = {
    root,
    batch: (n, cases) => writeFileSync(join(root, 'data/analyze/batches', `${n}.json`), JSON.stringify({ ...base, cases })),
    result: (n, ids) => {
      const r = fx('analyze-result.json');
      const dir = join(root, 'data/runner/inbox/analyze');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${n}.json`), JSON.stringify({ analysis: r.analysis.filter((a: any) => ids.includes(a.entityId)) }));
    },
    calls: () => (existsSync(join(root, 'data/pipeline/stub-calls.log')) ? readFileSync(join(root, 'data/pipeline/stub-calls.log'), 'utf8').split('\n').filter(Boolean).length : 0),
    run: (args = [], env = {}) => {
      const r = spawnSync('bash', [join(root, 'scripts/reader-case/run-daily.sh'), ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, DAILY_NOTIFY: '0', DAILY_PIPELINE_SCRIPT: join(root, 'stub-pipeline.sh'), ...env } });
      return { code: r.status ?? -1, out: `${r.stdout}${r.stderr}` };
    },
  };
  for (const [i, id] of ['fx-001', 'fx-002', 'fx-003'].entries()) box.batch(`batch-fx-00${i + 1}`, base.cases.filter((c: any) => c.entityId === id));
  return box;
}
const all = ['batch-fx-001', 'batch-fx-002', 'batch-fx-003'];
const idOf = (n: string): string => `fx-00${n.slice(-1)}`;
const state = (b: Box): any => JSON.parse(readFileSync(join(b.root, 'data/pipeline/daily/state.json'), 'utf8'));
/** 実行の結果として変わりうるファイルだけの指紋（ログ・履歴・状態・ロックは除く） */
function tree(b: Box): string {
  const h = createHash('sha256');
  const walk = (d: string): void => {
    for (const f of readdirSync(join(b.root, d), { withFileTypes: true }).sort((x, y) => x.name.localeCompare(y.name))) {
      const p = `${d}/${f.name}`;
      if (p.startsWith('data/pipeline/daily')) continue;
      if (f.isDirectory()) walk(p);
      else h.update(`${p}\n${readFileSync(join(b.root, p), 'utf8')}\n`);
    }
  };
  walk('data');
  return h.digest('hex');
}
const ledger = (b: Box): any[] => {
  const d = join(b.root, 'data/pipeline/ledger');
  return existsSync(d) ? readdirSync(d).flatMap((f) => readFileSync(join(d, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))) : [];
};

test('接頭辞は束の名前から決まり、短い接頭辞が長いものを含む時は短い方だけ残る', () => {
  assert.deepEqual(prefixesOf(['batch-x1-001.json', 'batch-x1-002.json', 'batch-fx-001.json', 'a.json']), ['batch-fx-', 'batch-x1-']);
  assert.deepEqual(prefixesOf(['batch-001.json', 'batch-x1-001.json']), ['batch-']);
});

test('run-daily.sh に、公開・保存先・本番・課金につながる命令が含まれない', () => {
  const src = readFileSync(join(repo, 'scripts/reader-case/run-daily.sh'), 'utf8').split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
  for (const bad of ['gh ', 'git push', 'deploy', 'upload-media', 'with-r2', 'wrangler', 'stripe', 'curl', 'catalog:publish']) assert.ok(!src.includes(bad), `含まれてはならない: ${bad}`);
  assert.match(src, /export PIPELINE_NO_PUBLISH=1/);
});

test('検証: 待ち→結果投入→完了。待ちは正常終了（0）で理由と指示書を残し、完了後に台帳の止まり表示が消える', () => {
  const b = sandbox();
  const r1 = b.run();
  assert.equal(r1.code, 0, r1.out);
  assert.match(r1.out, /WAITING_AGENT/);
  assert.equal(state(b)['batch-fx-'].status, 'WAITING_AGENT');
  for (const n of all) assert.ok(existsSync(join(b.root, `data/runner/instructions/analyze/${n}.md`)), `指示書 ${n}`);
  const stuck1 = ledger(b).filter((x) => x.caseId === '_run:batch-fx');
  assert.equal(stuck1.at(-1).status, 'PENDING', '待ちは FAILED のまま残さない');
  for (const n of all) b.result(n, [idOf(n)]);
  const r2 = b.run();
  assert.equal(r2.code, 0, r2.out);
  assert.equal(state(b)['batch-fx-'].status, 'DONE');
  assert.equal(readFileSync(join(b.root, 'data/pipeline/stub-downstream.count'), 'utf8').trim(), 'x');
  const last = ledger(b).filter((x) => x.caseId === '_run:batch-fx');
  assert.ok(!last.some((x, i) => x.status === 'FAILED' && !last.slice(i + 1).some((y) => y.stage === x.stage && y.status !== 'FAILED')), '完了後に FAILED のままの段階がない');
});

test('検証: 同じ入力で再実行すると変化 0（サブエージェントも下流も呼ばない）', () => {
  const b = sandbox();
  b.run();
  for (const n of all) b.result(n, [idOf(n)]);
  assert.equal(b.run().code, 0);
  const calls = b.calls();
  const before = tree(b);
  const r = b.run();
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /SKIPPED_SAME_INPUT/);
  assert.equal(b.calls(), calls, 'パイプラインを呼んでいない');
  assert.equal(tree(b), before, 'data の中身が1バイトも変わらない');
});

test('検証: 入力の束を1件だけ変えると、その1束だけがやり直しになる（他の束の結果は受理済みのまま）', () => {
  const b = sandbox();
  b.run();
  for (const n of all) b.result(n, [idOf(n)]);
  b.run();
  const base = fx('analyze-batch.json');
  const extra = { ...base.cases[0], entityId: 'fx-004' };
  b.batch('batch-fx-002', [base.cases.find((c: any) => c.entityId === 'fx-002'), extra]);
  const outBefore = (n: string): string => readFileSync(join(b.root, `data/analyze/out/${n}.json`), 'utf8');
  const keep = [outBefore('batch-fx-001'), outBefore('batch-fx-003')];
  const r = b.run();
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /入力の束が前回完了時から変わった/);
  assert.match(state(b)['batch-fx-'].status, /WAITING_AGENT/);
  assert.ok(existsSync(join(b.root, 'data/runner/instructions/analyze/batch-fx-002.md')));
  assert.deepEqual([outBefore('batch-fx-001'), outBefore('batch-fx-003')], keep, '他の2束は再処理されていない');
});

test('検証: サブエージェントの出力が不正・不足なら受理せず再試行 → 上限で保留（失敗扱いにしない）→ 解除して再開', () => {
  const b = sandbox();
  b.run();
  writeFileSync(join(b.root, 'data/runner/inbox/analyze/batch-fx-001.json'), 'これは JSON ではない');
  const r1 = b.run();
  assert.equal(r1.code, 0, r1.out);
  assert.ok(!existsSync(join(b.root, 'data/analyze/out/batch-fx-001.json')), '不正な出力は out に入らない');
  assert.match(readFileSync(join(b.root, 'data/runner/instructions/analyze/batch-fx-001.md'), 'utf8'), /NOT_JSON/, '拒否理由が次の指示書に載る');
  // 件数不足（事例0件）を上限まで提出し続ける
  for (let i = 0; i < 2; i++) {
    writeFileSync(join(b.root, 'data/runner/inbox/analyze/batch-fx-001.json'), JSON.stringify({ analysis: [] }));
    b.run();
  }
  for (const n of ['batch-fx-002', 'batch-fx-003']) b.result(n, [idOf(n)]);
  const r2 = b.run();
  assert.equal(r2.code, 0, r2.out);
  assert.equal(state(b)['batch-fx-'].status, 'HOLD');
  assert.match(state(b)['batch-fx-'].reason, /COUNT_SHORT/);
  assert.ok(ledger(b).some((x) => x.caseId === '_run:batch-fx' && x.status === 'HOLD'), '台帳に HOLD と理由が残る');
  assert.ok(existsSync(join(b.root, 'data/analyze/out/batch-fx-002.json')), '正しい束は先へ進む');
  // 人の判断で解除し、正しい結果を置くと続きから完了する
  spawnSync('node', ['--import', 'tsx', 'scripts/reader-case/runner/cli.ts', 'release', 'analyze', '--prefix', 'batch-fx-'], { cwd: b.root });
  b.result('batch-fx-001', ['fx-001']);
  const r3 = b.run();
  assert.equal(r3.code, 0, r3.out);
  assert.equal(state(b)['batch-fx-'].status, 'DONE');
});

test('検証: 二重起動は2つ目が何もせず正常終了（パイプラインは1回だけ）', async () => {
  const b = sandbox();
  const env = { ...process.env, DAILY_NOTIFY: '0', DAILY_PIPELINE_SCRIPT: join(b.root, 'stub-pipeline.sh'), STUB_SLEEP: '4' };
  const first = spawn('bash', [join(b.root, 'scripts/reader-case/run-daily.sh')], { cwd: b.root, env });
  await new Promise((r) => setTimeout(r, 2500));
  const second = b.run([], { STUB_SLEEP: '4' });
  assert.equal(second.code, 0, second.out);
  assert.match(second.out, /二重起動/);
  await new Promise((r) => first.on('exit', r));
  assert.equal(b.calls(), 1, 'パイプラインは1回だけ');
  assert.ok(!existsSync(join(b.root, 'data/pipeline/daily/lock')), '終了後にロックが残らない');
});

test('検証: 途中で kill された実行の古いロックを回収し、中断を記録して続きから再開する', async () => {
  const b = sandbox();
  const env = { ...process.env, DAILY_NOTIFY: '0', DAILY_PIPELINE_SCRIPT: join(b.root, 'stub-pipeline.sh'), STUB_SLEEP: '30' };
  const first = spawn('bash', [join(b.root, 'scripts/reader-case/run-daily.sh')], { cwd: b.root, env, detached: true });
  await new Promise((r) => setTimeout(r, 3000));
  assert.equal(state(b)['batch-fx-'].status, 'RUNNING');
  // 強制終了（trap が走らない）。子の stub も止める
  spawnSync('pkill', ['-KILL', '-P', String(first.pid)]);
  process.kill(first.pid!, 'SIGKILL');
  await new Promise((r) => setTimeout(r, 300));
  spawnSync('pkill', ['-f', join(b.root, 'stub-pipeline.sh')]);
  assert.ok(existsSync(join(b.root, 'data/pipeline/daily/lock')), 'kill されたのでロックが残っている');
  const r = b.run();
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /古いロックを回収/);
  const hist = readFileSync(join(b.root, 'data/pipeline/daily/runs.jsonl'), 'utf8');
  assert.match(hist, /INTERRUPTED/);
  assert.ok(ledger(b).some((x) => x.caseId === '_run:batch-fx' && x.reasonText?.includes('中断')), '台帳に中断が残る');
  assert.equal(state(b)['batch-fx-'].status, 'WAITING_AGENT', '続きから回り、次の待ちまで進んだ');
});

test('検証: 制限時間を超えたパイプラインは打ち切られ、失敗として記録される（次回続きから）', () => {
  const b = sandbox();
  const r = b.run([], { STUB_SLEEP: '30', DAILY_MAX_SECONDS: '2' });
  assert.equal(r.code, 1, r.out);
  assert.equal(state(b)['batch-fx-'].status, 'FAILED');
  assert.match(state(b)['batch-fx-'].reason, /制限時間/);
});
