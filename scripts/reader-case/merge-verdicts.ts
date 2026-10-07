/**
 * Codex の判定を機械で確かめて確定する。
 * quote が出典本文（取得済みの全文）に、空白・全角半角・大小文字を揃えた上で部分一致しない判定は無効にして NOT_SUPPORTED 扱い。
 * SUPPORTED と、quote が一致した PARTIAL（fix つき）だけを data/reader-verdicts.json に書く。
 * 使い方: node --import tsx scripts/reader-case/merge-verdicts.ts [--ids <file>]
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { argValue, loadReaders, readIdsFile } from './load-readers';
import { VERDICTS_FILE, VERIFY_DIR, claimsOf, quoteInText, readCache, type MetricFix, type VerdictEntry, type VerdictsFile } from './verify-lib';

interface Raw {
  entityId: string;
  claimId: string;
  verdict: string;
  quote?: string;
  fix?: { text?: string; metric?: MetricFix };
}

/**
 * この実行で判定（照合の出力か、届かない記録）がある事例だけを置き換える。判定が1件も無い事例は既存の判定に触らない。
 * --ids なしで全件を読んでも、手元に照合の出力が無い事例の判定が消えない（2026-10-06 に314件分が落ちた事故の再発防止）
 */
export function touchedCases(rawKeys: Iterable<string>, unreachableKeys: Iterable<string>): Set<string> {
  return new Set([...rawKeys, ...unreachableKeys].map((k) => k.split('\u0000')[0]));
}

const QUOTE_MIN = 12;
const QUOTE_MAX = 300;

function main() {
  const idsFile = argValue('--ids');
  const readers = loadReaders(idsFile ? readIdsFile(idsFile) : undefined);
  const raws = new Map<string, Raw>();
  const outDir = `${VERIFY_DIR}/out`;
  for (const f of existsSync(outDir) ? readdirSync(outDir).sort() : []) {
    if (!/^batch-[\w-]+\.json$/.test(f)) continue;
    const j = JSON.parse(readFileSync(`${outDir}/${f}`, 'utf8')) as { verdicts?: Raw[] };
    for (const v of j.verdicts ?? []) raws.set(`${v.entityId}\u0000${v.claimId}`, v);
  }
  const unreachableFile = `${VERIFY_DIR}/unreachable.json`;
  const unreachable = new Set<string>(
    existsSync(unreachableFile) ? (JSON.parse(readFileSync(unreachableFile, 'utf8')) as { entityId: string; claimId: string }[]).map((u) => `${u.entityId}\u0000${u.claimId}`) : [],
  );
  const now = new Date().toISOString().slice(0, 10);
  const prior: VerdictsFile = existsSync(VERDICTS_FILE) ? (JSON.parse(readFileSync(VERDICTS_FILE, 'utf8')) as VerdictsFile) : {};
  const result: VerdictsFile = { ...prior };
  const stats = { SUPPORTED: 0, PARTIAL: 0, NOT_SUPPORTED: 0, UNREACHABLE: 0, quoteMismatch: 0, quoteLength: 0, partialWithoutFix: 0, noVerdict: 0, badVerdict: 0 };
  const rejected: { entityId: string; claimId: string; claimText: string; verdict: string; reason: string; quote?: string; fix?: unknown }[] = [];
  const perCase: Record<string, { claims: number; kept: number }> = {};

  const touched = touchedCases(raws.keys(), unreachable);
  let untouched = 0;
  for (const [entityId, reader] of readers) {
    if (!touched.has(entityId)) { untouched++; continue; }
    const kept: Record<string, VerdictEntry> = {};
    const urlOf = new Map(reader.sources.map((s) => [s.id, s.url]));
    const claims = claimsOf(reader);
    perCase[entityId] = { claims: claims.length, kept: 0 };
    for (const c of claims) {
      const key = `${entityId}\u0000${c.claimId}`;
      const reject = (verdict: string, reason: string, v?: Raw) => rejected.push({ entityId, claimId: c.claimId, claimText: c.text, verdict, reason, quote: v?.quote, fix: v?.fix });
      if (unreachable.has(key)) {
        stats.UNREACHABLE++;
        reject('UNREACHABLE', 'source-text-unavailable');
        continue;
      }
      const v = raws.get(key);
      if (!v) {
        stats.noVerdict++;
        stats.NOT_SUPPORTED++;
        reject('NOT_SUPPORTED', 'no-verdict-returned');
        continue;
      }
      if (v.verdict !== 'SUPPORTED' && v.verdict !== 'PARTIAL') {
        if (v.verdict !== 'NOT_SUPPORTED') stats.badVerdict++;
        stats.NOT_SUPPORTED++;
        reject('NOT_SUPPORTED', v.verdict === 'NOT_SUPPORTED' ? 'judged' : 'bad-verdict', v);
        continue;
      }
      const url = urlOf.get(c.sourceId)!;
      const text = readCache(url)?.text ?? '';
      const q = (v.quote ?? '').trim();
      if (q.length < QUOTE_MIN || q.length > QUOTE_MAX) {
        stats.quoteLength++;
        stats.NOT_SUPPORTED++;
        reject('NOT_SUPPORTED', `quote-length-${q.length}`, v);
        continue;
      }
      if (!quoteInText(q, text)) {
        stats.quoteMismatch++;
        stats.NOT_SUPPORTED++;
        reject('NOT_SUPPORTED', 'quote-not-in-source', v);
        continue;
      }
      if (v.verdict === 'PARTIAL' && !(v.fix?.text?.trim() || (v.fix?.metric && Object.keys(v.fix.metric).length))) {
        stats.partialWithoutFix++;
        stats.NOT_SUPPORTED++;
        reject('NOT_SUPPORTED', 'partial-without-fix', v);
        continue;
      }
      if (v.verdict === 'PARTIAL' && c.kind === 'fact' && !v.fix?.text) {
        stats.partialWithoutFix++;
        stats.NOT_SUPPORTED++;
        reject('NOT_SUPPORTED', 'partial-fact-without-text', v);
        continue;
      }
      stats[v.verdict]++;
      perCase[entityId]!.kept++;
      kept[c.claimId] = { verdict: v.verdict, quote: q, ...(v.fix ? { fix: v.fix } : {}), sourceUrl: url, checkedAt: now, claimText: c.text };
    }
    if (Object.keys(kept).length) result[entityId] = kept;
    else delete result[entityId];
  }
  writeFileSync(VERDICTS_FILE, `${JSON.stringify(result, null, 1)}\n`);
  writeFileSync(`${VERIFY_DIR}/rejected.json`, JSON.stringify(rejected, null, 1));
  writeFileSync(`${VERIFY_DIR}/per-case.json`, JSON.stringify(perCase, null, 1));
  console.log(JSON.stringify({ cases: readers.size, untouched, casesWithVerdicts: Object.keys(result).length, ...stats }, null, 1));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
