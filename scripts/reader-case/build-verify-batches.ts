/**
 * 照合の入力を作る。事例ごとに「画面に出る主張」と「その出典の本文」を並べ、25事例ずつ batch-NNN.json に書く。
 * 本文が取れなかった主張は照合に回さず UNREACHABLE として data/verify/unreachable.json に記録する。
 * 使い方: node --import tsx scripts/reader-case/build-verify-batches.ts [--ids <file>]
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { argValue, loadReaders, readIdsFile } from './load-readers';
import { VERIFY_DIR, claimsOf, hasText, readCache, type Claim } from './verify-lib';

const PER_BATCH = 25;
const MAX_EXCERPT = 12_000;
const CHUNK = 400;

/** 主張から探す手がかり: 2桁以上の数字（k/M つきの言い方も）と、英数字の固有名詞 */
export function keyTokens(claims: string[]): string[] {
  const set = new Set<string>();
  for (const c of claims) {
    for (const m of c.matchAll(/\d[\d,.]*/g)) {
      const raw = m[0].replace(/[,.]+$/, '');
      const n = Number(raw.replace(/,/g, ''));
      if (!Number.isFinite(n)) continue;
      const digits = raw.replace(/[^\d]/g, '');
      if (digits.length >= 2) set.add(digits.length >= 4 ? raw : raw);
      if (n >= 1000 && n % 1000 === 0) set.add(`${n / 1000}k`);
      if (n >= 1_000_000 && n % 1_000_000 === 0) set.add(`${n / 1_000_000}m`);
      if (n >= 1000) set.add(n.toLocaleString('en-US'));
    }
    for (const m of c.matchAll(/[A-Za-z][A-Za-z0-9.-]{3,}/g)) set.add(m[0].toLowerCase());
  }
  return [...set].map((t) => t.toLowerCase());
}

export function excerpt(text: string, claimTexts: string[], max = MAX_EXCERPT): string {
  if (text.length <= max) return text;
  const tokens = keyTokens(claimTexts);
  const chunks: { i: number; s: string; score: number }[] = [];
  for (let i = 0; i * CHUNK < text.length; i++) {
    const s = text.slice(i * CHUNK, (i + 1) * CHUNK);
    const low = s.toLowerCase();
    let score = 0;
    for (const t of tokens) if (low.includes(t)) score += /\d/.test(t) ? 3 : 1;
    chunks.push({ i, s, score });
  }
  const keep = new Set<number>([0, 1, 2, 3]); // 冒頭（題名・導入）は常に
  let size = keep.size * CHUNK;
  for (const c of [...chunks].sort((a, b) => b.score - a.score || a.i - b.i)) {
    if (size >= max) break;
    if (c.score === 0) break;
    // 前後の文脈も1つずつ
    for (const j of [c.i - 1, c.i, c.i + 1]) {
      if (j >= 0 && j < chunks.length && !keep.has(j) && size < max) {
        keep.add(j);
        size += CHUNK;
      }
    }
  }
  const idx = [...keep].sort((a, b) => a - b);
  let out = '';
  let prev = -2;
  for (const j of idx) {
    out += (j === prev + 1 ? '' : '\n[...]\n') + chunks[j]!.s;
    prev = j;
  }
  return out.trim().slice(0, max + 200);
}

function main() {
  const idsFile = argValue('--ids');
  const readers = loadReaders(idsFile ? readIdsFile(idsFile) : undefined);
  mkdirSync(`${VERIFY_DIR}/batches`, { recursive: true });
  for (const f of readdirSync(`${VERIFY_DIR}/batches`)) if (f.startsWith('batch-')) rmSync(`${VERIFY_DIR}/batches/${f}`);
  const unreachable: { entityId: string; claimId: string; text: string; url: string; reason: string }[] = [];
  const cases: unknown[] = [];
  let claimTotal = 0;
  for (const [entityId, reader] of readers) {
    const claims = claimsOf(reader);
    claimTotal += claims.length;
    const bySource = new Map<string, Claim[]>();
    for (const c of claims) bySource.set(c.sourceId, [...(bySource.get(c.sourceId) ?? []), c]);
    const sources: unknown[] = [];
    const sendClaims: Claim[] = [];
    for (const s of reader.sources) {
      const cs = bySource.get(s.id);
      if (!cs) continue;
      const rec = readCache(s.url);
      if (!hasText(rec)) {
        for (const c of cs) unreachable.push({ entityId, claimId: c.claimId, text: c.text, url: s.url, reason: rec ? (rec.error ?? `http-${rec.status}`) : 'not-fetched' });
        continue;
      }
      sources.push({ sourceId: s.id, url: s.url, publisher: s.publisher, via: rec!.via, text: excerpt(rec!.text, cs.map((c) => c.text)) });
      sendClaims.push(...cs);
    }
    if (sendClaims.length) cases.push({ entityId, sources, claims: sendClaims.map((c) => ({ claimId: c.claimId, kind: c.kind, text: c.text, sourceId: c.sourceId })) });
  }
  for (let i = 0; i * PER_BATCH < cases.length; i++) {
    const name = `batch-${String(i + 1).padStart(3, '0')}`;
    writeFileSync(`${VERIFY_DIR}/batches/${name}.json`, JSON.stringify({ batch: name, cases: cases.slice(i * PER_BATCH, (i + 1) * PER_BATCH) }, null, 1));
  }
  writeFileSync(`${VERIFY_DIR}/unreachable.json`, JSON.stringify(unreachable, null, 1));
  console.log(JSON.stringify({ cases: readers.size, casesWithSendable: cases.length, batches: Math.ceil(cases.length / PER_BATCH), claims: claimTotal, unreachable: unreachable.length }));
}

if (process.argv[1]?.endsWith('build-verify-batches.ts')) main();
