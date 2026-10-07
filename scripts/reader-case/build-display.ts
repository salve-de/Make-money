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
 *   pnpm display:build --no-repair             今の文の言い回しの直し（下の流れの0）をしない
 *   pnpm display:build --repair-only           言い回しの直しだけをして、足りない層は作らない
 *   pnpm display:build --reader                直しの前に、作る者と別のAIを「何も知らない読者」にして全行を読ませ、意味が取れない語句を直しの対象に足す
 *                                              （指摘が出た行だけ3回判定して2回以上で採用。呼び出し回数・秒・費用は data/pipeline/reader-pass.jsonl）
 *   pnpm display:build --reader-only           読者役だけを流して記録し、直さない（精度と時間を測る用。--id と並べて並列に流せる）
 *   pnpm display:build --repair-only --reader --reader-run <runId>  読者役を呼ばず、display:build:parallel が先に記録した <runId> の結果を使って直す
 *                 --reader-votes 1|3（既定3）  --codex-effort low|medium|high（Codex の考える深さ。既定は Codex の既定）
 * 環境変数・引数: --agent auto|claude|codex（既定 auto: claude がログイン済みなら claude、無ければ codex）
 *                 --model / --review-model（AIの型。既定は各コマンドの既定）  --no-review（別のAIの確認を省く。既定は確認する）
 *                 --attempts N（既定3: 検査に落ちた時、理由を返して直させる回数の上限）
 *
 * 流れ0（言い回しの直し）: 今の画面の文のうち、日本語の自然さ・読む人に要らない情報の関門（scripts/architecture/natural-japanese.mjs）に
 * 落ちた行だけを AI に直させ、同じ行の位置に差し替える（紐付け・出典・他の行は変えない）。機械の検査と別のAIの確認を通った時だけ反映。
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
  DISPLAY_FILES, applyRepairs, blameRows, extractNumbers, lostNumbers, repairRows, repairSchema, unsupportedNumbers, assembleDisplay, buildMaterial, liveSuccessPoints, dropFlagged, reviewRows, displayGaps, materialNumbers, mergeEntity, newProblems, numberProblems, outputSchema, parseCheckOutput, serialize, structuralProblems,
  type AiOutput, type DisplayFiles, type RepairRow, type DisplayNeed, type EntityDisplay, type ItemContract, type LiveReader,
} from '../../src/shared/display-build';
import { loadReaders, argValue } from './load-readers';
import { preparePublicationReader } from './publication-evaluation';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';
import { crossLayerDuplicates } from './cross-layer-dups';
import { type AnalysisFile } from './analysis-lib';
import { readReflectState, withReflectedAnalysis } from './case-reflect';
import { describeHit, findNoise, findUnnatural, loadNaturalRules } from '../architecture/natural-japanese.mjs';
import { describeUnclear, findUnclear, loadClarityRules } from '../architecture/reader-clarity.mjs';

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
// 確認役が「不自然」「要らない」と指摘した語。機械の辞書（data/natural-japanese.json）に足す候補（pnpm natural-ja:report --candidates で数える）
const NATURAL_CANDIDATES = join(ROOT, 'data/pipeline/natural-japanese-candidates.jsonl');
const RUN_ID = argValue('--run-id') ?? new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
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
// 日本語の自然さと「読む人が知りたい事だけ」の関門。今の文が落ちる層は、事実が変わっていなくても作り直す対象にする
const naturalRules = loadNaturalRules(join(ROOT, 'data/natural-japanese.json'));
const clarityRules = loadClarityRules(join(ROOT, 'data/reader-clarity.json'));
const unnatural = (text: string, ctx: { price: boolean } = { price: false }) => [...findUnnatural(text, naturalRules).map(describeHit), ...findNoise(text, ctx), ...findUnclear(text, clarityRules).map(describeUnclear)];
// 自然で意味が取れる日本語の規則の正本（生成・直し・確認・読者役が同じ1枚を読む）
const CLARITY_SKILL = readFileSync(join(ROOT, '.claude/skills/natural-japanese/SKILL.md'), 'utf8').replace(/^---[\s\S]*?---\n/, '');
const naturalList = read<Array<{ pattern: string; suggest: string[]; bad?: string; good?: string }>>(join(ROOT, 'data/natural-japanese.json'));

