import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import manifest from '../../../data/catalog-release.json';
import { getFoundationBucketAsync, readR2Object } from '@/lib/storage/r2';
import { getDossierStoragePath } from '@/lib/foundation/dossier-projection';
import { parseFinancialEntitiesResiliently } from '@/shared/financial-entity-schema';
import { isPublishableEntity } from './public-entity';
import { canonicalCatalogId, catalogDetailHash, filterToCatalog } from '@/shared/catalog-membership';
import type { FinancialEntity } from '@/shared/terminal';
import type { DiscoveryDataset } from '@/features/discover';

const DISCOVERY_SCORE_KEYS = ['SURPRISE', 'BIG_CASH', 'LOW_CAPITAL', 'SOLO', 'LOW_WORK', 'CURRENT', 'FAILURE'] as const;

function isDiscoveryCase(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const descriptorsValid = Array.isArray(value.descriptors)
    && value.descriptors.every((item) => isRecord(item)
      && typeof item.label === 'string'
      && typeof item.value === 'string');
  const scores = isRecord(value.scores) ? value.scores : null;
  const scoresValid = scores !== null
    && DISCOVERY_SCORE_KEYS.every((key) => typeof scores[key] === 'number'
      && Number.isFinite(scores[key] as number));
  return typeof value.id === 'string' && value.id.length > 0
    && typeof value.name === 'string' && value.name.length > 0
    && typeof value.tagline === 'string'
    && typeof value.sector === 'string'
    && typeof value.resultLabel === 'string'
    && typeof value.resultValue === 'string'
    && (value.resultAmountJpy === null || typeof value.resultAmountJpy === 'number')
    && typeof value.resultEvidenceLabel === 'string'
    && ['resultPeriod', 'resultSource', 'resultPeriodNote'].every((key) => value[key] === null || typeof value[key] === 'string')
    && typeof value.startLine === 'string'
    && typeof value.criticalInsight === 'string'
    && typeof value.whyMoneyMoved === 'string'
    && typeof value.leverage === 'string'
    && typeof value.currentLabel === 'string'
    && typeof value.currentDetail === 'string'
    && ['isCurrent', 'isFailure', 'isSolo', 'lowCapital', 'lowWork'].every((key) => typeof value[key] === 'boolean')
    && typeof value.evidenceCount === 'number'
    && descriptorsValid
    && scoresValid;
}

export function parseDiscoveryRelease(value: unknown): DiscoveryDataset {
  if (!isRecord(value)
    || !Number.isInteger(value.sourceCount) || Number(value.sourceCount) < 0
    || !Number.isInteger(value.visibleCount) || Number(value.visibleCount) < 0
    || !Array.isArray(value.cases) || !value.cases.every(isDiscoveryCase)
    || Number(value.visibleCount) !== value.cases.length
    || !Array.isArray(value.highlights) || !value.highlights.every(isDiscoveryCase)) {
    throw new Error('Invalid discovery release');
  }
  return value as unknown as DiscoveryDataset;
}

let discovery: Promise<DiscoveryDataset> | undefined;
export async function readReleaseDiscovery(): Promise<DiscoveryDataset> {
  if (!discovery) {
    discovery = readArtifact(manifest.discovery.key, manifest.discovery.hash)
      .then(parseDiscoveryRelease)
      .catch((error) => { discovery = undefined; throw error; });
  }
  return discovery;
}

export function decodeCatalogArtifact(bytes: Uint8Array, expectedHash: string): unknown {
  const json = gunzipSync(bytes, { maxOutputLength: 24 * 1024 * 1024 });
  if (createHash('sha256').update(json).digest('hex') !== expectedHash) throw new Error('Catalog artifact hash mismatch');
  return JSON.parse(json.toString('utf8')) as unknown;
}

/** 公開目録の中身（要約・詳細）を読めない時の失敗。画面は「目録を読み込めません」と出し、見本データや全件索引には落とさない。 */
export class CatalogUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'CatalogUnavailableError';
  }
}

function runsInWorkers(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
}

