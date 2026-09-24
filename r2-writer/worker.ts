import { materializeScheduledR2Handoff, ScheduledHandoffMaterializationError, type ScheduledQueueRun, type ScheduledSourceRun } from '../src/lib/foundation/scheduled-r2-handoff';
import { auditCorrectionTarget, validateAuditCorrection } from '../src/lib/foundation/queue-audit-correction';
import { sha256Sync } from '../src/shared/sha256';
import { validateEvidenceLinkCorrection } from '../src/lib/foundation/evidence-link-correction';
import { assertEvidenceOnlyEntityHistory } from '../src/lib/foundation/immutable-entity-history';
import { candidateArtifactManifest } from '../src/lib/foundation/candidate-artifact-manifest';
import { prepareUnstoredMoneySignalDefaults, defaultIncomingMoneySignalFields } from '../src/lib/foundation/money-signal-null-defaults';
import { validateResearchBundle } from '../src/lib/foundation/ingest';
import { withCloudflareRuntimeEnv } from '../src/lib/runtime/cloudflare';
import {
  buildMakeMoneyPublicProjection,
  materializeMakeMoneyViews,
} from '../src/lib/foundation/make-money-view';
import {
  buildNewArrivalsContribution,
  newArrivalsContributionKey,
  type NewArrivalsContribution,
} from '../src/lib/foundation/new-arrivals';

type JsonRecord = Record<string, unknown>;

interface R2ObjectLike {
  arrayBuffer?: () => Promise<ArrayBuffer>;
  body?: ReadableStream<Uint8Array>;
}

