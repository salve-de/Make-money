/**
 * Codex の推論（data/analyze/out/batch-NNN.json）を機械で確かめ、通ったものだけ data/reader-analysis.json に書く。
 * 落とす条件は analysis-lib.ts の checkItem を参照。既存の reader-analysis.json は、今回出力のある事例だけ置き換える。
 * 使い方: node --import tsx scripts/reader-case/merge-analysis.ts [--ids <file>]
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { argValue, loadReaders, readIdsFile } from './load-readers';
import { ANALYSIS_FILE, ANALYZE_DIR, checkCase, type AnalysisFile, type Dropped } from './analysis-lib';

function main() {
  const idsFile = argValue('--ids');
  const readers = loadReaders(idsFile ? readIdsFile(idsFile) : undefined);
  const outDir = `${ANALYZE_DIR}/out`;
  const raws = new Map<string, unknown>();
  for (const f of existsSync(outDir) ? readdirSync(outDir).sort() : []) {
    if (!/^batch-\d+\.json$/.test(f)) continue;
    const j = JSON.parse(readFileSync(`${outDir}/${f}`, 'utf8')) as { analysis?: { entityId: string; items?: unknown }[] };
    for (const c of j.analysis ?? []) raws.set(c.entityId, c.items);
  }
  const result: AnalysisFile = existsSync(ANALYSIS_FILE) ? (JSON.parse(readFileSync(ANALYSIS_FILE, 'utf8')) as AnalysisFile) : {};
  const byItem: Record<string, number> = {};
  const byReason: Record<string, number> = {};
  const dropped: Dropped[] = [];
  let cases = 0;
  let items = 0;
  for (const [entityId, items0] of raws) {
    const reader = readers.get(entityId);
    if (!reader) continue;
    const r = checkCase(entityId, items0, reader);
    dropped.push(...r.dropped);
    for (const d of r.dropped) byReason[d.reason] = (byReason[d.reason] ?? 0) + 1;
    if (r.kept.length) {
      result[entityId] = r.kept;
      cases++;
      for (const k of r.kept) { byItem[k.item] = (byItem[k.item] ?? 0) + 1; items++; }
    } else delete result[entityId];
  }
  writeFileSync(ANALYSIS_FILE, JSON.stringify(result, null, 1) + '\n');
  writeFileSync(`${ANALYZE_DIR}/dropped.json`, JSON.stringify(dropped, null, 1));
  console.log(JSON.stringify({ casesWithOutput: raws.size, casesKept: cases, itemsKept: items, itemsDropped: dropped.length, byItem, dropByReason: byReason }, null, 1));
}

main();
