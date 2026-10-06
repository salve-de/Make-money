/**
 * 状態台帳（事例 × 段階）。止まった場所と理由を残す。
 * 追記型: data/pipeline/ledger/<事例ID>.jsonl に1行1記録で足していく。書き換え・削除はしない。
 * 1回の appendFileSync（O_APPEND の1回の write）で1行を足すので、複数の実行が同時に書いても行が混ざらない。
 * 現在の状態 = その事例・その段階の最後の行。
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';

export const LEDGER_DIR = 'data/pipeline/ledger';
/** 実行全体の失敗（どの事例にも紐づかない停止）を入れる事例ID */
export const RUN_CASE_PREFIX = '_run:';

export const STAGES = ['VERIFY', 'ANALYZE', 'MERGE', 'AUDIT', 'LEAD', 'IMAGE', 'SELECT', 'PUBLISH', 'READBACK'] as const;
export type Stage = (typeof STAGES)[number];
export const STATUSES = ['PENDING', 'RUNNING', 'DONE', 'HOLD', 'FAILED', 'SKIPPED_SAME_INPUT'] as const;
export type Status = (typeof STATUSES)[number];
/** 止まっている（人か次の実行の判断待ち）状態 */
export const STUCK_STATUSES: readonly Status[] = ['HOLD', 'FAILED'];

/** 止まった理由。reasonText には人が読める詳細を付ける。reasonText を書く側は日本語で書く */
export const REASON_CODES = {
  NO_SOURCE_TEXT: '出典の本文が無い',
  VERIFY_UNRESOLVED: '出典との照合が済んでいない',
  ANALYSIS_REJECTED: '推論が機械検査で落ちた',
  AUDIT_REJECTED: '監査役の出力が機械検査で落ちた',
  AUDIT_BLOCK: '監査で止められた',
  LEAD_NOT_PASSED: 'リード文が審査に通っていない',
  NO_IMAGE: '使ってよい画像が無い',
  RIGHTS_BLOCKED: '権利・規約で表示できない',
  THIN: 'データが少ない',
  NO_NEW_EVIDENCE: '新しい根拠が無く、書き直しを止めた',
  CI_FAILED: '自動テストが通らない',
  REVIEW_OPEN: '未解決のレビュー指摘がある',
  READBACK_MISMATCH: '本番の読み戻しが公開内容と合わない',
  // 設計書の12種に加えた追加分
  RUN_ABORTED: '実行が途中で止まった（原因は理由欄）',
} as const;
export type ReasonCode = keyof typeof REASON_CODES;
export const REASON_CODE_LIST = Object.keys(REASON_CODES) as ReasonCode[];

export interface LedgerRecord {
  caseId: string;
  stage: Stage;
  status: Status;
  inputHash?: string;
  ruleVersion?: string;
  actor?: string;
  startedAt?: string;
  finishedAt?: string;
  reasonCode?: ReasonCode;
  reasonText?: string;
  attempts: number;
  nextAction?: string;
  /** 追記した時刻 */
  at: string;
}

export type LedgerInput = Omit<LedgerRecord, 'at' | 'attempts'> & { attempts?: number };

const fileOf = (dir: string, caseId: string) => `${dir}/${encodeURIComponent(caseId)}.jsonl`;

export function validateRecord(r: Partial<LedgerRecord>): string | null {
  if (!r.caseId) return 'caseId が空';
  if (!(STAGES as readonly string[]).includes(r.stage ?? '')) return `未知の段階: ${r.stage}`;
  if (!(STATUSES as readonly string[]).includes(r.status ?? '')) return `未知の状態: ${r.status}`;
  if (r.reasonCode !== undefined && !(REASON_CODE_LIST as string[]).includes(r.reasonCode)) return `未知の理由コード: ${r.reasonCode}`;
  if ((r.status === 'HOLD' || r.status === 'FAILED') && !r.reasonCode) return `${r.status} には理由コードが必要`;
  return null;
}

