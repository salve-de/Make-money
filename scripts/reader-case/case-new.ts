/**
 * 新しい事例を、候補探しから公開データの作成（手元）まで、Codex だけで1つの命令で通す。Claude は一切呼ばない。
 *
 *   pnpm case:new --count 3                       （候補を3件探して、最後まで通す）
 *   pnpm case:new --ids cand_a,cand_b             （queue にある候補を指定して、最後まで通す）
 *   pnpm case:new --run-id new-xxxx               （止まった時、同じ名前でもう一度流すと続きから）
 *   オプション: --concurrency N（既定2）  --effort <照合・分析・監査の深さ。既定 medium>  --research-effort <候補探しと調査記録づくりの深さ。既定 high>  --write-effort <文を書く段の深さ。既定 high>
 *              --redo（取り込み済みの候補を調べるところからやり直す）
 *              --from <段>（discover|research|media|run|check。その段から）  --publish（最後に catalog:publish。今回の整備では使わない）
 *
 * 段（この順。どれも途中で止まっても、同じ run-id で続きから）:
 *   discover 候補を探す（case:discover）→ research 調査記録と一覧への取り込み（case:research）
 *   → media 画像（ensure-case-media。case:run の選別が「使ってよい画像1枚」を要るので先に）
 *   → run 出典の取得・照合・分析・監査・選別・画面の文・文の検査・公開データの作成（case:run）→ check 形と文の検査
 * Codex 固定は環境変数 CASE_AGENT_LOCK=codex で、子の処理を含めどの段も claude を選べなくしている（agent-call.ts）。
 * 最後に「何件できた・何件落ちた（理由）・手元で見る URL」を日本語で出す。公開は --publish を付けた時だけ。
 * 人の判断が要る所（画像の保留など）は止めずに「人の目で見る」と一覧で出す。
 */
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, '../..');
export const NEW_STAGES = ['discover', 'research', 'media', 'run', 'check'] as const;
export type NewStage = (typeof NEW_STAGES)[number];
export const LOCAL_VIEW = 'http://localhost:3070/?entity=';

export interface ExecResult { code: number; stdout: string; stderr: string }
/** 外の命令を流す。試験では偽物に差し替える。env は Codex 固定の印を足した物が渡る */
export type Exec = (name: string, argv: string[], env: Record<string, string>) => Promise<ExecResult>;

export interface NewOptions {
  root: string;
  runId: string;
  count?: number;
  candidateIds: string[];
  concurrency: number;
  effort: string;
  /** 候補探しと調査記録づくり（web で広く探す段）の深さ */
  researchEffort: string;
  writeEffort: string;
  from?: NewStage;
  /** 取り込み済みの候補を、調べるところからやり直す（索引から外して調べ直す。調べる指示を直した後の比べ直しなど） */
  redo?: boolean;
  publish: boolean;
  log?: (t: string) => void;
}
export interface NewState { runId: string; candidateIds: string[]; entityIds: string[]; skipped: { id: string; reason: string }[]; done: NewStage[]; /** --redo で調べ直す候補（再開しても二重に索引から外さない） */ redone?: string[]; /** この実行で索引へ入れた事例。画像は索引に無い間の「取得できなかった」記録を捨てて取り直す */ indexed?: string[] }
export interface NewFailure { id: string; stage: string; reason: string }
export interface NewSummary { runId: string; passed: string[]; failures: NewFailure[]; humanLook: string[]; urls: Record<string, string>; ok: boolean }

/** 手元の索引（コミットしない）から事例を外す。調べ直した記録を索引へ入れ直すため */
export function purgeFromIndex(root: string, entityIds: string[]): number {
  const f = join(root, 'data/entities-index.json');
  if (!existsSync(f)) return 0;
  const gone = new Set(entityIds);
  const all = JSON.parse(readFileSync(f, 'utf8')) as { id?: string }[];
  const kept = all.filter((r) => !(typeof r?.id === 'string' && gone.has(r.id)));
  if (kept.length === all.length) return 0;
  writeFileSync(`${f}.tmp`, JSON.stringify(kept));
  renameSync(`${f}.tmp`, f);
  return all.length - kept.length;
}

/** どの子の処理にも Codex 固定を渡す（Claude を選ぶ段があっても codex に替わる） */
export const CODEX_ONLY_ENV = { CASE_AGENT_LOCK: 'codex' } as const;