interface R2BucketLike {
  head(key: string): Promise<R2ObjectLike | null>;
  get(key: string): Promise<R2ObjectLike | null>;
  put(
    key: string,
    value: Uint8Array,
    options?: {
      onlyIf?: { etagDoesNotMatch?: string };
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<R2ObjectLike | null>;
}

interface WriterEnv {
  FOUNDATION_R2_RAW: R2BucketLike;
  FOUNDATION_R2_LAKE: R2BucketLike;
  FOUNDATION_R2_RESTRICTED: R2BucketLike;
  FOUNDATION_R2_PUBLIC: R2BucketLike;
  FOUNDATION_GITHUB_TOKEN?: string;
  FOUNDATION_GITHUB_REPO?: string;
  FOUNDATION_GITHUB_BRANCH?: string;
  FOUNDATION_R2_WRITER_ENABLED?: string;
  FOUNDATION_R2_WRITER_VERSION?: string;
  FOUNDATION_WRITER_TOKEN?: string;
}

interface GithubContentResponse {
  content?: string;
  encoding?: string;
  sha?: string;
  type?: string;
}

interface GithubTreeResponse {
  truncated?: boolean;
  tree?: Array<{ path?: string; type?: string; sha?: string }>;
}

class GithubJsonParseError extends Error {
  constructor(
    readonly path: string,
    readonly isPlaceholder: boolean,
    cause: unknown,
  ) {
    super(
      isPlaceholder
        ? `GitHub content is a placeholder, not JSON: ${path}`
        : `GitHub content is not valid JSON: ${path}${cause instanceof Error ? ` (${cause.message})` : ''}`,
    );
    this.name = 'GithubJsonParseError';
  }
}

interface PlannedObject {
  role: string;
  datasetId: string;
  bucketName: string;
  bucket: R2BucketLike;
  key: string;
  body: Uint8Array;
  contentType: string;
  sourceEvidenceIds: string[];
  sha256: string;
  bytes: number;
  foundationRunId?: string;
}

type PlannedCandidate = Omit<PlannedObject, 'body' | 'sha256' | 'bytes'> & { payload: unknown };

interface ProviderCounts {
  head_bucket: number;
  get_object: number;
  put_object: number;
}

const API_ROOT = 'https://api.github.com';
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';
const DATASET = {
  entities: 'ds.business.entities.core',
  claims: 'ds.business.claims.core',
  metrics: 'ds.business.metrics.core',
  moneySignals: 'ds.business.money-signals.core',
  events: 'ds.business.events.core',
  relationships: 'ds.business.relationships.core',
  bundles: 'ds.business.research-bundles.derived',
  intelligence: 'ds.business.intelligence.derived',
  journal: 'ds.foundation.journal.core',
  newArrivals: 'ds.make-money.new-arrivals.contributions',
} as const;

// Keep the newest edition moving while draining historical queue artifacts.
// One queue run can materialize hundreds of immutable R2 objects, so the
// per-invocation bound is deliberately small and explicit.
const MAX_QUEUE_RUNS_PER_INVOCATION = 2;
const githubSessions = new WeakMap<WriterEnv, { calls: number; paths?: Set<string>; blobs?: Map<string, string>; cache: Map<string, unknown> }>();
class RequestBudgetReached extends Error {}
const r2Budgets = new WeakMap<WriterEnv, { remaining: number }>();
class R2BudgetReached extends Error {}
class ImmutableObjectConflict extends Error {
  constructor(readonly object: { bucket: string; key: string; expected_sha256: string; observed_sha256: string;
    expected_bytes: number; observed_bytes: number }) {
    super(`R2_OBJECT_CONFLICT ${object.bucket}/${object.key}`);
    this.name = 'ImmutableObjectConflict';
  }
}

export async function projectBundleForUI(bundle: JsonRecord, env: WriterEnv) {
  const budget = r2Budgets.get(env);
  const binding = env.FOUNDATION_R2_LAKE;
  // Only this invocation's binding is wrapped. No global environment mutation.
  const lake = new Proxy(binding, {
    get(target, key) {
      const value = Reflect.get(target, key);
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) => {
        if (budget) {
          if (budget.remaining < 1) throw new R2BudgetReached('R2 projection budget exhausted');
          budget.remaining -= 1;
        }
        return Reflect.apply(value, target, args);
      };
    },
  });

  return withCloudflareRuntimeEnv(
    { ...env, FOUNDATION_R2_LAKE: lake },
    async () => {
      const publicProjection = await buildMakeMoneyPublicProjection(bundle);
      if (!publicProjection.bundle) {
        return {
          status: 'RIGHTS_HELD' as const,
          source_run_id: text(bundle.run_id) || 'unknown',
          attempted: 0,
          created: 0,
          updated: 0,
          unchanged: 0,
          concurrent_retries: 0,
          unresolved_entity_ids: [],
          processed_this_call: 0,
          next_index: 0,
          total_targets: 0,
          complete: true,
          keys: [],
          commercial_publication: publicProjection.assessment,
        };
      }

      const report = await materializeMakeMoneyViews(publicProjection.bundle);
      return {
        status: report.complete ? 'PASS' as const : 'PARTIAL' as const,
        ...report,
        commercial_publication: publicProjection.assessment,
      };
    },
  );
}

async function projectHistoricalReceipt(env: WriterEnv, queuePath: string, receiptPath: string, receipt: JsonRecord) {
  const r2 = record(receipt.r2) ? receipt.r2 : {};
  const objects = Array.isArray(r2.objects) ? r2.objects.filter(record) : [];
  const bundleObject = objects.find(item => item.role === 'research_bundle');
  const key = bundleObject && text(bundleObject.key);
  if (!key || !key.startsWith(`datasets/${DATASET.bundles}/v1/`)) throw new Error('Stored success receipt has no canonical bundle key');
  const budget = r2Budgets.get(env);
  if (budget && budget.remaining-- < 1) throw new R2BudgetReached('R2 historical read budget exhausted');
  const stored = await env.FOUNDATION_R2_LAKE.get(key);
  if (!stored) throw new Error('Historical success receipt bundle is missing from R2');
  const bytes = await readBytes(stored);
  if (await sha256Hex(bytes) !== bundleObject.sha256 || bytes.length !== bundleObject.bytes) throw new Error('Historical bundle readback mismatch');
  const bundle = JSON.parse(new TextDecoder().decode(bytes)) as JsonRecord;
  const projection = await projectBundleForUI(bundle, env);
  if (!projection.complete) return { status: 'DEFERRED_UI_PROJECTION', queue_path: queuePath, view_projection: projection };
  const path = retryReceiptPath(receiptPath, env);
  await writeGithubReceipt(env, path, { ...receipt, writer_version: writerVersion(env), finished_at: new Date().toISOString(), view_projection: projection,
    recovery: { mode: 'existing_canonical_bundle_to_ui', canonical_writes_this_attempt: 0 } });
  return { status: 'SUCCESS', queue_path: queuePath, receipt_path: path, created: 0, view_projection: projection };
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function record(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function queueAutomationValue(queue: ScheduledQueueRun, key: string): unknown {
  return record(queue.automation) ? queue.automation[key] : undefined;
}

function queueRunId(queue: ScheduledQueueRun): string | null {
  return text(queue.run_id) || text(queueAutomationValue(queue, 'run_id'));
}

function queueStartedAt(queue: ScheduledQueueRun): string | null {
  return text(queue.started_at) || text(queueAutomationValue(queue, 'started_at'));
}

function queueFinishedAt(queue: ScheduledQueueRun): string | null {
  return text(queue.finished_at) || text(queueAutomationValue(queue, 'finished_at'));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function sourceRunPathValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(sourceRunPathValues);
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (!record(value)) return [];
  return Object.values(value).flatMap(sourceRunPathValues);
}

export function sourceRunPaths(snapshot: JsonRecord | null): string[] {
  if (!snapshot) return [];
  const artifactRefs = record(snapshot.source_artifacts) ? snapshot.source_artifacts : {};
  const selectedArtifactPaths = [snapshot.selected_discovery, snapshot.selected_evolve].flatMap((selection) => {
    const runId = record(selection) ? text(selection.run_id) : null;
    return runId ? sourceRunPathValues(artifactRefs[runId]) : [];
  });
  const candidates = [
    ...selectedArtifactPaths,
    ...sourceRunPathValues(snapshot.primary_source_runs_selected),
    ...sourceRunPathValues(snapshot.new_completed_heads_seen_before_cutoff),
    ...sourceRunPathValues(snapshot.selected_source_runs),
    ...sourceRunPathValues(snapshot.selected_source_run),
    ...sourceRunPathValues(snapshot.selected_source_path),
    ...sourceRunPathValues(snapshot.selected_source_paths),
    ...sourceRunPathValues(snapshot.operative_source_path),
    ...sourceRunPathValues(snapshot.primary_source_run),
    ...sourceRunPathValues(snapshot.new_source_run_refs),
    ...sourceRunPathValues(snapshot.source_run_refs),
    ...sourceRunPathValues(snapshot.source_discovery),
    ...sourceRunPathValues(snapshot.source_evolve),
    ...sourceRunPathValues(snapshot.selected_discovery),
    ...sourceRunPathValues(snapshot.selected_evolve),
  ];
  return candidates.filter((path, index, all) => /^staging\/automation\/(backfill|discovery|monitor|evolve)\//.test(path) && all.indexOf(path) === index);
}

function jsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value)}\n`);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digestInput = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest('SHA-256', digestInput);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function dateParts(value: string): { year: string; month: string; day: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`invalid ISO date-time: ${value}`);
  return {
    year: String(date.getUTCFullYear()).padStart(4, '0'),
    month: String(date.getUTCMonth() + 1).padStart(2, '0'),
    day: String(date.getUTCDate()).padStart(2, '0'),
  };
}

function recordDate(row: JsonRecord, fallback: string): string {
  for (const key of ['point_in_time', 'period_start', 'occurred_at', 'valid_from', 'observed_at']) {
    const value = text(row[key]);
    if (value && !Number.isNaN(new Date(value).getTime())) return value;
  }
  return fallback;
}

function safeType(value: string): string {
  return value.replace(/[^A-Za-z0-9._:-]+/g, '_').replace(/^_+|_+$/g, '') || 'general';
}

function bodyFromJson(value: unknown): Promise<{ body: Uint8Array; sha256: string; bytes: number }> {
  return (async () => {
    const body = jsonBytes(value);
    return { body, sha256: await sha256Hex(body), bytes: body.byteLength };
  })();
}

function bucketForRole(env: WriterEnv, role: 'raw' | 'lake' | 'restricted' | 'public'): { name: string; bucket: R2BucketLike } {
  if (role === 'raw') return { name: 'foundation-raw', bucket: env.FOUNDATION_R2_RAW };
  if (role === 'restricted') return { name: 'foundation-restricted', bucket: env.FOUNDATION_R2_RESTRICTED };
  if (role === 'public') return { name: 'foundation-public', bucket: env.FOUNDATION_R2_PUBLIC };
  return { name: 'foundation-lake', bucket: env.FOUNDATION_R2_LAKE };
}

function evidenceIds(row: JsonRecord): string[] {
  return stringArray(row.evidence_ids).filter((value) => /^ev_[a-f0-9]{24}$/.test(value));
}

function typedObjects(bundle: JsonRecord, env: WriterEnv): PlannedCandidate[] {
  const runId = text(bundle.run_id) || 'run_unknown';
  const retrievedAt = text(bundle.retrieved_at) || new Date(0).toISOString();
  const fallbackDate = retrievedAt;
  const parts = dateParts(retrievedAt);
  const output: PlannedCandidate[] = [];
  const lake = bucketForRole(env, 'lake');
  const add = (role: string, datasetId: string, key: string, payload: unknown, sourceEvidenceIds: string[]) => {
    output.push({ role, datasetId, bucketName: lake.name, bucket: lake.bucket, key, contentType: JSON_CONTENT_TYPE, sourceEvidenceIds, foundationRunId: runId, payload });
  };

  const entities = Array.isArray(bundle.entities) ? bundle.entities.filter(record) : [];
  for (const entity of entities) {
    const entityId = text(entity.entity_id);
    if (!entityId) continue;
    add('entity', DATASET.entities, `datasets/${DATASET.entities}/v1/entities/${entityId}.json`, entity, evidenceIds(entity));
  }

  const partitions: Array<[string, string, string, string]> = [
    ['claims', DATASET.claims, 'claim', 'claim_id'],
    ['metrics', DATASET.metrics, 'metric', 'metric_id'],
    ['money_signals', DATASET.moneySignals, 'money_signal', 'money_signal_id'],
    ['events', DATASET.events, 'event', 'event_id'],
    ['relationships', DATASET.relationships, 'relationship', 'relationship_id'],
  ];
  for (const [field, datasetId, role, idField] of partitions) {
    const rows = Array.isArray(bundle[field]) ? bundle[field].filter(record) : [];
    for (const row of rows) {
      const id = text(row[idField]);
      if (!id) continue;
      const partsForRow = dateParts(recordDate(row, fallbackDate));
      add(role, datasetId, `datasets/${datasetId}/v1/year=${partsForRow.year}/month=${partsForRow.month}/${id}.json`, row, evidenceIds(row));
    }
  }

  add('research_bundle', DATASET.bundles, `datasets/${DATASET.bundles}/v1/${parts.year}/${parts.month}/${parts.day}/${runId}.json`, bundle, (Array.isArray(bundle.evidence) ? bundle.evidence.filter(record).map((item) => text(item?.evidence_id)).filter((value): value is string => Boolean(value)) : []));

  const derived = Array.isArray(bundle.derived) ? bundle.derived.filter(record) : [];
  if (derived.length) add('derived_intelligence', DATASET.intelligence, `datasets/${DATASET.intelligence}/v1/${parts.year}/${parts.month}/${parts.day}/${runId}.json`, derived, derived.flatMap(evidenceIds));
  return output;
}

function subjectRefs(kind: string, row: JsonRecord, bundle: JsonRecord): string[] {
  const refs = new Set<string>(stringArray(row.entity_ids));
  for (const key of ['entity_id', 'subject_entity_id', 'payer_entity_id', 'receiver_entity_id']) {
    const value = text(row[key]);
    if (value) refs.add(value);
  }
  if (kind === 'entity' && text(row.entity_id)) refs.add(String(row.entity_id));
  if (!refs.size) refs.add(`run:${text(bundle.run_id) || 'unknown'}`);
  return [...refs];
}

function journalText(row: JsonRecord): string | null {
  for (const key of ['text', 'statement', 'description', 'canonical_name', 'purpose']) {
    const value = text(row[key]);
    if (value) return value;
  }
  return null;
}

function journalEntries(bundle: JsonRecord): JsonRecord[] {
  const runId = text(bundle.run_id) || 'run_unknown';
  const recordedAt = text(bundle.retrieved_at) || new Date(0).toISOString();
  const groups: Array<[string, unknown]> = [
    ['entity', bundle.entities],
    ['claim', bundle.claims],
    ['metric', bundle.metrics],
    ['money_signal', bundle.money_signals],
    ['event', bundle.events],
    ['relationship', bundle.relationships],
    ['observation', bundle.observations],
  ];
  const entries: JsonRecord[] = [];
  for (const [kind, value] of groups) {
    if (!Array.isArray(value)) continue;
    value.filter(record).forEach((row, index) => {
      const recordId = text(row[`${kind === 'money_signal' ? 'money_signal' : kind}_id`]) || `${kind}-${index}`;
      const seed = `${runId}|${kind}|${recordId}|${JSON.stringify(row)}`;
      const hash = sha256Sync(seed);
      const evidence = evidenceIds(row);
      const origin = ['reported', 'observed', 'estimated', 'inferred', 'unknown'].includes(String(row.origin_type)) ? String(row.origin_type) : 'observed';
      const verification = ['SUPPORTED', 'CONFLICTED', 'UNVERIFIED', 'SUPERSEDED', 'RETRACTED'].includes(String(row.verification_status)) ? String(row.verification_status) : 'UNVERIFIED';
      const confidence = typeof row.confidence === 'number' && row.confidence >= 0 && row.confidence <= 1 ? row.confidence : 0.5;
      const observedAt = recordDate(row, recordedAt);
      const typeValue = text(row[`${kind === 'money_signal' ? 'money_signal' : kind}_type`]) || text(row.predicate) || 'general';
      entries.push({
        schema_version: 'journal-entry.v1',
        journal_id: `jr_${hash}`,
        subject_refs: subjectRefs(kind, row, bundle),
        observation_type: `foundation.${kind}.${safeType(typeValue)}`,
        payload_schema_ref: null,
        payload: row,
        text_original: journalText(row),
        origin_type: origin,
        verification_status: verification,
        confidence,
        source_availability: evidence.length ? 'source_backed' : 'source_not_yet_checked',
        valid_time: null,
        observed_at: observedAt,
        recorded_at: recordedAt,
        provenance: {
          run_id: runId,
          collector: text((bundle.agent as JsonRecord | undefined)?.name) || 'scheduled-r2-writer',
          collection_channel: text(row.collection_channel) || 'research_bundle',
          purpose: text(bundle.purpose) || 'make_money',
          source_ids: [],
          source_locator: null,
          parser_or_transform_version: 'scheduled-r2-writer.v1',
        },
        evidence_ids: evidence,
        supersedes: stringArray(row.supersedes),
        superseded_by: stringArray(row.superseded_by),
        typed_projection_refs: kind === 'observation' ? [] : [`${kind}:${recordId}`],
        rights_status: null,
        tags: [kind],
        notes: null,
      });
    });
  }
  return entries;
}

function journalObjects(bundle: JsonRecord, env: WriterEnv): PlannedCandidate[] {
  const runId = text(bundle.run_id) || 'run_unknown';
  const lake = bucketForRole(env, 'lake');
  return journalEntries(bundle).map((entry) => {
    const recordedAt = text(entry.recorded_at) || new Date(0).toISOString();
    const parts = dateParts(recordedAt);
    return {
      role: 'journal_entry',
      datasetId: DATASET.journal,
      bucketName: lake.name,
      bucket: lake.bucket,
      key: `journal/v1/${parts.year}/${parts.month}/${parts.day}/${entry.journal_id}.json`,
      body: new Uint8Array(),
      contentType: JSON_CONTENT_TYPE,
      sourceEvidenceIds: evidenceIds(entry),
      foundationRunId: runId,
      payload: entry,
    };
  });
}

function bundleEntityIds(bundle: JsonRecord): string[] {
  return [...new Set(
    (Array.isArray(bundle.entities) ? bundle.entities : [])
      .filter(record)
      .map((entity) => text(entity.entity_id))
      .filter((id): id is string => Boolean(id)),
  )].sort();
}

function newArrivalsObject(
  bundle: JsonRecord,
  env: WriterEnv,
  publication: { assignedAt: string; queuePath?: string | null },
): { candidate: PlannedCandidate; contribution: NewArrivalsContribution } | null {
  const entityIds = bundleEntityIds(bundle);
  if (!entityIds.length) return null;
  const runId = text(bundle.run_id) || 'run_unknown';
  const contribution = buildNewArrivalsContribution({
    queueRunId: runId,
    entityIds,
    assignedAt: publication.assignedAt,
    queuePath: publication.queuePath,
  });
  const lake = bucketForRole(env, 'lake');
  return {
    contribution,
    candidate: {
      role: 'new_arrivals_contribution',
      datasetId: DATASET.newArrivals,
      bucketName: lake.name,
      bucket: lake.bucket,
      key: newArrivalsContributionKey(contribution),
      contentType: JSON_CONTENT_TYPE,
      sourceEvidenceIds: [],
      foundationRunId: runId,
      payload: contribution,
    },
  };
}

async function plannedObjects(
  bundle: JsonRecord,
  env: WriterEnv,
  publication: { assignedAt: string; queuePath?: string | null },
): Promise<{ objects: PlannedObject[]; contribution: NewArrivalsContribution | null }> {
  const candidates = [
    ...typedObjects(bundle, env),
    ...journalObjects(bundle, env),
  ];
  const publicationObject = newArrivalsObject(bundle, env, publication);
  if (publicationObject) candidates.push(publicationObject.candidate);
  const output: PlannedObject[] = [];
  for (const candidate of candidates) {
    const { body, sha256, bytes } = await bodyFromJson(candidate.payload);
    output.push({ ...candidate, body, sha256, bytes });
  }
  return { objects: output, contribution: publicationObject?.contribution || null };
}

async function readBytes(object: R2ObjectLike): Promise<Uint8Array> {
  if (object.arrayBuffer) return new Uint8Array(await object.arrayBuffer());
  if (object.body) return new Uint8Array(await new Response(object.body).arrayBuffer());
  throw new Error('R2 object did not expose a readable body');
}

async function preflightAndWrite(objects: PlannedObject[], budget = { remaining: Infinity }): Promise<{ results: Array<JsonRecord>; provider_calls: ProviderCounts; readback_verified: number }> {
  const provider_calls: ProviderCounts = { head_bucket: 0, get_object: 0, put_object: 0 };
  const preflight: Array<{ object: PlannedObject; status: 'ABSENT' | 'EXISTS_IDENTICAL' }> = [];
  for (const object of objects) {
    if (budget.remaining < 1) throw new R2BudgetReached('R2 preflight budget exhausted');
    budget.remaining -= 1;
    provider_calls.get_object += 1;
    const existing = await object.bucket.get(object.key);
    if (!existing) {
      preflight.push({ object, status: 'ABSENT' });
      continue;
    }
    const current = await readBytes(existing);
    const currentHash = await sha256Hex(current);
    if (current.byteLength !== object.bytes || currentHash !== object.sha256) {
      throw new ImmutableObjectConflict({ bucket: object.bucketName, key: object.key,
        expected_sha256: object.sha256, observed_sha256: currentHash,
        expected_bytes: object.bytes, observed_bytes: current.byteLength });
    }
    preflight.push({ object, status: 'EXISTS_IDENTICAL' });
  }

  const results: JsonRecord[] = [];
  let readback_verified = 0;
  for (const item of preflight) {
    const object = item.object;
    if (item.status === 'ABSENT') {
      // Reserve the PUT and its immediate readback together. A later invocation
      // verifies existing immutable objects and resumes missing ones; never mark
      // the queue complete while only part of its objects have been written.
      if (budget.remaining < 2) throw new R2BudgetReached('R2 write budget exhausted; resume missing objects');
      budget.remaining -= 2;
      provider_calls.put_object += 1;
      const putResult = await object.bucket.put(object.key, object.body, {
        onlyIf: { etagDoesNotMatch: '*' },
        httpMetadata: { contentType: object.contentType },
        customMetadata: {
          'foundation-dataset-id': object.datasetId,
          'foundation-schema-version': object.role === 'journal_entry'
            ? 'journal-entry.v1'
            : object.role === 'new_arrivals_contribution'
              ? 'new-arrivals-contribution.v1'
              : 'research-bundle.v1',
          ...(object.foundationRunId ? { 'foundation-run-id': object.foundationRunId } : {}),
        },
      });
      if (!putResult) {
        throw new Error(`R2_CREATE_ONLY_REJECTED ${object.bucketName}/${object.key}`);
      }
    }
    if (item.status === 'ABSENT') {
      provider_calls.get_object += 1;
      const readbackObject = await object.bucket.get(object.key);
      if (!readbackObject) throw new Error(`R2_READBACK_MISSING ${object.bucketName}/${object.key}`);
      const readback = await readBytes(readbackObject);
      const readbackHash = await sha256Hex(readback);
      if (readback.byteLength !== object.bytes || readbackHash !== object.sha256) {
        throw new Error(`R2_READBACK_MISMATCH ${object.bucketName}/${object.key}`);
      }
    }
    readback_verified += 1;
    results.push({ role: object.role, dataset_id: object.datasetId, bucket: object.bucketName, key: object.key, status: item.status === 'ABSENT' ? 'CREATED' : 'EXISTS_IDENTICAL', bytes: object.bytes, sha256: object.sha256, source_evidence_ids: object.sourceEvidenceIds, readback: { bytes_match: true, sha256_match: true } });
  }
  return { results, provider_calls, readback_verified };
}

export function publicationAssignedAt(bundle: JsonRecord, queue?: ScheduledQueueRun): string {
  const timestamp = (queue && queueFinishedAt(queue)) || text(bundle.retrieved_at);
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) throw new Error('A stable source timestamp is required');
  return new Date(timestamp).toISOString();
}

// Large plans must make durable progress even when their preflight alone is
// bigger than an invocation. Checkpoints are immutable, content-addressed, and
// only written after every object in that chunk passed create-only readback.
export async function persistObjectChunks(objects: PlannedObject[], bucket: R2BucketLike, budget: { remaining: number }) {
  const planHash = await sha256Hex(new TextEncoder().encode(JSON.stringify(objects.map(o => [o.bucketName, o.key, o.bytes, o.sha256]))));
  const results: JsonRecord[] = [];
  const provider_calls: ProviderCounts = { head_bucket: 0, get_object: 0, put_object: 0 };
  let readback_verified = 0;
  for (let start = 0; start < objects.length; start += 100) {
    const chunk = objects.slice(start, start + 100);
    const key = `views/make-money/r2-writer-progress/v1/${planHash}/${start}.json`;
    if (budget.remaining < 1) throw new R2BudgetReached('R2 checkpoint read budget exhausted');
    budget.remaining--; provider_calls.get_object++;
    const saved = await bucket.get(key);
    let checkpoint: JsonRecord;
    if (saved) checkpoint = JSON.parse(new TextDecoder().decode(await readBytes(saved)));
    else {
      // Reserve a full chunk plus immutable checkpoint PUT/readback. Never
      // start work that cannot leave a durable continuation point.
      if (budget.remaining < chunk.length * 3 + 2) throw new R2BudgetReached('R2 chunk budget exhausted; resume at durable checkpoint');
      const written = await preflightAndWrite(chunk, budget);
      checkpoint = { schema_version: 'r2-writer-chunk.v1', plan_sha256: planHash, start, results: written.results };
      const body = new TextEncoder().encode(JSON.stringify(checkpoint));
      budget.remaining -= 2;
      provider_calls.get_object += written.provider_calls.get_object + 1;
      provider_calls.put_object += written.provider_calls.put_object + 1;
      await bucket.put(key, body, { onlyIf: { etagDoesNotMatch: '*' }, httpMetadata: { contentType: JSON_CONTENT_TYPE } });
      const readback = await bucket.get(key);
      if (!readback) throw new Error('R2 checkpoint readback missing');
      checkpoint = JSON.parse(new TextDecoder().decode(await readBytes(readback)));
    }
    const rows = Array.isArray(checkpoint.results) ? checkpoint.results : [];
    if (checkpoint.schema_version !== 'r2-writer-chunk.v1' || checkpoint.plan_sha256 !== planHash || checkpoint.start !== start || rows.length !== chunk.length ||
        rows.some((row, i) => !record(row) || row.key !== chunk[i].key || row.bucket !== chunk[i].bucketName || row.bytes !== chunk[i].bytes || row.sha256 !== chunk[i].sha256 ||
          !['CREATED','EXISTS_IDENTICAL'].includes(String(row.status)) || !record(row.readback) || row.readback.bytes_match !== true || row.readback.sha256_match !== true)) {
      throw new Error('R2 checkpoint integrity mismatch');
    }
    results.push(...rows as JsonRecord[]);
    readback_verified += rows.length;
  }
  return { results, provider_calls, readback_verified };
}

async function persistBundle(
  bundle: JsonRecord,
  env: WriterEnv,
  publication: { assignedAt?: string; queuePath?: string | null } = {},
) {
  const quality = record(bundle.quality) ? bundle.quality : null;
  if (bundle.schema_version !== 'research-bundle.v1' || !quality || quality.schema_validation !== 'PASS') {
    throw new Error('bundle must be research-bundle.v1 with quality.schema_validation=PASS');
  }
  const planned = await plannedObjects(bundle, env, {
    assignedAt: publication.assignedAt || publicationAssignedAt(bundle),
    queuePath: publication.queuePath,
  });
  const objects = planned.objects;
  if (!objects.length) throw new Error('bundle produced no R2 objects');
  const budget = r2Budgets.get(env);
  const writes = budget && objects.length > 200
    ? await persistObjectChunks(objects, env.FOUNDATION_R2_LAKE, budget)
    : await preflightAndWrite(objects, budget);
  return {
    planned: objects.length,
    created: writes.results.filter((item) => item.status === 'CREATED').length,
    exists_identical: writes.results.filter((item) => item.status === 'EXISTS_IDENTICAL').length,
    readback_verified: writes.readback_verified,
    provider_calls: writes.provider_calls,
    mutation_counts: { put_object: writes.results.filter((item) => item.status === 'CREATED').length, copy_object: 0, delete_object: 0, move: 0, rename: 0, overwrite: 0, legacy_universal: 0, bucket_or_config: 0 },
    objects: writes.results,
    new_arrivals: planned.contribution
      ? {
          release_id: planned.contribution.release_id,
          release_at: planned.contribution.release_at,
          entity_count: planned.contribution.entity_count,
          contribution_key: newArrivalsContributionKey(planned.contribution),
        }
      : null,
  };
}

/** Operator-only history recovery; normal writer conflict rejection is unchanged. */
export async function persistEntityEvidenceHistory(input: {
  bundle: JsonRecord; preservedCores: Array<{ entityId: string; sha256: string }>;
}, env: WriterEnv) {
  validateResearchBundle(input.bundle);
  const pins = new Map(input.preservedCores.map(pin => [pin.entityId, pin.sha256]));
  if (!pins.size || pins.size !== input.preservedCores.length || [...pins.values()].some(hash => !/^[a-f0-9]{64}$/.test(hash))) {
    throw new Error('Explicit unique immutable core hashes required');
  }
  const preserved: JsonRecord[] = [];
  const entities = typedObjects(input.bundle, env).filter(item => item.role === 'entity');
  for (const entity of entities) {
    const incoming = entity.payload as JsonRecord;
    const id = String(incoming.entity_id);
    const stored = await entity.bucket.get(entity.key);
    if (!stored) {
      if (pins.has(id)) throw new Error('Pinned immutable core missing');
      continue;
    }
    const bytes = await readBytes(stored);
    const hash = await sha256Hex(bytes);
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!record(value)) throw new Error('Invalid immutable entity core');
    assertEvidenceOnlyEntityHistory(value, incoming);
    const changed = JSON.stringify(value.evidence_ids) !== JSON.stringify(incoming.evidence_ids);
    if (changed && !pins.has(id)) throw new Error('Unreviewed immutable evidence conflict');
    if (pins.has(id) && pins.get(id) !== hash) throw new Error('Pinned immutable core hash mismatch');
    if (pins.has(id)) {
      pins.delete(id);
      preserved.push({ entity_id: id, key: entity.key, sha256: hash, bytes: bytes.byteLength,
        mode: 'IMMUTABLE_CORE_RETAINED', incoming_evidence_ids: incoming.evidence_ids,
        stored_evidence_ids: value.evidence_ids });
    }
  }
  if (pins.size) throw new Error('Pinned entity absent from history bundle');
  // The complete incoming observation survives in registered run-bundle and
  // Journal keys. Do not write any fixed typed entity/record key here.
  const candidates = [...typedObjects(input.bundle, env).filter(item => item.role === 'research_bundle'),
    ...journalObjects(input.bundle, env)];
  const objects: PlannedObject[] = [];
  for (const candidate of candidates) objects.push({ ...candidate, ...await bodyFromJson(candidate.payload) });
  const written = await preflightAndWrite(objects);
  return { mode: 'manual_bundle_journal_history_only', typed_objects_written: 0,
    planned: objects.length, created: written.results.filter(row => row.status === 'CREATED').length,
    exists_identical: written.results.filter(row => row.status === 'EXISTS_IDENTICAL').length,
    readback_verified: written.readback_verified, preserved_immutable_cores: preserved,
    objects: written.results, provider_calls: written.provider_calls };
}

/** Append a verified evidence-only correction; never rewrite typed seed objects. */
export async function persistEvidenceLinkCorrection(input: {
  originalKey: string; originalSha256: string; corrected: JsonRecord;
  correctionRunId: string; recordedAt: string;
}, env: WriterEnv) {
  if (!/^datasets\/ds\.business\.research-bundles\.derived\/v1\/\d{4}\/\d{2}\/\d{2}\/run_[A-Za-z0-9_.:-]+\.json$/.test(input.originalKey)) throw new Error('Invalid original bundle key');
  const stored = await env.FOUNDATION_R2_LAKE.get(input.originalKey);
  if (!stored) throw new Error('Original correction target missing');
  const originalBytes = await readBytes(stored);
  if (await sha256Hex(originalBytes) !== input.originalSha256) throw new Error('Original correction target hash mismatch');
  const original: unknown = JSON.parse(new TextDecoder().decode(originalBytes));
  if (!record(original) || original.run_id === input.correctionRunId) throw new Error('Correction requires a new run');
  validateEvidenceLinkCorrection(original, input.corrected);
  const lineage = `Evidence-link correction of ${input.originalKey}; original_sha256=${input.originalSha256}; immutable originals retained; only evidence associations corrected.`;
  const quality = record(input.corrected.quality) ? input.corrected.quality : {};
  const bundle = { ...input.corrected, run_id: input.correctionRunId, retrieved_at: input.recordedAt,
    quality: { ...quality, warnings: [...stringArray(quality.warnings), lineage] } };
  validateResearchBundle(bundle);
  const candidates = [
    ...typedObjects(bundle, env).filter((item) => item.role === 'research_bundle'),
    ...journalObjects(bundle, env).map((item) => ({ ...item,
      payload: { ...(item.payload as JsonRecord), supersedes: [`r2://foundation-lake/${input.originalKey}`], notes: lineage } })),
  ];
  const objects: PlannedObject[] = [];
  for (const candidate of candidates) objects.push({ ...candidate, ...await bodyFromJson(candidate.payload) });
  const result = await preflightAndWrite(objects);
  return { mode: 'append_only_evidence_link_correction', original_key: input.originalKey,
    original_sha256: input.originalSha256, correction_run_id: input.correctionRunId,
    planned: objects.length, readback_verified: result.readback_verified,
    created: result.results.filter((row) => row.status === 'CREATED').length,
    exists_identical: result.results.filter((row) => row.status === 'EXISTS_IDENTICAL').length,
    objects: result.results, provider_calls: result.provider_calls,
    mutation_counts: { put_object: result.results.filter((row) => row.status === 'CREATED').length, overwrite: 0, delete_object: 0, move: 0, copy_object: 0 },
    bundle };
}

