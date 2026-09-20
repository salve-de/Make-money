import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';
import {
  FoundationBundleValidationError,
  FoundationIngestAuthorizationError,
  ingestFoundationResearch,
  type FoundationIngestRequest,
} from '@/lib/foundation/ingest';
import {
  R2BucketMissingError,
  R2ConfigurationError,
  R2ObjectConflictError,
} from '@/lib/storage/r2';
import { materializeMakeMoneyViews } from '@/lib/foundation/make-money-view';
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';

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
  if (error instanceof R2BucketMissingError) return 503;
  if (error instanceof R2ConfigurationError) return 503;
  return 502;
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

  let body: FoundationIngestRequest;
  try {
    body = await readJsonBody(request, MAX_REQUEST_BYTES) as FoundationIngestRequest;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  try {
    const report = await ingestFoundationResearch(body);
    try {
      const viewProjection = await materializeMakeMoneyViews(body.bundle);
      const needsMoreProjection =
        !viewProjection.complete &&
        viewProjection.next_index < viewProjection.total_targets;

      if (needsMoreProjection) {
        return NextResponse.json(
          {
            success: false,
            partial: true,
            retryable: true,
            ...report,
            view_projection: {
              status: 'PARTIAL',
              ...viewProjection,
            },
          },
          { status: 202 }
        );
      }

      return NextResponse.json({
        success: true,
        ...report,
        view_projection: {
          status: viewProjection.unresolved_entity_ids.length > 0
            ? 'PASS_WITH_UNRESOLVED_REPLAY'
            : 'PASS',
          ...viewProjection,
        },
      });
    } catch (projectionError) {
      // Canonical Foundation writes are create-only and may already have
      // succeeded. Return a retryable partial failure so the publisher retries;
      // canonical re-ingest is idempotent and the rebuildable view can then be
      // materialized without rewriting the source-of-record objects.
      console.error('Make-Money view projection failed after Foundation ingestion:', projectionError);
      return NextResponse.json(
        {
          success: false,
          partial: true,
          ...report,
          view_projection: {
            status: 'FAILED',
            error: projectionError instanceof Error
              ? projectionError.message
              : 'Make-Money view projection failed',
          },
        },
        { status: 502 }
      );
    }
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
