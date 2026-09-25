import {
  isPublishableEntity,
  publicEntity,
  publicFoundationBusinessCase,
  publicFoundationData,
  publicSummaryEntity,
} from '@/lib/company-access/public-entity';
import { parseFoundationBusinessCase, parseFoundationValuePage } from '@/lib/foundation/schema';
import { NextResponse } from 'next/server';
import {
  type FoundationBusinessCase,
  type FoundationValuePage,
  type FoundationValueSummary,
} from '@/lib/foundation/business-reader';
import { promisify } from 'node:util';
import { gunzip as gunzipCb } from 'node:zlib';
import { CloudflareR2BlobStorage } from '@/lib/foundation/immutable-dossier-pipeline';
import { computeDossierContentHash, getDossierStoragePath } from '@/lib/foundation/dossier-projection';
import {
  adaptFoundationDetailToFinancialEntity,
  adaptFoundationSummaryToFinancialEntity,
  isFoundationDossierReady,
} from '@/lib/foundation/foundation-adapter';
import {
  assertMakeMoneyValuePage,
  isMakeMoneyViewBackfillComplete,
  readMakeMoneyValuePage,
  readMakeMoneyViewDetail,
} from '@/lib/foundation/make-money-view';
import { foundationDataset } from '@/lib/foundation/dataset-registry';
import { parseFinancialEntity } from '@/shared/financial-entity-schema';
import { getFoundationBucketAsync, listR2Objects, readR2Object } from '@/lib/storage/r2';

const gunzip = promisify(gunzipCb);

export const dynamic = 'force-dynamic';

const CACHE_CONTROL = 'private, max-age=30, stale-while-revalidate=300';
const DETAIL_TTL_MS = 60_000;
const MAX_DETAIL_CACHE_ENTRIES = 128;
const MAX_ENTITY_ID_LENGTH = 200;
const MAX_R2_CURSOR_LENGTH = 2048;
const FOUNDATION_SEARCH_OBJECT_PAGE_SIZE = 100;
const FOUNDATION_VIEW_PREFIX = 'views/make-money/v1/entities/';
const FOUNDATION_READ_RETRY_DELAY_MS = 150;
const FOUNDATION_LIST_PAGE_LIMIT = 12;

type CacheEntry<T> = {
  expiresAt: number;
  value: T | Promise<T>;
};

const detailCache = new Map<string, CacheEntry<FoundationBusinessCase>>();

function foundationSummarySearchText(summary: FoundationValueSummary): string {
  return [
    summary.id,
    summary.name,
    summary.entityType,
    summary.canonicalIdentifier,
    summary.domain,
    summary.status,
    ...summary.aliases,
    ...summary.valueProfile.labels,
    summary.valueProfile.businessSignal,
    summary.valueProfile.painSignal,
    summary.valueProfile.moneySignal,
    summary.valueProfile.tractionSignal,
    summary.valueProfile.mechanismSignal,
    summary.valueProfile.timeSignal,
  ].filter((value): value is string => typeof value === 'string').join(' ').toLowerCase();
}

function matchesFoundationQuery(summary: FoundationValueSummary, query: string): boolean {
  return foundationSummarySearchText(summary).includes(query.toLowerCase());
}

function isStoredEntityIdName(value: string): boolean {
  return /^ent_[a-z0-9]+_[a-f0-9]{20}$/.test(value);
}

function summaryFromFoundationDetail(detail: FoundationBusinessCase): FoundationValueSummary {
  return {
    id: detail.id,
    name: detail.name,
    entityType: detail.entityType,
    aliases: detail.aliases,
    canonicalIdentifier: detail.canonicalIdentifier,
    domain: detail.domain,
    status: detail.status,
    observedAt: detail.observedAt,
    evidenceIds: detail.evidenceIds,
    valueProfile: detail.valueProfile,
  };
}

function parseFoundationSearchCursor(cursor: string | undefined): string | undefined {
  if (!cursor) return undefined;
  // The client parser historically passes the underlying R2 cursor through
  // unchanged, while this bounded search route prefixes its own cursor so it
  // cannot be confused with an ordinary Foundation page cursor. Accept both
  // forms to preserve the existing read-only cursor contract.
  const encoded = cursor.startsWith('foundation-search-v1:')
    ? cursor.slice('foundation-search-v1:'.length)
    : cursor;
  if (!encoded) throw new Error('Invalid foundation search cursor');
  let decoded: string;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    throw new Error('Invalid foundation search cursor');
  }
  if (!decoded || decoded.length > MAX_R2_CURSOR_LENGTH) throw new Error('Invalid foundation search cursor');
  return decoded;
}

