import { NextResponse } from 'next/server';
import { readCachedLocalPublishableEntities } from '@/lib/company-access/local-entity-index';
import { publicSummaryEntity } from '@/lib/company-access/public-entity';
import manifest from '../../../../data/catalog-release.json';
import { matchesCatalogQuery, parseCatalogFilters } from '@/platform/model/entity-filter';

export const dynamic = 'force-dynamic';
const catalogGeneration = manifest.summaries.hash;
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get('q') ?? '').trim().toLowerCase();
  const offset = Number(params.get('offset') ?? '0');
  const requestedPageSize = Number(params.get('pageSize') ?? '100');
  const generation = params.get('generation');
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
    const filtered = entities.filter((entity) => matchesCatalogQuery(entity, query, filters));
    const data = filtered.slice(offset, offset + requestedPageSize).map(publicSummaryEntity);
    const nextOffset = offset + data.length;
    return NextResponse.json({ data, total: filtered.length, generation: catalogGeneration,
      nextOffset: nextOffset < filtered.length ? nextOffset : null }, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch {
    return NextResponse.json({ error: 'Catalog temporarily unavailable' }, { status: 503 });
  }
}