// ---------- 検査（一時コピーの data/ で、検査スクリプトを変えずに走らせる） ----------
const UNPARSED = '検査が読み取れない形で落ちた: ';
function runCheck(files: DisplayFiles): { ok: boolean; problems: string[] } {
  const dir = mkdtempSync(join(tmpdir(), 'display-check-'));
  try {
    mkdirSync(join(dir, 'data'));
    for (const f of DISPLAY_FILES) writeFileSync(join(dir, 'data', `${f}.json`), serialize(files[f]));
    for (const f of ['item-contract.json', 'reader-language.json', 'natural-japanese.json', 'reader-clarity.json']) copyFileSync(join(ROOT, 'data', f), join(dir, 'data', f));
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
    const effort = argValue('--codex-effort');
    const args = ['exec', '--skip-git-repo-check', '--ephemeral', '-s', 'read-only', '--output-schema', schemaFile, '-o', outFile, '--json', '-C', empty, ...(model ? ['-m', model] : []), ...(effort ? ['-c', `model_reasoning_effort=${effort}`] : []), '-'];
    const r = spawnSync('codex', args, { cwd: empty, input: `${system}\n\n## 材料と依頼（JSON）\n${user}\n\nツールやコマンドは使わず、指定の形の JSON だけを返す。`, encoding: 'utf8', timeout: 15 * 60_000, maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0 || !existsSync(outFile)) throw new Error(`codex が失敗（${label}）: ${(r.stderr || r.stdout).slice(-300)}`);
    const tokens = { input: 0, output: 0 };
    for (const line of r.stdout.split('\n')) {
      try { const e = JSON.parse(line) as { type?: string; usage?: { input_tokens?: number; output_tokens?: number } }; if (e.type === 'turn.completed') { tokens.input += e.usage?.input_tokens ?? 0; tokens.output += e.usage?.output_tokens ?? 0; } } catch { /* 事件の行でない */ }
    }
    return { value: JSON.parse(readFileSync(outFile, 'utf8')), tokens, seconds: (Date.now() - started) / 1000 };
  } finally { rmSync(empty, { recursive: true, force: true }); }
}

const SYSTEM = `${readFileSync(join(ROOT, 'scripts/reader-case/display-prompt.md'), 'utf8')}\n## 使わない語（左の形に当たる語は、右の言い方に直す）\n${language.map((r) => `- /${r.pattern}/ → ${r.suggest}`).join('\n')}\n\n## 使わない言い回し（話し言葉・業界のくだけた言い方。左の形に当たる言い回しは、右のどれかに直す）\n${naturalList.map((r) => `- /${r.pattern}/ → ${r.suggest.join('／')}${r.bad && r.good ? `（例: 「${r.bad}」→「${r.good}」）` : ''}`).join('\n')}\n\n${CLARITY_SKILL}`;
const REVIEW_SYSTEM = `${readFileSync(join(ROOT, 'scripts/reader-case/display-review-prompt.md'), 'utf8')}\n\n${CLARITY_SKILL}`;
const REVIEW_SCHEMA = { type: 'object', properties: { issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['must', 'minor'] }, kind: { type: 'string', enum: ['fact', 'natural', 'noise', 'other'] }, id: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' }, phrase: { type: 'string' } }, required: ['severity', 'kind', 'id', 'problem', 'fix', 'phrase'], additionalProperties: false } } }, required: ['issues'], additionalProperties: false };

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

/** 今の画面の文のうち、その事例の分（直した行を専用ブランチへ載せる時に使う） */
function entityDisplayOf(files: DisplayFiles, entityId: string): EntityDisplay {
  const one = <T extends { entityId: string }>(list: T[]) => list.find((x) => x.entityId === entityId);
  return {
    list: one(files['list-lines']), summary: one(files['summary-lines']),
    detail: files['detail-lines'].filter((l) => l.entityId === entityId),
    success: one(files['success-points']), chapters: one(files['case-chapters']),
  };
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
  const baselineDups = crossLayerDuplicates(entityId, files);
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
    const merged = mergeEntity(files, entityId, display);
    const check = runCheck(merged);
    problems = [...assembly, ...structuralProblems(display), ...numberProblems(display, nums), ...newProblems(baseline, check.problems), ...newProblems(baselineDups, crossLayerDuplicates(entityId, merged))];
    say(`${entityId}: ${attempt}回目 — 機械の検査の指摘 ${problems.length}件（${call.seconds.toFixed(0)}秒）`);
    if (problems.length) { writeFileSync(join(WORK, `${entityId}.attempt${attempt}.problems.txt`), problems.join('\n')); continue; }
    if (!REVIEW) return { ok: true, attempts: attempt, reasons: [], calls, display };
    let review: CallResult;
    try { review = callAgent(reviewer ?? agent, REVIEW_SYSTEM, JSON.stringify({ material, candidate: reviewRows(display) }), REVIEW_SCHEMA, argValue('--review-model'), `${entityId} 確認 ${attempt}回目`); }
    catch (e) { return { ok: false, attempts: attempt, reasons: [`確認役の呼び出しに失敗: ${(e as Error).message}`], calls }; }
    calls.push(review);
    const issues = ((review.value as { issues?: Array<{ severity: string; kind?: string; id: string; problem: string; fix: string; phrase?: string }> }).issues ?? []);
    recordCandidates(entityId, issues);
    const must = issues.filter((i) => i.severity === 'must');
    say(`${entityId}: ${attempt}回目 — 確認役の指摘 必須${must.length}件・軽微${issues.length - must.length}件（${review.seconds.toFixed(0)}秒）`);
    if (!must.length) return { ok: true, attempts: attempt, reasons: [], calls, display, minor: issues };
    problems = must.map((i) => `確認役: ${i.id}: ${i.problem}（直し案: ${i.fix}）`);
    if (attempt < ATTEMPTS) continue;
    // 最後の回: 指摘された行が章の行・成功の秘訣だけなら、その行を外して出す（残りの行は同じ確認で指摘が無かった）
    const cut = dropFlagged(display, must.map((i) => i.id));
    if (cut.blocked.length) return { ok: false, attempts: attempt, reasons: problems, calls };
    const recheck = runCheck(mergeEntity(files, entityId, cut.display));
    const left = [...structuralProblems(cut.display), ...newProblems(baseline, recheck.problems), ...newProblems(baselineDups, crossLayerDuplicates(entityId, mergeEntity(files, entityId, cut.display)))];
    if (left.length) return { ok: false, attempts: attempt, reasons: [...problems, ...left], calls };
    say(`${entityId}: 確認役が指摘した ${cut.dropped.join('、')} を外して出す`);
    return { ok: true, attempts: attempt, reasons: [], calls, display: cut.display, minor: issues, dropped: cut.dropped };
  }
  return { ok: false, attempts: ATTEMPTS, reasons: problems, calls };
}

/** 機械の辞書が見逃した不自然な語・要らない語を、辞書を育てる候補として残す（辞書へは確かめてから足す。pnpm natural-ja:report --candidates） */
function recordCandidates(entityId: string, issues: Array<{ kind?: string; id: string; problem: string; fix: string; phrase?: string }>) {
  const candidates = issues.filter((i) => (i.kind === 'natural' || i.kind === 'noise') && i.phrase?.trim());
  if (!candidates.length || DRY) return;
  mkdirSync(dirname(NATURAL_CANDIDATES), { recursive: true });
  for (const i of candidates) appendFileSync(NATURAL_CANDIDATES, `${JSON.stringify({ at: new Date().toISOString(), entityId, kind: i.kind, phrase: i.phrase!.trim(), row: i.id, problem: i.problem, fix: i.fix })}\n`);
}

// ---------- 言い回しだけを直す（1件） ----------
const REPAIR_SYSTEM = `${readFileSync(join(ROOT, 'scripts/reader-case/display-repair-prompt.md'), 'utf8')}\n## 使わない言い回し（左の形に当たる言い回しは、右のどれかに直す）\n${naturalList.map((r) => `- /${r.pattern}/ → ${r.suggest.join('／')}`).join('\n')}\n\n${CLARITY_SKILL}`;

// ---------- 読者役（--reader）: 作る者と別のAIが「何も知らない読者」として全行を読み、意味が取れない語句をそのまま引用する ----------
// 誤りの箇所を引用させる形（点数を聞かない）。指摘が出た行だけを、さらに2回読ませて3回中2回以上で採用する（判定のぶれを抑える）。
// 採用した行は言い回しの直し（repairOne）に回り、作る側のAIが直し、確認役が「元と同じ事実か・意味が取れるか」を見てから反映する。
const READER_ONLY = has('--reader-only');
const READER = has('--reader') || READER_ONLY;
const READER_VOTES = Number(argValue('--reader-votes') ?? 3);
const READER_LOG = join(ROOT, 'data/pipeline/reader-pass.jsonl');
const READER_RUN = argValue('--reader-run');
/** 記録から、その実行・その事例の最後のまとめの行を返す */
function readerRecord(runId: string, entityId: string): { votes: number; issues: ReaderIssue[] } | undefined {
  if (!existsSync(READER_LOG)) return undefined;
  const rows = readFileSync(READER_LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { runId: string; entityId: string; summary?: boolean; votes?: number; issues: ReaderIssue[] });
  const hit = rows.filter((r) => r.summary && r.runId === runId && r.entityId === entityId).at(-1);
  return hit ? { votes: hit.votes ?? 1, issues: hit.issues } : undefined;
}
const READER_SYSTEM = `${readFileSync(join(ROOT, 'scripts/reader-case/display-reader-prompt.md'), 'utf8')}\n\n${CLARITY_SKILL}`;
const READER_SCHEMA = { type: 'object', properties: { issues: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, quote: { type: 'string' }, reason: { type: 'string' }, fix: { type: 'string' } }, required: ['id', 'quote', 'reason', 'fix'], additionalProperties: false } } }, required: ['issues'], additionalProperties: false };
type ReaderIssue = { id: string; quote: string; reason: string; fix: string };
function withReaderFlags(repairs: Array<{ id: string; rows: RepairRow[] }>, files: DisplayFiles, readers: Map<string, LiveReader>): Array<{ id: string; rows: RepairRow[] }> {
  const agent = pickAgent();
  const readerAgent = pickReviewer(agent);
  if (!readerAgent) throw new Error('読者役に、作る者と別のAIを用意できない（--review-agent / --review-model を指定する）。--reader を付けたので止める');
  const model = argValue('--review-model');
  return repairs.map(({ id, rows }) => {
    if (!readers.has(id)) return { id, rows };
    const all = repairRows(id, files, () => ['_']).map((r) => ({ id: r.id, text: r.text }));
    const textOf = new Map(all.map((r) => [r.id, r.text]));
    const calls: CallResult[] = [];
    const read = (subset: typeof all, round: number): ReaderIssue[] => {
      const call = callAgent(readerAgent, READER_SYSTEM, JSON.stringify({ rows: subset }), READER_SCHEMA, model, `${id} 読者役 ${round}回目`);
      calls.push(call);
      mkdirSync(dirname(READER_LOG), { recursive: true });
      appendFileSync(READER_LOG, `${JSON.stringify({ at: new Date().toISOString(), runId: RUN_ID, entityId: id, call: round, agent: readerAgent, seconds: Math.round(call.seconds), costUsd: call.costUsd, tokens: call.tokens, rows: subset.length, issues: (call.value as { issues?: unknown[] }).issues ?? [] })}\n`);
      // 引用が行の文に一字一句ある指摘だけを数える（作り話の指摘を外す）
      return ((call.value as { issues?: ReaderIssue[] }).issues ?? []).filter((i) => textOf.get(i.id)?.includes(i.quote.trim()) && i.quote.trim());
    };
    const cached = READER_RUN ? readerRecord(READER_RUN, id) : undefined;
    if (READER_RUN && !cached) throw new Error(`${id}: 読者役の記録（--reader-run ${READER_RUN}）が data/pipeline/reader-pass.jsonl に無い`);
    if (cached) {
      // 先に並列で流した読者役の結果を使う。引用が今の文にまだある指摘だけを残す
      const issues = cached.issues.filter((i) => textOf.get(i.id)?.includes(i.quote.trim()) && i.quote.trim());
      const next = rows.map((r) => ({ ...r, problems: [...r.problems] }));
      for (const i of issues) {
        const note = `読者役（${cached.votes >= 3 ? '3回中2回以上' : '1回'}）: 「${i.quote}」${i.reason}（直し案: ${i.fix}）`;
        const row = next.find((r) => r.id === i.id);
        if (row) row.problems.push(note); else next.push({ id: i.id, text: textOf.get(i.id)!, problems: [note] });
      }
      say(`${id}: 読者役の記録 ${READER_RUN} から ${new Set(issues.map((i) => i.id)).size}行を直しの対象に足した`);
      return { id, rows: next };
    }
    let first: ReaderIssue[];
    try { first = read(all, 1); } catch (e) { say(`${id}: 読者役の呼び出しに失敗（${(e as Error).message}）。読者役は飛ばす`); return { id, rows }; }
    const flagged = [...new Set(first.map((i) => i.id))];
    const votes = new Map(flagged.map((rowId) => [rowId, 1]));
    for (const round of READER_VOTES >= 3 ? [2, 3] : []) {
      if (!flagged.length) break;
      try { for (const rowId of new Set(read(all.filter((r) => flagged.includes(r.id)), round).map((i) => i.id))) votes.set(rowId, (votes.get(rowId) ?? 0) + 1); }
      catch (e) { say(`${id}: 読者役 ${round}回目に失敗（${(e as Error).message}）`); }
    }
    const adopted = flagged.filter((rowId) => (votes.get(rowId) ?? 0) >= (READER_VOTES >= 3 ? 2 : 1));
    const next = rows.map((r) => ({ ...r, problems: [...r.problems] }));
    for (const rowId of adopted) {
      const notes = first.filter((i) => i.id === rowId).map((i) => `読者役（3回中${votes.get(rowId)}回）: 「${i.quote}」${i.reason}（直し案: ${i.fix}）`);
      const row = next.find((r) => r.id === rowId);
      if (row) row.problems.push(...notes); else next.push({ id: rowId, text: textOf.get(rowId)!, problems: notes });
    }
    const seconds = calls.reduce((a, c) => a + c.seconds, 0);
    const costUsd = calls.reduce((a, c) => a + (c.costUsd ?? 0), 0);
    mkdirSync(dirname(READER_LOG), { recursive: true });
    appendFileSync(READER_LOG, `${JSON.stringify({ at: new Date().toISOString(), runId: RUN_ID, entityId: id, summary: true, votes: READER_VOTES, agent: readerAgent, calls: calls.length, seconds: Math.round(seconds), costUsd, rows: all.length, flagged: flagged.length, adopted: adopted.length, issues: first.filter((i) => adopted.includes(i.id)) })}\n`);
    say(`${id}: 読者役 ${all.length}行を読み、指摘${flagged.length}行・${READER_VOTES >= 3 ? '3回中2回以上' : '1回'}で採用${adopted.length}行（呼び出し${calls.length}回・${seconds.toFixed(0)}秒）`);
    return { id, rows: next };
  });
}

