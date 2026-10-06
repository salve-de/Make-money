/* eslint-disable @typescript-eslint/no-explicit-any -- テストは結果 JSON を任意の形に壊して検査するため */
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readCaseRecords } from '../ledger';
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
});

test('完了は出力ファイルの有無ではなく入力指紋＋規則版の一致で決まる（指紋の記録が無い out は再処理）', () => {
  const s = setup('analyze', 'batch-fx-001.json');
  const o = { root: s.root, stage: 'analyze' as const };
  put(s.out, s.result); // 受理基準を満たす out が既にあるが、受理した記録（指紋）は無い
  assert.equal(inspect(o)[0].status, 'WAITING');
  assert.equal(step(o).exitCode, 75);
  put(s.inbox, s.result);
  assert.deepEqual(step(o).accepted, ['batch-fx-001']);
  assert.equal(inspect(o)[0].status, 'DONE');
  // 旧い out は上書きせず退避される
  assert.ok(readdirSync(dirname(s.out)).some((f) => f.startsWith('batch-fx-001.json.bak-')));
});

test('同じ入力・同じ規則ならスキップ（指示書も出さず、台帳は増えない）', () => {
  const s = setup('analyze', 'batch-fx-001.json');
  const o = { root: s.root, stage: 'analyze' as const };
  step(o);
  put(s.inbox, s.result);
  step(o);
  const ledgerOf = (): any[] => readCaseRecords('fx-001', join(s.root, 'data/pipeline/ledger')).filter((r) => r.stage === 'ANALYZE');
  assert.deepEqual(ledgerOf().map((r) => r.status), ['DONE']);
  assert.ok(ledgerOf()[0].inputHash && ledgerOf()[0].ruleVersion);
  const instr = join(s.root, 'data/runner/instructions/analyze/batch-fx-001.md');
  rmSync(instr, { force: true });
  for (let i = 0; i < 3; i++) {
    const r = step(o);
    assert.equal(r.exitCode, 0);
    assert.equal(r.done, 1);
    assert.equal(r.waiting.length, 0);
  }
  assert.ok(!existsSync(instr), 'スキップした束の指示書は作り直さない');
  assert.deepEqual(ledgerOf().map((r) => r.status), ['DONE']); // 最新が同じ指紋の DONE なら、再実行しても記録は増えない
  // 台帳が無い（別の作業場所など）時は、飛ばしたことを1回だけ記録する
  rmSync(join(s.root, 'data/pipeline/ledger'), { recursive: true, force: true });
  step(o);
  step(o);
  assert.deepEqual(ledgerOf().map((r) => r.status), ['SKIPPED_SAME_INPUT']);
});

test('束の中身が変わったら再処理（out が残っていても完了にしない）', () => {
  const s = setup('analyze', 'batch-fx-001.json');
  const o = { root: s.root, stage: 'analyze' as const };
  put(s.inbox, s.result);
  step(o);
  assert.equal(inspect(o)[0].status, 'DONE');
  const bp = join(s.root, STAGES.analyze.bundleDir, 'batch-fx-001.json');
  const b = JSON.parse(readFileSync(bp, 'utf8'));
  b.cases[0].facts[0].text += '（追記された新しい事実）';
  writeFileSync(bp, JSON.stringify(b));
  assert.ok(existsSync(s.out));
  assert.equal(inspect(o)[0].status, 'WAITING');
  assert.equal(step(o).exitCode, 75);
});

test('指示書（プロンプト）を変えたら再処理。旧い指示で保留になった束もやり直せる', () => {
  const s = setup('analyze', 'batch-fx-001.json');
  const o = { root: s.root, stage: 'analyze' as const, maxAttempts: 1 };
  const promptPath = join(s.root, STAGES.analyze.promptFile);
  put(s.inbox, s.result);
  step(o);
  assert.equal(inspect(o)[0].status, 'DONE');
  writeFileSync(promptPath, readFileSync(promptPath, 'utf8') + '\n新しい規則を1行足した。');
  assert.equal(inspect(o)[0].status, 'WAITING');
  // 保留も、指示書を変えれば白紙に戻る
  step(o);
  put(s.inbox, '壊れた提出');
  assert.equal(step(o).exitCode, 76);
  assert.equal(inspect(o)[0].status, 'HOLD');
  const held = readCaseRecords('fx-001', join(s.root, 'data/pipeline/ledger')).filter((r) => r.stage === 'ANALYZE').at(-1)!;
  assert.equal(held.status, 'HOLD');
  assert.equal(held.reasonCode, 'ANALYSIS_REJECTED');
  writeFileSync(promptPath, readFileSync(promptPath, 'utf8') + '\nさらに1行。');
  assert.equal(inspect(o)[0].status, 'WAITING');
});

