/**
 * AI をその場で直接呼ぶ部品（照合・分析・監査の段で使う）。build-display.ts の callAgent と同じ方式:
 *   claude: `claude -p`（ツールなし・読める物が何も無い場所で動かす）
 *   codex : `codex exec`（read-only・一時の空の場所）
 * 違いは、複数を同時に流すため非同期で呼ぶこと、結果を JSON ではなく本文のまま返すこと
 * （形の検査は runner/validate.ts が行い、通らなければ理由を返して出し直させる）。
 * 試験では Caller を偽物に差し替える。
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type Agent = 'claude' | 'codex';

export interface AskRequest { system: string; user: string; label: string }
export interface AskResult { text: string; seconds: number; costUsd?: number; tokens?: { input: number; output: number } }
/** 差し替えられるAIの呼び出し。失敗は例外で返す */
export type Caller = (req: AskRequest) => Promise<AskResult>;

export interface AgentOptions {
  /** 'auto'（既定）: claude がログイン済みなら claude、無ければ codex。build-display.ts の pickAgent と同じ */
  agent?: Agent | 'auto';
  model?: string;
  /** codex の考える深さ */
  codexEffort?: string;
  timeoutMs?: number;
  /** 出力も CPU の動きも無いまま固まったとみなすまでの時間（既定 10 分） */
  idleMs?: number;
}

/** build-display.ts の pickAgent と同じ決め方。環境変数は DISPLAY_BUILD_AGENT（同じ既定を共有する） */
export function pickAgent(want: Agent | 'auto' | undefined = undefined, log: (t: string) => void = () => {}): Agent {
  const w = want ?? ((process.env.DISPLAY_BUILD_AGENT as Agent | 'auto' | undefined) || 'auto');
  if (w === 'claude' || w === 'codex') return w;
  const s = spawnSync('claude', ['auth', 'status'], { encoding: 'utf8' });
  try { if ((JSON.parse(s.stdout) as { loggedIn?: boolean }).loggedIn) return 'claude'; } catch { /* 下へ */ }
  log('claude がログインされていない（claude auth status）。codex を使う');
  return 'codex';
}

export interface Run { status: number | null; stdout: string; stderr: string; timedOut: boolean; stalled: boolean }
export interface WatchOptions { timeoutMs: number; /** 出力も CPU の動きも無いまま、この時間が過ぎたら固まったとみなして止める */ idleMs: number; pollMs?: number }

/** ps で子の CPU 時間（秒）を読む。読めなければ null */
function cpuSeconds(pid: number | undefined): number | null {
  if (!pid) return null;
  const r = spawnSync('ps', ['-o', 'cputime=', '-p', String(pid)], { encoding: 'utf8' });
  const t = r.stdout.trim();
  if (r.status !== 0 || !t) return null;
  return t.split(':').reduce((acc, x) => acc * 60 + parseFloat(x), 0);
}

/**
 * 子を流す。入力は書き込んだらすぐ閉じる（入力待ちで固まらない）。
 * 出力（stdout/stderr）も CPU 時間の増加も idleMs の間まったく無ければ、固まったとみなして止める。
 */
export function run(cmd: string, args: string[], input: string, cwd: string, w: WatchOptions): Promise<Run> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = ''; let timedOut = false; let stalled = false;
    let lastActive = Date.now(); let lastCpu = -1;
    const started = Date.now();
    const poll = setInterval(() => {
      const cpu = cpuSeconds(child.pid);
      if (cpu !== null && cpu !== lastCpu) { lastCpu = cpu; lastActive = Date.now(); }
      if (Date.now() - started > w.timeoutMs) { timedOut = true; child.kill('SIGKILL'); }
      else if (Date.now() - lastActive > w.idleMs) { stalled = true; child.kill('SIGKILL'); }
    }, w.pollMs ?? 5000);
    const touch = (): void => { lastActive = Date.now(); };
    child.stdout.on('data', (d) => { stdout += d; touch(); });
    child.stderr.on('data', (d) => { stderr += d; touch(); });
    child.on('error', (e) => { clearInterval(poll); reject(e); });
    child.on('close', (status) => { clearInterval(poll); resolve({ status, stdout, stderr, timedOut, stalled }); });
    child.stdin.on('error', () => { /* 子が先に終わった */ });
    child.stdin.end(input);
  });
}

