import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  FoundationBundleValidationError,
  FoundationIngestAuthorizationError,
  ingestFoundationResearch,
  type FoundationIngestRequest,
} from '@/lib/foundation/ingest';
import {
  R2ConfigurationError,
  R2ObjectConflictError,
} from '@/lib/storage/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 15 * 1024 * 1024;

function tokenMatches(expected: string, supplied: string): boolean {
  const expectedBytes = Buffer.from(expected, 'utf8');
  const suppliedBytes = Buffer.from(supplied, 'utf8');
  return (
    expectedBytes.byteLength === suppliedBytes.byteLength &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

function errorStatus(error: unknown): number {
  if (error instanceof FoundationBundleValidationError) return 422;
  if (error instanceof FoundationIngestAuthorizationError) return 403;
  if (error instanceof R2ObjectConflictError) return 409;
  if (error instanceof R2ConfigurationError) return 503;
  return 502;
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.FOUNDATION_INGEST_TOKEN?.trim();
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

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
  }

  try {
    const body = (await request.json()) as FoundationIngestRequest;
    const report = await ingestFoundationResearch(body);
    return NextResponse.json({ success: true, ...report });
  } catch (error) {
    console.error('Foundation ingestion failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Foundation ingestion failed',
      },
      { status: errorStatus(error) }
    );
  }
}
