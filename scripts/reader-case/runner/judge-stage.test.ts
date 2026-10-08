/* eslint-disable @typescript-eslint/no-explicit-any -- テストは結果 JSON を任意の形に組み替えるため */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { Caller } from '../agent-call';
import type { Exec } from '../case-run';
import { machineChecks, countKeys, loadTerms } from '../judge-checks';
import { loadMachineRules } from '../judge-lib';
import { memoryCache } from '../judge-questions';
import { entityDisplayOf, runJudge } from '../judge-stage';
import { displayRows } from '../judge-lib';
import { repo } from './judge-fixtures-lib';

const ID = 't1';
const rules = loadMachineRules(repo);
const terms = { aliases: [], terms: [] };

/** 試験用の作業場所: 画面の層の5ファイル（detail に行を入れる）と、偽の「描いた画面」 */
function setup(detail: Array<{ analysisId: string; answer: string; note?: string }>): string {
  const root = mkdtempSync(join(tmpdir(), 'judge-'));
  mkdirSync(join(root, 'data'), { recursive: true });
  const w = (f: string, v: unknown): void => writeFileSync(join(root, 'data', `${f}.json`), `${JSON.stringify(v, null, 2)}\n`);
  w('list-lines', [{ entityId: ID, factId: 'f1', factHash: 'h', text: '小さな会社が月額課金で伸びた' }]);
  w('summary-lines', []);
  w('detail-lines', detail.map((d) => ({ entityId: ID, textHash: 'x', ...d })));
  w('success-points', []);
  w('case-chapters', []);
  return root;
}

const fakeExec = (calls: string[]): Exec => async (name, argv) => {
  calls.push(name);
  if (name.startsWith('judge-render')) {
    const out = argv[argv.indexOf('--out') + 1];
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, `${ID}.json`), JSON.stringify({ id: ID, ok: true, name: 'テスト社', tags: ['課金'], detail: ['詳細の行'], list: ['一覧の行'], discover: [] }));
  }
  return { code: 0, stdout: '', stderr: '' };
};

/** 偽の判定役: textsNo に含まれる文には「意味が取れない」（sense=いいえ）と答え続ける。それ以外は問題なし */
const fakeJudge = (textsNo: string[], log: string[] = []): Caller => async ({ user, label }) => {
  log.push(label);
  const bad = textsNo.some((t) => user.includes(t));
  const sense = user.includes('1回読んで');
  return { text: JSON.stringify({ answer: sense ? (bad ? 'いいえ' : 'はい') : 'いいえ', why: '' }), seconds: 0.01 };
};

const fakeWriter = (map: Record<string, string>, log: string[] = []): Caller => async ({ user, label }) => {
  log.push(label);
  const s = (JSON.parse(user) as { sentence: string }).sentence;
  return { text: JSON.stringify({ text: map[s] ?? s }), seconds: 0.01 };
};

const baseOpt = (root: string) => ({ root, ids: [ID], runId: 'r1', concurrency: 2, independent: true, judgeLabel: 'fake' });
const deps = (root: string, judge: Caller, writer: Caller, calls: string[] = []) => ({ exec: fakeExec(calls), judge, writer, check: () => ({ ok: true, problems: [] }), rules, terms, cache: memoryCache(), now: () => 0 });
/** 画面に出る分析欄の行（外した行は「出さない」印が付くだけで、ファイルには残る） */
const detailOf = (root: string): any[] => (JSON.parse(readFileSync(join(root, 'data/detail-lines.json'), 'utf8')) as any[]).filter((d) => !d.hidden);

