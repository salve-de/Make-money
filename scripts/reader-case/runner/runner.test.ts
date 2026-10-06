/* eslint-disable @typescript-eslint/no-explicit-any -- テストは結果 JSON を任意の形に壊して検査するため */
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { acceptInbox, inspect, step, STAGES } from './runner';
import { validateRaw, type StageName } from './validate';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const fx = (n: string): string => join(here, '__fixtures__', n);
const readFx = (n: string): any => JSON.parse(readFileSync(fx(n), 'utf8'));

/** 一時ルートに fixture の束と本物の指示本体(prompt)を置く */
function setup(stage: StageName, bundleName: string): { root: string; inbox: string; out: string; bundle: any; result: any } {
  const root = mkdtempSync(join(tmpdir(), 'runner-'));
  const def = STAGES[stage];
  mkdirSync(join(root, def.bundleDir), { recursive: true });
  mkdirSync(join(root, 'scripts/reader-case'), { recursive: true });
  copyFileSync(join(repo, def.promptFile), join(root, def.promptFile));
  const bundleFx = stage === 'audit' ? 'audit-in.json' : `${stage}-batch.json`;
  copyFileSync(fx(bundleFx), join(root, def.bundleDir, bundleName));
  return { root, inbox: join(root, 'data/runner/inbox', stage, def.outName(bundleName)), out: join(root, def.outDir, def.outName(bundleName)), bundle: readFx(bundleFx), result: readFx(`${stage}-result.json`) };
}
const put = (path: string, v: unknown): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof v === 'string' ? v : JSON.stringify(v));
};

const cases: [StageName, string][] = [['analyze', 'batch-fx-001.json'], ['audit', 'in-fx001.json'], ['verify', 'batch-fx-001.json']];

for (const [stage, bundleName] of cases) {
  test(`${stage}: ドライランで指示書が出て、正しい結果は受理され out に確定する（fixture 3件）`, () => {
    const s = setup(stage, bundleName);
    const o = { root: s.root, stage };
    // 1回目: 結果が無いので指示書が出てサブエージェント待ち（75）
    const first = step(o);
    assert.equal(first.exitCode, 75);
    const instr = readFileSync(join(s.root, 'data/runner/instructions', stage, bundleName.replace('.json', '.md')), 'utf8');
    assert.match(instr, new RegExp(`data/runner/inbox/${stage}/`));
    assert.match(instr, /指示本体/);
    assert.ok(!/codex/i.test(instr));
    for (const c of s.bundle.cases) assert.ok(JSON.stringify(s.result).includes(c.entityId)); // fixture は3件とも結果を持つ
    assert.equal(s.bundle.cases.length, 3);
    // サブエージェントが結果を書いたことにする
    put(s.inbox, s.result);
    const second = step(o);
    assert.deepEqual(second.accepted, [bundleName.replace('.json', '')]);
    assert.equal(second.exitCode, 0);
    assert.ok(existsSync(s.out));
    assert.ok(!existsSync(s.inbox));
    // 3回目: 受理済みなので何も出さない
    assert.equal(step(o).done, 1);
  });

  test(`${stage}: コードフェンス付きでも JSON として読めれば受理、読めなければ拒否`, () => {
    const s = setup(stage, bundleName);
    assert.equal(validateRaw(stage, s.bundle, '```json\n' + JSON.stringify(s.result) + '\n```').ok, true);
    const bad = validateRaw(stage, s.bundle, '{"途中で切れた');
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.equal(bad.reasons[0].code, 'NOT_JSON');
  });
}

test('analyze: 件数不足は拒否され、再試行の指示書に理由が入り、上限で保留になる', () => {
  const s = setup('analyze', 'batch-fx-001.json');
  const o = { root: s.root, stage: 'analyze' as const, maxAttempts: 2 };
  step(o);
  put(s.inbox, { analysis: s.result.analysis.slice(0, 2) });
  const r1 = step(o);
  assert.equal(r1.rejected.length, 1);
  assert.equal(r1.rejected[0].reasons[0].code, 'COUNT_SHORT');
  assert.equal(r1.rejected[0].held, false);
  assert.equal(r1.exitCode, 75); // 再試行待ち
  assert.ok(!existsSync(s.out));
  const instr = readFileSync(join(s.root, 'data/runner/instructions/analyze/batch-fx-001.md'), 'utf8');
  assert.match(instr, /前回の提出は機械検査で拒否/);
  assert.match(instr, /COUNT_SHORT/);
  // 2回目も不足 → 保留
  put(s.inbox, { analysis: s.result.analysis.slice(0, 1) });
  const r2 = step(o);
  assert.equal(r2.rejected[0].held, true);
  assert.equal(r2.exitCode, 76);
  assert.equal(inspect(o)[0].status, 'HOLD');
  assert.ok(!existsSync(s.out));
  // 保留の束には新しい指示書を出さず、待ちにも数えない
  assert.equal(step(o).waiting.length, 0);
});

