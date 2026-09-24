import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  getFoundationBucketAsync,
  putR2MutableView,
  readR2Object,
} from '@/lib/storage/r2';

type JsonObject = Record<string, unknown>;

export type PublicationGateDecision = 'ALLOW_FULL' | 'ALLOW_PARTIAL' | 'HOLD_PUBLIC';

export interface HeldPublicationEvidence {
  evidence_id: string;
  source_id: string | null;
  policy_id: string | null;
  reason_code: string;
}

export interface FoundationPublicationGate {
  schema_version: 'foundation-publication-gate.v1';
  bundle_run_id: string;
  policy_index_version: string;
  evaluated_at: string;
  decision: PublicationGateDecision;
  allowed_evidence_ids: string[];
  held_evidence: HeldPublicationEvidence[];
  policy_ids: string[];
}

export interface PersistedPublicationGate extends FoundationPublicationGate {
  persisted_at: string;
}

const PUBLICATION_GATE_PREFIX = 'views/make-money/v1/publication-gates/';

function objectValue(value: unknown): JsonObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

export function canonicalPublicationJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalPublicationJson).join(',')}]`;
  const object = objectValue(value);
  if (object) {
    return `{${Object.keys(object).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalPublicationJson(object[key])}`
    ).join(',')}}`;
  }
  return JSON.stringify(value);
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return null;
  return [...new Set(value as string[])].sort();
}

export function parsePublicationGate(
  value: unknown,
  expectedRunId?: string,
): FoundationPublicationGate | null {
  const object = objectValue(value);
  if (
    !object ||
    object.schema_version !== 'foundation-publication-gate.v1' ||
    typeof object.bundle_run_id !== 'string' ||
    (expectedRunId && object.bundle_run_id !== expectedRunId) ||
    typeof object.policy_index_version !== 'string' ||
    typeof object.evaluated_at !== 'string' ||
    Number.isNaN(Date.parse(object.evaluated_at)) ||
    !['ALLOW_FULL', 'ALLOW_PARTIAL', 'HOLD_PUBLIC'].includes(String(object.decision))
  ) return null;

  const allowed = stringArray(object.allowed_evidence_ids);
  const policyIds = stringArray(object.policy_ids);
  if (!allowed || !policyIds || !Array.isArray(object.held_evidence)) return null;

  const held: HeldPublicationEvidence[] = [];
  for (const item of object.held_evidence) {
    const row = objectValue(item);
    if (
      !row ||
      typeof row.evidence_id !== 'string' ||
      !(row.source_id === null || typeof row.source_id === 'string') ||
      !(row.policy_id === null || typeof row.policy_id === 'string') ||
      typeof row.reason_code !== 'string'
    ) return null;
    held.push({
      evidence_id: row.evidence_id,
      source_id: row.source_id as string | null,
      policy_id: row.policy_id as string | null,
      reason_code: row.reason_code,
    });
  }

  return {
    schema_version: 'foundation-publication-gate.v1',
    bundle_run_id: object.bundle_run_id,
    policy_index_version: object.policy_index_version,
    evaluated_at: object.evaluated_at,
    decision: object.decision as PublicationGateDecision,
    allowed_evidence_ids: allowed,
    held_evidence: held.sort((a, b) => a.evidence_id.localeCompare(b.evidence_id)),
    policy_ids: policyIds,
  };
}

export function makeFailClosedPublicationGate(
  runId: string,
  reasonCode = 'MISSING_OR_INVALID_SIGNED_PUBLICATION_GATE',
): FoundationPublicationGate {
  return {
    schema_version: 'foundation-publication-gate.v1',
    bundle_run_id: runId,
    policy_index_version: 'unverified',
    evaluated_at: new Date().toISOString(),
    decision: 'HOLD_PUBLIC',
    allowed_evidence_ids: [],
    held_evidence: [{
      evidence_id: '*',
      source_id: null,
      policy_id: null,
      reason_code: reasonCode,
    }],
    policy_ids: [],
  };
}

