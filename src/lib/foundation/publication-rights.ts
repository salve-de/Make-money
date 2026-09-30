import observationContracts from '../../../data/foundation-public-observation-contracts.json';
import { mergePublicAttributions, projectTypedPublicFacts } from './public-fact';
import rightsSnapshot from '../../../data/foundation-public-rights-snapshot.json';

type JsonObject = Record<string, unknown>;

export type CommercialPublicProjectionStatus = 'ALLOWED' | 'RIGHTS_HELD';

export interface CommercialPublicProjectionAssessment {
  status: CommercialPublicProjectionStatus;
  allowedEvidenceIds: string[];
  heldEvidenceIds: string[];
  /** Subset of allowedEvidenceIds admitted under a Tier 2 facts-only policy; display must carry attribution. */
  attributionRequiredEvidenceIds: string[];
  reasons: string[];
}

/**
 * Runtime snapshot of Universal Foundation policies that are safe to
 * auto-admit for commercial fact display without an additional condition.
 *
 * Tier 1 (`automatic`): approved policies with allowed commercial use and
 * allowed public fact display.
 * Tier 2 (`facts_only`, owner decision 2026-09-29): restricted policies whose
 * public_fact_display is `restricted` are admitted for independently worded
 * facts only, and every projected fact carries provider attribution. Prose,
 * excerpts, screenshots and media from those providers never cross.
 * Policies with blocked/pending/metadata_only/expired status stay RIGHTS_HELD.
 */
export type PublicFactDisplayTier = 'automatic' | 'facts_only';

export interface AutoPublicFactPolicy {
  sourceId: string;
  providerName: string;
  allowedSourceTypes: string[];
  allowedHostSuffixes: string[];
  allowedPathPrefixes: string[];
  /**
   * `automatic`  — Tier 1: approved provider; facts display with attribution and no extra condition.
   * `facts_only` — Tier 2: restricted provider; independently worded facts only. Provider name,
   *                canonical URL and date must be shown; prose, excerpts and media never cross.
   */
  displayTier: PublicFactDisplayTier;
  /** `entity_domain`: no fixed host; the evidence URL must sit on the domain registered on the bound entity. */
  hostScope: 'suffix' | 'entity_domain';
  /** Attribution rule text from the registry decision (shown with Tier 2 facts). */
  attribution: string | null;
}

type RightsSnapshotRecord = (typeof rightsSnapshot.records)[number];

function snapshotDisplayTier(record: RightsSnapshotRecord): PublicFactDisplayTier | null {
  const { policy, source } = record;
  if (
    source.source_id !== policy.source_id ||
    !source.rights_policy_ids.includes(policy.policy_id) ||
    !/^[a-f0-9]{40}$/.test(policy.blob_sha) ||
    !/^[a-f0-9]{40}$/.test(source.blob_sha)
  ) return null;
  if (
    policy.status === 'approved' &&
    policy.commercial_use === 'allowed' &&
    policy.public_fact_display === 'allowed' &&
    source.status === 'active'
  ) return 'automatic';
  if (
    policy.status === 'restricted' &&
    policy.public_fact_display === 'restricted' &&
    (policy.commercial_use === 'allowed' || policy.commercial_use === 'restricted') &&
    (policy.public_display === 'allowed' || policy.public_display === 'restricted') &&
    typeof policy.attribution === 'string' && policy.attribution.trim().length > 0 &&
    (source.status === 'active' || source.status === 'gated')
  ) return 'facts_only';
  return null;
}