test('analyze: 不正JSONは受理されず再試行になる', () => {
  const s = setup('analyze', 'batch-fx-001.json');
  step({ root: s.root, stage: 'analyze' });
  put(s.inbox, 'すみません、うまくいきませんでした');
  const r = step({ root: s.root, stage: 'analyze' });
  assert.equal(r.rejected[0].reasons[0].code, 'NOT_JSON');
  assert.equal(r.exitCode, 75);
  assert.ok(!existsSync(s.out));
});

test('analyze: 存在しない根拠id・入力に無い事例・定義に無い項目名は拒否', () => {
  const s = setup('analyze', 'batch-fx-001.json');
  const mk = (mut: (r: any) => void): any => {
    const r = structuredClone(s.result);
    mut(r);
    return validateRaw('analyze', s.bundle, JSON.stringify(r));
  };
  let v = mk((r) => r.analysis[0].items[0].basis.push('f999'));
  assert.ok(!v.ok && v.reasons.some((x: any) => x.code === 'UNKNOWN_EVIDENCE_ID'));
  v = mk((r) => (r.analysis[1].entityId = 'fx-zzz'));
  assert.ok(!v.ok && v.reasons.some((x: any) => x.code === 'UNKNOWN_ENTITY') && v.reasons.some((x: any) => x.code === 'COUNT_SHORT'));
  v = mk((r) => (r.analysis[0].items[0].item = 'NOPE'));
  assert.ok(!v.ok && v.reasons.some((x: any) => x.code === 'BAD_ITEM'));
  v = mk((r) => r.analysis.push(r.analysis[0]));
  assert.ok(!v.ok && v.reasons.some((x: any) => x.code === 'DUPLICATE_CASE'));
});

test('audit: 存在しない analysisId・FIX に fix が無い・件数不足は拒否', () => {
  const s = setup('audit', 'in-fx001.json');
  const run = (mut: (r: any) => void): any => {
    const r = structuredClone(s.result);
    mut(r);
    return validateRaw('audit', s.bundle, JSON.stringify(r));
  };
  let v = run((r) => r.cases[1].items.push({ analysisId: 'a-nothing', kind: 'WEAK', severity: 'LOW', why: 'x' }));
  assert.ok(!v.ok && v.reasons.some((x: any) => x.code === 'UNKNOWN_ANALYSIS_ID'));
  v = run((r) => r.cases[1].items.push({ analysisId: 'a-headline', kind: 'WEAK', severity: 'FIX', why: 'x' }));
  assert.ok(!v.ok && v.reasons.some((x: any) => /fix/.test(x.message)));
  v = run((r) => r.cases.pop());
  assert.ok(!v.ok && v.reasons.some((x: any) => x.code === 'COUNT_SHORT'));
});

test('verify: 本文に無い quote・入力に無い claim・判定抜けは拒否', () => {
  const s = setup('verify', 'batch-fx-001.json');
  const run = (mut: (r: any) => void): any => {
    const r = structuredClone(s.result);
    mut(r);
    return validateRaw('verify', s.bundle, JSON.stringify(r));
  };
  let v = run((r) => (r.verdicts[0].quote = '本文に存在しない作文の引用です。'));
  assert.ok(!v.ok && v.reasons.some((x: any) => x.code === 'QUOTE_NOT_IN_SOURCE'));
  v = run((r) => (r.verdicts[0].claimId = 'c-zzz'));
  assert.ok(!v.ok && v.reasons.some((x: any) => x.code === 'UNKNOWN_CLAIM') && v.reasons.some((x: any) => x.code === 'COUNT_SHORT'));
  v = run((r) => r.verdicts.pop());
  assert.ok(!v.ok && v.reasons.some((x: any) => x.code === 'COUNT_SHORT'));
});

test('既存の out が受理基準を満たさなければ完了扱いにしない（エラー文だけの出力で skip しない）', () => {
  const s = setup('analyze', 'batch-fx-001.json');
  put(s.out, { error: 'at capacity' });
  assert.equal(inspect({ root: s.root, stage: 'analyze' })[0].status, 'WAITING');
  put(s.out, s.result);
  assert.equal(inspect({ root: s.root, stage: 'analyze' })[0].status, 'DONE');
});

test('--prefix で束を絞れる／force は既存 out を退避してやり直す', () => {
  const s = setup('analyze', 'batch-fx-001.json');
  copyFileSync(fx('analyze-batch.json'), join(s.root, 'data/analyze/batches/batch-other-001.json'));
  assert.equal(inspect({ root: s.root, stage: 'analyze', prefix: 'batch-fx-' }).length, 1);
  assert.equal(inspect({ root: s.root, stage: 'analyze' }).length, 2);
  put(s.out, s.result);
  const r = step({ root: s.root, stage: 'analyze', prefix: 'batch-fx-', force: true });
  assert.equal(r.exitCode, 75);
  assert.ok(!existsSync(s.out));
  // dry-run は何も書かない
  const d = setup('analyze', 'batch-fx-001.json');
  step({ root: d.root, stage: 'analyze', dryRun: true });
  assert.ok(!existsSync(join(d.root, 'data/runner')));
  put(d.inbox, d.result);
  assert.deepEqual(acceptInbox({ root: d.root, stage: 'analyze', dryRun: true }).accepted, ['batch-fx-001']);
  assert.ok(!existsSync(d.out));
});
