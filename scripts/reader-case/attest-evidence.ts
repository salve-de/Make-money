/**
 * 公開中の事例の証拠の証明書（data/publication-evidence.json）を、手元の出典本文・画像台帳から作り直す。
 * 使い方: node --import tsx scripts/reader-case/attest-evidence.ts [--ids <一覧>] [--check]
 *   既定の対象は data/catalog-release.json の公開中の事例。手元に本文・台帳が揃わない事例は、足りない物を出して失敗する（証明書は書き換えない）。
 *   --check: 書かずに、今の証明書が手元の証拠と一致するかだけ確かめる（手元に証拠が無い事例は確認できないので数えて報告する）。
 * 出典本文・台帳が変わった（取り直した・画像の判定が変わった）ら、公開の前にこれを流して証明書を新しくする。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { normalizeFinancialEntity } from '../../src/shared/financial-integrity';
import { reconcileFinancialEntity } from '../../src/platform/data/financial-reconciliation';
import { argValue, loadEntities, loadReaders, readIdsFile } from './load-readers';
import { type AnalysisFile } from './analysis-lib';
import { readReflectState, withReflectedAnalysis } from './case-reflect';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';
import { preparePublicationReader, contentHash } from './publication-evaluation';
import { loadPublicationInput } from './publication-inputs';
import { attestCase, PUBLICATION_EVIDENCE_FILE, readAttestations, type EvidenceAttestations } from './publication-evidence';

async function main() {
  const check = process.argv.includes('--check');
  const idsPath = argValue('--ids');
  const ids = idsPath ? readIdsFile(idsPath) : Object.keys((JSON.parse(readFileSync('data/catalog-release.json', 'utf8')) as { details: Record<string, string> }).details).sort();
  const verdicts = JSON.parse(readFileSync(VERDICTS_FILE, 'utf8')) as VerdictsFile;
  const analysis: AnalysisFile = withReflectedAnalysis(existsSync('data/reader-analysis.json') ? JSON.parse(readFileSync('data/reader-analysis.json', 'utf8')) : {}, readReflectState());
  const entities = loadEntities(ids);
  const readers = loadReaders(ids);
  const stored = readAttestations();
  const next: EvidenceAttestations = idsPath ? { ...stored } : {};
  const missing: Record<string, string[]> = {};
  const mismatched: string[] = [];
  let unchecked = 0;
  for (const id of ids) {
    const reader = readers.get(id);
    const entity = entities.get(id);
    if (!reader || !entity) { missing[id] = ['元の記録が無い']; continue; }
    const prepared = preparePublicationReader(reader, verdicts[id], analysis[id]);
    // 証明書は使わず、手元の本文・台帳だけから作る
    const input = await loadPublicationInput(normalizeFinancialEntity(reconcileFinancialEntity(entity)), prepared.reader, verdicts[id], { attestations: {} });
    const result = attestCase(input);
    if ('missing' in result) {
      if (check) { unchecked++; continue; }
      missing[id] = result.missing; continue;
    }
    if (check && stored[id] && contentHash(stored[id]) !== contentHash(result.attestation)) mismatched.push(id);
    if (check && !stored[id]) mismatched.push(id);
    next[id] = result.attestation;
  }
  if (check) {
    console.log(JSON.stringify({ checked: ids.length - unchecked, unchecked, mismatched }));
    if (mismatched.length) process.exitCode = 1;
    return;
  }
  if (Object.keys(missing).length) { console.error(JSON.stringify({ error: '手元の証拠が足りず証明書を作れない事例がある。書き換えていない', missing }, null, 1)); process.exitCode = 1; return; }
  const sorted = Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(PUBLICATION_EVIDENCE_FILE, `${JSON.stringify({ version: 1, note: '公開の関門が使う手元の証拠の証明書。scripts/reader-case/attest-evidence.ts が作る（手で書かない）', cases: sorted }, null, 1)}\n`);
  console.log(JSON.stringify({ attested: Object.keys(sorted).length }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
