import { isPublishableEntity, publicEntity, publicFoundationData, publicSummaryEntity } from '@/lib/company-access/public-entity';
import { findCachedPublishableEntity, readCachedLocalPublishableEntities } from '@/lib/company-access/local-entity-index';
import { parseFoundationBusinessCase, parseFoundationValuePage } from '@/lib/foundation/schema';
import { NextResponse } from 'next/server';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import type { FinancialEntity } from '@/platform/types/terminal';
import {
  readFoundationBusinessCase,
  readFoundationValuePage,
  type FoundationBusinessCase,
  type FoundationValuePage,
} from '@/lib/foundation/business-reader';
import { promisify } from 'node:util';
import { gunzip as gunzipCb } from 'node:zlib';
import { CloudflareR2BlobStorage } from '@/lib/foundation/immutable-dossier-pipeline';
import { computeDossierContentHash, getDossierStoragePath } from '@/lib/foundation/dossier-projection';
import { adaptFoundationDetailToFinancialEntity, adaptFoundationSummaryToFinancialEntity } from '@/lib/foundation/foundation-adapter';
import { foundationDataset } from '@/lib/foundation/dataset-registry';

const gunzip = promisify(gunzipCb);

export const dynamic = 'force-dynamic';

const CACHE_CONTROL = 'private, max-age=30, stale-while-revalidate=300';
const PAGE_TTL_MS = 30_000;
const DETAIL_TTL_MS = 60_000;
const MAX_PAGE_CACHE_ENTRIES = 32;
const MAX_DETAIL_CACHE_ENTRIES = 128;
const MAX_ENTITY_ID_LENGTH = 200;
const MAX_R2_CURSOR_LENGTH = 2048;

type CacheEntry<T> = {
  expiresAt: number;
  value: T | Promise<T>;
};

const pageCache = new Map<string, CacheEntry<FoundationValuePage>>();
const detailCache = new Map<string, CacheEntry<FoundationBusinessCase>>();

async function readCached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  ttlMs: number,
  maxEntries: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  if (hit) cache.delete(key);

  const pending = loader();
  cache.set(key, { expiresAt: Date.now() + ttlMs, value: pending });
  while (cache.size > maxEntries) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
  try {
    const value = await pending;
    cache.set(key, { expiresAt: Date.now() + ttlMs, value });
    return value;
  } catch (error) {
    if (cache.get(key)?.value === pending) cache.delete(key);
    throw error;
  }
}

function response(body: unknown, status = 200, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': CACHE_CONTROL, ...headers },
  });
}

