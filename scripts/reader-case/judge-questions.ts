/**
 * 言い回しだけを AI に聞く小さな問い。1回の呼び出しで 1文・1観点だけを「はい／いいえ／分からない」で聞く。
 * 判定役は、文を書いた AI とは別の系統（書き手が claude なら codex、逆も同じ）。軽いモデルで足りる。
 * 同じ（問い・文・判定役）の答えは data/pipeline/reader-judge-cache.json に残し、直していない文は2度聞かない。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Caller } from './agent-call';
import type { Flag } from './judge-checks';
import type { Kind } from './judge-lib';

export type Answer = 'yes' | 'no' | 'unknown';
export interface Question {
  id: 'cutoff' | 'natural' | 'sense';
  kind: Kind;
  /** 聞く文。{文} は渡す1文に置き換わらず、文は別に渡す */
  ask: string;
  /** この答えのとき、引っかかるとみなす */
  flagOn: 'yes' | 'no';
  reason: string;
}

export const QUESTIONS: readonly Question[] = [
  { id: 'cutoff', kind: 'a', ask: '次の文は、途中で切れている、または文として終わっていませんか。', flagOn: 'yes', reason: '文が途中で切れているように読める' },
  { id: 'natural', kind: 'a', ask: '次の文は、日本語として不自然、または外国語の直訳のように読めませんか。', flagOn: 'yes', reason: '日本語として不自然、または直訳調に読める' },
  { id: 'sense', kind: 'f', ask: '次の文は、前後の文を知らない人が1回読んで、言っていることが取れますか。', flagOn: 'no', reason: '前後を知らない人が1回読んで意味が取れない' },
];

export const SYSTEM = [
  'あなたは日本語の文を読む人です。渡された1文について、与えられた1つの問いにだけ答えます。',
  '答えは次のどれか1語です: はい／いいえ／分からない。迷う時や、文だけでは決められない時は「分からない」。',
  '文の内容が正しいかどうかは見ません。言い回しだけを見ます。',
  '返答は JSON を1つだけ: {"answer":"はい|いいえ|分からない","why":"20字以内の理由"}',
].join('\n');

export function parseAnswer(text: string): { answer: Answer; why: string } {
  const t = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  let a = ''; let why = '';
  try {
    const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)) as { answer?: unknown; why?: unknown };
    a = String(j.answer ?? ''); why = String(j.why ?? '');
  } catch { a = t.slice(0, 8); }
  if (/^(はい|yes)/i.test(a)) return { answer: 'yes', why };
  if (/^(いいえ|no)/i.test(a)) return { answer: 'no', why };
  if (/分からない|わからない|unknown/i.test(a)) return { answer: 'unknown', why };
  throw new Error(`答えを読めない: ${a.slice(0, 30)}`);
}

export interface QuestionCache { get(key: string): { answer: Answer; why: string } | undefined; set(key: string, v: { answer: Answer; why: string }): void; save(): void }

export function fileCache(file: string): QuestionCache {
  let data: Record<string, { answer: Answer; why: string }> = {};
  try { if (existsSync(file)) data = JSON.parse(readFileSync(file, 'utf8')); } catch { data = {}; }
  return {
    get: (k) => data[k],
    set: (k, v) => { data[k] = v; },
    save: () => { try { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(data)); } catch { /* 記録できなくても止めない */ } },
  };
}
export const memoryCache = (): QuestionCache => { const m = new Map<string, { answer: Answer; why: string }>(); return { get: (k) => m.get(k), set: (k, v) => { m.set(k, v); }, save: () => undefined }; };

export interface AskStats { calls: number; cached: number; seconds: number; cost: number; errors: number }
export const newStats = (): AskStats => ({ calls: 0, cached: 0, seconds: 0, cost: 0, errors: 0 });

/** 1文・1観点を聞く。読めない返答は1回だけ聞き直し、それでも読めなければ「分からない」（=引っかけない）として数える */
export async function askOne(caller: Caller, label: string, q: Question, sentence: string, judgeLabel: string, cache: QuestionCache, stats: AskStats): Promise<{ answer: Answer; why: string }> {
  const key = createHash('sha1').update(`${judgeLabel}\n${q.id}\n${sentence}`).digest('hex');
  const hit = cache.get(key);
  if (hit) { stats.cached += 1; return hit; }
  let last = '';
  for (let i = 0; i < 2; i += 1) {
    try {
      const res = await caller({ system: SYSTEM, user: `問い: ${q.ask}\n文: ${sentence}${i ? `\n\n前回の返答は読めなかった（${last}）。JSON だけを返す。` : ''}`, label });
      stats.calls += 1; stats.seconds += res.seconds; stats.cost += res.costUsd ?? 0;
      const v = parseAnswer(res.text);
      cache.set(key, v);
      return v;
    } catch (e) { last = (e as Error).message.slice(0, 60); stats.errors += 1; }
  }
  return { answer: 'unknown', why: `返答を読めなかった: ${last}` };
}

/** 1つの行に全部の問いを聞いて、引っかかる指摘にする（並列の呼び出しは呼び出し側で絞る） */
export async function askRow(caller: Caller, id: string, rowId: string, text: string, judgeLabel: string, cache: QuestionCache, stats: AskStats): Promise<Flag[]> {
  const out: Flag[] = [];
  for (const q of QUESTIONS) {
    const r = await askOne(caller, `${id} ${rowId} ${q.id}`, q, text, judgeLabel, cache, stats);
    if (r.answer === q.flagOn) out.push({ rowId, kind: q.kind, code: `ai-${q.id}`, reason: `${q.reason}${r.why ? `（${r.why}）` : ''}`, source: 'ai' });
  }
  return out;
}
