import {
  getFoundationBucket,
  getFromR2,
  listR2Objects,
  readR2ObjectRange,
  type R2ListObject,
} from '@/lib/storage/r2';
import { foundationDataset } from '@/lib/foundation/dataset-registry';

type JsonObject = Record<string, unknown>;

export type FoundationVerificationStatus =
  | 'SUPPORTED'
  | 'CONFLICTED'
  | 'UNVERIFIED'
  | 'SUPERSEDED'
  | 'RETRACTED'
  | 'unknown';

export interface FoundationEntitySummary {
  id: string;
  name: string;
  entityType: string;
  aliases: string[];
  canonicalIdentifier: string | null;
  domain: string | null;
  status: string;
  observedAt: string | null;
  evidenceIds: string[];
}

export interface FoundationMetricSignal {
  id: string;
  metricType: string;
  value: number | string | null;
  unit: string | null;
  currency: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  pointInTime: string | null;
  basis: string | null;
  scope: string | null;
  originType: string;
  verificationStatus: FoundationVerificationStatus;
  confidence: number | null;
  evidenceIds: string[];
}

export interface FoundationClaim {
  id: string;
  statement: string;
  originType: string;
  verificationStatus: FoundationVerificationStatus;
  confidence: number | null;
  occurredAt: string | null;
  evidenceIds: string[];
}

export interface FoundationMoneySignal {
  id: string;
  payerEntityId: string | null;
  receiverEntityId: string | null;
  purpose: string | null;
  moneyType: string;
  amount: number | string | null;
  currency: string | null;
  unit: string | null;
  amountLabel: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  pointInTime: string | null;
  basis: string | null;
  scope: string | null;
  originType: string;
  verificationStatus: FoundationVerificationStatus;
  confidence: number | null;
  evidenceIds: string[];
}

export interface FoundationEvent {
  id: string;
  eventType: string;
  occurredAt: string | null;
  description: string;
  verificationStatus: FoundationVerificationStatus;
  confidence: number | null;
  evidenceIds: string[];
}

export interface FoundationRelationship {
  id: string;
  subjectEntityId: string | null;
  predicate: string;
  object: string | null;
  validFrom: string | null;
  validTo: string | null;
  verificationStatus: FoundationVerificationStatus;
  confidence: number | null;
  evidenceIds: string[];
}

export interface FoundationObservation {
  id: string;
  kind: string | null;
  text: string;
  originType: string;
  verificationStatus: FoundationVerificationStatus;
  observedAt: string | null;
  collectionTier: string | null;
  collectionChannel: string | null;
  evidenceIds: string[];
}

export interface FoundationDerivedRecord {
  id: string;
  type: string;
  text: string;
  originType: string;
  confidence: number | null;
  supportingClaimIds: string[];
  supportingEvidenceIds: string[];
}

export interface FoundationBusinessCase extends FoundationEntitySummary {
  claims: FoundationClaim[];
  metrics: FoundationMetricSignal[];
  moneySignals: FoundationMoneySignal[];
  events: FoundationEvent[];
  relationships: FoundationRelationship[];
  observations: FoundationObservation[];
  derived: FoundationDerivedRecord[];
  bundlesScanned: number;
  bundleObjectsListed: number;
}

export interface FoundationEntityPage {
  data: FoundationEntitySummary[];
  nextCursor: string | null;
  hasMore: boolean;
}

const ENTITY_DATASET = foundationDataset('entities');
const BUNDLE_DATASET = foundationDataset('researchBundles');
const LAKE_BUCKET = getFoundationBucket(ENTITY_DATASET.bucketRole);
const ENTITY_PREFIX = ENTITY_DATASET.prefix;
const BUNDLE_PREFIX = BUNDLE_DATASET.prefix;
const BUNDLE_PROBE_BYTES = 131072;
const BUNDLE_LIST_LIMIT = 1000;
const MAX_BUNDLE_LIST_PAGES = 128;
// A larger bounded fan-out keeps a cold detail read responsive without
// issuing an unbounded burst against R2.
const BUNDLE_SCAN_BATCH_SIZE = 96;
const MAX_PROBE_CACHE_ENTRIES = 512;
const MAX_BUNDLE_CACHE_ENTRIES = 160;