function githubHeaders(env: WriterEnv): HeadersInit {
  if (!text(env.FOUNDATION_GITHUB_TOKEN)) throw new Error('FOUNDATION_GITHUB_TOKEN is not configured');
  return { Authorization: `Bearer ${env.FOUNDATION_GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'make-money-r2-writer' };
}

function repoName(env: WriterEnv): string {
  return text(env.FOUNDATION_GITHUB_REPO) || 'salve-de/universal-foundation';
}

function branchName(env: WriterEnv): string {
  return text(env.FOUNDATION_GITHUB_BRANCH) || 'automation-research';
}

function writerVersion(env: WriterEnv): string {
  return text(env.FOUNDATION_R2_WRITER_VERSION) || 'r2-writer.v1';
}

async function githubRequest(env: WriterEnv, path: string, init?: RequestInit): Promise<Response> {
  const session = githubSessions.get(env);
  if (session) {
    if (session.calls >= 40) throw new RequestBudgetReached('GitHub request budget reached; continue on next invocation');
    session.calls += 1;
  }
  return fetch(`${API_ROOT}${path}`, { ...init, headers: { ...githubHeaders(env), ...(init?.headers || {}) } });
}

async function githubJson<T>(env: WriterEnv, path: string): Promise<T> {
  const response = await githubRequest(env, path);
  if (!response.ok) throw new Error(`GitHub GET ${path} failed: ${response.status}`);
  return await response.json() as T;
}

async function readGithubJson<T>(env: WriterEnv, path: string): Promise<T | null> {
  const session = githubSessions.get(env);
  if (session?.cache.has(path)) return session.cache.get(path) as T | null;
  if (path.startsWith('staging/automation/receipts/r2_writer/') && session?.paths && !session.paths.has(path)) return null;
  const response = await githubRequest(env, `/repos/${repoName(env)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branchName(env))}`);
  if (response.status === 404) {
    if (session?.blobs?.has(path)) throw new Error(`GitHub snapshot changed during read: ${path}`);
    session?.cache.set(path, null); return null;
  }
  if (!response.ok) throw new Error(`GitHub content read failed: ${path} (${response.status})`);
  const payload = await response.json() as GithubContentResponse;
  const expectedBlob = session?.blobs?.get(path);
  if (expectedBlob && payload.sha !== expectedBlob) {
    throw new Error(`GitHub snapshot changed during read: ${path}`);
  }
  if (payload.encoding !== 'base64' || !payload.content) throw new Error(`GitHub content is not base64: ${path}`);
  const binary = atob(payload.content.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const raw = new TextDecoder().decode(bytes);
  try {
    const parsed = JSON.parse(raw) as T;
    session?.cache.set(path, parsed);
    return parsed;
  } catch (error) {
    throw new GithubJsonParseError(path, raw.trim() === '<REPLACE_ME>', error);
  }
}

function retryReceiptPath(baseReceipt: string, env: WriterEnv): string {
  const version = writerVersion(env).replace(/[^A-Za-z0-9._-]+/g, '_');
  return baseReceipt.replace(/-receipt\.json$/, `-retry-${version}-receipt.json`);
}

async function hydrateCandidateList(env: WriterEnv, value: unknown): Promise<unknown> {
  if (!Array.isArray(value)) return value;
  const hydrated = [];
  for (const candidate of value) {
    if (!record(candidate) || record(candidate.bundle)) {
      hydrated.push(candidate);
      continue;
    }
    const bundlePath = text(candidate.bundle_path);
    if (!bundlePath || !bundlePath.startsWith('staging/')) {
      hydrated.push(candidate);
      continue;
    }
    const bundle = await readGithubJson<JsonRecord>(env, bundlePath);
    hydrated.push(bundle ? { ...candidate, bundle } : candidate);
  }
  return hydrated;
}

export async function hydrateQueueCandidates(env: WriterEnv, queue: ScheduledQueueRun): Promise<ScheduledQueueRun> {
  const referenced: JsonRecord[] = [];
  const manifest = candidateArtifactManifest(queue);
  for (const { path, count } of manifest.entries) {
    const artifact = await readGithubJson<unknown>(env, path);
    const contents = record(artifact) && artifact.schema_version === 'research-bundle.v1' ? [artifact] : artifact;
    if (!Array.isArray(contents) || contents.length === 0 ||
        contents.some((bundle) => !record(bundle) || bundle.schema_version !== 'research-bundle.v1') ||
        (count !== undefined && count !== contents.length)) {
      throw new ScheduledHandoffMaterializationError(['Candidate artifact missing, invalid, or count mismatch']);
    }
    referenced.push(...contents.map((bundle) => ({ state: 'VALIDATED_FOR_R2_HANDOFF', bundle_path: path, bundle })));
  }
  if (manifest.expectedTotal !== undefined && manifest.expectedTotal !== referenced.length) {
    throw new ScheduledHandoffMaterializationError(['Candidate manifest total count mismatch']);
  }
  const existing = await hydrateCandidateList(env, queue.handoff_candidates);
  return {
    ...queue,
    handoff_candidates: [...(Array.isArray(existing) ? existing : []), ...referenced],
    existing_handoff_candidates: await hydrateCandidateList(env, queue.existing_handoff_candidates),
  };
}

async function githubTree(env: WriterEnv): Promise<string[]> {
  const response = await githubJson<GithubTreeResponse>(env, `/repos/${repoName(env)}/git/trees/${encodeURIComponent(branchName(env))}?recursive=1`);
  if (response.truncated) throw new Error('GitHub tree response was truncated; refusing to select an incomplete queue');
  const paths = (response.tree || []).filter((item) => item.type === 'blob' && typeof item.path === 'string').map((item) => item.path as string);
  const session = githubSessions.get(env);
  if (session) {
    session.paths = new Set(paths);
    session.blobs = new Map((response.tree || []).flatMap(item =>
      item.type === 'blob' && typeof item.path === 'string' && typeof item.sha === 'string'
        ? [[item.path, item.sha] as const] : []));
  }
  return paths;
}

function receiptPathForDate(runId: string, parts: { year: string; month: string; day: string }): string {
  return `staging/automation/receipts/r2_writer/${parts.year}/${parts.month}/${parts.day}/${runId}-receipt.json`;
}

function queueArtifactReceiptPath(queuePath: string): string | null {
  const match = queuePath.match(/^staging\/r2-queue\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)\.json$/);
  if (!match) return null;
  const runId = match[4].match(/(run_[A-Za-z0-9_.:-]+)$/)?.[1];
  if (!runId) return null;
  return receiptPathForDate(runId, { year: match[1], month: match[2], day: match[3] });
}

function legacyReceiptPath(queue: ScheduledQueueRun): string {
  const runId = queueRunId(queue) || 'unknown-run';
  const finishedAt = queueFinishedAt(queue) || queueStartedAt(queue) || new Date(0).toISOString();
  const parts = dateParts(finishedAt);
  return receiptPathForDate(runId, parts);
}

function receiptPath(queue: ScheduledQueueRun, queuePath?: string): string {
  const runId = queueRunId(queue) || 'unknown-run';
  const finishedAt = queueFinishedAt(queue);
  if (finishedAt) {
    try {
      return receiptPathForDate(runId, dateParts(finishedAt));
    } catch {
      // Fall through to the queue artifact's date when an old producer left
      // an invalid or empty finished_at field.
    }
  }
  const queueDate = queuePath?.match(/^staging\/r2-queue\/(\d{4})\/(\d{2})\/(\d{2})\//);
  if (queueDate) return receiptPathForDate(runId, { year: queueDate[1], month: queueDate[2], day: queueDate[3] });
  return legacyReceiptPath(queue);
}

async function writeGithubReceipt(env: WriterEnv, path: string, receipt: JsonRecord): Promise<void> {
  const encoded = btoa(unescape(encodeURIComponent(`${JSON.stringify(receipt, null, 2)}\n`)));
  const response = await githubRequest(env, `/repos/${repoName(env)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `r2-writer: receipt for ${text(receipt.queue_run_id) || 'queue run'}`, content: encoded, branch: branchName(env) }),
  });
  if (response.status === 409) {
    const existing = await readGithubJson<JsonRecord>(env, path);
    if (existing && ['SUCCESS', 'SKIPPED_NOT_READY', 'SKIPPED_PLACEHOLDER', 'AUDIT_CORRECTION_RECORDED'].includes(text(existing.status) || '') && text(existing.queue_run_id) === text(receipt.queue_run_id)) return;
  }
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`GitHub receipt write failed: ${response.status}${detail ? ` ${detail}` : ''}`);
  }
  const session = githubSessions.get(env);
  session?.paths?.add(path);
  session?.cache.set(path, receipt);
}

