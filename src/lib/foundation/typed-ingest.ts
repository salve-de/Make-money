import { createHash } from 'node:crypto';
import { Validator, type Schema } from '@cfworker/json-schema';
import researchBundleSchema from './schemas/research-bundle.v1.schema.json';
import typedRecordSetSchema from './schemas/typed-record-set.v1.schema.json';
import publicFactSchema from './schemas/public-fact.v1.schema.json';
import publicFactOutputSchema from './schemas/public-fact-output.v1.schema.json';
import collectionRunSchema from './schemas/collection-run.v1.schema.json';
import evidenceCaptureRequestSchema from './schemas/evidence-capture-request.v1.schema.json';
import workItemSchema from './schemas/work-item.v1.schema.json';
import { sha256Sync } from '@/shared/sha256';
import { defaultIncomingMoneySignalFields } from './money-signal-null-defaults';
import { assessCoverage } from './coverage';

type JsonObject = Record<string, unknown>;

export const TYPED_SOURCE_REPOSITORY = 'salve-de/universal-foundation';
export const TYPED_SOURCE_REFS = ['main', 'automation-research'] as const;
const TYPED_SOURCE_REF_SET = new Set<string>(TYPED_SOURCE_REFS);
export const TYPED_PROJECTOR_VERSION = 'r2-queue-mapper-v6';
export const TYPED_COVERAGE_ASSESSMENT = 'UNASSESSED' as const;
export const SOURCE_ARTIFACT_COMPATIBILITY_STRICT = 'STRICT' as const;
export const SOURCE_ARTIFACT_COMPATIBILITY_LEGACY =
  'LEGACY_SOURCE_ATTEMPTS_MISSING_AUDIT_FIELDS' as const;
export type SourceArtifactCompatibility =
  | typeof SOURCE_ARTIFACT_COMPATIBILITY_STRICT
  | typeof SOURCE_ARTIFACT_COMPATIBILITY_LEGACY;
type TypedCoverageAssessment =
  | typeof TYPED_COVERAGE_ASSESSMENT
  | 'PARTIAL'
  | 'REVIEW_REQUIRED'
  | 'RECONCILED_WITHIN_SCOPE'
  | 'SOURCE_PROVIDED_INVALID';

export interface FoundationTypedSourceDescriptor {
  repository: string;
  source_ref: string;
  source_commit_sha: string;
  typed_record_set_path: string;
  typed_record_set_blob_sha: string;
  source_artifact_path: string;
  source_artifact_blob_sha: string;
  receipt_path?: string;
  receipt_blob_sha?: string;
}

export interface FoundationTypedIngestRequest {
  write_authorized: true;
  source: FoundationTypedSourceDescriptor;
  typed_record_set_text: string;
  source_artifact_text: string;
}

export interface PreparedFoundationTypedIngest {
  bundle: JsonObject;
  typedRecordSet: JsonObject;
  sourceArtifact: JsonObject;
  source: FoundationTypedSourceDescriptor;
  mapperVersion: typeof TYPED_PROJECTOR_VERSION;
  sourceArtifactCompatibility: SourceArtifactCompatibility;
  coverageAssessment: TypedCoverageAssessment;
}

export class FoundationTypedIngestValidationError extends Error {
  readonly code = 'FOUNDATION_TYPED_INPUT_INVALID';
  readonly terminal = true;

  constructor(
    readonly reasonCode:
      | 'REQUEST_INVALID'
      | 'SOURCE_JSON_INVALID'
      | 'SOURCE_SCHEMA_INVALID'
      | 'SIDECAR_BLOB_MISMATCH'
      | 'SOURCE_ARTIFACT_MISMATCH'
      | 'IDENTITY_MISMATCH'
      | 'PROJECTION_SCHEMA_INVALID',
    message: string,
    readonly issues: string[] = [],
  ) {
    super(message);
    this.name = 'FoundationTypedIngestValidationError';
  }
}