export function readCaseRecords(caseId: string, dir = LEDGER_DIR): LedgerRecord[] {
  const f = fileOf(dir, caseId);
  return existsSync(f) ? parseLines(readFileSync(f, 'utf8')) : [];
}

function parseLines(text: string): LedgerRecord[] {
  const out: LedgerRecord[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line) as LedgerRecord); } catch { /* 途中で切れた行は無視（追記型なので後続の行は無事） */ }
  }
  return out;
}

/** 1件追記する。attempts を省くと: RUNNING なら前回の attempts+1、それ以外は前回の値を引き継ぐ */
export function appendRecord(input: LedgerInput, dir = LEDGER_DIR, now = new Date()): LedgerRecord {
  const bad = validateRecord(input);
  if (bad) throw new Error(`台帳に書けない記録: ${bad}`);
  mkdirSync(dir, { recursive: true });
  let attempts = input.attempts;
  if (attempts === undefined) {
    const prev = readCaseRecords(input.caseId, dir).filter((r) => r.stage === input.stage).at(-1);
    attempts = (prev?.attempts ?? 0) + (input.status === 'RUNNING' ? 1 : 0);
  }
  const rec: LedgerRecord = { ...input, attempts, at: now.toISOString() };
  appendFileSync(fileOf(dir, input.caseId), `${JSON.stringify(rec)}\n`);
  return rec;
}

/** 全事例の現在の状態（事例×段階の最後の記録） */
export function currentStates(dir = LEDGER_DIR): LedgerRecord[] {
  if (!existsSync(dir)) return [];
  const out: LedgerRecord[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.jsonl')).sort()) {
    const last = new Map<Stage, LedgerRecord>();
    for (const r of parseLines(readFileSync(`${dir}/${f}`, 'utf8'))) last.set(r.stage, r);
    out.push(...last.values());
  }
  return out;
}

export interface StatusSummary {
  /** 段階 → 状態 → 件数 */
  table: Record<string, Record<string, number>>;
  /** 止まっている（HOLD / FAILED）事例の最新状態 */
  stuck: LedgerRecord[];
  total: number;
}

export function summarize(states: LedgerRecord[]): StatusSummary {
  const table: Record<string, Record<string, number>> = {};
  for (const s of STAGES) table[s] = Object.fromEntries(STATUSES.map((t) => [t, 0]));
  for (const r of states) table[r.stage][r.status] += 1;
  const stuck = states.filter((r) => STUCK_STATUSES.includes(r.status)).sort((a, b) => a.stage.localeCompare(b.stage) || a.caseId.localeCompare(b.caseId));
  return { table, stuck, total: new Set(states.map((r) => r.caseId)).size };
}

const STATUS_JA: Record<Status, string> = { PENDING: '待ち', RUNNING: '実行中', DONE: '完了', HOLD: '保留', FAILED: '失敗', SKIPPED_SAME_INPUT: '入力同じで省略' };

/** 日本語の表示文（段階×状態の件数と、止まっている事例の一覧） */
export function renderStatus(sum: StatusSummary): string {
  const lines: string[] = [`状態台帳: ${sum.total} 件の事例／止まっている ${sum.stuck.length} 件`, '', `段階 ${STATUSES.map((s) => STATUS_JA[s]).join(' / ')}`];
  for (const stage of STAGES) {
    const row = sum.table[stage];
    if (STATUSES.every((s) => row[s] === 0)) continue;
    lines.push(`${stage.padEnd(9)} ${STATUSES.map((s) => String(row[s]).padStart(4)).join(' ')}`);
  }
  if (sum.stuck.length) {
    lines.push('', '止まっている事例:');
    for (const r of sum.stuck) {
      const label = r.reasonCode ? REASON_CODES[r.reasonCode] : '理由なし';
      lines.push(`- ${r.caseId} [${r.stage}] ${STATUS_JA[r.status]} ${r.reasonCode ?? ''}（${label}）${r.reasonText ? `: ${r.reasonText}` : ''}${r.attempts ? ` 試行${r.attempts}回` : ''}${r.nextAction ? ` → 次: ${r.nextAction}` : ''}`);
    }
  }
  return lines.join('\n');
}
