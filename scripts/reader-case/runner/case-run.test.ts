/* eslint-disable @typescript-eslint/no-explicit-any -- テストは結果 JSON を任意の形に組み替えるため */
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { StallError, type Caller } from '../agent-call';
import { runCases, type Exec } from '../case-run';
import { STAGES } from './runner';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const fx = (n: string): any => JSON.parse(readFileSync(join(here, '__fixtures__', n), 'utf8'));

const IDS = ['fx-001', 'fx-002', 'fx-003'];
const BUNDLE_FX = { verify: 'verify-batch.json', analyze: 'analyze-batch.json', audit: 'audit-in.json' } as const;
const RESULT_FX = { verify: 'verify-result.json', analyze: 'analyze-result.json', audit: 'audit-result.json' } as const;
const RESULT_KEY = { verify: 'verdicts', analyze: 'analysis', audit: 'cases' } as const;

/** 試験用の作業場所: 本物の指示本体、5つの画面ファイル、空の仕上げ済み一覧 */
function setupRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'case-run-'));
  mkdirSync(join(root, 'scripts/reader-case'), { recursive: true });
  for (const s of Object.values(STAGES)) copyFileSync(join(repo, s.promptFile), join(root, s.promptFile));
  mkdirSync(join(root, 'data'), { recursive: true });
  for (const f of ['list-lines', 'summary-lines', 'detail-lines', 'success-points', 'case-chapters']) writeFileSync(join(root, 'data', `${f}.json`), '[]\n');
  writeFileSync(join(root, 'data/catalog-finished-ids.txt'), `${IDS.join('\n')}\n`);
  return root;
}

/** 束づくりの命令の代わり: 事例ごとに 1 件だけ入った束を、指定の名前で置く */
function writeBundles(root: string, stage: 'verify' | 'analyze' | 'audit', name: (i: number) => string, ids: string[]): void {
  const def = STAGES[stage];
  mkdirSync(join(root, def.bundleDir), { recursive: true });
  const whole = fx(BUNDLE_FX[stage]);
  ids.forEach((id, i) => writeFileSync(join(root, def.bundleDir, `${name(i + 1)}.json`), JSON.stringify({ ...whole, cases: whole.cases.filter((c: any) => c.entityId === id) })));
}

/** 偽の命令実行: 呼ばれた名前を記録し、束づくりの命令だけは束を置く */
function fakeExec(root: string, calls: string[], opt: { auditBuildBad?: string; sourceCheckFail?: string; select?: Record<string, string[]>; prepareCode?: number } = {}): Exec {
  return async (name, argv) => {
    calls.push(name);
    const arg = (n: string): string => argv[argv.indexOf(n) + 1];
    const ids = (): string[] => readFileSync(arg('--ids'), 'utf8').split('\n').filter(Boolean);
    if (name === 'verify-build') writeBundles(root, 'verify', (i) => `${arg('--prefix')}${String(i).padStart(3, '0')}`, ids());
    if (name === 'analyze-build') writeBundles(root, 'analyze', (i) => `${arg('--prefix')}${String(i).padStart(3, '0')}`, ids());
    if (name.startsWith('audit-build') && opt.auditBuildBad && ids().includes(opt.auditBuildBad)) return { code: 1, stdout: '', stderr: `Error: ${opt.auditBuildBad}: 推論:TIMELINE:basis-missing-id\n    at main (x.ts:1:1)` };
    if (name.startsWith('audit-build')) writeBundles(root, 'audit', (i) => `in-${arg('--tag')}${String(i).padStart(3, '0')}`, ids());
    if (name === 'source-check' && opt.sourceCheckFail) return { code: 1, stdout: `{"cases":3}\n不合格 ${opt.sourceCheckFail}|fact|f1: 数字が原文に無い「売上」\n`, stderr: '' };
    if (name === 'select') return { code: 0, stdout: JSON.stringify({ finished: 3, reasons: opt.select ?? {} }), stderr: '' };
    if (name === 'prepare') return { code: opt.prepareCode ?? 0, stdout: '', stderr: '' };
    return { code: 0, stdout: '', stderr: '' };
  };
}