const validateTypedRecordSet = new Validator(
  typedRecordSetSchema as Schema,
  '2020-12',
  false,
);
validateTypedRecordSet.addSchema(researchBundleSchema as Schema);

const validatePublicFactOutput = new Validator(
  publicFactOutputSchema as unknown as Schema,
  '2020-12',
  false,
);
validatePublicFactOutput.addSchema(publicFactSchema as unknown as Schema);

const validateCollectionRun = new Validator(
  collectionRunSchema as Schema,
  '2020-12',
  false,
);
validateCollectionRun.addSchema(evidenceCaptureRequestSchema as Schema);
validateCollectionRun.addSchema(workItemSchema as Schema);

const validateResearchBundleSchema = new Validator(
  researchBundleSchema as Schema,
  '2020-12',
  false,
);

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const LEGACY_OPTIONAL_SOURCE_ATTEMPT_REQUIRED_FIELDS = [
  'fetch_key',
  'attempted_at',
  'retryable',
] as const;
const LEGACY_COLLECTION_RUN_SCHEMA_FINGERPRINT =
  '82be4c3584f190b684f69ac1292105c2126964cbe8b44d824a405225f953a857';

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (!isObject(value)) return value;

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalizeJson(value[key])]),
  );
}

/**
 * Build a validation-only compatibility schema for immutable historical
 * collection-run.v1 artifacts. The canonical schema is never mutated.
 *
 * If the schema shape drifts from the expected contract, return null so only
 * the compatibility path is disabled; strict validation and module startup
 * remain available.
 */
export function buildLegacyCollectionRunCompatibilitySchema(
  schemaInput: unknown,
): Schema | null {
  if (!isObject(schemaInput)) return null;

  let schema: JsonObject;
  try {
    schema = JSON.parse(JSON.stringify(schemaInput)) as JsonObject;
  } catch {
    return null;
  }

  const fingerprint = createHash('sha256')
    .update(JSON.stringify(canonicalizeJson(schema)))
    .digest('hex');
  if (fingerprint !== LEGACY_COLLECTION_RUN_SCHEMA_FINGERPRINT) return null;

  const properties = isObject(schema.properties) ? schema.properties : null;
  const sourceAttempts =
    properties && isObject(properties.source_attempts)
      ? properties.source_attempts
      : null;
  const items =
    sourceAttempts && isObject(sourceAttempts.items)
      ? sourceAttempts.items
      : null;
  if (!items) return null;
  const required = items.required;

  if (
    !Array.isArray(required) ||
    required.some((item) => typeof item !== 'string')
  ) {
    return null;
  }

  const requiredFields = required as string[];
  if (
    !requiredFields.includes('result') ||
    !LEGACY_OPTIONAL_SOURCE_ATTEMPT_REQUIRED_FIELDS.every(
      (field) => requiredFields.includes(field),
    )
  ) {
    return null;
  }

  const relaxed = new Set<string>(
    LEGACY_OPTIONAL_SOURCE_ATTEMPT_REQUIRED_FIELDS,
  );
  items.required = requiredFields.filter((field) => !relaxed.has(field));

  return schema as Schema;
}

function buildLegacyCollectionRunCompatibilityValidator(): Validator | null {
  const schema = buildLegacyCollectionRunCompatibilitySchema(
    collectionRunSchema,
  );
  if (!schema) return null;

  try {
    const validator = new Validator(schema, '2020-12', false);
    validator.addSchema(evidenceCaptureRequestSchema as Schema);
    validator.addSchema(workItemSchema as Schema);
    return validator;
  } catch {
    return null;
  }
}

const validateLegacyCollectionRun =
  buildLegacyCollectionRunCompatibilityValidator();

