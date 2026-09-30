/**
 * 全件を ReaderCase に変換して、件数と落ちた理由を出す。画面には出さない行は unbound.json、疑わしい行は review.json に書く。
 * 使い方: node --import tsx scripts/reader-case/run-projection.ts [出力ディレクトリ]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { projectReaderCase, validateReader } from '../../src/lib/company-access/reader-case-projection';

const out = process.argv[2] ?? 'scratchpad-reader13';
mkdirSync(out, { recursive: true });
const all = JSON.parse(readFileSync('data/entities-index.json', 'utf8')) as Record<string, unknown>[];
const totals: Record<string, number> = {};
const bump = (k: string, n = 1) => { totals[k] = (totals[k] ?? 0) + n; };
const unbound: unknown[] = [];
const review: unknown[] = [];
const invalid: { id: string; why: string }[] = [];
const results: Record<string, unknown> = {};
for (const e of all) {
  let r;
  try { r = projectReaderCase(e); } catch (err) { invalid.push({ id: String(e.id), why: `throw: ${(err as Error).message}` }); continue; }
  const why = validateReader(r.reader);
  for (const [k, v] of Object.entries(r.stats)) bump(k, v as number);
  unbound.push(...r.unbound); review.push(...r.review);
  bump('facts', r.reader.facts.length); bump('metrics', r.reader.metrics.length);
  if (why) { invalid.push({ id: String(e.id), why }); continue; }
  bump('ok');
  if (r.reader.facts.length <= 2 && r.reader.metrics.length === 0) bump('thin');
  if (r.reader.summaryFactId) bump('withSummary');
  results[String(e.id)] = r.reader;
}
writeFileSync(`${out}/unbound.json`, JSON.stringify(unbound, null, 1));
writeFileSync(`${out}/review.json`, JSON.stringify(review, null, 1));
writeFileSync(`${out}/invalid.json`, JSON.stringify(invalid, null, 1));
writeFileSync(`${out}/readers.json`, JSON.stringify(results));
console.log(JSON.stringify({ total: all.length, invalid: invalid.length, ...totals, unbound: unbound.length, review: review.length }));
