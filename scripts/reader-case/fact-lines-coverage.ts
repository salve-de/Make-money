/**
 * 仕上げ済みの事例で、画面に「記録の文のまま」出うる欄の一覧（scripts/architecture/check-case-text-standard.mjs が読む）。
 *   node --import tsx scripts/reader-case/fact-lines-coverage.ts [entityId ...]   → JSON を標準出力へ
 * 欄の洗い出しは build-fact-lines.ts と同じ（fact-lines-lib.ts の collectTargets）。事例データはリポジトリ側から、公開判定と同じ手順（照合・監査の反映の後）で読む。
 * 画面は data/fact-lines.json の言い直しが元の文と合う時だけそれを出し、無い時は元の文を出す。検査側はその両方に同じ規則を掛ける。
 */
import { existsSync, readFileSync } from 'node:fs';
import { loadReaders } from './load-readers';
import { preparePublicationReader } from './publication-evaluation';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';
import { type AnalysisFile } from './analysis-lib';
import { readReflectState, withReflectedAnalysis } from './case-reflect';
import { textFingerprint } from '../../src/shared/text-fingerprint';
import { collectTargets } from './fact-lines-lib';

const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
const finished = readFileSync('data/catalog-finished-ids.txt', 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const ids = [...new Set([...finished, ...process.argv.slice(2).filter((a) => a.startsWith('ent_'))])];
const verdicts = read<VerdictsFile>(VERDICTS_FILE);
const analysis: AnalysisFile = withReflectedAnalysis(existsSync('data/reader-analysis.json') ? read<AnalysisFile>('data/reader-analysis.json') : {}, readReflectState());
const index = new Map(read<Array<{ id: string; name?: string; tagline?: string; tags?: string[] }>>('data/entities-index.json').map((e) => [e.id, e]));
const readers = loadReaders(ids);
const missing: string[] = [];
const cases = [];
for (const id of ids) {
  const base = readers.get(id);
  if (!base) { missing.push(id); continue; }
  const reader = preparePublicationReader(base, verdicts[id], analysis[id]).reader;
  const entry = index.get(id);
  cases.push({
    entityId: id,
    name: entry?.name ?? id,
    tags: entry?.tags ?? [],
    taglineHash: textFingerprint((entry?.tagline ?? '').trim()),
    targets: collectTargets(reader).map((t) => ({ key: t.key, kind: t.kind, targetId: t.targetId, where: t.where, original: t.original, hash: textFingerprint(t.original), price: t.where.includes('料金') })),
  });
}
console.log(JSON.stringify({ ids, missing, cases }));
