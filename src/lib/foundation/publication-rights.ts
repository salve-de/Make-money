import observationContracts from '../../../data/foundation-public-observation-contracts.json';
import rightsSnapshot from '../../../data/foundation-public-rights-snapshot.json';

type JsonObject = Record<string, unknown>;

export type CommercialPublicProjectionStatus = 'ALLOWED' | 'RIGHTS_HELD';

export interface CommercialPublicProjectionAssessment {
  status: CommercialPublicProjectionStatus;
  allowedEvidenceIds: string[];
  heldEvidenceIds: string[];
  reasons: string[];
}

/**
 * Runtime snapshot of Universal Foundation policies that are safe to
 * auto-admit for commercial fact display without an additional condition.
 *
 * Policies marked restricted/conditional in Universal Foundation are
 * intentionally NOT auto-admitted here. They can be added only after the
 * exact condition can be proven mechanically.
 */
export interface AutoPublicFactPolicy {
  sourceId: string;
  providerName: string;
  allowedSourceTypes: string[];
  allowedHostSuffixes: string[];
}

export const AUTO_PUBLIC_FACT_POLICIES = new Map<string, AutoPublicFactPolicy>(
  rightsSnapshot.records
    .filter((record) =>
      record.policy.status === 'approved' &&
      record.policy.commercial_use === 'allowed' &&
      record.policy.public_fact_display === 'allowed' &&
      record.source.status === 'active' &&
      record.source.source_id === record.policy.source_id &&
      record.source.rights_policy_ids.includes(record.policy.policy_id) &&
      /^[a-f0-9]{40}$/.test(record.policy.blob_sha) &&
      /^[a-f0-9]{40}$/.test(record.source.blob_sha)
    )
    .map((record) => [
      record.policy.policy_id,
      {
        sourceId: record.source.source_id,
        providerName: record.source.provider_name,
        allowedSourceTypes: [...record.source.source_types],
        allowedHostSuffixes: [...record.allowed_host_suffixes],
      },
    ]),
);

function objectValue(value: unknown): JsonObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function urlMatchesPolicy(value: unknown, policy: AutoPublicFactPolicy): boolean {
  const raw = text(value);
  if (!raw) return false;
  try {
    const hostname = new URL(raw).hostname.toLowerCase().replace(/\.$/, '');
    return policy.allowedHostSuffixes.some((suffix) => {
      const normalized = suffix.toLowerCase().replace(/^\./, '');
      return hostname === normalized || hostname.endsWith(`.${normalized}`);
    });
  } catch {
    return false;
  }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

type PublicObservationFieldRule = {
  sourcePath: readonly string[];
  publicPath?: readonly string[];
  kind: 'finite_number' | 'currency_code' | 'boolean';
  required?: boolean;
};

type PublicObservationTypePolicy = {
  fields: readonly PublicObservationFieldRule[];
};

function publicObservationPolicies(): Readonly<Record<string, PublicObservationTypePolicy>> {
  const result: Record<string, PublicObservationTypePolicy> = {};
  for (const contract of observationContracts.contracts) {
    if (contract.status !== 'approved') continue;
    if (!contract.observation_type || result[contract.observation_type]) continue;
    const fields = (contract.fields as Array<{
      source_path: string[];
      public_path?: string[];
      kind: PublicObservationFieldRule['kind'];
      required?: boolean;
    }>).map((field) => ({
      sourcePath: [...field.source_path],
      ...(field.public_path ? { publicPath: [...field.public_path] } : {}),
      kind: field.kind,
      ...(field.required ? { required: true } : {}),
    })) as PublicObservationFieldRule[];
    if (fields.length === 0) continue;
    result[contract.observation_type] = Object.freeze({
      fields: Object.freeze(fields.map((field) => Object.freeze(field))),
    });
  }
  return Object.freeze(result);
}

/**
 * Public Observation DTOs are schema-projected, never payload-sanitized.
 *
 * The contract registry is data-driven so a reviewed Observation type can be
 * added without changing executable publication code. Unknown types and
 * unknown fields remain fail-closed.
 */
export const PUBLIC_OBSERVATION_TYPE_POLICIES = publicObservationPolicies();

const PUBLIC_OBSERVATION_MAX_BYTES = 12 * 1024;

function readPath(input: JsonObject, path: readonly string[]): unknown {
  let current: unknown = input;
  for (const segment of path) {
    const object = objectValue(current);
    if (!object || !Object.prototype.hasOwnProperty.call(object, segment)) return undefined;
    current = object[segment];
  }
  return current;
}

function writePath(target: JsonObject, path: readonly string[], value: unknown): void {
  if (path.length === 0) return;
  let current = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    const next = objectValue(current[segment]);
    if (next) {
      current = next;
      continue;
    }
    const created: JsonObject = {};
    current[segment] = created;
    current = created;
  }
  current[path[path.length - 1]] = value;
}

