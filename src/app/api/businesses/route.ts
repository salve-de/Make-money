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
  mapServingReads,
  readMakeMoneyPublicEntitySummaryById,
  readMakeMoneyValuePage,
  readMakeMoneyViewDetail,
  selectNewArrivalPromotionIds,
} from '@/lib/foundation/make-money-view';
import { readIndexedNewArrivalsRelease } from '@/lib/foundation/new-arrivals-index';
import { foundationDataset } from '@/lib/foundation/dataset-registry';
import { parseFinancialEntity } from '@/shared/financial-entity-schema';
import { getFoundationBucketAsync, listR2Objects, readR2Object } from '@/lib/storage/r2';
import { foundationMayServeDetail } from '@/shared/dossier-authority';

const gunzip = promisify(gunzipCb);

export const dynamic = 'force-dynamic';

const CACHE_CONTROL = 'private, max-age=30, stale-while-revalidate=300';
const MAX_ENTITY_ID_LENGTH = 200;
const MAX_R2_CURSOR_LENGTH = 2048;
const MAX_FOUNDATION_SEARCH_CURSOR_LENGTH = 8192;
const MAX_FOUNDATION_SEARCH_EXCLUDED_IDS = 10;
const FOUNDATION_SEARCH_V1_CURSOR_PREFIX = 'foundation-search-v1:';
const FOUNDATION_SEARCH_V2_CURSOR_PREFIX = 'foundation-search-v2:';
const FOUNDATION_SEARCH_OBJECT_PAGE_SIZE = 100;
const FOUNDATION_VIEW_PREFIX = 'views/make-money/v1/entities/';
const FOUNDATION_READ_RETRY_DELAY_MS = 150;
const FOUNDATION_LIST_PAGE_LIMIT = 12;

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

type FoundationSearchCursor = {
  r2Cursor?: string;
  excludedIds: string[];
};

function parseFoundationSearchCursor(cursor: string | undefined): FoundationSearchCursor | undefined {
  if (!cursor) return undefined;
  if (cursor.length > MAX_FOUNDATION_SEARCH_CURSOR_LENGTH) {
    throw new Error('Invalid foundation search cursor');
  }

  if (cursor.startsWith(FOUNDATION_SEARCH_V2_CURSOR_PREFIX)) {
    const encoded = cursor.slice(FOUNDATION_SEARCH_V2_CURSOR_PREFIX.length);
    if (!encoded) throw new Error('Invalid foundation search cursor');
    let parsed: unknown;
    try {
      parsed = JSON.parse(decodeURIComponent(encoded));
    } catch {
      throw new Error('Invalid foundation search cursor');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Invalid foundation search cursor');
    }
    const value = parsed as { version?: unknown; r2Cursor?: unknown; excludedIds?: unknown };
    if (
      value.version !== 2
      || typeof value.r2Cursor !== 'string'
      || !value.r2Cursor
      || value.r2Cursor.length > MAX_R2_CURSOR_LENGTH
      || !Array.isArray(value.excludedIds)
      || value.excludedIds.length > MAX_FOUNDATION_SEARCH_EXCLUDED_IDS
      || value.excludedIds.some((id) => typeof id !== 'string' || !/^ent_[a-z0-9]+_[a-f0-9]{20}$/.test(id))
    ) {
      throw new Error('Invalid foundation search cursor');
    }
    return {
      r2Cursor: value.r2Cursor,
      excludedIds: [...new Set(value.excludedIds as string[])],
    };
  }

  // The client parser historically passes the underlying R2 cursor through
  // unchanged, while this bounded search route prefixes its own cursor so it
  // cannot be confused with an ordinary Foundation page cursor. Accept both
  // forms to preserve the existing read-only cursor contract.
  const encoded = cursor.startsWith(FOUNDATION_SEARCH_V1_CURSOR_PREFIX)
    ? cursor.slice(FOUNDATION_SEARCH_V1_CURSOR_PREFIX.length)
    : cursor;
  if (!encoded) throw new Error('Invalid foundation search cursor');
  let decoded: string;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    throw new Error('Invalid foundation search cursor');
  }
  if (!decoded || decoded.length > MAX_R2_CURSOR_LENGTH) throw new Error('Invalid foundation search cursor');
  return { r2Cursor: decoded, excludedIds: [] };
}

