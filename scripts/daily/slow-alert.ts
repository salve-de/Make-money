/**
 * 遅れの見張り。data/pipeline/case-run.jsonl の段ごとの所要時間が上限を超えたら、知らせる。
 * 知らせ方は daily-run と同じ: Mac の通知 + GitHub の issue（同じ理由が開いていればコメントを足す）。
 *
 * 上限（初期値）:
 *   - 1件の1段で 15 分。段は事例を束ねて並列に流すので「1件あたり」は 秒数 ÷ 並列の波の数（ceil(件数 ÷ 並列数)）で見る。
 *   - 1回の実行全体で 1件あたり 30 分。全段の秒数の合計 ÷ その実行で一番多かった段の件数。
 * 固まり検出（case:run の --stall-minutes。既定10分、出力も CPU も動かなければ止めて1回やり直す）との関係:
 *   固まりは「動きが無い」を10分で止める仕組み、こちらは「動いていても遅い」を知らせる仕組み。
 *   1段の上限は、固まり検出の分数に5分を足した値より小さくならない（やり直し1回分の余裕を持たせる）。
 *
 *   node --import tsx scripts/daily/slow-alert.ts [--run-id <回>] [--file <jsonl>] [--stall-minutes N] [--stage-minutes N] [--case-minutes N] [--no-alert]
 *   回を省くと、記録の最後の回を見る。
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SLOW_STAGE_MINUTES = 15;
export const SLOW_CASE_MINUTES = 30;
export const DEFAULT_CONCURRENCY = 4;
export const CASE_RUN_FILE = 'data/pipeline/case-run.jsonl';

/** invocation: 起動ごとの印（case-run が付ける）。無い古い行は同じ回の名前でまとめて1起動とみなす */
export interface StageRow { runId: string; invocation?: string; stage: string; seconds: number; ids: number; detail?: Record<string, unknown> }
export interface SlowLimits { stageMinutes: number; caseMinutes: number; concurrency: number }
/** key: 回の名前を含まない。同じ段の遅れが続く時に同じ課題へまとめる鍵 */
export interface SlowFinding { key: string; text: string; runId: string; stage?: string; minutes: number; limit: number }

export function limitsFor(o: { stallMinutes?: number; stageMinutes?: number; caseMinutes?: number; concurrency?: number } = {}): SlowLimits {
  const stall = o.stallMinutes ?? 10;
  return {
    stageMinutes: o.stageMinutes ?? Math.max(SLOW_STAGE_MINUTES, stall + 5),
    caseMinutes: o.caseMinutes ?? SLOW_CASE_MINUTES,
    concurrency: o.concurrency ?? DEFAULT_CONCURRENCY,
  };
}

const round1 = (x: number): number => Number(x.toFixed(1));

/** 上限を超えた段・実行を返す。純粋関数 */
export function findSlow(rows: readonly StageRow[], limits: SlowLimits = limitsFor()): SlowFinding[] {
  const out: SlowFinding[] = [];
  const byRun = new Map<string, StageRow[]>();
  for (const r of rows) { const k = `${r.runId}|${r.invocation ?? ''}`; byRun.set(k, [...(byRun.get(k) ?? []), r]); }
  for (const list of byRun.values()) {
    const runId = list[0].runId;
    for (const r of list) {
      const conc = Number(r.detail?.concurrency) > 0 ? Number(r.detail?.concurrency) : limits.concurrency;
      const waves = Math.max(1, Math.ceil(Math.max(1, r.ids) / conc));
      const minutes = r.seconds / 60 / waves;
      if (minutes > limits.stageMinutes) out.push({ key: `stage:${r.stage}`, runId, stage: r.stage, minutes: round1(minutes), limit: limits.stageMinutes, text: `処理が遅い: ${runId} の「${r.stage}」が1件あたり約${round1(minutes)}分（上限${limits.stageMinutes}分。${r.ids}件を${round1(r.seconds / 60)}分）` });
    }
    const cases = Math.max(1, ...list.map((r) => r.ids));
    const total = list.reduce((s, r) => s + r.seconds, 0) / 60 / cases;
    if (total > limits.caseMinutes) out.push({ key: 'run', runId, minutes: round1(total), limit: limits.caseMinutes, text: `処理が遅い: ${runId} の実行全体が1件あたり約${round1(total)}分（上限${limits.caseMinutes}分。${cases}件、合計${round1(list.reduce((s, r) => s + r.seconds, 0) / 60)}分）` });
  }
  return out;
}

export function readRows(file = CASE_RUN_FILE): StageRow[] {
  if (!existsSync(file)) return [];
  const rows: StageRow[] = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line) as Partial<StageRow>;
      if (typeof r.runId === 'string' && typeof r.stage === 'string' && typeof r.seconds === 'number' && typeof r.ids === 'number') rows.push(r as StageRow);
    } catch { /* 読めない行は飛ばす */ }
  }
  return rows;
}

