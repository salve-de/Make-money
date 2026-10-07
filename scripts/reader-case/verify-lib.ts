/**
 * 出典本文の照合で使う共通部品。純粋関数とファイルの場所だけを持つ。
 * 主張 = reader の facts と metrics。画面に出る文字はこの2つから作られる。
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { ReaderCase } from '../../src/shared/reader-case';

export const CACHE_DIR = 'data/source-cache';
export const VERIFY_DIR = 'data/verify';
export const VERDICTS_FILE = 'data/reader-verdicts.json';
export const MIN_TEXT = 200; // これ未満は本文が取れなかったものとして扱う

export interface SourceCacheRecord {
  url: string;
  finalUrl?: string;
  status: number;
  fetchedAt: string;
  via: 'direct' | 'wayback';
  text: string;
  error?: string;
  contentType?: string;
}

export interface Claim {
  claimId: string;
  kind: 'fact' | 'metric';
  text: string;
  sourceId: string;
}

export type Verdict = 'SUPPORTED' | 'PARTIAL' | 'NOT_SUPPORTED';

export interface MetricFix {
  measure?: string;
  periodKind?: string;
  period?: string;
  amount?: number;
  currency?: string | null;
  unit?: string | null;
  origin?: string;
  basis?: string | null;
  label?: string | null;
}

export interface VerdictEntry {
  /** HELD=原文照合（source-check.ts）でやり直しの上限まで不合格。画面に出さない（reason に理由） */
  verdict: 'SUPPORTED' | 'PARTIAL' | 'HELD';
  reason?: string;
  quote: string;
  fix?: { text?: string; metric?: MetricFix };
  sourceUrl: string;
  checkedAt: string;
  /** 照合した時点の主張の文。今の主張と違えば判定は無効 */
  claimText: string;
}
export type VerdictsFile = Record<string, Record<string, VerdictEntry>>;

export const urlKey = (url: string): string => createHash('sha256').update(url).digest('hex').slice(0, 16);
export const cachePath = (url: string): string => `${CACHE_DIR}/${urlKey(url)}.json`;

export function readCache(url: string): SourceCacheRecord | undefined {
  const p = cachePath(url);
  if (!existsSync(p)) return undefined;
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as SourceCacheRecord;
  } catch {
    return undefined;
  }
}

export const hasText = (r: SourceCacheRecord | undefined): boolean => !!r && r.text.length >= MIN_TEXT;

type Metric = ReaderCase['metrics'][number];

/** 画面に出る数字の主張を1行にする（measure・period・amount・currency/unit・origin・label/basis） */
export function metricLine(m: Metric): string {
  const parts = [
    `項目=${m.measure}`,
    m.label ? `名前=${m.label}` : '',
    `期間=${m.period}(${m.periodKind})`,
    `金額=${m.amount}${m.currency ? ` ${m.currency}` : m.unit ? ` ${m.unit}` : ''}`,
    `由来=${m.origin}`,
    m.basis ? `基準=${m.basis}` : '',
    m.statedAt ? `記載日=${m.statedAt}` : '',
  ];
  return parts.filter(Boolean).join(' / ');
}

export function claimsOf(reader: ReaderCase): Claim[] {
  return [
    ...reader.facts.map((f): Claim => ({ claimId: f.id, kind: 'fact', text: f.text, sourceId: f.sourceId })),
    ...reader.metrics.map((m): Claim => ({ claimId: m.id, kind: 'metric', text: metricLine(m), sourceId: m.sourceId })),
  ];
}

/** 引用の一致判定用: 全角半角(NFKC)・大小文字・引用符・空白を揃える */
export function normalizeForMatch(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, '')
    .trim();
}

export function quoteInText(quote: string, text: string): boolean {
  const q = normalizeForMatch(quote);
  return q.length > 0 && normalizeForMatch(text).includes(q);
}