test('引っかかった行は1文だけ直され、指摘が減ったので採られる', async () => {
  const root = setup([{ analysisId: 'a-1', answer: 'MRR が前の年より伸びた' }]);
  const calls: string[] = [];
  const sum = await runJudge(baseOpt(root), deps(root, fakeJudge([]), fakeWriter({ 'MRR が前の年より伸びた': '月の定期売上が前の年より伸びた' }), calls));
  const r = sum.results[0];
  assert.equal(sum.failed.length, 0);
  assert.ok(r.before.flags >= 1, '直す前に略語の指摘がある');
  assert.equal(r.after.flags, 0, '直した後は指摘が無い');
  assert.equal(r.fixedRows, 1);
  assert.equal(r.droppedRows, 0);
  assert.equal(detailOf(root)[0].answer, '月の定期売上が前の年より伸びた');
  assert.ok(calls.includes('judge-prepare-judged'), '直したので公開データを作り直す');
  const saved = JSON.parse(readFileSync(join(root, 'data/pipeline/reader-judge/t1.json'), 'utf8'));
  assert.ok(saved.findings.some((f: any) => f.status === 'fixed' && f.after.includes('月の定期売上')));
});

test('直しを採れなかった行は外される（直した文が増えた数字を持つ）', async () => {
  const root = setup([{ analysisId: 'a-1', answer: '利用者の話が伸びた' }, { analysisId: 'a-2', answer: 'MRR が前の年より伸びた' }]);
  const sum = await runJudge(baseOpt(root), deps(root, fakeJudge([]), fakeWriter({ 'MRR が前の年より伸びた': '月の定期売上が5000人に伸びた' })));
  const r = sum.results[0];
  assert.equal(r.fixedRows, 0);
  assert.equal(r.droppedRows, 1);
  assert.deepEqual(detailOf(root).map((d) => d.analysisId), ['a-1'], '外したのは a-2 だけ');
  assert.ok(r.findings.some((f) => f.status === 'dropped' && /増えた/.test(f.note ?? '')));
});

test('指摘が減らない直しは採らず、元の文のまま行を外す', async () => {
  // 直した文を判定役がまた「意味が取れない」と答えるので、指摘は1つから減らない
  const root = setup([{ analysisId: 'a-1', answer: '利用者の話が伸びた' }, { analysisId: 'a-2', answer: '分かりにくい文です' }]);
  const sum = await runJudge(baseOpt(root), deps(root, fakeJudge(['分かりにくい']), fakeWriter({ '分かりにくい文です': '分かりにくい文がありました' })));
  const r = sum.results[0];
  assert.equal(r.fixedRows, 0);
  assert.equal(r.droppedRows, 1);
  assert.match(r.findings.find((f) => f.status === 'dropped')!.note ?? '', /指摘が減らなかった/);
  assert.equal(detailOf(root).length, 1);
});

test('別の指摘を作る直しは、合計が減らなければ採らない', async () => {
  const root = setup([{ analysisId: 'a-1', answer: 'MRR が前の年より伸びた' }]);
  // 略語は消えるが、文が助詞で終わる（言いさし）ので合計は1のまま
  const sum = await runJudge(baseOpt(root), deps(root, fakeJudge([]), fakeWriter({ 'MRR が前の年より伸びた': '月の定期売上が前の年より伸びたの' })));
  assert.equal(sum.results[0].fixedRows, 0);
  assert.equal(sum.results[0].droppedRows, 1);
});

test('問題の無い事例は、直しも外しもせず、書き手を呼ばない', async () => {
  const root = setup([{ analysisId: 'a-1', answer: '利用者の話が前の年より伸びた' }]);
  const w: string[] = []; const calls: string[] = [];
  const sum = await runJudge(baseOpt(root), deps(root, fakeJudge([]), fakeWriter({}, w), calls));
  assert.equal(sum.results[0].before.flags, 0);
  assert.equal(sum.results[0].fixedRows + sum.results[0].droppedRows, 0);
  assert.equal(w.length, 0);
  assert.ok(!calls.includes('judge-prepare-judged'), '変えていないので公開データは作り直さない');
});

test('個人情報らしい文字列が画面に出る事例は止める', async () => {
  const root = setup([{ analysisId: 'a-1', answer: '利用者の話が前の年より伸びた' }]);
  const exec: Exec = async (name, argv) => {
    if (name.startsWith('judge-render')) {
      const out = argv[argv.indexOf('--out') + 1]; mkdirSync(out, { recursive: true });
      writeFileSync(join(out, `${ID}.json`), JSON.stringify({ id: ID, ok: true, name: 'テスト社', tags: ['課金'], detail: ['連絡先 taro@example.com'], list: [], discover: [] }));
    }
    return { code: 0, stdout: '', stderr: '' };
  };
  const sum = await runJudge(baseOpt(root), { ...deps(root, fakeJudge([]), fakeWriter({})), exec });
  assert.deepEqual(sum.blocked, [ID]);
});

