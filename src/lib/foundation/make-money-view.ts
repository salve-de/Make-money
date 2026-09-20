import {
  buildFoundationBusinessCaseForEntity,
  foundationBusinessCaseToValueSummary,
  foundationEntityIdsFromBundle,
  readFoundationEntitySummaryById,
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
const PROJECTION_PROGRESS_PREFIX = 'views/make-money/v1/_projection-progress/';
const PROJECTION_PROGRESS_SCHEMA = 'make-money-view-projection-progress.v2';
const UNRESOLVED_REPLAY_STATE_KEY = 'views/make-money/v1/_unresolved-replay-state.json';
const UNRESOLVED_ENTITY_PREFIX = 'views/make-money/v1/_unresolved-by-entity/';
const UNRESOLVED_REPLAY_STATE_SCHEMA = 'make-money-view-unresolved-replay-state.v1';
const MAX_ENTITIES_PER_PROJECTION_CALL = 25;

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

interface MakeMoneyProjectionProgress {
  schema_version: typeof PROJECTION_PROGRESS_SCHEMA;
  run_id: string;
  bundle_key: string;
  retrieved_at: string;
  next_index: number;
  total_targets: number;
  complete: boolean;
  unresolved_entity_ids: string[];
  updated_at: string;
}

interface MakeMoneyUnresolvedReplayState {
  schema_version: typeof UNRESOLVED_REPLAY_STATE_SCHEMA;
  cursor: string | null;
  updated_at: string;
}

interface MakeMoneyUnresolvedEntityRecord {
  schema_version: 'make-money-unresolved-entity.v1';
  entity_id: string;
  run_id: string;
  bundle_key: string;
  retrieved_at: string;
  status: 'PENDING' | 'RESOLVED';
  resolved_at: string | null;
  updated_at: string;
}

interface PendingUnresolvedEntityRecord {
  key: string;
  object: R2ObjectRead;
  record: MakeMoneyUnresolvedEntityRecord;
}

export interface MakeMoneyViewMaterializationReport {
  source_run_id: string;
  attempted: number;
  created: number;
  updated: number;
  unchanged: number;
  concurrent_retries: number;
  unresolved_entity_ids: string[];
  processed_this_call: number;
  next_index: number;
  total_targets: number;
  complete: boolean;
  keys: string[];
}

export interface MakeMoneyViewRebuildReport {
  complete: boolean;
  processed_this_run: number;
  processed_total: number;
  next_cursor: string | null;
  materialized_entities: number;
  unresolved_replayed: number;
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

function projectionBundleKey(runId: string, retrievedAt: string): string {
  const date = new Date(retrievedAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid bundle retrieved_at for projection: ${retrievedAt}`);
  }
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${foundationDataset('researchBundles').prefix}${year}/${month}/${day}/${runId}.json`;
}

function projectionProgressKey(runId: string): string {
  return `${PROJECTION_PROGRESS_PREFIX}${encodeURIComponent(runId)}.json`;
}

function parseProjectionProgress(value: unknown): MakeMoneyProjectionProgress | null {
  const object = objectValue(value);
  if (
    !object ||
    object.schema_version !== PROJECTION_PROGRESS_SCHEMA ||
    typeof object.run_id !== 'string' ||
    typeof object.bundle_key !== 'string' ||
    typeof object.retrieved_at !== 'string' ||
    !Number.isInteger(object.next_index) ||
    !Number.isInteger(object.total_targets) ||
    typeof object.complete !== 'boolean' ||
    !Array.isArray(object.unresolved_entity_ids) ||
    !object.unresolved_entity_ids.every((item) => typeof item === 'string') ||
    typeof object.updated_at !== 'string'
  ) {
    return null;
  }
  return object as unknown as MakeMoneyProjectionProgress;
}

async function readProjectionProgress(
  bucket: string,
  runId: string,
  bundleKey: string,
  retrievedAt: string,
  totalTargets: number
): Promise<{ object: R2ObjectRead | null; state: MakeMoneyProjectionProgress }> {
  const object = await readR2Object(bucket, projectionProgressKey(runId));
  if (!object) {
    return {
      object: null,
      state: {
        schema_version: PROJECTION_PROGRESS_SCHEMA,
        run_id: runId,
        bundle_key: bundleKey,
        retrieved_at: retrievedAt,
        next_index: 0,
        total_targets: totalTargets,
        complete: totalTargets === 0,
        unresolved_entity_ids: [],
        updated_at: new Date(0).toISOString(),
      },
    };
  }

  const state = parseProjectionProgress(decodeJson(object.body));
  if (
    !state ||
    state.run_id !== runId ||
    state.bundle_key !== bundleKey ||
    state.retrieved_at !== retrievedAt ||
    state.total_targets !== totalTargets
  ) {
    throw new Error(`Invalid Make-Money projection progress for ${runId}`);
  }
  return { object, state };
}

async function writeProjectionProgress(
  bucket: string,
  runId: string,
  prior: R2ObjectRead | null,
  state: MakeMoneyProjectionProgress
): Promise<void> {
  await putR2MutableView({
    bucket,
    key: projectionProgressKey(runId),
    body: JSON.stringify(state),
    contentType: 'application/json',
    metadata: {
      'foundation-view-consumer': 'make-money',
      'foundation-view-projection-progress': 'true',
      'foundation-run-id': runId,
    },
  }, {
    expectedEtag: prior?.etag ?? null,
  });
}

function unresolvedEntityPrefix(entityId: string): string {
  return `${UNRESOLVED_ENTITY_PREFIX}${encodeURIComponent(entityId)}/`;
}

function unresolvedEntityKey(entityId: string, runId: string): string {
  return `${unresolvedEntityPrefix(entityId)}${encodeURIComponent(runId)}.json`;
}

function parseUnresolvedEntityRecord(value: unknown): MakeMoneyUnresolvedEntityRecord | null {
  const object = objectValue(value);
  if (
    !object ||
    object.schema_version !== 'make-money-unresolved-entity.v1' ||
    typeof object.entity_id !== 'string' ||
    typeof object.run_id !== 'string' ||
    typeof object.bundle_key !== 'string' ||
    typeof object.retrieved_at !== 'string' ||
    !(object.status === 'PENDING' || object.status === 'RESOLVED') ||
    !(object.resolved_at === null || typeof object.resolved_at === 'string') ||
    typeof object.updated_at !== 'string'
  ) {
    return null;
  }
  return object as unknown as MakeMoneyUnresolvedEntityRecord;
}

async function recordUnresolvedEntityReference(input: {
  bucket: string;
  entityId: string;
  runId: string;
  bundleKey: string;
  retrievedAt: string;
}): Promise<void> {
  const key = unresolvedEntityKey(input.entityId, input.runId);
  const existing = await readR2Object(input.bucket, key);
  if (existing) {
    const parsed = parseUnresolvedEntityRecord(decodeJson(existing.body));
    if (parsed) return;
    throw new Error(`Invalid unresolved entity record at ${key}`);
  }

  const record: MakeMoneyUnresolvedEntityRecord = {
    schema_version: 'make-money-unresolved-entity.v1',
    entity_id: input.entityId,
    run_id: input.runId,
    bundle_key: input.bundleKey,
    retrieved_at: input.retrievedAt,
    status: 'PENDING',
    resolved_at: null,
    updated_at: new Date().toISOString(),
  };
  await putR2MutableView({
    bucket: input.bucket,
    key,
    body: JSON.stringify(record),
    contentType: 'application/json',
    metadata: {
      'foundation-view-consumer': 'make-money',
      'foundation-view-unresolved-entity': input.entityId,
      'foundation-run-id': input.runId,
    },
  }, {
    expectedEtag: null,
  });
}

async function readPendingUnresolvedForEntity(
  bucket: string,
  entityId: string,
  limit = 50
): Promise<PendingUnresolvedEntityRecord[]> {
  const page = await listR2Objects({
    bucket,
    prefix: unresolvedEntityPrefix(entityId),
    limit: Math.min(Math.max(1, Math.floor(limit)), 100),
  });
  const records = await Promise.all(
    page.objects
      .filter((item) => item.key.endsWith('.json'))
      .map(async (item) => {
        const object = await readR2Object(bucket, item.key);
        if (!object) return null;
        try {
          const record = parseUnresolvedEntityRecord(decodeJson(object.body));
          if (!record || record.status !== 'PENDING') return null;
          return { key: item.key, object, record };
        } catch {
          return null;
        }
      })
  );
  return records.filter((item): item is PendingUnresolvedEntityRecord => Boolean(item));
}

async function markUnresolvedResolved(
  bucket: string,
  items: PendingUnresolvedEntityRecord[]
): Promise<void> {
  const resolvedAt = new Date().toISOString();
  for (const item of items) {
    const next: MakeMoneyUnresolvedEntityRecord = {
      ...item.record,
      status: 'RESOLVED',
      resolved_at: resolvedAt,
      updated_at: resolvedAt,
    };
    await putR2MutableView({
      bucket,
      key: item.key,
      body: JSON.stringify(next),
      contentType: 'application/json',
      metadata: {
        'foundation-view-consumer': 'make-money',
        'foundation-view-unresolved-entity': item.record.entity_id,
        'foundation-run-id': item.record.run_id,
      },
    }, {
      expectedEtag: item.object.etag ?? null,
    });
  }
}

async function hydratePendingHistoryForEntity(
  bucket: string,
  entityId: string,
  baseDetail: FoundationBusinessCase
): Promise<{ detail: FoundationBusinessCase; pending: PendingUnresolvedEntityRecord[] }> {
  const pending = await readPendingUnresolvedForEntity(bucket, entityId);
  if (pending.length === 0) return { detail: baseDetail, pending: [] };

  const slices: Array<{ retrievedAt: string; detail: FoundationBusinessCase }> = [];
  for (const item of pending) {
    const text = await getFromR2(item.record.bundle_key, bucket);
    if (!text) continue;
    const bundle = JSON.parse(text) as unknown;
    const summary = await readFoundationEntitySummaryById(entityId);
    if (!summary) continue;
    slices.push({
      retrievedAt: item.record.retrieved_at,
      detail: buildFoundationBusinessCaseForEntity(bundle, summary),
    });
  }
  slices.sort((left, right) => Date.parse(left.retrievedAt) - Date.parse(right.retrievedAt));

  let detail = baseDetail;
  for (const slice of slices) {
    detail = mergeFoundationBusinessCasesForView(detail, slice.detail);
  }
  return { detail, pending };
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

  const [recordOlder, recordNewer] = incomingIsNewer
    ? [existing, incoming]
    : [incoming, existing];

  const claims = mergeById(recordOlder.claims, recordNewer.claims);
  const metrics = mergeById(recordOlder.metrics, recordNewer.metrics);
  const moneySignals = mergeById(recordOlder.moneySignals, recordNewer.moneySignals);
  const events = mergeById(recordOlder.events, recordNewer.events);
  const relationships = mergeById(recordOlder.relationships, recordNewer.relationships);
  const observations = mergeById(recordOlder.observations, recordNewer.observations);
  const derived = mergeById(recordOlder.derived, recordNewer.derived);

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

export async function materializeMakeMoneyViews(
  bundleInput: unknown,
  maxTargets = MAX_ENTITIES_PER_PROJECTION_CALL
): Promise<MakeMoneyViewMaterializationReport> {
  const bundle = objectValue(bundleInput);
  const runId = bundle ? stringValue(bundle, 'run_id') : null;
  const retrievedAt = bundle ? stringValue(bundle, 'retrieved_at') : null;
  if (!runId || !retrievedAt) {
    throw new Error('Make-Money view projection requires bundle.run_id and bundle.retrieved_at');
  }

  const targetIds = [...new Set(foundationEntityIdsFromBundle(bundleInput))].sort();
  const bucket = await getFoundationBucketAsync('lake');
  const bundleKey = projectionBundleKey(runId, retrievedAt);
  const progressRead = await readProjectionProgress(
    bucket,
    runId,
    bundleKey,
    retrievedAt,
    targetIds.length
  );
  const progress = progressRead.state;

  if (progress.complete && progress.unresolved_entity_ids.length === 0) {
    return {
      source_run_id: runId,
      attempted: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      concurrent_retries: 0,
      unresolved_entity_ids: [],
      processed_this_call: 0,
      next_index: progress.next_index,
      total_targets: progress.total_targets,
      complete: true,
      keys: [],
    };
  }

  const boundedMaxTargets = Math.min(
    Math.max(1, Math.floor(maxTargets)),
    MAX_ENTITIES_PER_PROJECTION_CALL
  );
  const startIndex = progress.next_index;
  const retryingUnresolved =
    startIndex >= targetIds.length && progress.unresolved_entity_ids.length > 0;
  const endIndex = retryingUnresolved
    ? startIndex
    : Math.min(targetIds.length, startIndex + boundedMaxTargets);
  const chunkIds = retryingUnresolved
    ? progress.unresolved_entity_ids.slice(0, boundedMaxTargets)
    : targetIds.slice(startIndex, endIndex);
  const unresolved = new Set(progress.unresolved_entity_ids);

  const report: MakeMoneyViewMaterializationReport = {
    source_run_id: runId,
    attempted: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    concurrent_retries: 0,
    unresolved_entity_ids: [],
    processed_this_call: chunkIds.length,
    next_index: endIndex,
    total_targets: targetIds.length,
    complete: false,
    keys: [],
  };

  for (const entityId of chunkIds) {
    const summary = await readFoundationEntitySummaryById(entityId);
    if (!summary) {
      unresolved.add(entityId);
      await recordUnresolvedEntityReference({
        bucket,
        entityId,
        runId,
        bundleKey,
        retrievedAt,
      });
      continue;
    }

    const baseDetail = buildFoundationBusinessCaseForEntity(bundleInput, summary);
    const hydrated = await hydratePendingHistoryForEntity(bucket, entityId, baseDetail);
    const detail = hydrated.detail;

    report.attempted += 1;
    unresolved.delete(entityId);
    const key = `${MAKE_MONEY_VIEW_PREFIX}${detail.id}.json`;
    const result = await writeEntityViewWithCas(bucket, key, detail, runId, retrievedAt);
    report.keys.push(key);
    report.concurrent_retries += result.retries;
    if (result.status === 'CREATED') report.created += 1;
    else if (result.status === 'UPDATED') report.updated += 1;
    else report.unchanged += 1;

    if (hydrated.pending.length > 0) {
      await markUnresolvedResolved(bucket, hydrated.pending);
    }
  }

  report.unresolved_entity_ids = [...unresolved].sort();
  report.complete =
    endIndex >= targetIds.length && report.unresolved_entity_ids.length === 0;

  const nextProgress: MakeMoneyProjectionProgress = {
    schema_version: PROJECTION_PROGRESS_SCHEMA,
    run_id: runId,
    bundle_key: bundleKey,
    retrieved_at: retrievedAt,
    next_index: endIndex,
    total_targets: targetIds.length,
    complete: report.complete,
    unresolved_entity_ids: report.unresolved_entity_ids,
    updated_at: new Date().toISOString(),
  };
  await writeProjectionProgress(bucket, runId, progressRead.object, nextProgress);

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

function parseUnresolvedReplayState(value: unknown): MakeMoneyUnresolvedReplayState | null {
  const object = objectValue(value);
  if (
    !object ||
    object.schema_version !== UNRESOLVED_REPLAY_STATE_SCHEMA ||
    !(object.cursor === null || typeof object.cursor === 'string') ||
    typeof object.updated_at !== 'string'
  ) {
    return null;
  }
  return object as unknown as MakeMoneyUnresolvedReplayState;
}

async function readUnresolvedReplayState(
  bucket: string
): Promise<{ object: R2ObjectRead | null; state: MakeMoneyUnresolvedReplayState }> {
  const object = await readR2Object(bucket, UNRESOLVED_REPLAY_STATE_KEY);
  if (!object) {
    return {
      object: null,
      state: {
        schema_version: UNRESOLVED_REPLAY_STATE_SCHEMA,
        cursor: null,
        updated_at: new Date(0).toISOString(),
      },
    };
  }
  const state = parseUnresolvedReplayState(decodeJson(object.body));
  if (!state) throw new Error('Invalid Make-Money unresolved replay state');
  return { object, state };
}

async function replayUnresolvedProjectionPage(
  bucket: string,
  maxTargets: number
): Promise<number> {
  const replay = await readUnresolvedReplayState(bucket);
  const page = await listR2Objects({
    bucket,
    prefix: PROJECTION_PROGRESS_PREFIX,
    cursor: replay.state.cursor || undefined,
    limit: 5,
  });

  let replayed = 0;
  for (const item of page.objects.filter((candidate) => candidate.key.endsWith('.json'))) {
    const object = await readR2Object(bucket, item.key);
    if (!object) continue;
    let progress: MakeMoneyProjectionProgress | null = null;
    try {
      progress = parseProjectionProgress(decodeJson(object.body));
    } catch {
      progress = null;
    }
    if (!progress || progress.unresolved_entity_ids.length === 0) continue;

    const text = await getFromR2(progress.bundle_key, bucket);
    if (!text) {
      throw new Error(`Canonical research bundle disappeared during unresolved replay: ${progress.bundle_key}`);
    }
    const bundle = JSON.parse(text) as unknown;
    const report = await materializeMakeMoneyViews(bundle, maxTargets);
    replayed += report.attempted;
  }

  const nextCursor = page.truncated && page.cursor ? page.cursor : null;
  const nextState: MakeMoneyUnresolvedReplayState = {
    schema_version: UNRESOLVED_REPLAY_STATE_SCHEMA,
    cursor: nextCursor,
    updated_at: new Date().toISOString(),
  };
  await putR2MutableView({
    bucket,
    key: UNRESOLVED_REPLAY_STATE_KEY,
    body: JSON.stringify(nextState),
    contentType: 'application/json',
    metadata: {
      'foundation-view-consumer': 'make-money',
      'foundation-view-unresolved-replay-state': 'true',
    },
  }, {
    expectedEtag: replay.object?.etag ?? null,
  });

  return replayed;
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
  const boundedLimit = Math.min(Math.max(1, Math.floor(limit)), MAX_ENTITIES_PER_PROJECTION_CALL);
  const { bucket, object: stateObject, state } = await readRebuildStateObject();

  // Once the canonical backfill is complete, keep cycling the much smaller
  // projection-progress ledger so references whose Entity core appeared later
  // are eventually replayed without rescanning the entire research lake.
  if (state.complete) {
    const unresolvedReplayed = await replayUnresolvedProjectionPage(bucket, boundedLimit);
    return {
      complete: true,
      processed_this_run: 0,
      processed_total: state.processed_bundles,
      next_cursor: null,
      materialized_entities: 0,
      unresolved_replayed: unresolvedReplayed,
    };
  }

  const dataset = foundationDataset('researchBundles');
  // One canonical bundle per internal request keeps the R2 subrequest/write
  // budget bounded. Large bundles continue through their per-run projection
  // progress on subsequent calls.
  const page = await listR2Objects({
    bucket,
    prefix: dataset.prefix,
    cursor: state.cursor || undefined,
    limit: 1,
  });

  const item = page.objects.find((candidate) => candidate.key.endsWith('.json'));
  let processed = 0;
  let materializedEntities = 0;
  let bundleInitialScanComplete = true;

  if (item) {
    const text = await getFromR2(item.key, bucket);
    if (!text) throw new Error(`Canonical research bundle disappeared during rebuild: ${item.key}`);
    const bundle = JSON.parse(text) as unknown;
    const report = await materializeMakeMoneyViews(bundle, boundedLimit);
    materializedEntities += report.attempted;
    bundleInitialScanComplete = report.next_index >= report.total_targets;
    if (bundleInitialScanComplete) processed = 1;
  }

  const nextCursor = bundleInitialScanComplete && page.truncated && page.cursor
    ? page.cursor
    : (bundleInitialScanComplete ? null : state.cursor);
  const nextState: MakeMoneyViewRebuildState = {
    schema_version: REBUILD_STATE_SCHEMA,
    complete: bundleInitialScanComplete && !nextCursor,
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
    unresolved_replayed: 0,
  };
}