/** その回の、一番新しい起動の行だけ（同じ回の名前で再開・やり直した時に、古い起動の所要時間を足さない） */
export function rowsOfRun(rows: readonly StageRow[], runId: string): StageRow[] {
  const mine = rows.filter((r) => r.runId === runId);
  const last = [...mine].reverse().find((r) => r.invocation)?.invocation;
  return last ? mine.filter((r) => r.invocation === last) : mine.filter((r) => !r.invocation);
}
export const latestRunId = (rows: readonly StageRow[]): string | undefined => rows[rows.length - 1]?.runId;

export interface AlertDeps {
  exec: (argv: string[]) => Promise<{ code: number; stdout: string; stderr: string }>;
  notify: (title: string, body: string) => Promise<void>;
}

/** Mac の通知と GitHub の issue（同じ理由が開いていればコメントを足す）。遅れが無ければ何もしない */
export async function alertSlow(findings: readonly SlowFinding[], d: AlertDeps): Promise<string[]> {
  const sent: string[] = [];
  for (const f of findings) {
    // 課題の名前は回の名前を含めない（遅れが続く間は同じ課題にコメントを足す）
    const title = `処理の遅れ・${f.stage ? `「${f.stage}」の段` : '実行全体'}`;
    await d.notify('Make-Money 処理の遅れ', f.text.slice(0, 120)).catch(() => undefined);
    const list = await d.exec(['gh', 'issue', 'list', '--state', 'open', '--search', '処理の遅れ in:title', '--json', 'number,title', '--limit', '50']);
    let existing: number | undefined;
    try { existing = (JSON.parse(list.stdout || '[]') as { number: number; title: string }[]).find((i) => i.title === title)?.number; } catch { /* 読めなければ新しく立てる */ }
    const body = `回: ${f.runId}${f.stage ? `\n段: ${f.stage}` : ''}\n理由: ${f.text}\n\n記録: ${CASE_RUN_FILE}（上限は ${f.limit} 分。固まり検出は case:run の --stall-minutes）`;
    const r = existing ? await d.exec(['gh', 'issue', 'comment', String(existing), '--body', body]) : await d.exec(['gh', 'issue', 'create', '--title', title, '--body', body]);
    sent.push(existing ? `コメント #${existing}` : (r.code === 0 ? '新しい issue' : 'issue 失敗'));
  }
  return sent;
}

export function realAlertDeps(root: string): AlertDeps {
  const exec: AlertDeps['exec'] = (argv) => new Promise((res) => {
    const c = spawn(argv[0], argv.slice(1), { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    c.stdout.on('data', (x) => { stdout += x; }); c.stderr.on('data', (x) => { stderr += x; });
    c.on('error', (e) => res({ code: 127, stdout, stderr: String(e) }));
    c.on('close', (code) => res({ code: code ?? 1, stdout, stderr }));
  });
  return { exec, notify: async (title, body) => { await exec(['osascript', '-e', `display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)}`]); } };
}

/** その回の記録を見て、遅ければ知らせる。知らせた内容を返す（case:run の終わりと、このファイルの命令から呼ぶ） */
export async function checkRunSlow(root: string, runId: string, o: { stallMinutes?: number; stageMinutes?: number; caseMinutes?: number; concurrency?: number; alert?: boolean; file?: string; deps?: AlertDeps; log?: (t: string) => void } = {}): Promise<SlowFinding[]> {
  const log = o.log ?? ((t: string) => console.log(`[slow-alert] ${t}`));
  const findings = findSlow(rowsOfRun(readRows(resolve(root, o.file ?? CASE_RUN_FILE)), runId), limitsFor(o));
  for (const f of findings) log(f.text);
  if (findings.length && o.alert !== false) log(`知らせ: ${(await alertSlow(findings, o.deps ?? realAlertDeps(root))).join(', ')}`);
  return findings;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const val = (n: string): string | undefined => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const num = (n: string): number | undefined => { const v = val(n); if (v === undefined) return undefined; const x = Number(v); if (!(x > 0)) throw new Error(`${n} は0より大きい数`); return x; };
  const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const file = val('--file');
  const rows = readRows(resolve(root, file ?? CASE_RUN_FILE));
  const runId = val('--run-id') ?? latestRunId(rows);
  if (!runId) { console.log('[slow-alert] 記録が無い'); return 0; }
  const found = await checkRunSlow(root, runId, { stallMinutes: num('--stall-minutes'), stageMinutes: num('--stage-minutes'), caseMinutes: num('--case-minutes'), alert: !argv.includes('--no-alert'), file });
  if (!found.length) console.log(`[slow-alert] ${runId}: 遅れなし`);
  return found.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c), (e) => { console.error(`[slow-alert] ${(e as Error).message}`); process.exit(1); });
}
