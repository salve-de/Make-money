/**
 * 毎日の定期実行（run-daily.sh）の状態管理。LLM も外部も呼ばない。runner と台帳は「呼ぶだけ」で中身は変えない。
 *   prefixes                         処理の対象になる束の接頭辞を1行ずつ出す（data/analyze/batches の名前から）
 *   plan --prefix P [--force]        走らせるか判定。終了コード 0=走らせる / 10=前回完了と入力が同じなので飛ばす
 *   begin --prefix P --run-id R      RUNNING を記録。前回が RUNNING のまま（中断）なら台帳に残す
 *   classify --prefix P              パイプラインが止まった理由を runner の状態から分類（WAITING_AGENT / HOLD / FAILED）
 *   finish --prefix P --run-id R --outcome DONE|WAITING_AGENT|HOLD|FAILED --text "…" [--exit N]
 * 状態は data/pipeline/daily/state.json（接頭辞ごと）、実行の履歴は data/pipeline/daily/runs.jsonl（追記）。
 */
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { appendRecord, readCaseRecords, RUN_CASE_PREFIX, STAGES, type Stage } from './ledger';
import { inspect, STAGES as RUNNER_STAGES, type BundleInfo } from './runner/runner';
import type { StageName } from './runner/validate';

export const DAILY_DIR = 'data/pipeline/daily';
export type Outcome = 'DONE' | 'WAITING_AGENT' | 'HOLD' | 'FAILED';
export interface PrefixState {
  status: 'RUNNING' | Outcome | 'INTERRUPTED';
  runId?: string;
  startedAt?: string;
  finishedAt?: string;
  /** 完了時点の入力（束ファイル）の指紋。同じなら次回は飛ばす */
  inputSig?: string;
  reason?: string;
}
type StateFile = Record<string, PrefixState>;

const root = (): string => resolve(process.env.RUNNER_ROOT ?? process.cwd());
const statePath = (r: string): string => join(r, DAILY_DIR, 'state.json');

export function readState(r = root()): StateFile {
  try {
    return JSON.parse(readFileSync(statePath(r), 'utf8')) as StateFile;
  } catch {
    return {};
  }
}
function writeState(s: StateFile, r = root()): void {
  mkdirSync(join(r, DAILY_DIR), { recursive: true });
  const tmp = `${statePath(r)}.tmp`;
  writeFileSync(tmp, JSON.stringify(s, null, 1));
  renameSync(tmp, statePath(r));
}

/** 束の名前（batch-x1-001.json）から接頭辞（batch-x1-）を取り出す。短い接頭辞が長い接頭辞を含む時は短い方だけ残す */
export function prefixesOf(names: string[]): string[] {
  const set = new Set<string>();
  for (const n of names) {
    const m = /^(batch-(?:.*-)?)\d+\.json$/.exec(n);
    if (m) set.add(m[1]);
  }
  const all = [...set].sort();
  return all.filter((p) => !all.some((q) => q !== p && p.startsWith(q)));
}

/** その接頭辞の分析入力（束ファイル）の中身から作る指紋 */
export function inputSig(prefix: string, r = root()): string {
  const dir = join(r, RUNNER_STAGES.analyze.bundleDir);
  const h = createHash('sha256');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith('.json')).sort() : [];
  for (const f of files) h.update(`${f}\n${readFileSync(join(dir, f), 'utf8')}\n`);
  return `${files.length}:${h.digest('hex').slice(0, 16)}`;
}

export function shouldRun(prefix: string, force: boolean, r = root()): { run: boolean; reason: string } {
  if (force) return { run: true, reason: '強制（--force）' };
  const prev = readState(r)[prefix];
  if (!prev) return { run: true, reason: '初回' };
  if (prev.status !== 'DONE') return { run: true, reason: `前回は ${prev.status}（続きから）` };
  if (prev.inputSig !== inputSig(prefix, r)) return { run: true, reason: '入力の束が前回完了時から変わった' };
  return { run: false, reason: '前回完了と入力が同じ（SKIPPED_SAME_INPUT）' };
}

const runCase = (prefix: string): string => `${RUN_CASE_PREFIX}${prefix.replace(/-$/, '')}`;
const nowIso = (): string => new Date().toISOString();

function history(line: Record<string, unknown>, r = root()): void {
  mkdirSync(join(r, DAILY_DIR), { recursive: true });
  appendFileSync(join(r, DAILY_DIR, 'runs.jsonl'), `${JSON.stringify({ at: nowIso(), ...line })}\n`);
}

export function begin(prefix: string, runId: string, r = root()): PrefixState | undefined {
  const s = readState(r);
  const prev = s[prefix];
  if (prev?.status === 'RUNNING') {
    // 前回の実行は終わりを記録せずに消えた（kill・停電など）。台帳と履歴に残して続きから回す
    const text = `前回の実行（${prev.runId ?? '不明'}）は完了を記録せずに中断していた。続きから再開する`;
    appendRecord({ caseId: runCase(prefix), stage: 'ANALYZE', status: 'FAILED', reasonCode: 'RUN_ABORTED', reasonText: text, nextAction: '自動で再開（run-daily.sh）', actor: 'run-daily.sh', finishedAt: nowIso() });
    history({ prefix, runId: prev.runId, outcome: 'INTERRUPTED', text }, r);
    s[prefix] = { ...prev, status: 'INTERRUPTED', reason: text };
  }
  s[prefix] = { status: 'RUNNING', runId, startedAt: nowIso() };
  writeState(s, r);
  return prev;
}