async function writeSkippedQueueReceipt(
  env: WriterEnv,
  queuePath: string,
  error: ScheduledHandoffMaterializationError,
): Promise<JsonRecord> {
  const queue = await readGithubJson<ScheduledQueueRun>(env, queuePath);
  if (!queue) throw new Error(`queue artifact disappeared while writing skip receipt: ${queuePath}`);
  const baseReceipt = receiptPath(queue, queuePath);
  const existing = await readGithubJson<JsonRecord>(env, baseReceipt);
  const receipt = retryReceiptPath(baseReceipt, env);
  const retryExisting = receipt === baseReceipt ? existing : await readGithubJson<JsonRecord>(env, receipt);
  if (retryExisting) return { status: 'ALREADY_RECEIPTED', queue_path: queuePath, queue_run_id: queueRunId(queue) };
  await writeGithubReceipt(env, receipt, {
    schema_version: 'r2-writer-receipt.v1',
    status: 'SKIPPED_NOT_READY',
    queue_run_id: queueRunId(queue),
    queue_path: queuePath,
    source_run_paths: [],
    writer_version: writerVersion(env),
    finished_at: new Date().toISOString(),
    materialization: {
      included_items: 0,
      skipped_items: 0,
      skipped_research_items: [],
      source_count: 0,
      evidence_count: 0,
      entity_count: 0,
      claim_count: 0,
      metric_count: 0,
      money_signal_count: 0,
      event_count: 0,
      relationship_count: 0,
      observation_count: 0,
      issues: error.issues,
    },
    r2: {
      planned: 0,
      created: 0,
      exists_identical: 0,
      conflicts: 0,
      readback_verified: 0,
      provider_calls: { head_bucket: 0, get_object: 0, put_object: 0 },
      mutation_counts: { put_object: 0, copy_object: 0, delete_object: 0, move: 0, rename: 0, overwrite: 0, legacy_universal: 0, bucket_or_config: 0 },
      objects: [],
      new_arrivals: null,
    },
  });
  return { status: 'SKIPPED_NOT_READY', queue_path: queuePath, queue_run_id: queueRunId(queue), receipt_path: receipt };
}

