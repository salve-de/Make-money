import { NextResponse } from 'next/server';
import { serveMediaFile } from '@/lib/media/api';
import { readMediaSource } from '@/lib/media/runtime';
import { MEDIA_ASSET_ID_PATTERN } from '@/shared/media-asset-schema';
import { isMediaEntityId } from '@/shared/media-display';

export const dynamic = 'force-dynamic';

/**
 * Development / e2e only: streams one displayable staged image, `GET /api/media/file?entity_id=&asset=`.
 * Production images come straight from the public R2 domain. Anything that is not an allowed, non-person,
 * unmodified staged image answers 404, so held and blocked assets are indistinguishable from unknown ones.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const entityId = params.get('entity_id') ?? '';
  const assetId = params.get('asset') ?? '';
  if (!isMediaEntityId(entityId) || !MEDIA_ASSET_ID_PATTERN.test(assetId)) {
    return NextResponse.json({ error: 'Invalid media query' }, { status: 400 });
  }
  const file = await serveMediaFile(entityId, assetId, await readMediaSource());
  if (!file) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new NextResponse(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      'Content-Type': file.contentType,
      'Content-Length': String(file.bytes.byteLength),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      // If an SVG is opened directly, it runs no script; as an <img> it never did.
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
}
