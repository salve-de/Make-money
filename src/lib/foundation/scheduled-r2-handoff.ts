/**
 * Turns the scheduled-collection R2_QUEUE staging shape into the canonical
 * research-bundle.v1 shape.
 *
 * This module is deliberately provider-neutral. It does not write GitHub or
 * R2; the writer is responsible for authorization, preflight, create-only
 * persistence, readback, and receipt publication.
 */

type JsonRecord = Record<string, unknown>;

import { DIMENSIONS } from './coverage';

const VERIFICATION_STATUSES = new Set(['SUPPORTED', 'CONFLICTED', 'UNVERIFIED', 'SUPERSEDED', 'RETRACTED']);
const SOURCE_STRENGTHS = new Set(['S', 'A', 'B', 'C', 'D', 'E', 'F', 'UNRATED']);
const RIGHTS_STATUSES = new Set(['allowed_private_raw', 'restricted_private_raw', 'metadata_only', 'blocked', 'pending_review']);

export interface ScheduledQueueRun extends JsonRecord {
  schema_version?: unknown;
  run_id?: unknown;
  automation?: JsonRecord;
  final_status?: unknown;
  state?: unknown;
  queue_state?: unknown;
  started_at?: unknown;
  finished_at?: unknown;
  input_snapshot?: JsonRecord;
  handoff_candidates?: unknown;
  existing_handoff_candidates?: unknown;
  recorded_items?: unknown;
  warnings?: unknown;
  errors?: unknown;
  coverage?: JsonRecord;
  throughput?: JsonRecord;
}

export interface ScheduledSourceRun extends JsonRecord {
  source_attempts?: unknown;
  recorded_items?: unknown;
  run_id?: unknown;
  finished_at?: unknown;
}

export interface ScheduledHandoffInput {
  queue: ScheduledQueueRun;
  source_runs: ScheduledSourceRun[];
  queue_path?: string | null;
  /**
   * GitHub blob URL prefix used when a collector gives us a source reference
   * (for example `web:turn...`) instead of an HTTP URL.  The canonical schema
   * requires URLs, so we point at the immutable staging metadata and retain
   * the original locator in access_notes.
   */
  source_metadata_base_url?: string | null;
}

export interface ScheduledHandoffResult {
  bundle: JsonRecord;
  included_items: number;
  skipped_items: number;
  skipped_research_items: string[];
  source_count: number;
  evidence_count: number;
  entity_count: number;
  claim_count: number;
  metric_count: number;
  money_signal_count: number;
  event_count: number;
  relationship_count: number;
  observation_count: number;
}

export class ScheduledHandoffMaterializationError extends Error {
  readonly code = 'SCHEDULED_HANDOFF_INVALID';

  constructor(readonly issues: string[]) {
    super(`scheduled R2 handoff materialization failed: ${issues.join('; ')}`);
    this.name = 'ScheduledHandoffMaterializationError';
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function queueAutomationValue(queue: ScheduledQueueRun, key: string): unknown {
  return isRecord(queue.automation) ? queue.automation[key] : undefined;
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

function firstText(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = firstText(item);
      if (candidate) return candidate;
    }
    return null;
  }
  return text(value);
}

function arrayOfRecords(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function structuredText(value: unknown, key: string): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => structuredText(item, key));
  return isRecord(value) ? stringValues(value[key]) : stringValues(value);
}

function rowName(row: JsonRecord, sourceRecords: JsonRecord[] = []): string | null {
  const explicit = firstText(row.name) || firstText(row.subject) || firstText(row.subject_or_entity_id);
  if (explicit) return explicit;
  const entities = isRecord(row.Entity) ? [row.Entity] : arrayOfRecords(row.Entity);
  const sourceId = text(row.source_entity_id);
  const matchingRecords = sourceId ? sourceRecords.filter((record) => record.entity_id === sourceId) : [];
  if (matchingRecords.length === 1 && isRecord(matchingRecords[0].identity)) {
    const canonicalName = text(matchingRecords[0].identity.canonical_name);
    if (canonicalName) return canonicalName;
  }
  const subject = sourceId ? entities.find((entity) => entity.id === sourceId || entity.entity_id === sourceId)
      || (entities.length === 1 && !text(entities[0].id) && !text(entities[0].entity_id) ? entities[0] : undefined)
    : entities.length === 1 ? entities[0] : undefined;
  return subject ? text(subject.name) || text(subject.canonical_name) : null;
}

function isDateTime(value: unknown): value is string {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value));
}

function asDateTime(value: unknown, fallback: string): string {
  if (isDateTime(value)) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    return `${value}T00:00:00.000Z`;
  }
  return fallback;
}