const node = (script: string, ...args: string[]): string[] => ['--import', 'tsx', script, ...args];
const readJson = <T,>(file: string, fallback: T): T => { try { return JSON.parse(readFileSync(file, 'utf8')) as T; } catch { return fallback; } };
const lastJson = (text: string): Record<string, unknown> | undefined => {
  for (const line of text.split('\n').reverse()) { const t = line.trim(); if (t.startsWith('{') && t.endsWith('}')) { try { return JSON.parse(t) as Record<string, unknown>; } catch { /* 次の行へ */ } } }
  return undefined;
};

/** 実際に流す Exec。出力はそのまま画面に出し、同じ物を <作業場所>/logs/<名前>.log にも残す */
export function makeStreamingExec(root: string, logDir: string): Exec {
  return (name, argv, env) => new Promise((resolveExec) => {
    mkdirSync(logDir, { recursive: true });
    const pnpm = argv[0] === 'pnpm';
    const child = spawn(pnpm ? 'pnpm' : process.execPath, pnpm ? argv.slice(1) : argv, { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    const logFile = join(logDir, `${name.replace(/[^\w.-]/g, '_')}.log`);
    try { writeFileSync(logFile, `$ ${argv.join(' ')}\n`); } catch { /* 記録できなくても止めない */ }
    const sink = (d: Buffer, err: boolean): void => {
      const t = String(d);
      if (err) stderr += t; else stdout += t;
      process.stdout.write(t);
      try { appendFileSync(logFile, t); } catch { /* 同上 */ }
    };
    child.stdout.on('data', (d: Buffer) => sink(d, false));
    child.stderr.on('data', (d: Buffer) => sink(d, true));
    child.on('error', (e) => { stderr += String(e); resolveExec({ code: 127, stdout, stderr }); });
    child.on('close', (code) => resolveExec({ code: code ?? 1, stdout, stderr }));
  });
}

interface QueueRow { id: string; name: string; status: string; entityId?: string; skipReason?: string; researchRunId?: string }
const queueRows = (root: string): QueueRow[] => {
  const f = join(root, 'data/candidates/queue.jsonl');
  return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l) as QueueRow]; } catch { return []; } }) : [];
};

/** 一覧（data/entities-index.json。コミットしない手元の索引）に入っている事例ID。別の作業場所で取り込んだ候補は、この作業場所の索引には無いことがある */
export function indexIds(root: string): Set<string> {
  try {
    const raw = JSON.parse(readFileSync(join(root, 'data/entities-index.json'), 'utf8')) as { id?: string }[];
    return new Set(raw.flatMap((r) => (typeof r?.id === 'string' ? [r.id] : [])));
  } catch { return new Set(); }
}

