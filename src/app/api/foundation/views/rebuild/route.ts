import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { rebuildMakeMoneyViewsPage } from '@/lib/foundation/make-money-view';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 16 * 1024;

function tokenMatches(expected: string, supplied: string): boolean {
  const expectedBytes = Buffer.from(expected, 'utf8');
  const suppliedBytes = Buffer.from(supplied, 'utf8');
  return (
    expectedBytes.byteLength === suppliedBytes.byteLength &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

export async function POST(request: NextRequest) {
  const expectedToken = await getRuntimeEnvValue('FOUNDATION_INGEST_TOKEN');
  if (!expectedToken) {
    return NextResponse.json(
      { error: 'Foundation ingestion is not configured on this server' },
      { status: 503 }
    );
  }

  const suppliedToken = request.headers.get('x-foundation-ingest-token')?.trim() || '';
  if (!suppliedToken || !tokenMatches(expectedToken, suppliedToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { limit?: unknown };
  try {
    body = await readJsonBody(request, MAX_REQUEST_BYTES) as { limit?: unknown };
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
    }
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const rawLimit = typeof body.limit === 'number' ? body.limit : 20;
  const limit = Math.min(Math.max(Math.floor(rawLimit), 1), 50);

  try {
    const report = await rebuildMakeMoneyViewsPage(limit);
    return NextResponse.json({ success: true, ...report });
  } catch (error) {
    console.error('Make-Money view rebuild failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Make-Money view rebuild failed',
      },
      { status: 502 }
    );
  }
}
