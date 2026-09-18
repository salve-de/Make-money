import type { V0Preview } from './v0';

const strippedRequestHeaders = new Set([
  'authorization', 'connection', 'content-length', 'cookie', 'forwarded', 'host',
  'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'proxy-connection',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'via', 'x-real-ip',
]);
const strippedRequestPrefixes = ['x-envoy-', 'x-forwarded-', 'x-now-', 'x-vercel-'];
const strippedResponseHeaders = new Set([
  'age', 'cache-status', 'cdn-cache-control', 'cf-cache-status', 'connection',
  'content-encoding', 'content-length', 'expires', 'keep-alive', 'proxy-authenticate',
  'proxy-authorization', 'proxy-connection', 'set-cookie', 'surrogate-control', 'te',
  'trailer', 'transfer-encoding', 'upgrade', 'vercel-cdn-cache-control', 'x-vercel-cache',
]);

function normalizedPath(path: string[]): string {
  return `/${path.map((segment) => encodeURIComponent(segment)).join('/')}`;
}

export async function proxyV0PreviewRequest(
  request: Request,
  preview: V0Preview,
  path: string[],
): Promise<Response> {
  const upstreamBase = new URL(preview.url);
  const upstreamUrl = new URL(normalizedPath(path), upstreamBase);
  if (upstreamUrl.origin !== upstreamBase.origin) throw new Error('Preview path escaped the v0 preview origin');

  upstreamUrl.search = new URL(request.url).search;

  const headers = new Headers(request.headers);
  for (const name of Array.from(headers.keys())) {
    const lower = name.toLowerCase();
    if (strippedRequestHeaders.has(lower) || strippedRequestPrefixes.some((prefix) => lower.startsWith(prefix))) {
      headers.delete(name);
    }
  }
  headers.set('x-v0-preview-token', preview.token);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body,
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  });

  if (upstream.headers.get('x-v0-preview-refresh') === '1') {
    return new Response(null, { status: 409, headers: { 'cache-control': 'private, no-store', 'x-mm-preview-refresh': '1' } });
  }

  const responseHeaders = new Headers(upstream.headers);
  for (const name of Array.from(responseHeaders.keys())) {
    if (strippedResponseHeaders.has(name.toLowerCase())) responseHeaders.delete(name);
  }
  responseHeaders.set('cache-control', 'private, no-store');
  responseHeaders.set('x-content-type-options', 'nosniff');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
