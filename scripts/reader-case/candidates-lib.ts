/**
 * 新しい事例の候補（data/candidates/queue.jsonl）を読み書きする部品。case:discover と case:research が使う。
 *
 * 候補は1行1件の JSON。状態は次のどれか:
 *   queued    調査待ち
 *   done      調査記録を作り、一覧（entities-index.json）に入れた
 *   skipped   見送り（理由は skipReason。記録は作っていない、または作ったが取り込まない）
 * 重複の判定は社名（entity-identity.mjs の正規化）と公式サイトのドメインで行う。照らす先:
 *   既存の事例（entities-index.json・collected-registry.json・seed-targets.json・entity-additions/）、
 *   予約の一覧（CLAIMED_TARGETS.txt）、queue 自身。
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { entityDomain, normalizeEntityName } from '../pipeline/entity-identity.mjs';

export const QUEUE_REL = 'data/candidates/queue.jsonl';
export const TIMING_REL = 'data/pipeline/case-run.jsonl';
export const CLAIMED_REL = 'data/CLAIMED_TARGETS.txt';

export interface CandidateSource { url: string; quote: string; what?: string; /** 取得して引用が本文にあった: ok / 取れなかった: unreachable */ check?: 'ok' | 'unreachable'; rightsOk?: boolean }
export interface Candidate {
  id: string;
  name: string;
  /** 公式サイト（https://...） */
  url: string;
  domain: string;
  /** 数字の出典（1つ以上）。quote は数字を含む原文の引用 */
  sources: CandidateSource[];
  /** 見つけた理由を1行 */
  reason: string;
  /** 数字の年（出来事の年） */
  numberYear?: number;
  /** 稼ぎ方の分類（例「ソフトの使用許可を売る」）。ほかの事例と違うかの判断に使う */
  modelTag?: string;
  /** 0〜100。数字の確かさ・新しさ・稼ぎ方の違いで付ける */
  priority: number;
  scores: { certainty: number; recency: number; novelty: number };
  status: 'queued' | 'done' | 'skipped';
  skipReason?: string;
  discoveredAt: string;
  discoverRunId: string;
  researchedAt?: string;
  researchRunId?: string;
  entityId?: string;
  generation?: number;
}

export const nowIso = (): string => new Date().toISOString();

export function slugify(name: string): string {
  const s = name.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return s || `c${createHash('sha1').update(name).digest('hex').slice(0, 8)}`;
}

export function candidateId(name: string, domain: string): string {
  return `cand_${slugify(name)}_${createHash('sha1').update(domain || name).digest('hex').slice(0, 6)}`;
}

// ---- queue の読み書き --------------------------------------------------------------------

export function readQueue(root: string): Candidate[] {
  const f = join(root, QUEUE_REL);
  if (!existsSync(f)) return [];
  return readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as Candidate);
}

export function writeQueue(root: string, rows: readonly Candidate[]): void {
  const f = join(root, QUEUE_REL);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(`${f}.tmp`, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
  renameSync(`${f}.tmp`, f);
}

/** 並行して動く別の命令の更新を失わないよう、読み直して該当の候補だけを書き換える */
export function updateCandidates(root: string, patch: (rows: Candidate[]) => void): void {
  const rows = readQueue(root);
  patch(rows);
  writeQueue(root, rows);
}

// ---- 重複の判定 --------------------------------------------------------------------------

export interface DedupIndex {
  /** 重複なら理由を返す。無ければ undefined */
  check(name: string, url: string): string | undefined;
  /** 重複の照合先に足す（同じ実行の中で同じ候補を二重に足さない） */
  add(name: string, url: string, from: string): void;
  size: { names: number; domains: number };
}

interface Named { name?: unknown; url?: unknown; officialUrl?: unknown; domain?: unknown }

function readJsonSafe<T>(file: string, fallback: T): T {
  try { return JSON.parse(readFileSync(file, 'utf8')) as T; } catch { return fallback; }
}

/** 予約の一覧の1行から、社名と公式サイトのドメインを取り出す。「社名 — domain [CLAIMED:...]」「社名 (TICKER)」など書き方がまちまち */
export function parseClaimedLine(line: string): { names: string[]; domains: string[] } {
  const t = line.trim();
  if (!t || t.startsWith('#')) return { names: [], domains: [] };
  const body = t.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
  const domains = [...body.matchAll(/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:\/\S*)?/gi)].map((m) => entityDomain(m[1]!)).filter(Boolean);
  const names = new Set<string>();
  for (const part of body.split(/\s+[—–-]\s+|\s*\|\s*/)) {
    const p = part.trim();
    if (!p || /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}\S*$/i.test(p)) continue;
    names.add(p);
    const noParen = p.replace(/\s*[（(][^）)]*[）)]/g, '').trim();
    if (noParen) names.add(noParen);
  }
  return { names: [...names], domains };
}