async function readFoundationSearchPage(options: {
  query: string;
  cursor?: string;
  limit: number;
}): Promise<{
  data: FoundationValueSummary[];
  total: number | null;
  nextCursor: string | null;
  complete: boolean;
  newArrivals: FoundationValuePage['newArrivals'];
}> {
  const newArrivals: FoundationValuePage['newArrivals'] = null;
  const matches: FoundationValueSummary[] = [];
  const seenIds = new Set<string>();
  const bucket = await getFoundationBucketAsync('lake');

  const objectPage = await listR2Objects({
    bucket,
    prefix: FOUNDATION_VIEW_PREFIX,
    cursor: options.cursor,
    // The R2 cursor advances by object, not by matching row. Never scan more
    // objects than this response can return, otherwise matches after the
    // output slice would be skipped permanently when the cursor advances.
    limit: Math.min(Math.max(Math.floor(options.limit), 1), FOUNDATION_SEARCH_OBJECT_PAGE_SIZE),
  });
  const summaries = await mapBoundedFoundationSearchReads(bucket, objectPage.objects, options.query);
  for (const summary of summaries) {
    if (!matchesFoundationQuery(summary, options.query)) continue;
    if (!isPublishableEntity(adaptFoundationSummaryToFinancialEntity(summary))) continue;
    if (seenIds.has(summary.id)) continue;
    seenIds.add(summary.id);
    matches.push(summary);
  }

  const data = matches.slice(0, options.limit);
  return {
    data,
    // A search page is intentionally bounded. The UI must not present the
    // scanned page size as the full Foundation total until a separate index
    // exists; curated catalog totals remain exact via /api/catalog.
    total: null,
    nextCursor: objectPage.truncated && objectPage.cursor
      ? `foundation-search-v1:${encodeURIComponent(objectPage.cursor)}`
      : null,
    complete: !objectPage.truncated,
    newArrivals,
  };
}

async function mapBoundedFoundationSearchReads(
  bucket: string,
  objects: Array<{ key: string }>,
  query: string,
): Promise<FoundationValueSummary[]> {
  const results: Array<FoundationValueSummary | null> = new Array(objects.length).fill(null);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(8, objects.length) }, async () => {
    while (nextIndex < objects.length) {
      const index = nextIndex++;
      const object = await readR2Object(bucket, objects[index].key);
      if (!object) continue;
      try {
        const parsed = JSON.parse(new TextDecoder().decode(object.body)) as { summary?: unknown; detail?: unknown };
        if (!parsed || typeof parsed !== 'object' || !('summary' in parsed)) continue;
        const page = parseFoundationValuePage({
          data: [parsed.summary],
          nextCursor: null,
          hasMore: false,
          newArrivals: null,
        });
        let summary = page.data[0] ?? null;
        if (!summary) continue;

        // Prefer a real name already present in the materialized detail. Older
        // views can retain canonical_name=storedID in both summary and detail;
        // those rows need the existing read-time resolver for name searches.
        if (!matchesFoundationQuery(summary, query) && parsed.detail) {
          try {
            const detailPage = parseFoundationValuePage({
              data: [parsed.detail],
              nextCursor: null,
              hasMore: false,
              newArrivals: null,
            });
            const detailSummary = detailPage.data[0];
            if (detailSummary && matchesFoundationQuery(detailSummary, query)) summary = detailSummary;
          } catch {
            // An optional legacy detail projection must not make the summary
            // row unreadable; the immutable source remains untouched.
          }
        }

        if (!matchesFoundationQuery(summary, query) && isStoredEntityIdName(summary.name)) {
          const readThrough = await readMakeMoneyViewDetail(summary.id).catch(() => null);
          if (readThrough) summary = summaryFromFoundationDetail(readThrough);
        }
        results[index] = summary;
      } catch {
        // A malformed or missing materialized row is excluded from search; the
        // immutable source remains untouched and the next audit can report it.
      }
    }
  }));
  return results.filter((value): value is FoundationValueSummary => Boolean(value));
}

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

async function retryFoundationRead<T>(loader: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await loader();
    } catch (error) {
      lastError = error;
      if (attempt === 1) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, FOUNDATION_READ_RETRY_DELAY_MS));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Foundation read failed');
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

async function findCuratedPublishableEntity(entityId: string) {
  const { findCachedPublishableEntity } = await import('@/lib/company-access/local-entity-index');
  return findCachedPublishableEntity(entityId);
}