test('機械の検査: 円の二重・指す相手が消えた・金額が欠けた・略語の初出', () => {
  const files: any = {
    'list-lines': [{ entityId: ID, factId: 'f1', factHash: 'h', text: '同じ作家の本が売れた' }],
    'summary-lines': [], 'success-points': [],
    'detail-lines': [{ entityId: ID, analysisId: 'a-1', textHash: 'x', answer: '料金は月額から契約できる', note: '$20（約3,000円）（約3,000円）で売った。SSO に対応した' }],
    'case-chapters': [],
  };
  const flags = machineChecks(files, { entityId: ID, name: 'テスト社', tags: [], terms, rules }, entityDisplayOf(files, ID));
  const codes = new Set(flags.map((f) => f.code));
  for (const c of ['dangling-cue', 'amount-missing', 'yen-double', 'tag-none']) assert.ok(codes.has(c), c);
  assert.ok(flags.some((f) => f.kind === 'd'), '略語の初出');
  assert.ok(countKeys(flags) >= 4);
  assert.equal(displayRows(ID, files).length, 3);
});

// ---- 固定の検査集（scripts/reader-case/judge-fixtures/）: 変えるたびに、悪くなっていないかを見る ----
const FIX = join(repo, 'scripts/reader-case/judge-fixtures');
const frozen = JSON.parse(readFileSync(join(FIX, 'published-display.json'), 'utf8')) as any;
const baseline = JSON.parse(readFileSync(join(FIX, 'baseline.json'), 'utf8')) as Record<string, { flags: number; byKind: Record<string, number> }>;

test('固定の検査集: 公開済みの事例の機械の指摘は、基準より増えていない（誤検出が増えていない）', () => {
  for (const [id, base] of Object.entries(baseline)) {
    const flags = machineChecks(frozen, { entityId: id, terms: loadTerms(repo), rules }, entityDisplayOf(frozen, id));
    assert.ok(countKeys(flags) <= base.flags, `${id}: ${countKeys(flags)} 件 > 基準 ${base.flags} 件（${flags.map((f) => `${f.rowId}:${f.code}`).join(', ')}）。意図した変更なら judge-fixtures/make.ts で基準を更新する`);
  }
});

test('固定の検査集: 第2回監査の引っかかりのうち機械で決まるものは、今も拾える（検出が落ちていない）', () => {
  const bad = JSON.parse(readFileSync(join(FIX, 'known-bad.json'), 'utf8')) as Array<{ from: string; row: string; text: string; expect: string[] }>;
  for (const b of bad) {
    const files = JSON.parse(JSON.stringify(frozen)) as any;
    const keep = (l: any): boolean => l.entityId !== ID;
    for (const f of Object.keys(files)) files[f] = files[f].filter(keep);
    if (b.row === 'detail') files['detail-lines'].push({ entityId: ID, analysisId: 'a-1', textHash: 'x', answer: b.text });
    else {
      const [, chapter, i] = b.row.split('.');
      files['case-chapters'].push({ entityId: ID, chapters: { [chapter]: Array.from({ length: Number(i ?? 0) + 1 }, (_, k) => ({ text: k === Number(i ?? 0) ? b.text : '前の行です', source: 'x' })) } });
    }
    const kinds = new Set(machineChecks(files, { entityId: ID, name: 'テスト社', terms: loadTerms(repo), rules }, entityDisplayOf(files, ID)).filter((f) => f.rowId).map((f) => f.kind));
    for (const k of b.expect) assert.ok(kinds.has(k as any), `「${b.text}」(${b.from}) で観点 ${k} が拾えない（拾えたのは ${[...kinds].join(',') || 'なし'}）`);
  }
});