export function verifyPublicationGateSignature(
  value: unknown,
  signature: unknown,
  secret: string,
  expectedRunId: string,
): FoundationPublicationGate | null {
  const gate = parsePublicationGate(value, expectedRunId);
  if (!gate || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return null;
  const expected = createHmac('sha256', secret).update(canonicalPublicationJson(gate)).digest();
  const supplied = Buffer.from(signature, 'hex');
  if (expected.byteLength !== supplied.byteLength || !timingSafeEqual(expected, supplied)) return null;
  return gate;
}

function publicationGateKey(runId: string): string {
  if (!/^run_[A-Za-z0-9_.:-]+$/.test(runId)) throw new Error('Invalid publication gate run ID');
  return `${PUBLICATION_GATE_PREFIX}${encodeURIComponent(runId)}.json`;
}

export async function readPublicationGate(runId: string): Promise<PersistedPublicationGate | null> {
  const bucket = await getFoundationBucketAsync('lake');
  const object = await readR2Object(bucket, publicationGateKey(runId));
  if (!object) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(object.body)) as unknown;
    const gate = parsePublicationGate(parsed, runId);
    const persistedAt = objectValue(parsed)?.persisted_at;
    if (!gate || typeof persistedAt !== 'string') return null;
    return { ...gate, persisted_at: persistedAt };
  } catch {
    return null;
  }
}

export async function persistPublicationGate(
  gate: FoundationPublicationGate,
): Promise<{ status: string; key: string }> {
  const bucket = await getFoundationBucketAsync('lake');
  const key = publicationGateKey(gate.bundle_run_id);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await readR2Object(bucket, key);
    let existingGate: PersistedPublicationGate | null = null;
    if (existing) {
      try {
        const parsed = JSON.parse(new TextDecoder().decode(existing.body)) as unknown;
        const gatePart = parsePublicationGate(parsed, gate.bundle_run_id);
        const persistedAt = objectValue(parsed)?.persisted_at;
        if (gatePart && typeof persistedAt === 'string') existingGate = { ...gatePart, persisted_at: persistedAt };
      } catch {
        existingGate = null;
      }
    }

    // A delayed Publisher replay cannot replace a newer policy evaluation.
    if (existingGate && Date.parse(existingGate.evaluated_at) > Date.parse(gate.evaluated_at)) {
      return { status: 'UNCHANGED_NEWER_GATE', key };
    }

    const body: PersistedPublicationGate = {
      ...gate,
      persisted_at: existingGate?.persisted_at || new Date().toISOString(),
    };

    try {
      const result = await putR2MutableView({
        bucket,
        key,
        body: JSON.stringify(body),
        contentType: 'application/json',
        metadata: {
          'foundation-view-consumer': 'make-money',
          'foundation-publication-gate': 'true',
          'foundation-run-id': gate.bundle_run_id,
          'foundation-policy-index-version': gate.policy_index_version,
          'foundation-publication-decision': gate.decision,
        },
      }, {
        expectedEtag: existing?.etag ?? null,
      });
      return { status: result.status, key };
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  throw new Error('Publication gate persistence retries exhausted');
}

function evidenceIds(value: JsonObject): string[] {
  return Array.isArray(value.evidence_ids)
    ? value.evidence_ids.filter((item): item is string => typeof item === 'string')
    : [];
}

function retainStrictRecord(record: unknown, allowed: Set<string>): JsonObject | null {
  const row = objectValue(record);
  if (!row) return null;
  const ids = evidenceIds(row);
  if (ids.length === 0 || !ids.every((id) => allowed.has(id))) return null;
  return { ...row, evidence_ids: ids };
}

function stripTransportFields(row: JsonObject): JsonObject {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !key.startsWith('transport_'))
  );
}

/**
 * Build a rebuildable public projection input. The private canonical bundle is
 * never modified. Any record whose evidence set is not wholly rights-cleared
 * is withheld rather than partially reinterpreted.
 */
