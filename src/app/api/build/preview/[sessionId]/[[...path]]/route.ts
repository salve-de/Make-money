import { NextRequest } from 'next/server';
import { getPreviewBuildSession } from '@/lib/builder/session';
import { getV0ApiKey, getV0Preview } from '@/lib/builder/v0';
import { proxyV0PreviewRequest } from '@/lib/builder/preview-proxy';

export const dynamic = 'force-dynamic';
const COOKIE_NAME = 'mm_builder_preview';

type RouteContext = {
  params: Promise<{ sessionId: string; path?: string[] }>;
};

function loadingResponse(request: NextRequest): Response {
  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers: { 'cache-control': 'private, no-store' } });
  }
  if (request.method !== 'GET') {
    return new Response('Preview is starting', { status: 503, headers: { 'cache-control': 'private, no-store' } });
  }

  const safePath = new URL(request.url).pathname.replace(/[&<>"']/g, '');
  const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="2;url=${safePath}">
<title>Preview starting</title>
<style>html,body{height:100%;margin:0;background:#0b0e14;color:#a1a1aa;font:14px system-ui}body{display:grid;place-items:center}.box{text-align:center}.dot{width:8px;height:8px;background:#34d399;border-radius:50%;display:inline-block;margin-right:8px;animation:p 1s infinite alternate}@keyframes p{to{opacity:.25}}</style>
</head><body><div class="box"><span class="dot"></span>生成したアプリを起動しています…</div></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store' },
  });
}

function parseTicket(request: NextRequest, sessionId: string): string | null {
  const value = request.cookies.get(COOKIE_NAME)?.value;
  if (!value) return null;
  const dot = value.indexOf('.');
  if (dot <= 0) return null;
  const cookieSessionId = value.slice(0, dot);
  const token = value.slice(dot + 1);
  if (cookieSessionId !== sessionId || token.length < 32 || token.length > 160) return null;
  return token;
}

async function handler(request: NextRequest, context: RouteContext): Promise<Response> {
  const { sessionId, path = [] } = await context.params;
  if (
    !sessionId || sessionId.length > 128 || path.length > 64
    || path.some((segment) => segment.length > 256)
    || path.reduce((total, segment) => total + segment.length, 0) > 4096
  ) return new Response('Bad request', { status: 400 });

  const ticket = parseTicket(request, sessionId);
  if (!ticket) return new Response('Preview authorization required', { status: 401, headers: { 'cache-control': 'private, no-store' } });

  try {
    const session = await getPreviewBuildSession(sessionId, ticket);
    if (!session || session.status !== 'ready' || !session.providerChatId) {
      return new Response('Preview not found', { status: 404, headers: { 'cache-control': 'private, no-store' } });
    }

    const apiKey = await getV0ApiKey();
    if (!apiKey) return new Response('Preview provider unavailable', { status: 503, headers: { 'cache-control': 'private, no-store' } });

    const preview = await getV0Preview(apiKey, session.providerChatId);
    if (!preview) return loadingResponse(request);

    const response = await proxyV0PreviewRequest(request, preview, path);
    if (response.status === 409 && response.headers.get('x-mm-preview-refresh') === '1') {
      return loadingResponse(request);
    }
    return response;
  } catch (error) {
    console.error('[builder/preview] failed:', error);
    return new Response('Preview unavailable', { status: 502, headers: { 'cache-control': 'private, no-store' } });
  }
}

export {
  handler as DELETE,
  handler as GET,
  handler as HEAD,
  handler as OPTIONS,
  handler as PATCH,
  handler as POST,
  handler as PUT,
};
