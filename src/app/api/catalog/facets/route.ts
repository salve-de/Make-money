import { NextResponse } from 'next/server';
import { readCachedLocalPublishableEntities } from '@/lib/company-access/local-entity-index';
import { getCatalogManifest } from '@/lib/company-access/release-manifest';
import { facetRowOf } from '@/platform/model/entity-filter';
import { encodeFacets } from '@/platform/model/facet-wire';

export const dynamic = 'force-dynamic';
// 公開版は不変なので、版ごとに1回だけ作って使い回す（要求のたびに全件を数え直さない）
let cached: { generation: string; body: string } | null = null;
const HEADERS = { 'Cache-Control': 'private, max-age=60', 'Content-Type': 'application/json' };

/** 公開中の全件の、絞り込みの件数を数えるための最小の値。画面は最初にこれだけ読み込んで、全件で件数を出す。 */
export async function GET() {
  try {
    const generation = (await getCatalogManifest()).summaries.hash;
    if (cached?.generation === generation) return new NextResponse(cached.body, { headers: HEADERS });
    const entities = await readCachedLocalPublishableEntities();
    const body = JSON.stringify(encodeFacets(generation, entities.map(facetRowOf)));
    cached = { generation, body };
    return new NextResponse(body, { headers: HEADERS });
  } catch {
    return NextResponse.json({ error: 'Catalog temporarily unavailable' }, { status: 503 });
  }
}
