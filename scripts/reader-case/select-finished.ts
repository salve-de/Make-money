/**
 * 仕上げ済みの事例を data/catalog-finished-ids.txt に書く。公開データ作り（prepare-catalog-release.ts）と同じ関門（evaluateForRelease）で判定する:
 * 照合済みの事実、必須項目、規約で表示できる出典、使える画像、そして「今の入力全体」に対する監査受領書（data/publication-audits.json）。
 * 使い方: node --import tsx scripts/reader-case/select-finished.ts --ids <候補の一覧> [--keep-published]
 * --keep-published: いま公開中（data/catalog-release.json の details）で候補に無い事例は、そのまま仕上げ済みに残す。
 *   候補だけを受領書つきで評価し直し、公開中の他の事例を止めない（差分公開。prepare-catalog-release の --changed と組で使う）
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { normalizeFinancialEntity } from '../../src/shared/financial-integrity';
import { reconcileFinancialEntity } from '../../src/platform/data/financial-reconciliation';
import { argValue, loadEntities, loadReaders, readIdsFile } from './load-readers';
import { type AnalysisFile } from './analysis-lib';
import { readReflectState, withReflectedAnalysis } from './case-reflect';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';
import { evaluateForRelease, preparePublicationReader } from './publication-evaluation';
import { loadPublicationInput, readPublicationAudits } from './publication-inputs';

async function main() {
  const ids = readIdsFile(argValue('--ids') ?? '');
  const verdicts = JSON.parse(readFileSync(VERDICTS_FILE, 'utf8')) as VerdictsFile;
  const analysis: AnalysisFile = withReflectedAnalysis(existsSync('data/reader-analysis.json') ? JSON.parse(readFileSync('data/reader-analysis.json', 'utf8')) : {}, readReflectState());
  const audited = readPublicationAudits();
  const entities = loadEntities(ids);
  const readers = loadReaders(ids);
  const keep = process.argv.includes('--keep-published');
  const published = keep && existsSync('data/catalog-release.json') ? Object.keys((JSON.parse(readFileSync('data/catalog-release.json', 'utf8')) as { details: Record<string, string> }).details) : [];
  const candidates = new Set(ids);
  const finished: string[] = published.filter((id) => !candidates.has(id));
  const kept = finished.length;
  const notYet: Record<string, string[]> = {};
  for (const id of ids) {
    const reader = readers.get(id);
    const entity = entities.get(id);
    if (!reader || !entity) { notYet[id] = ['元の記録が無い']; continue; }
    const prepared = preparePublicationReader(reader, verdicts[id], analysis[id]);
    const input = await loadPublicationInput(normalizeFinancialEntity(reconcileFinancialEntity(entity)), prepared.reader, verdicts[id]);
    const evaluated = evaluateForRelease(input, audited[id], prepared.problems);
    if (evaluated.publishable) finished.push(id); else notYet[id] = evaluated.reasons;
  }
  writeFileSync('data/catalog-finished-ids.txt', `# 仕上げ済み（現在の事実・推論・出典・画像権利・監査入力を確認した）事例。scripts/reader-case/select-finished.ts が書く\n${finished.sort().join('\n')}\n`);
  console.log(JSON.stringify({ finished: finished.length, keptPublished: kept, notYet: Object.keys(notYet).length, reasons: notYet }, null, 1));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