function extractDate(value: unknown, fallback: string): string {
  const match = typeof value === 'string' ? value.match(/\b(\d{4}-\d{2}-\d{2})\b/) : null;
  return asDateTime(match?.[1], fallback);
}

function queueRows(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];

  const columns = Array.isArray(value.columns)
    ? value.columns.filter((column): column is string => typeof column === 'string')
    : [];
  if (Array.isArray(value.rows)) {
    return value.rows.map((row) => {
      if (isRecord(row)) return row;
      if (!Array.isArray(row)) return {};
      return Object.fromEntries(columns.map((column, index) => [column, row[index] ?? null]));
    }).filter((row) => Object.keys(row).length > 0);
  }

  return Object.values(value).filter(isRecord);
}

function stableHashFallback(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + index), 0x85ebca6b);
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}${(first ^ second >>> 0).toString(16).padStart(8, '0')}`;
}

async function sha256(value: string): Promise<string> {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.subtle) {
    const bytes = new TextEncoder().encode(value);
    const digest = await cryptoApi.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return stableHashFallback(value).repeat(4).slice(0, 64);
}

async function id(prefix: string, seed: string, length: number): Promise<string> {
  return `${prefix}${(await sha256(seed)).slice(0, length)}`;
}

function safeSlug(value: string, fallback: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24);
  return slug || fallback;
}

function sourceStrength(value: unknown): string {
  const candidate = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return SOURCE_STRENGTHS.has(candidate) ? candidate : 'UNRATED';
}

function qualityInfo(value: unknown, fallbackStrength: string): {
  verification_status: string;
  confidence: number;
  source_strength: string;
  notes: string[];
} {
  const parts = typeof value === 'string' ? value.split('|').map((part) => part.trim()).filter(Boolean) : [];
  const structuredStatus = isRecord(value) && (text(value.verification) || text(value.verification_status));
  const status = structuredStatus && VERIFICATION_STATUSES.has(structuredStatus)
    ? structuredStatus
    : parts[0] && VERIFICATION_STATUSES.has(parts[0])
      ? parts[0]
      : isRecord(value) && text(value.handoff) === 'PASS'
        ? 'SUPPORTED'
        : 'UNVERIFIED';
  const strength = sourceStrength(parts[1] || (isRecord(value) ? firstText(value.source_strength) : null) || fallbackStrength);
  const confidenceByStrength: Record<string, number> = { S: 0.99, A: 0.95, B: 0.85, C: 0.65, D: 0.5, E: 0.35, F: 0.2, UNRATED: 0.4 };
  const confidence = status === 'SUPPORTED' ? confidenceByStrength[strength] : Math.min(0.5, confidenceByStrength[strength]);
  return { verification_status: status, confidence, source_strength: strength, notes: parts.slice(2) };
}

function evidenceIds(value: unknown): string[] {
  if (Array.isArray(value)) return [...new Set(value.flatMap((item) => evidenceIds(item)))];
  if (typeof value === 'string') return [...new Set(value.match(/ev_[a-f0-9]{24}/g) || [])];
  return [];
}

function stringValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(stringValues);
  const valueText = text(value);
  return valueText ? [valueText] : [];
}

function sourceLocatorValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(sourceLocatorValues);
  if (!isRecord(value)) return stringValues(value);
  return [value.url, value.url_or_source_id, value.source_url, value.source_ref, value.locator]
    .map((candidate) => text(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));
}

function sourceAttemptRecords(sourceRuns: ScheduledSourceRun[]): JsonRecord[] {
  return sourceRuns.flatMap((run, runIndex) => (Array.isArray(run.source_attempts) ? run.source_attempts : []).flatMap((attempt, attemptIndex) => isRecord(attempt) ? [{
    ...attempt,
    __source_run_index: runIndex,
    __source_attempt_index: attemptIndex,
    __source_run_path: text(run.__source_run_path),
  }] : []));
}

function sourceRecordRecords(sourceRuns: ScheduledSourceRun[]): JsonRecord[] {
  return sourceRuns.flatMap((run) => queueRows(run.recorded_items));
}

function attemptForEvidence(attempts: JsonRecord[], evidenceId: string): JsonRecord | null {
  return attempts.find((attempt) => evidenceIds(attempt.evidence_ids_if_any).includes(evidenceId)) || null;
}

function sourceRecordForEvidence(records: JsonRecord[], evidenceId: string): JsonRecord | null {
  return records.find((record) => evidenceIds(record.evidence_ids).includes(evidenceId)) || null;
}

function recordReferenceValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(recordReferenceValues);
  if (!isRecord(value)) return stringValues(value);
  return [
    value.id,
    value.entity_id,
    value.subject_or_entity_id,
    value.record_id_if_assigned,
    value.name,
    value.canonical_name,
    value.aliases,
    value.subject,
  ].flatMap(stringValues);
}

function normalizedReference(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function sourceRecordMatchesRow(record: JsonRecord, row: JsonRecord): boolean {
  const sourceReferences = recordReferenceValues(record).map(normalizedReference);
  const rowReferences = [
    ...recordReferenceValues(row.Entity),
    ...recordReferenceValues(row.entity),
    ...recordReferenceValues(row.subject),
    ...recordReferenceValues(row.name),
    ...recordReferenceValues(row.subject_or_entity_id),
  ].map(normalizedReference);
  return rowReferences.some((reference) => sourceReferences.includes(reference));
}

function attemptsForRow(attempts: JsonRecord[], records: JsonRecord[], row: JsonRecord): JsonRecord[] {
  const indexes = stringValues(row.Source).flatMap((value) =>
    [...value.matchAll(/(?:^|\|)source_attempts\[(\d+)\](?=\||$)/g)].map((match) => Number(match[1])));
  if (indexes.length > 0) {
    // An array index is meaningful only within one source run. Never guess
    // which run was intended when several runs supplied attempts.
    if (new Set(attempts.map((attempt) => attempt.__source_run_index)).size !== 1) return [];
    const selected = attempts.filter((attempt) => indexes.includes(Number(attempt.__source_attempt_index)));
    return selected.length === new Set(indexes).size && selected.every(attemptSucceeded) ? selected : [];
  }
  const directMatches = attempts.filter((attempt) => attemptMatchesRow(attempt, row));
  if (directMatches.length > 0) return directMatches;

  // Older collection lanes kept a generic "source-run bundle" marker in the
  // queue row instead of copying the concrete URL. Recover the concrete
  // locator through the matching source-run record and its evidence IDs.
  const matchedRecords = records.filter((record) => sourceRecordMatchesRow(record, row));
  const sourceEvidenceIds = new Set(matchedRecords.flatMap((record) => stringValues(record.evidence_ids)));
  const sourceRefs = new Set(matchedRecords.flatMap((record) => stringValues(record.source_refs)));
  if (sourceEvidenceIds.size === 0 && sourceRefs.size === 0) return [];
  return attempts.filter((attempt) =>
    attemptSucceeded(attempt) &&
    (stringValues(attempt.evidence_ids_if_any).some((evidenceId) => sourceEvidenceIds.has(evidenceId))
      || stringValues(attempt.source_ref).some((ref) => sourceRefs.has(ref))),
  );
}

function sourceLocator(attempt: JsonRecord): string | null {
  return text(attempt.url_or_source_id) || text(attempt.source_url) || text(attempt.source_ref) || text(attempt.url);
}

function normalizedSourceReference(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  return raw.split('|')[0]?.split(';')[0]?.trim() || null;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function attemptSucceeded(attempt: JsonRecord): boolean {
  const status = text(attempt.result) || text(attempt.status) || text(attempt.state);
  // USABLE is the structured collector's metadata-evidence outcome; it
  // does not imply that raw source bytes were fetched or persisted.
  return status ? new Set(['success', 'retained', 'success_metadata_extract', 'success_via_search_result_after_direct_open_error']).has(status.toLowerCase())
    : text(attempt.attempt_result) === 'USABLE';
}

function attemptMatchesRow(attempt: JsonRecord, row: JsonRecord): boolean {
  if (!attemptSucceeded(attempt)) return false;
  const rowReferences = sourceLocatorValues(row.Source)
    .map(normalizedSourceReference)
    .filter((value): value is string => Boolean(value));
  if (rowReferences.length === 0) {
    const subjectId = text(row.source_entity_id);
    return Boolean(subjectId && text(attempt.entity_id) === subjectId && sourceLocator(attempt));
  }
  const locator = sourceLocator(attempt);
  const normalizedLocator = normalizedSourceReference(locator);
  return Boolean(normalizedLocator && rowReferences.includes(normalizedLocator));
}

function providerName(locator: string): string {
  if (isHttpUrl(locator)) return new URL(locator).hostname.toLowerCase();
  const provider = locator.split(':', 1)[0]?.trim().toLowerCase().replace(/[^a-z0-9.-]/g, '-');
  return provider || 'scheduled-source';
}

async function canonicalUrlForLocator(
  locator: string,
  attempt: JsonRecord,
  metadataBaseUrl?: string | null,
): Promise<string> {
  if (isHttpUrl(locator)) return locator;
  const base = (metadataBaseUrl || 'https://github.com/salve-de/universal-foundation/blob/automation-research').replace(/\/+$/, '');
  const sourceRunPath = text(attempt.__source_run_path) || 'staging/automation/source-runs/unknown.json';
  const locatorHash = (await sha256(locator)).slice(0, 16);
  return `${base}/${sourceRunPath.replace(/^\/+/, '')}#source-${locatorHash}`;
}

