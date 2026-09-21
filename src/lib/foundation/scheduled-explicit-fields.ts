import { sha256Sync } from '@/shared/sha256';

type Row = Record<string, unknown>;
const record = (v: unknown): v is Row => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): string | null => typeof v === 'string' && v.trim() ? v.trim() : null;
const INVALID = Symbol('invalid-explicit-field');
type Invalid = typeof INVALID;
const rows = (v: unknown): Row[] => record(v) ? [v] : Array.isArray(v) ? v.filter(record) : [];
function rowsWithIssues(v: unknown, field: string, issues: string[]): Row[] {
  if (record(v)) return [v];
  if (!Array.isArray(v)) return [];
  return v.flatMap((item, index) => {
    if (record(item)) return [item];
    issues.push(`${field}[${index}] is not an object; original row snapshot retained`);
    return [];
  });
}
const body = (row: Row): Row => record(row.normalized) ? { ...row, ...row.normalized } : row;
export const isScheduledEntityId = (v: unknown): boolean => typeof v === 'string' && /^ent_[a-z0-9]+_[a-f0-9]{20}$/.test(v);

export function resolveScheduledEntityName(input: Row): { name: string; sourceEntityId: string | null } | null {
  const row = body(input), entities = rows(row.Entity);
  const ref = record(row.source_run_ref) ? row.source_run_ref : {};
  const sourceId = text(row.source_entity_id) || text(ref.entity_id)
    || (isScheduledEntityId(row.subject_or_entity_id) ? text(row.subject_or_entity_id) : null);
  const matched = sourceId ? entities.filter(e => (text(e.id) || text(e.entity_id)) === sourceId) : entities;
  const selected = matched.length === 1 ? matched[0]
    : matched.length === 0 && !sourceId && entities.length === 1 && !text(entities[0].id) && !text(entities[0].entity_id) ? entities[0] : null;
  if (!selected) return null;
  const name = text(selected.name) || text(selected.canonical_name);
  if (!name || isScheduledEntityId(name)) return null;
  return { name, sourceEntityId: sourceId || text(selected.id) || text(selected.entity_id) };
}

export interface ScheduledExplicitFieldContext {
  runId: string;
  entityId: string;
  rowIndex: number;
  observedAt: string;
  /** Caller must have matched these IDs against actual canonical Evidence. */
  evidenceIds: string[];
  confidence: number;
}

interface ScheduledExplicitFields {
  claims: Row[];
  metrics: Row[];
  money_signals: Row[];
  events: Row[];
  relationships: Row[];
  issues: string[];
}

const statuses = new Set(['SUPPORTED', 'UNVERIFIED', 'CONFLICTED', 'SUPERSEDED', 'RETRACTED']);
const origins = new Set(['reported', 'observed', 'estimated', 'inferred', 'unknown']);
const scalar = (v: unknown): v is string | number => (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.trim().length > 0);
const date = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(v);
  if (!match || Number(match[4]) > 23 || Number(match[5]) > 59 || Number(match[6]) > 59 || Number.isNaN(Date.parse(v))) return null;
  const calendar = new Date(0);
  calendar.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  calendar.setUTCHours(0, 0, 0, 0);
  return calendar.getUTCFullYear() === Number(match[1]) && calendar.getUTCMonth() === Number(match[2]) - 1
    && calendar.getUTCDate() === Number(match[3]) ? v : null;
};
function evidenceRefs(v: unknown, issues: string[], field: string, arrayMember = false): { refs: string[]; invalid: boolean } {
  if (typeof v === 'string') return { refs: [v], invalid: false };
  if (Array.isArray(v)) {
    let invalid = false;
    const refs = v.flatMap((item, index) => {
      const parsed = evidenceRefs(item, issues, `${field}[${index}]`, true);
      invalid ||= parsed.invalid;
      return parsed.refs;
    });
    return { refs, invalid };
  }
  if (record(v)) {
    const nested = v.evidence_ids ?? v.evidence_id ?? v.id;
    if (nested === undefined) {
      if (arrayMember) {
        issues.push(`${field} is missing an evidence ID; original row snapshot retained`);
        return { refs: [], invalid: true };
      }
      return { refs: [], invalid: false };
    }
    return evidenceRefs(nested, issues, field);
  }
  if (arrayMember || (v !== undefined && v !== null)) {
    issues.push(`${field} contains an invalid evidence reference; original row snapshot retained`);
    return { refs: [], invalid: true };
  }
  return { refs: [], invalid: false };
}

