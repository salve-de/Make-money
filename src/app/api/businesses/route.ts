import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import {
  readFoundationBusinessCase,
  readFoundationEntityPage,
  type FoundationBusinessCase,
  type FoundationEntityPage,
} from '@/lib/foundation/business-reader';
import { foundationDataset } from '@/lib/foundation/dataset-registry';
import type { FinancialEntity } from '@/platform/types/terminal';

export const dynamic = 'force-dynamic';

const CACHE_CONTROL = 'private, max-age=30, stale-while-revalidate=300';
const PAGE_TTL_MS = 30_000;
const DETAIL_TTL_MS = 60_000;
const MAX_PAGE_CACHE_ENTRIES = 32;
const MAX_DETAIL_CACHE_ENTRIES = 128;

type CacheEntry<T> = {
  expiresAt: number;
  value: T | Promise<T>;
};

const pageCache = new Map<string, CacheEntry<FoundationEntityPage>>();
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
    return Array.isArray(parsed) ? (parsed as FinancialEntity[]) : [];
  } catch {
    return [];
  }
}

function findFallbackEntity(id: string, localEntities: FinancialEntity[]): FinancialEntity | null {
  return localEntities.find((entity) => entity.id === id) ||
    INSTITUTIONAL_ENTITIES.find((entity) => entity.id === id) ||
    null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entityId = url.searchParams.get('entity_id') || url.searchParams.get('entityId');

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
          data,
        });
      }
    } catch (error) {
      console.warn('[businesses] Foundation detail read failed; using fallback:', error);
    }

    const fallback = findFallbackEntity(entityId, await readLocalEntities());
    return fallback
      ? response({ source: 'local_fallback', count: 1, data: fallback })
      : response({ error: 'Entity not found', entity_id: entityId }, 404);
  }

  const requestedLimit = Number(url.searchParams.get('limit') || '100');
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.floor(requestedLimit), 1), 100)
    : 100;
  const cursor = url.searchParams.get('cursor') || undefined;
  const cacheKey = `${limit}:${cursor || 'first'}`;

  try {
    const page = await readCached(
      pageCache,
      cacheKey,
      PAGE_TTL_MS,
      MAX_PAGE_CACHE_ENTRIES,
      () => readFoundationEntityPage({ cursor, limit })
    );
    if (page.data.length > 0 || page.hasMore) {
      return response({
        source: 'foundation_lake',
        dataset_id: foundationDataset('entities').datasetId,
        count: page.data.length,
        data: page.data,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      });
    }
  } catch (error) {
    console.warn('[businesses] Foundation entity page read failed; using fallback:', error);
  }

  const localEntities = await readLocalEntities();
  const fallbackEntities = localEntities.length > 0 ? localEntities : INSTITUTIONAL_ENTITIES;
  return response({
    source: localEntities.length > 0 ? 'local_fallback' : 'static_fallback',
    count: fallbackEntities.length,
    data: fallbackEntities,
    nextCursor: null,
    hasMore: false,
  });
}