function sourceIdForLocator(locator: string, cache: Map<string, string>): Promise<string> {
  const existing = cache.get(locator);
  if (existing) return Promise.resolve(existing);
  return (async () => {
    const host = isHttpUrl(locator)
      ? new URL(locator).hostname.toLowerCase().replace(/^www\./, '').replace(/[^a-z0-9.-]/g, '-')
      : providerName(locator);
    const result = `src.${host || 'unknown'}.${(await sha256(locator)).slice(0, 8)}`;
    cache.set(locator, result);
    return result;
  })();
}

function parsedEntitySpec(value: unknown): { entityType: string; aliases: string[] } {
  const raw = firstText(value) || 'company';
  const [type, ...parts] = raw.split('|');
  if (type?.startsWith('ent_')) {
    return { entityType: safeSlug(type.split('_')[1] || 'company', 'company'), aliases: parts.filter(Boolean) };
  }
  const aliases = parts.map((part) => part.replace(/^[^:]+:/, '').trim()).filter(Boolean);
  return { entityType: safeSlug(type || 'company', 'company'), aliases };
}

function parsedPair(value: unknown, fallbackType: string): { type: string; detail: string } | null {
  const raw = firstText(value);
  if (!raw) return null;
  const separator = raw.search(/[=:≈]/);
  if (separator < 1) return { type: safeSlug(raw, fallbackType), detail: raw };
  return { type: safeSlug(raw.slice(0, separator), fallbackType), detail: raw };
}

