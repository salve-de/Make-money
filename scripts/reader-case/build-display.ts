/**
 * 新しく仕上がった事例の「画面の層」（一覧の文・概要の2文目以降・分析欄の文・成功の秘訣・章）を、人が付き添わずに作る。
 * 集める層（事実・出典）には触らない。画面の層のファイルの、その事例の分だけを置換・追加する。
 *
 *   pnpm display:build                         足りない事例を最大3件作る（実ファイル data/ に反映。コミットはしない）
 *   pnpm display:build --id <entityId>         1件だけ
 *   pnpm display:build --max 5                 上限件数
 *   pnpm display:build --data-dir <dir>        画面の層の5ファイルを <dir> から読み、<dir> へ書く（試し用。事実は data/ から読む）
 *   pnpm display:build --dry-run               作って検査するが、どこにも書かない
 *   pnpm display:build --commit                反映した分を専用ブランチ（既定 auto/display-build）にコミットする（作業中のブランチは動かさない。push はしない）
 *   pnpm display:build --materials-only --id X AIを呼ばず、AIに渡す材料の JSON を出すだけ
 *   pnpm display:build --list                  AIを呼ばず、対象の事例と足りない層を出すだけ
 * 環境変数・引数: --agent auto|claude|codex（既定 auto: claude がログイン済みなら claude、無ければ codex）
 *                 --model / --review-model（AIの型。既定は各コマンドの既定）  --no-review（別のAIの確認を省く。既定は確認する）
 *                 --attempts N（既定3: 検査に落ちた時、理由を返して直させる回数の上限）
 *
 * 流れ（1件ごと）: 材料を作る → AIが JSON を返す → 紐付けと出典URLを機械で付ける → 一時コピーの data/ で
 * scripts/architecture/check-case-text-standard.mjs と数字の突き合わせ → 別のAIが全行を確認 → 全部通れば反映。
 * 落ちたら理由をAIに返して直させる（最大 --attempts 回）。通らなければ何も書かず、data/pipeline/display-build-failures.jsonl に理由を残す。
 * 基準は docs/CASE_TEXT_STANDARD.md、docs/CASE_CHAPTER_PROCESS.md、docs/case-chapter/CONVERT_PROMPT.md。
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DISPLAY_FILES, assembleDisplay, buildMaterial, liveSuccessPoints, dropFlagged, reviewRows, displayGaps, materialNumbers, mergeEntity, newProblems, numberProblems, outputSchema, parseCheckOutput, serialize, structuralProblems,
  type AiOutput, type DisplayFiles, type DisplayNeed, type EntityDisplay, type ItemContract, type LiveReader,
} from '../../src/shared/display-build';
import { loadReaders, argValue } from './load-readers';
import { preparePublicationReader } from './publication-evaluation';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';
import { type AnalysisFile } from './analysis-lib';
import { readReflectState, withReflectedAnalysis } from './case-reflect';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
const has = (flag: string) => process.argv.includes(flag);
const DATA_DIR = resolve(argValue('--data-dir') ?? join(ROOT, 'data'));
const REAL_DATA = DATA_DIR === join(ROOT, 'data');
const DRY = has('--dry-run');
const COMMIT = has('--commit');
const MAX = Number(argValue('--max') ?? 3);
const ATTEMPTS = Number(argValue('--attempts') ?? 3);
const ONLY = argValue('--id');
const REVIEW = !has('--no-review');
const BRANCH = argValue('--branch') ?? 'auto/display-build';
const FAILURES = join(ROOT, 'data/pipeline/display-build-failures.jsonl');
const RUN_ID = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
const WORK = join(ROOT, 'data/pipeline/display-build', RUN_ID);
const EXAMPLE_IDS = ['ent_gorails_640d8f688451', 'ent_teamcamp_ae0c21986c4d', 'ent_requestly_28e9f2'];

process.chdir(ROOT); // 読み込みの部品（loadReaders など）は data/ を作業場所から読む
if (COMMIT && !REAL_DATA) { console.error('--commit は実ファイル（data/）に反映する時だけ使える'); process.exit(2); }
if (COMMIT && DRY) { console.error('--commit と --dry-run は一緒に使えない'); process.exit(2); }

const say = (text: string) => console.log(`[display:build] ${text}`);

// ---------- 材料（画面に出る事実は、公開判定と同じ手順で、照合の結果を反映した後の reader） ----------
const finished = readFileSync(join(ROOT, 'data/catalog-finished-ids.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
function liveReaders(ids: string[]): Map<string, LiveReader> {
  const verdicts = read<VerdictsFile>(join(ROOT, VERDICTS_FILE));
  const analysisPath = join(ROOT, 'data/reader-analysis.json');
  const analysis: AnalysisFile = withReflectedAnalysis(existsSync(analysisPath) ? read<AnalysisFile>(analysisPath) : {}, readReflectState());
  return new Map([...loadReaders(ids)].map(([id, reader]) => [id, preparePublicationReader(reader, verdicts[id], analysis[id]).reader as LiveReader]));
}
function entityNames(ids: string[]): Map<string, string> {
  const want = new Set(ids);
  const raw = read<Array<{ id?: string; name?: string }>>(join(ROOT, 'data/entities-index.json'));
  return new Map(raw.filter((r) => r.id && want.has(r.id) && r.name).map((r) => [r.id!, r.name!]));
}
const loadFiles = (dir: string): DisplayFiles => Object.fromEntries(DISPLAY_FILES.map((f) => [f, read(join(dir, `${f}.json`))])) as unknown as DisplayFiles;
const contract = read<{ items: ItemContract }>(join(ROOT, 'data/item-contract.json')).items;
const language = read<Array<{ pattern: string; suggest: string }>>(join(ROOT, 'data/reader-language.json'));

// ---------- 検査（一時コピーの data/ で、検査スクリプトを変えずに走らせる） ----------
const UNPARSED = '検査が読み取れない形で落ちた: ';
function runCheck(files: DisplayFiles): { ok: boolean; problems: string[] } {
  const dir = mkdtempSync(join(tmpdir(), 'display-check-'));
  try {
    mkdirSync(join(dir, 'data'));
    for (const f of DISPLAY_FILES) writeFileSync(join(dir, 'data', `${f}.json`), serialize(files[f]));
    for (const f of ['item-contract.json', 'reader-language.json']) copyFileSync(join(ROOT, 'data', f), join(dir, 'data', f));
    const r = spawnSync(process.execPath, [join(ROOT, 'scripts/architecture/check-case-text-standard.mjs')], { cwd: dir, encoding: 'utf8' });
    const output = `${r.stdout}\n${r.stderr}`;
    const problems = parseCheckOutput(output);
    // 異常終了なのに読み取れる違反が無い（検査が落ちた・壊れた）時は、握りつぶさず止める理由にする
    if (r.status !== 0 && !problems.length) problems.push(`${UNPARSED}${output.trim().split('\n').slice(-5).join(' / ').slice(0, 400)}`);
    return { ok: r.status === 0, problems };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// ---------- AIの呼び出し（文章を作るだけ。ツールは許さない） ----------
type Agent = 'claude' | 'codex';
function pickAgent(): Agent {
  const want = argValue('--agent') ?? process.env.DISPLAY_BUILD_AGENT ?? 'auto';
  if (want === 'claude' || want === 'codex') return want;
  const s = spawnSync('claude', ['auth', 'status'], { encoding: 'utf8' });
  try { if ((JSON.parse(s.stdout) as { loggedIn?: boolean }).loggedIn) return 'claude'; } catch { /* 下へ */ }
  say('claude がログインされていない（claude auth status）。codex を使う');
  return 'codex';
}
/** 確認役は作った者と別のAI（別の提供元、または別のモデルを明示した時だけ同じ提供元）。用意できなければ null（作らずに止める） */
function pickReviewer(agent: Agent): Agent | null {
  const want = argValue('--review-agent') ?? process.env.DISPLAY_REVIEW_AGENT;
  const other: Agent = agent === 'claude' ? 'codex' : 'claude';
  const target = (want === 'claude' || want === 'codex' ? want : other) as Agent;
  if (target === agent) {
    const rm = argValue('--review-model'); const m = argValue('--model');
    return rm && rm !== m ? target : null;
  }
  if (spawnSync(target, ['--version'], { encoding: 'utf8' }).status !== 0) return null;
  if (target === 'claude') { try { if (!(JSON.parse(spawnSync('claude', ['auth', 'status'], { encoding: 'utf8' }).stdout) as { loggedIn?: boolean }).loggedIn) return null; } catch { return null; } }
  return target;
}
interface CallResult { value: unknown; costUsd?: number; tokens?: { input: number; output: number }; seconds: number }
function callAgent(agent: Agent, system: string, user: string, schema: Record<string, unknown>, model: string | undefined, label: string): CallResult {
  const started = Date.now();
  const empty = mkdtempSync(join(tmpdir(), 'display-agent-')); // 読める物が何も無い場所で動かす
  try {
    if (agent === 'claude') {
      const args = ['-p', '--output-format', 'json', '--json-schema', JSON.stringify(schema), '--tools', '', '--safe-mode', '--strict-mcp-config', '--no-session-persistence', '--system-prompt', system, ...(model ? ['--model', model] : [])];
      const r = spawnSync('claude', args, { cwd: empty, input: user, encoding: 'utf8', timeout: 15 * 60_000, maxBuffer: 64 * 1024 * 1024 });
      const j = JSON.parse(r.stdout || '{}') as { is_error?: boolean; result?: string; structured_output?: unknown; total_cost_usd?: number; usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } };
      if (r.status !== 0 || j.is_error) throw new Error(`claude が失敗（${label}）: ${(j.result ?? r.stderr ?? '').slice(0, 300)}`);
      const value = j.structured_output ?? JSON.parse(String(j.result ?? '').replace(/^```(?:json)?\s*|\s*```$/g, ''));
      const u = j.usage ?? {};
      return { value, costUsd: j.total_cost_usd, tokens: { input: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), output: u.output_tokens ?? 0 }, seconds: (Date.now() - started) / 1000 };
    }
    const schemaFile = join(empty, 'schema.json'); const outFile = join(empty, 'out.json');
    writeFileSync(schemaFile, JSON.stringify(schema));
    const args = ['exec', '--skip-git-repo-check', '--ephemeral', '-s', 'read-only', '--output-schema', schemaFile, '-o', outFile, '--json', '-C', empty, ...(model ? ['-m', model] : []), '-'];
    const r = spawnSync('codex', args, { cwd: empty, input: `${system}\n\n## 材料と依頼（JSON）\n${user}\n\nツールやコマンドは使わず、指定の形の JSON だけを返す。`, encoding: 'utf8', timeout: 15 * 60_000, maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0 || !existsSync(outFile)) throw new Error(`codex が失敗（${label}）: ${(r.stderr || r.stdout).slice(-300)}`);
    const tokens = { input: 0, output: 0 };
    for (const line of r.stdout.split('\n')) {
      try { const e = JSON.parse(line) as { type?: string; usage?: { input_tokens?: number; output_tokens?: number } }; if (e.type === 'turn.completed') { tokens.input += e.usage?.input_tokens ?? 0; tokens.output += e.usage?.output_tokens ?? 0; } } catch { /* 事件の行でない */ }
    }
    return { value: JSON.parse(readFileSync(outFile, 'utf8')), tokens, seconds: (Date.now() - started) / 1000 };
  } finally { rmSync(empty, { recursive: true, force: true }); }
}

