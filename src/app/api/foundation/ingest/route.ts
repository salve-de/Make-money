import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';
import {
  FoundationBundleValidationError,
  FoundationIngestAuthorizationError,
  ingestFoundationResearch,
  verifyFoundationRawEvidenceAlreadyCommitted,
  type FoundationIngestRequest,
} from '@/lib/foundation/ingest';
import {
  R2BucketMissingError,
  R2ConfigurationError,
  R2ObjectConflictError,
} from '@/lib/storage/r2';
import {
  canResumeMakeMoneyProjection,
  materializeMakeMoneyViews,
} from '@/lib/foundation/make-money-view';
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
    if (body.write_authorized !== true) {
      throw new FoundationIngestAuthorizationError();
    }

    const resumeCheck = await canResumeMakeMoneyProjection(body.bundle);
    const rawResumeCheck = resumeCheck.can_resume
      ? await verifyFoundationRawEvidenceAlreadyCommitted(body.bundle, body.raw_evidence)
      : {
          committed: false,
          provider_calls: { head_bucket: 0, get_object: 0, put_object: 0 as const },
        };
    const canResume = resumeCheck.can_resume && rawResumeCheck.committed;

    const report = canResume
      ? {
          run_id: resumeCheck.run_id,
          write_authorized: true,
          schema_validation: 'PASS',
          canonical_ingest: 'ALREADY_COMMITTED',
          counts: {
            planned: 0,
            created: 0,
            exists_identical: 0,
            exists_compatible: 0,
          },
          provider_calls: {
            head_bucket: rawResumeCheck.provider_calls.head_bucket,
            get_object:
              resumeCheck.get_object_calls + rawResumeCheck.provider_calls.get_object,
            put_object: 0,
          },
          readback_verified: 0,
          mutation_counts: {
            put_object: 0,
            copy_object: 0,
            delete_object: 0,
            move: 0,
            rename: 0,
            overwrite: 0,
            legacy_universal: 0,
            bucket_or_config: 0,
          },
        }
      : await ingestFoundationResearch(body);

    if (!canResume) {
      report.provider_calls.head_bucket += rawResumeCheck.provider_calls.head_bucket;
      report.provider_calls.get_object +=
        resumeCheck.get_object_calls + rawResumeCheck.provider_calls.get_object;
    }

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
      // Canonical Foundation writes may already have succeeded. A projection
      // retry is detected from the persisted projection cursor plus an exact
      // canonical-bundle byte match, so the next request resumes only the
      // rebuildable view instead of repeating the full immutable ingest.
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