export function buildDedupIndex(root: string, queue: readonly Candidate[] = readQueue(root)): DedupIndex {
  const names = new Map<string, string>();
  const domains = new Map<string, string>();
  const addName = (n: unknown, from: string): void => { const k = normalizeEntityName(n); if (k.length >= 2 && !names.has(k)) names.set(k, from); };
  const addDomain = (u: unknown, from: string): void => { const d = entityDomain(u); if (d && !domains.has(d)) domains.set(d, from); };
  const addRecord = (r: Named, from: string): void => { addName(r.name, from); addDomain(r.url, from); addDomain(r.officialUrl, from); addDomain(r.domain, from); };

  const index = readJsonSafe<Named[]>(join(root, 'data/entities-index.json'), []);
  for (const r of index) addRecord(r, '既存の事例');
  for (const r of readJsonSafe<Named[]>(join(root, 'data/collected-registry.json'), [])) addRecord(r, '登録簿');
  for (const r of readJsonSafe<Named[]>(join(root, 'data/seed-targets.json'), [])) addRecord(r, 'seed-targets');
  const addDir = join(root, 'data/entity-additions');
  if (existsSync(addDir)) {
    for (const f of readdirSync(addDir).filter((x) => x.endsWith('.json'))) {
      const file = readJsonSafe<{ records?: { record?: Named }[] }>(join(addDir, f), {});
      for (const r of file.records ?? []) if (r.record) addRecord(r.record, `取り込み待ちの事例（${f}）`);
    }
  }
  const claimed = join(root, CLAIMED_REL);
  if (existsSync(claimed)) {
    for (const line of readFileSync(claimed, 'utf8').split('\n')) {
      const p = parseClaimedLine(line);
      for (const n of p.names) addName(n, '予約の一覧（CLAIMED_TARGETS）');
      for (const d of p.domains) if (!domains.has(d)) domains.set(d, '予約の一覧（CLAIMED_TARGETS）');
    }
  }
  for (const c of queue) addRecord({ name: c.name, url: c.url }, `候補の一覧（${c.status}）`);

  return {
    check(name, url) {
      const d = entityDomain(url);
      if (d && domains.has(d)) return `同じ公式サイト（${d}）が${domains.get(d)}にある`;
      const k = normalizeEntityName(name);
      if (k && names.has(k)) return `同じ社名（${name}）が${names.get(k)}にある`;
      return undefined;
    },
    add(name, url, from) { addName(name, from); addDomain(url, from); },
    size: { names: names.size, domains: domains.size },
  };
}

// ---- 候補の検査と優先度 --------------------------------------------------------------------

const clamp = (n: unknown, lo: number, hi: number): number => { const x = Number(n); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : lo; };

/** 数字の年から新しさ（1〜5）。当年と前年が5 */
export function recencyScore(year: number | undefined, nowYear = new Date().getFullYear()): number {
  if (!year || !Number.isInteger(year)) return 1;
  const age = nowYear - year;
  if (age <= 1) return 5; if (age === 2) return 4; if (age === 3) return 3; if (age <= 5) return 2; return 1;
}

/** 優先度（0〜100）。数字の確かさ50%・新しさ25%・稼ぎ方の違い25% */
export function priorityOf(s: { certainty: number; recency: number; novelty: number }): number {
  return Math.round(((s.certainty * 0.5 + s.recency * 0.25 + s.novelty * 0.25) / 5) * 100);
}

export interface RawCandidate { name?: unknown; officialUrl?: unknown; sources?: unknown; reason?: unknown; numberYear?: unknown; certainty?: unknown; novelty?: unknown; modelTag?: unknown }