async function readCuratedFallbackEntities() {
  const { readCachedLocalPublishableEntities } = await import('@/lib/company-access/local-entity-index');
  const localEntities = await readCachedLocalPublishableEntities();
  if (localEntities.length > 0) {
    return { source: 'local_fallback' as const, entities: localEntities };
  }
  const { INSTITUTIONAL_ENTITIES } = await import('@/platform/data/mockLedgerData');
  return { source: 'static_fallback' as const, entities: INSTITUTIONAL_ENTITIES };
}

function foundationDetailResponse(parsed: FoundationBusinessCase): NextResponse | null {
  const summaryGate = adaptFoundationSummaryToFinancialEntity(parsed);
  if (!isPublishableEntity(summaryGate)) return null;

  const adapted = adaptFoundationDetailToFinancialEntity(parsed);
  const actualHash = adapted.latestDossierHash || computeDossierContentHash(adapted);
  const revision = adapted.sourceRevision ?? 1;
  return response({
    source: 'foundation_lake',
    dataset_id: foundationDataset('researchBundles').datasetId,
    data: publicFoundationData(publicFoundationBusinessCase(parsed)),
    dossierHash: actualHash,
    sourceRevision: revision,
    isStale: false,
  }, 200, {
    'X-Dossier-Hash': actualHash,
    'X-Source-Revision': String(revision),
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entityId = url.searchParams.get('entity_id') || url.searchParams.get('entityId');
  const requestedDossierHash = url.searchParams.get('dossier_hash') || url.searchParams.get('dossierHash');
  const returnSummaryOnly = url.searchParams.get('summary') === 'true';
  const foundationOnly = url.searchParams.get('foundationOnly') === 'true';

  if (entityId && entityId.length > MAX_ENTITY_ID_LENGTH) {
    return response({ error: 'Invalid entity' }, 400);
  }
  if (requestedDossierHash && !/^[a-f0-9]{64}$/.test(requestedDossierHash)) {
    return response({ error: 'Invalid dossier hash' }, 400);
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
        const parsed = parseFinancialEntity(JSON.parse(decompressed.toString('utf8')));
        if (parsed.id !== entityId) return response({ error: 'Dossier identity mismatch' }, 409);

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

    let parsedFoundation: FoundationBusinessCase | null = null;
    let foundationResponse: NextResponse | null = null;
    let foundationReady = false;
    let stagedViewMissing = false;

    try {
      const stagedView = await readMakeMoneyViewDetail(entityId);
      if (!stagedView) {
        stagedViewMissing = true;
      } else {
        const data = await readCached(
          detailCache,
          `view:${entityId}`,
          DETAIL_TTL_MS,
          MAX_DETAIL_CACHE_ENTRIES,
          async () => stagedView,
        );
        parsedFoundation = parseFoundationBusinessCase(data);
        if (parsedFoundation) {
          foundationReady = isFoundationDossierReady(parsedFoundation);
          if (foundationOnly || foundationReady) {
            foundationResponse = foundationDetailResponse(parsedFoundation);
          }
        }
      }
    } catch (error) {
      logFoundationFailure('[businesses] Foundation detail projection failed:', error);
      if (foundationOnly) {
        return response({ error: 'Foundation detail temporarily unavailable', entity_id: entityId }, 503);
      }
      parsedFoundation = null;
      foundationResponse = null;
      foundationReady = false;
    }

    // Foundation-only detail is the hot path for collected cases. It must not
    // load the multi-megabyte curated catalog/static fallback graph into a cold
    // Worker isolate. The rights-gated materialized view is the only authority.
    if (foundationOnly) {
      if (stagedViewMissing || !parsedFoundation) {
        return response({ error: 'Entity not found', entity_id: entityId }, 404);
      }
      return foundationResponse
        || response({ error: 'Entity not publishable', entity_id: entityId }, 404);
    }

    // Preserve the existing replacement rule without paying curated lookup
    // cost when the Foundation dossier is already ready to replace it.
    if (foundationReady && foundationResponse) {
      return foundationResponse;
    }

    // Load the curated graph only when it can still win the precedence rule,
    // and perform at most one curated lookup per request.
    const curated = await findCuratedPublishableEntity(entityId);
    if (curated) {
      const actualHash = curated.latestDossierHash || computeDossierContentHash(curated);
      const revision = curated.sourceRevision ?? 1;
      return response({
        source: 'local_fallback',
        count: 1,
        data: publicEntity(curated),
        dossierHash: actualHash,
        sourceRevision: revision,
        isStale: false,
      }, 200, {
        'X-Dossier-Hash': actualHash,
        'X-Source-Revision': String(revision),
      });
    }

    // Foundation-only entities remain usable even when their dossier is still
    // partial, provided the public publication gate accepts the materialized view.
    if (parsedFoundation) {
      try {
        const partial = foundationResponse || foundationDetailResponse(parsedFoundation);
        if (partial) return partial;
      } catch (error) {
        // Preserve the legacy contract: a malformed/expensive Foundation
        // projection must not turn a normal detail request into an uncaught 500
        // after curated fallback has already missed.
        logFoundationFailure('[businesses] Partial Foundation detail projection failed:', error);
      }
    }

    return response({ error: 'Entity not found', entity_id: entityId }, 404);
  }

  const requestedLimit = Number(url.searchParams.get('limit') || '100');
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.floor(requestedLimit), 1), 100)
    : 100;
  const cursor = url.searchParams.get('cursor') || undefined;
  if (cursor && cursor.length > MAX_R2_CURSOR_LENGTH) {
    return response({ error: 'Invalid cursor' }, 400);
  }
  const foundationListLimit = foundationOnly ? Math.min(limit, FOUNDATION_LIST_PAGE_LIMIT) : limit;
  const foundationQuery = (url.searchParams.get('q') || '').trim();
  if (foundationQuery.length > 200) {
    return response({ error: 'Invalid foundation query' }, 400);
  }
  if (foundationQuery && foundationOnly) {
    try {
      const materializedViewReady = await isMakeMoneyViewBackfillComplete();
      const searchCursor = parseFoundationSearchCursor(cursor);
      const searchPage = await readFoundationSearchPage({
        query: foundationQuery,
        cursor: searchCursor,
        limit: foundationListLimit,
      });
      return response({
        source: 'foundation_lake',
        projection: cursor || materializedViewReady ? 'make-money.v1' : 'make-money.v1-backfill-in-progress',
        count: searchPage.data.length,
        total: searchPage.total,
        searchComplete: searchPage.complete,
        data: publicFoundationData(searchPage.data),
        nextCursor: searchPage.nextCursor,
        hasMore: Boolean(searchPage.nextCursor),
        newArrivals: searchPage.newArrivals,
      });
    } catch (error) {
      logFoundationFailure('[businesses] Foundation bounded search failed:', error);
      return response({ error: 'Foundation catalog temporarily unavailable' }, 503);
    }
  }
  try {
    const materializedViewReady = await retryFoundationRead(() => isMakeMoneyViewBackfillComplete());
    // Do not retain catalog pages in a Worker isolate. A long browser scroll
    // should release every page after its response; R2 range reads are cheap
    // enough that reliability is more important than a first-page cache hit.
    const page = await retryFoundationRead(() => readMakeMoneyValuePage({ cursor, limit: foundationListLimit }));
    assertMakeMoneyValuePage(page);

    // The product view is already a FoundationValuePage. Use FinancialEntity
    // only as a server-side publication gate, then return the canonical view
    // shape so the client can perform the single authoritative adaptation.
    const publishableIds = new Set(
      (page.data || [])
        .filter((summary) => isPublishableEntity(adaptFoundationSummaryToFinancialEntity(summary)))
        .map((summary) => summary.id)
    );
    const publishableSummaries = (page.data || []).filter((summary) => publishableIds.has(summary.id));

    if (publishableSummaries.length > 0 || page.hasMore) {
      if (returnSummaryOnly) {
        const summaries = publishableSummaries
          .map(adaptFoundationSummaryToFinancialEntity)
          .map(publicSummaryEntity);
        return response({
          source: 'foundation_lake',
          projection: materializedViewReady ? 'make-money.v1' : 'make-money.v1-backfill-in-progress',
          count: summaries.length,
          data: publicFoundationData(summaries),
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        });
      }

      return response({
        source: 'foundation_lake',
        projection: materializedViewReady ? 'make-money.v1' : 'make-money.v1-backfill-in-progress',
        count: publishableSummaries.length,
        data: publicFoundationData(publishableSummaries),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        newArrivals: page.newArrivals,
      });
    }
  } catch (error) {
    logFoundationFailure('[businesses] Make-Money Foundation view read failed; using fallback:', error);
  }

  // The current UI loads accepted catalog pages independently. Do not send a
  // redundant multi-megabyte legacy fallback when only Foundation was requested.
  if (foundationOnly) {
    return response({ error: 'Foundation catalog temporarily unavailable' }, 503);
  }
  const curatedFallback = await readCuratedFallbackEntities();
  const fallbackEntities = curatedFallback.entities.filter(isPublishableEntity);
  const transformed = returnSummaryOnly
    ? fallbackEntities.map(publicSummaryEntity)
    : fallbackEntities.map(publicEntity);

  return response({
    source: curatedFallback.source,
    count: fallbackEntities.length,
    data: transformed,
    nextCursor: null,
    hasMore: false,
    newArrivals: null,
  });
}
