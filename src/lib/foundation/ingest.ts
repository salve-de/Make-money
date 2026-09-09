import {
  getFoundationBucket,
  putR2ObjectCreateOnly,
  sha256Hex,
  type FoundationBucketRole,
  type R2WriteResult,
} from '@/lib/storage/r2';

type JsonObject = Record<string, unknown>;
import { assessCoverage } from './coverage';

const PURPOSES = new Set([
  'make_money',
  'idea_spark',
  'goldmine',
  'investrader',
  'general_research',
  'future_product',
]);

const REQUIRED_ARRAY_FIELDS = [
  'sources',
  'evidence',
  'entities',
  'claims',
  'metrics',
  'events',
  'relationships',
  'derived',
] as const;

const ID_PATTERNS = {
  entity_id: /^ent_[a-z0-9]+_[a-f0-9]{20}$/,
  claim_id: /^cl_[a-f0-9]{24}$/,
  metric_id: /^mt_[a-f0-9]{24}$/,
  money_signal_id: /^ms_[a-f0-9]{24}$/,
  event_id: /^evt_[a-f0-9]{24}$/,
  relationship_id: /^rel_[a-f0-9]{24}$/,
  derived_id: /^drv_[a-f0-9]{24}$/,
  evidence_id: /^ev_[a-f0-9]{24}$/,
  source_id: /^src\.[a-z0-9][a-z0-9._-]*$/,
} as const;

const DATASET_IDS = {
  entities: 'ds.business.entities.core',
  claims: 'ds.business.claims.core',
  metrics: 'ds.business.metrics.core',
  money_signals: 'ds.business.money-signals.core',
  events: 'ds.business.events.core',
  relationships: 'ds.business.relationships.core',
  research_bundle: 'ds.business.research-bundles.derived',
  intelligence: 'ds.business.intelligence.derived',
} as const;

const MAX_RAW_BYTES = 10 * 1024 * 1024;

const ORIGIN_TYPES = new Set(['reported', 'observed', 'estimated', 'inferred', 'unknown']);
const VERIFICATION_STATUSES = new Set([
  'SUPPORTED',
  'CONFLICTED',
  'UNVERIFIED',
  'SUPERSEDED',
  'RETRACTED',
]);
const SOURCE_STRENGTHS = new Set(['S', 'A', 'B', 'C', 'D', 'E', 'F', 'UNRATED']);
const RIGHTS_STATUSES = new Set([
  'allowed_private_raw',
  'restricted_private_raw',
  'metadata_only',
  'blocked',
  'pending_review',
]);
const RAW_STORAGE_STATUSES = new Set([
  'captured',
  'restricted',
  'metadata_only',
  'blocked',
  'not_attempted',
  'planned',
]);

export interface ResearchBundle extends JsonObject {
  schema_version: 'research-bundle.v1';
  run_id: string;
  purpose: string;
  subject: JsonObject;
  agent: JsonObject;
  retrieved_at: string;
  sources: JsonObject[];
  evidence: JsonObject[];
  entities: JsonObject[];
  claims: JsonObject[];
  metrics: JsonObject[];
  money_signals?: JsonObject[];
  events: JsonObject[];
  relationships: JsonObject[];
  derived: JsonObject[];
  quality: JsonObject;
}

export interface RawEvidenceInput {
  evidence_id: string;
  source_id: string;
  body_base64: string;
  content_type: string;
  extension: string;
  rights_status: 'allowed_private_raw' | 'restricted_private_raw';
  retrieved_at?: string;
  source_url?: string;
  source_title?: string;
  publisher_or_speaker?: string | null;
  rights_policy_id?: string | null;
}

export interface FoundationIngestRequest {
  write_authorized: true;
  bundle: unknown;
  raw_evidence?: unknown;
}

export interface FoundationJournalIngestRequest {
  write_authorized: true;
  journal_plan: unknown;
}

export type PlannedWriteLogicalRole =
  | 'raw_payload'
  | 'raw_manifest'
  | 'restricted_payload'
  | 'restricted_manifest'
  | 'journal_entry'
  | 'entity'
  | 'claim'
  | 'metric'
  | 'money_signal'
  | 'event'
  | 'relationship'
  | 'research_bundle'
  | 'derived_intelligence';

export type PlannedWritePreflightStatus =
  | 'NOT_CHECKED'
  | 'ABSENT'
  | 'EXISTS_IDENTICAL'
  | 'EXISTS_CONFLICT'
  | 'BUCKET_MISSING';

export interface PlannedWriteObject {
  logical_role: PlannedWriteLogicalRole;
  dataset_id: string | null;
  bucket: string;
  key: string;
  content_sha256: string;
  bytes: number;
  content_type: string;
  create_only: true;
  source_evidence_ids: string[];
  local_path: null;
  preflight_status: PlannedWritePreflightStatus;
}

export interface PlannedWritesManifest {
  schema_version: 'planned-writes.v1';
  run_id: string;
  write_authorized: boolean;
  objects: PlannedWriteObject[];
  forbidden_operations: [
    'CopyObject',
    'DeleteObject',
    'Move',
    'Rename',
    'Overwrite',
    'LegacyUniversalMutation'
  ];
}

export interface IngestedObjectReport {
  logical_role: string;
  dataset_id: string | null;
  bucket: string;
  key: string;
  status: R2WriteResult['status'];
  bytes: number;
  sha256: string;
  source_evidence_ids: string[];
  readback: R2WriteResult['readback'];
}

export interface FoundationIngestReport {
  run_id: string;
  write_authorized: true;
  schema_validation: 'PASS';
  planned_writes: PlannedWritesManifest;
  objects: IngestedObjectReport[];
  counts: {
    planned: number;
    created: number;
    exists_identical: number;
  };
  provider_calls: {
    head_bucket: number;
    get_object: number;
    put_object: number;
  };
  readback_verified: number;
  mutation_counts: {
    put_object: number;
    copy_object: 0;
    delete_object: 0;
    move: 0;
    rename: 0;
    overwrite: 0;
    legacy_universal: 0;
    bucket_or_config: 0;
  };
}

export class FoundationBundleValidationError extends Error {
  readonly code = 'FOUNDATION_BUNDLE_INVALID';

