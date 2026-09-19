import {
  buildFoundationValueSummariesFromBundle,
  type FoundationValuePage,
  type FoundationValueSummary,
} from '@/lib/foundation/business-reader';
import {
  getFoundationBucketAsync,
  listR2Objects,
  putR2MutableView,
  readR2Object,
} from '@/lib/storage/r2';

const MAKE_MONEY_VIEW_PREFIX = 'views/make-money/v1/entities/';
const MAKE_MONEY_VIEW_SCHEMA = 'make-money-view.v1';

interface MakeMoneyViewDocument {
  schema_version: typeof MAKE_MONEY_VIEW_SCHEMA;
  consumer: 'make-money';
  projection_version: 'v1';
  source_run_id: string;
  projected_at: string;
  summary: FoundationValueSummary;
}

export interface MakeMoneyViewMaterializationReport {
  source_run_id: string;
  attempted: number;
  created: number;
  updated: number;
  unchanged: number;
  keys: string[];
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: Record<string, unknown>, key: string): string | null {
  const candidate = value[key];
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

function isValueSummary(value: unknown): value is FoundationValueSummary {
  const object = objectValue(value);
  const profile = objectValue(object?.valueProfile);
  const counts = objectValue(profile?.counts);
  return Boolean(
    object &&
    stringValue(object, 'id') &&
    stringValue(object, 'name') &&
    stringValue(object, 'entityType') &&
    Array.isArray(object.aliases) &&
    Array.isArray(object.evidenceIds) &&
    profile &&
    typeof profile.score === 'number' &&
    typeof profile.tier === 'string' &&
    Array.isArray(profile.labels) &&
    counts
  );
}

function decodeJson(body: Uint8Array): unknown {
  return JSON.parse(new TextDecoder().decode(body));
}

function parseViewDocument(value: unknown): MakeMoneyViewDocument | null {
  const object = objectValue(value);
  if (
    !object ||
    object.schema_version !== MAKE_MONEY_VIEW_SCHEMA ||
    object.consumer !== 'make-money' ||
    object.projection_version !== 'v1' ||
    typeof object.source_run_id !== 'string' ||
    typeof object.projected_at !== 'string' ||
    !isValueSummary(object.summary)
  ) {
    return null;
  }
  return object as unknown as MakeMoneyViewDocument;
}

export async function materializeMakeMoneyViews(bundleInput: unknown): Promise<MakeMoneyViewMaterializationReport> {
  const bundle = objectValue(bundleInput);
  const runId = bundle ? stringValue(bundle, 'run_id') : null;
  const projectedAt = bundle ? stringValue(bundle, 'retrieved_at') : null;
  if (!runId || !projectedAt) {
    throw new Error('Make-Money view projection requires bundle.run_id and bundle.retrieved_at');
  }

  const summaries = buildFoundationValueSummariesFromBundle(bundleInput);
  const bucket = await getFoundationBucketAsync('lake');
  const report: MakeMoneyViewMaterializationReport = {
    source_run_id: runId,
    attempted: summaries.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    keys: [],
  };

  for (const summary of summaries) {
    const key = `${MAKE_MONEY_VIEW_PREFIX}${summary.id}.json`;
    const document: MakeMoneyViewDocument = {
      schema_version: MAKE_MONEY_VIEW_SCHEMA,
      consumer: 'make-money',
      projection_version: 'v1',
      source_run_id: runId,
      projected_at: projectedAt,
      summary,
    };
    const result = await putR2MutableView({
      bucket,
      key,
      body: JSON.stringify(document),
      contentType: 'application/json',
      metadata: {
        'foundation-view-consumer': 'make-money',
        'foundation-view-version': 'v1',
        'foundation-run-id': runId,
        'foundation-entity-id': summary.id,
      },
    });
    report.keys.push(key);
    if (result.status === 'CREATED') report.created += 1;
    else if (result.status === 'UPDATED') report.updated += 1;
    else report.unchanged += 1;
  }

  return report;
}

export async function readMakeMoneyValuePage(options: {
  cursor?: string;
  limit?: number;
} = {}): Promise<FoundationValuePage> {
  const bucket = await getFoundationBucketAsync('lake');
  const page = await listR2Objects({
    bucket,
    prefix: MAKE_MONEY_VIEW_PREFIX,
    cursor: options.cursor,
    limit: Math.min(Math.max(1, Math.floor(options.limit ?? 100)), 100),
  });

  const data = (
    await Promise.all(
      page.objects
        .filter((item) => item.key.endsWith('.json'))
        .map(async (item) => {
          const object = await readR2Object(bucket, item.key);
          if (!object) return null;
          try {
            return parseViewDocument(decodeJson(object.body))?.summary || null;
          } catch {
            return null;
          }
        })
    )
  ).filter((value): value is FoundationValueSummary => Boolean(value));

  const nextCursor = page.truncated && page.cursor ? page.cursor : null;
  return {
    data,
    nextCursor,
    hasMore: Boolean(nextCursor),
  };
}