function repairOne(agent: Agent, reviewer: Agent | null, entityId: string, reader: LiveReader, rows: RepairRow[], files: DisplayFiles): { ok: boolean; attempts: number; reasons: string[]; files?: DisplayFiles; adopted?: string[]; held?: string[] } {
  const none = { list: false, summary: false, success: false, chapters: false, detail: [] };
  const material = buildMaterial(entityId, reader, none, { contract, files, exampleIds: [] });
  const nums = materialNumbers(reader);
  const baseline = runCheck(files).problems;
  const ids = new Set(rows.map((r) => r.id));
  let previous: unknown; let problems: string[] = [];
  // 確認役まで進んだ回のうち、確認役の必須の指摘が無かった行（行ごとに採用するため）
  // reasons は、その回の確認役の必須の指摘（保留した行の理由として記録する。最後の回の指摘とは限らない）
  let reviewed: { attempt: number; fixes: Array<{ id: string; text: string }>; must: Set<string>; reasons: string[] } | undefined;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const user = JSON.stringify({ material, rows, ...(problems.length ? { previous, problems } : {}) });
    let call: CallResult;
    try { call = callAgent(agent, REPAIR_SYSTEM, user, repairSchema(), argValue('--model'), `${entityId} 直し ${attempt}回目`); }
    catch (e) { return { ok: false, attempts: attempt, reasons: [`AIの呼び出しに失敗: ${(e as Error).message}`] }; }
    previous = call.value;
    let fixes = ((call.value as { rows?: Array<{ id: string; text: string }> }).rows ?? []).filter((f) => ids.has(f.id));
    let applied = applyRepairs(files, entityId, fixes);
    const left = repairRows(entityId, applied.files, unnatural).filter((r) => ids.has(r.id)).map((r) => `${r.id}: まだ関門に落ちる「${r.text.slice(0, 30)}」: ${r.problems.join(' / ')}`);
    const missing = [...ids].filter((id) => !fixes.some((f) => f.id === id)).map((id) => `${id}: 直した文が返っていない`);
    // 元の行にあった数字（年月日・点数など）は、言い回しの直しで残ってよい
    const numbers = fixes.flatMap((f) => unsupportedNumbers(f.text, [...nums, ...extractNumbers(rows.find((r) => r.id === f.id)?.text ?? '')]).map((n) => `${f.id}: 材料に無い数字 ${n}`));
    // 元の行の数字は、言い回しの直しで落とさない（同じ事例の他の行に残る数字は、重複を外しただけなので許す）
    const shown = repairRows(entityId, applied.files, () => ['行']);
    const lost = fixes.flatMap((f) => {
      const gone = lostNumbers(rows.find((r) => r.id === f.id)?.text ?? '', f.text, shown.filter((r) => r.id !== f.id).map((r) => r.text).join('\n'));
      return gone.length ? [`${f.id}: 元の文の数字 ${gone.join('、')} が消えた。言い回しだけを直し、数字は残す`] : [];
    });
    // 出どころの印（本人・公式・第三者など）は、言い回しの直しで変えない（行の出典URLはそのままなので、印だけ変わると食い違う）
    const marks = (text: string) => [...new Set(text.match(/本人申告|本人|公式|第三者|報道|推測|推論|保存ページ/g) ?? [])].sort().join('・');
    const markProblems = fixes.filter((f) => marks(f.text) !== marks(rows.find((r) => r.id === f.id)?.text ?? '')).map((f) => `${f.id}: 出どころの印が変わった（元: ${marks(rows.find((r) => r.id === f.id)?.text ?? '') || 'なし'} → 今: ${marks(f.text) || 'なし'}）。印は元のまま残す`);
    const check = runCheck(applied.files);
    problems = [...applied.problems, ...missing, ...left, ...numbers, ...lost, ...markProblems, ...newProblems(baseline, check.problems)];
    say(`${entityId}: 直し ${attempt}回目 — 機械の検査の指摘 ${problems.length}件`);
    const machine = problems;
    if (machine.length) {
      // 落ちた行だけを元の文に戻し、残りの行で検査をやり直す。通れば残りの行は確認役へ進める（1行の字数超えで全行を捨てない）
      const bad = blameRows(machine, fixes.map((f) => f.id), applied.files, entityId);
      const keep = bad ? fixes.filter((f) => !bad.has(f.id)) : [];
      if (!keep.length) continue;
      const narrowed = applyRepairs(files, entityId, keep);
      const still = [...narrowed.problems, ...newProblems(baseline, runCheck(narrowed.files).problems)];
      say(`${entityId}: 直し ${attempt}回目 — 機械の検査に落ちた ${fixes.length - keep.length}行を元の文に戻すと、残り ${keep.length}行の指摘 ${still.length}件`);
      if (still.length) continue;
      fixes = keep; applied = narrowed;
    }
    const heldIds = [...ids].filter((id) => !fixes.some((f) => f.id === id));
    if (!REVIEW) return { ok: true, attempts: attempt, reasons: machine, files: applied.files, adopted: fixes.map((f) => f.id), held: heldIds };
    let review: CallResult;
    try { review = callAgent(reviewer ?? agent, REVIEW_SYSTEM, JSON.stringify({ material, candidate: fixes.map((f) => ({ id: f.id, text: f.text, before: rows.find((r) => r.id === f.id)?.text })) }), REVIEW_SCHEMA, argValue('--review-model'), `${entityId} 直しの確認 ${attempt}回目`); }
    catch (e) { return { ok: false, attempts: attempt, reasons: [`確認役の呼び出しに失敗: ${(e as Error).message}`] }; }
    const issues = ((review.value as { issues?: Array<{ severity: string; kind?: string; id: string; problem: string; fix: string; phrase?: string }> }).issues ?? []);
    recordCandidates(entityId, issues);
    const must = issues.filter((i) => i.severity === 'must');
    say(`${entityId}: 直し ${attempt}回目 — 確認役の指摘 必須${must.length}件・軽微${issues.length - must.length}件`);
    if (!must.length) return { ok: true, attempts: attempt, reasons: machine, files: applied.files, adopted: fixes.map((f) => f.id), held: heldIds };
    const mustIds = new Set(must.map((i) => i.id));
    problems = [...must.map((i) => `確認役: ${i.id}: ${i.problem}（直し案: ${i.fix}）`), ...machine];
    if (!reviewed || fixes.filter((f) => !mustIds.has(f.id)).length >= reviewed.fixes.filter((f) => !reviewed!.must.has(f.id)).length) reviewed = { attempt, fixes, must: mustIds, reasons: problems };
  }
  // 全行は通らなかった。確認役が必須の指摘を付けなかった行だけを反映し、残りは元の文のまま保留する（1行の指摘で事例ごと止めない）
  if (reviewed) {
    const ok = reviewed.fixes.filter((f) => !reviewed!.must.has(f.id) && f.text !== rows.find((r) => r.id === f.id)?.text);
    if (ok.length) {
      const applied = applyRepairs(files, entityId, ok);
      const after = runCheck(applied.files);
      const fresh = [...applied.problems, ...newProblems(baseline, after.problems)];
      if (!fresh.length) return { ok: true, attempts: reviewed.attempt, reasons: reviewed.reasons, files: applied.files, adopted: ok.map((f) => f.id), held: [...ids].filter((id) => !ok.some((f) => f.id === id)) };
      problems = [...reviewed.reasons, ...fresh.map((p) => `行ごとの反映で機械の検査に落ちた: ${p}`)];
    }
  }
  return { ok: false, attempts: ATTEMPTS, reasons: problems };
}