function projectPublicObservationField(
  value: unknown,
  kind: PublicObservationFieldRule['kind'],
): unknown | undefined {
  if (kind === 'finite_number') {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }
  if (kind === 'boolean') {
    return typeof value === 'boolean' ? value : undefined;
  }
  if (kind === 'currency_code') {
    if (typeof value !== 'string' || value !== value.trim()) return undefined;
    return /^[A-Z]{3}$/.test(value) ? value : undefined;
  }
  return undefined;
}

function buildPublicObservationPayload(
  observationType: string,
  value: unknown,
): JsonObject | null {
  const policy = PUBLIC_OBSERVATION_TYPE_POLICIES[observationType];
  const input = objectValue(value);
  if (!policy || !input) return null;

  const publicPayload: JsonObject = {};
  for (const field of policy.fields) {
    const projected = projectPublicObservationField(
      readPath(input, field.sourcePath),
      field.kind,
    );
    if (projected === undefined) {
      if (field.required) return null;
      continue;
    }
    writePath(publicPayload, field.publicPath || field.sourcePath, projected);
  }

  if (Object.keys(publicPayload).length === 0) return null;
  const bytes = new TextEncoder().encode(JSON.stringify(publicPayload)).byteLength;
  return bytes <= PUBLIC_OBSERVATION_MAX_BYTES ? publicPayload : null;
}

function compactPublicObservationText(
  observationType: string,
  publicPayload: JsonObject,
): string {
  const parts = Object.entries(publicPayload).slice(0, 4).map(([key, value]) => {
    const rendered = value !== null && typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);
    return `${key}=${rendered}`;
  });
  return [observationType, ...parts].join(' · ').slice(0, 240);
}

function buildCommercialPublicObservation(
  value: JsonObject,
  allowed: Set<string>,
): JsonObject | null {
  if (!recordUsesOnlyAllowedEvidence(value, allowed)) return null;

  const observationId = text(value.observation_id);
  const observationType = text(value.observation_type);
  const originType = text(value.origin_type);
  const observedAt = text(value.observed_at);
  const evidenceIds = stringArray(value.evidence_ids);
  const publicPayload = observationType
    ? buildPublicObservationPayload(observationType, value.payload)
    : null;

  if (
    !observationId ||
    !observationType ||
    observationType === 'transport.typed_record_set_v1' ||
    !originType ||
    !observedAt ||
    !publicPayload
  ) return null;

  const projected: JsonObject = {
    observation_id: observationId,
    observation_type: observationType,
    origin_type: originType,
    verification_status: 'SUPPORTED',
    observed_at: observedAt,
    evidence_ids: evidenceIds,
    text: compactPublicObservationText(observationType, publicPayload),
    public_payload: publicPayload,
  };

  const entityId = text(value.entity_id);
  const entityIds = stringArray(value.entity_ids);
  if (entityId) projected.entity_id = entityId;
  if (entityIds.length > 0) projected.entity_ids = entityIds;

  return projected;
}

function isSupported(value: JsonObject): boolean {
  return text(value.verification_status)?.toUpperCase() === 'SUPPORTED';
}

function normalizeIdentity(value: unknown): string | null {
  const raw = text(value);
  return raw ? raw.toLowerCase().replace(/\s+/g, ' ').trim() : null;
}

function sourceTypeMatchesPolicy(value: unknown, policy: AutoPublicFactPolicy): boolean {
  const sourceType = text(value);
  return Boolean(sourceType && policy.allowedSourceTypes.includes(sourceType));
}

function sourceMatchesRegisteredIdentity(source: JsonObject, policy: AutoPublicFactPolicy): boolean {
  return normalizeIdentity(source.provider_name) === normalizeIdentity(policy.providerName) &&
    sourceTypeMatchesPolicy(source.source_type, policy) &&
    urlMatchesPolicy(source.canonical_url, policy);
}

type ResolvedSourcePolicy = {
  policyId: string;
  resolution: 'explicit' | 'registry';
};

