import {
  buildFoundationBusinessCasesFromBundle,
  foundationBusinessCaseToValueSummary,
  type FoundationBusinessCase,
  type FoundationValuePage,
  type FoundationValueSummary,
} from '@/lib/foundation/business-reader';
import { foundationDataset } from '@/lib/foundation/dataset-registry';
import { buildFoundationValueProfile } from '@/lib/foundation/value-projection';
import {
  getFoundationBucketAsync,
  getFromR2,
  listR2Objects,
  putR2MutableView,
  readR2Object,
  R2ViewConcurrentModificationError,
  type R2ObjectRead,
} from '@/lib/storage/r2';

const MAKE_MONEY_VIEW_PREFIX = 'views/make-money/v1/entities/';
const MAKE_MONEY_VIEW_SCHEMA = 'make-money-view.v2';
const REBUILD_STATE_KEY = 'views/make-money/v1/_rebuild-state.json';
const REBUILD_STATE_SCHEMA = 'make-money-view-rebuild-state.v1';
const MAX_CAS_RETRIES = 5;

interface MakeMoneyViewDocument {
  schema_version: typeof MAKE_MONEY_VIEW_SCHEMA;
  consumer: 'make-money';
  projection_version: 'v1';
  source_run_ids: string[];
  latest_source_run_id: string;
  projected_at: string;
  summary: FoundationValueSummary;
  detail: FoundationBusinessCase;
}

interface MakeMoneyViewRebuildState {
  schema_version: typeof REBUILD_STATE_SCHEMA;
  complete: boolean;
  cursor: string | null;
  processed_bundles: number;
  updated_at: string;
}

export interface MakeMoneyViewMaterializationReport {
  source_run_id: string;
  attempted: number;
  created: number;
  updated: number;
  unchanged: number;
  concurrent_retries: number;
  keys: string[];
}

