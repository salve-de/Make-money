import { NextRequest, NextResponse } from 'next/server';

const MAINTENANCE_EXEMPT = /^\/(?:_next\/|maintenance(?:\/|$)|robots\.txt$|sitemap\.xml$|favicon\.ico$|opengraph-image|api\/webhooks\/stripe(?:\/|$))/;

/** MAINTENANCE_MODE=1 のときだけ 503 のメンテナンス表示にする。設計は docs/launch/MAINTENANCE_MODE.md。 */
function maintenanceResponse(request: NextRequest): NextResponse | null {
  if (process.env.MAINTENANCE_MODE !== '1') return null;
  const { pathname } = request.nextUrl;
  if (MAINTENANCE_EXEMPT.test(pathname)) return null;
  const headers = { 'Retry-After': '3600', 'Cache-Control': 'no-store' };
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'MAINTENANCE' }, { status: 503, headers });
  }
  return NextResponse.rewrite(new URL('/maintenance', request.url), { status: 503, headers });
}

/** 2026-10-09 に「事例を探す」(/discover) を廃止。古い URL は（クエリも捨てて）一覧へ 308 で送る。 */
const DISCOVER_PATH = /^\/discover(?:\/|$)/;

const previewPath = /^\/api\/build\/preview\/([^/]+)(?:\/|$)/;

/**
 * Generated v0 apps use root-relative assets and API routes. When those
 * requests originate from an authenticated Builder preview, keep them inside
 * the preview proxy instead of letting generated code reach Make-Money routes.
 */
export function proxy(request: NextRequest) {
  const maintenance = maintenanceResponse(request);
  if (maintenance) return maintenance;
  if (DISCOVER_PATH.test(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/', request.url), 308);
  }
  const referer = request.headers.get('referer');
  if (!referer || !URL.canParse(referer)) return NextResponse.next();

  const refererUrl = new URL(referer);
  if (refererUrl.origin !== request.nextUrl.origin) return NextResponse.next();

  const match = refererUrl.pathname.match(previewPath);
  const sessionId = match?.[1];
  if (!sessionId || sessionId.length > 128) return NextResponse.next();

  const redirected = request.nextUrl.clone();
  redirected.pathname = `/api/build/preview/${sessionId}${request.nextUrl.pathname}`;
  return NextResponse.redirect(redirected, 307);
}

export const config = {
  matcher: '/((?!api/build/preview/).*)',
};
