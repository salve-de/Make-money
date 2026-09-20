import { materializeScheduledR2Handoff, ScheduledHandoffMaterializationError, type ScheduledQueueRun, type ScheduledSourceRun } from '../src/lib/foundation/scheduled-r2-handoff';
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
  return [value.path, value.source_run_path, value.run_path].flatMap(sourceRunPathValues);
}

export function sourceRunPaths(snapshot: JsonRecord | null): string[] {
  if (!snapshot) return [];
  const candidates = [
    ...sourceRunPathValues(snapshot.primary_source_runs_selected),
    ...sourceRunPathValues(snapshot.new_completed_heads_seen_before_cutoff),
    ...sourceRunPathValues(snapshot.selected_source_runs),
    ...sourceRunPathValues(snapshot.selected_source_run),
    ...sourceRunPathValues(snapshot.primary_source_run),
    ...sourceRunPathValues(snapshot.new_source_run_refs),
    ...sourceRunPathValues(snapshot.source_run_refs),
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
      const hash = seed.split('').reduce((acc, char) => (Math.imul(acc ^ char.charCodeAt(0), 0x01000193) >>> 0), 0x811c9dc5).toString(16).padStart(8, '0');
      const evidence = evidenceIds(row);
      const origin = ['reported', 'observed', 'estimated', 'inferred', 'unknown'].includes(String(row.origin_type)) ? String(row.origin_type) : 'observed';
      const verification = ['SUPPORTED', 'CONFLICTED', 'UNVERIFIED', 'SUPERSEDED', 'RETRACTED'].includes(String(row.verification_status)) ? String(row.verification_status) : 'UNVERIFIED';
      const confidence = typeof row.confidence === 'number' && row.confidence >= 0 && row.confidence <= 1 ? row.confidence : 0.5;
      const observedAt = recordDate(row, recordedAt);
      const typeValue = text(row[`${kind === 'money_signal' ? 'money_signal' : kind}_type`]) || text(row.predicate) || 'general';
      entries.push({
        schema_version: 'journal-entry.v1',
        journal_id: `jr_${hash.repeat(3).slice(0, 24)}`,
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

async function preflightAndWrite(objects: PlannedObject[]): Promise<{ results: Array<JsonRecord>; provider_calls: ProviderCounts; readback_verified: number }> {
  const provider_calls: ProviderCounts = { head_bucket: 0, get_object: 0, put_object: 0 };
  const preflight: Array<{ object: PlannedObject; status: 'ABSENT' | 'EXISTS_IDENTICAL' }> = [];
  for (const object of objects) {
    provider_calls.head_bucket += 1;
    const existing = await object.bucket.head(object.key);
    if (!existing) {
      preflight.push({ object, status: 'ABSENT' });
      continue;
    }
    provider_calls.get_object += 1;
    const existingBody = await object.bucket.get(object.key);
    if (!existingBody) throw new Error(`R2_PREFLIGHT_READ_MISSING ${object.bucketName}/${object.key}`);
    const current = await readBytes(existingBody);
    const currentHash = await sha256Hex(current);
    if (current.byteLength !== object.bytes || currentHash !== object.sha256) {
      throw new Error(`R2_OBJECT_CONFLICT ${object.bucketName}/${object.key}`);
    }
    preflight.push({ object, status: 'EXISTS_IDENTICAL' });
  }

  const results: JsonRecord[] = [];
  let readback_verified = 0;
  for (const item of preflight) {
    const object = item.object;
    if (item.status === 'ABSENT') {
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
    provider_calls.get_object += 1;
    const readbackObject = await object.bucket.get(object.key);
    if (!readbackObject) throw new Error(`R2_READBACK_MISSING ${object.bucketName}/${object.key}`);
    const readback = await readBytes(readbackObject);
    const readbackHash = await sha256Hex(readback);
    if (readback.byteLength !== object.bytes || readbackHash !== object.sha256) {
      throw new Error(`R2_READBACK_MISMATCH ${object.bucketName}/${object.key}`);
    }
    readback_verified += 1;
    results.push({ role: object.role, dataset_id: object.datasetId, bucket: object.bucketName, key: object.key, status: item.status === 'ABSENT' ? 'CREATED' : 'EXISTS_IDENTICAL', bytes: object.bytes, sha256: object.sha256, source_evidence_ids: object.sourceEvidenceIds, readback: { bytes_match: true, sha256_match: true } });
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
    assignedAt: publication.assignedAt || new Date().toISOString(),
    queuePath: publication.queuePath,
  });
  const objects = planned.objects;
  if (!objects.length) throw new Error('bundle produced no R2 objects');
  const writes = await preflightAndWrite(objects);
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
  return fetch(`${API_ROOT}${path}`, { ...init, headers: { ...githubHeaders(env), ...(init?.headers || {}) } });
}

async function githubJson<T>(env: WriterEnv, path: string): Promise<T> {
  const response = await githubRequest(env, path);
  if (!response.ok) throw new Error(`GitHub GET ${path} failed: ${response.status}`);
  return await response.json() as T;
}

async function readGithubJson<T>(env: WriterEnv, path: string): Promise<T | null> {
  const response = await githubRequest(env, `/repos/${repoName(env)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branchName(env))}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub content read failed: ${path} (${response.status})`);
  const payload = await response.json() as GithubContentResponse;
  if (payload.encoding !== 'base64' || !payload.content) throw new Error(`GitHub content is not base64: ${path}`);
  const binary = atob(payload.content.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const raw = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(raw) as T;
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

async function hydrateQueueCandidates(env: WriterEnv, queue: ScheduledQueueRun): Promise<ScheduledQueueRun> {
  return {
    ...queue,
    handoff_candidates: await hydrateCandidateList(env, queue.handoff_candidates),
    existing_handoff_candidates: await hydrateCandidateList(env, queue.existing_handoff_candidates),
  };
}

async function githubTree(env: WriterEnv): Promise<string[]> {
  const response = await githubJson<GithubTreeResponse>(env, `/repos/${repoName(env)}/git/trees/${encodeURIComponent(branchName(env))}?recursive=1`);
  if (response.truncated) throw new Error('GitHub tree response was truncated; refusing to select an incomplete queue');
  return (response.tree || []).filter((item) => item.type === 'blob' && typeof item.path === 'string').map((item) => item.path as string);
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
    if (existing && ['SUCCESS', 'SKIPPED_NOT_READY', 'SKIPPED_PLACEHOLDER'].includes(text(existing.status) || '') && text(existing.queue_run_id) === text(receipt.queue_run_id)) return;
  }
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`GitHub receipt write failed: ${response.status}${detail ? ` ${detail}` : ''}`);
  }
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
  const receipt = existing && text(existing.status) === 'SKIPPED_NOT_READY' ? retryReceiptPath(baseReceipt, env) : baseReceipt;
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
export function queueProcessingOrder(paths: string[]): string[] {
  const ordered = queuePaths(paths);
  if (ordered.length < 2) return ordered;
  const newest = ordered[ordered.length - 1];
  return [newest, ...ordered.slice(0, -1)];
}

function tokenMatches(expected: string, supplied: string): boolean {
  if (!expected || expected.length !== supplied.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ supplied.charCodeAt(index);
  return difference === 0;
}

async function processQueuePath(env: WriterEnv, queuePath: string): Promise<JsonRecord> {
  const queue = await readGithubJson<ScheduledQueueRun>(env, queuePath);
  if (!queue) throw new Error(`queue artifact disappeared: ${queuePath}`);
  const baseReceipt = receiptPath(queue, queuePath);
  const legacyReceipt = legacyReceiptPath(queue);
  const currentReceipt = await readGithubJson<JsonRecord>(env, baseReceipt);
  if (currentReceipt && text(currentReceipt.status) !== 'SKIPPED_NOT_READY') return { status: 'ALREADY_RECEIPTED', queue_path: queuePath, queue_run_id: queueRunId(queue) };
  const receipt = currentReceipt && text(currentReceipt.status) === 'SKIPPED_NOT_READY'
    ? retryReceiptPath(baseReceipt, env)
    : baseReceipt;
  const retryReceipt = receipt !== baseReceipt ? await readGithubJson<JsonRecord>(env, receipt) : null;
  if (retryReceipt) return { status: 'ALREADY_RECEIPTED', queue_path: queuePath, queue_run_id: queueRunId(queue) };
  const oldReceipt = legacyReceipt !== baseReceipt ? await readGithubJson<JsonRecord>(env, legacyReceipt) : null;
  if (oldReceipt) {
    // Preserve the historical receipt but normalize its path for operators.
    await writeGithubReceipt(env, receipt, oldReceipt);
    return { status: 'ALREADY_RECEIPTED', queue_path: queuePath, queue_run_id: queueRunId(queue) };
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
  const assignedAt = new Date().toISOString();
  const r2 = await persistBundle(materialized.bundle, env, { assignedAt, queuePath });
  const receiptPayload: JsonRecord = {
    schema_version: 'r2-writer-receipt.v1',
    status: 'SUCCESS',
    queue_run_id: queueRunId(queue),
    queue_path: queuePath,
    source_run_paths: candidatePaths,
    writer_version: writerVersion(env),
    finished_at: new Date().toISOString(),
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
  const paths = queueProcessingOrder(await githubTree(env));
  if (!paths.length) return { status: 'NO_QUEUE_ARTIFACT' };
  let skippedPlaceholderQueues = 0;
  let skippedInvalidQueues = 0;
  const skippedInvalidQueuePaths: string[] = [];
  let processedQueueRuns = 0;
  const processedQueuePaths: string[] = [];
  for (const path of paths) {
    try {
      const artifactReceipt = queueArtifactReceiptPath(path);
      if (artifactReceipt) {
        const placeholderReceipt = await readGithubJson<JsonRecord>(env, artifactReceipt);
        if (placeholderReceipt && text(placeholderReceipt.status) === 'SKIPPED_PLACEHOLDER') {
          skippedPlaceholderQueues += 1;
          continue;
        }
      }
      const result = await processQueuePath(env, path);
      if (result.status === 'ALREADY_RECEIPTED') continue;
      if (result.status === 'SUCCESS') {
        processedQueueRuns += 1;
        processedQueuePaths.push(path);
        if (processedQueueRuns >= MAX_QUEUE_RUNS_PER_INVOCATION) {
          return {
            status: 'SUCCESS',
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
      return result;
    } catch (error) {
      if (error instanceof ScheduledHandoffMaterializationError) {
        try {
          await writeSkippedQueueReceipt(env, path, error);
          skippedInvalidQueues += 1;
          skippedInvalidQueuePaths.push(path);
          continue;
        } catch (receiptError) {
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
    status: processedQueueRuns > 0 || skippedInvalidQueues > 0 ? 'SUCCESS' : 'NO_UNPROCESSED_QUEUE',
    processed_queue_runs: processedQueueRuns,
    processed_queue_paths: processedQueuePaths,
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

export { journalEntries, materializeScheduledR2Handoff };