// ---------- 本体 ----------
function main() {
  let files = loadFiles(DATA_DIR);
  let repairFailed = 0;
  const ids = ONLY ? [ONLY] : finished;
  if (ONLY && !finished.includes(ONLY)) { say(`${ONLY} は仕上げ済み（data/catalog-finished-ids.txt）に無い。作らない`); return 0; }
  const readers = liveReaders(ids);
  // 1. 今の文の言い回しの直し（関門に落ちた行だけ。行の位置・紐付けは保つ）
  if (!has('--list') && !has('--materials-only') && !has('--no-repair')) {
    let repairs = ids.map((id) => ({ id, rows: repairRows(id, files, unnatural) }));
    if (READER) {
      // 外部のAIに送る前に、公開中の事例を --max 件までに絞る
      repairs = withReaderFlags(repairs.filter((r) => readers.has(r.id)).slice(0, MAX), files, readers);
      if (READER_ONLY) return 0;
    }
    repairs = repairs.filter((r) => r.rows.length && readers.has(r.id)).slice(0, MAX);
    if (repairs.length) {
      const agent = pickAgent();
      const repairReviewer = REVIEW ? pickReviewer(agent) : null;
      if (REVIEW && !repairReviewer) { say('作った者と別のAIの確認役を用意できない（--review-agent / --review-model を指定するか、もう一方のAIにログインする）。独立した確認なしでは直さない'); return 1; }
      say(`言い回しの直し: ${repairs.length} 件（AI: ${agent}）`);
      for (const { id, rows } of repairs) {
        const out = repairOne(agent, repairReviewer, id, readers.get(id)!, rows, files);
        if (!out.ok || !out.files) {
          mkdirSync(join(ROOT, 'data/pipeline'), { recursive: true });
          appendFileSync(FAILURES, `${JSON.stringify({ at: new Date().toISOString(), runId: RUN_ID, entityId: id, repair: rows.map((r) => r.id), attempts: out.attempts, agent, reasons: out.reasons })}\n`);
          say(`${id}: 言い回しの直しが通らなかった（${out.attempts}回）。何も書かない。理由は ${FAILURES}`);
          repairFailed += 1;
          continue;
        }
        files = out.files;
        if (!DRY) for (const f of DISPLAY_FILES) writeFileSync(join(DATA_DIR, `${f}.json`), serialize(files[f]));
        if (out.held?.length) {
          mkdirSync(join(ROOT, 'data/pipeline'), { recursive: true });
          appendFileSync(FAILURES, `${JSON.stringify({ at: new Date().toISOString(), runId: RUN_ID, entityId: id, repair: out.held, adopted: out.adopted, attempts: out.attempts, agent, partial: true, reasons: out.reasons })}\n`);
        }
        say(`${id}: 言い回しを ${out.adopted?.length ?? rows.length} 行直した（${out.attempts}回目）${out.held?.length ? `。確認役が通さなかった ${out.held.length} 行は元のまま保留（${FAILURES}）` : ''}。${DRY ? '書かない（--dry-run）' : '反映した'}`);
        if (COMMIT) say(`${id}: ${BRANCH} にコミット ${commitToBranch(id, undefined, entityDisplayOf(files, id)).slice(0, 8)}（push はしない）`);
      }
    }
  }
  if (has('--repair-only')) return repairFailed ? 1 : 0;
  // 2. 足りない層を作る
  const gaps = displayGaps(ids, files, readers);
  if (has('--list')) {
    for (const id of ids) { const rows = readers.has(id) ? repairRows(id, files, unnatural) : []; if (rows.length) say(`${id}: 言い回しの直し ${rows.map((r) => r.id).join(', ')}`); }
    for (const g of gaps) say(`${g.entityId}: ${JSON.stringify(g.need)}`); say(`対象 ${gaps.length} 件`); return 0;
  }
  if (!gaps.length) { say('画面の層が足りない仕上げ済み事例は無い'); return repairFailed ? 1 : 0; }
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
  return failed || repairFailed ? 1 : 0;
}

process.exit(main());