function stringValue(value: JsonObject, key: string): string | null {
  const candidate = value[key];
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

function schemaErrors(
  validator: Validator,
  input: unknown,
): string[] {
  const result = validator.validate(input);
  if (result.valid) return [];
  return result.errors
    .slice(0, 20)
    .map((error) => `${error.instanceLocation || '#'} ${error.keyword || 'invalid'}`);
}

function hasKnownLegacySourceAttemptGap(
  sourceArtifact: JsonObject,
): boolean {
  const attempts = sourceArtifact.source_attempts;
  if (!Array.isArray(attempts) || attempts.length === 0) return false;

  return attempts.every((attempt) => {
    if (!isObject(attempt)) return false;
    return LEGACY_OPTIONAL_SOURCE_ATTEMPT_REQUIRED_FIELDS.every(
      (field) => !Object.hasOwn(attempt, field),
    );
  });
}

type CollectionRunSourceArtifactValidation =
  | {
      valid: true;
      compatibility: SourceArtifactCompatibility;
    }
  | {
      valid: false;
      issues: string[];
    };

function validateCollectionRunSourceArtifact(
  sourceArtifact: JsonObject,
): CollectionRunSourceArtifactValidation {
  const strictIssues = schemaErrors(validateCollectionRun, sourceArtifact);
  if (strictIssues.length === 0) {
    return {
      valid: true,
      compatibility: SOURCE_ARTIFACT_COMPATIBILITY_STRICT,
    };
  }

  if (
    !validateLegacyCollectionRun ||
    !hasKnownLegacySourceAttemptGap(sourceArtifact)
  ) {
    return { valid: false, issues: strictIssues };
  }

  // This validator differs only by making the three legacy fields optional;
  // every other required field and schema constraint still applies.
  const compatibilityIssues = schemaErrors(
    validateLegacyCollectionRun,
    sourceArtifact,
  );
  if (compatibilityIssues.length > 0) {
    return { valid: false, issues: strictIssues };
  }

  return {
    valid: true,
    compatibility: SOURCE_ARTIFACT_COMPATIBILITY_LEGACY,
  };
}

function stringArray(value: JsonObject, key: string): string[] {
  const candidate = value[key];
  return Array.isArray(candidate)
    ? candidate.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function collectKnownEntityIds(
  value: unknown,
  knownEntityIds: ReadonlySet<string>,
  output: Set<string>,
  depth = 0,
): void {
  if (depth > 8) return;
  if (typeof value === 'string') {
    if (knownEntityIds.has(value)) output.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectKnownEntityIds(item, knownEntityIds, output, depth + 1);
    return;
  }
  if (!isObject(value)) return;
  for (const child of Object.values(value)) {
    collectKnownEntityIds(child, knownEntityIds, output, depth + 1);
  }
}

function collectPayloadStrings(value: unknown, output: string[], depth = 0): void {
  if (depth > 8) return;
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized) output.push(normalized);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPayloadStrings(item, output, depth + 1);
    return;
  }
  if (!isObject(value)) return;
  for (const child of Object.values(value)) {
    collectPayloadStrings(child, output, depth + 1);
  }
}

function entityMentionTokens(entity: JsonObject): string[] {
  const candidates = [
    stringValue(entity, 'canonical_name'),
    ...stringArray(entity, 'aliases'),
  ];
  return [...new Set(
    candidates
      .filter((item): item is string => Boolean(item))
      .map((item) => item.trim().toLocaleLowerCase())
      .filter((item) => item.length >= 4),
  )];
}

function observationEntityIds(
  observation: JsonObject,
  typedRecordSet: JsonObject,
  entities: JsonObject[],
): string[] {
  const knownEntityIds = new Set(
    entities
      .map((entity) => stringValue(entity, 'entity_id'))
      .filter((entityId): entityId is string => Boolean(entityId)),
  );
  if (knownEntityIds.size === 0) return [];

  const resolved = new Set<string>();
  collectKnownEntityIds(observation.payload, knownEntityIds, resolved);
  if (resolved.size > 0) return [...resolved].sort();

  const payloadStrings: string[] = [];
  collectPayloadStrings(observation.payload, payloadStrings);
  const payloadText = payloadStrings.join('\n').toLocaleLowerCase();
  if (payloadText) {
    for (const entity of entities) {
      const entityId = stringValue(entity, 'entity_id');
      if (!entityId) continue;
      if (entityMentionTokens(entity).some((token) => payloadText.includes(token))) {
        resolved.add(entityId);
      }
    }
  }
  if (resolved.size > 0) return [...resolved].sort();

  const subjectRef = stringValue(typedRecordSet, 'subject_ref');
  if (subjectRef && knownEntityIds.has(subjectRef)) return [subjectRef];

  return knownEntityIds.size === 1 ? [...knownEntityIds] : [];
}

