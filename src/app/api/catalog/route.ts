import { NextResponse } from 'next/server';
import { readCachedLocalPublishableEntities } from '@/lib/company-access/local-entity-index';
import { cachedPublicSummaryEntity } from '@/lib/company-access/projection-cache';
import { getCatalogManifest } from '@/lib/company-access/release-manifest';
import { matchesCatalogQuery, parseCatalogFilters } from '@/platform/model/entity-filter';

export const dynamic = 'force-dynamic';
// 公開版の要約は不変なので、同じ条件の応答本文は isolate 内で使い回せる。
// Workers の1要求あたりの CPU 時間に収めるため、要求のたびに全行の絞り込み・変換・JSON 化をやり直さない。
const BODY_CACHE_LIMIT = 64;
const bodyCache = new Map<string, string>();
const CATALOG_HEADERS = { 'Cache-Control': 'private, max-age=30', 'Content-Type': 'application/json' };
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  // 版は目印から実行時に決まる（ビルドし直さなくても切り替わる）
  const catalogGeneration = (await getCatalogManifest()).summaries.hash;
  const query = (params.get('q') ?? '').trim().toLowerCase();
  const offset = Number(params.get('offset') ?? '0');
  const requestedPageSize = Number(params.get('pageSize') ?? '100');
  const generation = params.get('generation');
  const sector = params.get('sector');
  if (sector !== null && !/^[A-Z][A-Z_]{1,39}$/.test(sector)) return NextResponse.json({ error: 'Invalid catalog query' }, { status: 400 });
  if (
    query.length > 200 ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isSafeInteger(requestedPageSize) ||
    requestedPageSize < 1 ||
    requestedPageSize > 100
  ) return NextResponse.json({ error: 'Invalid catalog query' }, { status: 400 });
  if (generation && generation !== catalogGeneration) return NextResponse.json({ error: 'CURSOR_STALE' }, { status: 409 });
  let filters;
  try { filters = parseCatalogFilters(params.get('filters')); }
  catch { return NextResponse.json({ error: 'Invalid catalog filters' }, { status: 400 }); }
  try {
    const entities = await readCachedLocalPublishableEntities();
    const cacheKey = JSON.stringify([catalogGeneration, sector, query, params.get('filters') ?? '', offset, requestedPageSize]);
    const cached = bodyCache.get(cacheKey);
    if (cached !== undefined) return new NextResponse(cached, { headers: CATALOG_HEADERS });
    const filtered = entities.filter((entity) => (!sector || entity.sector === sector) && matchesCatalogQuery(entity, query, filters));
    const data = filtered.slice(offset, offset + requestedPageSize).map(cachedPublicSummaryEntity);
    const nextOffset = offset + data.length;
    const body = JSON.stringify({ data, total: filtered.length, generation: catalogGeneration,
      nextOffset: nextOffset < filtered.length ? nextOffset : null });
    if (bodyCache.size >= BODY_CACHE_LIMIT) bodyCache.delete(bodyCache.keys().next().value as string);
    bodyCache.set(cacheKey, body);
    return new NextResponse(body, { headers: CATALOG_HEADERS });
  } catch {
    return NextResponse.json({ error: 'Catalog temporarily unavailable' }, { status: 503 });
  }
}
