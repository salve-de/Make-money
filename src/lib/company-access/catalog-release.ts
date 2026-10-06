import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import manifest from '../../../data/catalog-release.json';
import { getFoundationBucketAsync, readR2Object } from '@/lib/storage/r2';
import { getDossierStoragePath } from '@/lib/foundation/dossier-projection';
import { parseFinancialEntitiesResiliently } from '@/shared/financial-entity-schema';
import { isPublishableEntity } from './public-entity';
import { toPatternCase, type PatternCase, type PatternSourceCase } from './case-patterns';
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

// 公開版の詳細はハッシュで中身が決まる（不変）。同じ isolate では1事例につき1回だけ読み、展開・検査する。
// Workers は1要求あたりの CPU 時間が短いため、要求のたびに gunzip・ハッシュ照合・スキーマ検査をやり直さない。
// 上限つき（古い順に捨てる）。公開中の事例数より少し多い程度に抑え、isolate のメモリを増やし続けない。
const RELEASE_ENTITY_CACHE_LIMIT = 128;
const releaseEntities = new Map<string, Promise<FinancialEntity>>();

export async function findReleaseEntity(id: string): Promise<FinancialEntity | null> {
  const canonicalId = canonicalCatalogId(id);
  const hash = catalogDetailHash(id);
  if (!canonicalId || !hash) return null;
  const cacheKey = `${canonicalId}:${hash}`;
  let pending = releaseEntities.get(cacheKey);
  if (pending) {
    // 最近使った順に並べ直す
    releaseEntities.delete(cacheKey);
    releaseEntities.set(cacheKey, pending);
  } else {
    pending = readArtifact(getDossierStoragePath(canonicalId, hash), hash).then((value) => {
      const parsed = parseFinancialEntitiesResiliently([value]);
      const entity = parsed.validEntities[0];
      if (!entity || entity.id !== canonicalId || !isPublishableEntity(entity)) throw new Error('Invalid catalog dossier');
      return entity;
    });
    // 失敗（R2 の一時的な不調など）は覚えない。次の要求で読み直す
    pending.catch(() => releaseEntities.delete(cacheKey));
    if (releaseEntities.size >= RELEASE_ENTITY_CACHE_LIMIT) {
      releaseEntities.delete(releaseEntities.keys().next().value as string);
    }
    releaseEntities.set(cacheKey, pending);
  }
  return pending;
}

/** テスト用: 詳細の isolate 内キャッシュを空にする。 */
export function clearReleaseEntityCacheForTest(): void {
  releaseEntities.clear();
}

export function releaseApprovalCandidateIds(): Set<string> {
  return new Set(manifest.approvalCandidateIds);
}

// 傾向画面用。公開目録の全事例の詳細（reader だけ）を読み、軽い形にして isolate 内に覚える。
// 詳細は不変（ハッシュで決まる）なので、同じ版の間は1回だけ読む。失敗は覚えない。
let patternCases: Promise<PatternCase[]> | undefined;

export async function readReleasePatternCases(): Promise<PatternCase[]> {
  if (!patternCases) {
    patternCases = (async () => {
      const rows = await readReleaseSummaries();
      const out: PatternCase[] = [];
      const queue = [...rows];
      const worker = async () => {
        for (let row = queue.shift(); row; row = queue.shift()) {
          const hash = catalogDetailHash(row.id);
          if (!hash) throw new CatalogUnavailableError('Catalog detail hash is missing');
          const detail = await readArtifact(getDossierStoragePath(row.id, hash), hash);
          if (!isRecord(detail) || detail.id !== row.id) throw new CatalogUnavailableError('Invalid catalog dossier');
          out.push(toPatternCase({
            id: row.id,
            name: row.name,
            sector: typeof detail.sector === 'string' ? detail.sector : row.sector,
            tags: Array.isArray(detail.tags) ? detail.tags.filter((t): t is string => typeof t === 'string') : [],
            reader: isRecord(detail.reader) ? (detail.reader as PatternSourceCase['reader']) : undefined,
          }));
        }
      };
      await Promise.all(Array.from({ length: 8 }, worker));
      return out.sort((a, b) => a.id.localeCompare(b.id));
    })().catch((error) => { patternCases = undefined; throw error; });
  }
  return patternCases;
}
