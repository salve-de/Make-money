/**
 * 事例の文を書く段の入力（集める層の記録）を組む。画面の層の文（data/case-pages、tagline・description）は入れない。
 *   身元（名前・創業者・公式サイト）／集めた事実（文・出典・時点）／分からなかったこと／出典の本文（取得済みの写し。無ければ取りに行く）
 * AI はファイルを開けないので、出典の本文もここで文字にして渡す。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { cachePath, MIN_TEXT, type SourceCacheRecord } from '../reader-case/verify-lib';

export interface CollectedFact { text: string; sourceUrl?: string; statedAt?: string | null; eventPeriod?: string; attribution?: string }
export interface CollectedSource { no: number; url: string; text: string; via?: string; error?: string }
export interface CaseInput {
  id: string;
  name: string;
  founder?: string;
  officialUrl?: string;
  facts: CollectedFact[];
  unknowns: string[];
  sources: CollectedSource[];
}

interface RawRecord {
  id: string; name: string; founder?: string; url?: string; officialUrl?: string;
  facts?: Array<{ text?: string; sourceUrl?: string; statedAt?: string | null; eventPeriod?: string; attribution?: string }>;
  evidenceCards?: Array<{ url?: string }>;
  unknownsNotes?: string[];
}

/** 集めた記録を探す。新しい追加（data/entity-additions）を先に、無ければ目録（data/entities-index.json） */
export function findRecord(root: string, id: string): RawRecord | undefined {
  const dir = join(root, 'data/entity-additions');
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
      try {
        const d = JSON.parse(readFileSync(join(dir, f), 'utf8')) as { records?: Array<{ record?: RawRecord }> };
        const hit = d.records?.find((r) => r.record?.id === id)?.record;
        if (hit) return hit;
      } catch { /* 読めない追加は飛ばす */ }
    }
  }
  const idx = join(root, 'data/entities-index.json');
  if (existsSync(idx)) {
    const list = JSON.parse(readFileSync(idx, 'utf8')) as RawRecord[];
    return list.find((r) => r.id === id);
  }
  return undefined;
}

const norm = (u: string) => u.trim().replace(/\/+$/, '');

/** 記録に出てくる出典の URL（事実の出典 → 根拠カード → 公式サイトの順、重複なし） */
export function sourceUrlsOf(r: RawRecord): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (u?: string) => { if (u && /^https?:\/\//.test(u) && !seen.has(norm(u))) { seen.add(norm(u)); out.push(u.trim()); } };
  for (const f of r.facts ?? []) add(f.sourceUrl);
  for (const c of r.evidenceCards ?? []) add(c.url);
  add(r.officialUrl);
  return out;
}

export type Fetcher = (url: string) => Promise<SourceCacheRecord>;

/** 出典の本文を、取得済みの写し（root と cacheDirs）から読む。無ければ fetcher で取り、root の写しに残す */
export async function sourceText(root: string, url: string, cacheDirs: readonly string[], fetcher?: Fetcher): Promise<SourceCacheRecord | undefined> {
  for (const base of [root, ...cacheDirs]) {
    const p = join(base, cachePath(url));
    if (existsSync(p)) {
      try { const r = JSON.parse(readFileSync(p, 'utf8')) as SourceCacheRecord; if (r.text.length >= MIN_TEXT) return r; } catch { /* 次へ */ }
    }
  }
  if (!fetcher) return undefined;
  const r = await fetcher(url);
  const p = join(root, cachePath(url));
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(r));
  return r;
}

export interface InputOptions { cacheDirs?: readonly string[]; fetcher?: Fetcher; maxSources?: number; maxCharsPerSource?: number }

export async function buildInput(root: string, id: string, opt: InputOptions = {}): Promise<CaseInput> {
  const r = findRecord(root, id);
  if (!r) throw new Error(`集めた記録が無い: ${id}`);
  const urls = sourceUrlsOf(r).slice(0, opt.maxSources ?? 12);
  const max = opt.maxCharsPerSource ?? 12_000;
  const sources: CollectedSource[] = [];
  for (const url of urls) {
    const c = await sourceText(root, url, opt.cacheDirs ?? [], opt.fetcher);
    sources.push({ no: sources.length + 1, url, text: (c?.text ?? '').slice(0, max), via: c?.via, ...(c && c.text.length >= MIN_TEXT ? {} : { error: c?.error ?? '本文を取れなかった' }) });
  }
  return {
    id,
    name: r.name,
    founder: r.founder,
    officialUrl: r.officialUrl ?? r.url,
    facts: (r.facts ?? []).filter((f) => f.text).map((f) => ({ text: f.text!, sourceUrl: f.sourceUrl, statedAt: f.statedAt ?? null, eventPeriod: f.eventPeriod, attribution: f.attribution })),
    unknowns: r.unknownsNotes ?? [],
    sources,
  };
}

/** AI に渡す本文。出典は番号つきで、本文を取れなかった物はそう書く */
export function renderInput(input: CaseInput): string {
  const parts: string[] = [];
  parts.push(`# 事例: ${input.name}`);
  if (input.founder) parts.push(`創業者: ${input.founder}`);
  if (input.officialUrl) parts.push(`公式サイト: ${input.officialUrl}`);
  parts.push('\n## 集めた事実（集める担当の記録。出典の本文と食い違えば本文が正しい）');
  input.facts.forEach((f, i) => parts.push(`${i + 1}. ${f.text}${f.sourceUrl ? `［出典 ${f.sourceUrl}］` : ''}${f.statedAt ? `［時点 ${f.statedAt}］` : f.eventPeriod ? `［時点 ${f.eventPeriod}］` : ''}`));
  if (!input.facts.length) parts.push('（無し。出典の本文から読み取る）');
  if (input.unknowns.length) { parts.push('\n## 集める担当が確かめられなかったこと'); input.unknowns.forEach((u) => parts.push(`- ${u}`)); }
  parts.push('\n## 出典の本文（使える出典はこれだけ。番号をそのまま「数字と出典」の番号に使ってよい）');
  for (const s of input.sources) {
    parts.push(`\n### 出典${s.no}: ${s.url}${s.via === 'wayback' ? '（Wayback の写し）' : ''}`);
    parts.push(s.error ? `（本文を取れなかった: ${s.error}。この出典の中身は使わない）` : s.text);
  }
  return parts.join('\n');
}