test('analyze: 反転後の指示どおりの出力（items 空・confidence 無し・presentation 付き）を受理する', () => {
  const s = setup('analyze', 'batch-fx-001.json');
  const r = structuredClone(s.result);
  r.analysis[0].items = []; // 書ける項目が無い事例
  r.analysis[1].items = [{ item: 'BUSINESS_MODEL', text: '年会費で稼ぐ', basis: ['fx-002-f1'], presentation: 'FACT_SUMMARY' }];
  r.analysis[2].items = [{ item: 'REVENUE_ESTIMATE', text: '年10万ドルの数%', basis: ['fx-003-f1'], formula: '本人公表の年売上 × 3.6%', presentation: 'ESTIMATE' }];
  assert.equal(validateRaw('analyze', s.bundle, JSON.stringify(r)).ok, true);
  // 旧仕様の形（confidence 付き）が混じっていても拒否しない
  r.analysis[1].items[0].confidence = 'HIGH';
  assert.equal(validateRaw('analyze', s.bundle, JSON.stringify(r)).ok, true);
});

test('analyze: presentation が列挙外・ESTIMATE に式が無いものは拒否', () => {
  const s = setup('analyze', 'batch-fx-001.json');
  const run = (mut: (r: any) => void): any => {
    const r = structuredClone(s.result);
    mut(r);
    return validateRaw('analyze', s.bundle, JSON.stringify(r));
  };
  let v = run((r) => (r.analysis[0].items[0].presentation = 'GUESS'));
  assert.ok(!v.ok && v.reasons.some((x: any) => x.code === 'BAD_ITEM' && /presentation/.test(x.message)));
  v = run((r) => (r.analysis[0].items[0].presentation = 'ESTIMATE'));
  assert.ok(!v.ok && v.reasons.some((x: any) => /formula/.test(x.message)));
});

test('audit: ケース単位の __case__ の BLOCK と、HEADLINE の書き直し（FIX / BLOCK）を受理する。__case__ の FIX は拒否', () => {
  const s = setup('audit', 'in-fx001.json');
  const run = (mut: (r: any) => void): any => {
    const r = structuredClone(s.result);
    mut(r);
    return validateRaw('audit', s.bundle, JSON.stringify(r));
  };
  assert.equal(run((r) => r.cases[0].items.push({ analysisId: '__case__', kind: 'FACT_DISGUISED', severity: 'BLOCK', why: '権利の確認が要る' })).ok, true);
  assert.equal(run((r) => r.cases[0].items.push({ analysisId: 'a-headline', kind: 'HEADLINE', severity: 'FIX', why: '焦点を絞る', fix: '書き直したリード' })).ok, true);
  assert.equal(run((r) => r.cases[0].items.push({ analysisId: 'a-headline', kind: 'HEADLINE', severity: 'BLOCK', why: '具体的な行動の事実が無い' })).ok, true);
  const v = run((r) => r.cases[0].items.push({ analysisId: '__case__', kind: 'WEAK', severity: 'FIX', why: 'x', fix: 'y' }));
  assert.ok(!v.ok && v.reasons.some((x: any) => /__case__/.test(x.message)));
});

test('verify: 複数チャンクの出典は、前半のチャンクにある引用も通す（後半だけにしない）', () => {
  const s = setup('verify', 'batch-fx-001.json');
  const bundle = structuredClone(s.bundle);
  const c0 = bundle.cases[0];
  const first = c0.sources[0];
  c0.sources = [
    { ...first, part: 1, parts: 2, text: '前半のチャンク。創業者は2019年に最初の有料客を得た。' },
    { ...first, part: 2, parts: 2, text: '後半のチャンク。年額の会員制で提供している。' },
  ];
  const mk = (quote: string): any => {
    const r = structuredClone(s.result);
    r.verdicts[0].quote = quote;
    return validateRaw('verify', bundle, JSON.stringify(r));
  };
  assert.equal(mk('創業者は2019年に最初の有料客を得た。').ok, true); // 前半
  assert.equal(mk('年額の会員制で提供している。').ok, true); // 後半
  const bad = mk('どのチャンクにも無い作文。');
  assert.ok(!bad.ok && bad.reasons.some((x: any) => x.code === 'QUOTE_NOT_IN_SOURCE'));
});

test('--prefix で束を絞れる／force は既存 out を退避してやり直す', () => {
  const s = setup('analyze', 'batch-fx-001.json');
  copyFileSync(fx('analyze-batch.json'), join(s.root, 'data/analyze/batches/batch-other-001.json'));
  assert.equal(inspect({ root: s.root, stage: 'analyze', prefix: 'batch-fx-' }).length, 1);
  assert.equal(inspect({ root: s.root, stage: 'analyze' }).length, 2);
  put(s.inbox, s.result);
  acceptInbox({ root: s.root, stage: 'analyze', prefix: 'batch-fx-' });
  assert.ok(existsSync(s.out));
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