function observedSummary(row: JsonRecord, sourceRecord: JsonRecord | null): string {
  return firstText(sourceRecord?.short_summary) || firstText(row.Observation) || firstText(row.Claim)
    || structuredText(row.Evidence, 'summary').join('\n') || `Staged observation for ${rowName(row) || 'unknown subject'}`;
}

function rowSnapshot(row: JsonRecord): string {
  return `scheduled_r2_queue_row=${JSON.stringify(row)}`;
}

function warningStrings(queue: ScheduledQueueRun): string[] {
  return arrayOfStrings(queue.warnings);
}

function coverageReferences(field: string, length: number): string[] {
  return Array.from({ length }, (_, index) => `${field}/${index}`);
}

function buildCollectionCoverage(
  entities: JsonRecord[],
  claims: JsonRecord[],
  metrics: JsonRecord[],
  moneySignals: JsonRecord[],
  events: JsonRecord[],
  relationships: JsonRecord[],
  observations: JsonRecord[],
  sources: JsonRecord[],
  evidence: JsonRecord[],
  skippedResearchItems: string[],
): JsonRecord[] {
  const found: Record<string, string[]> = {
    identity: coverageReferences('entities', entities.length),
    timeline: coverageReferences('events', events.length),
    provenance_rights: [...coverageReferences('sources', sources.length), ...coverageReferences('evidence', evidence.length)],
    additional_observations: coverageReferences('observations', observations.length),
    payer_receiver_purpose: coverageReferences('money_signals', moneySignals.length),
    conflicts: skippedResearchItems.length ? [] : coverageReferences('claims', claims.length),
  };
  return DIMENSIONS.map((dimension) => {
    const refs = found[dimension] || [];
    if (refs.length > 0) return { dimension, status: 'found', note: `Observed in scheduled staging handoff ${dimension}.`, record_refs: refs };
    if (dimension === 'conflicts' && skippedResearchItems.length) {
      return { dimension, status: 'attempted_unavailable', note: 'Primary evidence gaps were retained in staging and not promoted.', attempts: ['R2_QUEUE primary-evidence quality gate'] };
    }
    return { dimension, status: 'not_attempted', note: `No source-backed ${dimension} record was present in this partial scheduled handoff.` };
  });
}

const ACCEPTED_QUEUE_SCHEMA_VERSIONS = new Set([
  'r2-queue-run.v1',
  'r2-queue-run.v2',
  'scheduled-r2-queue-run.v2',
  'universal-scheduled-run-artifact.v2',
]);

function acceptedQueueState(value: string): boolean {
  if (new Set(['UNQUEUED_TO_CANONICAL_R2', 'BACKLOG_REMAINS', 'PARTIAL_BACKLOG_REMAINS']).has(value)) return true;
  return /^(PARTIAL|OPEN_WITH|QUEUE_|RESOLVED_|UNQUEUED_|BACKLOG_)/.test(value);
}