async function writePlaceholderQueueReceipt(env: WriterEnv, queuePath: string): Promise<JsonRecord> {
  const receipt = queueArtifactReceiptPath(queuePath);
  if (!receipt) throw new Error(`unable to derive placeholder receipt path: ${queuePath}`);
  const queueRunId = queuePath.match(/(run_[A-Za-z0-9_.:-]+)\.json$/)?.[1] || null;
  const existing = await readGithubJson<JsonRecord>(env, receipt);
  if (existing) return { status: 'ALREADY_RECEIPTED', queue_path: queuePath, queue_run_id: queueRunId };
  await writeGithubReceipt(env, receipt, {
    schema_version: 'r2-writer-receipt.v1',
    status: 'SKIPPED_PLACEHOLDER',
    queue_run_id: queueRunId,
    queue_path: queuePath,
    source_run_paths: [],
    writer_version: writerVersion(env),
    finished_at: new Date().toISOString(),
    materialization: { included_items: 0, skipped_items: 0, skipped_research_items: [], source_count: 0, evidence_count: 0, entity_count: 0, claim_count: 0, metric_count: 0, money_signal_count: 0, event_count: 0, relationship_count: 0, observation_count: 0, issues: ['queue artifact content is the exact <REPLACE_ME> placeholder'] },
    r2: { planned: 0, created: 0, exists_identical: 0, conflicts: 0, readback_verified: 0, provider_calls: { head_bucket: 0, get_object: 0, put_object: 0 }, mutation_counts: { put_object: 0, copy_object: 0, delete_object: 0, move: 0, rename: 0, overwrite: 0, legacy_universal: 0, bucket_or_config: 0 }, objects: [], new_arrivals: null },
  });
  return { status: 'SKIPPED_PLACEHOLDER', queue_path: queuePath, queue_run_id: queueRunId, receipt_path: receipt };
}