/** 偽の AI: 束の中身から、fixture の正しい結果をその事例の分だけ返す。badId の事例には壊れた応答を返し続ける */
function fakeCaller(root: string, log: { label: string }[], badId?: string): Caller {
  return async ({ label, user }) => {
    log.push({ label });
    const [stage, name] = label.split(' ') as ['verify' | 'analyze' | 'audit', string];
    const bundle = JSON.parse(readFileSync(join(root, STAGES[stage].bundleDir, `${name}.json`), 'utf8'));
    const id = bundle.cases[0].entityId as string;
    assert.ok(user.includes(id), '束の中身が依頼本文に貼られている（ファイルを開かせない）');
    if (id === badId && stage === 'analyze') return { text: 'これは JSON ではない', seconds: 0 };
    const result = fx(RESULT_FX[stage]);
    return { text: JSON.stringify({ ...result, [RESULT_KEY[stage]]: result[RESULT_KEY[stage]].filter((r: any) => r.entityId === id) }), seconds: 0, costUsd: 0.01, tokens: { input: 10, output: 5 } };
  };
}

const opts = (root: string) => ({ root, ids: IDS, runId: 't1', concurrency: 4, publish: false, display: 'legacy' as const, log: () => {} });

test('偽のAIで、待ち合わせ（終了コード75）なしに最後まで通り、段ごとの時間が記録される', async () => {
  const root = setupRoot(); const calls: string[] = []; const ai: { label: string }[] = [];
  const s = await runCases(opts(root), { exec: fakeExec(root, calls), caller: fakeCaller(root, ai) });
  assert.equal(s.ok, true, JSON.stringify(s.failures));
  assert.deepEqual(s.stages.map((x) => x.stage), ['fetch', 'verify', 'source-check', 'analyze', 'audit', 'select', 'display', 'fact-lines', 'media', 'case-text', 'prepare']);
  assert.equal(ai.length, 9, '3段 x 3事例 = 事例ごとに1回ずつ');
  assert.deepEqual(s.passed.sort(), IDS);
  for (const st of ['verify', 'analyze', 'audit'] as const) assert.equal(readdirSync(join(root, STAGES[st].outDir)).filter((f) => /^(out-|batch-).*\.json$/.test(f)).length, 3, `${st} の出力が事例ごとに確定している`);
  // 呼ぶ順
  assert.deepEqual(calls.filter((c) => !c.startsWith('display-')), ['fetch', 'verify-build', 'verify-merge', 'source-check', 'analyze-build', 'analyze-merge', 'audit-build', 'audit-merge', 'select', 'fact-lines', 'media', 'case-text', 'prepare']);
  // 所要時間の記録（1段1行）
  const lines = readFileSync(join(root, 'data/pipeline/case-run.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(lines.length, 11);
  assert.ok(lines.every((l) => l.runId === 't1' && typeof l.seconds === 'number' && l.startedAt));
});

test('1件が分析で落ちても他の件は止まらず、落ちた件と理由が一覧に残る', async () => {
  const root = setupRoot(); const ai: { label: string }[] = [];
  const s = await runCases(opts(root), { exec: fakeExec(root, []), caller: fakeCaller(root, ai, 'fx-002') });
  assert.equal(s.ok, false);
  assert.deepEqual(s.passed.sort(), ['fx-001', 'fx-003']);
  const f = s.failures.filter((x) => x.id === 'fx-002');
  assert.equal(f.length, 1);
  assert.equal(f[0].stage, 'analyze');
  assert.match(f[0].reason, /NOT_JSON/);
  // 落ちた件は、検査に拒否されるたびに理由つきで出し直され、上限（3回）で止まる
  assert.equal(ai.filter((a) => a.label.startsWith('analyze')).length, 3 + 2 + 0, '分析は 他の2件 1回ずつ + 落ちた件 3回');
  // 落ちた件は監査以降に進まない
  assert.equal(ai.filter((a) => a.label.startsWith('audit')).length, 2);
});

test('原文照合の不合格は、その事実を保留にして外し、事例は先へ進める', async () => {
  const root = setupRoot(); const calls: string[] = [];
  let prepared: string[] = [];
  const base = fakeExec(root, calls, { sourceCheckFail: 'fx-003' });
  const exec: Exec = async (name, argv) => {
    if (name === 'prepare') prepared = readFileSync(argv[argv.indexOf('--changed') + 1], 'utf8').split('\n').filter(Boolean);
    return base(name, argv);
  };
  const s = await runCases(opts(root), { exec, caller: fakeCaller(root, []) });
  assert.ok(calls.includes('source-check-hold'), '不合格の事実は直ちに保留にする');
  assert.deepEqual(prepared.sort(), ['fx-001', 'fx-002', 'fx-003']);
  assert.deepEqual(s.blockedFromPublish, []);
  assert.ok(calls.includes('audit-build'));
});

test('--publish の時だけ catalog:publish を呼ぶ', async () => {
  const root = setupRoot(); const withPub: string[][] = [];
  const mk = (): Exec => async (name, argv) => { if (name === 'publish') withPub.push(argv); return fakeExec(root, [])(name, argv); };
  await runCases(opts(root), { exec: mk(), caller: fakeCaller(root, []) });
  assert.equal(withPub.length, 0);
  const root2 = setupRoot();
  const mk2: Exec = async (name, argv) => { if (name === 'publish') withPub.push(argv); return fakeExec(root2, [])(name, argv); };
  const s = await runCases({ ...opts(root2), publish: true }, { exec: mk2, caller: fakeCaller(root2, []) });
  assert.deepEqual(withPub, [['pnpm', 'catalog:publish']]);
  assert.equal(s.stages.at(-1)?.stage, 'publish');
});

test('AIの呼び出しは同時に concurrency 本までで、束が3本なら3本が重なる', async () => {
  const root = setupRoot(); let running = 0; let peak = 0;
  const inner = fakeCaller(root, []);
  const caller: Caller = async (req) => { running++; peak = Math.max(peak, running); await new Promise((r) => setTimeout(r, 20)); try { return await inner(req); } finally { running--; } };
  await runCases({ ...opts(root), concurrency: 2 }, { exec: fakeExec(root, []), caller });
  assert.equal(peak, 2);
  const root2 = setupRoot(); running = 0; peak = 0;
  const inner2 = fakeCaller(root2, []);
  await runCases(opts(root2), { exec: fakeExec(root2, []), caller: async (req) => { running++; peak = Math.max(peak, running); await new Promise((r) => setTimeout(r, 20)); try { return await inner2(req); } finally { running--; } } });
  assert.equal(peak, 3);
});

test('AIが固まった件だけ失敗にして、ほかの件は最後まで進む', async () => {
  const root = setupRoot();
  const inner = fakeCaller(root, []);
  const caller: Caller = async (req) => {
    const [stage, name] = req.label.split(' ') as ['verify' | 'analyze' | 'audit', string];
    const bundle = JSON.parse(readFileSync(join(root, STAGES[stage].bundleDir, `${name}.json`), 'utf8'));
    if (stage === 'verify' && bundle.cases[0].entityId === 'fx-002') throw new StallError('claude が固まった（偽）');
    return inner(req);
  };
  const s = await runCases(opts(root), { exec: fakeExec(root, []), caller });
  assert.deepEqual(s.passed.sort(), ['fx-001', 'fx-003']);
  const f = s.failures.find((x) => x.id === 'fx-002');
  assert.equal(f?.stage, 'verify');
  assert.match(f?.reason ?? '', /固まった/);
});

test('監査の入力を組めない事例が1件あっても、ほかの事例は監査まで進む', async () => {
  const root = setupRoot(); const calls: string[] = []; const ai: { label: string }[] = [];
  const s = await runCases(opts(root), { exec: fakeExec(root, calls, { auditBuildBad: 'fx-002' }), caller: fakeCaller(root, ai) });
  assert.deepEqual(s.passed.sort(), ['fx-001', 'fx-003']);
  const f = s.failures.filter((x) => x.id === 'fx-002');
  assert.equal(f.length, 1);
  assert.equal(f[0].stage, 'audit');
  assert.match(f[0].reason, /basis-missing-id/);
  assert.doesNotMatch(f[0].reason, /at main/, '理由には Error の行だけを出す');
  assert.equal(ai.filter((a) => a.label.startsWith('audit')).length, 2);
  assert.ok(calls.includes('audit-build-fx-001') && calls.includes('select'));
});

test('画面の正本の流れ（既定）: 正本の無い事例だけ書かせ、照合に通らなかった件だけ落とし、古い形の言い直しは作らない', async () => {
  const root = setupRoot(); const calls: string[] = []; const ai: { label: string }[] = [];
  mkdirSync(join(root, 'data/case-pages'), { recursive: true });
  writeFileSync(join(root, 'data/case-pages', `${IDS[0]}.md`), '# 承認済み\n');
  const base = fakeExec(root, calls);
  let written = '';
  const exec: Exec = async (name, argv) => {
    if (name === 'display-case-write') { calls.push(name); written = argv[argv.indexOf('--ids') + 1]; return { code: 1, stdout: `[case:write] ${IDS[1]}: 合格 1秒\n[case:write] ${IDS[2]}: 不合格（2件）\n`, stderr: '' }; }
    return base(name, argv);
  };
  const s = await runCases({ ...opts(root), display: 'case-page' }, { exec, caller: fakeCaller(root, ai) });
  assert.equal(written, `${IDS[1]},${IDS[2]}`, '正本がある事例は書き直さない');
  assert.ok(calls.includes('display-case-pages-build'));
  assert.ok(!calls.includes('fact-lines'));
  assert.deepEqual(s.failures.filter((f) => f.stage === 'display').map((f) => f.id), [IDS[2]]);
});
