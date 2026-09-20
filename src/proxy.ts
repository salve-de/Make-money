import { NextRequest, NextResponse } from 'next/server';

const previewPath = /^\/api\/build\/preview\/([^/]+)(?:\/|$)/;

/**
 * Generated v0 apps use root-relative assets and API routes. When those
 * requests originate from an authenticated Builder preview, keep them inside
 * the preview proxy instead of letting generated code reach Make-Money routes.
 */
export function proxy(request: NextRequest) {
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