/** 手元の公開版（`pnpm catalog:prepare` が作る .catalog-release/）から読む。Workers では読まない。 */
async function readLocalArtifact(hash: string): Promise<unknown | null> {
  if (runsInWorkers()) return null;
  const directory = process.env.CATALOG_RELEASE_DIR?.trim() || resolve(process.cwd(), '.catalog-release');
  try {
    return decodeCatalogArtifact(await readFile(resolve(directory, `${hash}.json.gz`)), hash);
  } catch {
    return null;
  }
}

async function readArtifact(key: string, hash: string): Promise<unknown> {
  if (!key || !/^[a-f0-9]{64}$/.test(hash)) throw new CatalogUnavailableError('Catalog release has not been prepared');
  const local = await readLocalArtifact(hash);
  if (local !== null) return local;
  try {
    const object = await readR2Object(await getFoundationBucketAsync('lake'), key);
    if (!object) throw new Error('Catalog release object is missing');
    return decodeCatalogArtifact(object.body, hash);
  } catch (error) {
    throw new CatalogUnavailableError('Catalog release is unavailable', { cause: error });
  }
}

let summaries: Promise<FinancialEntity[]> | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * The accepted catalog artifact is immutable and its SHA-256 is verified before
 * this function runs. It is generated by `catalog:prepare`, which validates the
 * full FinancialEntity schema before publishing. Re-running the full AJV
 * FinancialEntity validator on all 3,085 rows in every cold Worker isolate is
 * needlessly expensive and can hit the Cloudflare CPU limit (1102), taking the
 * catalog API down even though the artifact is valid.
 *
 * Keep a cheap runtime boundary for the fields the paged catalog actually reads.
 * This preserves fail-closed behavior for malformed/corrupt artifacts without
 * turning every request into a full dossier validation pass.
 */
export function parseCatalogSummaryRows(value: unknown, expectedCount: number): FinancialEntity[] {
  if (!Array.isArray(value) || value.length !== expectedCount) {
    throw new Error('Invalid catalog summary release count');
  }

  const ids = new Set<string>();
  return value.map((row, index) => {
    if (!isRecord(row)
      || typeof row.id !== 'string'
      || row.id.length === 0
      || typeof row.name !== 'string'
      || row.name.length === 0
      || typeof row.ticker !== 'string'
      || typeof row.tagline !== 'string'
      || typeof row.sector !== 'string'
      || typeof row.scale !== 'string'
      || (row.founder !== undefined && typeof row.founder !== 'string')
      || !isRecord(row.pnl)
      || typeof row.pnl.operatingMargin !== 'number'
      || !isRecord(row.operations)
      || typeof row.operations.initialCapitalRequired !== 'number'
      || (row.operations.isCapitalUnconfirmed !== undefined && typeof row.operations.isCapitalUnconfirmed !== 'boolean')
      || !isRecord(row.strategy)
      || typeof row.strategy.moatType !== 'string'
      || typeof row.strategy.blindspot !== 'string'
      || !Array.isArray(row.tags)
      || !row.tags.every((tag) => typeof tag === 'string')
      || (row.batchId !== undefined && typeof row.batchId !== 'string')) {
      throw new Error(`Invalid catalog summary row at index ${index}`);
    }
    if (ids.has(row.id)) throw new Error(`Duplicate catalog summary id: ${row.id}`);
    ids.add(row.id);
    return row as unknown as FinancialEntity;
  });
}

export async function readReleaseSummaries(): Promise<FinancialEntity[]> {
  if (!summaries) {
    summaries = readArtifact(manifest.summaries.key, manifest.summaries.hash).then((value) => {
      const result = parseCatalogSummaryRows(value, manifest.publishedCount);
      return filterToCatalog(result);
    }).catch((error) => { summaries = undefined; throw error; });
  }
  return summaries;
}

export async function findReleaseEntity(id: string): Promise<FinancialEntity | null> {
  const canonicalId = canonicalCatalogId(id);
  const hash = catalogDetailHash(id);
  if (!canonicalId || !hash) return null;
  const value = await readArtifact(getDossierStoragePath(canonicalId, hash), hash);
  const parsed = parseFinancialEntitiesResiliently([value]);
  const entity = parsed.validEntities[0];
  if (!entity || entity.id !== canonicalId || !isPublishableEntity(entity)) throw new Error('Invalid catalog dossier');
  return entity;
}

export function releaseApprovalCandidateIds(): Set<string> {
  return new Set(manifest.approvalCandidateIds);
}
