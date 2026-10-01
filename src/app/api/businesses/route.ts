import { CatalogUnavailableError, readReleaseSummaries } from '@/lib/company-access/catalog-release';
import { findCachedPublishableEntity } from '@/lib/company-access/local-entity-index';
import { cachedPublicEntity } from '@/lib/company-access/projection-cache';
import { computeDossierContentHash } from '@/lib/foundation/dossier-projection';
import { matchesCatalogQuery } from '@/platform/model/entity-filter';
import { catalogDetailHash, filterToCatalog, isCatalogId } from '@/shared/catalog-membership';
import { NextResponse } from 'next/server';

/**
 * 公開目録（data/catalog-release.json）にある事例だけを返す。
 * 目録に無い ID は、保存先（R2）を読む前に 404。収集基盤（lake）のスナップショットや view は読まない。
 */
export const dynamic = 'force-dynamic';

const CACHE_CONTROL = 'private, max-age=30, stale-while-revalidate=300';
const RELEASE_DETAIL_CACHE_CONTROL = 'private, max-age=600, stale-while-revalidate=3600';
const MAX_ENTITY_ID_LENGTH = 200;
const MAX_CURSOR_LENGTH = 16;

function response(body: unknown, status = 200, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': CACHE_CONTROL, ...headers },
  });
}

function unavailable(error: unknown): NextResponse {
  if (!(error instanceof CatalogUnavailableError)) console.warn('[businesses] failed', error);
  return response({ error: 'Catalog temporarily unavailable' }, 503, { 'Cache-Control': 'no-store' });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entityId = url.searchParams.get('entity_id') || url.searchParams.get('entityId');
  const requestedDossierHash = url.searchParams.get('dossier_hash') || url.searchParams.get('dossierHash');

  if (entityId && entityId.length > MAX_ENTITY_ID_LENGTH) {
    return response({ error: 'Invalid entity' }, 400);
  }
  if (requestedDossierHash && !/^[a-f0-9]{64}$/.test(requestedDossierHash)) {
    return response({ error: 'Invalid dossier hash' }, 400);
  }

  if (entityId) {
    // 目録に無い事例は、保存先を読まずに先頭で 404
    if (!isCatalogId(entityId)) {
      return response({ error: 'Not published' }, 404);
    }
    // ハッシュを指定する時は、目録のハッシュと一致する時だけ公開版から返す。違えば厳格に 404（別版を探さない）
    if (requestedDossierHash && catalogDetailHash(entityId) !== requestedDossierHash) {
      return response({ error: 'Dossier snapshot not found for requested hash', dossier_hash: requestedDossierHash }, 404);
    }
    try {
      const entity = await findCachedPublishableEntity(entityId);
      if (!entity) return response({ error: 'Entity not found', entity_id: entityId }, 404);
      const actualHash = entity.latestDossierHash || catalogDetailHash(entity.id) || computeDossierContentHash(entity);
      const revision = entity.sourceRevision ?? 1;
      return response({
        source: 'catalog_release',
        count: 1,
        data: cachedPublicEntity(entity),
        dossierHash: actualHash,
        sourceRevision: revision,
        isStale: false,
      }, 200, {
        'X-Dossier-Hash': actualHash,
        'X-Source-Revision': String(revision),
        // ハッシュ指定の公開版の詳細は中身が変わらない。同じ事例を開き直した時はブラウザの控えを使い、Worker を起こさない
        ...(requestedDossierHash ? { 'Cache-Control': RELEASE_DETAIL_CACHE_CONTROL } : {}),
      });
    } catch (error) {
      return unavailable(error);
    }
  }

  const requestedLimit = Number(url.searchParams.get('limit') || '100');
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.floor(requestedLimit), 1), 100)
    : 100;
  const cursor = url.searchParams.get('cursor') || '0';
  const query = (url.searchParams.get('q') || '').trim().toLowerCase();
  if (query.length > 200) return response({ error: 'Invalid query' }, 400);
  const offset = Number(cursor);
  if (cursor.length > MAX_CURSOR_LENGTH || !Number.isSafeInteger(offset) || offset < 0) {
    return response({ error: 'Invalid cursor' }, 400);
  }

  try {
    // 一覧・検索は公開版の要約だけ。出口でも目録の門を通す
    const rows = filterToCatalog(await readReleaseSummaries()).filter((row) => matchesCatalogQuery(row, query));
    const data = rows.slice(offset, offset + limit);
    const next = offset + data.length;
    return response({
      source: 'catalog_release',
      count: data.length,
      total: rows.length,
      data,
      nextCursor: next < rows.length ? String(next) : null,
      hasMore: next < rows.length,
      newArrivals: null,
    });
  } catch (error) {
    return unavailable(error);
  }
}