export async function runNew(opt: NewOptions, exec: Exec, deps: { indexIds?: (root: string) => Set<string> } = {}): Promise<NewSummary> {
  const { root, runId } = opt;
  const log = opt.log ?? ((t: string) => console.log(`[case:new] ${t}`));
  const work = join(root, 'data/pipeline/case-new', runId);
  mkdirSync(work, { recursive: true });
  const stateFile = join(work, 'state.json');
  const state: NewState = readJson<NewState>(stateFile, { runId, candidateIds: opt.candidateIds, entityIds: [], skipped: [], done: [] });
  if (opt.candidateIds.length) state.candidateIds = [...new Set([...state.candidateIds, ...opt.candidateIds])];
  const save = (): void => writeFileSync(stateFile, JSON.stringify(state, null, 1));
  const failures: NewFailure[] = [];
  const humanLook: string[] = [];
  const env = { ...CODEX_ONLY_ENV };
  const reach = (s: NewStage): boolean => !opt.from || NEW_STAGES.indexOf(s) >= NEW_STAGES.indexOf(opt.from);
  const run = (name: string, argv: string[]): Promise<ExecResult> => exec(name, argv, env);
  const fail = (id: string, stage: string, reason: string): void => { if (!failures.some((f) => f.id === id)) failures.push({ id, stage, reason }); };

  // 1. 候補を探す。--ids があれば探さない。再開の時は前に足した候補を使う
  if (reach('discover') && !state.candidateIds.length) {
    if (!opt.count) throw new Error('--count N か --ids 候補ID,… が要る');
    log(`discover: 候補を ${opt.count} 件探す（Codex）`);
    const r = await run('discover', node('scripts/reader-case/case-discover.ts', '--count', String(opt.count), '--agent', 'codex', '--codex-effort', opt.researchEffort, '--run-id', `${runId}-discover`));
    const added = (lastJson(r.stdout)?.added as string[] | undefined) ?? [];
    if (!added.length) throw new Error(`候補を1件も足せなかった（終了コード ${r.code}）。出力の「見送り」を見る`);
    state.candidateIds = added; state.done.push('discover'); save();
  }
  if (!state.candidateIds.length) throw new Error('対象の候補が無い');

  // 2. 調査記録と一覧への取り込み。取り込み済み（done）の候補は飛ばして entityId を使う
  if (reach('research')) {
    const rows = queueRows(root);
    if (opt.redo && !state.redone) {
      const done = state.candidateIds.map((id) => rows.find((x) => x.id === id)).filter((x): x is QueueRow => x?.status === 'done' && !!x.entityId);
      const n = purgeFromIndex(root, done.map((x) => x.entityId!));
      log(`redo: ${done.length} 件を調べ直す（索引から ${n} 件を外した）`);
      state.redone = done.map((x) => x.id); save();
    }
    const todo = state.candidateIds.filter((id) => rows.find((x) => x.id === id)?.status === 'queued' || (!!state.redone?.includes(id) && rows.find((x) => x.id === id)?.researchRunId !== `${runId}-research`));
    if (todo.length) {
      log(`research: ${todo.length} 件を調べる（Codex）`);
      await run('research', node('scripts/reader-case/case-research.ts', '--ids', todo.join(','), '--agent', 'codex', '--repair-agent', 'codex', '--codex-effort', opt.researchEffort, '--concurrency', String(opt.concurrency), '--run-id', `${runId}-research`, ...(opt.redo ? ['--redo'] : [])));
    } else log('research: 調べる候補が残っていない（取り込み済みか見送り）');
    state.done.push('research'); save();
  }
  const after = queueRows(root);
  state.entityIds = []; state.skipped = [];
  for (const id of state.candidateIds) {
    const row = after.find((x) => x.id === id);
    if (row?.status === 'done' && row.entityId) state.entityIds.push(row.entityId);
    else { const reason = row ? `${row.status}${row.skipReason ? `：${row.skipReason}` : ''}` : 'queue に無い'; state.skipped.push({ id, reason }); fail(row?.name ?? id, 'research', reason); }
  }
  save();
  if (!state.entityIds.length) return finish();
  const idsFile = join(work, 'entities.ids.txt');
  writeFileSync(idsFile, `${state.entityIds.join('\n')}\n`);

  // 2b. 手元の索引に無い事例（別の作業場所で取り込んだ候補など）を、取り込み用の記録（data/entity-additions）から索引へ合流する
  if (reach('research')) {
    const have = (deps.indexIds ?? indexIds)(root);
    const missing = state.entityIds.filter((id) => !have.has(id));
    state.indexed = [...new Set([...(state.indexed ?? []), ...missing])];
    if (missing.length) {
      log(`index: 手元の索引に無い ${missing.length} 件を取り込む（add-entity-records --apply → registry:sync）`);
      const a = await run('index-apply', node('scripts/reader-case/add-entity-records.ts', '--apply'));
      const g = a.code === 0 ? await run('registry-sync', ['pnpm', 'registry:sync']) : a;
      if (a.code !== 0 || g.code !== 0) for (const id of missing) fail(id, 'index', `手元の索引へ取り込めなかった（${a.code !== 0 ? 'add-entity-records --apply' : 'registry:sync'} が失敗）`);
    }
  }

  // 3. 画像。保留・画像なしがあっても止めない（人の目で見る一覧に出す）
  if (reach('media')) {
    log('media: 画像を用意する');
    const fresh = state.indexed ?? [];
    const r = await run('media', node('scripts/media/ensure-case-media.ts', '--ids-file', idsFile));
    // 索引に入れる前に流して「公式サイトなし」の記録が付いた事例だけ、取り直す
    if (fresh.length) await run('media-refresh', node('scripts/media/ensure-case-media.ts', '--ids', fresh.join(','), '--refresh'));
    for (const l of r.stdout.split('\n').map((x) => x.trim())) if (/^(保留あり|使える画像なし)/.test(l)) humanLook.push(`画像: ${l}`);
    state.done.push('media'); save();
  }

  // 4. 取得から公開データの作成まで。画面の文は Codex の書く・照らす・読む
  if (reach('run')) {
    log('run: 取得・照合・分析・監査・画面の文・公開データの作成（Codex）');
    const r = await run('run', node('scripts/reader-case/case-run.ts', '--ids-file', idsFile, '--agent', 'codex', '--codex-effort', opt.effort, '--write-effort', opt.writeEffort, '--concurrency', String(opt.concurrency), '--run-id', `${runId}-run`, ...(opt.publish ? ['--publish'] : [])));
    const summary = readJson<{ failures?: { id: string; stage: string; reason: string }[] } | null>(join(root, 'data/pipeline/case-run', `${runId}-run`, 'summary.json'), null);
    if (summary) for (const f of summary.failures ?? []) fail(f.id, f.stage, f.reason);
    else if (r.code !== 0) for (const id of state.entityIds) fail(id, 'run', `case:run が終わらなかった（終了コード ${r.code}）。同じ命令でもう一度流すと続きから`);
    state.done.push('run'); save();
  }

  // 5. 形と文の検査（画面の正本・札・文の標準）
  if (reach('check')) {
    for (const [name, script] of [['case-pages-check', 'case-pages:check'], ['case-tags-check', 'case-tags:check'], ['case-text-verify', 'case-text:verify']] as const) {
      const r = await run(name, ['pnpm', script]);
      if (r.code !== 0) {
        const out = `${r.stdout}\n${r.stderr}`;
        const hit = state.entityIds.filter((id) => out.includes(id));
        const reason = `${script} に落ちた: ${out.trim().split('\n').slice(-3).join(' / ').slice(0, 300)}`;
        for (const id of hit.length ? hit : state.entityIds) fail(id, script, reason);
      }
    }
    state.done.push('check'); save();
  }
  return finish();

  function finish(): NewSummary {
    const failedIds = new Set(failures.map((f) => f.id));
    const passed = state.entityIds.filter((id) => !failedIds.has(id));
    const urls = Object.fromEntries(passed.map((id) => [id, `${LOCAL_VIEW}${id}`]));
    const summary: NewSummary = { runId, passed, failures, humanLook, urls, ok: failures.length === 0 && passed.length > 0 };
    writeFileSync(join(work, 'summary.json'), JSON.stringify(summary, null, 1));
    return summary;
  }
}