function queuePaths(paths: string[]): string[] {
  return paths.filter((path) => /^staging\/r2-queue\/\d{4}\/\d{2}\/\d{2}\/[^/]+\.json$/.test(path)).sort();
}

/**
 * Process the newest unprocessed artifact first, then walk from the oldest
 * artifact forward. This prevents a live hourly producer from starving an
 * older backlog while keeping the newest publication fresh.
 */
export function queueProcessingOrder(paths: string[], resumePaths: string[] = []): string[] {
  const ordered = queuePaths(paths);
  if (ordered.length < 2) return ordered;
  const newest = ordered[ordered.length - 1];
  const pending = ordered.filter(path => resumePaths.includes(path));
  return [...pending, ...[newest, ...ordered.slice(0, -1)].filter(path => !pending.includes(path))];
}

function pendingReceiptPath(base: string, env: WriterEnv): string {
  return retryReceiptPath(base, env).replace('-retry-', '-pending-');
}

async function markQueuePending(env: WriterEnv, queuePath: string): Promise<void> {
  const base = queueArtifactReceiptPath(queuePath);
  if (!base) throw new Error('Cannot identify pending queue');
  const path = pendingReceiptPath(base, env);
  if (githubSessions.get(env)?.paths?.has(path)) return;
  await writeGithubReceipt(env, path, { schema_version: 'r2-writer-progress.v1', status: 'PENDING', queue_path: queuePath,
    writer_version: writerVersion(env), recorded_at: new Date().toISOString() });
}

