/**
 * 指定した事例を、出典の取得から公開データの作成まで、1本のコマンドで最後まで流す。人が付き添わない。
 *
 *   pnpm case:run --ids a,b,c            （公開はしない。公開データの作成まで）
 *   pnpm case:run --ids-file <file>      （事例IDを1行に1つ書いたファイル）
 *   pnpm case:run --ids a --publish      （最後に今の catalog:publish を呼ぶ。R2 への書き込みと本番反映は catalog:publish の中身に従う）
 *   オプション: --from <段>（その段から始める。段の名前は下）  --concurrency N（同時に流す束・事例の数。既定4）  --agent claude|codex|auto  --model <型>  --codex-effort low|medium|high
 *              --run-id <名前>  --max-attempts N（束ごとの拒否の上限。既定3）
 *
 * 段（この順）:
 *   fetch 出典の取得 → verify 事実の照合 → source-check 原文照合 → analyze 分析 → audit 監査
 *   → select 仕上げ済みの選別 → display 画面の文 → case-text 文の検査 → prepare 公開データの作成 → publish（--publish の時だけ）
 * 照合・分析・監査は AI をその場で呼ぶ（runner/agent-run.ts）。終了コード 75 の待ち合わせは無い。
 * 束は事例ごと。1件が失敗しても他の件は止めず、失敗した件と理由は最後に一覧で出す。
 * 各段の所要時間は data/pipeline/case-run.jsonl に1行ずつ残す。
 *
 * 失敗の扱い:
 *   hard 失敗（取得・照合・分析・監査・選別・画面の文で落ちた事例）は、その事例だけ以降の段から外す。
 *   原文照合の不合格は、公開データの作成と公開から外すだけで、他の段は続ける（docs/COLLECT_TO_UI.md 3.5 の「公開の準備の前に通す」）。
 */
import { spawn } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DISPLAY_FILES, mergeEntity, serialize, type DisplayFiles, type EntityDisplay } from '../../src/shared/display-build';
import { makeCaller, pickAgent, type Agent, type Caller } from './agent-call';
import { runStageWithAgent, type AgentStageOptions, type BundleOutcome } from './runner/agent-run';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, '../..');

export const STAGE_ORDER = ['fetch', 'verify', 'source-check', 'analyze', 'audit', 'select', 'display', 'case-text', 'prepare', 'publish'] as const;

export interface ExecResult { code: number; stdout: string; stderr: string }
/** 外の命令（node スクリプト・pnpm）を流す。試験では偽物に差し替える */
export type Exec = (name: string, argv: string[], env?: Record<string, string>) => Promise<ExecResult>;

export interface CaseRunOptions {
  root: string;
  ids: string[];
  runId: string;
  concurrency: number;
  publish: boolean;
  maxAttempts?: number;
  /** この段から始める（それより前の段は飛ばす）。止まった所から続きを流す時や、前の段の結果が手元に既にある時に使う */
  from?: string;
  /** build-display に渡す AI の指定 */
  agentArgs?: string[];
  log?: (text: string) => void;
}
export interface CaseRunDeps {
  exec: Exec;
  caller: Caller;
  runStage?: (o: AgentStageOptions) => Promise<BundleOutcome[]>;
  now?: () => number;
}

export interface StageRecord { runId: string; stage: string; startedAt: string; seconds: number; ids: number; failed: number; ok: boolean; detail?: Record<string, unknown> }
export interface Failure { id: string; stage: string; reason: string; soft?: boolean }
export interface CaseRunSummary { runId: string; stages: StageRecord[]; failures: Failure[]; passed: string[]; blockedFromPublish: string[]; ok: boolean; seconds: number }

const node = (script: string, ...args: string[]): string[] => ['--import', 'tsx', script, ...args];
const readLines = (file: string): string[] => (existsSync(file) ? readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) : []);
const readJson = <T,>(file: string, fallback: T): T => { try { return JSON.parse(readFileSync(file, 'utf8')) as T; } catch { return fallback; } };