const SYSTEM = `${readFileSync(join(ROOT, 'scripts/reader-case/display-prompt.md'), 'utf8')}\n## 使わない語（左の形に当たる語は、右の言い方に直す）\n${language.map((r) => `- /${r.pattern}/ → ${r.suggest}`).join('\n')}\n`;
const REVIEW_SYSTEM = readFileSync(join(ROOT, 'scripts/reader-case/display-review-prompt.md'), 'utf8');
const REVIEW_SCHEMA = { type: 'object', properties: { issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['must', 'minor'] }, id: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'id', 'problem', 'fix'], additionalProperties: false } } }, required: ['issues'], additionalProperties: false };

function isAiOutput(v: unknown): v is AiOutput {
  const o = v as AiOutput;
  return !!o && typeof o.list === 'string' && typeof o.summary === 'string' && Array.isArray(o.detail) && Array.isArray(o.success) && !!o.chapters && typeof o.chapters === 'object';
}

// ---------- 専用ブランチへのコミット（作業ツリーとブランチは動かさない。git の下位命令で木を組む） ----------
const git = (args: string[], opts: { input?: string; env?: NodeJS.ProcessEnv } = {}) => {
  const r = spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', input: opts.input, env: opts.env ?? process.env });
  if (r.status !== 0) throw new Error(`git ${args[0]} が失敗: ${r.stderr.trim()}`);
  return r.stdout.trim();
};
function commitToBranch(entityId: string, name: string | undefined, display: EntityDisplay): string {
  const exists = spawnSync('git', ['-C', ROOT, 'rev-parse', '--verify', '-q', `refs/heads/${BRANCH}`], { encoding: 'utf8' });
  const tip = exists.status === 0 ? exists.stdout.trim() : git(['rev-parse', 'HEAD']);
  // ブランチ側の版に、同じ差し替えを当てる（作業ツリーの他の変更を混ぜない）
  const base = Object.fromEntries(DISPLAY_FILES.map((f) => [f, JSON.parse(git(['show', `${tip}:data/${f}.json`]))])) as unknown as DisplayFiles;
  const merged = mergeEntity(base, entityId, display);
  const index = join(mkdtempSync(join(tmpdir(), 'display-index-')), 'index');
  const env = { ...process.env, GIT_INDEX_FILE: index };
  try {
    git(['read-tree', tip], { env });
    for (const f of DISPLAY_FILES) {
      const blob = git(['hash-object', '-w', '--stdin'], { input: serialize(merged[f]) });
      git(['update-index', '--cacheinfo', `100644,${blob},data/${f}.json`], { env });
    }
    const tree = git(['write-tree'], { env });
    const message = `${name ?? entityId} の画面の文を自動で作る（display:build）\n\n事実・出典は変えず、一覧・概要・分析欄・成功の秘訣・章のうち足りない層だけを足した。検査 case-text:verify と別のAIの確認を通過。\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n`;
    const commit = git(['commit-tree', tree, '-p', tip], { input: message });
    git(['update-ref', `refs/heads/${BRANCH}`, commit, exists.status === 0 ? tip : '']);
    return commit;
  } finally { rmSync(join(index, '..'), { recursive: true, force: true }); }
}