export const AUTO_PUBLIC_FACT_POLICIES = new Map<string, AutoPublicFactPolicy>(
  rightsSnapshot.records
    .map((record) => ({ record, displayTier: snapshotDisplayTier(record) }))
    .filter((entry): entry is { record: RightsSnapshotRecord; displayTier: PublicFactDisplayTier } => entry.displayTier !== null)
    .map(({ record, displayTier }) => [
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
        displayTier,
        hostScope: record.host_scope === 'entity_domain' ? 'entity_domain' : 'suffix',
        attribution: typeof record.policy.attribution === 'string' && record.policy.attribution.trim()
          ? record.policy.attribution.trim()
          : null,
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

function hostWithinSuffixes(hostname: string, suffixes: readonly string[]): boolean {
  return suffixes.some((suffix) => {
    const normalized = suffix.toLowerCase().replace(/^\./, '').replace(/\.$/, '');
    return Boolean(normalized) && (hostname === normalized || hostname.endsWith(`.${normalized}`));
  });
}

/** Registered entity domain → bare host (no scheme, path, `www.` or trailing dot). */
function normalizeEntityDomain(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const host = raw.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '').replace(/\.$/, '');
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
}

/** Domains registered on bundle entities; with `evidenceId`, only entities that bind that evidence. */
function entityDomainsInBundle(bundle: JsonObject, evidenceId?: string): string[] {
  const domains = new Set<string>();
  for (const item of Array.isArray(bundle.entities) ? bundle.entities : []) {
    const entity = objectValue(item);
    if (!entity) continue;
    if (evidenceId && !stringArray(entity.evidence_ids).includes(evidenceId)) continue;
    const domain = normalizeEntityDomain(entity.domain);
    if (domain) domains.add(domain);
  }
  return [...domains];
}

function urlHostMatchesPolicy(
  value: unknown,
  policy: AutoPublicFactPolicy,
  entityDomains: readonly string[] = [],
): boolean {
  const raw = text(value);
  if (!raw) return false;
  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (policy.hostScope === 'entity_domain') {
      // Entity-bound policy: only the domain registered on the bound entity (or its subdomains) qualifies.
      return entityDomains.length > 0 && hostWithinSuffixes(hostname, entityDomains);
    }
    return hostWithinSuffixes(hostname, policy.allowedHostSuffixes);
  } catch {
    return false;
  }
}

function urlMatchesPolicy(
  value: unknown,
  policy: AutoPublicFactPolicy,
  entityDomains: readonly string[] = [],
): boolean {
  const raw = text(value);
  if (!raw || !urlHostMatchesPolicy(raw, policy, entityDomains)) return false;
  try {
    const url = new URL(raw);
    return policy.allowedPathPrefixes.length === 0 ||
      policy.allowedPathPrefixes.some((prefix) => url.pathname.startsWith(prefix));
  } catch {
    return false;
  }
}

export interface CatalogSourcePolicy {
  policyId: string;
  sourceId: string;
  providerName: string;
  displayTier: PublicFactDisplayTier;
}

/**
 * Registry policy for a catalog source URL. `officialUrl` supplies the entity domain for the
 * `entity_domain` policy. Suffix policies win over the official-site policy so a platform page
 * (e.g. an Indie Hackers listing) is never classed as the company's own site. `null` = unregistered.
 */
export function resolveCatalogSourcePolicy(sourceUrl: unknown, officialUrl?: unknown): CatalogSourcePolicy | null {
  const entityDomain = normalizeEntityDomain(officialUrl);
  const entries = [...AUTO_PUBLIC_FACT_POLICIES.entries()]
    .sort(([, a], [, b]) => Number(a.hostScope === 'entity_domain') - Number(b.hostScope === 'entity_domain'));
  for (const [policyId, policy] of entries) {
    if (urlMatchesPolicy(sourceUrl, policy, entityDomain ? [entityDomain] : [])) {
      return { policyId, sourceId: policy.sourceId, providerName: policy.providerName, displayTier: policy.displayTier };
    }
  }
  return null;
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

type PublicObservationEntityAssociation = {
  typedSubjectRef: string;
  entities: readonly { entityId: string; canonicalName: string }[];
};

type PublicObservationTypePolicy = {
  fields: readonly PublicObservationFieldRule[];
  allowedPolicyIds: readonly string[];
  display?: PublicObservationDisplayPolicy;
  entityAssociation?: PublicObservationEntityAssociation;
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
    const allowedPolicyIds = 'allowed_policy_ids' in contract && Array.isArray(contract.allowed_policy_ids)
      ? contract.allowed_policy_ids.filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [];
    const associationInput = objectValue(contract.entity_association);
    const associationEntities = associationInput && Array.isArray(associationInput.entities)
      ? associationInput.entities.map(objectValue).filter((value): value is JsonObject => Boolean(value))
      : [];
    const typedSubjectRef = associationInput ? text(associationInput.typed_subject_ref) : null;
    const entityAssociation = typedSubjectRef &&
      associationInput?.evidence_binding === 'exact' &&
      associationEntities.length > 0 &&
      associationEntities.length <= 8 &&
      associationEntities.every((entity) =>
        typeof entity.entity_id === 'string' && /^ent_[a-z0-9]+_[a-f0-9]{20}$/.test(entity.entity_id) &&
        typeof entity.canonical_name === 'string' && entity.canonical_name.trim().length > 0
      ) &&
      new Set(associationEntities.map((entity) => entity.entity_id)).size === associationEntities.length
      ? Object.freeze({
          typedSubjectRef,
          entities: Object.freeze(associationEntities.map((entity) => Object.freeze({
            entityId: entity.entity_id as string,
            canonicalName: (entity.canonical_name as string).trim(),
          }))),
        })
      : undefined;
    // An invalid declared binding must never downgrade to an unbound contract.
    if ('entity_association' in contract && !entityAssociation) continue;
    result[contract.observation_type] = Object.freeze({
      fields: Object.freeze(fields.map((field) => Object.freeze(field))),
      allowedPolicyIds: Object.freeze([...allowedPolicyIds]),
      ...(display ? { display } : {}),
      ...(entityAssociation ? { entityAssociation } : {}),
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
  attributions: readonly JsonObject[] = [],
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
    ...(() => { const attribution = mergePublicAttributions(attributions); return attribution ? { attribution } : {}; })(),
  };
}

/** Fields that could carry provider prose; never copied for Tier 2 (facts-only) evidence. */
const FACTS_ONLY_EVIDENCE_PROSE_FIELDS = [
  'summary', 'excerpt', 'excerpts', 'quote', 'quotes', 'snippet', 'text', 'content', 'body',
  'raw_text', 'transcript', 'highlights', 'notes', 'description',
] as const;

/** Attribution block that travels with every fact projected from a registry-admitted source. */
function buildPublicAttribution(row: JsonObject, policy: AutoPublicFactPolicy): JsonObject {
  return {
    display_tier: policy.displayTier,
    provider_name: policy.providerName,
    source_url: text(row.source_url),
    published_at: text(row.published_at),
    retrieved_at: text(row.retrieved_at),
    ...(policy.attribution ? { rule: policy.attribution } : {}),
  };
}

/** Tier 2 evidence crosses as metadata + attribution only; any prose-bearing field is dropped. */
function projectFactsOnlyEvidence(row: JsonObject, policy: AutoPublicFactPolicy): JsonObject {
  const projected = JSON.parse(JSON.stringify(row)) as JsonObject;
  for (const field of FACTS_ONLY_EVIDENCE_PROSE_FIELDS) delete projected[field];
  projected.public_attribution = buildPublicAttribution(row, policy);
  return projected;
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
  sourceUrlByEvidenceId: ReadonlyMap<string, string>,
  policyIdByEvidenceId: ReadonlyMap<string, string>,
  attributionByEvidenceId: ReadonlyMap<string, JsonObject> = new Map(),
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
        evidenceIds.map((id) => attributionByEvidenceId.get(id)).filter((item): item is JsonObject => Boolean(item)),
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
    ...(publicDisplay ? { public_display: publicDisplay } : {}),
  };

  const entityId = text(value.entity_id);
  const entityIds = stringArray(value.entity_ids);
  if (entityId) projected.entity_id = entityId;
  if (entityIds.length > 0) projected.entity_ids = entityIds;

  return projected;
}

function applyContractEntityAssociation(
  sourceObservation: JsonObject,
  projectedObservation: JsonObject | null,
  typedRecordSetInput: unknown,
  sourceEntities: readonly JsonObject[],
): JsonObject | null {
  if (!projectedObservation) return null;
  const observationType = text(sourceObservation.observation_type);
  const association = observationType
    ? PUBLIC_OBSERVATION_TYPE_POLICIES[observationType]?.entityAssociation
    : undefined;
  if (!association) return projectedObservation;

  const typedRecordSet = objectValue(typedRecordSetInput);
  const evidenceIds = stringArray(sourceObservation.evidence_ids);
  if (
    text(typedRecordSet?.subject_ref) !== association.typedSubjectRef ||
    text(sourceObservation.verification_status)?.toUpperCase() !== 'SUPPORTED' ||
    evidenceIds.length === 0
  ) return null;

  const explicitEntityId = text(sourceObservation.entity_id);
  const explicitEntityIds = stringArray(sourceObservation.entity_ids);
  if (explicitEntityId || explicitEntityIds.length > 0) {
    const explicit = new Set([...(explicitEntityId ? [explicitEntityId] : []), ...explicitEntityIds]);
    if (
      explicit.size !== association.entities.length ||
      association.entities.some((entity) => !explicit.has(entity.entityId))
    ) return null;
  }

  const evidenceSet = new Set(evidenceIds);
  const matches = association.entities.every((expected) => {
    const matchingEntities = sourceEntities.filter((candidate) => candidate.entity_id === expected.entityId);
    if (matchingEntities.length !== 1) return false;
    const entity = matchingEntities[0];
    if (!entity || entity.canonical_name !== expected.canonicalName) return false;
    const entityEvidence = stringArray(entity.evidence_ids);
    return entityEvidence.length === evidenceSet.size &&
      new Set(entityEvidence).size === evidenceSet.size &&
      entityEvidence.every((id) => evidenceSet.has(id));
  });
  if (!matches) return null;

  return {
    ...projectedObservation,
    entity_ids: association.entities.map((entity) => entity.entityId),
  };
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
  // Entity-bound policies have no registry identity to infer from; they must be named explicitly.
  if (policy.hostScope === 'entity_domain') return false;
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
  const bundleEntityDomains = entityDomainsInBundle(bundle);

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
        urlHostMatchesPolicy(source.canonical_url, explicitPolicy, bundleEntityDomains)
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
      attributionRequiredEvidenceIds: [],
      reasons: ['bundle is not an object'],
    };
  }

  const policyBySource = resolveSourcePolicies(bundle);
  const allowedEvidenceIds: string[] = [];
  const attributionRequiredEvidenceIds: string[] = [];
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

    const boundEntityDomains = policy?.hostScope === 'entity_domain'
      ? entityDomainsInBundle(bundle, evidenceId)
      : [];
    const allowed =
      Boolean(sourceId) &&
      Boolean(resolved) &&
      Boolean(policy) &&
      !explicitConflict &&
      statusEligible &&
      sourceTypeMatchesPolicy(row.source_type, policy!) &&
      urlMatchesPolicy(row.source_url, policy!, boundEntityDomains);

    if (allowed) {
      allowedEvidenceIds.push(evidenceId);
      if (policy!.displayTier === 'facts_only') attributionRequiredEvidenceIds.push(evidenceId);
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
      } else if (policy.hostScope === 'entity_domain' && !urlMatchesPolicy(row.source_url, policy, boundEntityDomains)) {
        reasons.add('official-website evidence is not bound to an entity whose registered domain serves the evidence URL');
      } else if (!urlMatchesPolicy(row.source_url, policy, boundEntityDomains)) {
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
    attributionRequiredEvidenceIds: [...new Set(attributionRequiredEvidenceIds)].sort(),
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
  const attributionRequired = new Set(assessment.attributionRequiredEvidenceIds);
  const resolvedPolicies = resolveSourcePolicies(bundle);
  const policyForEvidence = (value: JsonObject): AutoPublicFactPolicy | undefined => {
    const sourceId = text(value.source_id);
    const policyId = sourceId ? resolvedPolicies.get(sourceId)?.policyId : undefined;
    return policyId ? AUTO_PUBLIC_FACT_POLICIES.get(policyId) : undefined;
  };
  const attributionByEvidenceId = new Map<string, JsonObject>();
  const evidence = (Array.isArray(bundle.evidence) ? bundle.evidence : [])
    .map(objectValue)
    .filter((value): value is JsonObject => Boolean(value))
    .filter((value) => {
      const id = text(value.evidence_id);
      return Boolean(id && allowed.has(id));
    })
    .map((value) => {
      const id = text(value.evidence_id);
      const policy = policyForEvidence(value);
      if (id && policy) attributionByEvidenceId.set(id, buildPublicAttribution(value, policy));
      return id && policy && attributionRequired.has(id)
        ? projectFactsOnlyEvidence(value, policy)
        : JSON.parse(JSON.stringify(value)) as JsonObject;
    });
  const sourceUrlByEvidenceId = new Map(
    evidence
      .map((value) => [text(value.evidence_id), text(value.source_url)] as const)
      .filter((pair): pair is readonly [string, string] => Boolean(pair[0] && pair[1])),
  );
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
    .map((value) => applyContractEntityAssociation(
      value,
      buildCommercialPublicObservation(
        value,
        allowed,
        sourceUrlByEvidenceId,
        policyIdByEvidenceId,
        attributionByEvidenceId,
      ),
      typedRecordSetInput,
      (Array.isArray(bundle.entities) ? bundle.entities : [])
        .map(objectValue)
        .filter((value): value is JsonObject => Boolean(value)),
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
        attributionByEvidenceId,
        publicEntities: publicFactIdentityPool,
      })
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
        ...(attributionRequired.size > 0
          ? ['facts-only (Tier 2) sources present: display must show provider name, source URL and date; no prose, excerpt or media']
          : []),
      ],
      schema_validation: 'PASS',
    },
  };
  delete projected.collection_coverage;

  return { bundle: projected, assessment };
}