function directHandoffBundles(queue: ScheduledQueueRun): { bundle: JsonRecord; candidate: JsonRecord }[] {
  const candidates = [
    ...arrayOfRecords(queue.handoff_candidates),
    ...arrayOfRecords(queue.existing_handoff_candidates),
  ];
  return candidates.flatMap((candidate) => {
    const bundle = isRecord(candidate.bundle) ? candidate.bundle : null;
    const state = text(candidate.state);
    const schemaPass = isRecord(bundle?.quality) && text(bundle.quality.schema_validation) === 'PASS';
    if (!bundle || (state !== 'VALIDATED_FOR_R2_HANDOFF' && !schemaPass)) return [];
    return [{ bundle, candidate }];
  });
}

function uniqueBundleRecords(bundles: JsonRecord[], field: string, idField: string): JsonRecord[] {
  const seen = new Set<string>();
  const output: JsonRecord[] = [];
  for (const bundle of bundles) {
    const rows = arrayOfRecords(bundle[field]);
    for (const row of rows) {
      const id = text(row[idField]) || JSON.stringify(row);
      if (seen.has(id)) continue;
      seen.add(id);
      output.push(row);
    }
  }
  return output;
}

function mergeDirectHandoffBundles(
  queue: ScheduledQueueRun,
  queuePath: string | null | undefined,
  directCandidates: { bundle: JsonRecord; candidate: JsonRecord }[],
): ScheduledHandoffResult {
  const bundles = directCandidates.map(({ bundle }) => bundle);
  const sources = uniqueBundleRecords(bundles, 'sources', 'source_id');
  const evidence = uniqueBundleRecords(bundles, 'evidence', 'evidence_id');
  const entities = uniqueBundleRecords(bundles, 'entities', 'entity_id');
  const claims = uniqueBundleRecords(bundles, 'claims', 'claim_id');
  const metrics = uniqueBundleRecords(bundles, 'metrics', 'metric_id');
  const moneySignals = uniqueBundleRecords(bundles, 'money_signals', 'money_signal_id');
  const events = uniqueBundleRecords(bundles, 'events', 'event_id');
  const relationships = uniqueBundleRecords(bundles, 'relationships', 'relationship_id');
  const observations = uniqueBundleRecords(bundles, 'observations', 'observation_hash');
  const derived = bundles.flatMap((bundle) => arrayOfRecords(bundle.derived));
  const runId = queueRunId(queue) || 'run_unknown';
  const retrievedAt = asDateTime(queueFinishedAt(queue), asDateTime(queueStartedAt(queue), new Date(0).toISOString()));
  const queueCoverage = isRecord(queue.coverage) ? queue.coverage : {};
  const queuePathNote = queuePath ? ` queue_path=${queuePath}` : '';
  const candidateWarnings = bundles.flatMap((bundle) => {
    const quality = isRecord(bundle.quality) ? bundle.quality : {};
    return arrayOfStrings(quality.warnings);
  });
  const bundle: JsonRecord = {
    schema_version: 'research-bundle.v1',
    run_id: runId,
    purpose: 'make_money',
    subject: { query: `scheduled collection ${runId}`, candidate_name: null, candidate_domain: null, notes: `Merged validated handoff candidates from scheduled staging.${queuePathNote}` },
    agent: { name: 'scheduled-r2-writer', model: null, version: 'scheduled-r2-handoff.v1' },
    retrieved_at: retrievedAt,
    collection_coverage: buildCollectionCoverage(entities, claims, metrics, moneySignals, events, relationships, observations, sources, evidence, []),
    sources,
    evidence,
    entities,
    claims,
    metrics,
    money_signals: moneySignals,
    events,
    relationships,
    observations,
    derived,
    quality: {
      unknowns: [`queue_validated_count=${String(queueCoverage.validated_count ?? queue.throughput?.validated_for_r2_handoff ?? entities.length)}`],
      conflicts: [],
      warnings: [
        ...warningStrings(queue),
        ...candidateWarnings,
        `Merged ${String(directCandidates.length)} validated handoff candidate bundle(s) from scheduled staging.`,
        'Source bodies were metadata-only and were not copied.',
      ],
      schema_validation: 'PASS',
    },
  };

  return {
    bundle,
    included_items: entities.length,
    skipped_items: Math.max(0, arrayOfRecords(queue.handoff_candidates).length + arrayOfRecords(queue.existing_handoff_candidates).length - directCandidates.length),
    skipped_research_items: [],
    source_count: sources.length,
    evidence_count: evidence.length,
    entity_count: entities.length,
    claim_count: claims.length,
    metric_count: metrics.length,
    money_signal_count: moneySignals.length,
    event_count: events.length,
    relationship_count: relationships.length,
    observation_count: observations.length,
  };
}

