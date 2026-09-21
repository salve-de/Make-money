import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { hasValidEvidenceLocator, isPublishableEntity } from '../src/lib/company-access/public-entity';
import { parseFinancialEntitiesResiliently } from '../src/shared/financial-entity-schema';
import type { FinancialEntity } from '../src/shared/terminal';

export const PROTECTED_ENTITIES_INDEX_SHA256 =
  '5b9ecc23f47150534032b4bc1d8a6651938c0d2a978e55b871c36597b1c1ebd4';

export type CatalogCoverageCategory =
  | 'public_catalog'
  | 'publication_gate'
  | 'evidence_gate'
  | 'duplicate_id'
  | 'invalid_record'
  | 'release_manifest_mismatch'
  | 'unknown_not_published';

export interface CatalogCoverageAudit {
  sourcePath: string;
  sourceSha256: string;
  sourceCount: number;
  releasePublishedCount: number;
  releaseDetailCount: number;
  categories: Record<CatalogCoverageCategory, number>;
  publicationGateStates: Record<string, number>;
  duplicateIds: string[];
  duplicateNames: string[];
  invalidRecords: Array<{ index: number; id?: string; name?: string; error: string }>;
  aliasRecordsDetected: number;
  unclassifiedIds: string[];
}

function emptyCategories(): Record<CatalogCoverageCategory, number> {
  return {
    public_catalog: 0,
    publication_gate: 0,
    evidence_gate: 0,
    duplicate_id: 0,
    invalid_record: 0,
    release_manifest_mismatch: 0,
    unknown_not_published: 0,
  };
}

function duplicateValues(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value).sort();
}

function explicitAliasReference(entity: Record<string, unknown>): boolean {
  return ['aliasOf', 'alias_of', 'canonicalId', 'canonical_id'].some((key) => {
    const value = entity[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

export function auditCatalogCoverage(
  rows: unknown[],
  manifest: { publishedCount?: number; details?: Record<string, string> },
  sourcePath = 'data/entities-index.json',
  sourceSha256 = '',
): CatalogCoverageAudit {
  const parsed = parseFinancialEntitiesResiliently(rows);
  const validByIndex = new Map<number, FinancialEntity>();
  const invalidIndexes = new Set(parsed.invalidEntities.map((item) => item.index));
  let validOffset = 0;
  for (let index = 0; index < rows.length; index += 1) {
    if (!invalidIndexes.has(index)) validByIndex.set(index, parsed.validEntities[validOffset++]);
  }

  const ids = rows.map((row) => {
    const value = row && typeof row === 'object' ? (row as Record<string, unknown>).id : undefined;
    return typeof value === 'string' ? value : '';
  });
  const names = rows.map((row) => {
    const value = row && typeof row === 'object' ? (row as Record<string, unknown>).name : undefined;
    return typeof value === 'string' ? value : '';
  });
  const duplicateIds = duplicateValues(ids.filter(Boolean));
  const duplicateNames = duplicateValues(names.filter(Boolean));
  const duplicateIdSet = new Set(duplicateIds);
  const details = new Set(Object.keys(manifest.details ?? {}));
  const categories = emptyCategories();
  const publicationGateStates: Record<string, number> = {};
  const unclassifiedIds: string[] = [];
  let aliasRecordsDetected = 0;

  rows.forEach((raw, index) => {
    const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null;
    const id = ids[index];
    if (record && explicitAliasReference(record)) aliasRecordsDetected += 1;

    let category: CatalogCoverageCategory;
    if (invalidIndexes.has(index)) {
      category = 'invalid_record';
    } else if (duplicateIdSet.has(id)) {
      category = 'duplicate_id';
    } else if (details.has(id)) {
      category = validByIndex.get(index) && isPublishableEntity(validByIndex.get(index)!)
        ? 'public_catalog'
        : 'release_manifest_mismatch';
    } else {
      const entity = validByIndex.get(index);
      if (!entity) {
        category = 'invalid_record';
      } else if (entity.publishability !== 'PUBLISHABLE') {
        category = 'publication_gate';
        const state = typeof entity.publishability === 'string' ? entity.publishability : 'MISSING';
        publicationGateStates[state] = (publicationGateStates[state] ?? 0) + 1;
      } else if (!hasValidEvidenceLocator(entity)) {
        category = 'evidence_gate';
      } else {
        category = 'unknown_not_published';
        unclassifiedIds.push(id);
      }
    }
    categories[category] += 1;
  });

  return {
    sourcePath,
    sourceSha256,
    sourceCount: rows.length,
    releasePublishedCount: manifest.publishedCount ?? details.size,
    releaseDetailCount: details.size,
    categories,
    publicationGateStates,
    duplicateIds,
    duplicateNames,
    invalidRecords: parsed.invalidEntities,
    aliasRecordsDetected,
    unclassifiedIds,
  };
}

export async function readCatalogCoverageAudit(root = process.cwd()): Promise<CatalogCoverageAudit> {
  const sourcePath = resolve(root, 'data/entities-index.json');
  const manifestPath = resolve(root, 'data/catalog-release.json');
  const sourceBytes = await readFile(sourcePath);
  const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex');
  if (sourceSha256 !== PROTECTED_ENTITIES_INDEX_SHA256) {
    throw new Error(`Protected entities-index.json SHA-256 mismatch: ${sourceSha256}`);
  }
  const rows = JSON.parse(sourceBytes.toString('utf8')) as unknown;
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    publishedCount?: number;
    details?: Record<string, string>;
  };
  if (!Array.isArray(rows)) throw new Error('entities-index.json must be an array');
  return auditCatalogCoverage(rows, manifest, 'data/entities-index.json', sourceSha256);
}

readCatalogCoverageAudit()
  .then((audit) => console.log(JSON.stringify(audit, null, 2)))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
