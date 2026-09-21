import {
  buildFoundationBusinessCaseForEntity,
  buildFoundationBusinessCasesFromBundle,
  foundationBusinessCaseToValueSummary,
  foundationEntityIdsFromBundle,
  readFoundationEntitySummaryById,
  readLatestNewArrivalsRelease,
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
const UNRESOLVED_HYDRATION_STATE_PREFIX = 'views/make-money/v1/_unresolved-hydration-state/';
const UNRESOLVED_HYDRATION_STATE_SCHEMA = 'make-money-view-unresolved-hydration-state.v1';
const MAX_ENTITIES_PER_PROJECTION_CALL = 25;
const MAX_UNRESOLVED_HISTORY_PER_ENTITY_CALL = 25;
const EVIDENCE_CORRECTION_PREFIX = 'views/make-money/v1/_evidence-corrections/';
const EVIDENCE_CORRECTION_SCHEMA = 'make-money-view-evidence-correction.v1';
const RECORD_GROUPS = ['claims', 'metrics', 'moneySignals', 'events', 'relationships', 'observations', 'derived'] as const;

interface ViewEvidenceCorrectionControl {
  schema_version: typeof EVIDENCE_CORRECTION_SCHEMA;
  entity_id: string;
  original: { key: string; sha256: string; run_id: string };
  corrected: { key: string; sha256: string; run_id: string; retrieved_at: string };
  excluded_evidence_ids: string[];
  replaced_record_ids: Record<typeof RECORD_GROUPS[number], string[]>;
  corrected_detail: FoundationBusinessCase;
}

interface MakeMoneyViewDocument {
  schema_version: typeof MAKE_MONEY_VIEW_SCHEMA;
  consumer: 'make-money';
  projection_version: 'v1';
  source_run_ids: string[];
  latest_source_run_id: string;
  projected_at: string;
  summary: FoundationValueSummary;
  detail: FoundationBusinessCase;
  // Rebuildable control metadata, never a replacement for canonical originals.
  excluded_source_run_ids?: string[];
  excluded_evidence_ids?: string[];
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

interface MakeMoneyUnresolvedHydrationState {
  schema_version: typeof UNRESOLVED_HYDRATION_STATE_SCHEMA;
  entity_id: string;
  cursor: string | null;
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
    || ['excluded_source_run_ids', 'excluded_evidence_ids'].some((key) => object[key] !== undefined
      && (!Array.isArray(object[key]) || !(object[key] as unknown[]).every(item => typeof item === 'string')))
  ) {
    return null;
  }
  return object as unknown as MakeMoneyViewDocument;
}

async function readEvidenceCorrectionControl(bucket: string, entityId: string) {
  const object = await readR2Object(bucket, `${EVIDENCE_CORRECTION_PREFIX}${entityId}.json`);
  if (!object) return { object: null, control: null };
  const value = objectValue(decodeJson(object.body));
  const original = objectValue(value?.original);
  const corrected = objectValue(value?.corrected);
  const records = objectValue(value?.replaced_record_ids);
  if (!value || value.schema_version !== EVIDENCE_CORRECTION_SCHEMA || value.entity_id !== entityId
    || !original || !corrected || !records || !isBusinessCase(value.corrected_detail)
    || value.corrected_detail.id !== entityId
    || [original, corrected].some(ref => !stringValue(ref, 'key') || !stringValue(ref, 'run_id') || !/^[a-f0-9]{64}$/.test(String(ref.sha256)))
    || !Number.isFinite(Date.parse(String(corrected.retrieved_at)))
    || !Array.isArray(value.excluded_evidence_ids) || !value.excluded_evidence_ids.every(id => typeof id === 'string')
    || RECORD_GROUPS.some(group => !Array.isArray(records[group]) || !(records[group] as unknown[]).every(id => typeof id === 'string'))) {
    throw new Error('Invalid persisted evidence correction control');
  }
  return { object, control: value as unknown as ViewEvidenceCorrectionControl };
}

function applyEvidenceCorrectionControl(document: MakeMoneyViewDocument, control: ViewEvidenceCorrectionControl): MakeMoneyViewDocument {
  const detail = { ...document.detail };
  for (const group of RECORD_GROUPS) {
    const replaced = new Set(control.replaced_record_ids[group]);
    // Each array remains its own record type; only membership is changed.
    Object.assign(detail, { [group]: detail[group].filter(row => !replaced.has(row.id)) });
  }
  const excludedEvidence = uniqueStrings(document.excluded_evidence_ids, control.excluded_evidence_ids);
  const corrected = excludeViewEvidence(mergeFoundationBusinessCasesForView(control.corrected_detail, detail), excludedEvidence);
  const excludedRuns = uniqueStrings(document.excluded_source_run_ids, [control.original.run_id]);
  const sourceRuns = uniqueStrings(document.source_run_ids.filter(run => !excludedRuns.includes(run)), [control.corrected.run_id]);
  corrected.bundlesScanned = sourceRuns.length;
  corrected.bundleObjectsListed = sourceRuns.length;
  return { ...document, detail: corrected, summary: foundationBusinessCaseToValueSummary(corrected),
    source_run_ids: sourceRuns, excluded_source_run_ids: excludedRuns, excluded_evidence_ids: excludedEvidence,
    projected_at: maxIso(document.projected_at, control.corrected.retrieved_at) || document.projected_at,
    latest_source_run_id: excludedRuns.includes(document.latest_source_run_id) ? control.corrected.run_id : document.latest_source_run_id };
}

async function readCorrectedViewDocument(bucket: string, key: string): Promise<MakeMoneyViewDocument | null> {
  const object = await readR2Object(bucket, key);
  if (!object) return null;
  const document = parseViewDocument(decodeJson(object.body));
  if (!document) return null;
  const { control } = await readEvidenceCorrectionControl(bucket, document.detail.id);
  return control ? applyEvidenceCorrectionControl(document, control) : document;
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

export async function canResumeMakeMoneyProjection(
  bundleInput: unknown
): Promise<{ can_resume: boolean; run_id: string | null; get_object_calls: number }> {
  const bundle = objectValue(bundleInput);
  const runId = bundle ? stringValue(bundle, 'run_id') : null;
  const retrievedAt = bundle ? stringValue(bundle, 'retrieved_at') : null;
  if (!runId || !retrievedAt) {
    return { can_resume: false, run_id: runId, get_object_calls: 0 };
  }

  const targetIds = [...new Set(foundationEntityIdsFromBundle(bundleInput))].sort();
  const bucket = await getFoundationBucketAsync('lake');
  const bundleKey = projectionBundleKey(runId, retrievedAt);
  const progressObject = await readR2Object(bucket, projectionProgressKey(runId));
  if (!progressObject) {
    return { can_resume: false, run_id: runId, get_object_calls: 1 };
  }

  const progress = parseProjectionProgress(decodeJson(progressObject.body));
  if (
    !progress ||
    progress.run_id !== runId ||
    progress.bundle_key !== bundleKey ||
    progress.retrieved_at !== retrievedAt ||
    progress.total_targets !== targetIds.length
  ) {
    throw new Error(`Invalid Make-Money projection progress for ${runId}`);
  }

  const canonical = await getFromR2(bundleKey, bucket);
  if (!canonical) {
    return { can_resume: false, run_id: runId, get_object_calls: 2 };
  }
  // Canonical research bundles use the same JSON serialization contract as
  // ingest.jsonBytes(): JSON.stringify(value) followed by a trailing newline.
  const expectedCanonical = `${JSON.stringify(bundleInput)}\n`;
  if (canonical !== expectedCanonical) {
    throw new Error(`Canonical research bundle does not match projection retry for ${runId}`);
  }

  return { can_resume: true, run_id: runId, get_object_calls: 2 };
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

function unresolvedHydrationStateKey(entityId: string): string {
  return `${UNRESOLVED_HYDRATION_STATE_PREFIX}${encodeURIComponent(entityId)}.json`;
}

function parseUnresolvedHydrationState(
  value: unknown
): MakeMoneyUnresolvedHydrationState | null {
  const object = objectValue(value);
  if (
    !object ||
    object.schema_version !== UNRESOLVED_HYDRATION_STATE_SCHEMA ||
    typeof object.entity_id !== 'string' ||
    !(object.cursor === null || typeof object.cursor === 'string') ||
    typeof object.updated_at !== 'string'
  ) {
    return null;
  }
  return object as unknown as MakeMoneyUnresolvedHydrationState;
}

async function readUnresolvedHydrationState(
  bucket: string,
  entityId: string
): Promise<{ object: R2ObjectRead | null; state: MakeMoneyUnresolvedHydrationState }> {
  const key = unresolvedHydrationStateKey(entityId);
  const object = await readR2Object(bucket, key);
  if (!object) {
    return {
      object: null,
      state: {
        schema_version: UNRESOLVED_HYDRATION_STATE_SCHEMA,
        entity_id: entityId,
        cursor: null,
        updated_at: new Date(0).toISOString(),
      },
    };
  }

  const state = parseUnresolvedHydrationState(decodeJson(object.body));
  if (!state || state.entity_id !== entityId) {
    throw new Error(`Invalid unresolved hydration state for ${entityId}`);
  }
  return { object, state };
}

async function writeUnresolvedHydrationState(
  bucket: string,
  entityId: string,
  prior: R2ObjectRead | null,
  cursor: string | null
): Promise<void> {
  const state: MakeMoneyUnresolvedHydrationState = {
    schema_version: UNRESOLVED_HYDRATION_STATE_SCHEMA,
    entity_id: entityId,
    cursor,
    updated_at: new Date().toISOString(),
  };
  await putR2MutableView({
    bucket,
    key: unresolvedHydrationStateKey(entityId),
    body: JSON.stringify(state),
    contentType: 'application/json',
    metadata: {
      'foundation-view-consumer': 'make-money',
      'foundation-view-unresolved-hydration-state': 'true',
      'foundation-entity-id': entityId,
    },
  }, {
    expectedEtag: prior?.etag ?? null,
  });
}

async function readPendingUnresolvedForEntityChunk(
  bucket: string,
  entityId: string
): Promise<{
  records: PendingUnresolvedEntityRecord[];
  stateObject: R2ObjectRead | null;
  nextCursor: string | null;
  complete: boolean;
}> {
  const hydration = await readUnresolvedHydrationState(bucket, entityId);
  const page = await listR2Objects({
    bucket,
    prefix: unresolvedEntityPrefix(entityId),
    cursor: hydration.state.cursor || undefined,
    limit: MAX_UNRESOLVED_HISTORY_PER_ENTITY_CALL,
  });

  const pageRecords = await Promise.all(
    page.objects
      .filter((item) => item.key.endsWith('.json'))
      .map(async (item) => {
        const object = await readR2Object(bucket, item.key);
        if (!object) {
          throw new Error(`Unresolved entity record disappeared during hydration: ${item.key}`);
        }
        const record = parseUnresolvedEntityRecord(decodeJson(object.body));
        if (!record) {
          throw new Error(`Invalid unresolved entity record at ${item.key}`);
        }
        if (record.status !== 'PENDING') return null;
        return { key: item.key, object, record };
      })
  );

  const nextCursor = page.truncated && page.cursor ? page.cursor : null;
  return {
    records: pageRecords.filter(
      (item): item is PendingUnresolvedEntityRecord => Boolean(item)
    ),
    stateObject: hydration.object,
    nextCursor,
    complete: !nextCursor,
  };
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
): Promise<{
  detail: FoundationBusinessCase;
  pending: PendingUnresolvedEntityRecord[];
  stateObject: R2ObjectRead | null;
  nextCursor: string | null;
  complete: boolean;
}> {
  const chunk = await readPendingUnresolvedForEntityChunk(bucket, entityId);
  if (chunk.records.length === 0) {
    return {
      detail: baseDetail,
      pending: [],
      stateObject: chunk.stateObject,
      nextCursor: chunk.nextCursor,
      complete: chunk.complete,
    };
  }

  const summary = await readFoundationEntitySummaryById(entityId);
  if (!summary) {
    throw new Error(`Foundation entity core disappeared during unresolved hydration: ${entityId}`);
  }

  const slices: Array<{
    retrievedAt: string;
    detail: FoundationBusinessCase;
    pending: PendingUnresolvedEntityRecord;
  }> = [];
  for (const item of chunk.records) {
    const text = await getFromR2(item.record.bundle_key, bucket);
    if (!text) {
      throw new Error(
        `Canonical research bundle disappeared during unresolved hydration: ${item.record.bundle_key}`
      );
    }
    const bundle = JSON.parse(text) as unknown;
    slices.push({
      retrievedAt: item.record.retrieved_at,
      detail: buildFoundationBusinessCaseForEntity(bundle, summary),
      pending: item,
    });
  }
  slices.sort((left, right) => Date.parse(left.retrievedAt) - Date.parse(right.retrievedAt));

  let detail = baseDetail;
  for (const slice of slices) {
    detail = mergeFoundationBusinessCasesForView(detail, slice.detail);
  }
  return {
    detail,
    pending: slices.map((slice) => slice.pending),
    stateObject: chunk.stateObject,
    nextCursor: chunk.nextCursor,
    complete: chunk.complete,
  };
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

export function excludeViewEvidence(detail: FoundationBusinessCase, excludedIds: readonly string[]): FoundationBusinessCase {
  if (excludedIds.length === 0) return detail;
  const excluded = new Set(excludedIds);
  const keep = (ids: string[]) => ids.filter(id => !excluded.has(id));
  const filter = <T extends { evidenceIds: string[] }>(rows: T[]): T[] => rows.map(row => ({ ...row, evidenceIds: keep(row.evidenceIds) }));
  const next = {
    ...detail, evidenceIds: keep(detail.evidenceIds),
    claims: filter(detail.claims), metrics: filter(detail.metrics), moneySignals: filter(detail.moneySignals),
    events: filter(detail.events), relationships: filter(detail.relationships), observations: filter(detail.observations),
    derived: detail.derived.map(row => ({ ...row, supportingEvidenceIds: keep(row.supportingEvidenceIds) })),
  };
  next.valueProfile = buildFoundationValueProfile(next, next);
  return next;
}

function buildDocument(
  existing: MakeMoneyViewDocument | null,
  incoming: FoundationBusinessCase,
  runId: string,
  retrievedAt: string
): MakeMoneyViewDocument {
  const detail = excludeViewEvidence(
    existing ? mergeFoundationBusinessCasesForView(existing.detail, incoming) : incoming,
    existing?.excluded_evidence_ids || []
  );
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
    ...(existing?.excluded_source_run_ids ? { excluded_source_run_ids: existing.excluded_source_run_ids } : {}),
    ...(existing?.excluded_evidence_ids ? { excluded_evidence_ids: existing.excluded_evidence_ids } : {}),
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

    const { control } = await readEvidenceCorrectionControl(bucket, incoming.id);
    if (existingDocument && control) existingDocument = applyEvidenceCorrectionControl(existingDocument, control);

    // A delayed replay of an explicitly superseded run must not restore its
    // wrong associations, even when its canonical core remains immutable.
    if (existingDocument?.excluded_source_run_ids?.includes(runId)) {
      return { status: 'UNCHANGED', retries: attempt };
    }
    const rawDocument = buildDocument(existingDocument, incoming, runId, retrievedAt);
    const document = control ? applyEvidenceCorrectionControl(rawDocument, control) : rawDocument;
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
    if (
      hydrated.stateObject ||
      hydrated.pending.length > 0 ||
      hydrated.nextCursor !== null
    ) {
      await writeUnresolvedHydrationState(
        bucket,
        entityId,
        hydrated.stateObject,
        hydrated.nextCursor
      );
    }

    if (hydrated.complete) unresolved.delete(entityId);
    else unresolved.add(entityId);
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

export interface ViewEvidenceCorrectionInput {
  entityId: string;
  original: { key: string; sha256: string };
  corrected: { key: string; sha256: string };
  dryRun?: boolean;
}

/** Operator-only evidence repair. Reads immutable bundles; CAS-writes only the existing product view. */
export async function repairMakeMoneyViewEvidence(input: ViewEvidenceCorrectionInput) {
  if (!/^ent_[a-zA-Z0-9_.-]+$/.test(input.entityId)) throw new Error('Invalid correction entity ID');
  const bucket = await getFoundationBucketAsync('lake');
  const prefix = foundationDataset('researchBundles').prefix;
  const readBundle = async (key: string, expectedHash?: string) => {
    if (!key.startsWith(prefix) || key.includes('..') || !key.endsWith('.json')) throw new Error('Invalid canonical bundle key');
    const object = await readR2Object(bucket, key);
    if (!object) throw new Error('Required canonical bundle is missing');
    if (expectedHash) {
      if (!/^[a-f0-9]{64}$/.test(expectedHash)) throw new Error('Invalid bundle hash');
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(object.body)))].map(b => b.toString(16).padStart(2, '0')).join('');
      if (hash !== expectedHash) throw new Error('Canonical bundle hash mismatch');
    }
    const value = objectValue(decodeJson(object.body));
    const runId = value && stringValue(value, 'run_id');
    const retrievedAt = value && stringValue(value, 'retrieved_at');
    if (!value || value.schema_version !== 'research-bundle.v1' || !runId || !retrievedAt
      || projectionBundleKey(runId, retrievedAt) !== key) throw new Error('Canonical bundle identity mismatch');
    return { value, runId, retrievedAt };
  };
  const original = await readBundle(input.original.key, input.original.sha256);
  const corrected = await readBundle(input.corrected.key, input.corrected.sha256);
  if (original.runId === corrected.runId) throw new Error('Correction must be a separate immutable run');
  const oldCase = buildFoundationBusinessCasesFromBundle(original.value).find(row => row.id === input.entityId);
  const newCase = buildFoundationBusinessCasesFromBundle(corrected.value).find(row => row.id === input.entityId);
  if (!oldCase || !newCase || oldCase.name !== newCase.name || oldCase.entityType !== newCase.entityType
    || newCase.evidenceIds.some(id => !oldCase.evidenceIds.includes(id))) throw new Error('Not an evidence-subset correction for this entity');
  for (const field of ['canonicalIdentifier', 'domain', 'aliases', 'status', 'observedAt'] as const) {
    if (JSON.stringify(oldCase[field]) !== JSON.stringify(newCase[field])) throw new Error('Correction changes entity facts');
  }
  const withoutEvidence = (row: object, omitId = false) => JSON.stringify(Object.fromEntries(
    Object.entries(row).filter(([key]) => key !== 'evidenceIds' && key !== 'supportingEvidenceIds' && (!omitId || key !== 'id'))
  ));
  for (const field of ['claims', 'metrics', 'moneySignals', 'events', 'relationships', 'derived'] as const) {
    const before = oldCase[field].map(row => withoutEvidence(row)).sort();
    const after = newCase[field].map(row => withoutEvidence(row)).sort();
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Evidence correction changes record facts');
  }
  const correctedObservations = new Set(newCase.observations.map(row => withoutEvidence(row, true)));
  if (oldCase.observations.some(row => !correctedObservations.has(withoutEvidence(row, true)))) {
    throw new Error('Evidence correction drops or changes observations');
  }
  const excludedIds = oldCase.evidenceIds.filter(id => !newCase.evidenceIds.includes(id));
  if (excludedIds.length === 0) throw new Error('No excessive evidence associations to correct');
  const key = `${MAKE_MONEY_VIEW_PREFIX}${input.entityId}.json`;
  for (let attempt = 0; attempt < MAX_CAS_RETRIES; attempt++) {
    const prior = await readR2Object(bucket, key);
    const existing = prior && parseViewDocument(decodeJson(prior.body));
    if (!prior || !existing) throw new Error('Valid prior product view required for correction');
    if (!existing.source_run_ids.includes(original.runId) && !existing.source_run_ids.includes(corrected.runId)) {
      throw new Error('Original run is not a contributor to this view');
    }
    const excludedRuns = uniqueStrings(existing.excluded_source_run_ids, [original.runId]);
    const runs = existing.source_run_ids.filter(run => !excludedRuns.includes(run) && run !== corrected.runId);
    if (runs.length > 100) throw new Error('Correction history requires a bounded operator plan');
    const history = [corrected];
    for (const run of runs) {
      const progressObject = await readR2Object(bucket, projectionProgressKey(run));
      const progress = progressObject && parseProjectionProgress(decodeJson(progressObject.body));
      if (!progress || progress.run_id !== run) throw new Error('Other contributing history cannot be resolved; refusing to drop it');
      const source = await readBundle(progress.bundle_key);
      if (source.runId !== run) throw new Error('Contributing history run mismatch');
      history.push(source);
    }
    history.sort((left, right) => Date.parse(left.retrievedAt) - Date.parse(right.retrievedAt) || left.runId.localeCompare(right.runId));
    // Do not seed with immutable Entity-core evidence: it still has the old
    // over-link. Rebuild each accepted contribution from its own bundle.
    const summary = { ...newCase, evidenceIds: [] };
    let rebuilt: MakeMoneyViewDocument | null = null;
    for (const source of history) {
      const detail = buildFoundationBusinessCaseForEntity(source.value, summary);
      rebuilt = buildDocument(rebuilt, detail, source.runId, source.retrievedAt);
    }
    if (!rebuilt) throw new Error('Empty correction history');
    const blockedEvidence = uniqueStrings(existing.excluded_evidence_ids, excludedIds);
    rebuilt.detail = excludeViewEvidence(rebuilt.detail, blockedEvidence);
    rebuilt.summary = foundationBusinessCaseToValueSummary(rebuilt.detail);
    rebuilt.excluded_source_run_ids = excludedRuns;
    rebuilt.excluded_evidence_ids = blockedEvidence;
    if (input.dryRun) return { entityId: input.entityId, originalRunId: original.runId, correctedRunId: corrected.runId,
      retainedRunIds: rebuilt.source_run_ids, excludedEvidenceCount: blockedEvidence.length, status: 'DRY_RUN' as const, retries: attempt };
    try {
      const guard: ViewEvidenceCorrectionControl = {
        schema_version: EVIDENCE_CORRECTION_SCHEMA, entity_id: input.entityId,
        original: { ...input.original, run_id: original.runId },
        corrected: { ...input.corrected, run_id: corrected.runId, retrieved_at: corrected.retrievedAt },
        excluded_evidence_ids: excludedIds,
        replaced_record_ids: Object.fromEntries(RECORD_GROUPS.map(group => [group, oldCase[group].map(row => row.id)])) as ViewEvidenceCorrectionControl['replaced_record_ids'],
        corrected_detail: newCase,
      };
      const priorControl = await readEvidenceCorrectionControl(bucket, input.entityId);
      if (priorControl.control && JSON.stringify(priorControl.control) !== JSON.stringify(guard)) {
        throw new Error('Different correction already registered; explicit reconciliation required');
      }
      // Persist independently before the ordinary view: old deployed projectors
      // can rewrite that view, but cannot erase the local consumer's correction.
      const controlResult = await putR2MutableView({ bucket, key: `${EVIDENCE_CORRECTION_PREFIX}${input.entityId}.json`,
        body: JSON.stringify(guard), contentType: 'application/json',
        metadata: { 'foundation-view-consumer': 'make-money', 'foundation-entity-id': input.entityId,
          'foundation-view-evidence-correction': 'true' },
      }, { expectedEtag: priorControl.object?.etag ?? null });
      const result = await putR2MutableView({ bucket, key, body: JSON.stringify(rebuilt), contentType: 'application/json',
        metadata: { 'foundation-view-consumer': 'make-money', 'foundation-view-version': 'v1',
          'foundation-entity-id': input.entityId, 'foundation-run-id': rebuilt.latest_source_run_id,
          'foundation-source-run-count': String(rebuilt.source_run_ids.length) },
      }, { expectedEtag: prior.etag ?? null });
      return { entityId: input.entityId, originalRunId: original.runId, correctedRunId: corrected.runId,
        retainedRunIds: rebuilt.source_run_ids, excludedEvidenceCount: blockedEvidence.length,
        status: result.status, sha256: result.sha256, readback: result.readback,
        controlReadback: controlResult.readback, retries: attempt };
    } catch (error) {
      if (error instanceof R2ViewConcurrentModificationError && attempt + 1 < MAX_CAS_RETRIES) continue;
      throw error;
    }
  }
  throw new Error('Correction CAS retries exhausted');
}

export async function readMakeMoneyViewDetail(entityId: string): Promise<FoundationBusinessCase | null> {
  const bucket = await getFoundationBucketAsync('lake');
  return (await readCorrectedViewDocument(bucket, `${MAKE_MONEY_VIEW_PREFIX}${entityId}.json`))?.detail || null;
}

/** Bound remote R2 reads while retaining input order and failure visibility. */
export async function mapServingReads<T, R>(items: readonly T[], read: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(8, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await read(items[index]);
    }
  }));
  return results;
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
    await mapServingReads(
      page.objects
        .filter((item) => item.key.endsWith('.json')),
        async (item) => {
          return (await readCorrectedViewDocument(bucket, item.key))?.summary || null;
        }
    )
  ).filter((value): value is FoundationValueSummary => Boolean(value));

  const nextCursor = page.truncated && page.cursor ? page.cursor : null;
  const newArrivals = await readLatestNewArrivalsRelease().catch(() => null);
  if (!options.cursor && newArrivals) {
    const known = new Set(data.map((item) => item.id));
    const promoted = await mapServingReads(newArrivals.entityIds.slice(0, 500)
      .filter((id) => !known.has(id)),
      async (id) => {
        const detail = await readMakeMoneyViewDetail(id).catch(() => null);
        if (detail) return foundationBusinessCaseToValueSummary(detail);
        // The hourly writer can publish an edition before the product view
        // is rebuilt. Keep those canonical records visible as partial rows.
        const entity = await readFoundationEntitySummaryById(id).catch(() => null);
        return entity ? {
          ...entity,
          valueProfile: buildFoundationValueProfile(entity, {
            claims: [], metrics: [], moneySignals: [], events: [],
            observations: [], derived: [], relationships: [],
          }),
        } : null;
      });
    data.unshift(...promoted.filter((item): item is FoundationValueSummary => Boolean(item)));
  }
  return {
    data: data.map((item) => ({ ...item, isNew: Boolean(newArrivals?.entityIds.includes(item.id)) })),
    nextCursor,
    hasMore: Boolean(nextCursor),
    newArrivals,
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
