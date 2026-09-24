import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import researchBundleSchema from './schemas/research-bundle.v1.schema.json';
import typedRecordSetSchema from './schemas/typed-record-set.v1.schema.json';
import { sha256Sync } from '@/shared/sha256';

type JsonObject = Record<string, unknown>;

export const TYPED_SOURCE_REPOSITORY = 'salve-de/universal-foundation';
export const TYPED_PROJECTOR_VERSION = 'r2-queue-mapper-v4';
export const TYPED_COVERAGE_ASSESSMENT = 'UNASSESSED' as const;

export interface FoundationTypedSourceDescriptor {
  repository: string;
  source_ref: string;
  source_commit_sha: string;
  typed_record_set_path: string;
  typed_record_set_blob_sha: string;
  source_artifact_path: string;
  source_artifact_blob_sha: string;
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
  coverageAssessment: typeof TYPED_COVERAGE_ASSESSMENT;
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

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(researchBundleSchema);
const validateTypedRecordSet = ajv.compile(typedRecordSetSchema);
const validateResearchBundleSchema = ajv.compile(researchBundleSchema);

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: JsonObject, key: string): string | null {
  const candidate = value[key];
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

function schemaErrors(
  validator: { errors?: Array<{ instancePath?: string; message?: string }> | null },
): string[] {
  return (validator.errors || [])
    .slice(0, 20)
    .map((error) => `${error.instancePath || '/'} ${error.message || 'invalid'}`);
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
    .update(Buffer.from(`blob ${bytes.byteLength}\\0`, 'utf8'))
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
      return {
        ...cloneJson(observation),
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
    entities: cloneJson(Array.isArray(typedRecordSet.entities) ? typedRecordSet.entities : []),
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

  if (!validateResearchBundleSchema(bundle)) {
    const issues = schemaErrors(validateResearchBundleSchema);
    throw new FoundationTypedIngestValidationError(
      'PROJECTION_SCHEMA_INVALID',
      `projected research-bundle.v1 is invalid: ${issues.join('; ')}`,
      issues,
    );
  }

  return bundle;
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

  if (repository !== TYPED_SOURCE_REPOSITORY) {
    throw new FoundationTypedIngestValidationError('REQUEST_INVALID', 'unexpected source repository');
  }
  if (sourceRef !== 'main') {
    throw new FoundationTypedIngestValidationError('REQUEST_INVALID', 'source_ref must be main');
  }
  assertGitSha(sourceCommitSha, 'source_commit_sha');
  assertGitSha(typedBlob, 'typed_record_set_blob_sha');
  assertGitSha(artifactBlob, 'source_artifact_blob_sha');
  assertSafeRepoPath(typedPath, 'typed_record_set_path');
  assertSafeRepoPath(artifactPath, 'source_artifact_path');

  return {
    repository,
    source_ref: sourceRef,
    source_commit_sha: sourceCommitSha,
    typed_record_set_path: typedPath,
    typed_record_set_blob_sha: typedBlob,
    source_artifact_path: artifactPath,
    source_artifact_blob_sha: artifactBlob,
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
  if (!validateTypedRecordSet(typedRecordSet)) {
    const issues = schemaErrors(validateTypedRecordSet);
    throw new FoundationTypedIngestValidationError(
      'SOURCE_SCHEMA_INVALID',
      `typed-record-set.v1 schema validation failed: ${issues.join('; ')}`,
      issues,
    );
  }

  const sourceArtifact = parseJsonObject(
    request.source_artifact_text,
    'SOURCE_JSON_INVALID',
    'source_artifact_text',
  );

  const sourceArtifactRef = isObject(typedRecordSet.source_artifact)
    ? typedRecordSet.source_artifact
    : {};
  const sourceRunId = stringValue(typedRecordSet, 'source_run_id');
  const subjectRef = stringValue(typedRecordSet, 'subject_ref');
  const lane = stringValue(sourceArtifactRef, 'lane');

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

  const recordedItems = Array.isArray(sourceArtifact.recorded_items)
    ? sourceArtifact.recorded_items.filter(isObject)
    : [];
  const recordedSubjectRefs = recordedItems
    .map((item) => stringValue(item, 'subject_ref'))
    .filter((item): item is string => Boolean(item));
  if (recordedSubjectRefs.length > 0 && !recordedSubjectRefs.includes(subjectRef)) {
    throw new FoundationTypedIngestValidationError(
      'SOURCE_ARTIFACT_MISMATCH',
      'source artifact does not contain the typed sidecar subject_ref',
    );
  }

  return {
    bundle: projectTypedRecordSetV4(typedRecordSet, source.typed_record_set_blob_sha),
    typedRecordSet,
    sourceArtifact,
    source,
    mapperVersion: TYPED_PROJECTOR_VERSION,
    coverageAssessment: TYPED_COVERAGE_ASSESSMENT,
  };
}