function parseJsonObject(text: string, reasonCode: 'SOURCE_JSON_INVALID' | 'REQUEST_INVALID', label: string): JsonObject {
  try {
    const parsed = JSON.parse(text);
    if (!isObject(parsed)) {
      throw new FoundationTypedIngestValidationError(reasonCode, `${label} must be a JSON object`);
    }
    return parsed;
  } catch (error) {
    if (error instanceof FoundationTypedIngestValidationError) throw error;
    throw new FoundationTypedIngestValidationError(reasonCode, `${label} is not valid JSON`);
  }
}

function assertGitSha(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value)) {
    throw new FoundationTypedIngestValidationError('REQUEST_INVALID', `${label} must be a 40-character Git SHA`);
  }
}

function assertSafeRepoPath(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.startsWith('/') ||
    value.includes('..') ||
    value.includes('\\')
  ) {
    throw new FoundationTypedIngestValidationError('REQUEST_INVALID', `${label} is invalid`);
  }
}

export function gitBlobSha1(text: string): string {
  const bytes = Buffer.from(text, 'utf8');
  return createHash('sha1')
    .update(Buffer.from(`blob ${bytes.byteLength}\0`, 'utf8'))
    .update(bytes)
    .digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const COLLECTION_COVERAGE_UNASSESSED_WARNING =
  'typed-record-set.v1 preserved losslessly in transport observation; collection coverage is unassessed by this projection';

function replaceCoverageWarning(bundle: JsonObject, message: string | null): void {
  const quality = isObject(bundle.quality) ? bundle.quality : {};
  const warnings = Array.isArray(quality.warnings)
    ? quality.warnings.filter((item): item is string => typeof item === 'string')
    : [];
  quality.warnings = [
    ...warnings.filter((item) => item !== COLLECTION_COVERAGE_UNASSESSED_WARNING),
    ...(message ? [message] : []),
  ];
  bundle.quality = quality;
}

function remapSourceCoverageForBundle(value: unknown): JsonObject[] {
  return (cloneJson(value) as JsonObject[]).map((row) => {
    if (!isObject(row) || !Array.isArray(row.record_refs)) return row;
    return {
      ...row,
      record_refs: row.record_refs.map((reference) => {
        if (typeof reference !== 'string') return reference;
        const observationReference = /^observations\/(\d+)$/.exec(reference);
        return observationReference
          ? `observations/${Number(observationReference[1]) + 1}`
          : reference;
      }),
    };
  });
}

function promoteSourceCoverageIfValid(
  bundle: JsonObject,
  typedRecordSet: JsonObject,
): TypedCoverageAssessment {
  if (!Object.hasOwn(typedRecordSet, 'collection_coverage')) {
    return TYPED_COVERAGE_ASSESSMENT;
  }
  if (typedRecordSet.purpose !== 'make_money') {
    return TYPED_COVERAGE_ASSESSMENT;
  }

  bundle.collection_coverage = remapSourceCoverageForBundle(typedRecordSet.collection_coverage);
  try {
    const assessment = assessCoverage(bundle);
    if (assessment.status === 'PARTIAL') {
      replaceCoverageWarning(
        bundle,
        'Source collection coverage is partial; unattempted dimensions remain explicitly unattempted.',
      );
      return 'PARTIAL';
    }
    if (assessment.status === 'RECONCILED_WITHIN_SCOPE') {
      replaceCoverageWarning(bundle, null);
      return 'RECONCILED_WITHIN_SCOPE';
    }
    replaceCoverageWarning(
      bundle,
      'Source collection coverage is retained, but its declared research scope requires review.',
    );
    return 'REVIEW_REQUIRED';
  } catch {
    delete bundle.collection_coverage;
    replaceCoverageWarning(
      bundle,
      'Source collection coverage was not promoted because its references or dimensions failed validation; the original sidecar is retained in the private transport observation.',
    );
    return 'SOURCE_PROVIDED_INVALID';
  }
}

function stableQualityStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => typeof item === 'string' ? item : canonicalJson(item));
}