  constructor(readonly issues: string[]) {
    super(`research-bundle.v1 validation failed: ${issues.join('; ')}`);
    this.name = 'FoundationBundleValidationError';
  }
}

export class FoundationIngestAuthorizationError extends Error {
  readonly code = 'FOUNDATION_WRITE_NOT_AUTHORIZED';

  constructor() {
    super('write_authorized=true is required for Foundation ingestion');
    this.name = 'FoundationIngestAuthorizationError';
  }
}

interface PlannedFoundationObject {
  logicalRole: string;
  datasetId: string | null;
  bucketRole: FoundationBucketRole;
  bucket: string;
  key: string;
  body: Uint8Array | string;
  contentType: string;
  metadata: Record<string, string>;
  sourceEvidenceIds: string[];
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: JsonObject, key: string): string | null {
  return typeof value[key] === 'string' && value[key].trim() ? value[key].trim() : null;
}

function isDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function addRequiredString(record: JsonObject, key: string, path: string, issues: string[]): void {
  if (!getString(record, key)) issues.push(`${path}.${key} is required`);
}

function addString(record: JsonObject, key: string, path: string, issues: string[]): void {
  if (typeof record[key] !== 'string') issues.push(`${path}.${key} must be a string`);
}

function addRequiredStringOrNull(record: JsonObject, key: string, path: string, issues: string[]): void {
  if (!(key in record)) {
    issues.push(`${path}.${key} is required`);
    return;
  }
  addStringOrNull(record, key, path, issues);
}

function addRequiredNullableDateTime(
  record: JsonObject,
  key: string,
  path: string,
  issues: string[]
): void {
  if (!(key in record)) {
    issues.push(`${path}.${key} is required`);
    return;
  }
  addNullableDateTime(record, key, path, issues);
}

function addStringOrNull(record: JsonObject, key: string, path: string, issues: string[]): void {
  if (record[key] !== undefined && record[key] !== null && typeof record[key] !== 'string') {
    issues.push(`${path}.${key} must be a string or null`);
  }
}

function addNullableDateTime(record: JsonObject, key: string, path: string, issues: string[]): void {
  if (record[key] !== undefined && record[key] !== null && !isDateTime(record[key])) {
    issues.push(`${path}.${key} must be an ISO date-time or null`);
  }
}

function addArrayOfStrings(
  record: JsonObject,
  key: string,
  path: string,
  issues: string[],
  minItems = 0
): void {
  const value = record[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    issues.push(`${path}.${key} must be an array of strings`);
    return;
  }
  if (value.length < minItems) issues.push(`${path}.${key} must contain at least ${minItems} item(s)`);
}

function addEnum(
  record: JsonObject,
  key: string,
  path: string,
  allowed: Set<string>,
  issues: string[]
): void {
  if (typeof record[key] !== 'string' || !allowed.has(record[key])) {
    issues.push(`${path}.${key} has an unsupported value`);
  }
}

function addConfidence(record: JsonObject, path: string, issues: string[]): void {
  if (typeof record.confidence !== 'number' || record.confidence < 0 || record.confidence > 1) {
    issues.push(`${path}.confidence must be a number between 0 and 1`);
  }
}

function addUrl(record: JsonObject, key: string, path: string, issues: string[]): void {
  const value = record[key];
  if (typeof value !== 'string') {
    issues.push(`${path}.${key} must be a URL`);
    return;
  }
  try {
    new URL(value);
  } catch {
    issues.push(`${path}.${key} must be a URL`);
  }
}

function addRawStorage(record: JsonObject, path: string, issues: string[]): void {
  const rawStorage = record.raw_storage;
  if (!isObject(rawStorage)) {
    issues.push(`${path}.raw_storage must be an object`);
    return;
  }
  addEnum(rawStorage, 'status', `${path}.raw_storage`, RAW_STORAGE_STATUSES, issues);
  addStringOrNull(rawStorage, 'bucket', `${path}.raw_storage`, issues);
  addStringOrNull(rawStorage, 'key', `${path}.raw_storage`, issues);
  addStringOrNull(rawStorage, 'content_type', `${path}.raw_storage`, issues);
  addStringOrNull(rawStorage, 'content_sha256', `${path}.raw_storage`, issues);
  if (
    rawStorage.content_sha256 !== undefined &&
    rawStorage.content_sha256 !== null &&
    (typeof rawStorage.content_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(rawStorage.content_sha256))
  ) {
    issues.push(`${path}.raw_storage.content_sha256 must be a SHA-256 hex string or null`);
  }
  if (
    rawStorage.bytes !== undefined &&
    rawStorage.bytes !== null &&
    (!Number.isInteger(rawStorage.bytes) || (rawStorage.bytes as number) < 0)
  ) {
    issues.push(`${path}.raw_storage.bytes must be a non-negative integer or null`);
  }
}

function validateSources(records: JsonObject[], issues: string[]): void {
  records.forEach((record, index) => {
    const path = `sources[${index}]`;
    const sourceId = getString(record, 'source_id');
    if (!sourceId || !ID_PATTERNS.source_id.test(sourceId)) issues.push(`${path}.source_id is invalid`);
    addRequiredString(record, 'provider_name', path, issues);
    addRequiredString(record, 'source_type', path, issues);
    addUrl(record, 'canonical_url', path, issues);
    addEnum(record, 'source_strength', path, SOURCE_STRENGTHS, issues);
    addEnum(record, 'rights_status', path, RIGHTS_STATUSES, issues);
    addStringOrNull(record, 'rights_policy_id', path, issues);
    addStringOrNull(record, 'access_notes', path, issues);
  });
}

