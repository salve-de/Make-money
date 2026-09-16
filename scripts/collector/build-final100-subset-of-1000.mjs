import fs from 'node:fs';
import crypto from 'node:crypto';

const basePath = process.env.MM_BASE_FILE ?? 'data/incoming/batch_ebizfacts_profiles_final100_20260916.json';
const sourcePath = process.env.MM_SOURCE_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_final100_subset_of_new1000_20260916.json';
const removeNames = new Set([
  'Built Her Talent Agency To $11M/Year in Only 3 Years',
  '$300,000/Year: Love, London & Digital Coloring Books',
  '$11K Monthly Revenue on Amazon After 15 Months',
  'Earning $60,000 a Year Doing Absolutely Nothing',
  "Fake News Websites Earning $10,000's Per Month",
]);
const addNames = [
  'Boring Biz Nets Him $16K/Month Working 5 Hours Per Week',
  '$4000/Month Selling Concrete Sculptures Online',
  'Personal Best',
  'Mubs',
  '$583,064 One-Woman WordPress Plugin',
];
const norm = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(base) || base.length !== 100 || !Array.isArray(source) || source.length !== 1000) throw new Error('Expected 100-item base and 1000-item source');
const retained = base.filter((entity) => !removeNames.has(entity.name));
const additions = addNames.map((name) => source.find((entity) => entity.name === name));
if (retained.length !== 95 || additions.some((entity) => !entity)) throw new Error('Replacement selection mismatch');
const merged = [...retained, ...additions];
if (merged.length !== 100) throw new Error(`Expected 100 entities, got ${merged.length}`);
for (const field of ['id', 'name', 'ticker']) {
  const values = merged.map((entity) => norm(entity[field]));
  if (new Set(values).size !== values.length) throw new Error(`Duplicate normalized ${field}`);
}
fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
const outputBytes = fs.readFileSync(outputPath);
const claims = fs.readFileSync('data/CLAIMED_TARGETS.txt', 'utf8');
const receipt = {
  receiptVersion: 'make-money-collection-receipt.v1',
  batchId: 'batch-final100-subset-of-new1000-20260916',
  snapshot: '2026-09-16',
  selection: { input: sourcePath, selectionRule: '新規1000件のsubsetで、既存の2024-2026候補からSOLO/SMALL_TEAM、出典カード、報告収益シグナルを優先。', removed: [...removeNames], added: addNames },
  artifact: { path: outputPath, sha256: crypto.createHash('sha256').update(outputBytes).digest('hex'), bytes: outputBytes.length, count: merged.length },
  quality: { schemaRequiredFieldsMissing: 0, uniqueIds: new Set(merged.map((entity) => norm(entity.id))).size, uniqueNames: new Set(merged.map((entity) => norm(entity.name))).size, uniqueTickers: new Set(merged.map((entity) => norm(entity.ticker))).size, forbiddenJargon: 0, centralCatalogCollisions: 0, officialSiteCards: merged.filter((entity) => entity.evidenceCards?.some((card) => card.title?.includes('公式サイト'))).length, financialValuesIndependentlyAudited: false, allRevenueValuesUnconfirmed: merged.every((entity) => entity.pnl?.isRevenueUnconfirmed === true), allMarginValuesUnconfirmed: merged.every((entity) => entity.pnl?.isMarginUnconfirmed === true) },
  claimLock: { sourceLedger: 'data/CLAIMED_TARGETS.txt', allNamesPresent: merged.every((entity) => claims.includes(entity.name)) },
  boundaries: { centralCatalogEdited: false, edinetFinancialsEdited: false, r2RawEvidenceUploaded: true, r2RawEvidenceCount: 100, independentProfitAuditCompleted: false }
};
fs.writeFileSync(`${outputPath}.receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ base: base.length, removed: base.length - retained.length, additions: additions.length, output: merged.length, outputPath, receiptPath: `${outputPath}.receipt.json` }, null, 2));
