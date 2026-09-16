import fs from 'node:fs';
import crypto from 'node:crypto';

const bundlePath = process.env.MM_BUNDLE_PATH ?? 'data/incoming/research-bundle_new1000_r2captured1000_20260916.json';
const outputPath = process.env.MM_OUTPUT_PATH ?? '/tmp/mm-journal-plan-fearless-20260916.json';
const request = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const bundle = request.bundle;
const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const strings = (value) => Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : [];
const dt = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
const safeType = (value) => value.replace(/[^A-Za-z0-9._:-]+/g, '_').replace(/^_+|_+$/g, '') || 'general';
const recordId = (kind, row, index) => text(row[{ entity: 'entity_id', claim: 'claim_id', metric: 'metric_id', money_signal: 'money_signal_id' }[kind]]) || String(index);
const observedAt = (row, fallback) => {
  for (const key of ['observed_at', 'occurred_at', 'point_in_time', 'period_end', 'period_start', 'valid_from']) { const value = dt(row[key]); if (value) return value; }
  return fallback;
};
const validTime = (row) => {
  const value = { point_in_time: dt(row.point_in_time), valid_from: dt(row.valid_from), valid_to: dt(row.valid_to), period_start: dt(row.period_start), period_end: dt(row.period_end) };
  return Object.values(value).some(Boolean) ? value : null;
};
const subjectRefs = (kind, row) => {
  const refs = new Set();
  for (const id of strings(row.entity_ids)) refs.add(id);
  for (const key of ['entity_id', 'subject_entity_id', 'payer_entity_id', 'receiver_entity_id']) { const value = text(row[key]); if (value) refs.add(value); }
  if (kind === 'entity' && text(row.entity_id)) refs.add(text(row.entity_id));
  return [...refs];
};
const sourceIds = (evidenceIds) => [...new Set((bundle.evidence ?? []).filter(isObject).filter((item) => evidenceIds.includes(String(item.evidence_id))).map((item) => text(item.source_id)).filter(Boolean))];
const originalText = (row) => { for (const key of ['text', 'statement', 'description', 'canonical_name', 'purpose']) { const value = text(row[key]); if (value) return value; } return null; };
const observationType = (kind, row) => {
  if (kind === 'metric') return `foundation.metric.${safeType(text(row.metric_type) || 'general')}`;
  if (kind === 'money_signal') return `foundation.money.${safeType(text(row.money_type) || 'general')}`;
  if (kind === 'entity') return 'foundation.entity.identity';
  return `foundation.${kind}`;
};
const makeEntry = (kind, row, index) => {
  const id = recordId(kind, row, index);
  const evidenceIds = [...new Set(strings(row.evidence_ids))];
  const runId = text(bundle.run_id) || 'run_unknown';
  const recordedAt = dt(bundle.retrieved_at) || '2026-09-16T00:00:00.000Z';
  const seed = `${runId}|${kind}|${id}|${JSON.stringify(row)}`;
  const origin = text(row.origin_type);
  const verification = text(row.verification_status);
  return {
    schema_version: 'journal-entry.v1', journal_id: `jr_${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 24)}`,
    subject_refs: subjectRefs(kind, row), observation_type: observationType(kind, row), payload_schema_ref: null, payload: row,
    text_original: originalText(row), origin_type: ['reported', 'observed', 'estimated', 'inferred', 'unknown'].includes(origin || '') ? origin : 'observed',
    verification_status: ['SUPPORTED', 'CONFLICTED', 'UNVERIFIED', 'SUPERSEDED', 'RETRACTED'].includes(verification || '') ? verification : 'UNVERIFIED',
    confidence: typeof row.confidence === 'number' && row.confidence >= 0 && row.confidence <= 1 ? row.confidence : 0.5,
    source_availability: evidenceIds.length ? 'source_backed' : 'source_not_yet_checked', valid_time: validTime(row), observed_at: observedAt(row, recordedAt), recorded_at: recordedAt,
    provenance: { run_id: runId, collector: text(bundle.agent?.name) || 'unknown-agent', collection_channel: text(row.collection_channel) || 'research_bundle', purpose: text(bundle.purpose), source_ids: sourceIds(evidenceIds), source_locator: null, parser_or_transform_version: 'make-money-journal-materializer.v1' },
    evidence_ids: evidenceIds, supersedes: strings(row.supersedes), superseded_by: strings(row.superseded_by), typed_projection_refs: [`${kind}:${id}`], rights_status: null, tags: [kind], notes: null,
  };
};
const entries = [];
for (const [kind, rows] of [['entity', bundle.entities], ['claim', bundle.claims], ['metric', bundle.metrics], ['money_signal', bundle.money_signals]]) {
  if (!Array.isArray(rows)) continue;
  rows.filter(isObject).forEach((row, index) => entries.push(makeEntry(kind, row, index)));
}
if (entries.length !== 4000) throw new Error(`Expected 4000 journal entries, got ${entries.length}`);
const objects = entries.map((entry) => {
  const body = `${JSON.stringify(entry)}\n`;
  return { logical_role: 'journal_entry', dataset_id: 'ds.foundation.journal.core', bucket: 'foundation-lake', key: `journal/v1/2026/09/16/${entry.journal_id}.json`, content_sha256: crypto.createHash('sha256').update(body).digest('hex'), bytes: Buffer.byteLength(body), content_type: 'application/json; charset=utf-8', create_only: true, source_evidence_ids: entry.evidence_ids, local_path: null, preflight_status: 'NOT_CHECKED' };
});
const plan = { schema_version: 'planned-writes.v1', run_id: `${bundle.run_id}.journal`, write_authorized: false, objects, forbidden_operations: ['CopyObject', 'DeleteObject', 'Move', 'Rename', 'Overwrite', 'LegacyUniversalMutation'] };
fs.writeFileSync(outputPath, `${JSON.stringify({ entries, planned_writes: plan }, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, entries: entries.length, objects: objects.length }, null, 2));
