import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';
import {
  FoundationBundleValidationError,
  FoundationIngestAuthorizationError,
  ingestFoundationResearch,
} from '@/lib/foundation/ingest';
import {
  FoundationTypedIngestValidationError,
  prepareFoundationTypedIngest,
  type FoundationTypedIngestRequest,
} from '@/lib/foundation/typed-ingest';
import {
  R2BucketMissingError,
  R2ConfigurationError,
  R2ObjectConflictError,
} from '@/lib/storage/r2';
import {
  canResumeMakeMoneyProjection,
  materializeMakeMoneyViews,
} from '@/lib/foundation/make-money-view';
import { defaultIncomingMoneySignalFields } from '@/lib/foundation/money-signal-null-defaults';
import { buildNewArrivalsContribution } from '@/lib/foundation/new-arrivals';
import { persistNewArrivalsContribution } from '@/lib/foundation/new-arrivals-index';
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 20 * 1024 * 1024;

function tokenMatches(expected: string, supplied: string): boolean {
  const expectedBytes = Buffer.from(expected, 'utf8');
  const suppliedBytes = Buffer.from(supplied, 'utf8');
  return (
    expectedBytes.byteLength === suppliedBytes.byteLength &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

function bundleEntityIds(bundle: unknown): string[] {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) return [];
  const entities = (bundle as { entities?: unknown }).entities;
  if (!Array.isArray(entities)) return [];
  return [...new Set(
    entities
      .map((entity: unknown) => entity && typeof entity === 'object' && !Array.isArray(entity)
        ? (entity as { entity_id?: unknown }).entity_id
        : null)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id) => id.trim()),
  )].sort();
}

function errorStatus(error: unknown): number {
  if (error instanceof FoundationTypedIngestValidationError) return 422;
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
      { status: 503 },
    );
  }

  const suppliedToken = request.headers.get('x-foundation-ingest-token')?.trim() || '';
  if (!suppliedToken || !tokenMatches(expectedToken, suppliedToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: FoundationTypedIngestRequest;
  try {
    body = await readJsonBody(request, MAX_REQUEST_BYTES) as FoundationTypedIngestRequest;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
    }
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  try {
    const prepared = prepareFoundationTypedIngest(body);
    const normalized = defaultIncomingMoneySignalFields(
      prepared.bundle as Record<string, unknown>,
    ).bundle;
    const bundle = normalized as {
      run_id: string;
      retrieved_at: string;
      entities?: unknown;
    };

    const resumeCheck = await canResumeMakeMoneyProjection(bundle);
    const canResume = resumeCheck.can_resume;

    const report = canResume
      ? {
          run_id: resumeCheck.run_id,
          write_authorized: true as const,
          schema_validation: 'PASS' as const,
          canonical_ingest: 'ALREADY_COMMITTED' as const,
          counts: {
            planned: 0,
            created: 0,
            exists_identical: 0,
            exists_compatible: 0,
          },
          provider_calls: {
            head_bucket: 0,
            get_object: resumeCheck.get_object_calls,
            put_object: 0,
          },
          readback_verified: 0,
          mutation_counts: {
            put_object: 0,
            copy_object: 0 as const,
            delete_object: 0 as const,
            move: 0 as const,
            rename: 0 as const,
            overwrite: 0 as const,
            legacy_universal: 0 as const,
            bucket_or_config: 0 as const,
          },
        }
      : await ingestFoundationResearch(
          {
            write_authorized: true,
            bundle: normalized,
          },
          {
            makeMoneyCoverage: 'UNASSESSED_TYPED_PROJECTION',
          },
        );

    if (!canResume) {
      report.provider_calls.get_object += resumeCheck.get_object_calls;
    }

    try {
      const viewProjection = await materializeMakeMoneyViews(bundle);
      const needsMoreProjection =
        !viewProjection.complete &&
        viewProjection.next_index < viewProjection.total_targets;

      if (needsMoreProjection) {
        return NextResponse.json(
          {
            success: false,
            partial: true,
            retryable: true,
            input_kind: 'typed_sidecar',
            mapper_version: prepared.mapperVersion,
            coverage_assessment: prepared.coverageAssessment,
            source: prepared.source,
            ...report,
            view_projection: {
              status: 'PARTIAL',
              ...viewProjection,
            },
          },
          { status: 202 },
        );
      }

      const entityIds = bundleEntityIds(bundle);
      const contribution = entityIds.length > 0
        ? buildNewArrivalsContribution({
            queueRunId: bundle.run_id,
            entityIds,
            assignedAt: bundle.retrieved_at,
          })
        : null;
      const newArrivals = contribution
        ? await persistNewArrivalsContribution(contribution)
        : null;

      return NextResponse.json({
        success: true,
        input_kind: 'typed_sidecar',
        mapper_version: prepared.mapperVersion,
        coverage_assessment: prepared.coverageAssessment,
        source: prepared.source,
        ...report,
        new_arrivals: contribution
          ? {
              release_id: contribution.release_id,
              release_at: contribution.release_at,
              entity_count: contribution.entity_count,
              contribution_key: newArrivals?.contribution.key || null,
              contribution_status: newArrivals?.contribution.status || null,
              index_status: newArrivals?.index.status || null,
            }
          : null,
        view_projection: {
          status: viewProjection.unresolved_entity_ids.length > 0
            ? 'PASS_WITH_UNRESOLVED_REPLAY'
            : 'PASS',
          ...viewProjection,
        },
      });
    } catch (projectionError) {
      console.error('Make-Money typed view projection failed after Foundation ingestion:', projectionError);
      return NextResponse.json(
        {
          success: false,
          partial: true,
          retryable: true,
          input_kind: 'typed_sidecar',
          mapper_version: prepared.mapperVersion,
          coverage_assessment: prepared.coverageAssessment,
          source: prepared.source,
          ...report,
          view_projection: {
            status: 'FAILED',
            error: projectionError instanceof Error
              ? projectionError.message
              : 'Make-Money typed view projection failed',
          },
        },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error('Foundation typed ingestion failed:', error);
    if (error instanceof FoundationTypedIngestValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          reason_code: error.reasonCode,
          issues: error.issues,
          terminal: error.terminal,
        },
        { status: 422 },
      );
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Foundation typed ingestion failed',
      },
      { status: errorStatus(error) },
    );
  }
}