function objectValue(value: unknown): JsonObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function stringValue(value: JsonObject, key: string): string | null {
  const candidate = value[key];
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

function stringArray(value: JsonObject, key: string): string[] {
  return Array.isArray(value[key])
    ? value[key].filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function numberValue(value: JsonObject, key: string): number | null {
  const candidate = value[key];
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null;
}

function numberOrStringValue(value: JsonObject, key: string): number | string | null {
  const candidate = value[key];
  if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  return null;
}

function verificationStatus(value: JsonObject): FoundationVerificationStatus {
  const status = stringValue(value, 'verification_status')?.toUpperCase();
  return status === 'SUPPORTED' ||
    status === 'CONFLICTED' ||
    status === 'UNVERIFIED' ||
    status === 'SUPERSEDED' ||
    status === 'RETRACTED'
    ? status
    : 'unknown';
}

function normalizeSummary(value: JsonObject): FoundationEntitySummary | null {
  const id = stringValue(value, 'entity_id');
  if (!id) return null;
  return {
    id,
    name: stringValue(value, 'canonical_name') || id,
    entityType: stringValue(value, 'entity_type') || 'unknown',
    aliases: stringArray(value, 'aliases'),
    canonicalIdentifier: stringValue(value, 'canonical_identifier'),
    domain: stringValue(value, 'domain'),
    status: stringValue(value, 'status') || 'unknown',
    observedAt: stringValue(value, 'observed_at'),
    evidenceIds: stringArray(value, 'evidence_ids'),
  };
}

function parseObject(text: string | null): JsonObject | null {
  if (!text) return null;
  try {
    return objectValue(JSON.parse(text));
  } catch {
    return null;
  }
}

/** Parse one top-level JSON array from a bounded immutable-object probe. */
function parseArrayField(text: string, field: string): unknown[] | undefined {
  const markerIndex = text.indexOf(`"${field}"`);
  if (markerIndex < 0) return undefined;
  const start = text.indexOf('[', markerIndex);
  if (start < 0) return undefined;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '[') depth += 1;
    else if (character === ']') {
      depth -= 1;
      if (depth === 0) {
        try {
          const value: unknown = JSON.parse(text.slice(start, index + 1));
          return Array.isArray(value) ? value : undefined;
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

async function readJsonObject(key: string): Promise<JsonObject | null> {
  return parseObject(await getFromR2(key, LAKE_BUCKET));
}

async function readJsonProbe(key: string): Promise<string | null> {
  const object = await readR2ObjectRange(LAKE_BUCKET, key, {
    offset: 0,
    length: BUNDLE_PROBE_BYTES,
  });
  return object ? new TextDecoder().decode(object.body) : null;
}

function entityKey(id: string): string {
  return `${ENTITY_PREFIX}${encodeURIComponent(id)}.json`;
}

async function readEntityPage(cursor: string | undefined, limit: number): Promise<FoundationEntityPage> {
  const page = await listR2Objects({
    bucket: LAKE_BUCKET,
    prefix: ENTITY_PREFIX,
    cursor,
    limit,
  });

  const data = (
    await Promise.all(
      page.objects
        .filter((item) => item.key.endsWith('.json'))
        .map(async (item) => normalizeSummary((await readJsonObject(item.key)) || {}))
    )
  ).filter((item): item is FoundationEntitySummary => Boolean(item));

  const nextCursor = page.truncated && page.cursor ? page.cursor : null;
  return { data, nextCursor, hasMore: Boolean(nextCursor) };
}

export async function readFoundationEntityPage(options: {
  cursor?: string;
  limit?: number;
} = {}): Promise<FoundationEntityPage> {
  const limit = Math.min(Math.max(1, Math.floor(options.limit ?? 100)), 100);
  return readEntityPage(options.cursor, limit);
}

function recordMentionsEntity(value: JsonObject, entityId: string): boolean {
  return stringValue(value, 'entity_id') === entityId ||
    stringArray(value, 'entity_ids').includes(entityId) ||
    stringValue(value, 'payer_entity_id') === entityId ||
    stringValue(value, 'receiver_entity_id') === entityId ||
    stringValue(value, 'subject_entity_id') === entityId ||
    stringValue(value, 'object_entity_id') === entityId;
}

function filteredRecords(bundle: JsonObject, key: string, entityId: string): JsonObject[] {
  const values = bundle[key];
  return Array.isArray(values)
    ? values.map(objectValue).filter((value): value is JsonObject => Boolean(value && recordMentionsEntity(value, entityId)))
    : [];
}

function normalizeMetric(value: JsonObject): FoundationMetricSignal | null {
  const id = stringValue(value, 'metric_id');
  if (!id) return null;
  return {
    id,
    metricType: stringValue(value, 'metric_type') || 'unknown',
    value: numberOrStringValue(value, 'value'),
    unit: stringValue(value, 'unit'),
    currency: stringValue(value, 'currency'),
    periodStart: stringValue(value, 'period_start'),
    periodEnd: stringValue(value, 'period_end'),
    pointInTime: stringValue(value, 'point_in_time'),
    basis: stringValue(value, 'basis'),
    scope: stringValue(value, 'scope'),
    originType: stringValue(value, 'origin_type') || 'unknown',
    verificationStatus: verificationStatus(value),
    confidence: numberValue(value, 'confidence'),
    evidenceIds: stringArray(value, 'evidence_ids'),
  };
}

function normalizeClaim(value: JsonObject): FoundationClaim | null {
  const id = stringValue(value, 'claim_id');
  if (!id) return null;
  return {
    id,
    statement: stringValue(value, 'statement') || '未確認の主張',
    originType: stringValue(value, 'origin_type') || 'unknown',
    verificationStatus: verificationStatus(value),
    confidence: numberValue(value, 'confidence'),
    occurredAt: stringValue(value, 'occurred_at'),
    evidenceIds: stringArray(value, 'evidence_ids'),
  };
}

function normalizeMoneySignal(value: JsonObject): FoundationMoneySignal | null {
  const id = stringValue(value, 'money_signal_id');
  if (!id) return null;
  return {
    id,
    payerEntityId: stringValue(value, 'payer_entity_id'),
    receiverEntityId: stringValue(value, 'receiver_entity_id'),
    purpose: stringValue(value, 'purpose'),
    moneyType: stringValue(value, 'money_type') || 'unknown',
    amount: numberOrStringValue(value, 'amount'),
    currency: stringValue(value, 'currency'),
    unit: stringValue(value, 'unit'),
    amountLabel: stringValue(value, 'amount_label'),
    periodStart: stringValue(value, 'period_start'),
    periodEnd: stringValue(value, 'period_end'),
    pointInTime: stringValue(value, 'point_in_time'),
    basis: stringValue(value, 'basis'),
    scope: stringValue(value, 'scope'),
    originType: stringValue(value, 'origin_type') || 'unknown',
    verificationStatus: verificationStatus(value),
    confidence: numberValue(value, 'confidence'),
    evidenceIds: stringArray(value, 'evidence_ids'),
  };
}

function normalizeEvent(value: JsonObject): FoundationEvent | null {
  const id = stringValue(value, 'event_id');
  if (!id) return null;
  return {
    id,
    eventType: stringValue(value, 'event_type') || 'unknown',
    occurredAt: stringValue(value, 'occurred_at'),
    description: stringValue(value, 'description') || '説明未確認',
    verificationStatus: verificationStatus(value),
    confidence: numberValue(value, 'confidence'),
    evidenceIds: stringArray(value, 'evidence_ids'),
  };
}

function normalizeRelationship(value: JsonObject): FoundationRelationship | null {
  const id = stringValue(value, 'relationship_id');
  if (!id) return null;
  return {
    id,
    subjectEntityId: stringValue(value, 'subject_entity_id'),
    predicate: stringValue(value, 'predicate') || 'unknown',
    object: stringValue(value, 'object'),
    validFrom: stringValue(value, 'valid_from'),
    validTo: stringValue(value, 'valid_to'),
    verificationStatus: verificationStatus(value),
    confidence: numberValue(value, 'confidence'),
    evidenceIds: stringArray(value, 'evidence_ids'),
  };
}

function fallbackRecordId(prefix: string, value: JsonObject): string {
  const serialized = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function normalizeObservation(value: JsonObject): FoundationObservation {
  return {
    id: stringValue(value, 'observation_id') || stringValue(value, 'id') || fallbackRecordId('observation', value),
    kind: stringValue(value, 'kind'),
    text: stringValue(value, 'text') || '観測内容未確認',
    originType: stringValue(value, 'origin_type') || 'unknown',
    verificationStatus: verificationStatus(value),
    observedAt: stringValue(value, 'observed_at'),
    collectionTier: stringValue(value, 'collection_tier'),
    collectionChannel: stringValue(value, 'collection_channel'),
    evidenceIds: stringArray(value, 'evidence_ids'),
  };
}

function normalizeDerived(value: JsonObject): FoundationDerivedRecord | null {
  const id = stringValue(value, 'derived_id');
  if (!id) return null;
  return {
    id,
    type: stringValue(value, 'derived_type') || 'unknown',
    text: stringValue(value, 'text') || '派生内容未確認',
    originType: stringValue(value, 'origin_type') || 'inferred',
    confidence: numberValue(value, 'confidence'),
    supportingClaimIds: stringArray(value, 'supporting_claim_ids'),
    supportingEvidenceIds: stringArray(value, 'supporting_evidence_ids'),
  };
}

function pushUnique<T extends { id: string }>(target: T[], values: T[]): void {
  const seen = new Set(target.map((item) => item.id));
  for (const value of values) {
    if (!seen.has(value.id)) {
      target.push(value);
      seen.add(value.id);
    }
  }
}

function bundleContainsEntity(bundle: JsonObject, entityId: string): boolean {
  return ['entities', 'claims', 'metrics', 'money_signals', 'events', 'relationships', 'observations', 'derived']
    .some((key) => filteredRecords(bundle, key, entityId).length > 0);
}

interface BundleProbe {
  knownEntityIds: Set<string>;
  entitiesArrayPresent: boolean;
  typedArraysComplete: boolean;
}

const PROBE_RECORD_FIELDS = [
  'claims',
  'metrics',
  'money_signals',
  'events',
  'relationships',
  'observations',
  'derived',
];

function collectMentionedIds(target: Set<string>, values: unknown[] | undefined): void {
  if (!values) return;
  for (const item of values) {
    const record = objectValue(item);
    if (!record) continue;
    const directId = stringValue(record, 'entity_id');
    if (directId) target.add(directId);
    for (const entityId of stringArray(record, 'entity_ids')) target.add(entityId);
    for (const key of ['payer_entity_id', 'receiver_entity_id', 'subject_entity_id', 'object_entity_id']) {
      const entityId = stringValue(record, key);
      if (entityId) target.add(entityId);
    }
  }
}

function probeFromText(text: string | null): BundleProbe | null {
  if (text === null) return null;
  const entities = parseArrayField(text, 'entities');
  const typed = PROBE_RECORD_FIELDS.map((field) => parseArrayField(text, field));
  const knownEntityIds = new Set<string>();
  collectMentionedIds(knownEntityIds, entities);
  typed.forEach((values) => collectMentionedIds(knownEntityIds, values));
  return {
    knownEntityIds,
    entitiesArrayPresent: entities !== undefined,
    typedArraysComplete: typed.every((values) => values !== undefined),
  };
}

const probeCache = new Map<string, Promise<BundleProbe | null>>();

function cachedProbe(key: string): Promise<BundleProbe | null> {
  const existing = probeCache.get(key);
  if (existing) return existing;
  const pending = readJsonProbe(key).then(probeFromText).catch(() => null);
  probeCache.set(key, pending);
  if (probeCache.size > MAX_PROBE_CACHE_ENTRIES) {
    const oldest = probeCache.keys().next().value;
    if (oldest) probeCache.delete(oldest);
  }
  return pending;
}

function probeContainsEntity(probe: BundleProbe | null, entityId: string): boolean | null {
  if (!probe) return false;
  if (probe.knownEntityIds.has(entityId)) return true;
  if (probe.entitiesArrayPresent) return false;
  return probe.typedArraysComplete ? false : null;
}

const bundleCache = new Map<string, Promise<JsonObject | null>>();

function cachedBundle(key: string): Promise<JsonObject | null> {
  const existing = bundleCache.get(key);
  if (existing) return existing;
  const pending = readJsonObject(key).catch(() => null);
  bundleCache.set(key, pending);
  if (bundleCache.size > MAX_BUNDLE_CACHE_ENTRIES) {
    const oldest = bundleCache.keys().next().value;
    if (oldest) bundleCache.delete(oldest);
  }
  return pending;
}

async function fetchBundleObjects(): Promise<R2ListObject[]> {
  const objects: R2ListObject[] = [];
  let cursor: string | undefined;
  for (let pageNumber = 0; pageNumber < MAX_BUNDLE_LIST_PAGES; pageNumber += 1) {
    const page = await listR2Objects({
      bucket: LAKE_BUCKET,
      prefix: BUNDLE_PREFIX,
      cursor,
      limit: BUNDLE_LIST_LIMIT,
    });
    objects.push(...page.objects.filter((item) => item.key.endsWith('.json')));
    if (!page.truncated || !page.cursor) break;
    cursor = page.cursor;
  }
  return objects.sort((left, right) => right.key.localeCompare(left.key));
}

let bundleObjectsPromise: Promise<R2ListObject[]> | undefined;

function listBundleObjects(): Promise<R2ListObject[]> {
  if (!bundleObjectsPromise) {
    bundleObjectsPromise = fetchBundleObjects().catch((error) => {
      bundleObjectsPromise = undefined;
      throw error;
    });
  }
  return bundleObjectsPromise;
}

interface FoundationRecordAccumulator {
  claims: FoundationClaim[];
  metrics: FoundationMetricSignal[];
  moneySignals: FoundationMoneySignal[];
  events: FoundationEvent[];
  relationships: FoundationRelationship[];
  observations: FoundationObservation[];
  derived: FoundationDerivedRecord[];
}

function collectBundleRecords(bundle: JsonObject, entityId: string, target: FoundationRecordAccumulator): void {
  pushUnique(target.claims, filteredRecords(bundle, 'claims', entityId).map(normalizeClaim).filter((item): item is FoundationClaim => Boolean(item)));
  pushUnique(target.metrics, filteredRecords(bundle, 'metrics', entityId).map(normalizeMetric).filter((item): item is FoundationMetricSignal => Boolean(item)));
  pushUnique(target.moneySignals, filteredRecords(bundle, 'money_signals', entityId).map(normalizeMoneySignal).filter((item): item is FoundationMoneySignal => Boolean(item)));
  pushUnique(target.events, filteredRecords(bundle, 'events', entityId).map(normalizeEvent).filter((item): item is FoundationEvent => Boolean(item)));
  pushUnique(target.relationships, filteredRecords(bundle, 'relationships', entityId).map(normalizeRelationship).filter((item): item is FoundationRelationship => Boolean(item)));
  pushUnique(target.observations, filteredRecords(bundle, 'observations', entityId).map(normalizeObservation));
  pushUnique(target.derived, filteredRecords(bundle, 'derived', entityId).map(normalizeDerived).filter((item): item is FoundationDerivedRecord => Boolean(item)));
}

export async function readFoundationBusinessCase(entityId: string): Promise<FoundationBusinessCase | null> {
  if (!/^ent_[a-z0-9]+_[a-f0-9]{20}$/.test(entityId)) return null;
  const entity = normalizeSummary((await readJsonObject(entityKey(entityId))) || {});
  if (!entity) return null;

  const records: FoundationRecordAccumulator = {
    claims: [],
    metrics: [],
    moneySignals: [],
    events: [],
    relationships: [],
    observations: [],
    derived: [],
  };
  const bundleObjects = await listBundleObjects();
  let bundlesScanned = 0;

  for (let index = 0; index < bundleObjects.length; index += BUNDLE_SCAN_BATCH_SIZE) {
    const batch = bundleObjects.slice(index, index + BUNDLE_SCAN_BATCH_SIZE);
    const probes = await Promise.all(batch.map((item) => cachedProbe(item.key)));
    bundlesScanned += batch.length;
    const candidateKeys = batch
      .filter((_, batchIndex) => probeContainsEntity(probes[batchIndex], entityId) !== false)
      .map((item) => item.key);
    const bundles = await Promise.all(candidateKeys.map((key) => cachedBundle(key)));
    for (const bundle of bundles) {
      if (bundle && bundleContainsEntity(bundle, entityId)) collectBundleRecords(bundle, entityId, records);
    }
  }

  return {
    ...entity,
    ...records,
    bundlesScanned,
    bundleObjectsListed: bundleObjects.length,
  };
}