// ---------- 1件を作る ----------
interface Outcome { ok: boolean; attempts: number; reasons: string[]; calls: CallResult[]; display?: EntityDisplay; minor?: unknown[]; dropped?: string[] }
function buildOne(agent: Agent, reviewer: Agent | null, entityId: string, reader: LiveReader, need: DisplayNeed, files: DisplayFiles, name: string | undefined): Outcome {
  const material = buildMaterial(entityId, reader, need, { name, contract, files, exampleIds: EXAMPLE_IDS });
  const nums = materialNumbers(reader);
  const schema = outputSchema();
  const calls: CallResult[] = [];
  const baselineRun = runCheck(files);
  const baseline = baselineRun.problems;
  if (baseline.some((p) => p.startsWith(UNPARSED))) return { ok: false, attempts: 0, reasons: baseline, calls };
  let previous: unknown; let problems: string[] = [];
  mkdirSync(WORK, { recursive: true });
  writeFileSync(join(WORK, `${entityId}.material.json`), JSON.stringify(material, null, 1));
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const user = JSON.stringify(problems.length ? { material, previous, problems } : { material });
    let call: CallResult;
    try { call = callAgent(agent, SYSTEM, user, schema, argValue('--model'), `${entityId} ${attempt}回目`); }
    catch (e) { return { ok: false, attempts: attempt, reasons: [`AIの呼び出しに失敗: ${(e as Error).message}`], calls }; }
    calls.push(call);
    writeFileSync(join(WORK, `${entityId}.attempt${attempt}.json`), JSON.stringify(call.value, null, 1));
    if (!isAiOutput(call.value)) { previous = call.value; problems = ['出力の形が指定と違う（list・summary・detail・success・chapters を全部返す）']; continue; }
    previous = call.value;
    const { display, problems: assembly } = assembleDisplay(entityId, reader, need, call.value, liveSuccessPoints(entityId, reader, files));
    const check = runCheck(mergeEntity(files, entityId, display));
    problems = [...assembly, ...structuralProblems(display), ...numberProblems(display, nums), ...newProblems(baseline, check.problems)];
    say(`${entityId}: ${attempt}回目 — 機械の検査の指摘 ${problems.length}件（${call.seconds.toFixed(0)}秒）`);
    if (problems.length) { writeFileSync(join(WORK, `${entityId}.attempt${attempt}.problems.txt`), problems.join('\n')); continue; }
    if (!REVIEW) return { ok: true, attempts: attempt, reasons: [], calls, display };
    let review: CallResult;
    try { review = callAgent(reviewer ?? agent, REVIEW_SYSTEM, JSON.stringify({ material, candidate: reviewRows(display) }), REVIEW_SCHEMA, argValue('--review-model'), `${entityId} 確認 ${attempt}回目`); }
    catch (e) { return { ok: false, attempts: attempt, reasons: [`確認役の呼び出しに失敗: ${(e as Error).message}`], calls }; }
    calls.push(review);
    const issues = ((review.value as { issues?: Array<{ severity: string; id: string; problem: string; fix: string }> }).issues ?? []);
    writeFileSync(join(WORK, `${entityId}.review${attempt}.json`), JSON.stringify(issues, null, 1));
    const must = issues.filter((i) => i.severity === 'must');
    say(`${entityId}: ${attempt}回目 — 確認役の指摘 必須${must.length}件・軽微${issues.length - must.length}件（${review.seconds.toFixed(0)}秒）`);
    if (!must.length) return { ok: true, attempts: attempt, reasons: [], calls, display, minor: issues };
    problems = must.map((i) => `確認役: ${i.id}: ${i.problem}（直し案: ${i.fix}）`);
    if (attempt < ATTEMPTS) continue;
    // 最後の回: 指摘された行が章の行・成功の秘訣だけなら、その行を外して出す（残りの行は同じ確認で指摘が無かった）
    const cut = dropFlagged(display, must.map((i) => i.id));
    if (cut.blocked.length) return { ok: false, attempts: attempt, reasons: problems, calls };
    const recheck = runCheck(mergeEntity(files, entityId, cut.display));
    const left = [...structuralProblems(cut.display), ...newProblems(baseline, recheck.problems)];
    if (left.length) return { ok: false, attempts: attempt, reasons: [...problems, ...left], calls };
    say(`${entityId}: 確認役が指摘した ${cut.dropped.join('、')} を外して出す`);
    return { ok: true, attempts: attempt, reasons: [], calls, display: cut.display, minor: issues, dropped: cut.dropped };
  }
  return { ok: false, attempts: ATTEMPTS, reasons: problems, calls };
}