function resolveSourcePolicies(bundle: JsonObject): Map<string, ResolvedSourcePolicy> {
  const result = new Map<string, ResolvedSourcePolicy>();
  const sources = Array.isArray(bundle.sources) ? bundle.sources : [];
  const sourceIdCounts = new Map<string, number>();

  for (const item of sources) {
    const source = objectValue(item);
    const localSourceId = source ? text(source.source_id) : null;
    if (!localSourceId) continue;
    sourceIdCounts.set(localSourceId, (sourceIdCounts.get(localSourceId) || 0) + 1);
  }

  for (const item of sources) {
    const source = objectValue(item);
    if (!source) continue;
    const localSourceId = text(source.source_id);
    if (!localSourceId) continue;
    if (sourceIdCounts.get(localSourceId) !== 1) continue;

    const sourceStatus = text(source.rights_status);
    if (sourceStatus === 'blocked') continue;

    const explicitPolicyId = text(source.rights_policy_id);
    if (explicitPolicyId) {
      const explicitPolicy = AUTO_PUBLIC_FACT_POLICIES.get(explicitPolicyId);
      if (
        explicitPolicy &&
        explicitPolicy.sourceId === localSourceId &&
        sourceTypeMatchesPolicy(source.source_type, explicitPolicy) &&
        urlMatchesPolicy(source.canonical_url, explicitPolicy)
      ) {
        result.set(localSourceId, { policyId: explicitPolicyId, resolution: 'explicit' });
      }
      // A conflicting explicit policy is never silently replaced by registry inference.
      continue;
    }

    if (sourceStatus !== 'pending_review' && sourceStatus !== 'metadata_only') continue;

    const matches = [...AUTO_PUBLIC_FACT_POLICIES.entries()]
      .filter(([, policy]) => sourceMatchesRegisteredIdentity(source, policy));
    if (matches.length === 1) {
      result.set(localSourceId, { policyId: matches[0][0], resolution: 'registry' });
    }
  }

  return result;
}

export function assessCommercialPublicProjection(
  bundleInput: unknown,
): CommercialPublicProjectionAssessment {
  const bundle = objectValue(bundleInput);
  if (!bundle) {
    return {
      status: 'RIGHTS_HELD',
      allowedEvidenceIds: [],
      heldEvidenceIds: [],
      reasons: ['bundle is not an object'],
    };
  }

  const policyBySource = resolveSourcePolicies(bundle);
  const allowedEvidenceIds: string[] = [];
  const heldEvidenceIds: string[] = [];
  const reasons = new Set<string>();
  const evidence = Array.isArray(bundle.evidence) ? bundle.evidence : [];

  for (const item of evidence) {
    const row = objectValue(item);
    if (!row) continue;
    const evidenceId = text(row.evidence_id);
    if (!evidenceId) continue;
    const sourceId = text(row.source_id);
    const explicitPolicyId = text(row.rights_policy_id);
    const storageStatus = text(row.rights_status);
    const resolved = sourceId ? policyBySource.get(sourceId) : undefined;
    const policy = resolved ? AUTO_PUBLIC_FACT_POLICIES.get(resolved.policyId) : undefined;

    const explicitConflict = Boolean(
      explicitPolicyId && resolved && explicitPolicyId !== resolved.policyId
    );
    const statusEligible = resolved?.resolution === 'registry'
      ? storageStatus === 'pending_review' || storageStatus === 'metadata_only'
      : storageStatus === 'metadata_only' ||
        storageStatus === 'allowed_private_raw' ||
        storageStatus === 'restricted_private_raw';

    const allowed =
      Boolean(sourceId) &&
      Boolean(resolved) &&
      Boolean(policy) &&
      !explicitConflict &&
      statusEligible &&
      sourceTypeMatchesPolicy(row.source_type, policy!) &&
      urlMatchesPolicy(row.source_url, policy!);

    if (allowed) {
      allowedEvidenceIds.push(evidenceId);
    } else {
      heldEvidenceIds.push(evidenceId);
      if (storageStatus === 'blocked') {
        reasons.add('rights_status is blocked');
      } else if (!statusEligible && resolved) {
        reasons.add(`rights_status is not eligible for ${resolved.resolution} policy resolution: ${storageStatus || 'unknown'}`);
      } else if (explicitConflict) {
        reasons.add('evidence/source rights policy mismatch');
      } else if (!resolved) {
        if (explicitPolicyId && !AUTO_PUBLIC_FACT_POLICIES.has(explicitPolicyId)) {
          reasons.add(`policy is not auto-approved for commercial fact display: ${explicitPolicyId}`);
        } else {
          reasons.add('evidence source has no uniquely resolved approved rights policy');
        }
      } else if (!policy || !sourceTypeMatchesPolicy(row.source_type, policy)) {
        reasons.add('evidence source type is outside the approved source contract');
      } else if (!urlMatchesPolicy(row.source_url, policy)) {
        reasons.add('evidence URL is outside the registered policy host scope');
      } else {
        reasons.add('evidence is not eligible for public projection');
      }
    }
  }

  return {
    status: allowedEvidenceIds.length > 0 ? 'ALLOWED' : 'RIGHTS_HELD',
    allowedEvidenceIds: [...new Set(allowedEvidenceIds)].sort(),
    heldEvidenceIds: [...new Set(heldEvidenceIds)].sort(),
    reasons: [...reasons].sort(),
  };
}

function recordUsesOnlyAllowedEvidence(
  value: JsonObject,
  allowed: Set<string>,
  evidenceField = 'evidence_ids',
): boolean {
  const evidenceIds = stringArray(value[evidenceField]);
  return isSupported(value) && evidenceIds.length > 0 && evidenceIds.every((id) => allowed.has(id));
}

