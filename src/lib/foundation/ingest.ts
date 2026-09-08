import {
  getFoundationBucket,
  putR2ObjectCreateOnly,
  sha256Hex,
  type FoundationBucketRole,
  type R2WriteResult,
} from '@/lib/storage/r2';

type JsonObject = Record<string, unknown>;

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

export interface IngestedObjectReport {
  logical_role: string;
  dataset_id: string | null;
  bucket: string;
  key: string;
  status: R2WriteResult['status'];
  bytes: number;
  sha256: string;
}

export interface FoundationIngestReport {
  run_id: string;
  objects: IngestedObjectReport[];
  counts: {
    planned: number;
    created: number;
    exists_identical: number;
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
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: JsonObject, key: string): string | null {
  return typeof value[key] === 'string' && value[key].trim() ? value[key].trim() : null;
}

function isDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function validateRecordIds(
  records: JsonObject[],
  field: keyof typeof ID_PATTERNS,
  label: string,
  issues: string[]
): void {
  const pattern = ID_PATTERNS[field];
  records.forEach((record, index) => {
    const value = getString(record, field);
    if (!value) {
      issues.push(`${label}[${index}].${field} is required`);
      return;
    }
    if (!pattern.test(value)) {
      issues.push(`${label}[${index}].${field} has an invalid format`);
    }
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

  if (Array.isArray(input.entities)) validateRecordIds(input.entities.filter(isObject), 'entity_id', 'entities', issues);
  if (Array.isArray(input.claims)) validateRecordIds(input.claims.filter(isObject), 'claim_id', 'claims', issues);
  if (Array.isArray(input.metrics)) validateRecordIds(input.metrics.filter(isObject), 'metric_id', 'metrics', issues);
  if (Array.isArray(moneySignals)) validateRecordIds(moneySignals.filter(isObject), 'money_signal_id', 'money_signals', issues);
  if (Array.isArray(input.events)) validateRecordIds(input.events.filter(isObject), 'event_id', 'events', issues);
  if (Array.isArray(input.relationships)) validateRecordIds(input.relationships.filter(isObject), 'relationship_id', 'relationships', issues);
  if (Array.isArray(input.derived)) validateRecordIds(input.derived.filter(isObject), 'derived_id', 'derived', issues);

  if (issues.length > 0) {
    throw new FoundationBundleValidationError(issues);
  }

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

    encodeBase64(bodyBase64);
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

function normalizedObject(
  role: string,
  datasetId: string,
  bucketRole: FoundationBucketRole,
  key: string,
  body: unknown,
  runId: string
): PlannedFoundationObject {
  return {
    logicalRole: role,
    datasetId,
    bucketRole,
    bucket: getFoundationBucket(bucketRole),
    key,
    body: jsonBytes(body),
    contentType: 'application/json; charset=utf-8',
    metadata: metadata(runId, datasetId, 'v1'),
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
          bundle.run_id
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
          bundle.run_id
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
      bundle.run_id
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
        bundle.run_id
      )
    );
  }

  return planned;
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
  const results: IngestedObjectReport[] = [];

  for (const item of plan) {
    const result = await putR2ObjectCreateOnly({
      bucket: item.bucket,
      key: item.key,
      body: item.body,
      contentType: item.contentType,
      metadata: item.metadata,
    });
    results.push({
      logical_role: item.logicalRole,
      dataset_id: item.datasetId,
      bucket: result.bucket,
      key: result.key,
      status: result.status,
      bytes: result.bytes,
      sha256: result.sha256,
    });
  }

  return {
    run_id: bundle.run_id,
    objects: results,
    counts: {
      planned: plan.length,
      created: results.filter((item) => item.status === 'CREATED').length,
      exists_identical: results.filter((item) => item.status === 'EXISTS_IDENTICAL').length,
    },
  };
}