export function formatNewSummary(s: NewSummary): string {
  const lines = [`新しい事例 ${s.runId}: できた ${s.passed.length} 件、落ちた ${new Set(s.failures.map((f) => f.id)).size} 件`];
  for (const id of s.passed) lines.push(`  できた: ${id}\n    手元で見る: ${s.urls[id]}`);
  for (const f of s.failures) lines.push(`  落ちた: ${f.id}  [${f.stage}] ${f.reason}`);
  if (s.humanLook.length) { lines.push('人の目で見る（止めてはいない）:'); for (const h of s.humanLook) lines.push(`  - ${h}`); }
  if (s.failures.length) lines.push(`止まった時は同じ命令に --run-id ${s.runId} を付けてもう一度流す（続きから）`);
  return lines.join('\n');
}

function parseArgs(argv: string[]): NewOptions {
  const val = (n: string): string | undefined => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const count = val('--count') ? Number(val('--count')) : undefined;
  const candidateIds = (val('--ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const runId = val('--run-id') ?? `new-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`;
  const resuming = existsSync(join(ROOT, 'data/pipeline/case-new', runId, 'state.json'));
  if (!resuming && !candidateIds.length && !(count && Number.isInteger(count) && count > 0)) { console.error('使い方: pnpm case:new --count N  または  pnpm case:new --ids 候補ID,…  （止まったら --run-id <名前> を付けて続きから）'); process.exit(2); }
  const from = val('--from');
  if (from && !(NEW_STAGES as readonly string[]).includes(from)) { console.error(`--from は ${NEW_STAGES.join(' / ')} のどれか`); process.exit(2); }
  return {
    root: ROOT, runId, count, candidateIds, concurrency: Math.max(1, Number(val('--concurrency') ?? 2)),
    effort: val('--effort') ?? 'medium', researchEffort: val('--research-effort') ?? 'high', writeEffort: val('--write-effort') ?? 'high', from: from as NewStage | undefined, publish: argv.includes('--publish'), redo: argv.includes('--redo'),
  };
}

async function main(): Promise<number> {
  const o = parseArgs(process.argv.slice(2));
  process.env.CASE_AGENT_LOCK = 'codex';
  const exec = makeStreamingExec(ROOT, join(ROOT, 'data/pipeline/case-new', o.runId, 'logs'));
  console.log(`[case:new] 実行名 ${o.runId}（Codex だけで通す。止まったら --run-id ${o.runId} で続きから）`);
  const s = await runNew(o, exec);
  console.log(`\n${formatNewSummary(s)}`);
  return s.ok ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c), (e) => { console.error(`[case:new] ${(e as Error).message}`); process.exit(1); });
}