export class StallError extends Error {}

/** 固まったら 1 回だけやり直す。やり直しても固まれば StallError を投げる（その件だけ失敗にして次へ進ませる） */
export async function withStallRetry<T>(once: () => Promise<T>, retries = 1): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await once(); } catch (e) {
      if (!(e instanceof StallError) || i >= retries) throw e;
    }
  }
}

/** 実際に claude / codex を呼ぶ Caller を作る */
export function makeCaller(agent: Agent, opt: AgentOptions = {}): Caller {
  const watch: WatchOptions = { timeoutMs: opt.timeoutMs ?? 20 * 60_000, idleMs: opt.idleMs ?? 10 * 60_000 };
  return (req) => withStallRetry(() => callOnce(agent, opt, watch, req));
}

async function callOnce(agent: Agent, opt: AgentOptions, watch: WatchOptions, { system, user, label }: AskRequest): Promise<AskResult> {
  {
    const started = Date.now();
    const empty = mkdtempSync(join(tmpdir(), 'case-run-agent-'));
    try {
      if (agent === 'claude') {
        const args = ['-p', '--output-format', 'json', '--tools', '', '--safe-mode', '--strict-mcp-config', '--no-session-persistence', '--system-prompt', system, ...(opt.model ? ['--model', opt.model] : [])];
        const r = await run('claude', args, user, empty, watch);
        if (r.stalled) throw new StallError(`claude が固まった（${label}）`);
        if (r.timedOut) throw new Error(`claude が時間切れ（${label}）`);
        let j: { is_error?: boolean; result?: string; total_cost_usd?: number; usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } } = {};
        try { j = JSON.parse(r.stdout || '{}'); } catch { /* 下で失敗にする */ }
        if (r.status !== 0 || j.is_error || typeof j.result !== 'string') throw new Error(`claude が失敗（${label}）: ${(j.result ?? r.stderr ?? r.stdout ?? '').slice(0, 300)}`);
        const u = j.usage ?? {};
        return { text: j.result, seconds: (Date.now() - started) / 1000, costUsd: j.total_cost_usd, tokens: { input: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), output: u.output_tokens ?? 0 } };
      }
      const outFile = join(empty, 'out.txt');
      writeFileSync(join(empty, '.keep'), '');
      const args = ['exec', '--skip-git-repo-check', '--ephemeral', '-s', 'read-only', '-o', outFile, '--json', '-C', empty, ...(opt.model ? ['-m', opt.model] : []), ...(opt.codexEffort ? ['-c', `model_reasoning_effort=${opt.codexEffort}`] : []), '-'];
      const r = await run('codex', args, `${system}\n\n${user}\n\nツールやコマンドは使わず、指定の形の JSON だけを返す。`, empty, watch);
      if (r.stalled) throw new StallError(`codex が固まった（${label}）`);
      if (r.timedOut) throw new Error(`codex が時間切れ（${label}）`);
      if (r.status !== 0 || !existsSync(outFile)) throw new Error(`codex が失敗（${label}）: ${(r.stderr || r.stdout).slice(-300)}`);
      const tokens = { input: 0, output: 0 };
      for (const line of r.stdout.split('\n')) {
        try { const e = JSON.parse(line) as { type?: string; usage?: { input_tokens?: number; output_tokens?: number } }; if (e.type === 'turn.completed') { tokens.input += e.usage?.input_tokens ?? 0; tokens.output += e.usage?.output_tokens ?? 0; } } catch { /* 事件の行でない */ }
      }
      return { text: readFileSync(outFile, 'utf8'), seconds: (Date.now() - started) / 1000, tokens };
    } finally { rmSync(empty, { recursive: true, force: true }); }
  }
}
