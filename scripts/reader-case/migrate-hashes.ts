/**
 * 監査の鮮度を判定する指紋（analysisHash）の形が変わった時に、今の「監査済み」を引き継ぐための移行。
 * 旧形式の指紋（推論と照合結果だけ）が、前回の統合で保存した値と一致する事例は、推論が前回から変わっていない。
 * その事例について、保存済みの指紋（data/analysis-raw-hashes.json）、基準線（data/audit/baseline-hashes.json）、
 * 回ごとの指紋（data/audit/hash-*.json）の旧い値を新形式の値へ置き換える。
 * 移行時点の出典の本文・事実・数字は、監査した時のものとみなす（以降、出典が変われば指紋が変わり、監査し直しになる）。
 * 旧い値と一致しない事例（もともと古い監査）は触らない。冪等。
 * 使い方: node --import tsx scripts/reader-case/migrate-hashes.ts && node --import tsx scripts/reader-case/merge-analysis.ts
 *   （後者が data/audit-fresh.json を新しい指紋で作り直す。分析の出力 data/analyze/out と出典 data/analyze/batches が手元に要る）
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { applyVerdicts } from '../../src/lib/company-access/reader-verdicts';
import { loadRawItems, loadReaders, loadSourceTexts } from './load-readers';
import { ANALYZE_DIR, AUDIT_BASELINE_FILE, RAW_HASHES_FILE, analysisHash, auditEvidence, checkCase, legacyAnalysisHash } from './analysis-lib';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';

type Hashes = Record<string, string>;
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

const rawHashes = readJson<Hashes>(RAW_HASHES_FILE);
const verdicts = readJson<VerdictsFile>(VERDICTS_FILE);
const readers = new Map([...loadReaders(Object.keys(rawHashes))].map(([id, r]) => [id, applyVerdicts(r, verdicts[id])?.reader ?? r]));
const sources = loadSourceTexts();
const raws = loadRawItems(`${ANALYZE_DIR}/out`);

const next: Hashes = {}; // 事例ID → 新形式の指紋
const prev: Hashes = {}; // 事例ID → 移行前の旧形式の指紋
const skipped: Record<string, string> = {};
let already = 0;
for (const id of Object.keys(rawHashes)) {
  const reader = readers.get(id);
  if (!reader || !raws.has(id)) { skipped[id] = '分析の出力か事例の元データが手元に無い'; continue; }
  const kept = checkCase(id, raws.get(id), reader).kept;
  const now = analysisHash(kept, verdicts[id], auditEvidence(reader, sources.get(id)));
  if (rawHashes[id] === now) { already++; continue; }
  if (rawHashes[id] !== legacyAnalysisHash(kept, verdicts[id])) { skipped[id] = '推論が前回の統合から変わっている（もともと古い）'; continue; }
  prev[id] = rawHashes[id];
  next[id] = now;
}

let moved = 0;
const swap = (file: string, h: Hashes): void => {
  let changed = false;
  for (const id of Object.keys(next)) if (h[id] === prev[id]) { h[id] = next[id]; changed = true; moved++; }
  if (changed) writeFileSync(file, JSON.stringify(h, null, 1) + (file === RAW_HASHES_FILE ? '\n' : ''));
};
swap(RAW_HASHES_FILE, rawHashes);
if (existsSync(AUDIT_BASELINE_FILE)) swap(AUDIT_BASELINE_FILE, readJson<Hashes>(AUDIT_BASELINE_FILE));
for (const f of readdirSync('data/audit').filter((x) => /^hash-\d+\.json$/.test(x))) swap(`data/audit/${f}`, readJson<Hashes>(`data/audit/${f}`));
console.log(JSON.stringify({ migrated: Object.keys(next).length, alreadyNew: already, replacedEntries: moved, skipped }, null, 1));
