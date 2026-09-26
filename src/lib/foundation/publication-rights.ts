import observationContracts from '../../../data/foundation-public-observation-contracts.json';
import { projectTypedPublicFacts } from './public-fact';
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
type PublicRightsDisposition = 'allowed' | 'restricted' | 'blocked';

export interface AutoPublicFactPolicy {
  sourceId: string;
  providerName: string;
  allowedSourceTypes: string[];
  allowedHostSuffixes: string[];
  allowedPathPrefixes: string[];
  reviewedAt: string;
  sourceContentPublicDisplay: 'allowed' | 'restricted' | 'blocked';
  sourceContentRedistribution: 'allowed' | 'restricted' | 'blocked';
  publicExcerptDisplay: 'allowed' | 'restricted' | 'blocked';
  publicMediaDisplay: 'allowed' | 'restricted' | 'blocked';
  attribution: string;
}

function publicRightsDisposition(value: unknown): PublicRightsDisposition | null {
  return value === 'allowed' || value === 'restricted' || value === 'blocked'
    ? value
    : null;
}

type RightsSnapshotRecord = (typeof rightsSnapshot.records)[number];

function autoPublicFactPolicyEntry(
  record: RightsSnapshotRecord,
): [string, AutoPublicFactPolicy] | null {
  const sourceContentPublicDisplay = publicRightsDisposition(record.policy.public_display);
  const sourceContentRedistribution = publicRightsDisposition(record.policy.redistribution);
  const publicExcerptDisplay = publicRightsDisposition(record.policy.public_excerpt_display);
  const publicMediaDisplay = publicRightsDisposition(record.policy.public_media_display);
  if (
    record.policy.status !== 'approved' ||
    record.policy.commercial_use !== 'allowed' ||
    record.policy.public_fact_display !== 'allowed' ||
    record.source.status !== 'active' ||
    record.source.source_id !== record.policy.source_id ||
    !record.source.rights_policy_ids.includes(record.policy.policy_id) ||
    !/^[a-f0-9]{40}$/.test(record.policy.blob_sha) ||
    !/^[a-f0-9]{40}$/.test(record.source.blob_sha) ||
    !sourceContentPublicDisplay ||
    !sourceContentRedistribution ||
    !publicExcerptDisplay ||
    !publicMediaDisplay
  ) {
    return null;
  }

  return [
    record.policy.policy_id,
    {
      sourceId: record.source.source_id,
      providerName: record.source.provider_name,
      allowedSourceTypes: [...record.source.source_types],
      allowedHostSuffixes: [...record.allowed_host_suffixes],
      allowedPathPrefixes: 'allowed_path_prefixes' in record &&
        Array.isArray(record.allowed_path_prefixes)
        ? [...record.allowed_path_prefixes]
        : [],
      reviewedAt: record.policy.reviewed_at,
      sourceContentPublicDisplay,
      sourceContentRedistribution,
      publicExcerptDisplay,
      publicMediaDisplay,
      attribution: record.policy.attribution,
    },
  ];
}

export const AUTO_PUBLIC_FACT_POLICIES = new Map<string, AutoPublicFactPolicy>(
  rightsSnapshot.records
    .map(autoPublicFactPolicyEntry)
    .filter((entry): entry is [string, AutoPublicFactPolicy] => entry !== null),
);

function objectValue(value: unknown): JsonObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function urlHostMatchesPolicy(value: unknown, policy: AutoPublicFactPolicy): boolean {
  const raw = text(value);
  if (!raw) return false;
  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    return policy.allowedHostSuffixes.some((suffix) => {
      const normalized = suffix.toLowerCase().replace(/^\./, '');
      return hostname === normalized || hostname.endsWith(`.${normalized}`);
    });
  } catch {
    return false;
  }
}

