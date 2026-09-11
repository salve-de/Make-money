import { reconcileFinancialEntity } from '@/platform/data/financial-reconciliation';
import { publicEntity, publicFoundationData } from '@/lib/company-access/public-entity';
import { normalizeFinancialEntity } from '@/shared/financial-integrity';
import { parseFinancialEntities } from '@/shared/financial-entity-schema';
import { parseFoundationBusinessCase, parseFoundationValuePage } from '@/lib/foundation/schema';
import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { INSTITUTIONAL_ENTITIES, INSTITUTIONAL_ENTITY_ALIASES, findInstitutionalEntity } from '@/platform/data/mockLedgerData';
import {
  readFoundationBusinessCase,
  readFoundationValuePage,
  type FoundationBusinessCase,
  type FoundationValuePage,
} from '@/lib/foundation/business-reader';
import { foundationDataset } from '@/lib/foundation/dataset-registry';
import type { FinancialEntity } from '@/platform/types/terminal';

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

function response(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': CACHE_CONTROL },
  });
}

async function readLocalEntities(): Promise<FinancialEntity[]> {
  try {
    const localIndexPath = resolve(process.cwd(), 'data/entities-index.json');
    const parsed: unknown = JSON.parse(await readFile(localIndexPath, 'utf8'));
    return parseFinancialEntities(parsed)
      .filter((entity) => !INSTITUTIONAL_ENTITY_ALIASES[entity.id])
      .map(reconcileFinancialEntity)
      .map(normalizeFinancialEntity);
  } catch {
    return [];
  }
}

function findFallbackEntity(id: string, localEntities: FinancialEntity[]): FinancialEntity | null {
  return localEntities.find((entity) => entity.id === id) ||
    findInstitutionalEntity(id) ||
    null;
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

  if (entityId && entityId.length > MAX_ENTITY_ID_LENGTH) {
    return response({ error: 'Invalid entity' }, 400);
  }

  if (entityId) {
    try {
      const data = await readCached(
        detailCache,
        entityId,
        DETAIL_TTL_MS,
        MAX_DETAIL_CACHE_ENTRIES,
        () => readFoundationBusinessCase(entityId)
      );
      if (data) {
        return response({
          source: 'foundation_lake',
          dataset_id: foundationDataset('researchBundles').datasetId,
          data: publicFoundationData(parseFoundationBusinessCase(data)),
        });
      }
    } catch (error) {
      logFoundationFailure('[businesses] Foundation detail read failed; using fallback:', error);
    }

    const fallback = findFallbackEntity(entityId, await readLocalEntities());
    return fallback
      ? response({ source: 'local_fallback', count: 1, data: publicEntity(fallback) })
      : response({ error: 'Entity not found', entity_id: entityId }, 404);
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
    if (page.data.length > 0 || page.hasMore) {
      return response({
        source: 'foundation_lake',
        dataset_id: foundationDataset('entities').datasetId,
        count: page.data.length,
        data: publicFoundationData(page.data),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      });
    }
  } catch (error) {
    logFoundationFailure('[businesses] Foundation entity page read failed; using fallback:', error);
  }

  const localEntities = await readLocalEntities();
  const fallbackEntities = localEntities.length > 0 ? localEntities : INSTITUTIONAL_ENTITIES;
  return response({
    source: localEntities.length > 0 ? 'local_fallback' : 'static_fallback',
    count: fallbackEntities.length,
    data: fallbackEntities.map(publicEntity),
    nextCursor: null,
    hasMore: false,
  });
}