function validateEvidence(records: JsonObject[], issues: string[]): void {
  records.forEach((record, index) => {
    const path = `evidence[${index}]`;
    const evidenceId = getString(record, 'evidence_id');
    if (!evidenceId || !ID_PATTERNS.evidence_id.test(evidenceId)) issues.push(`${path}.evidence_id is invalid`);
    const sourceId = getString(record, 'source_id');
    if (!sourceId || !ID_PATTERNS.source_id.test(sourceId)) issues.push(`${path}.source_id is invalid`);
    addUrl(record, 'source_url', path, issues);
    addString(record, 'source_title', path, issues);
    addString(record, 'source_type', path, issues);
    addRequiredStringOrNull(record, 'publisher_or_speaker', path, issues);
    addRequiredNullableDateTime(record, 'published_at', path, issues);
    if (!isDateTime(record.retrieved_at)) issues.push(`${path}.retrieved_at must be an ISO date-time`);
    addEnum(record, 'source_strength', path, SOURCE_STRENGTHS, issues);
    addEnum(record, 'rights_status', path, RIGHTS_STATUSES, issues);
    addRawStorage(record, path, issues);
    addString(record, 'summary', path, issues);
    if (record.extracted_facts !== undefined) addArrayOfStrings(record, 'extracted_facts', path, issues);
    addStringOrNull(record, 'rights_policy_id', path, issues);
  });
}

function validateEntities(records: JsonObject[], issues: string[]): void {
  records.forEach((record, index) => {
    const path = `entities[${index}]`;
    const entityId = getString(record, 'entity_id');
    if (!entityId || !ID_PATTERNS.entity_id.test(entityId)) issues.push(`${path}.entity_id is invalid`);
    addRequiredString(record, 'entity_type', path, issues);
    addRequiredString(record, 'canonical_name', path, issues);
    addArrayOfStrings(record, 'aliases', path, issues);
    addRequiredStringOrNull(record, 'canonical_identifier', path, issues);
    addStringOrNull(record, 'domain', path, issues);
    addRequiredStringOrNull(record, 'status', path, issues);
    if (!isDateTime(record.observed_at)) issues.push(`${path}.observed_at must be an ISO date-time`);
    if (record.evidence_ids !== undefined) addArrayOfStrings(record, 'evidence_ids', path, issues);
  });
}

function validateClaims(records: JsonObject[], issues: string[]): void {
  records.forEach((record, index) => {
    const path = `claims[${index}]`;
    const claimId = getString(record, 'claim_id');
    if (!claimId || !ID_PATTERNS.claim_id.test(claimId)) issues.push(`${path}.claim_id is invalid`);
    addArrayOfStrings(record, 'entity_ids', path, issues, 1);
    addRequiredString(record, 'statement', path, issues);
    addEnum(record, 'origin_type', path, ORIGIN_TYPES, issues);
    addEnum(record, 'verification_status', path, VERIFICATION_STATUSES, issues);
    addConfidence(record, path, issues);
    addArrayOfStrings(record, 'evidence_ids', path, issues);
    if (record.verification_status === 'SUPPORTED' && Array.isArray(record.evidence_ids) && record.evidence_ids.length === 0) {
      issues.push(`${path}.evidence_ids is required for SUPPORTED claims`);
    }
    addNullableDateTime(record, 'occurred_at', path, issues);
    addNullableDateTime(record, 'valid_from', path, issues);
    addNullableDateTime(record, 'valid_to', path, issues);
    if (record.supersedes !== undefined) addArrayOfStrings(record, 'supersedes', path, issues);
    if (record.superseded_by !== undefined) addArrayOfStrings(record, 'superseded_by', path, issues);
  });
}

function addMetricValue(record: JsonObject, path: string, issues: string[]): void {
  const value = record.value;
  if (
    !(
      (typeof value === 'number' && Number.isFinite(value)) ||
      (typeof value === 'string' && value.trim().length > 0)
    )
  ) {
    issues.push(`${path}.value must be a finite number or non-empty string`);
  }
}

function validateMetrics(records: JsonObject[], issues: string[]): void {
  records.forEach((record, index) => {
    const path = `metrics[${index}]`;
    const metricId = getString(record, 'metric_id');
    if (!metricId || !ID_PATTERNS.metric_id.test(metricId)) issues.push(`${path}.metric_id is invalid`);
    addRequiredString(record, 'entity_id', path, issues);
    addRequiredString(record, 'metric_type', path, issues);
    addMetricValue(record, path, issues);
    addRequiredStringOrNull(record, 'unit', path, issues);
    addRequiredStringOrNull(record, 'currency', path, issues);
    addRequiredNullableDateTime(record, 'period_start', path, issues);
    addRequiredNullableDateTime(record, 'period_end', path, issues);
    addRequiredNullableDateTime(record, 'point_in_time', path, issues);
    addRequiredStringOrNull(record, 'basis', path, issues);
    addRequiredStringOrNull(record, 'scope', path, issues);
    addEnum(record, 'origin_type', path, ORIGIN_TYPES, issues);
    addConfidence(record, path, issues);
    addArrayOfStrings(record, 'evidence_ids', path, issues);
    if (record.verification_status !== undefined) addEnum(record, 'verification_status', path, VERIFICATION_STATUSES, issues);
    if (record.verification_status === 'SUPPORTED' && Array.isArray(record.evidence_ids) && record.evidence_ids.length === 0) {
      issues.push(`${path}.evidence_ids is required for SUPPORTED metrics`);
    }
  });
}

function validateMoneySignals(records: JsonObject[], issues: string[]): void {
  records.forEach((record, index) => {
    const path = `money_signals[${index}]`;
    const moneySignalId = getString(record, 'money_signal_id');
    if (!moneySignalId || !ID_PATTERNS.money_signal_id.test(moneySignalId)) {
      issues.push(`${path}.money_signal_id is invalid`);
    }
    addRequiredStringOrNull(record, 'payer_entity_id', path, issues);
    addRequiredStringOrNull(record, 'receiver_entity_id', path, issues);
    addRequiredString(record, 'purpose', path, issues);
    addRequiredString(record, 'money_type', path, issues);
    const amount = record.amount;
    if (
      amount !== null &&
      !(
        (typeof amount === 'number' && Number.isFinite(amount)) ||
        (typeof amount === 'string' && amount.trim().length > 0)
      )
    ) {
      issues.push(`${path}.amount must be a finite number, non-empty string, or null`);
    }
    addRequiredStringOrNull(record, 'currency', path, issues);
    addRequiredStringOrNull(record, 'unit', path, issues);
    addRequiredStringOrNull(record, 'amount_label', path, issues);
    addRequiredNullableDateTime(record, 'period_start', path, issues);
    addRequiredNullableDateTime(record, 'period_end', path, issues);
    addRequiredNullableDateTime(record, 'point_in_time', path, issues);
    addRequiredStringOrNull(record, 'basis', path, issues);
    addRequiredStringOrNull(record, 'scope', path, issues);
    addEnum(record, 'origin_type', path, ORIGIN_TYPES, issues);
    addEnum(record, 'verification_status', path, VERIFICATION_STATUSES, issues);
    addConfidence(record, path, issues);
    addArrayOfStrings(record, 'evidence_ids', path, issues);
    if (record.verification_status === 'SUPPORTED' && Array.isArray(record.evidence_ids) && record.evidence_ids.length === 0) {
      issues.push(`${path}.evidence_ids is required for SUPPORTED money signals`);
    }
  });
}