/** 実際に子の処理を流す Exec。出力は <作業場所>/logs/<名前>.log に残し、末尾を返す */
export function makeExec(root: string, logDir: string): Exec {
  return (name, argv, env) => new Promise((resolveExec) => {
    mkdirSync(logDir, { recursive: true });
    const child = spawn(argv[0] === 'pnpm' ? 'pnpm' : process.execPath, argv[0] === 'pnpm' ? argv.slice(1) : argv, { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    const done = (code: number): void => {
      try { writeFileSync(join(logDir, `${name.replace(/[^\w.-]/g, '_')}.log`), `$ ${argv.join(' ')}\n${stdout}\n${stderr}`); } catch { /* 記録できなくても止めない */ }
      resolveExec({ code, stdout, stderr });
    };
    child.on('error', (e) => { stderr += String(e); done(127); });
    child.on('close', (code) => done(code ?? 1));
  });
}

export async function runCases(opt: CaseRunOptions, deps: CaseRunDeps): Promise<CaseRunSummary> {
  const { root, runId } = opt;
  const now = deps.now ?? Date.now;
  const log = opt.log ?? ((t: string) => console.log(`[case:run] ${t}`));
  const runStage = deps.runStage ?? runStageWithAgent;
  const work = join(root, 'data/pipeline/case-run', runId);
  mkdirSync(work, { recursive: true });
  const timingFile = join(root, 'data/pipeline/case-run.jsonl');
  const started = now();

  const alive = new Set(opt.ids);
  const failures: Failure[] = [];
  const blocked = new Set<string>(); // 公開データの作成・公開から外す（他の段は続ける）
  const stages: StageRecord[] = [];
  const idsFile = (tag: string, ids: Iterable<string>): string => { const f = join(work, `ids.${tag}.txt`); writeFileSync(f, `${[...ids].join('\n')}\n`); return f; };
  const fail = (id: string, stage: string, reason: string): void => { if (alive.delete(id)) failures.push({ id, stage, reason }); };
  const softFail = (id: string, stage: string, reason: string): void => { failures.push({ id, stage, reason, soft: true }); blocked.add(id); };
  const failAll = (stage: string, reason: string): void => { for (const id of [...alive]) fail(id, stage, reason); };

  /** 段を流して所要時間を記録する */
  async function stage(name: string, body: () => Promise<Record<string, unknown> | void>): Promise<void> {
    if (opt.from && STAGE_ORDER.indexOf(name as (typeof STAGE_ORDER)[number]) < STAGE_ORDER.indexOf(opt.from as (typeof STAGE_ORDER)[number])) { log(`${name}: --from ${opt.from} なので飛ばす`); return; }
    if (!alive.size && name !== 'publish') { log(`${name}: 対象の事例が残っていないので飛ばす`); return; }
    const t0 = now(); const failedBefore = failures.length; const n = alive.size;
    log(`${name}: 開始（${n} 件）`);
    let detail: Record<string, unknown> | void;
    let ok = true;
    try { detail = await body(); } catch (e) { ok = false; detail = { error: (e as Error).message }; failAll(name, (e as Error).message); }
    const rec: StageRecord = { runId, stage: name, startedAt: new Date(t0).toISOString(), seconds: Number(((now() - t0) / 1000).toFixed(1)), ids: n, failed: failures.length - failedBefore, ok: ok && failures.length === failedBefore, ...(detail ? { detail } : {}) };
    stages.push(rec);
    try { mkdirSync(dirname(timingFile), { recursive: true }); appendFileSync(timingFile, `${JSON.stringify(rec)}\n`); } catch { /* 記録できなくても流れは止めない */ }
    log(`${name}: ${rec.seconds} 秒、失敗 ${rec.failed} 件`);
  }

  /** 束を作る命令 → 事例ごとの束を AI で処理 → 失敗した束の事例を外す。束が作られなかった事例の ID を返す */
  async function aiStage(stageName: 'verify' | 'analyze' | 'audit', prefix: string): Promise<{ outcomes: BundleOutcome[]; unbundled: string[]; detail: Record<string, unknown> }> {
    const outcomes = await runStage({ root, stage: stageName, prefix, concurrency: opt.concurrency, caller: deps.caller, maxAttempts: opt.maxAttempts, log });
    for (const o of outcomes) if (!o.ok) for (const id of o.caseIds) fail(id, stageName, o.reasons[0] ?? '束が受理されなかった');
    const bundled = new Set(outcomes.flatMap((o) => o.caseIds));
    return {
      outcomes, unbundled: [...alive].filter((id) => !bundled.has(id)),
      detail: { bundles: outcomes.length, calls: outcomes.reduce((s, o) => s + o.calls, 0), skipped: outcomes.filter((o) => o.skipped).length, costUsd: Number(outcomes.reduce((s, o) => s + o.costUsd, 0).toFixed(4)), concurrency: opt.concurrency },
    };
  }
  const errorLine = (r: ExecResult): string => {
    const lines = `${r.stderr}\n${r.stdout}`.split('\n').map((l) => l.trim()).filter(Boolean);
    return (lines.find((l) => /^(Error|\w*Error)\b/.test(l)) ?? lines.slice(-2).join(' / ')).slice(0, 300);
  };
  const must = async (name: string, argv: string[], env?: Record<string, string>): Promise<ExecResult> => {
    const r = await deps.exec(name, argv, env);
    if (r.code !== 0) throw new Error(`${name} が失敗（終了コード ${r.code}）: ${errorLine(r)}`);
    return r;
  };

  // 1. 出典の取得
  await stage('fetch', async () => {
    const r = await deps.exec('fetch', node('scripts/reader-case/fetch-sources.ts', '--ids', idsFile('all', alive)));
    if (r.code !== 0) failAll('fetch', `出典の取得に失敗（終了コード ${r.code}）`);
  });

  // 2. 事実の照合
  await stage('verify', async () => {
    const prefix = `batch-r${runId}-`;
    await must('verify-build', node('scripts/reader-case/build-verify-batches.ts', '--ids', idsFile('verify', alive), '--prefix', prefix), { VERIFY_PER_BATCH: '1' });
    const { detail } = await aiStage('verify', prefix);
    if (alive.size) await must('verify-merge', node('scripts/reader-case/merge-verdicts.ts', '--ids', idsFile('verify-ok', alive)));
    return detail;
  });

  // 3. 原文照合。不合格は公開データの作成・公開から外す（他の段は続ける）
  await stage('source-check', async () => {
    const r = await deps.exec('source-check', node('scripts/reader-case/source-check.ts', '--ids', idsFile('source-check', alive)));
    const bad = new Map<string, string[]>();
    for (const line of r.stdout.split('\n')) {
      const m = line.match(/^不合格 ([^|\s]+)\|.*?: (.*)$/);
      if (m && alive.has(m[1])) bad.set(m[1], [...(bad.get(m[1]) ?? []), m[2].slice(0, 120)]);
    }
    for (const [id, rs] of bad) softFail(id, 'source-check', `原文照合で ${rs.length} 項目が不合格（例: ${rs[0]}）。pnpm exec node --import tsx scripts/reader-case/source-check.ts --ids <一覧> --apply で再収集へ`);
    if (r.code !== 0 && !bad.size) throw new Error(`原文照合が失敗（終了コード ${r.code}）: ${(r.stderr || r.stdout).trim().split('\n').slice(-2).join(' / ').slice(0, 200)}`);
    return { failedCases: bad.size };
  });

  // 4. 分析
  await stage('analyze', async () => {
    const prefix = `batch-r${runId}-`;
    await must('analyze-build', node('scripts/reader-case/build-analyze-batches.ts', '--ids', idsFile('analyze', alive), '--prefix', prefix), { ANALYZE_PER_BATCH: '1' });
    const { detail, unbundled } = await aiStage('analyze', prefix);
    for (const id of unbundled) fail(id, 'analyze', '分析の入力が作られなかった（照合で残った事実が無い、または出典の本文が取れていない）');
    if (alive.size) await must('analyze-merge', node('scripts/reader-case/merge-analysis.ts', '--ids', idsFile('analyze-ok', alive)));
    return detail;
  });

  // 5. 監査（今の推論をまだ監査していない事例だけ）
  await stage('audit', async () => {
    const fresh = new Set(readJson<string[]>(join(root, 'data/audit-fresh.json'), []));
    const todo = [...alive].filter((id) => !fresh.has(id));
    if (!todo.length) return { skipped: '全件が監査済み' };
    const tag = `999999${new Date(now()).toISOString().slice(2, 19).replace(/\D/g, '')}${String(process.pid % 100000).padStart(5, '0')}`;
    // 入力づくりは1件でも組めないと全体が止まるので、まとめて失敗したら事例ごとに作り直し、組めない事例だけを外す
    const built = await deps.exec('audit-build', node('scripts/reader-case/build-audit-input.ts', '--ids', idsFile('audit', todo), '--per', '1', '--tag', tag));
    if (built.code !== 0) {
      if (todo.length === 1) fail(todo[0], 'audit', `監査の入力を組めない: ${errorLine(built)}`);
      else for (const [i, id] of todo.entries()) {
        const one = await deps.exec(`audit-build-${id}`, node('scripts/reader-case/build-audit-input.ts', '--ids', idsFile(`audit-${i}`, [id]), '--per', '1', '--tag', `${tag}${String(i + 1).padStart(2, '0')}`));
        if (one.code !== 0) fail(id, 'audit', `監査の入力を組めない: ${errorLine(one)}`);
      }
    }
    if (!alive.size) return { skipped: '監査の入力を組める事例が無い' };
    const { detail } = await aiStage('audit', tag);
    if (alive.size) await must('audit-merge', node('scripts/reader-case/merge-analysis.ts', '--ids', idsFile('audit-ok', alive)));
    return { ...detail, tag };
  });

  // 6. 仕上げ済みの選別（画面の文を作る対象は仕上げ済みだけ）
  await stage('select', async () => {
    const r = await must('select', node('scripts/reader-case/select-finished.ts', '--ids', idsFile('select', alive), '--keep-published'));
    let notYet: Record<string, string[]> = {};
    try { notYet = (JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))) as { reasons?: Record<string, string[]> }).reasons ?? {}; } catch { /* 下の finished 一覧で判定 */ }
    const finished = new Set(readLines(join(root, 'data/catalog-finished-ids.txt')));
    for (const id of [...alive]) if (notYet[id] || !finished.has(id)) fail(id, 'select', `仕上げ済みの条件を満たさない: ${(notYet[id] ?? ['理由不明']).slice(0, 3).join('、')}`);
    return { finished: finished.size };
  });

  // 7. 画面の文。事例ごとに別の作業場所（--data-dir）で並列に作り、できた分だけを最後に1つずつ実ファイルへ反映する
  await stage('display', async () => {
    const dirs = new Map<string, string>();
    const finished = new Set(readLines(join(root, 'data/catalog-finished-ids.txt')));
    for (const id of [...alive]) if (!finished.has(id)) fail(id, 'display', '仕上げ済み（data/catalog-finished-ids.txt）に無いので画面の文を作らない');
    const ids = [...alive];
    let next = 0;
    const lane = async (): Promise<void> => {
      while (next < ids.length) {
        const id = ids[next++];
        const dir = join(work, 'display', id);
        mkdirSync(dir, { recursive: true });
        for (const f of DISPLAY_FILES) copyFileSync(join(root, 'data', `${f}.json`), join(dir, `${f}.json`));
        const r = await deps.exec(`display-${id}`, node('scripts/reader-case/build-display.ts', '--id', id, '--data-dir', dir, '--run-id', runId, ...(opt.agentArgs ?? [])));
        if (r.code !== 0) fail(id, 'display', `画面の文を作れなかった（終了コード ${r.code}）。理由: data/pipeline/display-build-failures.jsonl と ${join('data/pipeline/case-run', runId, 'logs', `display-${id}.log`)}`);
        else dirs.set(id, dir);
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, Math.min(opt.concurrency, ids.length)) }, lane));
    // 反映は1つずつ（実ファイルの読み直し→差し替え→書き込み）。並列の書き込みで取りこぼさない
    let merged = 0;
    for (const [id, dir] of dirs) {
      const real = Object.fromEntries(DISPLAY_FILES.map((f) => [f, readJson(join(root, 'data', `${f}.json`), [])])) as unknown as DisplayFiles;
      const mine = Object.fromEntries(DISPLAY_FILES.map((f) => [f, readJson(join(dir, `${f}.json`), [])])) as unknown as DisplayFiles;
      const one = <T extends { entityId: string }>(list: T[]): T | undefined => list.find((x) => x.entityId === id);
      const display: EntityDisplay = { list: one(mine['list-lines']), summary: one(mine['summary-lines']), detail: mine['detail-lines'].filter((l) => l.entityId === id), success: one(mine['success-points']), chapters: one(mine['case-chapters']) };
      const next2 = mergeEntity(real, id, display);
      for (const f of DISPLAY_FILES) {
        const text = serialize(next2[f]);
        if (text !== serialize(real[f])) { writeFileSync(join(root, 'data', `${f}.json`), text); merged += 1; }
      }
    }
    return { builtCases: dirs.size, changedFiles: merged, concurrency: opt.concurrency };
  });

  // 8. 文の検査（全件を対象にする検査なので、落ちたら理由を出して公開データの作成へ進まない）
  await stage('case-text', async () => {
    const r = await deps.exec('case-text', node('scripts/architecture/check-case-text-standard.mjs'));
    if (r.code === 0) return;
    const out = `${r.stdout}\n${r.stderr}`;
    const hit = [...alive].filter((id) => out.includes(id));
    const reason = `文の検査（case-text:verify）に落ちた: ${out.trim().split('\n').slice(-3).join(' / ').slice(0, 300)}`;
    if (hit.length) for (const id of hit) fail(id, 'case-text', reason);
    else failAll('case-text', reason);
  });

  // 9. 公開データの作成（原文照合で落ちた事例は含めない）
  const publishable = (): string[] => [...alive].filter((id) => !blocked.has(id));
  await stage('prepare', async () => {
    const ids = publishable();
    if (!ids.length) return { skipped: '公開データへ進める事例が無い' };
    const r = await deps.exec('prepare', ['pnpm', 'catalog:prepare', '--changed', idsFile('prepare', ids)]);
    if (r.code !== 0) throw new Error(`公開データの作成が失敗（終了コード ${r.code}）: ${(r.stderr || r.stdout).trim().split('\n').slice(-3).join(' / ').slice(0, 300)}`);
    return { prepared: ids.length };
  });

  // 10. 公開（--publish の時だけ。中身は今の catalog:publish）
  if (opt.publish) {
    const cleanly = failures.length === 0;
    await stage('publish', async () => {
      if (!publishable().length) return { skipped: '公開へ進める事例が無い' };
      if (!stages.find((s) => s.stage === 'prepare')?.ok) throw new Error('公開データの作成が通っていないので公開しない');
      const r = await deps.exec('publish', ['pnpm', 'catalog:publish']);
      if (r.code !== 0) throw new Error(`catalog:publish が失敗（終了コード ${r.code}）: ${(r.stderr || r.stdout).trim().split('\n').slice(-3).join(' / ').slice(0, 300)}`);
      return { published: publishable().length, otherCasesFailed: !cleanly };
    });
  }

  const summary: CaseRunSummary = {
    runId, stages, failures, passed: publishable(), blockedFromPublish: [...blocked],
    ok: failures.length === 0, seconds: Number(((now() - started) / 1000).toFixed(1)),
  };
  return summary;
}

