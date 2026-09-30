/**
 * 推論（reader.analysis）の入力を作る。照合後に公開される事例ごとに、残った facts / metrics と出典本文を並べ、
 * 20事例ずつ data/analyze/batches/batch-NNN.json に書く。
 * 対象 = data/catalog-release.json の details にあり、applyVerdicts が null でなく、残った facts+metrics が1件以上。
 * 使い方: node --import tsx scripts/reader-case/build-analyze-batches.ts [--ids <file>] [--prefix batch-b2-]
 * --prefix: 追加分を別名で作る（その接頭辞のバッチだけ作り直し、既存のバッチと結果は残す）
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { applyVerdicts } from '../../src/lib/company-access/reader-verdicts';
import { argValue, loadReaders, readIdsFile } from './load-readers';
import { excerpt } from './build-verify-batches';
import { ANALYZE_DIR } from './analysis-lib';
import { VERDICTS_FILE, hasText, metricLine, readCache, type VerdictsFile } from './verify-lib';

const PER_BATCH = Number(process.env.ANALYZE_PER_BATCH ?? 20);
const MAX_SOURCE_TEXT = 8_000;

function main() {
  const idsFile = argValue('--ids');
  const prefix = argValue('--prefix') ?? 'batch-';
  const readers = loadReaders(idsFile ? readIdsFile(idsFile) : undefined);
  const verdicts: VerdictsFile = existsSync(VERDICTS_FILE) ? (JSON.parse(readFileSync(VERDICTS_FILE, 'utf8')) as VerdictsFile) : {};
  const names = new Map<string, string>();
  for (const r of JSON.parse(readFileSync('data/entities-index.json', 'utf8')) as { id?: string; name?: string }[]) {
    if (typeof r?.id === 'string' && typeof r.name === 'string') names.set(r.id, r.name);
  }
  mkdirSync(`${ANALYZE_DIR}/batches`, { recursive: true });
  for (const f of readdirSync(`${ANALYZE_DIR}/batches`)) if (f.startsWith(prefix)) rmSync(`${ANALYZE_DIR}/batches/${f}`);

  const cases: unknown[] = [];
  let skippedUnverified = 0;
  let skippedEmpty = 0;
  for (const [entityId, reader] of readers) {
    const applied = applyVerdicts(reader, verdicts[entityId]);
    if (!applied) { skippedUnverified++; continue; }
    const r = applied.reader;
    if (r.facts.length + r.metrics.length < 1) { skippedEmpty++; continue; }
    const sources: unknown[] = [];
    for (const s of r.sources) {
      const rec = readCache(s.url);
      if (!hasText(rec)) continue;
      const claimTexts = [...r.facts.filter((f) => f.sourceId === s.id).map((f) => f.text), ...r.metrics.filter((m) => m.sourceId === s.id).map(metricLine)];
      sources.push({ sourceId: s.id, url: s.url, publisher: s.publisher, text: excerpt(rec!.text, claimTexts, MAX_SOURCE_TEXT).slice(0, MAX_SOURCE_TEXT) });
    }
    cases.push({
      entityId,
      name: names.get(entityId) ?? entityId,
      facts: r.facts.map((f) => ({ id: f.id, kind: f.kind, text: f.text, attribution: f.attribution })),
      metrics: r.metrics.map((m) => ({ id: m.id, line: metricLine(m) })),
      sources,
    });
  }
  for (let i = 0; i * PER_BATCH < cases.length; i++) {
    const name = `${prefix}${String(i + 1).padStart(3, '0')}`;
    writeFileSync(`${ANALYZE_DIR}/batches/${name}.json`, JSON.stringify({ batch: name, cases: cases.slice(i * PER_BATCH, (i + 1) * PER_BATCH) }, null, 1));
  }
  console.log(JSON.stringify({ candidates: readers.size, cases: cases.length, batches: Math.ceil(cases.length / PER_BATCH), skippedUnverified, skippedEmpty }));
}

if (process.argv[1]?.endsWith('build-analyze-batches.ts')) main();