function validateEvents(records: JsonObject[], issues: string[]): void {
  records.forEach((record, index) => {
    const path = `events[${index}]`;
    const eventId = getString(record, 'event_id');
    if (!eventId || !ID_PATTERNS.event_id.test(eventId)) issues.push(`${path}.event_id is invalid`);
    addArrayOfStrings(record, 'entity_ids', path, issues, 1);
    addRequiredString(record, 'event_type', path, issues);
    addRequiredNullableDateTime(record, 'occurred_at', path, issues);
    addRequiredString(record, 'description', path, issues);
    addEnum(record, 'verification_status', path, VERIFICATION_STATUSES, issues);
    addConfidence(record, path, issues);
    addArrayOfStrings(record, 'evidence_ids', path, issues);
    if (record.verification_status === 'SUPPORTED' && Array.isArray(record.evidence_ids) && record.evidence_ids.length === 0) {
      issues.push(`${path}.evidence_ids is required for SUPPORTED events`);
    }
  });
}

function validateRelationships(records: JsonObject[], issues: string[]): void {
  records.forEach((record, index) => {
    const path = `relationships[${index}]`;
    const relationshipId = getString(record, 'relationship_id');
    if (!relationshipId || !ID_PATTERNS.relationship_id.test(relationshipId)) {
      issues.push(`${path}.relationship_id is invalid`);
    }
    addRequiredString(record, 'subject_entity_id', path, issues);
    addRequiredString(record, 'predicate', path, issues);
    addRequiredString(record, 'object', path, issues);
    addNullableDateTime(record, 'valid_from', path, issues);
    addNullableDateTime(record, 'valid_to', path, issues);
    addEnum(record, 'verification_status', path, VERIFICATION_STATUSES, issues);
    addConfidence(record, path, issues);
    addArrayOfStrings(record, 'evidence_ids', path, issues);
    if (record.verification_status === 'SUPPORTED' && Array.isArray(record.evidence_ids) && record.evidence_ids.length === 0) {
      issues.push(`${path}.evidence_ids is required for SUPPORTED relationships`);
    }
  });
}

function validateDerived(records: JsonObject[], issues: string[]): void {
  records.forEach((record, index) => {
    const path = `derived[${index}]`;
    const derivedId = getString(record, 'derived_id');
    if (!derivedId || !ID_PATTERNS.derived_id.test(derivedId)) issues.push(`${path}.derived_id is invalid`);
    addRequiredString(record, 'derived_type', path, issues);
    addString(record, 'text', path, issues);
    if (record.origin_type !== 'inferred') issues.push(`${path}.origin_type must be inferred`);
    addConfidence(record, path, issues);
    addArrayOfStrings(record, 'supporting_claim_ids', path, issues);
    addArrayOfStrings(record, 'supporting_evidence_ids', path, issues);
    addStringOrNull(record, 'model', path, issues);
    addNullableDateTime(record, 'created_at', path, issues);
  });
}

export function validateResearchBundle(input: unknown): ResearchBundle {
  const issues: string[] = [];
  if (!isObject(input)) {
    throw new FoundationBundleValidationError(['bundle must be a JSON object']);
  }

  if (input.schema_version !== 'research-bundle.v1') {
    issues.push('schema_version must be research-bundle.v1');
  }

  const runId = getString(input, 'run_id');
  if (!runId || !/^run_[A-Za-z0-9_.:-]+$/.test(runId)) {
    issues.push('run_id must match the Foundation run ID format');
  }

  const purpose = getString(input, 'purpose');
  if (!purpose || !PURPOSES.has(purpose)) {
    issues.push('purpose is not a supported Foundation purpose');
  }

  const subject = input.subject;
  if (!isObject(subject) || !getString(subject, 'query')) {
    issues.push('subject.query is required');
  }

  const agent = input.agent;
  if (!isObject(agent) || !getString(agent, 'name')) {
    issues.push('agent.name is required');
  }

  if (!isDateTime(input.retrieved_at)) {
    issues.push('retrieved_at must be an ISO date-time');
  }

  for (const field of REQUIRED_ARRAY_FIELDS) {
    if (!Array.isArray(input[field]) || input[field].some((item) => !isObject(item))) {
      issues.push(`${field} must be an array of JSON objects`);
    }
  }

  const moneySignals = input.money_signals;
  if (moneySignals !== undefined && (!Array.isArray(moneySignals) || moneySignals.some((item) => !isObject(item)))) {
    issues.push('money_signals must be an array of JSON objects when present');
  }

  const quality = input.quality;
  if (!isObject(quality)) {
    issues.push('quality is required');
  } else {
    for (const field of ['unknowns', 'conflicts', 'warnings']) {
      if (!Array.isArray(quality[field]) || quality[field].some((item) => typeof item !== 'string')) {
        issues.push(`quality.${field} must be an array of strings`);
      }
    }
    if (quality.schema_validation !== 'PASS') {
      issues.push('quality.schema_validation must be PASS before R2 ingestion');
    }
  }

  if (Array.isArray(input.sources)) validateSources(input.sources.filter(isObject), issues);
  if (Array.isArray(input.evidence)) validateEvidence(input.evidence.filter(isObject), issues);
  if (Array.isArray(input.entities)) validateEntities(input.entities.filter(isObject), issues);
  if (Array.isArray(input.claims)) validateClaims(input.claims.filter(isObject), issues);
  if (Array.isArray(input.metrics)) validateMetrics(input.metrics.filter(isObject), issues);
  if (Array.isArray(moneySignals)) validateMoneySignals(moneySignals.filter(isObject), issues);
  if (Array.isArray(input.events)) validateEvents(input.events.filter(isObject), issues);
  if (Array.isArray(input.relationships)) validateRelationships(input.relationships.filter(isObject), issues);
  if (Array.isArray(input.derived)) validateDerived(input.derived.filter(isObject), issues);

  if (issues.length > 0) {
    throw new FoundationBundleValidationError(issues);
  }

  if (input.purpose === 'make_money') assessCoverage(input);

  return input as ResearchBundle;
}