function serializeFoundationSearchCursor(r2Cursor: string, excludedIds: readonly string[]): string {
  const uniqueExcludedIds = [...new Set(excludedIds)]
    .filter((id) => /^ent_[a-z0-9]+_[a-f0-9]{20}$/.test(id))
    .slice(0, MAX_FOUNDATION_SEARCH_EXCLUDED_IDS);
  if (uniqueExcludedIds.length === 0) {
    return `${FOUNDATION_SEARCH_V1_CURSOR_PREFIX}${encodeURIComponent(r2Cursor)}`;
  }
  return `${FOUNDATION_SEARCH_V2_CURSOR_PREFIX}${encodeURIComponent(JSON.stringify({
    version: 2,
    r2Cursor,
    excludedIds: uniqueExcludedIds,
  }))}`;
}

async function readFoundationSearchPage(options: {
  query: string;
  cursor?: FoundationSearchCursor;
  limit: number;
}): Promise<{
  data: FoundationValueSummary[];
  total: number | null;
  nextCursor: string | null;
  complete: boolean;
  archiveRetryable: boolean;
  latestRetryable: boolean;
  newArrivals: FoundationValuePage['newArrivals'];
}> {
  let newArrivals: FoundationValuePage['newArrivals'] = null;
  let latestRetryable = false;
  if (!options.cursor?.r2Cursor) {
    try {
      newArrivals = await readIndexedNewArrivalsRelease();
    } catch (error) {
      latestRetryable = true;
      logFoundationFailure('[businesses] Latest Foundation release index read failed:', error);
    }
  }
  const matches: FoundationValueSummary[] = [];
  const seenIds = new Set(options.cursor?.excludedIds ?? []);
  const promotedIds: string[] = [];

  if (newArrivals) {
    const recentIds = selectNewArrivalPromotionIds(newArrivals.entityIds, seenIds);
    const latestReads = await mapServingReads(
      recentIds,
      async (entityId) => {
        try {
          return {
            summary: await readMakeMoneyPublicEntitySummaryById(entityId),
            failed: false,
          };
        } catch (error) {
          logFoundationFailure('[businesses] Latest Foundation summary read failed:', error);
          return { summary: null, failed: true };
        }
      },
    );
    for (const { summary, failed } of latestReads) {
      // A missing summary for a published ID is not proof that the latest
      // publication contains no matching row. Leave search explicitly partial.
      if (failed || !summary) {
        latestRetryable = true;
        continue;
      }
      if (!matchesFoundationQuery(summary, options.query)) continue;
      if (!isPublishableEntity(adaptFoundationSummaryToFinancialEntity(summary))) continue;
      if (seenIds.has(summary.id)) continue;
      seenIds.add(summary.id);
      promotedIds.push(summary.id);
      matches.push({ ...summary, isNew: true });
    }
  }

  try {
    // Resolve the historical archive only after latest-publication matches
    // have been read, so a bucket/LIST/GET failure cannot erase them.
    const bucket = await getFoundationBucketAsync('lake');
    const objectPage = await listR2Objects({
      bucket,
      prefix: FOUNDATION_VIEW_PREFIX,
      cursor: options.cursor?.r2Cursor,
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

    return {
      data: matches,
      // A search page is intentionally bounded. The UI must not present the
      // scanned page size as the full Foundation total until a separate index
      // exists; curated catalog totals remain exact via /api/catalog.
      total: null,
      nextCursor: objectPage.truncated && objectPage.cursor
        && !latestRetryable
        ? serializeFoundationSearchCursor(
          objectPage.cursor,
          [...(options.cursor?.excludedIds ?? []), ...promotedIds],
        )
        : null,
      complete: !objectPage.truncated && !latestRetryable,
      archiveRetryable: false,
      latestRetryable,
      newArrivals,
    };
  } catch (error) {
    // Cursor pages are explicit continuations. Let the route return 503 so
    // the client can retry the exact same cursor without advancing the scan.
    if (options.cursor?.r2Cursor) throw error;

    logFoundationFailure(
      '[businesses] Initial Foundation archive search page failed:',
      error,
    );
    // A failed first archive page is an incomplete result, not a trustworthy
    // empty search. Preserve any already-found latest-edition rows and expose
    // an explicit retry state even when there are no such rows.
    return {
      data: matches,
      total: null,
      nextCursor: null,
      complete: false,
      archiveRetryable: true,
      latestRetryable,
      newArrivals,
    };
  }
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
    // 公開中の事例の一覧の行は、公開版の詳細ハッシュを latestDossierHash に持つ。その詳細は lake ではなく
    // 公開版にあるので、目録のハッシュと一致する要求は下の curated（公開版）の経路で返す。
    const { catalogReleaseDetailHash } = await import('@/lib/company-access/catalog-release');
    const servedByRelease = Boolean(requestedDossierHash) && catalogReleaseDetailHash(entityId) === requestedDossierHash;
    if (requestedDossierHash && !servedByRelease) {
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

    // 公開中の事例は公開版が正本。目録にある ID は Foundation の view を読まず、curated（公開版）だけで返す。
    const { hasCatalogReleaseEntity } = await import('@/lib/company-access/catalog-release');
    const foundationAllowed = foundationMayServeDetail(hasCatalogReleaseEntity(entityId));

    let parsedFoundation: FoundationBusinessCase | null = null;
    let foundationResponse: NextResponse | null = null;
    let foundationReady = false;
    let stagedViewMissing = false;

    try {
      const stagedView = foundationAllowed ? await retryFoundationRead(() => readMakeMoneyViewDetail(entityId)) : null;
      if (!stagedView) {
        stagedViewMissing = true;
      } else {
        parsedFoundation = parseFoundationBusinessCase(stagedView);
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
  const foundationListLimit = foundationOnly ? Math.min(limit, FOUNDATION_LIST_PAGE_LIMIT) : limit;
  const foundationQuery = (url.searchParams.get('q') || '').trim();
  if (foundationQuery.length > 200) {
    return response({ error: 'Invalid foundation query' }, 400);
  }
  const isVersionedFoundationSearchCursor = Boolean(
    foundationOnly
    && foundationQuery
    && cursor?.startsWith(FOUNDATION_SEARCH_V2_CURSOR_PREFIX),
  );
  if (cursor && cursor.length > (
    isVersionedFoundationSearchCursor ? MAX_FOUNDATION_SEARCH_CURSOR_LENGTH : MAX_R2_CURSOR_LENGTH
  )) {
    return response({ error: 'Invalid cursor' }, 400);
  }
  if (foundationQuery && foundationOnly) {
    let searchCursor: FoundationSearchCursor | undefined;
    try {
      searchCursor = parseFoundationSearchCursor(cursor);
    } catch {
      return response({ error: 'Invalid cursor' }, 400);
    }
    try {
      const searchPage = await readFoundationSearchPage({
        query: foundationQuery,
        cursor: searchCursor,
        limit: foundationListLimit,
      });
      // This status is informational. A transient readiness-state read must
      // not discard already-resolved, publishable search results.
      const materializedViewReady = await isMakeMoneyViewBackfillComplete().catch((error) => {
        logFoundationFailure('[businesses] Foundation projection readiness read failed:', error);
        return false;
      });
      return response({
        source: 'foundation_lake',
        projection: materializedViewReady ? 'make-money.v1' : 'make-money.v1-backfill-in-progress',
        count: searchPage.data.length,
        total: searchPage.total,
        searchComplete: searchPage.complete,
        archiveRetryable: searchPage.archiveRetryable,
        latestRetryable: searchPage.latestRetryable,
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