// ---------- 本体 ----------
function main() {
  let files = loadFiles(DATA_DIR);
  const ids = ONLY ? [ONLY] : finished;
  if (ONLY && !finished.includes(ONLY)) { say(`${ONLY} は仕上げ済み（data/catalog-finished-ids.txt）に無い。作らない`); return 0; }
  const readers = liveReaders(ids);
  const gaps = displayGaps(ids, files, readers);
  if (has('--list')) { for (const g of gaps) say(`${g.entityId}: ${JSON.stringify(g.need)}`); say(`対象 ${gaps.length} 件`); return 0; }
  if (!gaps.length) { say('画面の層が足りない仕上げ済み事例は無い'); return 0; }
  const names = entityNames(gaps.map((g) => g.entityId));
  if (has('--materials-only')) {
    for (const g of gaps.slice(0, MAX)) console.log(JSON.stringify(buildMaterial(g.entityId, readers.get(g.entityId)!, g.need, { name: names.get(g.entityId), contract, files, exampleIds: EXAMPLE_IDS }), null, 1));
    return 0;
  }
  const agent = pickAgent();
  const reviewer = REVIEW ? pickReviewer(agent) : null;
  if (REVIEW && !reviewer) { say('作った者と別のAIの確認役を用意できない（--review-agent / --review-model を指定するか、もう一方のAIにログインする）。独立した確認なしでは作らない'); return 1; }
  say(`対象 ${gaps.length} 件のうち ${Math.min(MAX, gaps.length)} 件を作る（AI: ${agent}、書き先: ${DRY ? 'なし（--dry-run）' : DATA_DIR}、作業記録: ${WORK}）`);
  let failed = 0;
  for (const { entityId, need } of gaps.slice(0, MAX)) {
    const out = buildOne(agent, reviewer, entityId, readers.get(entityId)!, need, files, names.get(entityId));
    const cost = out.calls.reduce((s, c) => s + (c.costUsd ?? 0), 0);
    const tokens = out.calls.reduce((s, c) => ({ input: s.input + (c.tokens?.input ?? 0), output: s.output + (c.tokens?.output ?? 0) }), { input: 0, output: 0 });
    const usage = `呼び出し ${out.calls.length} 回、入力 ${tokens.input} / 出力 ${tokens.output} トークン${cost ? `、約 ${cost.toFixed(3)} ドル` : ''}`;
    if (!out.ok || !out.display) {
      failed += 1;
      mkdirSync(join(ROOT, 'data/pipeline'), { recursive: true });
      appendFileSync(FAILURES, `${JSON.stringify({ at: new Date().toISOString(), runId: RUN_ID, entityId, need, attempts: out.attempts, agent, reasons: out.reasons })}\n`);
      say(`${entityId}: 通らなかった（${out.attempts}回）。何も書かない。理由は ${FAILURES}。${usage}`);
      continue;
    }
    files = mergeEntity(files, entityId, out.display);
    if (!DRY) for (const f of DISPLAY_FILES) writeFileSync(join(DATA_DIR, `${f}.json`), serialize(files[f]));
    say(`${entityId}: ${out.attempts}回目で通った。${DRY ? '書かない（--dry-run）' : `反映した（${DATA_DIR}）`}。${usage}`);
    if (COMMIT) say(`${entityId}: ${BRANCH} にコミット ${commitToBranch(entityId, names.get(entityId), out.display).slice(0, 8)}（push はしない）`);
  }
  return failed ? 1 : 0;
}

process.exit(main());