function dateParts(value: string): { year: string; month: string; day: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new FoundationBundleValidationError([`invalid date-time: ${value}`]);
  }
  return {
    year: String(date.getUTCFullYear()).padStart(4, '0'),
    month: String(date.getUTCMonth() + 1).padStart(2, '0'),
    day: String(date.getUTCDate()).padStart(2, '0'),
  };
}

function recordDate(record: JsonObject, fallback: string): string {
  for (const field of ['point_in_time', 'period_start', 'occurred_at', 'valid_from']) {
    if (isDateTime(record[field])) return record[field];
  }
  return fallback;
}

function jsonBytes(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

function encodeBase64(value: string): Uint8Array {
  const normalized = value.replace(/\s/g, '');
  if (!normalized || normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new FoundationBundleValidationError(['raw_evidence.body_base64 is not valid base64']);
  }

  const body = Uint8Array.from(Buffer.from(normalized, 'base64'));
  if (body.byteLength > MAX_RAW_BYTES) {
    throw new FoundationBundleValidationError([`raw evidence exceeds ${MAX_RAW_BYTES} bytes`]);
  }
  return body;
}

function parseRawEvidence(input: unknown, bundle: ResearchBundle): RawEvidenceInput[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.some((item) => !isObject(item))) {
    throw new FoundationBundleValidationError(['raw_evidence must be an array of objects']);
  }

  const evidenceIds = new Set(
    bundle.evidence.map((item) => getString(item, 'evidence_id')).filter((value): value is string => Boolean(value))
  );
  const evidenceById = new Map(
    bundle.evidence
      .map((item) => [getString(item, 'evidence_id'), item] as const)
      .filter((entry): entry is readonly [string, JsonObject] => Boolean(entry[0]))
  );
  const seenEvidenceIds = new Set<string>();
  const parsed: RawEvidenceInput[] = [];

  input.forEach((item, index) => {
    if (!isObject(item)) return;
    const evidenceId = getString(item, 'evidence_id');
    const sourceId = getString(item, 'source_id');
    const bodyBase64 = getString(item, 'body_base64');
    const contentType = getString(item, 'content_type');
    const extension = getString(item, 'extension');
    const rightsStatus = getString(item, 'rights_status');

    if (!evidenceId || !ID_PATTERNS.evidence_id.test(evidenceId)) {
      throw new FoundationBundleValidationError([`raw_evidence[${index}].evidence_id is invalid`]);
    }
    if (!sourceId || !ID_PATTERNS.source_id.test(sourceId)) {
      throw new FoundationBundleValidationError([`raw_evidence[${index}].source_id is invalid`]);
    }
    if (!evidenceIds.has(evidenceId)) {
      throw new FoundationBundleValidationError([`raw_evidence[${index}] is not present in bundle.evidence`]);
    }
    if (seenEvidenceIds.has(evidenceId)) {
      throw new FoundationBundleValidationError([`raw_evidence[${index}].evidence_id is duplicated`]);
    }
    if (!bodyBase64) {
      throw new FoundationBundleValidationError([`raw_evidence[${index}].body_base64 is required`]);
    }
    if (!contentType || !extension || !/^[a-z0-9]+$/.test(extension)) {
      throw new FoundationBundleValidationError([`raw_evidence[${index}] content type or extension is invalid`]);
    }
    if (rightsStatus !== 'allowed_private_raw' && rightsStatus !== 'restricted_private_raw') {
      throw new FoundationBundleValidationError([
        `raw_evidence[${index}] may only use allowed_private_raw or restricted_private_raw`,
      ]);
    }

    const bundleEvidence = evidenceById.get(evidenceId);
    const bundleSourceId = bundleEvidence ? getString(bundleEvidence, 'source_id') : null;
    const bundleRightsStatus = bundleEvidence ? getString(bundleEvidence, 'rights_status') : null;
    if (bundleSourceId !== sourceId) {
      throw new FoundationBundleValidationError([
        `raw_evidence[${index}].source_id does not match bundle.evidence[${evidenceId}]`,
      ]);
    }
    if (bundleRightsStatus !== rightsStatus) {
      throw new FoundationBundleValidationError([
        `raw_evidence[${index}].rights_status does not match bundle.evidence[${evidenceId}]`,
      ]);
    }

    encodeBase64(bodyBase64);
    seenEvidenceIds.add(evidenceId);
    parsed.push({
      evidence_id: evidenceId,
      source_id: sourceId,
      body_base64: bodyBase64,
      content_type: contentType,
      extension,
      rights_status: rightsStatus,
      retrieved_at: isDateTime(item.retrieved_at) ? item.retrieved_at : bundle.retrieved_at,
      source_url: getString(item, 'source_url') || undefined,
      source_title: getString(item, 'source_title') || undefined,
      publisher_or_speaker: typeof item.publisher_or_speaker === 'string' ? item.publisher_or_speaker : null,
      rights_policy_id: typeof item.rights_policy_id === 'string' ? item.rights_policy_id : null,
    });
  });

  return parsed;
}

function metadata(runId: string, datasetId: string | null, schemaVersion: string): Record<string, string> {
  return {
    'foundation-run-id': runId,
    ...(datasetId ? { 'foundation-dataset-id': datasetId } : {}),
    'foundation-schema-version': schemaVersion,
  };
}

function recordEvidenceIds(record: JsonObject): string[] {
  return Array.isArray(record.evidence_ids)
    ? record.evidence_ids.filter((value): value is string => typeof value === 'string')
    : [];
}