function filterRecords(
  bundle: JsonObject,
  field: string,
  allowed: Set<string>,
  evidenceField = 'evidence_ids',
): JsonObject[] {
  const values = Array.isArray(bundle[field]) ? bundle[field] : [];
  return values
    .map(objectValue)
    .filter((value): value is JsonObject => Boolean(value))
    .filter((value) => recordUsesOnlyAllowedEvidence(value, allowed, evidenceField))
    .map((value) => JSON.parse(JSON.stringify(value)) as JsonObject);
}

/**
 * Build a fact-only public projection.
 *
 * Canonical private R2 retains the full validated bundle. This projection:
 * - requires an explicit or uniquely registry-resolved auto-approved rights policy;
 * - requires SUPPORTED records backed only by approved Evidence;
 * - emits Observation only as a newly built fact-only public DTO;
 * - an exact Observation-type/field registry decides which structured values may cross;
 * - unknown Observation types/fields fail closed, including unknown numeric fields;
 * - never copies raw payload, collector metadata, source prose, or derived text;
 * - never treats metadata_only as publication permission by itself.
 */
export function buildCommercialPublicFactProjection(
  bundleInput: unknown,
): { bundle: JsonObject | null; assessment: CommercialPublicProjectionAssessment } {
  const bundle = objectValue(bundleInput);
  const assessment = assessCommercialPublicProjection(bundleInput);
  if (!bundle || assessment.status !== 'ALLOWED') {
    return { bundle: null, assessment };
  }

  const allowed = new Set(assessment.allowedEvidenceIds);
  const evidence = (Array.isArray(bundle.evidence) ? bundle.evidence : [])
    .map(objectValue)
    .filter((value): value is JsonObject => Boolean(value))
    .filter((value) => {
      const id = text(value.evidence_id);
      return Boolean(id && allowed.has(id));
    })
    .map((value) => JSON.parse(JSON.stringify(value)) as JsonObject);
  const allowedSourceIds = new Set(
    evidence.map((value) => text(value.source_id)).filter((value): value is string => Boolean(value)),
  );
  const sources = (Array.isArray(bundle.sources) ? bundle.sources : [])
    .map(objectValue)
    .filter((value): value is JsonObject => Boolean(value))
    .filter((value) => {
      const sourceId = text(value.source_id);
      return Boolean(sourceId && allowedSourceIds.has(sourceId));
    })
    .map((value) => JSON.parse(JSON.stringify(value)) as JsonObject);

  const entities = (Array.isArray(bundle.entities) ? bundle.entities : [])
    .map(objectValue)
    .filter((value): value is JsonObject => Boolean(value))
    .map((value) => {
      const evidenceIds = stringArray(value.evidence_ids).filter((id) => allowed.has(id));
      return evidenceIds.length > 0 ? { ...JSON.parse(JSON.stringify(value)), evidence_ids: evidenceIds } : null;
    })
    .filter((value): value is JsonObject => Boolean(value));

  const claims = filterRecords(bundle, 'claims', allowed);
  const metrics = filterRecords(bundle, 'metrics', allowed);
  const moneySignals = filterRecords(bundle, 'money_signals', allowed);
  const events = filterRecords(bundle, 'events', allowed);
  const relationships = filterRecords(bundle, 'relationships', allowed);
  const observations = (Array.isArray(bundle.observations) ? bundle.observations : [])
    .map(objectValue)
    .filter((value): value is JsonObject => Boolean(value))
    .map((value) => buildCommercialPublicObservation(value, allowed))
    .filter((value): value is JsonObject => Boolean(value));

  const factualCount =
    claims.length + metrics.length + moneySignals.length + events.length +
    relationships.length + observations.length;
  // Record-only enrichment bundles may legitimately contain no Entity object
  // while SUPPORTED records reference an already canonical entity. The
  // Make-Money projector resolves those target IDs from the retained factual
  // records and hydrates the stable identity from the canonical entity store.
  // Requiring entities[] here would incorrectly hold valid enrichment.
  if (factualCount === 0) {
    return {
      bundle: null,
      assessment: {
        ...assessment,
        status: 'RIGHTS_HELD',
        reasons: [...assessment.reasons, 'no SUPPORTED fact record remains after commercial-rights filtering'],
      },
    };
  }

  const quality = objectValue(bundle.quality) || {};
  const projected: JsonObject = {
    ...JSON.parse(JSON.stringify(bundle)),
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
      ...quality,
      warnings: [
        ...stringArray(quality.warnings),
        'public projection is fact-only and filtered by commercial/public rights policy',
      ],
      schema_validation: 'PASS',
    },
  };
  delete projected.collection_coverage;

  return { bundle: projected, assessment };
}