function humanObservationText(observation: JsonObject): string {
  const payload = isObject(observation.payload) ? observation.payload : null;
  const summary = payload ? stringValue(payload, 'summary') : null;
  return summary || canonicalJson(observation);
}

function transportObservationId(blobSha: string, subjectRef: string): string {
  return `obs_${sha256Sync(`transport|${blobSha}|${subjectRef}|${TYPED_PROJECTOR_VERSION}`).slice(0, 24)}`;
}

export function typedProjectionRunId(blobSha: string, subjectRef: string): string {
  const fingerprint = sha256Sync(`${blobSha}|${subjectRef}|${TYPED_PROJECTOR_VERSION}`);
  return `run_handoff_${fingerprint.slice(0, 32)}`;
}

export function projectTypedRecordSetV4(
  typedRecordSet: JsonObject,
  typedRecordSetBlobSha: string,
): JsonObject {
  const provenance = isObject(typedRecordSet.provenance) ? typedRecordSet.provenance : {};
  const agent = isObject(provenance.agent) ? provenance.agent : {};
  const subject = isObject(typedRecordSet.subject) ? typedRecordSet.subject : {};
  const subjectRef = stringValue(typedRecordSet, 'subject_ref');
  const retrievedAt = stringValue(provenance, 'retrieved_at');
  const recordedAt = stringValue(provenance, 'recorded_at');
  const collectionChannel = stringValue(provenance, 'collection_channel');
  const agentName = stringValue(agent, 'name');

  if (!subjectRef || !retrievedAt || !recordedAt || !collectionChannel || !agentName) {
    throw new FoundationTypedIngestValidationError(
      'SOURCE_SCHEMA_INVALID',
      'typed sidecar provenance/subject identity is incomplete',
    );
  }

  const entities = Array.isArray(typedRecordSet.entities)
    ? typedRecordSet.entities.filter(isObject)
    : [];
  const typedObservations = Array.isArray(typedRecordSet.observations)
    ? typedRecordSet.observations.filter(isObject)
    : [];

  const observations: JsonObject[] = [
    {
      observation_id: transportObservationId(typedRecordSetBlobSha, subjectRef),
      observation_type: 'transport.typed_record_set_v1',
      origin_type: 'observed',
      verification_status: 'UNVERIFIED',
      observed_at: recordedAt,
      collection_channel: 'typed_transport',
      observer: agentName,
      text: 'typed-record-set.v1 transport payload',
      payload_schema_ref: String(typedRecordSetSchema.$id || 'typed-record-set.v1'),
      transport_typed_record_set_v1: cloneJson(typedRecordSet),
    },
    ...typedObservations.map((observation) => {
      const observationChannel =
        stringValue(observation, 'collection_channel') || collectionChannel;
      const observer = stringValue(observation, 'observer') || agentName;
      const entityIds = observationEntityIds(observation, typedRecordSet, entities);
      return {
        ...cloneJson(observation),
        ...(entityIds.length > 0 ? { entity_ids: entityIds } : {}),
        collection_channel: observationChannel,
        observer,
        text: humanObservationText(observation),
      };
    }),
  ];

  const quality = isObject(typedRecordSet.quality) ? typedRecordSet.quality : {};
  const warnings = Array.isArray(quality.warnings)
    ? quality.warnings.filter((item): item is string => typeof item === 'string')
    : [];

  const bundle: JsonObject = {
    schema_version: 'research-bundle.v1',
    run_id: typedProjectionRunId(typedRecordSetBlobSha, subjectRef),
    purpose: typedRecordSet.purpose,
    subject: cloneJson(subject),
    agent: cloneJson(agent),
    retrieved_at: retrievedAt,
    sources: cloneJson(Array.isArray(typedRecordSet.sources) ? typedRecordSet.sources : []),
    evidence: cloneJson(Array.isArray(typedRecordSet.evidence) ? typedRecordSet.evidence : []),
    entities: cloneJson(entities),
    claims: cloneJson(Array.isArray(typedRecordSet.claims) ? typedRecordSet.claims : []),
    metrics: cloneJson(Array.isArray(typedRecordSet.metrics) ? typedRecordSet.metrics : []),
    money_signals: cloneJson(Array.isArray(typedRecordSet.money_signals) ? typedRecordSet.money_signals : []),
    events: cloneJson(Array.isArray(typedRecordSet.events) ? typedRecordSet.events : []),
    relationships: cloneJson(Array.isArray(typedRecordSet.relationships) ? typedRecordSet.relationships : []),
    observations,
    derived: cloneJson(Array.isArray(typedRecordSet.derived) ? typedRecordSet.derived : []),
    quality: {
      unknowns: stableQualityStrings(quality.unknowns),
      conflicts: stableQualityStrings(quality.conflicts),
      warnings: [
        ...warnings,
        'typed-record-set.v1 preserved losslessly in transport observation; collection coverage is unassessed by this projection',
      ],
      schema_validation: 'PASS',
    },
  };

  const normalizedBundle = defaultIncomingMoneySignalFields(bundle).bundle;

  const projectionIssues = schemaErrors(validateResearchBundleSchema, normalizedBundle);
  if (projectionIssues.length > 0) {
    const issues = projectionIssues;
    throw new FoundationTypedIngestValidationError(
      'PROJECTION_SCHEMA_INVALID',
      `projected research-bundle.v1 is invalid: ${issues.join('; ')}`,
      issues,
    );
  }

  return normalizedBundle;
}