function normalizedObject(
  role: string,
  datasetId: string,
  bucketRole: FoundationBucketRole,
  key: string,
  body: unknown,
  runId: string,
  sourceEvidenceIds: string[] = [],
  schemaVersion = 'v1'
): PlannedFoundationObject {
  return {
    logicalRole: role,
    datasetId,
    bucketRole,
    bucket: getFoundationBucket(bucketRole),
    key,
    body: jsonBytes(body),
    contentType: 'application/json; charset=utf-8',
    metadata: metadata(runId, datasetId, schemaVersion),
    sourceEvidenceIds,
  };
}

async function rawObjects(
  rawEvidence: RawEvidenceInput[],
  bundle: ResearchBundle
): Promise<PlannedFoundationObject[]> {
  const planned: PlannedFoundationObject[] = [];
  const runId = bundle.run_id;

  for (const evidence of rawEvidence) {
    const body = encodeBase64(evidence.body_base64);
    const hash = await sha256Hex(body);
    const parts = dateParts(evidence.retrieved_at || bundle.retrieved_at);
    const bucketRole: FoundationBucketRole =
      evidence.rights_status === 'restricted_private_raw' ? 'restricted' : 'raw';
    const prefix = `evidence/${evidence.source_id}/${parts.year}/${parts.month}/${parts.day}/${evidence.evidence_id}`;
    const manifest = {
      evidence_id: evidence.evidence_id,
      source_id: evidence.source_id,
      source_url: evidence.source_url || null,
      source_title: evidence.source_title || null,
      publisher_or_speaker: evidence.publisher_or_speaker || null,
      retrieved_at: evidence.retrieved_at || bundle.retrieved_at,
      rights_status: evidence.rights_status,
      rights_policy_id: evidence.rights_policy_id || null,
      content_sha256: hash,
      bytes: body.byteLength,
      content_type: evidence.content_type,
      run_id: runId,
    };

    planned.push({
      logicalRole: evidence.rights_status === 'restricted_private_raw' ? 'restricted_payload' : 'raw_payload',
      datasetId: null,
      bucketRole,
      bucket: getFoundationBucket(bucketRole),
      key: `${prefix}/payload.${evidence.extension}`,
      body,
      contentType: evidence.content_type,
      metadata: metadata(runId, null, 'raw-evidence.v1'),
      sourceEvidenceIds: [evidence.evidence_id],
    });
    planned.push({
      logicalRole: evidence.rights_status === 'restricted_private_raw' ? 'restricted_manifest' : 'raw_manifest',
      datasetId: null,
      bucketRole,
      bucket: getFoundationBucket(bucketRole),
      key: `${prefix}/manifest.json`,
      body: jsonBytes(manifest),
      contentType: 'application/json; charset=utf-8',
      metadata: metadata(runId, null, 'raw-evidence.v1'),
      sourceEvidenceIds: [evidence.evidence_id],
    });
  }

  return planned;
}

async function buildPlan(bundle: ResearchBundle, rawEvidence: RawEvidenceInput[]): Promise<PlannedFoundationObject[]> {
  const planned = await rawObjects(rawEvidence, bundle);
  const fallbackDate = bundle.retrieved_at;

  for (const record of bundle.entities) {
    const id = getString(record, 'entity_id');
    if (id) {
      planned.push(
        normalizedObject(
          'entity',
          DATASET_IDS.entities,
          'lake',
          `datasets/${DATASET_IDS.entities}/v1/entities/${id}.json`,
          record,
          bundle.run_id,
          recordEvidenceIds(record)
        )
      );
    }
  }

  const partitioned = [
    ['claims', DATASET_IDS.claims, 'claim', 'claim_id'],
    ['metrics', DATASET_IDS.metrics, 'metric', 'metric_id'],
    ['money_signals', DATASET_IDS.money_signals, 'money_signal', 'money_signal_id'],
    ['events', DATASET_IDS.events, 'event', 'event_id'],
    ['relationships', DATASET_IDS.relationships, 'relationship', 'relationship_id'],
  ] as const;

  for (const [field, datasetId, logicalRole, idField] of partitioned) {
    const records = (bundle[field] || []) as JsonObject[];
    for (const record of records) {
      const id = getString(record, idField);
      if (!id) continue;
      const parts = dateParts(recordDate(record, fallbackDate));
      planned.push(
        normalizedObject(
          logicalRole,
          datasetId,
          'lake',
          `datasets/${datasetId}/v1/year=${parts.year}/month=${parts.month}/${id}.json`,
          record,
          bundle.run_id,
          recordEvidenceIds(record)
        )
      );
    }
  }

  const bundleParts = dateParts(bundle.retrieved_at);
  planned.push(
    normalizedObject(
      'research_bundle',
      DATASET_IDS.research_bundle,
      'lake',
      `datasets/${DATASET_IDS.research_bundle}/v1/${bundleParts.year}/${bundleParts.month}/${bundleParts.day}/${bundle.run_id}.json`,
      bundle,
      bundle.run_id,
      bundle.evidence
        .map((record) => getString(record, 'evidence_id'))
        .filter((value): value is string => Boolean(value)),
      'research-bundle.v1'
    )
  );

  if (bundle.derived.length > 0) {
    planned.push(
      normalizedObject(
        'derived_intelligence',
        DATASET_IDS.intelligence,
        'lake',
        `datasets/${DATASET_IDS.intelligence}/v1/${bundleParts.year}/${bundleParts.month}/${bundleParts.day}/${bundle.run_id}.json`,
        bundle.derived,
        bundle.run_id,
        bundle.derived.flatMap(recordEvidenceIds)
      )
    );
  }

  return planned;
}

function bodyBytes(body: Uint8Array | string): Uint8Array {
  return typeof body === 'string' ? new TextEncoder().encode(body) : body;
}

