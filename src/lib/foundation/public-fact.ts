import publicFactTypesSnapshot from '../../../data/foundation-public-fact-types.json';
import { sha256Sync } from '@/shared/sha256';

type JsonObject = Record<string, unknown>;

export interface PublicFactTypePolicy {
  factTypeId: string;
  valueKind: 'percentage' | 'money' | 'number' | 'count' | 'date' | 'boolean';
  allowedScopeTypes: readonly string[];
  allowedActorRelations: readonly string[];
  title: string;
  relationLabels: Readonly<Record<string, string>>;
  suffix?: string;
}

interface PublicFactTypeSnapshotRecord {
  fact_type_id: string;
  status: 'draft' | 'approved' | 'disabled';
  value_kind: PublicFactTypePolicy['valueKind'];
  allowed_scope_types: string[];
  allowed_actor_relations: string[];
  display: {
    title: string;
    relation_labels: Record<string, string>;
    suffix?: string | null;
  };
  path: string;
  blob_sha: string;
}

interface PublicFactTypeSnapshot {
  records: PublicFactTypeSnapshotRecord[];
}

export interface PublicFactProjectionInput {
  typedRecordSet: unknown;
  allowedEvidenceIds: ReadonlySet<string>;
  sourceUrlByEvidenceId: ReadonlyMap<string, string>;
  publicEntities: readonly JsonObject[];
  policies?: ReadonlyMap<string, PublicFactTypePolicy>;
}

const typedPublicFactTypesSnapshot =
  publicFactTypesSnapshot as unknown as PublicFactTypeSnapshot;