function validateSourceDescriptor(source: unknown): FoundationTypedSourceDescriptor {
  if (!isObject(source)) {
    throw new FoundationTypedIngestValidationError('REQUEST_INVALID', 'source descriptor is required');
  }

  const repository = stringValue(source, 'repository');
  const sourceRef = stringValue(source, 'source_ref');
  const sourceCommitSha = stringValue(source, 'source_commit_sha');
  const typedPath = stringValue(source, 'typed_record_set_path');
  const typedBlob = stringValue(source, 'typed_record_set_blob_sha');
  const artifactPath = stringValue(source, 'source_artifact_path');
  const artifactBlob = stringValue(source, 'source_artifact_blob_sha');
  const receiptPath = stringValue(source, 'receipt_path');
  const receiptBlob = stringValue(source, 'receipt_blob_sha');

  if (repository !== TYPED_SOURCE_REPOSITORY) {
    throw new FoundationTypedIngestValidationError('REQUEST_INVALID', 'unexpected source repository');
  }
  if (!sourceRef || !TYPED_SOURCE_REF_SET.has(sourceRef)) {
    throw new FoundationTypedIngestValidationError(
      'REQUEST_INVALID',
      'source_ref must be one of the approved typed-source refs',
    );
  }
  assertGitSha(sourceCommitSha, 'source_commit_sha');
  assertGitSha(typedBlob, 'typed_record_set_blob_sha');
  assertGitSha(artifactBlob, 'source_artifact_blob_sha');
  assertSafeRepoPath(typedPath, 'typed_record_set_path');
  assertSafeRepoPath(artifactPath, 'source_artifact_path');
  if (sourceRef === 'automation-research') {
    if (!receiptPath || !receiptBlob) {
      throw new FoundationTypedIngestValidationError(
        'REQUEST_INVALID',
        'automation-research source_ref requires receipt_path and receipt_blob_sha',
      );
    }
    assertSafeRepoPath(receiptPath, 'receipt_path');
    assertGitSha(receiptBlob, 'receipt_blob_sha');
    if (!receiptPath.startsWith('staging/automation/receipts/')) {
      throw new FoundationTypedIngestValidationError(
        'REQUEST_INVALID',
        'receipt_path must be inside staging/automation/receipts/',
      );
    }
  }

  return {
    repository,
    source_ref: sourceRef,
    source_commit_sha: sourceCommitSha,
    typed_record_set_path: typedPath,
    typed_record_set_blob_sha: typedBlob,
    source_artifact_path: artifactPath,
    source_artifact_blob_sha: artifactBlob,
    ...(receiptPath && receiptBlob
      ? { receipt_path: receiptPath, receipt_blob_sha: receiptBlob }
      : {}),
  };
}