export function formatSummary(s: CaseRunSummary): string {
  const lines = [`実行 ${s.runId}: 全体 ${s.seconds} 秒、通った事例 ${s.passed.length} 件、失敗 ${new Set(s.failures.map((f) => f.id)).size} 件`];
  for (const st of s.stages) lines.push(`  ${st.stage.padEnd(12)} ${String(st.seconds).padStart(7)} 秒  対象 ${st.ids} 件  失敗 ${st.failed} 件${st.ok ? '' : '  （この段は通らなかった）'}`);
  if (s.failures.length) {
    lines.push('失敗した事例と理由:');
    for (const f of s.failures) lines.push(`  - ${f.id}  [${f.stage}${f.soft ? '・公開から外す' : ''}] ${f.reason}`);
  }
  return lines.join('\n');
}

// ---------- コマンド ----------
function parseArgs(argv: string[]): CaseRunOptions & { agent?: string; model?: string; effort?: string } {
  const val = (n: string): string | undefined => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const idsArg = val('--ids');
  const idsFile = val('--ids-file');
  const ids = [...new Set([...(idsArg ? idsArg.split(',') : []), ...(idsFile ? readLines(resolve(idsFile)) : [])].map((s) => s.trim()).filter(Boolean))];
  if (!ids.length) { console.error('使い方: pnpm case:run --ids a,b,c [--publish] [--concurrency 4] [--agent claude|codex|auto] [--model M] [--codex-effort E]'); process.exit(2); }
  const conc = Number(val('--concurrency') ?? 4);
  if (!Number.isInteger(conc) || conc < 1) { console.error('--concurrency は1以上の整数'); process.exit(2); }
  if (val('--from') && !(STAGE_ORDER as readonly string[]).includes(val('--from')!)) { console.error(`--from は ${STAGE_ORDER.join(' / ')} のどれか`); process.exit(2); }
  const agent = val('--agent'); const model = val('--model'); const effort = val('--codex-effort');
  return {
    root: ROOT, ids, concurrency: conc, publish: argv.includes('--publish'),
    from: val('--from'),
    runId: val('--run-id') ?? new Date().toISOString().replace(/[-:]/g, '').slice(0, 15),
    maxAttempts: val('--max-attempts') ? Number(val('--max-attempts')) : undefined,
    agent, model, effort,
    agentArgs: [...(agent ? ['--agent', agent] : []), ...(model ? ['--model', model] : []), ...(effort ? ['--codex-effort', effort] : [])],
  };
}

async function main(): Promise<number> {
  const o = parseArgs(process.argv.slice(2));
  const agent: Agent = pickAgent((o.agent as Agent | 'auto' | undefined), (t) => console.log(`[case:run] ${t}`));
  const exec = makeExec(ROOT, join(ROOT, 'data/pipeline/case-run', o.runId, 'logs'));
  const summary = await runCases(o, { exec, caller: makeCaller(agent, { model: o.model, codexEffort: o.effort }) });
  console.log(formatSummary(summary));
  writeFileSync(join(ROOT, 'data/pipeline/case-run', o.runId, 'summary.json'), JSON.stringify(summary, null, 1));
  return summary.ok ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c), (e) => { console.error(`[case:run] ${(e as Error).message}`); process.exit(1); });
}