function plannedWriteRole(role: string): PlannedWriteLogicalRole {
  const allowed: PlannedWriteLogicalRole[] = [
    'raw_payload',
    'raw_manifest',
    'restricted_payload',
    'restricted_manifest',
    'journal_entry',
    'entity',
    'claim',
    'metric',
    'money_signal',
    'event',
    'relationship',
    'research_bundle',
    'derived_intelligence',
  ];
  if (!allowed.includes(role as PlannedWriteLogicalRole)) {
    throw new FoundationBundleValidationError([`unsupported planned write role: ${role}`]);
  }
  return role as PlannedWriteLogicalRole;
}

async function buildPlannedWrites(
  plan: PlannedFoundationObject[],
  runId: string,
  writeAuthorized: boolean
): Promise<PlannedWritesManifest> {
  const objects: PlannedWriteObject[] = [];
  for (const item of plan) {
    const body = bodyBytes(item.body);
    objects.push({
      logical_role: plannedWriteRole(item.logicalRole),
      dataset_id: item.datasetId,
      bucket: item.bucket,
      key: item.key,
      content_sha256: await sha256Hex(body),
      bytes: body.byteLength,
      content_type: item.contentType,
      create_only: true,
      source_evidence_ids: [...new Set(item.sourceEvidenceIds)],
      local_path: null,
      preflight_status: 'NOT_CHECKED',
    });
  }

  return {
    schema_version: 'planned-writes.v1',
    run_id: runId,
    write_authorized: writeAuthorized,
    objects,
    forbidden_operations: [
      'CopyObject',
      'DeleteObject',
      'Move',
      'Rename',
      'Overwrite',
      'LegacyUniversalMutation',
    ],
  };
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const index = nextIndex++;
        if (index >= items.length) return;
        results[index] = await worker(items[index], index);
      }
    })
  );

  return results;
}

/** Offline validation and immutable write plan; never contacts R2. */
export async function prepareFoundationResearch(bundleInput: unknown, rawInput?: unknown) {
  const bundle = validateResearchBundle(bundleInput);
  const raw = parseRawEvidence(rawInput, bundle);
  return buildPlannedWrites(await buildPlan(bundle, raw), bundle.run_id, false);
}

export async function ingestFoundationResearch(
  request: FoundationIngestRequest
): Promise<FoundationIngestReport> {
  if (!isObject(request) || request.write_authorized !== true) {
    throw new FoundationIngestAuthorizationError();
  }

  const bundle = validateResearchBundle(request.bundle);
  const rawEvidence = parseRawEvidence(request.raw_evidence, bundle);
  const plan = await buildPlan(bundle, rawEvidence);
  const plannedWrites = await buildPlannedWrites(plan, bundle.run_id, true);

  const providerCalls = {
    head_bucket: 0,
    get_object: 0,
    put_object: 0,
  };

  // putR2ObjectCreateOnly performs the preflight, conditional create-only write,
  // and readback verification as one immutable per-object operation. Keeping
  // that barrier inside the existing writer avoids a redundant second preflight
  // and stays below the Worker per-invocation R2 API limit.
  const results = await mapWithConcurrency(plan, 1, async (item, index) => {
    const result = await putR2ObjectCreateOnly({
      bucket: item.bucket,
      key: item.key,
      body: item.body,
      contentType: item.contentType,
      metadata: item.metadata,
    });
    plannedWrites.objects[index].preflight_status = result.status === 'CREATED' ? 'ABSENT' : 'EXISTS_IDENTICAL';
    return {
      logical_role: item.logicalRole,
      dataset_id: item.datasetId,
      bucket: result.bucket,
      key: result.key,
      status: result.status,
      bytes: result.bytes,
      sha256: result.sha256,
      source_evidence_ids: [...new Set(item.sourceEvidenceIds)],
      readback: result.readback,
      provider_calls: result.provider_calls,
    };
  });

  for (const result of results) {
    providerCalls.head_bucket += result.provider_calls.head_bucket;
    providerCalls.get_object += result.provider_calls.get_object;
    providerCalls.put_object += result.provider_calls.put_object;
  }

  return {
    run_id: bundle.run_id,
    write_authorized: true,
    schema_validation: 'PASS',
    planned_writes: {
      ...plannedWrites,
      run_id: bundle.run_id,
      write_authorized: true,
    },
    objects: results.map((result) => {
      const { provider_calls, ...report } = result;
      void provider_calls;
      return report;
    }),
    counts: {
      planned: plan.length,
      created: results.filter((item) => item.status === 'CREATED').length,
      exists_identical: results.filter((item) => item.status === 'EXISTS_IDENTICAL').length,
    },
    provider_calls: providerCalls,
    readback_verified: results.filter(
      (item) => item.readback.bytes_match && item.readback.sha256_match
    ).length,
    mutation_counts: {
      put_object: providerCalls.put_object,
      copy_object: 0,
      delete_object: 0,
      move: 0,
      rename: 0,
      overwrite: 0,
      legacy_universal: 0,
      bucket_or_config: 0,
    },
  };
}

interface JournalPlanObjectInput extends JsonObject {
  logical_role: 'journal_entry';
  dataset_id: 'ds.foundation.journal.core';
  bucket: string;
  key: string;
  content_sha256: string;
  bytes: number;
  content_type: string;
  create_only: true;
  source_evidence_ids: string[];
}

function journalIdFromKey(key: string): string | null {
  const match = /^journal\/v1\/\d{4}\/\d{2}\/\d{2}\/(jr_[a-f0-9]{24})\.json$/.exec(key);
  return match?.[1] || null;
}

