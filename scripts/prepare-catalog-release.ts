import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { parseFinancialEntitiesResiliently } from '../src/shared/financial-entity-schema';
import { normalizeFinancialEntity } from '../src/shared/financial-integrity';
import { reconcileFinancialEntity } from '../src/platform/data/financial-reconciliation';
import { INSTITUTIONAL_ENTITY_ALIASES } from '../src/platform/data/mockLedgerData';
import { isPublishableEntity, publicEntity, publicSummaryEntity } from '../src/lib/company-access/public-entity';
import { collectApprovalCandidateIds } from '../src/lib/company-access/approval-candidates';
import { computeDossierContentHash, getDossierStoragePath, stringifyDeterministic } from '../src/lib/foundation/dossier-projection';
import { deriveDiscoveryDataset } from '../src/features/discover';

async function main() {
const source = await readFile('data/entities-index.json');
const sourceHash = createHash('sha256').update(source).digest('hex');
const raw: unknown = JSON.parse(source.toString('utf8'));
const parsed = parseFinancialEntitiesResiliently(raw);
if (parsed.invalidEntities.length) throw new Error('Catalog release contains invalid records');
const entities = parsed.validEntities
  .filter((entity) => !INSTITUTIONAL_ENTITY_ALIASES[entity.id])
  .map(reconcileFinancialEntity).map(normalizeFinancialEntity).filter(isPublishableEntity);
const directory = '.catalog-release';
const checkOnly = process.argv.includes('--check');
if (!checkOnly) await mkdir(directory, { recursive: true });
const objects: { key: string; file: string }[] = [];
async function artifact(value: unknown, key?: string) {
  const json = stringifyDeterministic(value);
  const hash = createHash('sha256').update(json).digest('hex');
  const file = `${directory}/${hash}.json.gz`;
  if (!checkOnly) await writeFile(file, gzipSync(json));
  const storageKey = key ?? `views/make-money/catalog-v1/objects/${hash}.json.gz`;
  objects.push({ key: storageKey, file });
  return { hash, key: storageKey };
}
const details: Record<string, string> = {};
for (const entity of entities) {
  const hash = computeDossierContentHash(entity);
  await artifact(entity, getDossierStoragePath(entity.id, hash));
  details[entity.id] = hash;
}
const summaryRows = entities.map((entity) => ({ ...publicSummaryEntity(entity), latestDossierHash: details[entity.id] }));
if (parseFinancialEntitiesResiliently(summaryRows).invalidEntities.length) throw new Error('Invalid summary projection');
const summaries = await artifact(summaryRows);
const discovery = await artifact(deriveDiscoveryDataset(entities.map(publicEntity)));
const manifest = { version: 1, sourceHash, sourceCount: parsed.validEntities.length, publishedCount: entities.length,
  summaries, discovery, details, approvalCandidateIds: [...collectApprovalCandidateIds(raw)].sort() };
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
if (checkOnly) {
  if (await readFile('data/catalog-release.json', 'utf8') !== manifestText) throw new Error('Catalog release is stale; run pnpm catalog:prepare and publish before deployment');
} else {
  await writeFile('data/catalog-release.json', manifestText);
  await writeFile(`${directory}/upload.json`, JSON.stringify(objects));
}
console.log(JSON.stringify({ sourceHash, sourceCount: manifest.sourceCount, publishedCount: entities.length, objects: objects.length }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
