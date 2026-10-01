import { NextResponse } from 'next/server';
import { buildMediaResponse } from '@/lib/media/api';
import { publicMediaReaderFor, readMediaSource } from '@/lib/media/runtime';
import { filterToCatalog } from '@/shared/catalog-membership';
import { MEDIA_API_MAX_ENTITIES, MEDIA_API_MAX_URL_LENGTH, isMediaEntityId } from '@/shared/media-display';

export const dynamic = 'force-dynamic';

/**
 * Displayable images of the given entities: `GET /api/media?entity_id=ent_a&entity_id=ent_b`.
 * Only images whose effective decision is `allowed` for a non-person subject are ever returned, each with the
 * attribution text that must be shown with it. Held, blocked and person images are not in the response.
 * See docs/MEDIA_ASSETS_AND_PROVENANCE.md (chapter 11).
 */
export async function GET(request: Request) {
  if (request.url.length > MEDIA_API_MAX_URL_LENGTH) return NextResponse.json({ error: 'Invalid media query' }, { status: 400 });
  const ids = [...new Set(new URL(request.url).searchParams.getAll('entity_id'))];
  if (ids.length === 0 || ids.length > MEDIA_API_MAX_ENTITIES || !ids.every(isMediaEntityId)) {
    return NextResponse.json({ error: 'Invalid media query' }, { status: 400 });
  }
  // 公開目録にある事例の画像だけ。目録外の ID は画像の保存場所も読まない
  const catalogIds = filterToCatalog(ids.map((id) => ({ id }))).map((row) => row.id);
  if (catalogIds.length === 0) return NextResponse.json({ error: 'Not published' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const result = await buildMediaResponse(catalogIds, await readMediaSource(), { publicReader: publicMediaReaderFor });
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': result.cacheControl } });
}