async function buildJournalPlan(input: unknown): Promise<{
  runId: string;
  plan: PlannedFoundationObject[];
}> {
  if (!isObject(input)) {
    throw new FoundationBundleValidationError(['journal_plan must be an object']);
  }
  const plannedWrites = input.planned_writes;
  const entries = input.entries;
  if (!isObject(plannedWrites) || !Array.isArray(plannedWrites.objects) || !Array.isArray(entries)) {
    throw new FoundationBundleValidationError(['journal_plan.entries and journal_plan.planned_writes.objects are required']);
  }
  if (plannedWrites.schema_version !== 'planned-writes.v1') {
    throw new FoundationBundleValidationError(['journal_plan.planned_writes.schema_version must be planned-writes.v1']);
  }

  const entryById = new Map<string, JsonObject>();
  for (const [index, entry] of entries.entries()) {
    if (!isObject(entry) || entry.schema_version !== 'journal-entry.v1') {
      throw new FoundationBundleValidationError([`journal_plan.entries[${index}] must be journal-entry.v1`]);
    }
    const journalId = getString(entry, 'journal_id');
    if (!journalId || !/^jr_[a-f0-9]{24}$/.test(journalId) || entryById.has(journalId)) {
      throw new FoundationBundleValidationError([`journal_plan.entries[${index}].journal_id is invalid or duplicated`]);
    }
    if (!isDateTime(entry.recorded_at)) {
      throw new FoundationBundleValidationError([`journal_plan.entries[${index}].recorded_at must be an ISO date-time`]);
    }
    entryById.set(journalId, entry);
  }

  const bucket = getFoundationBucket('lake');
  const plan: PlannedFoundationObject[] = [];
  const seenKeys = new Set<string>();
  for (const [index, rawObject] of (plannedWrites.objects as unknown[]).entries()) {
    if (!isObject(rawObject)) throw new FoundationBundleValidationError([`journal_plan.planned_writes.objects[${index}] must be an object`]);
    const object = rawObject as JournalPlanObjectInput;
    const key = getString(object, 'key');
    const journalId = key ? journalIdFromKey(key) : null;
    const entry = journalId ? entryById.get(journalId) : undefined;
    if (
      object.logical_role !== 'journal_entry' ||
      object.dataset_id !== 'ds.foundation.journal.core' ||
      object.bucket !== bucket ||
      !key ||
      !journalId ||
      !entry ||
      seenKeys.has(key) ||
      object.create_only !== true ||
      object.content_type !== 'application/json; charset=utf-8' ||
      typeof object.content_sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(object.content_sha256) ||
      !Number.isInteger(object.bytes) ||
      object.bytes < 0 ||
      !Array.isArray(object.source_evidence_ids) ||
      object.source_evidence_ids.some((value) => typeof value !== 'string')
    ) {
      throw new FoundationBundleValidationError([`journal_plan.planned_writes.objects[${index}] is invalid`]);
    }
    const body = jsonBytes(entry);
    const bodyByteLength = bodyBytes(body).byteLength;
    const bodyHash = await sha256Hex(body);
    if (object.bytes !== bodyByteLength || object.content_sha256 !== bodyHash) {
      throw new FoundationBundleValidationError([`journal_plan.planned_writes.objects[${index}] hash/byte plan does not match its journal entry`]);
    }
    seenKeys.add(key);
    const provenance = isObject(entry.provenance) ? entry.provenance : {};
    const runId = getString(provenance, 'run_id') || 'run_unknown';
    plan.push({
      logicalRole: 'journal_entry',
      datasetId: 'ds.foundation.journal.core',
      bucketRole: 'lake',
      bucket,
      key,
      body,
      contentType: object.content_type,
      metadata: metadata(runId, 'ds.foundation.journal.core', 'journal-entry.v1'),
      sourceEvidenceIds: [...new Set(object.source_evidence_ids)],
    });
  }
  if (plan.length !== entries.length) {
    throw new FoundationBundleValidationError(['journal_plan entries and planned journal objects must have a one-to-one count']);
  }
  const firstEntry = isObject(entries[0]) ? entries[0] : null;
  const firstProvenance = firstEntry && isObject(firstEntry.provenance) ? firstEntry.provenance : null;
  const runId = getString(plannedWrites, 'run_id') || `${getString(firstProvenance || {}, 'run_id') || 'run_unknown'}.journal`;
  return { runId, plan };
}

/**
 * Ingest an already schema-validated journal-entry.v1 plan through the same
 * Foundation route and the same create-only/readback R2 writer as bundles.
 * The journal plan is prepared and validated offline by foundation-journal.ts.
 */
export async function ingestFoundationJournal(
  request: FoundationJournalIngestRequest
): Promise<FoundationIngestReport> {
  if (!isObject(request) || request.write_authorized !== true) {
    throw new FoundationIngestAuthorizationError();
  }
  const { runId, plan } = await buildJournalPlan(request.journal_plan);
  const plannedWrites = await buildPlannedWrites(plan, runId, true);
  const providerCalls = { head_bucket: 0, get_object: 0, put_object: 0 };
  const results = await mapWithConcurrency(plan, 1, async (item, index) => {
    const result = await putR2ObjectCreateOnly({
      bucket: item.bucket,
      key: item.key,
      body: item.body,
      contentType: item.contentType,
      metadata: item.metadata,
    });
    plannedWrites.objects[index].preflight_status = result.status === 'CREATED' ? 'ABSENT' : 'EXISTS_IDENTICAL';
    return {
      logical_role: item.logicalRole,
      dataset_id: item.datasetId,
      bucket: result.bucket,
      key: result.key,
      status: result.status,
      bytes: result.bytes,
      sha256: result.sha256,
      source_evidence_ids: [...new Set(item.sourceEvidenceIds)],
      readback: result.readback,
      provider_calls: result.provider_calls,
    };
  });
  for (const result of results) {
    providerCalls.head_bucket += result.provider_calls.head_bucket;
    providerCalls.get_object += result.provider_calls.get_object;
    providerCalls.put_object += result.provider_calls.put_object;
  }
  return {
    run_id: runId,
    write_authorized: true,
    schema_validation: 'PASS',
    planned_writes: {
      ...plannedWrites,
      run_id: runId,
      write_authorized: true,
    },
    objects: results.map((result) => {
      const { provider_calls, ...report } = result;
      void provider_calls;
      return report;
    }),
    counts: {
      planned: plan.length,
      created: results.filter((item) => item.status === 'CREATED').length,
      exists_identical: results.filter((item) => item.status === 'EXISTS_IDENTICAL').length,
    },
    provider_calls: providerCalls,
    readback_verified: results.filter(
      (item) => item.readback.bytes_match && item.readback.sha256_match
    ).length,
    mutation_counts: {
      put_object: providerCalls.put_object,
      copy_object: 0,
      delete_object: 0,
      move: 0,
      rename: 0,
      overwrite: 0,
      legacy_universal: 0,
      bucket_or_config: 0,
    },
  };
}