export function prepareFoundationTypedIngest(
  request: FoundationTypedIngestRequest,
): PreparedFoundationTypedIngest {
  if (!isObject(request) || request.write_authorized !== true) {
    throw new FoundationTypedIngestValidationError('REQUEST_INVALID', 'write_authorized=true is required');
  }
  if (typeof request.typed_record_set_text !== 'string' || typeof request.source_artifact_text !== 'string') {
    throw new FoundationTypedIngestValidationError('REQUEST_INVALID', 'typed/source artifact text is required');
  }

  const source = validateSourceDescriptor(request.source);

  if (gitBlobSha1(request.typed_record_set_text) !== source.typed_record_set_blob_sha) {
    throw new FoundationTypedIngestValidationError(
      'SIDECAR_BLOB_MISMATCH',
      'typed sidecar bytes do not match the claimed Git blob SHA',
    );
  }
  if (gitBlobSha1(request.source_artifact_text) !== source.source_artifact_blob_sha) {
    throw new FoundationTypedIngestValidationError(
      'SOURCE_ARTIFACT_MISMATCH',
      'source artifact bytes do not match the claimed Git blob SHA',
    );
  }

  const typedRecordSet = parseJsonObject(
    request.typed_record_set_text,
    'SOURCE_JSON_INVALID',
    'typed_record_set_text',
  );
  // collection_coverage is optional in the upstream schema. Schema-invalid
  // sidecars remain terminal input errors; semantically incomplete coverage
  // is handled separately so it cannot discard otherwise valid factual data.
  const typedRecordSetIssues = schemaErrors(validateTypedRecordSet, typedRecordSet);
  if (typedRecordSetIssues.length > 0) {
    const issues = typedRecordSetIssues;
    throw new FoundationTypedIngestValidationError(
      'SOURCE_SCHEMA_INVALID',
      `typed-record-set.v1 schema validation failed: ${issues.join('; ')}`,
      issues,
    );
  }

  const extensions = isObject(typedRecordSet.extensions) ? typedRecordSet.extensions : null;
  const publicFactOutput = extensions?.['public_facts.v1'];
  if (publicFactOutput !== undefined) {
    const publicFactIssues = schemaErrors(validatePublicFactOutput, publicFactOutput);
    if (publicFactIssues.length > 0) {
      throw new FoundationTypedIngestValidationError(
        'SOURCE_SCHEMA_INVALID',
        `public-fact-output.v1 schema validation failed: ${publicFactIssues.join('; ')}`,
        publicFactIssues,
      );
    }
  }

  const sourceArtifact = parseJsonObject(
    request.source_artifact_text,
    'SOURCE_JSON_INVALID',
    'source_artifact_text',
  );
  const collectionRunValidation =
    validateCollectionRunSourceArtifact(sourceArtifact);
  if (!collectionRunValidation.valid) {
    const issues = collectionRunValidation.issues;
    throw new FoundationTypedIngestValidationError(
      'SOURCE_SCHEMA_INVALID',
      `collection-run.v1 schema validation failed: ${issues.join('; ')}`,
      issues,
    );
  }

  const sourceArtifactRef = isObject(typedRecordSet.source_artifact)
    ? typedRecordSet.source_artifact
    : {};
  const sourceRunId = stringValue(typedRecordSet, 'source_run_id');
  const subjectRef = stringValue(typedRecordSet, 'subject_ref');
  const lane = stringValue(sourceArtifactRef, 'lane');

  if (publicFactOutput !== undefined && lane !== 'VERIFY_RECONCILE') {
    throw new FoundationTypedIngestValidationError(
      'IDENTITY_MISMATCH',
      'public_facts.v1 is accepted only from VERIFY_RECONCILE sidecars',
    );
  }

  if (
    !sourceRunId ||
    !subjectRef ||
    !lane ||
    source.source_artifact_path !== stringValue(sourceArtifactRef, 'path') ||
    source.source_artifact_blob_sha !== stringValue(sourceArtifactRef, 'blob_sha') ||
    !source.typed_record_set_path.startsWith(`staging/automation/typed-records/${lane}/`) ||
    !source.typed_record_set_path.includes(`/${sourceRunId}/`)
  ) {
    throw new FoundationTypedIngestValidationError(
      'IDENTITY_MISMATCH',
      'typed sidecar/source descriptor identity mismatch',
    );
  }

  if (
    stringValue(sourceArtifact, 'schema_version') !== 'collection-run.v1' ||
    stringValue(sourceArtifact, 'run_id') !== sourceRunId ||
    stringValue(sourceArtifact, 'lane') !== lane
  ) {
    throw new FoundationTypedIngestValidationError(
      'SOURCE_ARTIFACT_MISMATCH',
      'source artifact run/lane does not match the typed sidecar',
    );
  }

  const checkpoint = isObject(sourceArtifact.checkpoint)
    ? sourceArtifact.checkpoint
    : null;
  const checkpointSubjectRef = checkpoint
    ? stringValue(checkpoint, 'subject_ref')
    : null;
  if (checkpointSubjectRef && checkpointSubjectRef !== subjectRef) {
    throw new FoundationTypedIngestValidationError(
      'SOURCE_ARTIFACT_MISMATCH',
      'source artifact checkpoint subject_ref does not match the typed sidecar',
    );
  }

  const recordedItems = Array.isArray(sourceArtifact.recorded_items)
    ? sourceArtifact.recorded_items.filter(isObject)
    : [];
  const recordedSubjectRefs = recordedItems
    .map((item) => stringValue(item, 'subject_ref'))
    .filter((item): item is string => Boolean(item));
  if (
    collectionRunValidation.compatibility ===
      SOURCE_ARTIFACT_COMPATIBILITY_LEGACY &&
    (
      !checkpointSubjectRef &&
      !recordedSubjectRefs.includes(subjectRef)
      || recordedSubjectRefs.some((recordedSubjectRef) => recordedSubjectRef !== subjectRef)
    )
  ) {
    throw new FoundationTypedIngestValidationError(
      'SOURCE_ARTIFACT_MISMATCH',
      'legacy source artifact must positively bind only the typed sidecar subject_ref',
    );
  }
  if (recordedSubjectRefs.length > 0 && !recordedSubjectRefs.includes(subjectRef)) {
    throw new FoundationTypedIngestValidationError(
      'SOURCE_ARTIFACT_MISMATCH',
      'source artifact does not contain the typed sidecar subject_ref',
    );
  }

  const bundle = projectTypedRecordSetV4(typedRecordSet, source.typed_record_set_blob_sha);
  const coverageAssessment = promoteSourceCoverageIfValid(bundle, typedRecordSet);

  return {
    bundle,
    typedRecordSet,
    sourceArtifact,
    source,
    mapperVersion: TYPED_PROJECTOR_VERSION,
    sourceArtifactCompatibility: collectionRunValidation.compatibility,
    coverageAssessment,
  };
}