export const APPROVED_PUBLIC_FACT_TYPE_POLICIES = new Map<string, PublicFactTypePolicy>(
  (typedPublicFactTypesSnapshot.records || [])
    .filter((record) =>
      record.status === 'approved' &&
      typeof record.fact_type_id === 'string' &&
      /^[a-f0-9]{40}$/.test(record.blob_sha || '') &&
      record.display &&
      typeof record.display.title === 'string' &&
      record.display.relation_labels &&
      typeof record.display.relation_labels === 'object'
    )
    .map((record) => [
      record.fact_type_id,
      Object.freeze({
        factTypeId: record.fact_type_id,
        valueKind: record.value_kind,
        allowedScopeTypes: Object.freeze([...(record.allowed_scope_types || [])]),
        allowedActorRelations: Object.freeze([...(record.allowed_actor_relations || [])]),
        title: record.display.title,
        relationLabels: Object.freeze({ ...record.display.relation_labels }),
        ...(record.display.suffix ? { suffix: record.display.suffix } : {}),
      }) as PublicFactTypePolicy,
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

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function publicEntityNameMap(entities: readonly JsonObject[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const entity of entities) {
    const id = text(entity.entity_id);
    const name = text(entity.canonical_name);
    if (!id || !name || name.length > 160) continue;
    result.set(id, name);
  }
  return result;
}

function projectValue(
  value: JsonObject,
  expectedKind: PublicFactTypePolicy['valueKind'],
): { payload: JsonObject; displayValue: string | number | boolean; suffix?: string } | null {
  const kind = text(value.kind);
  if (kind !== expectedKind) return null;

  if (kind === 'percentage') {
    const candidate = value.value;
    if (typeof candidate !== 'number' || !Number.isFinite(candidate) || candidate < 0 || candidate > 100) return null;
    return { payload: { kind, value: candidate }, displayValue: candidate, suffix: '%' };
  }
  if (kind === 'money') {
    const amount = value.amount;
    const currency = text(value.currency);
    if (typeof amount !== 'number' || !Number.isFinite(amount) || !currency || !/^[A-Z]{3}$/.test(currency)) return null;
    return {
      payload: { kind, amount, currency },
      displayValue: amount,
      suffix: currency,
    };
  }
  if (kind === 'number') {
    const candidate = value.value;
    const unitCode = text(value.unit_code);
    if (typeof candidate !== 'number' || !Number.isFinite(candidate) || !unitCode || unitCode.length > 32) return null;
    return {
      payload: { kind, value: candidate, unit_code: unitCode },
      displayValue: candidate,
      suffix: unitCode,
    };
  }
  if (kind === 'count') {
    const candidate = value.value;
    if (!Number.isInteger(candidate) || Number(candidate) < 0) return null;
    return { payload: { kind, value: candidate }, displayValue: Number(candidate) };
  }
  if (kind === 'date') {
    const candidate = text(value.value);
    if (!candidate || !/^\d{4}-\d{2}-\d{2}$/.test(candidate) || !Number.isFinite(Date.parse(`${candidate}T00:00:00Z`))) return null;
    return { payload: { kind, value: candidate }, displayValue: candidate };
  }
  if (kind === 'boolean') {
    if (typeof value.value !== 'boolean') return null;
    return { payload: { kind, value: value.value }, displayValue: value.value };
  }
  return null;
}

function safeRelationLabel(
  template: string,
  targetEntityName: string,
  relatedEntityName: string | null,
): string | null {
  if (!template || template.length > 160) return null;
  if (template.includes('{related_entity}') && !relatedEntityName) return null;
  const rendered = template
    .replaceAll('{target_entity}', targetEntityName)
    .replaceAll('{related_entity}', relatedEntityName || '')
    .trim();
  if (!rendered || rendered.length > 200 || /\{[a-z_]+\}/i.test(rendered)) return null;
  return rendered;
}

function scopeLabel(scopeType: string): string {
  const labels: Record<string, string> = {
    company: 'Company',
    transaction: 'Transaction',
    joint_venture: 'Joint venture',
    product: 'Product',
    market: 'Market',
    other: 'Other scope',
  };
  return labels[scopeType] || 'Fact scope';
}

function sourceUrlsFor(
  evidenceIds: readonly string[],
  sourceUrlByEvidenceId: ReadonlyMap<string, string>,
): string[] {
  const urls: string[] = [];
  for (const id of evidenceIds) {
    const raw = sourceUrlByEvidenceId.get(id);
    if (!raw) return [];
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:') return [];
      urls.push(url.toString());
    } catch {
      return [];
    }
  }
  return [...new Set(urls)].slice(0, 8);
}

export function publicFactReferencedEntityIds(typedRecordSet: unknown): string[] {
  const typed = objectValue(typedRecordSet);
  const extensions = typed ? objectValue(typed.extensions) : null;
  const output = extensions ? objectValue(extensions['public_facts.v1']) : null;
  if (!output || output.schema_version !== 'public-fact-output.v1' || output.producer_lane !== 'VERIFY_RECONCILE') {
    return [];
  }

  const ids = new Set<string>();
  for (const candidate of Array.isArray(output.facts) ? output.facts.slice(0, 256) : []) {
    const fact = objectValue(candidate);
    if (!fact) continue;
    const targetEntityId = text(fact.target_entity_id);
    if (targetEntityId) ids.add(targetEntityId);
    const context = objectValue(fact.context);
    const relatedEntityId = context ? text(context.related_entity_id) : null;
    if (relatedEntityId) ids.add(relatedEntityId);
    if (ids.size >= 64) break;
  }
  return [...ids].sort();
}

export function projectTypedPublicFacts(input: PublicFactProjectionInput): JsonObject[] {
  const typed = objectValue(input.typedRecordSet);
  if (!typed) return [];
  const extensions = objectValue(typed.extensions);
  const output = extensions ? objectValue(extensions['public_facts.v1']) : null;
  if (!output || output.schema_version !== 'public-fact-output.v1' || output.producer_lane !== 'VERIFY_RECONCILE') {
    return [];
  }

  const typedSubjectRef = text(typed.subject_ref);
  if (!typedSubjectRef) return [];
  const facts = Array.isArray(output.facts) ? output.facts : [];
  const entityNames = publicEntityNameMap(input.publicEntities);
  const policies = input.policies || APPROVED_PUBLIC_FACT_TYPE_POLICIES;
  const observations: JsonObject[] = [];

  for (const candidate of facts) {
    const fact = objectValue(candidate);
    if (!fact) continue;
    const factId = text(fact.fact_id);
    const factTypeId = text(fact.fact_type_id);
    const subjectRef = text(fact.subject_ref);
    const targetEntityId = text(fact.target_entity_id);
    const verificationStatus = text(fact.verification_status);
    const originType = text(fact.origin_type);
    const observedAt = text(fact.observed_at);
    const evidenceIds = stringArray(fact.evidence_ids);
    const context = objectValue(fact.context);
    const value = objectValue(fact.value);
    if (
      !factId || !/^pf_[a-f0-9]{24}$/.test(factId) ||
      !factTypeId ||
      subjectRef !== typedSubjectRef ||
      !targetEntityId ||
      verificationStatus !== 'SUPPORTED' ||
      !originType ||
      !observedAt ||
      !Number.isFinite(Date.parse(observedAt)) ||
      evidenceIds.length === 0 ||
      !evidenceIds.every((id) => input.allowedEvidenceIds.has(id)) ||
      !context ||
      !value
    ) continue;

    const policy = policies.get(factTypeId);
    if (!policy) continue;
    const scopeType = text(context.scope_type);
    const actorRelation = text(context.actor_relation);
    const relatedEntityId = text(context.related_entity_id);
    if (
      !scopeType ||
      !policy.allowedScopeTypes.includes(scopeType) ||
      !actorRelation ||
      !policy.allowedActorRelations.includes(actorRelation)
    ) continue;

    const targetEntityName = entityNames.get(targetEntityId);
    if (!targetEntityName) continue;
    const relatedEntityName = relatedEntityId ? entityNames.get(relatedEntityId) || null : null;
    if (relatedEntityId && !relatedEntityName) continue;

    const relationTemplate = policy.relationLabels[actorRelation];
    if (!relationTemplate) continue;
    const relationLabel = safeRelationLabel(
      relationTemplate,
      targetEntityName,
      relatedEntityName,
    );
    if (!relationLabel) continue;

    const projectedValue = projectValue(value, policy.valueKind);
    if (!projectedValue) continue;
    const sourceUrls = sourceUrlsFor(evidenceIds, input.sourceUrlByEvidenceId);
    if (sourceUrls.length === 0) continue;

    const publicPayload: JsonObject = {
      fact_type_id: factTypeId,
      subject_ref: subjectRef,
      target_entity_id: targetEntityId,
      context: {
        scope_type: scopeType,
        actor_relation: actorRelation,
        related_entity_id: relatedEntityId,
      },
      value: projectedValue.payload,
    };
    const serialized = JSON.stringify(publicPayload);
    if (new TextEncoder().encode(serialized).byteLength > 12 * 1024) continue;

    const displaySuffix = policy.suffix || projectedValue.suffix;
    observations.push({
      observation_id: `obs_${sha256Sync(`public-fact|${factId}`).slice(0, 24)}`,
      observation_type: 'public_fact.v1',
      entity_id: targetEntityId,
      origin_type: originType,
      verification_status: 'SUPPORTED',
      observed_at: observedAt,
      evidence_ids: evidenceIds,
      text: policy.title,
      public_payload: publicPayload,
      public_display: {
        title: policy.title,
        subject: scopeLabel(scopeType),
        facts: [{
          label: relationLabel,
          value: projectedValue.displayValue,
          ...(displaySuffix ? { suffix: displaySuffix } : {}),
        }],
        source_label: 'Source',
        source_urls: sourceUrls,
      },
    });
  }

  return observations;
}
