/**
 * 推論（reader.analysis）の入力を作る。照合後に公開される事例ごとに、残った facts / metrics と出典本文の全文を並べ、
 * data/analyze/batches/batch-NNN.json に書く。出典本文は抜粋せず、チャンクに分けて全体を渡す（source-chunks.ts）。
 * 束の大きさは事例数（既定20）とチャンク数（既定20）の両方の上限で決める。
 * あわせて data/analyze/evidence-current.json に、事例ごとの根拠（事実・数字・出典全文）の指紋を残す。
 * 新しい根拠が入った事例の再評価は build-fill-batches.ts がこの指紋で判定する。
 * 対象 = data/catalog-release.json の details にあり、applyVerdicts が null でなく、残った facts+metrics が1件以上。
 * 使い方: node --import tsx scripts/reader-case/build-analyze-batches.ts [--ids <file>] [--prefix batch-b2-]
 * --prefix: 追加分を別名で作る（その接頭辞のバッチだけ作り直し、既存のバッチと結果は残す）
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import type { ReaderCase } from '../../src/shared/reader-case';
import { applyVerdicts } from '../../src/lib/company-access/reader-verdicts';
import { argValue, loadReaders, readIdsFile } from './load-readers';
import { EVIDENCE_CURRENT_FILE, digestEvidence, type EvidenceDigestFile } from './evidence-digest';
import { chunkSources, packByChunks, type SourceChunkEntry } from './source-chunks';
import { ANALYZE_DIR } from './analysis-lib';
import { VERDICTS_FILE, hasText, metricLine, readCache, type VerdictsFile } from './verify-lib';

const PER_BATCH = Number(process.env.ANALYZE_PER_BATCH ?? 20);

/** 事例の出典のうち本文が取れたものを、全文チャンクにして返す。fullTexts は出典ID → 本文全文（指紋用） */
export function analyzeSources(
  sources: ReaderCase['sources'],
  lookup: (url: string) => string | undefined,
): { entries: SourceChunkEntry[]; fullTexts: Record<string, string> } {
  const fullTexts: Record<string, string> = {};
  const inputs = [];
  for (const s of sources) {
    const text = lookup(s.url);
    if (text === undefined) continue;
    fullTexts[s.id] = text;
    inputs.push({ sourceId: s.id, url: s.url, publisher: s.publisher, text });
  }
  return { entries: chunkSources(inputs), fullTexts };
}

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

  const cases: ({ sources: unknown[] } & Record<string, unknown>)[] = [];
  const digests: EvidenceDigestFile = {};
  let skippedUnverified = 0;
  let skippedEmpty = 0;
  for (const [entityId, reader] of readers) {
    const applied = applyVerdicts(reader, verdicts[entityId]);
    if (!applied) { skippedUnverified++; continue; }
    const r = applied.reader;
    if (r.facts.length + r.metrics.length < 1) { skippedEmpty++; continue; }
    const { entries, fullTexts } = analyzeSources(r.sources, (url) => {
      const rec = readCache(url);
      return hasText(rec) ? rec!.text : undefined;
    });
    cases.push({
      entityId,
      name: names.get(entityId) ?? entityId,
      facts: r.facts.map((f) => ({ id: f.id, kind: f.kind, text: f.text, attribution: f.attribution })),
      metrics: r.metrics.map((m) => ({ id: m.id, line: metricLine(m) })),
      sources: entries,
    });
    digests[entityId] = digestEvidence(
      r.facts.map((f) => ({ id: f.id, kind: f.kind, text: f.text, attribution: f.attribution })),
      r.metrics.map((m) => ({ id: m.id, line: metricLine(m) })),
      fullTexts,
    );
  }
  const batches = packByChunks(cases, (c) => c.sources.length, PER_BATCH);
  batches.forEach((b, i) => {
    const name = `${prefix}${String(i + 1).padStart(3, '0')}`;
    writeFileSync(`${ANALYZE_DIR}/batches/${name}.json`, JSON.stringify({ batch: name, cases: b }, null, 1));
  });
  // 根拠の指紋。今回作った事例だけ上書きし、他の事例（別の --ids / --prefix の回）の指紋は残す
  const prev: EvidenceDigestFile = existsSync(EVIDENCE_CURRENT_FILE) ? (JSON.parse(readFileSync(EVIDENCE_CURRENT_FILE, 'utf8')) as EvidenceDigestFile) : {};
  writeFileSync(EVIDENCE_CURRENT_FILE, JSON.stringify({ ...prev, ...digests }, null, 1) + '\n');
  const chunks = cases.reduce((n, c) => n + c.sources.length, 0);
  console.log(JSON.stringify({ candidates: readers.size, cases: cases.length, batches: batches.length, chunks, skippedUnverified, skippedEmpty }));
}

if (process.argv[1]?.endsWith('build-analyze-batches.ts')) main();
