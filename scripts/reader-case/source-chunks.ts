/**
 * 出典本文の全文取り込み。8,000字・12,000字の抜粋上限をやめ、本文をチャンクに分けて全体を分析・照合に渡す。
 * 束（バッチ）の大きさは「事例数」ではなく「チャンク数」で決める（1事例の出典が長くても束が膨らみすぎない）。
 * 純粋関数だけを持つ（ファイル入出力なし）。
 */
import { createHash } from 'node:crypto';

/** 1チャンクの目安の長さ（字）。自然な切れ目（段落→改行→句点）を探して前後に動く */
export const CHUNK_CHARS = Number(process.env.SOURCE_CHUNK_CHARS ?? 8_000);
/** 次のチャンクの冒頭に重ねる直前の本文（字）。切れ目をまたぐ文を取りこぼさないため */
export const CHUNK_OVERLAP = Number(process.env.SOURCE_CHUNK_OVERLAP ?? 300);
/** 1つの束に入れるチャンクの上限。事例1件だけでこれを超える時は、その事例を単独の束にする */
export const MAX_CHUNKS_PER_BATCH = Number(process.env.SOURCE_MAX_CHUNKS_PER_BATCH ?? 20);

export interface Chunk {
  /** 本文での開始位置（重なりを含まない） */
  start: number;
  end: number;
  /** 重なり（直前 CHUNK_OVERLAP 字）を含む、モデルに渡す文字列 */
  text: string;
}

/** 切れ目を size 付近で探す: 後ろ20%の範囲で、段落 → 改行 → 句点の順に最後に現れる位置。無ければ size で切る */
function cutPoint(text: string, from: number, size: number): number {
  const hardEnd = Math.min(from + size, text.length);
  if (hardEnd >= text.length) return text.length;
  const lo = from + Math.floor(size * 0.8);
  const window = text.slice(lo, hardEnd);
  for (const sep of ['\n\n', '\n', '。', '. ']) {
    const i = window.lastIndexOf(sep);
    if (i >= 0) return lo + i + sep.length;
  }
  return hardEnd;
}

/** 本文を漏れなく・重なりなくチャンクに分ける（start/end をつなぐと本文全体になる）。text には重なりを足す */
export function splitIntoChunks(text: string, size = CHUNK_CHARS, overlap = CHUNK_OVERLAP): Chunk[] {
  if (text.length === 0) return [];
  const out: Chunk[] = [];
  let start = 0;
  while (start < text.length) {
    const end = cutPoint(text, start, size);
    out.push({ start, end, text: text.slice(Math.max(0, start - overlap), end) });
    start = end;
  }
  return out;
}

export interface SourceInput {
  sourceId: string;
  url: string;
  publisher: string;
  via?: string;
  /** 本文の全文 */
  text: string;
}

export interface SourceChunkEntry extends Omit<SourceInput, 'text'> {
  /** チャンクの通し番号（1始まり）と総数。1つの出典が複数エントリになる */
  part: number;
  parts: number;
  text: string;
}

/** 出典ごとに全文をチャンクへ分け、分析役・照合役に渡すエントリの並びにする（出典の順・チャンクの順は保つ） */
export function chunkSources(sources: readonly SourceInput[], size = CHUNK_CHARS, overlap = CHUNK_OVERLAP): SourceChunkEntry[] {
  const out: SourceChunkEntry[] = [];
  for (const s of sources) {
    const { text, ...rest } = s;
    const chunks = splitIntoChunks(text, size, overlap);
    chunks.forEach((c, i) => out.push({ ...rest, part: i + 1, parts: chunks.length, text: c.text }));
  }
  return out;
}

/**
 * 事例を、事例数の上限（maxCases）と合計チャンク数の上限（maxChunks）の両方を守って束に詰める。
 * 順序は保つ。1事例だけで maxChunks を超える時は、その事例を単独の束にする（事例は束をまたがない）。
 */
export function packByChunks<T>(items: readonly T[], chunkCount: (item: T) => number, maxCases: number, maxChunks = MAX_CHUNKS_PER_BATCH): T[][] {
  const batches: T[][] = [];
  let cur: T[] = [];
  let weight = 0;
  for (const item of items) {
    const w = Math.max(1, chunkCount(item));
    if (cur.length && (cur.length >= maxCases || weight + w > maxChunks)) {
      batches.push(cur);
      cur = [];
      weight = 0;
    }
    cur.push(item);
    weight += w;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

export const textHash = (s: string): string => createHash('sha256').update(s).digest('hex').slice(0, 16);