const instructionDir = (stage: StageName): string => `data/runner/instructions/${stage}`;

/** パイプラインが非0で止まった時、runner の束の状態から「待ち／保留／失敗」を決める。分析と監査を見る */
export function classify(prefix: string, r = root()): { outcome: Outcome; text: string } {
  const stages: { stage: StageName; prefix: string }[] = [{ stage: 'analyze', prefix }];
  const tagFile = join(r, 'data/pipeline', `${prefix.replace(/-$/, '')}.audit-tag`);
  if (existsSync(tagFile)) stages.push({ stage: 'audit', prefix: `${readFileSync(tagFile, 'utf8').trim()}*` });
  const waiting: BundleInfo[] = [];
  const held: BundleInfo[] = [];
  const places = new Set<string>();
  for (const st of stages) {
    for (const b of inspect({ root: r, stage: st.stage, prefix: st.prefix })) {
      if (b.status === 'WAITING' || b.status === 'READY_TO_ACCEPT') { waiting.push(b); places.add(instructionDir(st.stage)); }
      if (b.status === 'HOLD') held.push(b);
    }
  }
  if (waiting.length) {
    return { outcome: 'WAITING_AGENT', text: `サブエージェント待ち ${waiting.length} 束（指示書: ${[...places].join(', ')}）。結果を data/runner/inbox/ に置くと次回の実行で続きから進む${held.length ? `。ほかに保留 ${held.length} 束` : ''}` };
  }
  if (held.length) {
    return { outcome: 'HOLD', text: `保留 ${held.length} 束（${held.slice(0, 3).map((b) => `${b.name}: ${b.lastRejections.map((x) => x.code).join('/') || '理由なし'}`).join(', ')}）。人の判断後に runner の release で解除` };
  }
  return { outcome: 'FAILED', text: 'パイプラインが失敗（ログを確認）' };
}

/** 結果を状態・履歴・台帳に書く。DONE/待ちの時は、この実行の途中で付いた FAILED/HOLD を解いた状態にする */
export function finish(prefix: string, runId: string, outcome: Outcome, text: string, exitCode: number | undefined, r = root()): void {
  const s = readState(r);
  const finishedAt = nowIso();
  s[prefix] = {
    status: outcome, runId, startedAt: s[prefix]?.startedAt, finishedAt, reason: text,
    ...(outcome === 'DONE' ? { inputSig: inputSig(prefix, r) } : {}),
  };
  writeState(s, r);
  history({ prefix, runId, outcome, text, exitCode }, r);
  const caseId = runCase(prefix);
  if (outcome === 'FAILED' || outcome === 'HOLD') {
    appendRecord({ caseId, stage: lastRunStage(caseId), status: outcome, reasonCode: 'RUN_ABORTED', reasonText: text, nextAction: outcome === 'HOLD' ? '人の判断（runner の release）' : '原因を直して次回の実行を待つ', actor: 'run-daily.sh', finishedAt });
    return;
  }
  // run-pipeline.sh は待ちの時も FAILED を残す。定期実行では想定内の状態なので、止まった扱いから外す
  const cur = new Map<Stage, ReturnType<typeof readCaseRecords>[number]>();
  for (const rec of readCaseRecords(caseId)) cur.set(rec.stage, rec);
  let wrote = false;
  for (const rec of cur.values()) {
    if (rec.status === 'FAILED' || rec.status === 'HOLD') {
      wrote = true;
      appendRecord({ caseId, stage: rec.stage, status: outcome === 'DONE' ? 'DONE' : 'PENDING', reasonText: text, nextAction: outcome === 'DONE' ? undefined : 'サブエージェントの結果を置く', actor: 'run-daily.sh', finishedAt });
    }
  }
  if (outcome === 'DONE') appendRecord({ caseId, stage: 'SELECT', status: 'DONE', reasonText: text, actor: 'run-daily.sh', finishedAt });
  else if (!wrote) appendRecord({ caseId, stage: lastRunStage(caseId), status: 'PENDING', reasonText: text, nextAction: 'サブエージェントの結果を置く', actor: 'run-daily.sh', finishedAt });
}

function lastRunStage(caseId: string): Stage {
  const last = readCaseRecords(caseId).at(-1)?.stage;
  return last && (STAGES as readonly string[]).includes(last) ? last : 'ANALYZE';
}

function main(): void {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const val = (k: string): string | undefined => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const prefix = val('--prefix') ?? '';
  switch (cmd) {
    case 'prefixes': {
      const dir = join(root(), RUNNER_STAGES.analyze.bundleDir);
      console.log(prefixesOf(existsSync(dir) ? readdirSync(dir) : []).join('\n'));
      return;
    }
    case 'plan': {
      const p = shouldRun(prefix, args.includes('--force'));
      console.log(p.reason);
      process.exit(p.run ? 0 : 10);
      return;
    }
    case 'begin':
      begin(prefix, val('--run-id') ?? 'run');
      return;
    case 'classify': {
      const c = classify(prefix);
      console.log(`${c.outcome}\t${c.text}`);
      return;
    }
    case 'finish':
      finish(prefix, val('--run-id') ?? 'run', (val('--outcome') ?? 'FAILED') as Outcome, val('--text') ?? '', val('--exit') ? Number(val('--exit')) : undefined);
      return;
    default:
      console.error('使い方: daily-state.ts <prefixes|plan|begin|classify|finish> ...');
      process.exit(2);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