export function filterBundleForPublication(
  bundleInput: unknown,
  gate: FoundationPublicationGate,
): JsonObject | null {
  const bundle = objectValue(bundleInput);
  if (!bundle || gate.decision === 'HOLD_PUBLIC' || gate.allowed_evidence_ids.length === 0) return null;

  const allowed = new Set(gate.allowed_evidence_ids);
  const evidence = Array.isArray(bundle.evidence)
    ? bundle.evidence.map(objectValue).filter((row): row is JsonObject => Boolean(row))
      .filter((row) => typeof row.evidence_id === 'string' && allowed.has(row.evidence_id))
    : [];
  const allowedSourceIds = new Set(
    evidence.map((row) => typeof row.source_id === 'string' ? row.source_id : null)
      .filter((id): id is string => Boolean(id))
  );
  const sources = Array.isArray(bundle.sources)
    ? bundle.sources.map(objectValue).filter((row): row is JsonObject => Boolean(row))
      .filter((row) => typeof row.source_id === 'string' && allowedSourceIds.has(row.source_id))
    : [];

  const entities = Array.isArray(bundle.entities)
    ? bundle.entities.map(objectValue).filter((row): row is JsonObject => Boolean(row))
      .map((row) => {
        const ids = evidenceIds(row).filter((id) => allowed.has(id));
        return ids.length > 0 ? { ...row, evidence_ids: ids } : null;
      })
      .filter((row): row is JsonObject => Boolean(row))
    : [];
  const retainedEntityIds = new Set(
    entities.map((row) => typeof row.entity_id === 'string' ? row.entity_id : null)
      .filter((id): id is string => Boolean(id))
  );

  const refsAreRetained = (row: JsonObject): boolean => {
    const refs = [
      typeof row.entity_id === 'string' ? row.entity_id : null,
      ...(Array.isArray(row.entity_ids) ? row.entity_ids.filter((id): id is string => typeof id === 'string') : []),
      typeof row.payer_entity_id === 'string' ? row.payer_entity_id : null,
      typeof row.receiver_entity_id === 'string' ? row.receiver_entity_id : null,
      typeof row.subject_entity_id === 'string' ? row.subject_entity_id : null,
      typeof row.object_entity_id === 'string' ? row.object_entity_id : null,
    ].filter((id): id is string => Boolean(id));
    return refs.length === 0 || refs.every((id) => retainedEntityIds.has(id));
  };

  const filterGroup = (value: unknown, sanitize = false): JsonObject[] =>
    Array.isArray(value)
      ? value.map((row) => retainStrictRecord(row, allowed))
        .filter((row): row is JsonObject => Boolean(row))
        .filter(refsAreRetained)
        .map((row) => sanitize ? stripTransportFields(row) : row)
      : [];

  const claims = filterGroup(bundle.claims);
  const retainedClaimIds = new Set(
    claims.map((row) => typeof row.claim_id === 'string' ? row.claim_id : null)
      .filter((id): id is string => Boolean(id))
  );

  const derived = Array.isArray(bundle.derived)
    ? bundle.derived.map(objectValue).filter((row): row is JsonObject => Boolean(row))
      .filter((row) => {
        const supportEvidence = Array.isArray(row.supporting_evidence_ids)
          ? row.supporting_evidence_ids.filter((id): id is string => typeof id === 'string')
          : [];
        const supportClaims = Array.isArray(row.supporting_claim_ids)
          ? row.supporting_claim_ids.filter((id): id is string => typeof id === 'string')
          : [];
        return supportEvidence.length > 0 &&
          supportEvidence.every((id) => allowed.has(id)) &&
          supportClaims.every((id) => retainedClaimIds.has(id));
      })
    : [];

  return {
    ...bundle,
    sources,
    evidence,
    entities,
    claims,
    metrics: filterGroup(bundle.metrics),
    money_signals: filterGroup(bundle.money_signals),
    events: filterGroup(bundle.events),
    relationships: filterGroup(bundle.relationships),
    observations: filterGroup(bundle.observations, true),
    derived,
  };
}
