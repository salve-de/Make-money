/**
 * 照合の入力を作る。事例ごとに「画面に出る主張」と「その出典の本文」を並べ、25事例ずつ batch-NNN.json に書く。
 * 出典本文は抜粋せず、全文をチャンクに分けて渡す（source-chunks.ts。束はチャンク数の上限でも区切る）。
 * 本文が取れなかった主張は照合に回さず UNREACHABLE として data/verify/unreachable.json に記録する。
 * 使い方: node --import tsx scripts/reader-case/build-verify-batches.ts [--ids <file>]
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { argValue, loadReaders, readIdsFile } from './load-readers';
import { chunkSources, packByChunks } from './source-chunks';
import { VERIFY_DIR, claimsOf, hasText, readCache, type Claim } from './verify-lib';

const PER_BATCH = 25;

function main() {
  const idsFile = argValue('--ids');
  const readers = loadReaders(idsFile ? readIdsFile(idsFile) : undefined);
  mkdirSync(`${VERIFY_DIR}/batches`, { recursive: true });
  for (const f of readdirSync(`${VERIFY_DIR}/batches`)) if (f.startsWith('batch-')) rmSync(`${VERIFY_DIR}/batches/${f}`);
  const unreachable: { entityId: string; claimId: string; text: string; url: string; reason: string }[] = [];
  const cases: ({ sources: unknown[] } & Record<string, unknown>)[] = [];
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
      sources.push(...chunkSources([{ sourceId: s.id, url: s.url, publisher: s.publisher, via: rec!.via, text: rec!.text }]));
      sendClaims.push(...cs);
    }
    if (sendClaims.length) cases.push({ entityId, sources, claims: sendClaims.map((c) => ({ claimId: c.claimId, kind: c.kind, text: c.text, sourceId: c.sourceId })) });
  }
  const batches = packByChunks(cases, (c) => c.sources.length, PER_BATCH);
  batches.forEach((b, i) => {
    const name = `batch-${String(i + 1).padStart(3, '0')}`;
    writeFileSync(`${VERIFY_DIR}/batches/${name}.json`, JSON.stringify({ batch: name, cases: b }, null, 1));
  });
  writeFileSync(`${VERIFY_DIR}/unreachable.json`, JSON.stringify(unreachable, null, 1));
  console.log(JSON.stringify({ cases: readers.size, casesWithSendable: cases.length, batches: batches.length, chunks: cases.reduce((n, c) => n + c.sources.length, 0), claims: claimTotal, unreachable: unreachable.length }));
}

if (process.argv[1]?.endsWith('build-verify-batches.ts')) main();