export async function materializeScheduledR2Handoff(input: ScheduledHandoffInput): Promise<ScheduledHandoffResult> {
  const queue = input.queue;
  const runId = queueRunId(queue);
  const retrievedAt = asDateTime(queueFinishedAt(queue), asDateTime(queueStartedAt(queue), new Date(0).toISOString()));
  const issues: string[] = [];
  if (
    queue.schema_version !== undefined &&
    !ACCEPTED_QUEUE_SCHEMA_VERSIONS.has(String(queue.schema_version))
  ) {
    issues.push('queue schema_version is not an accepted scheduled R2 handoff version');
  }
  if (!runId || !/^run_[A-Za-z0-9_.:-]+$/.test(runId)) issues.push('queue run_id is missing or invalid');
  const queueState = text(queue.queue_state);
  if (queueState && !acceptedQueueState(queueState)) {
    issues.push(`queue_state is not an accepted R2 handoff state: ${queueState}`);
  }

  const directCandidates = directHandoffBundles(queue);
  if (issues.length === 0 && directCandidates.length > 0) {
    return mergeDirectHandoffBundles(queue, input.queue_path, directCandidates);
  }

  const attempts = sourceAttemptRecords(input.source_runs);
  const sourceRecords = sourceRecordRecords(input.source_runs);
  const rows = queueRows(queue.recorded_items).map((row) => isRecord(row.normalized)
    ? { ...row.normalized, ...row, source_entity_id: row.source_entity_id || (isRecord(row.source_run_ref) ? row.source_run_ref.entity_id : undefined) }
    : row);
  if (rows.length === 0) issues.push('queue recorded_items contains no rows');

  const sourceIdCache = new Map<string, string>();
  const sources: JsonRecord[] = [];
  const evidence: JsonRecord[] = [];
  const entities: JsonRecord[] = [];
  const claims: JsonRecord[] = [];
  const metrics: JsonRecord[] = [];
  const moneySignals: JsonRecord[] = [];
  const events: JsonRecord[] = [];
  const relationships: JsonRecord[] = [];
  const observations: JsonRecord[] = [];
  const seen = {
    sources: new Set<string>(), evidence: new Set<string>(), entities: new Set<string>(),
    claims: new Set<string>(), metrics: new Set<string>(), moneySignals: new Set<string>(),
    events: new Set<string>(), relationships: new Set<string>(),
  };
  const skippedResearchItems: string[] = [];
  let skippedItems = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const name = rowName(row, sourceRecords);
    if (!name) {
      issues.push(`recorded_items[${index}] has no name`);
      continue;
    }
    const state = text(row.state);
    if (state === 'NEEDS_RESEARCH') {
      skippedResearchItems.push(name);
      skippedItems += 1;
      continue;
    }
    if (state && state !== 'VALIDATED_FOR_R2_HANDOFF') {
      skippedItems += 1;
      continue;
    }

    const generatedEvidenceAttempts = new Map<string, JsonRecord>();
    const evIds = evidenceIds(row.Evidence);
    if (evIds.length === 0) {
      const evidenceTexts = structuredText(row.Evidence, 'summary').filter((value) => !/^ev_[a-f0-9]{24}$/.test(value));
      const matchingAttempts = attemptsForRow(attempts, sourceRecords, row);
      if (evidenceTexts.length === 0) {
        issues.push(`${name} has no evidence text or stable evidence_id`);
        continue;
      }
      if (matchingAttempts.length === 0) {
        issues.push(`${name} evidence has no successful source locator`);
        continue;
      }
      for (const evidenceText of evidenceTexts) {
        for (const attempt of matchingAttempts) {
          const locator = sourceLocator(attempt);
          if (!locator) continue;
          const generatedId = await id('ev_', `${runId}|row|${index}|evidence|${evidenceText}|${locator}`, 24);
          if (!generatedEvidenceAttempts.has(generatedId)) generatedEvidenceAttempts.set(generatedId, attempt);
        }
      }
      evIds.push(...generatedEvidenceAttempts.keys());
    }
    const rowQuality = qualityInfo(row.quality, sourceStrength(firstText(row.Source)?.split('|').at(-1)));
    const validEvidenceIds: string[] = [];
    for (const evidenceId of evIds) {
      const attempt = generatedEvidenceAttempts.get(evidenceId) || attemptForEvidence(attempts, evidenceId);
      const locator = attempt ? sourceLocator(attempt) : null;
      if (!attempt || !locator || !attemptSucceeded(attempt)) {
        issues.push(`${name} evidence ${evidenceId} has no successful source locator`);
        continue;
      }
      const canonicalUrl = await canonicalUrlForLocator(locator, attempt, input.source_metadata_base_url);
      const sourceId = await sourceIdForLocator(locator, sourceIdCache);
      const retrieved = asDateTime(attempt.retrieved_at_or_attempted_at || attempt.attempted_at, retrievedAt);
      if (!seen.sources.has(sourceId)) {
        sources.push({
          source_id: sourceId,
          provider_name: providerName(locator),
          source_type: 'web_source',
          canonical_url: canonicalUrl,
          source_strength: rowQuality.source_strength,
          rights_status: text(attempt.rights_state) && RIGHTS_STATUSES.has(String(attempt.rights_state)) ? attempt.rights_state : 'metadata_only',
          rights_policy_id: null,
          access_notes: text(attempt.result)?.toLowerCase() === 'success_via_search_result_after_direct_open_error'
            ? 'Metadata was observed through a search result after direct open failed. Original page content was not fetched or archived.'
            : isHttpUrl(locator)
            ? 'Source body was not copied; metadata-only provenance retained from scheduled staging.'
            : `Source body was not copied; metadata-only provenance retained from scheduled staging. original_source_locator=${locator}`,
        });
        seen.sources.add(sourceId);
      }
      if (!seen.evidence.has(evidenceId)) {
        evidence.push({
          evidence_id: evidenceId,
          source_id: sourceId,
          source_url: canonicalUrl,
          source_title: `${name} source (${providerName(locator)})`,
          source_type: 'web_source',
          publisher_or_speaker: null,
          published_at: null,
          retrieved_at: retrieved,
          source_strength: rowQuality.source_strength,
          rights_status: 'metadata_only',
          rights_policy_id: null,
          raw_storage: { status: 'metadata_only', bucket: null, key: null, content_type: null, content_sha256: null, bytes: null },
          summary: observedSummary(row, sourceRecordForEvidence(sourceRecords, evidenceId)),
          extracted_facts: [firstText(row.Claim), firstText(row.Metric), firstText(row.MoneySignal), firstText(row.Event), firstText(row.Relationship)].filter((value): value is string => Boolean(value)),
        });
        seen.evidence.add(evidenceId);
      }
      validEvidenceIds.push(evidenceId);
    }
    if (validEvidenceIds.length === 0) continue;

    const entitySpec = parsedEntitySpec(row.Entity);
    const entityId = await id(`ent_${entitySpec.entityType}_`, `${runId}|entity|${name}`, 20);
    const rowDate = extractDate(firstText(row.Event), retrievedAt);
    if (!seen.entities.has(entityId)) {
      entities.push({
        entity_id: entityId,
        entity_type: entitySpec.entityType,
        canonical_name: name,
        aliases: entitySpec.aliases,
        canonical_identifier: null,
        domain: null,
        status: 'observed',
        observed_at: rowDate,
        evidence_ids: validEvidenceIds,
      });
      seen.entities.add(entityId);
    }

    const verification = rowQuality.verification_status;
    const confidence = rowQuality.confidence;
    const origin = verification === 'SUPPORTED' ? 'reported' : 'unknown';
    const claimText = firstText(row.Claim);
    if (claimText) {
      const claimId = await id('cl_', `${runId}|claim|${index}|${claimText}`, 24);
      if (!seen.claims.has(claimId)) {
        claims.push({ claim_id: claimId, entity_ids: [entityId], statement: claimText, origin_type: origin, verification_status: verification, confidence, evidence_ids: validEvidenceIds, occurred_at: rowDate, valid_from: null, valid_to: null });
        seen.claims.add(claimId);
      }
    }

    const metric = parsedPair(row.Metric, 'reported_metric');
    if (metric) {
      const metricId = await id('mt_', `${runId}|metric|${index}|${metric.detail}`, 24);
      if (!seen.metrics.has(metricId)) {
        metrics.push({ metric_id: metricId, entity_id: entityId, metric_type: metric.type, value: metric.detail, unit: null, currency: null, period_start: null, period_end: null, point_in_time: rowDate, basis: metric.detail, scope: 'scheduled staging row', origin_type: origin, confidence, verification_status: verification, evidence_ids: validEvidenceIds });
        seen.metrics.add(metricId);
      }
    }

    const money = parsedPair(row.MoneySignal, 'money_signal');
    if (money) {
      const moneyId = await id('ms_', `${runId}|money|${index}|${money.detail}`, 24);
      if (!seen.moneySignals.has(moneyId)) {
        moneySignals.push({ money_signal_id: moneyId, payer_entity_id: null, receiver_entity_id: entityId, purpose: money.detail, money_type: money.type, amount: null, currency: null, unit: null, amount_label: money.detail, period_start: null, period_end: null, point_in_time: rowDate, basis: money.detail, scope: 'scheduled staging row', origin_type: origin, verification_status: verification, confidence, evidence_ids: validEvidenceIds });
        seen.moneySignals.add(moneyId);
      }
    }

    const event = parsedPair(row.Event, 'observed_event');
    if (event) {
      const eventId = await id('evt_', `${runId}|event|${index}|${event.detail}`, 24);
      if (!seen.events.has(eventId)) {
        events.push({ event_id: eventId, entity_ids: [entityId], event_type: event.type, occurred_at: rowDate, description: event.detail, verification_status: verification, confidence, evidence_ids: validEvidenceIds });
        seen.events.add(eventId);
      }
    }

    const relationship = firstText(row.Relationship);
    if (relationship) {
      const separator = relationship.indexOf(':');
      const predicate = separator > 0 ? relationship.slice(0, separator).trim() : 'related_to';
      const object = separator > 0 ? relationship.slice(separator + 1).trim() : relationship;
      const relationshipId = await id('rel_', `${runId}|relationship|${index}|${relationship}`, 24);
      if (!seen.relationships.has(relationshipId)) {
        relationships.push({ relationship_id: relationshipId, subject_entity_id: entityId, predicate: predicate || 'related_to', object: object || relationship, valid_from: rowDate, valid_to: null, verification_status: verification, confidence, evidence_ids: validEvidenceIds });
        seen.relationships.add(relationshipId);
      }
    }

    const sourceRecord = sourceRecordForEvidence(sourceRecords, validEvidenceIds[0]);
    const summary = observedSummary(row, sourceRecord);
    observations.push({ origin_type: origin, verification_status: verification, observed_at: rowDate, collection_channel: 'github:universal-foundation/staging/r2-queue', observer: 'scheduled-r2-writer', text: summary, evidence_ids: validEvidenceIds });
    observations.push({ origin_type: 'observed', verification_status: 'SUPPORTED', observed_at: rowDate, collection_channel: 'github:universal-foundation/staging/r2-queue', observer: 'scheduled-r2-writer', text: rowSnapshot(row), evidence_ids: validEvidenceIds });
  }

  if (issues.length > 0) throw new ScheduledHandoffMaterializationError(issues.slice(0, 20));
  if (!runId) throw new ScheduledHandoffMaterializationError(['queue run_id is required']);

  const queueCoverage = isRecord(queue.coverage) ? queue.coverage : {};
  const qualityWarnings = [
    ...warningStrings(queue),
    'Materialized from scheduled staging rows; source bodies were metadata-only and were not copied.',
    `Skipped ${skippedResearchItems.length} NEEDS_RESEARCH item(s) from canonical R2 handoff.`,
  ];
  const unknowns = skippedResearchItems.map((name) => `${name}: primary evidence gap retained in staging and excluded from this handoff.`);
  const queuePath = input.queue_path ? ` queue_path=${input.queue_path}` : '';
  const bundle: JsonRecord = {
    schema_version: 'research-bundle.v1',
    run_id: runId,
    purpose: 'make_money',
    subject: { query: `scheduled collection ${runId}`, candidate_name: null, candidate_domain: null, notes: `R2_QUEUE handoff from universal-foundation.${queuePath}` },
    agent: { name: 'scheduled-r2-writer', model: null, version: 'scheduled-r2-handoff.v1' },
    retrieved_at: retrievedAt,
    collection_coverage: buildCollectionCoverage(entities, claims, metrics, moneySignals, events, relationships, observations, sources, evidence, skippedResearchItems),
    sources,
    evidence,
    entities,
    claims,
    metrics,
    money_signals: moneySignals,
    events,
    relationships,
    observations,
    derived: [],
    quality: {
      unknowns: [...unknowns, `queue_validated_count=${String(queueCoverage.validated_count ?? queue.throughput?.validated_for_r2_handoff ?? entities.length)}`],
      conflicts: [],
      warnings: qualityWarnings,
      schema_validation: 'PASS',
    },
  };

  return {
    bundle,
    included_items: entities.length,
    skipped_items: skippedItems,
    skipped_research_items: skippedResearchItems,
    source_count: sources.length,
    evidence_count: evidence.length,
    entity_count: entities.length,
    claim_count: claims.length,
    metric_count: metrics.length,
    money_signal_count: moneySignals.length,
    event_count: events.length,
    relationship_count: relationships.length,
    observation_count: observations.length,
  };
}