/** AI の出力の1件を検査して Candidate にする。足りなければ理由を返す */
export function toCandidate(raw: RawCandidate, runId: string, now = nowIso(), nowYear = new Date().getFullYear()): { ok: true; candidate: Candidate } | { ok: false; reason: string } {
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return { ok: false, reason: '社名が無い' };
  const url = typeof raw.officialUrl === 'string' ? raw.officialUrl.trim() : '';
  const domain = entityDomain(url);
  if (!/^https?:\/\//i.test(url) || !domain) return { ok: false, reason: `公式サイトの URL が不正（${name}）` };
  const sources: CandidateSource[] = [];
  for (const s of Array.isArray(raw.sources) ? raw.sources : []) {
    const o = s as { url?: unknown; quote?: unknown; what?: unknown };
    const u = typeof o.url === 'string' ? o.url.trim() : '';
    const q = typeof o.quote === 'string' ? o.quote.trim() : '';
    if (!/^https?:\/\//i.test(u) || !entityDomain(u) || !q) continue;
    if (!sources.some((x) => x.url === u)) sources.push({ url: u, quote: q, ...(typeof o.what === 'string' && o.what.trim() ? { what: o.what.trim() } : {}) });
  }
  if (!sources.length) return { ok: false, reason: `数字の出典（URL と原文の引用）が無い（${name}）` };
  const reason = typeof raw.reason === 'string' ? raw.reason.trim().replace(/\s+/g, ' ') : '';
  if (!reason) return { ok: false, reason: `見つけた理由が無い（${name}）` };
  const year = Number(raw.numberYear);
  const numberYear = Number.isInteger(year) && year >= 1990 && year <= nowYear ? year : undefined;
  const scores = { certainty: clamp(raw.certainty, 1, 5), recency: recencyScore(numberYear, nowYear), novelty: clamp(raw.novelty, 1, 5) };
  return {
    ok: true,
    candidate: {
      id: candidateId(name, domain), name, url, domain, sources, reason,
      ...(numberYear ? { numberYear } : {}),
      ...(typeof raw.modelTag === 'string' && raw.modelTag.trim() ? { modelTag: raw.modelTag.trim() } : {}),
      priority: priorityOf(scores), scores, status: 'queued', discoveredAt: now, discoverRunId: runId,
    },
  };
}

/** AI の返答から最初の JSON（オブジェクトか配列）を取り出す。コードフェンスや前置きがあっても拾う。無ければ undefined */
export function extractJson(text: string): unknown {
  const t = text.replace(/```(?:json)?/gi, '');
  const starts = [t.indexOf('{'), t.indexOf('[')].filter((i) => i >= 0);
  if (!starts.length) return undefined;
  const from = Math.min(...starts);
  const open = t[from]!; const close = open === '{' ? '}' : ']';
  for (let end = t.lastIndexOf(close); end > from; end = t.lastIndexOf(close, end - 1)) {
    try { return JSON.parse(t.slice(from, end + 1)); } catch { /* もう少し手前の閉じ括弧で試す */ }
  }
  return undefined;
}

// ---- 段ごとの時間の記録 --------------------------------------------------------------------

export interface StageTiming { runId: string; stage: string; startedAt: string; seconds: number; ids: number; failed: number; ok: boolean; detail?: Record<string, unknown> }
/** data/pipeline/case-run.jsonl に1行足す（case:run と同じ形） */
export function logStage(root: string, rec: StageTiming): void {
  try {
    const f = join(root, TIMING_REL);
    mkdirSync(dirname(f), { recursive: true });
    appendFileSync(f, `${JSON.stringify(rec)}\n`);
  } catch { /* 記録できなくても本体は止めない */ }
}

/** 段の時間を測って記録する */
export async function timed<T>(root: string, runId: string, stage: string, ids: number, fn: () => Promise<{ value: T; failed?: number; ok?: boolean; detail?: Record<string, unknown> }>, now: () => number = Date.now): Promise<T> {
  const t0 = now(); const startedAt = new Date(t0).toISOString();
  try {
    const r = await fn();
    logStage(root, { runId, stage, startedAt, seconds: Math.round((now() - t0) / 100) / 10, ids, failed: r.failed ?? 0, ok: r.ok ?? true, ...(r.detail ? { detail: r.detail } : {}) });
    return r.value;
  } catch (e) {
    logStage(root, { runId, stage, startedAt, seconds: Math.round((now() - t0) / 100) / 10, ids, failed: ids, ok: false, detail: { error: String(e).slice(0, 300) } });
    throw e;
  }
}

/** 予約の一覧（CLAIMED_TARGETS.txt）に社名を1行足す。idx（既存・予約・取り込み待ちを照らした索引）にまだ無い時だけ足す。足したら true */
export function claimTarget(root: string, name: string, url: string, tag: string, today: string, idx: DedupIndex): boolean {
  if (idx.check(name, url)) return false;
  appendFileSync(join(root, CLAIMED_REL), `${name} — ${entityDomain(url)} [CLAIMED:${tag} @ ${today}]\n`);
  idx.add(name, url, '予約の一覧（CLAIMED_TARGETS）');
  return true;
}