function urlMatchesPolicy(value: unknown, policy: AutoPublicFactPolicy): boolean {
  const raw = text(value);
  if (!raw || !urlHostMatchesPolicy(raw, policy)) return false;
  try {
    const url = new URL(raw);
    return policy.allowedPathPrefixes.length === 0 ||
      policy.allowedPathPrefixes.some((prefix) => url.pathname.startsWith(prefix));
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
  kind: 'finite_number' | 'percentage' | 'currency_code' | 'boolean';
  required?: boolean;
};

type PublicObservationDisplayFactRule = {
  publicPath: readonly string[];
  label: string;
  suffix?: string;
};

type PublicObservationDisplayPolicy = {
  title: string;
  subject: string;
  note?: string;
  sourceLabel: string;
  facts: readonly PublicObservationDisplayFactRule[];
};

type PublicObservationAssociationEntityPolicy = {
  entityId: string;
  canonicalName: string;
};

type PublicObservationAssociationPolicy = {
  subjectRef: string;
  entities: readonly PublicObservationAssociationEntityPolicy[];
  requireExactEvidenceSet: boolean;
};

type PublicObservationTypePolicy = {
  fields: readonly PublicObservationFieldRule[];
  allowedPolicyIds: readonly string[];
  display?: PublicObservationDisplayPolicy;
  association?: PublicObservationAssociationPolicy;
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
    const displayInput = 'display' in contract && contract.display
      ? contract.display as {
          title: string;
          subject: string;
          note?: string;
          source_label: string;
          facts: Array<{ public_path: string[]; label: string; suffix?: string }>;
        }
      : null;
    const display = displayInput &&
      typeof displayInput.title === 'string' && displayInput.title.length <= 120 &&
      typeof displayInput.subject === 'string' && displayInput.subject.length <= 240 &&
      typeof displayInput.source_label === 'string' && displayInput.source_label.length <= 80 &&
      (!displayInput.note || displayInput.note.length <= 320) &&
      Array.isArray(displayInput.facts) && displayInput.facts.length > 0 && displayInput.facts.length <= 16
      ? Object.freeze({
          title: displayInput.title,
          subject: displayInput.subject,
          ...(displayInput.note ? { note: displayInput.note } : {}),
          sourceLabel: displayInput.source_label,
          facts: Object.freeze(displayInput.facts.map((fact) => Object.freeze({
            publicPath: Object.freeze([...fact.public_path]),
            label: fact.label,
            ...(fact.suffix ? { suffix: fact.suffix } : {}),
          }))),
        })
      : undefined;
    const associationInput = 'association' in contract && contract.association
      ? contract.association as {
          subject_ref?: unknown;
          entities?: unknown;
          require_exact_evidence_set?: unknown;
        }
      : null;
    let association: PublicObservationAssociationPolicy | undefined;
    if (
      associationInput &&
      typeof associationInput.subject_ref === 'string' &&
      associationInput.subject_ref.length > 0 &&
      Array.isArray(associationInput.entities) &&
      associationInput.entities.length > 0 &&
      associationInput.entities.length <= 8
    ) {
      const associationEntities = associationInput.entities
        .map((entry) => objectValue(entry))
        .map((entry) => entry && typeof entry.entity_id === 'string' &&
          entry.entity_id.length > 0 &&
          typeof entry.canonical_name === 'string' &&
          entry.canonical_name.length > 0
          ? {
              entityId: entry.entity_id,
              canonicalName: entry.canonical_name,
            }
          : null);
      const validEntities = associationEntities
        .filter((entry): entry is PublicObservationAssociationEntityPolicy => Boolean(entry));
      if (
        validEntities.length === associationInput.entities.length &&
        new Set(validEntities.map((entry) => entry.entityId)).size === validEntities.length
      ) {
        association = Object.freeze({
          subjectRef: associationInput.subject_ref,
          entities: Object.freeze(validEntities.map((entry) => Object.freeze(entry))),
          requireExactEvidenceSet: associationInput.require_exact_evidence_set === true,
        });
      }
    }
    const allowedPolicyIds = 'allowed_policy_ids' in contract && Array.isArray(contract.allowed_policy_ids)
      ? contract.allowed_policy_ids.filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [];
    result[contract.observation_type] = Object.freeze({
      fields: Object.freeze(fields.map((field) => Object.freeze(field))),
      allowedPolicyIds: Object.freeze([...allowedPolicyIds]),
      ...(display ? { display } : {}),
      ...(association ? { association } : {}),
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
  if (kind === 'percentage') {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
      ? value
      : undefined;
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

function buildPublicObservationDisplay(
  observationType: string,
  publicPayload: JsonObject,
  sourceUrls: string[],
): JsonObject | null {
  const display = PUBLIC_OBSERVATION_TYPE_POLICIES[observationType]?.display;
  if (!display) return null;
  const facts = display.facts.map((fact) => {
    const value = readPath(publicPayload, fact.publicPath);
    if (
      !(typeof value === 'number' && Number.isFinite(value)) &&
      typeof value !== 'boolean' &&
      !(typeof value === 'string' && value.length <= 80)
    ) return null;
    return {
      label: fact.label,
      value,
      ...(fact.suffix ? { suffix: fact.suffix } : {}),
    };
  }).filter((fact) => fact !== null);
  if (facts.length === 0) return null;
  return {
    title: display.title,
    subject: display.subject,
    ...(display.note ? { note: display.note } : {}),
    facts,
    source_label: display.sourceLabel,
    source_urls: [...new Set(sourceUrls)].slice(0, 8),
  };
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

function mostRestrictiveRightsDisposition(
  values: readonly PublicRightsDisposition[],
): PublicRightsDisposition {
  if (values.includes('blocked')) return 'blocked';
  if (values.includes('restricted')) return 'restricted';
  return 'allowed';
}

function buildPublicRightsMetadata(
  evidenceIds: readonly string[],
  policyIdByEvidenceId: ReadonlyMap<string, string>,
): JsonObject | null {
  if (evidenceIds.length === 0) return null;

  const policies = evidenceIds.map((evidenceId) => {
    const policyId = policyIdByEvidenceId.get(evidenceId);
    return policyId ? AUTO_PUBLIC_FACT_POLICIES.get(policyId) || null : null;
  });
  if (policies.some((policy) => !policy)) return null;

  const resolved = policies.filter((policy): policy is AutoPublicFactPolicy => Boolean(policy));
  const providers = [...new Set(resolved.map((policy) => policy.providerName))].sort();
  const attribution = [...new Set(resolved.map((policy) => policy.attribution))].sort();
  const reviewedAt = [...new Set(resolved.map((policy) => policy.reviewedAt))].sort();

  return {
    commercial_use: 'allowed',
    public_fact_display: 'allowed',
    projection_mode: 'fact_only',
    source_content_public_display: mostRestrictiveRightsDisposition(
      resolved.map((policy) => policy.sourceContentPublicDisplay),
    ),
    source_content_redistribution: mostRestrictiveRightsDisposition(
      resolved.map((policy) => policy.sourceContentRedistribution),
    ),
    public_excerpt_display: mostRestrictiveRightsDisposition(
      resolved.map((policy) => policy.publicExcerptDisplay),
    ),
    public_media_display: mostRestrictiveRightsDisposition(
      resolved.map((policy) => policy.publicMediaDisplay),
    ),
    providers,
    attribution,
    reviewed_at: reviewedAt,
  };
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  if (leftSet.size !== rightSet.size) return false;
  for (const value of leftSet) {
    if (!rightSet.has(value)) return false;
  }
  return true;
}

function resolvePublicObservationAssociationEntityIds(
  value: JsonObject,
  contract: PublicObservationTypePolicy,
  bundle: JsonObject,
  typedRecordSetInput: unknown,
  allowed: ReadonlySet<string>,
): string[] | null | undefined {
  const association = contract.association;
  if (!association) return undefined;

  const typedRecordSet = objectValue(typedRecordSetInput);
  if (!typedRecordSet || text(typedRecordSet.subject_ref) !== association.subjectRef) {
    return null;
  }

  const evidenceIds = stringArray(value.evidence_ids);
  if (evidenceIds.length === 0 || evidenceIds.some((id) => !allowed.has(id))) {
    return null;
  }

  const observationId = text(value.observation_id);
  const observationType = text(value.observation_type);
  const typedObservations = (Array.isArray(typedRecordSet.observations)
    ? typedRecordSet.observations
    : [])
    .map(objectValue)
    .filter((row): row is JsonObject => Boolean(row))
    .filter((row) =>
      text(row.observation_id) === observationId &&
      text(row.observation_type) === observationType
    );
  if (
    typedObservations.length !== 1 ||
    !sameStringSet(stringArray(typedObservations[0].evidence_ids), evidenceIds)
  ) {
    return null;
  }

  const expectedIds = association.entities.map((entry) => entry.entityId);
  const explicitIds = [
    ...(text(value.entity_id) ? [text(value.entity_id)!] : []),
    ...stringArray(value.entity_ids),
  ];
  if (explicitIds.length > 0 && !sameStringSet(explicitIds, expectedIds)) {
    return null;
  }

  const matchesEntity = (
    row: JsonObject,
    expected: PublicObservationAssociationEntityPolicy,
  ): boolean => {
    if (
      text(row.entity_id) !== expected.entityId ||
      text(row.canonical_name) !== expected.canonicalName
    ) {
      return false;
    }
    const entityEvidenceIds = stringArray(row.evidence_ids);
    return association.requireExactEvidenceSet
      ? sameStringSet(entityEvidenceIds, evidenceIds)
      : evidenceIds.every((id) => entityEvidenceIds.includes(id));
  };

  const collections = [
    Array.isArray(bundle.entities) ? bundle.entities : [],
    Array.isArray(typedRecordSet.entities) ? typedRecordSet.entities : [],
  ];
  for (const collection of collections) {
    const rows = collection
      .map(objectValue)
      .filter((row): row is JsonObject => Boolean(row));
    for (const expected of association.entities) {
      if (rows.filter((row) => matchesEntity(row, expected)).length !== 1) {
        return null;
      }
    }
  }

  return [...expectedIds];
}

function buildCommercialPublicObservation(
  value: JsonObject,
  allowed: Set<string>,
  sourceUrlByEvidenceId: ReadonlyMap<string, string>,
  policyIdByEvidenceId: ReadonlyMap<string, string>,
  bundle: JsonObject,
  typedRecordSetInput?: unknown,
): JsonObject | null {
  if (!recordUsesOnlyAllowedEvidence(value, allowed)) return null;

  const observationId = text(value.observation_id);
  const observationType = text(value.observation_type);
  const contract = observationType ? PUBLIC_OBSERVATION_TYPE_POLICIES[observationType] : undefined;
  const originType = text(value.origin_type);
  const observedAt = text(value.observed_at);
  const evidenceIds = stringArray(value.evidence_ids);
  if (
    contract?.allowedPolicyIds.length &&
    evidenceIds.some((id) => !contract.allowedPolicyIds.includes(policyIdByEvidenceId.get(id) || ''))
  ) return null;

  const publicPayload = observationType
    ? buildPublicObservationPayload(observationType, value.payload)
    : null;
  const publicDisplay = observationType && publicPayload
    ? buildPublicObservationDisplay(
        observationType,
        publicPayload,
        evidenceIds.map((id) => sourceUrlByEvidenceId.get(id)).filter((url): url is string => Boolean(url)),
      )
    : null;

  if (
    !observationId ||
    !observationType ||
    observationType === 'transport.typed_record_set_v1' ||
    !originType ||
    !observedAt ||
    !publicPayload
  ) return null;

  const associationEntityIds = contract
    ? resolvePublicObservationAssociationEntityIds(
        value,
        contract,
        bundle,
        typedRecordSetInput,
        allowed,
      )
    : undefined;
  if (associationEntityIds === null) return null;

  const publicRights = buildPublicRightsMetadata(evidenceIds, policyIdByEvidenceId);
  if (!publicRights) return null;

  const projected: JsonObject = {
    observation_id: observationId,
    observation_type: observationType,
    origin_type: originType,
    verification_status: 'SUPPORTED',
    observed_at: observedAt,
    evidence_ids: evidenceIds,
    text: publicDisplay && typeof publicDisplay.title === 'string'
      ? publicDisplay.title
      : compactPublicObservationText(observationType, publicPayload),
    public_payload: publicPayload,
    public_rights: publicRights,
    ...(publicDisplay ? { public_display: publicDisplay } : {}),
  };

  const entityId = text(value.entity_id);
  const entityIds = stringArray(value.entity_ids);
  if (associationEntityIds && associationEntityIds.length > 0) {
    projected.entity_ids = associationEntityIds;
  } else {
    if (entityId) projected.entity_id = entityId;
    if (entityIds.length > 0) projected.entity_ids = entityIds;
  }

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
    urlHostMatchesPolicy(source.canonical_url, policy);
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
        urlHostMatchesPolicy(source.canonical_url, explicitPolicy)
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
  typedRecordSetInput?: unknown,
  existingPublicEntityIdentities: readonly unknown[] = [],
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
  const sourceUrlByEvidenceId = new Map(
    evidence
      .map((value) => [text(value.evidence_id), text(value.source_url)] as const)
      .filter((pair): pair is readonly [string, string] => Boolean(pair[0] && pair[1])),
  );
  const resolvedPolicies = resolveSourcePolicies(bundle);
  const policyIdByEvidenceId = new Map(
    evidence
      .map((value) => {
        const evidenceId = text(value.evidence_id);
        const sourceId = text(value.source_id);
        const policyId = sourceId ? resolvedPolicies.get(sourceId)?.policyId || null : null;
        return [evidenceId, policyId] as const;
      })
      .filter((pair): pair is readonly [string, string] => Boolean(pair[0] && pair[1])),
  );
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
    .map((value) => buildCommercialPublicObservation(
      value,
      allowed,
      sourceUrlByEvidenceId,
      policyIdByEvidenceId,
      bundle,
      typedRecordSetInput,
    ))
    .filter((value): value is JsonObject => Boolean(value));

  const publicFactIdentityPool = [
    ...entities,
    ...existingPublicEntityIdentities
      .map(objectValue)
      .filter((value): value is JsonObject => Boolean(value)),
  ];
  const publicFactObservations = typedRecordSetInput
    ? projectTypedPublicFacts({
        typedRecordSet: typedRecordSetInput,
        allowedEvidenceIds: allowed,
        sourceUrlByEvidenceId,
        publicEntities: publicFactIdentityPool,
      }).reduce<JsonObject[]>((result, observation) => {
        const publicRights = buildPublicRightsMetadata(
          stringArray(observation.evidence_ids),
          policyIdByEvidenceId,
        );
        if (publicRights) {
          result.push({ ...observation, public_rights: publicRights });
        }
        return result;
      }, [])
    : [];
  observations.push(...publicFactObservations);

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