const optionalString = (v: unknown, field: string, issues: string[]): string | null | Invalid => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') return v;
  issues.push(`${field} must be a string or null; original row snapshot retained`);
  return INVALID;
};
const optionalDate = (v: unknown, field: string, issues: string[]): string | null | Invalid => {
  if (v === undefined || v === null) return null;
  const parsed = date(v);
  if (parsed) return parsed;
  issues.push(`${field} is not a valid RFC3339 date-time; original row snapshot retained`);
  return INVALID;
};
const dateFields = (item: Row, fields: string[], prefix: string, issues: string[]): Row | null => {
  const values: Row = {};
  let valid = true;
  fields.forEach((field) => {
    const value = optionalDate(item[field], `${prefix}.${field}`, issues);
    if (value === INVALID) valid = false;
    else values[field] = value;
  });
  return valid ? values : null;
};
const optionalFields = (item: Row, fields: string[], prefix: string, issues: string[]): Row | null => {
  const values: Row = {};
  let valid = true;
  fields.forEach((field) => {
    const value = optionalString(item[field], `${prefix}.${field}`, issues);
    if (value === INVALID) valid = false;
    else values[field] = value;
  });
  return valid ? values : null;
};

/** Provider-neutral, no mutation or I/O. Only explicit existing-schema fields. */
export function extractScheduledExplicitFields(input: Row, context: ScheduledExplicitFieldContext): ScheduledExplicitFields {
  const row = body(input), quality = record(row.quality) ? row.quality : {};
  const rawParent = text(quality.verification_status) || text(quality.verification);
  // Do not inherit the enclosing snapshot observation's SUPPORTED flag.
  const result: ScheduledExplicitFields = {
    claims: [], metrics: [], money_signals: [], events: [], relationships: [], issues: [],
  };
  if (rawParent && !statuses.has(rawParent)) {
    result.issues.push(`quality verification status ${rawParent} is unknown; original row snapshot retained`);
  }
  const parent = rawParent && statuses.has(rawParent) ? rawParent : 'UNVERIFIED';
  if (!/^run_[A-Za-z0-9_.:-]+$/.test(context.runId) || !isScheduledEntityId(context.entityId)
    || !Number.isSafeInteger(context.rowIndex) || context.rowIndex < 0
    || !date(context.observedAt) || context.evidenceIds.length === 0
    || context.evidenceIds.some(v => !/^ev_[a-f0-9]{24}$/.test(v)) || !Number.isFinite(context.confidence)) {
    result.issues.push('Invalid explicit-field context or missing verified evidence'); return result;
  }
  const entityRows = rowsWithIssues(row.Entity, 'Entity', result.issues);
  const claimRows = rowsWithIssues(row.Claim, 'Claim', result.issues);
  const metricRows = rowsWithIssues(row.Metric, 'Metric', result.issues);
  const moneyRows = rowsWithIssues(row.MoneySignal, 'MoneySignal', result.issues);
  const eventRows = rowsWithIssues(row.Event, 'Event', result.issues);
  const relationshipRows = rowsWithIssues(row.Relationship, 'Relationship', result.issues);
  rowsWithIssues(row.Observation, 'Observation', result.issues);
  rowsWithIssues(row.Derived, 'Derived', result.issues);
  const allowed = new Set(context.evidenceIds);
  const defaultEvidence = evidenceRefs(row.Evidence, result.issues, 'Evidence');
  const proof = (item: Row): Row | null => {
    const explicit = item.evidence_ids ?? item.evidence_ids_if_any ?? item.Evidence;
    const parsed = explicit !== undefined
      ? evidenceRefs(explicit, result.issues, 'Explicit evidence')
      : defaultEvidence;
    const refs = explicit !== undefined ? parsed.refs : context.evidenceIds;
    if (parsed.invalid || (refs.length === 0 || refs.some(v => !allowed.has(v)))) {
      result.issues.push('Explicit record evidence does not match the supplied canonical evidence'); return null;
    }
    const raw = text(item.verification_status) || text(item.verification);
    if (raw && !statuses.has(raw)) {
      result.issues.push(`Explicit record verification status ${raw} is unknown; original row snapshot retained`);
      return null;
    }
    const child = raw || parent;
    const restrictive = ['RETRACTED', 'SUPERSEDED', 'CONFLICTED', 'UNVERIFIED'];
    const verification = restrictive.find(status => status === child || status === parent) || 'SUPPORTED';
    const confidence = Number.isFinite(context.confidence) ? Math.max(0, Math.min(context.confidence, verification === 'SUPPORTED' ? 1 : 0.5)) : 0;
    return { verification_status: verification, confidence, evidence_ids: [...new Set(refs)] };
  };
  const origin = (item: Row, field: string): string | null => {
    const value = text(item.origin_type) || text(item.origin);
    if (!value) return 'unknown';
    if (!origins.has(value)) {
      result.issues.push(`${field} origin ${value} is unknown; original row snapshot retained`);
      return null;
    }
    return value;
  };
  const id = (prefix: string, kind: string, index: number, item: Row) => prefix + sha256Sync(JSON.stringify({
    run: context.runId, entity: context.entityId, row: context.rowIndex, kind, index, item,
  })).slice(0, 24);
  const periods = (item: Row, field: string): Row | null => {
    const dates = dateFields(item, ['period_start', 'period_end', 'point_in_time'], field, result.issues);
    const strings = optionalFields(item, ['basis', 'scope'], field, result.issues);
    return dates && strings ? { ...dates, ...strings } : null;
  };
  claimRows.forEach((item, index) => {
    const statement = text(item.statement) || text(item.text), p = proof(item);
    const originValue = origin(item, `Claim[${index}]`);
    const dates = dateFields(item, ['occurred_at', 'valid_from', 'valid_to'], `Claim[${index}]`, result.issues);
    if (!statement || !p || !originValue || !dates) { if (!statement) result.issues.push('Structured Claim lacks explicit statement'); return; }
    result.claims.push({ claim_id: id('cl_', 'claim', index, item), entity_ids: [context.entityId], statement,
      origin_type: originValue, ...p, ...dates });
  });
  metricRows.forEach((item, index) => {
    const type = text(item.metric_type) || text(item.type) || text(item.name), p = proof(item);
    const originValue = origin(item, `Metric[${index}]`);
    const periodValue = periods(item, `Metric[${index}]`);
    const stringValue = optionalFields(item, ['unit', 'currency'], `Metric[${index}]`, result.issues);
    if (!type || !scalar(item.value) || !p || !originValue || !periodValue || !stringValue) {
      if (!type || !scalar(item.value)) result.issues.push('Structured Metric lacks explicit type/value'); return;
    }
    result.metrics.push({ metric_id: id('mt_', 'metric', index, item), entity_id: context.entityId, metric_type: type,
      value: item.value, ...stringValue, ...periodValue, origin_type: originValue, ...p });
  });
  moneyRows.forEach((item, index) => {
    const type = text(item.money_type) || text(item.type), purpose = text(item.purpose), p = proof(item);
    if (!type || !purpose || (item.amount !== undefined && item.amount !== null && !scalar(item.amount)) || !p) {
      if (!type || !purpose || (item.amount !== undefined && item.amount !== null && !scalar(item.amount))) result.issues.push('Structured MoneySignal has invalid explicit fields'); return;
    }
    const originValue = origin(item, `MoneySignal[${index}]`);
    const periodValue = periods(item, `MoneySignal[${index}]`);
    const stringValue = optionalFields(item, ['currency', 'unit', 'amount_label'], `MoneySignal[${index}]`, result.issues);
    const payer = item.payer_entity_id === undefined || item.payer_entity_id === null ? null : text(item.payer_entity_id);
    const receiver = item.receiver_entity_id === undefined || item.receiver_entity_id === null ? null : text(item.receiver_entity_id);
    if ((item.payer_entity_id !== undefined && item.payer_entity_id !== null && !payer)
      || (item.receiver_entity_id !== undefined && item.receiver_entity_id !== null && !receiver)) {
      result.issues.push(`MoneySignal[${index}] counterparty identity is invalid; original row snapshot retained`);
    }
    if ((payer && payer !== context.entityId) || (receiver && receiver !== context.entityId)) {
      result.issues.push('MoneySignal counterparty identity is not resolved in this entity context'); return;
    }
    if (!originValue || !periodValue || !stringValue
      || (item.payer_entity_id !== undefined && item.payer_entity_id !== null && !payer)
      || (item.receiver_entity_id !== undefined && item.receiver_entity_id !== null && !receiver)) return;
    result.money_signals.push({ money_signal_id: id('ms_', 'money', index, item), payer_entity_id: payer,
      receiver_entity_id: receiver, purpose, money_type: type, amount: item.amount ?? null,
      ...stringValue, ...periodValue, origin_type: originValue, ...p });
  });
  eventRows.forEach((item, index) => {
    const type = text(item.event_type) || text(item.type), description = text(item.description) || text(item.text) || text(item.state), p = proof(item);
    const originValue = origin(item, `Event[${index}]`);
    const dates = dateFields(item, ['occurred_at'], `Event[${index}]`, result.issues);
    if (!type || !description || !p || !originValue || !dates) { if (!type || !description) result.issues.push('Structured Event lacks explicit type/description'); return; }
    result.events.push({ event_id: id('evt_', 'event', index, item), entity_ids: [context.entityId], event_type: type,
      description, ...dates, ...p });
  });
  const identity = resolveScheduledEntityName(row);
  const selected = identity ? entityRows.filter(e => (text(e.id) || text(e.entity_id)) === identity.sourceEntityId
    || (!text(e.id) && !text(e.entity_id) && entityRows.length === 1)) : [];
  const subjectNames = new Set([context.entityId, identity?.sourceEntityId, identity?.name,
    ...selected.flatMap(e => Array.isArray(e.aliases) ? e.aliases.filter(v => typeof v === 'string') : [])].filter(Boolean));
  relationshipRows.forEach((item, index) => {
    const predicate = text(item.predicate) || text(item.type), object = text(item.object), p = proof(item);
    const subjectSupplied = item.subject_entity_id !== undefined || item.subject !== undefined;
    const subject = subjectSupplied ? text(item.subject_entity_id ?? item.subject) : null;
    const dates = dateFields(item, ['valid_from', 'valid_to'], `Relationship[${index}]`, result.issues);
    if (!predicate || !object || !p || !dates || (subjectSupplied && !subject) || (subject && !subjectNames.has(subject))) {
      if (!predicate || !object || (subjectSupplied && !subject) || (subject && !subjectNames.has(subject))) {
        result.issues.push('Structured Relationship has unresolved or invalid supplied subject/predicate/object');
      }
      return;
    }
    result.relationships.push({ relationship_id: id('rel_', 'relationship', index, item), subject_entity_id: context.entityId,
      predicate, object, ...dates, ...p });
  });
  return result;
}