function tokenMatches(expected: string, supplied: string): boolean {
  if (!expected || expected.length !== supplied.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ supplied.charCodeAt(index);
  return difference === 0;
}

function conflictHoldPrefix(base: string, env: WriterEnv): string {
  return retryReceiptPath(base, env).replace(/-receipt\.json$/, '-hold-');
}

export async function prepareScheduledBundle(bundle: JsonRecord, env: WriterEnv): Promise<JsonRecord> {
  const signals = bundle.money_signals;
  if (!Array.isArray(signals) || !signals.some(row => record(row)
    && (!Object.hasOwn(row, 'unit') || !Object.hasOwn(row, 'amount_label')))) return bundle;
  const result = await prepareUnstoredMoneySignalDefaults(bundle, async key => {
    const budget = r2Budgets.get(env);
    if (budget) {
      if (budget.remaining < 1) throw new R2BudgetReached('R2 normalization read budget exhausted');
      budget.remaining--;
    }
    const stored = await env.FOUNDATION_R2_LAKE.get(key);
    return stored ? await readBytes(stored) : null;
  });
  if (result.status === 'PREPARED_UNSTORED_BUNDLE') return result.bundle;
  // Transform only incoming fields, never stored bytes. A replay can use the
  // prepared representation only if its complete bytes match the old canonical
  // exactly. Ordinary preflight then independently re-reads every object.
  const incoming = defaultIncomingMoneySignalFields(bundle).bundle;
  const bytes = jsonBytes(incoming);
  return bytes.byteLength === result.stored.byteLength && bytes.every((value, index) => value === result.stored[index])
    ? incoming : bundle;
}

// Fingerprint only the queue and files this hydration actually depends on.
// Unrelated commits or receipt writes must not reopen unchanged conflict holds.
async function queueInputFingerprint(env: WriterEnv, queue: ScheduledQueueRun): Promise<string> {
  const dependencies = new Set(sourceRunPaths(record(queue.input_snapshot) ? queue.input_snapshot : null));
  for (const entry of candidateArtifactManifest(queue).entries) dependencies.add(entry.path);
  for (const list of [queue.handoff_candidates, queue.existing_handoff_candidates]) {
    if (!Array.isArray(list)) continue;
    for (const candidate of list) {
      if (record(candidate) && !record(candidate.bundle)) {
        const path = text(candidate.bundle_path);
        if (path?.startsWith('staging/')) dependencies.add(path);
      }
    }
  }
  const versions: Array<[string, string]> = [];
  for (const path of [...dependencies].sort()) {
    const blob = githubSessions.get(env)?.blobs?.get(path);
    // Test/legacy trees can omit blob IDs; exact source JSON is the fallback,
    // never an inferred success or ignored read failure.
    versions.push([path, blob || await sha256Hex(jsonBytes(await readGithubJson<unknown>(env, path)))]);
  }
  return sha256Hex(jsonBytes({ queue, dependencies: versions }));
}

async function processQueuePath(env: WriterEnv, queuePath: string): Promise<JsonRecord> {
  const queue = await readGithubJson<ScheduledQueueRun>(env, queuePath);
  if (!queue) throw new Error(`queue artifact disappeared: ${queuePath}`);
  const baseReceipt = receiptPath(queue, queuePath);
  const legacyReceipt = legacyReceiptPath(queue);
  const currentReceipt = await readGithubJson<JsonRecord>(env, baseReceipt);
  if (currentReceipt && text(currentReceipt.status) === 'SUCCESS' && !record(currentReceipt.view_projection)) {
    return projectHistoricalReceipt(env, queuePath, baseReceipt, currentReceipt);
  }
  if (currentReceipt && text(currentReceipt.status) !== 'SKIPPED_NOT_READY') {
    // Promote even already-projected base receipts to a tree-visible marker.
    // Otherwise a long successful prefix consumes every invocation's budget.
    const marker = retryReceiptPath(baseReceipt, env);
    if (!await readGithubJson<JsonRecord>(env, marker)) await writeGithubReceipt(env, marker, currentReceipt);
    return { status: 'ALREADY_RECEIPTED', queue_path: queuePath, queue_run_id: queueRunId(queue) };
  }
  const receipt = retryReceiptPath(baseReceipt, env);
  const retryReceipt = receipt !== baseReceipt ? await readGithubJson<JsonRecord>(env, receipt) : null;
  if (retryReceipt) return { status: 'ALREADY_RECEIPTED', queue_path: queuePath, queue_run_id: queueRunId(queue) };
  const correctionTarget = auditCorrectionTarget(queue);
  if (correctionTarget) {
    const target = await readGithubJson<ScheduledQueueRun>(env, correctionTarget);
    if (!target) throw new ScheduledHandoffMaterializationError(['audit correction target is missing']);
    const corrections = validateAuditCorrection(queue, target);
    await writeGithubReceipt(env, receipt, {
      schema_version: 'r2-writer-receipt.v1', status: 'AUDIT_CORRECTION_RECORDED',
      queue_run_id: queueRunId(queue), queue_path: queuePath, writer_version: writerVersion(env),
      finished_at: new Date().toISOString(),
      audit_correction: { target_path: correctionTarget, target_run_id: queueRunId(target), corrections,
        effect: 'append-only audit counter correction; no source artifact or business data overwritten' },
      r2: { planned: 0, created: 0, exists_identical: 0, conflicts: 0, readback_verified: 0,
        provider_calls: { head_bucket: 0, get_object: 0, put_object: 0 },
        mutation_counts: { put_object: 0, copy_object: 0, delete_object: 0, move: 0, rename: 0, overwrite: 0, legacy_universal: 0, bucket_or_config: 0 },
        objects: [], new_arrivals: null },
    });
    return { status: 'AUDIT_CORRECTION_RECORDED', queue_path: queuePath, receipt_path: receipt };
  }
  const oldReceipt = legacyReceipt !== baseReceipt ? await readGithubJson<JsonRecord>(env, legacyReceipt) : null;
  if (oldReceipt && text(oldReceipt.status) !== 'SKIPPED_NOT_READY') {
    if (text(oldReceipt.status) === 'SUCCESS' && !record(oldReceipt.view_projection)) return projectHistoricalReceipt(env, queuePath, baseReceipt, oldReceipt);
    // Preserve the historical receipt but normalize its path for operators.
    await writeGithubReceipt(env, receipt, oldReceipt);
    return { status: 'ALREADY_RECEIPTED', queue_path: queuePath, queue_run_id: queueRunId(queue) };
  }

  const inputFingerprint = await queueInputFingerprint(env, queue);
  const holdPath = `${conflictHoldPrefix(baseReceipt, env)}${inputFingerprint}-receipt.json`;
  const priorHold = await readGithubJson<JsonRecord>(env, holdPath);
  if (priorHold) {
    const conflict = record(priorHold.conflict) ? priorHold.conflict : null;
    const heldR2 = record(priorHold.r2) ? priorHold.r2 : null;
    if (priorHold.schema_version !== 'r2-writer-receipt.v1' || priorHold.status !== 'HELD_IMMUTABLE_CONFLICT'
      || priorHold.queue_path !== queuePath || priorHold.queue_run_id !== queueRunId(queue)
      || priorHold.input_sha256 !== inputFingerprint || priorHold.writer_version !== writerVersion(env)
      || !conflict || !text(conflict.bucket) || !text(conflict.key)
      || !/^[a-f0-9]{64}$/.test(String(conflict.expected_sha256))
      || !/^[a-f0-9]{64}$/.test(String(conflict.observed_sha256))
      || conflict.expected_sha256 === conflict.observed_sha256
      || !Number.isSafeInteger(conflict.expected_bytes) || Number(conflict.expected_bytes) < 0
      || !Number.isSafeInteger(conflict.observed_bytes) || Number(conflict.observed_bytes) < 0
      || !heldR2 || heldR2.complete !== false || heldR2.created !== null || heldR2.readback_verified !== null
      || heldR2.conflicts !== 1 || heldR2.partial_writes_possible !== true) {
      throw new Error('Immutable conflict hold receipt integrity mismatch');
    }
    return { status: 'HELD_IMMUTABLE_CONFLICT', queue_path: queuePath, receipt_path: holdPath, already_held: true };
  }

  const snapshot = record(queue.input_snapshot) ? queue.input_snapshot : null;
  const candidatePaths = sourceRunPaths(snapshot);
  const sourceRuns: ScheduledSourceRun[] = [];
  for (const path of candidatePaths) {
    const sourceRun = await readGithubJson<ScheduledSourceRun>(env, path);
    if (sourceRun) sourceRuns.push({ ...sourceRun, __source_run_path: path });
  }
  const materialized = await materializeScheduledR2Handoff({
    queue: await hydrateQueueCandidates(env, queue),
    source_runs: sourceRuns,
    queue_path: queuePath,
    source_metadata_base_url: `https://github.com/${repoName(env)}/blob/${branchName(env)}`,
  });
  if (materialized.included_items === 0) throw new Error('no validated items were materialized for R2');
  materialized.bundle = await prepareScheduledBundle(materialized.bundle, env);
  const assignedAt = publicationAssignedAt(materialized.bundle, queue);
  let r2: Awaited<ReturnType<typeof persistBundle>>;
  try {
    r2 = await persistBundle(materialized.bundle, env, { assignedAt, queuePath });
  } catch (error) {
    // Only a successfully read and hashed immutable mismatch becomes a hold.
    // Authentication, connectivity, create-only races and readback failures
    // retain their normal failure/deferred behavior.
    if (!(error instanceof ImmutableObjectConflict)) throw error;
    await writeGithubReceipt(env, holdPath, {
      schema_version: 'r2-writer-receipt.v1', status: 'HELD_IMMUTABLE_CONFLICT',
      queue_run_id: queueRunId(queue), queue_path: queuePath, input_sha256: inputFingerprint,
      source_run_paths: candidatePaths, writer_version: writerVersion(env), finished_at: new Date().toISOString(),
      conflict: error.object,
      r2: { complete: false, created: null, readback_verified: null, conflicts: 1, objects: [], new_arrivals: null,
        partial_writes_possible: true,
        note: 'Earlier chunks or attempts may exist; this hold is not a successful save or proof of zero writes. Immutable originals and manual recovery are retained.' },
    });
    return { status: 'HELD_IMMUTABLE_CONFLICT', queue_path: queuePath, receipt_path: holdPath, already_held: false };
  }
  const projection = await projectBundleForUI(materialized.bundle, env);
  if (!projection.complete) return { status: 'DEFERRED_UI_PROJECTION', queue_path: queuePath, view_projection: projection };
  const receiptPayload: JsonRecord = {
    schema_version: 'r2-writer-receipt.v1',
    status: 'SUCCESS',
    queue_run_id: queueRunId(queue),
    queue_path: queuePath,
    source_run_paths: candidatePaths,
    writer_version: writerVersion(env),
    finished_at: new Date().toISOString(),
    view_projection: projection,
    materialization: {
      included_items: materialized.included_items,
      skipped_items: materialized.skipped_items,
      skipped_research_items: materialized.skipped_research_items,
      source_count: materialized.source_count,
      evidence_count: materialized.evidence_count,
      entity_count: materialized.entity_count,
      claim_count: materialized.claim_count,
      metric_count: materialized.metric_count,
      money_signal_count: materialized.money_signal_count,
      event_count: materialized.event_count,
      relationship_count: materialized.relationship_count,
      observation_count: materialized.observation_count,
    },
    r2: {
      planned: r2.planned,
      created: r2.created,
      exists_identical: r2.exists_identical,
      conflicts: 0,
      readback_verified: r2.readback_verified,
      provider_calls: r2.provider_calls,
      mutation_counts: r2.mutation_counts,
      objects: r2.objects,
      new_arrivals: r2.new_arrivals,
    },
  };
  await writeGithubReceipt(env, receipt, receiptPayload);
  return { status: 'SUCCESS', queue_path: queuePath, queue_run_id: queueRunId(queue), receipt_path: receipt, planned: r2.planned, created: r2.created, exists_identical: r2.exists_identical };
}

async function runWriter(env: WriterEnv): Promise<JsonRecord> {
  if (env.FOUNDATION_R2_WRITER_ENABLED !== 'true') return { status: 'DISABLED', reason: 'FOUNDATION_R2_WRITER_ENABLED is not true' };
  env = { ...env };
  githubSessions.set(env, { calls: 0, cache: new Map() });
  r2Budgets.set(env, { remaining: 900 });
  const tree = await githubTree(env);
  const paths = queueProcessingOrder(tree, queuePaths(tree).filter(path => {
    const base = queueArtifactReceiptPath(path);
    // Conflict holds are keyed by the current input fingerprint. Keep the
    // queue eligible so processQueuePath can re-fingerprint it: unchanged
    // inputs return the existing hold without R2 reads, while corrected queue
    // or dependency content gets a new fingerprint and is re-evaluated.
    return Boolean(base && tree.includes(pendingReceiptPath(base, env)) && !tree.includes(retryReceiptPath(base, env)));
  }));
  if (!paths.length) return { status: 'NO_QUEUE_ARTIFACT' };
  let skippedPlaceholderQueues = 0;
  let skippedInvalidQueues = 0;
  const skippedInvalidQueuePaths: string[] = [];
  let processedQueueRuns = 0;
  let processedAuditCorrections = 0;
  const processedQueuePaths: string[] = [];
  const heldConflictQueuePaths: string[] = [];
  for (const path of paths) {
    try {
      const artifactReceipt = queueArtifactReceiptPath(path);
      const runFile = artifactReceipt?.split('/').at(-1);
      const session = githubSessions.get(env);
      // A version-specific retry receipt already closes this attempt. Use
      // the authoritative tree instead of issuing repeated missing-file GETs.
      if (runFile && [...(session?.paths || [])].some((candidate) =>
        candidate.startsWith('staging/automation/receipts/r2_writer/') &&
        candidate.endsWith('/' + retryReceiptPath(runFile, env)))) continue;
      if (artifactReceipt) {
        const placeholderReceipt = await readGithubJson<JsonRecord>(env, artifactReceipt);
        if (placeholderReceipt && text(placeholderReceipt.status) === 'SKIPPED_PLACEHOLDER') {
          skippedPlaceholderQueues += 1;
          continue;
        }
      }
      const result = await processQueuePath(env, path);
      if (result.status === 'ALREADY_RECEIPTED') continue;
      if (result.status === 'HELD_IMMUTABLE_CONFLICT') {
        heldConflictQueuePaths.push(path);
        continue;
      }
      if (result.status === 'AUDIT_CORRECTION_RECORDED') {
        processedAuditCorrections += 1;
        continue;
      }
      if (result.status === 'SUCCESS') {
        processedQueueRuns += 1;
        processedQueuePaths.push(path);
        if (processedQueueRuns >= MAX_QUEUE_RUNS_PER_INVOCATION) {
          return {
            status: skippedInvalidQueues > 0 || heldConflictQueuePaths.length > 0 ? 'PARTIAL' : 'SUCCESS',
            held_conflict_queue_paths: heldConflictQueuePaths,
            processed_audit_corrections: processedAuditCorrections,
            processed_queue_runs: processedQueueRuns,
            processed_queue_paths: processedQueuePaths,
            queue_artifact_count: paths.length,
            skipped_placeholder_queues: skippedPlaceholderQueues,
            skipped_invalid_queues: skippedInvalidQueues,
            skipped_invalid_queue_paths: skippedInvalidQueuePaths,
          };
        }
        continue;
      }
      if (result.status === 'DEFERRED_UI_PROJECTION') await markQueuePending(env, path);
      return result;
    } catch (error) {
      if (error instanceof R2BudgetReached) {
        try { await markQueuePending(env, path); }
        catch (markerError) { if (!(markerError instanceof RequestBudgetReached)) throw markerError; }
        return { status: 'DEFERRED_R2_BUDGET', queue_path: path, processed_queue_runs: processedQueueRuns };
      }
      if (error instanceof RequestBudgetReached) return { status: 'DEFERRED_REQUEST_BUDGET', queue_path: path, processed_queue_runs: processedQueueRuns };
      if (error instanceof ScheduledHandoffMaterializationError) {
        try {
          await writeSkippedQueueReceipt(env, path, error);
          skippedInvalidQueues += 1;
          skippedInvalidQueuePaths.push(path);
          continue;
        } catch (receiptError) {
          if (receiptError instanceof RequestBudgetReached) return { status: 'DEFERRED_REQUEST_BUDGET', queue_path: path, processed_queue_runs: processedQueueRuns };
          const detail = receiptError instanceof Error ? receiptError.message : String(receiptError);
          console.error(JSON.stringify({ status: 'FAILED', queue_path: path, error: `unable to write SKIPPED_NOT_READY receipt: ${detail}` }));
          return { status: 'FAILED', queue_path: path, error: `unable to write SKIPPED_NOT_READY receipt: ${detail}` };
        }
      }
      if (error instanceof GithubJsonParseError && error.isPlaceholder && error.path === path) {
        skippedPlaceholderQueues += 1;
        try {
          await writePlaceholderQueueReceipt(env, path);
        } catch (receiptError) {
          const detail = receiptError instanceof Error ? receiptError.message : String(receiptError);
          console.error(JSON.stringify({ status: 'FAILED', queue_path: path, error: `unable to write SKIPPED_PLACEHOLDER receipt: ${detail}` }));
          return { status: 'FAILED', queue_path: path, error: `unable to write SKIPPED_PLACEHOLDER receipt: ${detail}` };
        }
        console.warn(JSON.stringify({ status: 'SKIPPED_PLACEHOLDER_QUEUE', queue_path: path }));
        continue;
      }
      console.error(JSON.stringify({ status: 'FAILED', queue_path: path, error: error instanceof Error ? error.message : String(error) }));
      return { status: 'FAILED', queue_path: path, error: error instanceof Error ? error.message : String(error) };
    }
  }
  return {
    status: heldConflictQueuePaths.length > 0 ? (processedQueueRuns > 0 ? 'PARTIAL' : 'HELD_IMMUTABLE_CONFLICT')
      : skippedInvalidQueues > 0 ? (processedQueueRuns > 0 ? 'PARTIAL' : 'SKIPPED_NOT_READY')
      : processedQueueRuns > 0 || processedAuditCorrections > 0 ? 'SUCCESS' : 'NO_UNPROCESSED_QUEUE',
    processed_audit_corrections: processedAuditCorrections,
    processed_queue_runs: processedQueueRuns,
    processed_queue_paths: processedQueuePaths,
    held_conflict_queue_paths: heldConflictQueuePaths,
    queue_artifact_count: paths.length,
    skipped_placeholder_queues: skippedPlaceholderQueues,
    skipped_invalid_queues: skippedInvalidQueues,
    skipped_invalid_queue_paths: skippedInvalidQueuePaths,
  };
}

const worker = {
  async fetch(request: Request, env: WriterEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return Response.json({ service: 'make-money-r2-writer', enabled: env.FOUNDATION_R2_WRITER_ENABLED === 'true', version: env.FOUNDATION_R2_WRITER_VERSION || 'r2-writer.v1' });
    }
    if (url.pathname === '/ingest' && request.method === 'POST') {
      const suppliedToken = request.headers.get('x-foundation-writer-token') || '';
      if (!env.FOUNDATION_WRITER_TOKEN || !tokenMatches(env.FOUNDATION_WRITER_TOKEN, suppliedToken)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (env.FOUNDATION_R2_WRITER_ENABLED !== 'true') return Response.json({ error: 'Writer is disabled' }, { status: 503 });
      try {
        const raw = await request.text();
        if (raw.length > 15 * 1024 * 1024) return Response.json({ error: 'Request body is too large' }, { status: 413 });
        const body = JSON.parse(raw) as JsonRecord;
        const candidate = record(body.request) ? body.request : body;
        if (candidate.write_authorized !== true || !record(candidate.bundle)) return Response.json({ error: 'write_authorized:true and bundle are required' }, { status: 422 });
        const r2 = await persistBundle(candidate.bundle, env);
        return Response.json({ success: true, writer_version: env.FOUNDATION_R2_WRITER_VERSION || 'r2-writer.v1', r2 });
      } catch (error) {
        console.error(JSON.stringify({ status: 'FAILED', error: error instanceof Error ? error.message : String(error) }));
        return Response.json({ error: error instanceof Error ? error.message : 'R2 writer failed' }, { status: 502 });
      }
    }
    return new Response('Not found', { status: 404 });
  },
  async scheduled(_controller: { scheduledTime: number; cron: string }, env: WriterEnv): Promise<void> {
    const result = await runWriter(env);
    console.log(JSON.stringify(result));
    if (result.status === 'FAILED') throw new Error(`scheduled R2 writer failed: ${text(result.error) || 'unknown error'}`);
  },
};

export default worker;

export { journalEntries, materializeScheduledR2Handoff, persistBundle, preflightAndWrite };