export interface MakeMoneyViewRebuildReport {
  complete: boolean;
  processed_this_run: number;
  processed_total: number;
  next_cursor: string | null;
  materialized_entities: number;
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

function uniqueStrings(...groups: Array<readonly string[] | undefined>): string[] {
  const values = new Set<string>();
  for (const group of groups) {
    for (const item of group || []) {
      if (item.trim()) values.add(item);
    }
  }
  return [...values];
}

function maxIso(left: string | null | undefined, right: string | null | undefined): string | null {
  if (!left) return right || null;
  if (!right) return left;
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (!Number.isFinite(leftTime)) return right;
  if (!Number.isFinite(rightTime)) return left;
  return rightTime >= leftTime ? right : left;
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

function isBusinessCase(value: unknown): value is FoundationBusinessCase {
  const object = objectValue(value);
  return Boolean(
    object &&
    isValueSummary({
      ...object,
      valueProfile: object.valueProfile,
    }) &&
    Array.isArray(object.claims) &&
    Array.isArray(object.metrics) &&
    Array.isArray(object.moneySignals) &&
    Array.isArray(object.events) &&
    Array.isArray(object.relationships) &&
    Array.isArray(object.observations) &&
    Array.isArray(object.derived)
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
    !Array.isArray(object.source_run_ids) ||
    !object.source_run_ids.every((item) => typeof item === 'string') ||
    typeof object.latest_source_run_id !== 'string' ||
    typeof object.projected_at !== 'string' ||
    !isValueSummary(object.summary) ||
    !isBusinessCase(object.detail)
  ) {
    return null;
  }
  return object as unknown as MakeMoneyViewDocument;
}

function parseRebuildState(value: unknown): MakeMoneyViewRebuildState | null {
  const object = objectValue(value);
  if (
    !object ||
    object.schema_version !== REBUILD_STATE_SCHEMA ||
    typeof object.complete !== 'boolean' ||
    !(object.cursor === null || typeof object.cursor === 'string') ||
    typeof object.processed_bundles !== 'number' ||
    typeof object.updated_at !== 'string'
  ) {
    return null;
  }
  return object as unknown as MakeMoneyViewRebuildState;
}

function mergeById<T extends { id: string }>(older: readonly T[], newer: readonly T[]): T[] {
  const records = new Map<string, T>();
  for (const item of older) records.set(item.id, item);
  for (const item of newer) records.set(item.id, item);
  return [...records.values()];
}

export function mergeFoundationBusinessCasesForView(
  existing: FoundationBusinessCase,
  incoming: FoundationBusinessCase
): FoundationBusinessCase {
  const existingTime = existing.observedAt ? Date.parse(existing.observedAt) : Number.NEGATIVE_INFINITY;
  const incomingTime = incoming.observedAt ? Date.parse(incoming.observedAt) : Number.NEGATIVE_INFINITY;
  const incomingIsNewer = incomingTime >= existingTime;
  const latest = incomingIsNewer ? incoming : existing;
  const older = incomingIsNewer ? existing : incoming;

  const claims = mergeById(existing.claims, incoming.claims);
  const metrics = mergeById(existing.metrics, incoming.metrics);
  const moneySignals = mergeById(existing.moneySignals, incoming.moneySignals);
  const events = mergeById(existing.events, incoming.events);
  const relationships = mergeById(existing.relationships, incoming.relationships);
  const observations = mergeById(existing.observations, incoming.observations);
  const derived = mergeById(existing.derived, incoming.derived);

  const entitySummary = {
    id: latest.id,
    name: latest.name || older.name,
    entityType: latest.entityType || older.entityType,
    aliases: uniqueStrings(existing.aliases, incoming.aliases),
    canonicalIdentifier: latest.canonicalIdentifier || older.canonicalIdentifier,
    domain: latest.domain || older.domain,
    status: latest.status !== 'unknown' ? latest.status : older.status,
    observedAt: maxIso(existing.observedAt, incoming.observedAt),
    evidenceIds: uniqueStrings(existing.evidenceIds, incoming.evidenceIds),
  };

  return {
    ...entitySummary,
    claims,
    metrics,
    moneySignals,
    events,
    relationships,
    observations,
    derived,
    valueProfile: buildFoundationValueProfile(entitySummary, {
      claims,
      metrics,
      moneySignals,
      events,
      relationships,
      observations,
      derived,
    }),
    bundlesScanned: existing.bundlesScanned + incoming.bundlesScanned,
    bundleObjectsListed: existing.bundleObjectsListed + incoming.bundleObjectsListed,
    bundleScanComplete: existing.bundleScanComplete && incoming.bundleScanComplete,
  };
}

function buildDocument(
  existing: MakeMoneyViewDocument | null,
  incoming: FoundationBusinessCase,
  runId: string,
  retrievedAt: string
): MakeMoneyViewDocument {
  const detail = existing ? mergeFoundationBusinessCasesForView(existing.detail, incoming) : incoming;
  const sourceRunIds = uniqueStrings(existing?.source_run_ids, [runId]);
  // The view's aggregate counters reflect the unique source runs accumulated
  // into this projection, not the number of retry attempts.
  detail.bundlesScanned = sourceRunIds.length;
  detail.bundleObjectsListed = sourceRunIds.length;
  detail.bundleScanComplete = true;

  const projectedAt = maxIso(existing?.projected_at, retrievedAt) || retrievedAt;
  const latestSourceRunId =
    !existing || Date.parse(retrievedAt) >= Date.parse(existing.projected_at)
      ? runId
      : existing.latest_source_run_id;

  return {
    schema_version: MAKE_MONEY_VIEW_SCHEMA,
    consumer: 'make-money',
    projection_version: 'v1',
    source_run_ids: sourceRunIds,
    latest_source_run_id: latestSourceRunId,
    projected_at: projectedAt,
    summary: foundationBusinessCaseToValueSummary(detail),
    detail,
  };
}

async function writeEntityViewWithCas(
  bucket: string,
  key: string,
  incoming: FoundationBusinessCase,
  runId: string,
  retrievedAt: string
): Promise<{ status: 'CREATED' | 'UPDATED' | 'UNCHANGED'; retries: number }> {
  for (let attempt = 0; attempt < MAX_CAS_RETRIES; attempt += 1) {
    const existingObject = await readR2Object(bucket, key);
    let existingDocument: MakeMoneyViewDocument | null = null;
    if (existingObject) {
      existingDocument = parseViewDocument(decodeJson(existingObject.body));
      if (!existingDocument) {
        throw new Error(`Invalid existing Make-Money view document at ${key}`);
      }
    }

    const document = buildDocument(existingDocument, incoming, runId, retrievedAt);
    try {
      const result = await putR2MutableView({
        bucket,
        key,
        body: JSON.stringify(document),
        contentType: 'application/json',
        metadata: {
          'foundation-view-consumer': 'make-money',
          'foundation-view-version': 'v1',
          'foundation-run-id': document.latest_source_run_id,
          'foundation-entity-id': document.summary.id,
          'foundation-source-run-count': String(document.source_run_ids.length),
        },
      }, {
        expectedEtag: existingObject?.etag ?? null,
      });
      return { status: result.status, retries: attempt };
    } catch (error) {
      if (error instanceof R2ViewConcurrentModificationError && attempt + 1 < MAX_CAS_RETRIES) {
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Make-Money view CAS retries exhausted for ${key}`);
}

export async function materializeMakeMoneyViews(bundleInput: unknown): Promise<MakeMoneyViewMaterializationReport> {
  const bundle = objectValue(bundleInput);
  const runId = bundle ? stringValue(bundle, 'run_id') : null;
  const retrievedAt = bundle ? stringValue(bundle, 'retrieved_at') : null;
  if (!runId || !retrievedAt) {
    throw new Error('Make-Money view projection requires bundle.run_id and bundle.retrieved_at');
  }

  const cases = buildFoundationBusinessCasesFromBundle(bundleInput);
  const bucket = await getFoundationBucketAsync('lake');
  const report: MakeMoneyViewMaterializationReport = {
    source_run_id: runId,
    attempted: cases.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    concurrent_retries: 0,
    keys: [],
  };

  for (const detail of cases) {
    const key = `${MAKE_MONEY_VIEW_PREFIX}${detail.id}.json`;
    const result = await writeEntityViewWithCas(bucket, key, detail, runId, retrievedAt);
    report.keys.push(key);
    report.concurrent_retries += result.retries;
    if (result.status === 'CREATED') report.created += 1;
    else if (result.status === 'UPDATED') report.updated += 1;
    else report.unchanged += 1;
  }

  return report;
}

export async function readMakeMoneyViewDetail(entityId: string): Promise<FoundationBusinessCase | null> {
  const bucket = await getFoundationBucketAsync('lake');
  const object = await readR2Object(bucket, `${MAKE_MONEY_VIEW_PREFIX}${entityId}.json`);
  if (!object) return null;
  try {
    return parseViewDocument(decodeJson(object.body))?.detail || null;
  } catch {
    return null;
  }
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

async function readRebuildStateObject(): Promise<{
  bucket: string;
  object: R2ObjectRead | null;
  state: MakeMoneyViewRebuildState;
}> {
  const bucket = await getFoundationBucketAsync('lake');
  const object = await readR2Object(bucket, REBUILD_STATE_KEY);
  if (!object) {
    return {
      bucket,
      object: null,
      state: {
        schema_version: REBUILD_STATE_SCHEMA,
        complete: false,
        cursor: null,
        processed_bundles: 0,
        updated_at: new Date(0).toISOString(),
      },
    };
  }
  const state = parseRebuildState(decodeJson(object.body));
  if (!state) throw new Error('Invalid Make-Money view rebuild state');
  return { bucket, object, state };
}

export async function isMakeMoneyViewBackfillComplete(): Promise<boolean> {
  return (await readRebuildStateObject()).state.complete;
}

/**
 * Incrementally rebuild all Make-Money views from canonical research bundles.
 * The cursor lives inside the rebuildable view namespace, so a worker can call
 * this repeatedly without maintaining external state.
 */
export async function rebuildMakeMoneyViewsPage(limit = 20): Promise<MakeMoneyViewRebuildReport> {
  const boundedLimit = Math.min(Math.max(1, Math.floor(limit)), 50);
  const { bucket, object: stateObject, state } = await readRebuildStateObject();
  if (state.complete) {
    return {
      complete: true,
      processed_this_run: 0,
      processed_total: state.processed_bundles,
      next_cursor: null,
      materialized_entities: 0,
    };
  }

  const dataset = foundationDataset('researchBundles');
  const page = await listR2Objects({
    bucket,
    prefix: dataset.prefix,
    cursor: state.cursor || undefined,
    limit: boundedLimit,
  });

  let processed = 0;
  let materializedEntities = 0;
  for (const item of page.objects.filter((candidate) => candidate.key.endsWith('.json'))) {
    const text = await getFromR2(item.key, bucket);
    if (!text) throw new Error(`Canonical research bundle disappeared during rebuild: ${item.key}`);
    const bundle = JSON.parse(text) as unknown;
    const report = await materializeMakeMoneyViews(bundle);
    materializedEntities += report.attempted;
    processed += 1;
  }

  const nextCursor = page.truncated && page.cursor ? page.cursor : null;
  const nextState: MakeMoneyViewRebuildState = {
    schema_version: REBUILD_STATE_SCHEMA,
    complete: !nextCursor,
    cursor: nextCursor,
    processed_bundles: state.processed_bundles + processed,
    updated_at: new Date().toISOString(),
  };

  await putR2MutableView({
    bucket,
    key: REBUILD_STATE_KEY,
    body: JSON.stringify(nextState),
    contentType: 'application/json',
    metadata: {
      'foundation-view-consumer': 'make-money',
      'foundation-view-rebuild-state': 'true',
    },
  }, {
    expectedEtag: stateObject?.etag ?? null,
  });

  return {
    complete: nextState.complete,
    processed_this_run: processed,
    processed_total: nextState.processed_bundles,
    next_cursor: nextState.cursor,
    materialized_entities: materializedEntities,
  };
}
