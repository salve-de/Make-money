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

function isSupported(value: JsonObject): boolean {
  return text(value.verification_status)?.toUpperCase() === 'SUPPORTED';
}

function sourcePolicyMap(bundle: JsonObject): Map<string, string> {
  const result = new Map<string, string>();
  const sources = Array.isArray(bundle.sources) ? bundle.sources : [];
  for (const item of sources) {
    const source = objectValue(item);
    if (!source) continue;
    const sourceId = text(source.source_id);
    const policyId = text(source.rights_policy_id);
    const policy = policyId ? AUTO_PUBLIC_FACT_POLICIES.get(policyId) : undefined;
    if (
      sourceId &&
      policyId &&
      policy &&
      policy.sourceId === sourceId &&
      urlMatchesPolicy(source.canonical_url, policy)
    ) {
      result.set(sourceId, policyId);
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

  const policyBySource = sourcePolicyMap(bundle);
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
    const policyId = text(row.rights_policy_id);
    const storageStatus = text(row.rights_status);

    const allowed =
      Boolean(sourceId) &&
      Boolean(policyId) &&
      policyBySource.get(sourceId!) === policyId &&
      AUTO_PUBLIC_FACT_POLICIES.get(policyId!)?.sourceId === sourceId &&
      urlMatchesPolicy(row.source_url, AUTO_PUBLIC_FACT_POLICIES.get(policyId!)!) &&
      storageStatus !== 'pending_review' &&
      storageStatus !== 'blocked';

    if (allowed) {
      allowedEvidenceIds.push(evidenceId);
    } else {
      heldEvidenceIds.push(evidenceId);
      if (!policyId) reasons.add('evidence lacks rights_policy_id');
      else if (!AUTO_PUBLIC_FACT_POLICIES.has(policyId)) {
        reasons.add(`policy is not auto-approved for commercial fact display: ${policyId}`);
      } else if (
        !sourceId ||
        policyBySource.get(sourceId) !== policyId ||
        AUTO_PUBLIC_FACT_POLICIES.get(policyId)?.sourceId !== sourceId
      ) {
        reasons.add('evidence/source rights policy mismatch');
      } else if (!urlMatchesPolicy(row.source_url, AUTO_PUBLIC_FACT_POLICIES.get(policyId)!)) {
        reasons.add('evidence URL is outside the registered policy host scope');
      } else {
        reasons.add(`rights_status does not permit public projection: ${storageStatus || 'unknown'}`);
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
 * - requires an explicitly auto-approved registered rights policy;
 * - requires SUPPORTED records backed only by approved Evidence;
 * - drops free-form observations and derived text;
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

  const factualCount =
    claims.length + metrics.length + moneySignals.length + events.length + relationships.length;
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
    observations: [],
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