function logFoundationFailure(message: string, error: unknown): void {
  // A local Next server intentionally has no R2 credentials. Keep that
  // expected fallback quiet; provider and parsing failures remain visible.
  if ((error as { code?: unknown })?.code !== 'R2_NOT_CONFIGURED') {
    console.warn(message, error);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entityId = url.searchParams.get('entity_id') || url.searchParams.get('entityId');
  const requestedDossierHash = url.searchParams.get('dossier_hash') || url.searchParams.get('dossierHash');
  const returnSummaryOnly = url.searchParams.get('summary') === 'true';

  if (entityId && entityId.length > MAX_ENTITY_ID_LENGTH) {
    return response({ error: 'Invalid entity' }, 400);
  }

  if (entityId) {
    if (requestedDossierHash) {
      try {
        const r2Storage = new CloudflareR2BlobStorage('lake');
        const dossierPath = getDossierStoragePath(entityId, requestedDossierHash);
        const blob = await r2Storage.getObject(dossierPath);
        if (!blob) {
          // CAS契約: 指定ハッシュのスナップショットが存在しない場合、フォールバックせず厳格404
          return response({ error: 'Dossier snapshot not found for requested hash', entity_id: entityId, dossier_hash: requestedDossierHash }, 404);
        }
        const decompressed = await gunzip(blob.body);
        const parsed = JSON.parse(decompressed.toString('utf8')) as FinancialEntity;

        // Content Hash (SHA-256) 再計算と厳密照合
        const computedHash = computeDossierContentHash(parsed);
        if (computedHash !== requestedDossierHash) {
          return response({
            error: 'Dossier hash mismatch (content integrity verification failed)',
            expected: requestedDossierHash,
            actual: computedHash,
          }, 409);
        }

        if (!isPublishableEntity(parsed)) {
          return response({ error: 'Entity not publishable', entity_id: entityId }, 404);
        }

        return response({
          source: 'immutable_dossier_cas',
          data: publicFoundationData(parsed),
          dossierHash: requestedDossierHash,
          sourceRevision: parsed.sourceRevision ?? 1,
          isStale: false,
        }, 200, {
          'X-Dossier-Hash': requestedDossierHash,
          'X-Source-Revision': String(parsed.sourceRevision ?? 1),
        });
      } catch (error) {
        logFoundationFailure(`[businesses] Immutable dossier CAS lookup failed for ${requestedDossierHash}:`, error);
        const errCode = (error as { code?: unknown })?.code;
        if (errCode === 'R2_NOT_CONFIGURED') {
          return response({ error: 'Dossier snapshot not found for requested hash', entity_id: entityId, dossier_hash: requestedDossierHash }, 404);
        }
        return response({ error: 'Immutable dossier CAS lookup error', entity_id: entityId, dossier_hash: requestedDossierHash }, 500);
      }
    }

    try {
      const data = await readCached(
        detailCache,
        entityId,
        DETAIL_TTL_MS,
        MAX_DETAIL_CACHE_ENTRIES,
        () => readFoundationBusinessCase(entityId)
      );
      if (data) {
        const parsed = parseFoundationBusinessCase(data);
        if (parsed) {
          const adapted = adaptFoundationDetailToFinancialEntity(parsed);
          if (isPublishableEntity(adapted)) {
            const actualHash = adapted.latestDossierHash || computeDossierContentHash(adapted);
            const revision = adapted.sourceRevision ?? 1;
            return response({
              source: 'foundation_lake',
              dataset_id: foundationDataset('researchBundles').datasetId,
              data: publicFoundationData(adapted),
              dossierHash: actualHash,
              sourceRevision: revision,
              isStale: false,
            }, 200, {
              'X-Dossier-Hash': actualHash,
              'X-Source-Revision': String(revision),
            });
          }
        }
      }
    } catch (error) {
      logFoundationFailure('[businesses] Foundation detail read failed; using fallback:', error);
    }

    const fallback = await findCachedPublishableEntity(entityId);
    if (!fallback) {
      return response({ error: 'Entity not found', entity_id: entityId }, 404);
    }

    const actualHash = fallback.latestDossierHash || computeDossierContentHash(fallback);
    const revision = fallback.sourceRevision ?? 1;

    return response({
      source: 'local_fallback',
      count: 1,
      data: publicEntity(fallback),
      dossierHash: actualHash,
      sourceRevision: revision,
      isStale: false,
    }, 200, {
      'X-Dossier-Hash': actualHash,
      'X-Source-Revision': String(revision),
    });
  }

  const requestedLimit = Number(url.searchParams.get('limit') || '100');
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.floor(requestedLimit), 1), 100)
    : 100;
  const cursor = url.searchParams.get('cursor') || undefined;
  if (cursor && cursor.length > MAX_R2_CURSOR_LENGTH) {
    return response({ error: 'Invalid cursor' }, 400);
  }
  const cacheKey = `${limit}:${cursor || 'first'}`;

  try {
    const page = await readCached(
      pageCache,
      cacheKey,
      PAGE_TTL_MS,
      MAX_PAGE_CACHE_ENTRIES,
      () => readFoundationValuePage({ cursor, limit })
    );
    parseFoundationValuePage(page);
    const adaptedEntities = (page.data || []).map(adaptFoundationSummaryToFinancialEntity);
    const publishableData = adaptedEntities.filter(isPublishableEntity);
    if (publishableData.length > 0 || page.hasMore) {
      return response({
        source: 'foundation_lake',
        dataset_id: foundationDataset('entities').datasetId,
        count: publishableData.length,
        data: publicFoundationData(returnSummaryOnly ? publishableData.map(publicSummaryEntity) : publishableData),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      });
    }
  } catch (error) {
    logFoundationFailure('[businesses] Foundation entity page read failed; using fallback:', error);
  }

  const localEntities = await readCachedLocalPublishableEntities();
  const rawEntities = localEntities.length > 0 ? localEntities : INSTITUTIONAL_ENTITIES;
  const fallbackEntities = rawEntities.filter(isPublishableEntity);
  const transformed = returnSummaryOnly
    ? fallbackEntities.map(publicSummaryEntity)
    : fallbackEntities.map(publicEntity);

  return response({
    source: localEntities.length > 0 ? 'local_fallback' : 'static_fallback',
    count: fallbackEntities.length,
    data: transformed,
    nextCursor: null,
    hasMore: false,
  });
}
