import fs from 'node:fs';
import crypto from 'node:crypto';

const oldPlanPath = process.env.MM_OLD_PLAN_PATH ?? '/tmp/mm-journal-plan-replaced-20260916.json';
const bundlePath = process.env.MM_BUNDLE_PATH ?? 'data/incoming/research-bundle_new1000_r2captured1000_20260916.json';
const outputPath = process.env.MM_OUTPUT_PATH ?? '/tmp/mm-journal-plan-reddit-replacements-20260916.json';
const oldPlan = JSON.parse(fs.readFileSync(oldPlanPath, 'utf8'));
const request = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const bundle = request.bundle;
const removedNames = new Set(JSON.parse(process.env.MM_REMOVED_NAMES ?? '["Easiest Way to Make Quick $$ With no Money or Skills","He\'s Earning $16K Per Month Via This MLM Company"]'));
const obsoleteRefs = new Set(oldPlan.entries.filter((entry) => [...removedNames].some((name) => JSON.stringify(entry).includes(name))).flatMap((entry) => entry.subject_refs || []));
const keep = oldPlan.entries.filter((entry) => ![...obsoleteRefs].some((ref) => (entry.subject_refs || []).includes(ref)));
const expectedRemoved = Number(process.env.MM_EXPECTED_REMOVED_ENTRIES ?? 8);
if (oldPlan.entries.length - keep.length !== expectedRemoved) throw new Error(`Expected ${expectedRemoved} obsolete journal entries, removed ${oldPlan.entries.length - keep.length}`);
const isObject = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const text = (x) => typeof x === 'string' && x.trim() ? x.trim() : null;
const strings = (x) => Array.isArray(x) ? x.filter((v) => typeof v === 'string' && v.trim()) : [];
const dt = (x) => typeof x === 'string' && !Number.isNaN(Date.parse(x)) ? x : null;
const safeType = (value) => value.replace(/[^A-Za-z0-9._:-]+/g, '_').replace(/^_+|_+$/g, '') || 'general';
const idFor = (kind, row, index) => text(row[{ entity: 'entity_id', claim: 'claim_id', metric: 'metric_id', money_signal: 'money_signal_id' }[kind]]) || String(index);
const observedAt = (row, fallback) => {
  for (const key of ['observed_at', 'occurred_at', 'point_in_time', 'period_end', 'period_start', 'valid_from']) { const v = dt(row[key]); if (v) return v; }
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
  if (kind === 'entity') { const id = text(row.entity_id); if (id) refs.add(id); }
  return [...refs];
};
const evIds = (row) => [...new Set(strings(row.evidence_ids))];
const sourceIds = (ids) => [...new Set(bundle.evidence.filter(isObject).filter((ev) => ids.includes(String(ev.evidence_id))).map((ev) => text(ev.source_id)).filter(Boolean))];
const originalText = (row) => { for (const key of ['text', 'statement', 'description', 'canonical_name', 'purpose']) { const value = text(row[key]); if (value) return value; } return null; };
const observationType = (kind, row) => {
  if (kind === 'metric') return `foundation.metric.${safeType(text(row.metric_type) || 'general')}`;
  if (kind === 'money_signal') return `foundation.money.${safeType(text(row.money_type) || 'general')}`;
  if (kind === 'entity') return 'foundation.entity.identity';
  return `foundation.${kind}`;
};
function makeEntry(kind, row, index) {
  const id = idFor(kind, row, index); const evidenceIds = evIds(row); const runId = text(bundle.run_id) || 'run_unknown'; const recordedAt = dt(bundle.retrieved_at) || '2026-09-16T00:00:00.000Z';
  const seed = `${runId}|${kind}|${id}|${JSON.stringify(row)}`;
  const origin = text(row.origin_type); const verification = text(row.verification_status);
  return { schema_version: 'journal-entry.v1', journal_id: `jr_${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 24)}`, subject_refs: subjectRefs(kind, row), observation_type: observationType(kind, row), payload_schema_ref: null, payload: row, text_original: originalText(row), origin_type: ['reported', 'observed', 'estimated', 'inferred', 'unknown'].includes(origin || '') ? origin : 'observed', verification_status: ['SUPPORTED', 'CONFLICTED', 'UNVERIFIED', 'SUPERSEDED', 'RETRACTED'].includes(verification || '') ? verification : 'UNVERIFIED', confidence: typeof row.confidence === 'number' && row.confidence >= 0 && row.confidence <= 1 ? row.confidence : 0.5, source_availability: evidenceIds.length ? 'source_backed' : 'source_not_yet_checked', valid_time: validTime(row), observed_at: observedAt(row, recordedAt), recorded_at: recordedAt, provenance: { run_id: runId, collector: text(bundle.agent?.name) || 'unknown-agent', collection_channel: text(row.collection_channel) || 'research_bundle', purpose: text(bundle.purpose), source_ids: sourceIds(evidenceIds), source_locator: null, parser_or_transform_version: 'make-money-journal-materializer.v1' }, evidence_ids: evidenceIds, supersedes: strings(row.supersedes), superseded_by: strings(row.superseded_by), typed_projection_refs: kind === 'observation' ? [] : [`${kind}:${id}`], rights_status: null, tags: [kind], notes: null };
}
const selected = new Set(JSON.parse(process.env.MM_SELECTED_NAMES ?? '["Anonymous Feedback Widget SaaS (Gr00byandahalf)","Unlust (anonymous solo B2C app)"]'));
const selectedFoundationIds = new Set(bundle.entities.filter((row) => selected.has(row.canonical_name)).map((row) => row.entity_id));
const additions = [];
for (const [kind, rows] of [['entity', bundle.entities], ['claim', bundle.claims], ['metric', bundle.metrics], ['money_signal', bundle.money_signals]]) {
  rows.filter(isObject).forEach((row, index) => {
    const haystack = JSON.stringify(row);
    const related = kind === 'entity' ? selectedFoundationIds.has(row.entity_id) : kind === 'claim' ? row.entity_ids?.some((id) => selectedFoundationIds.has(id)) : kind === 'metric' ? selectedFoundationIds.has(row.entity_id) : selectedFoundationIds.has(row.receiver_entity_id);
    if (related || [...selected].some((name) => haystack.includes(name))) additions.push(makeEntry(kind, row, index));
  });
}
const expectedAdded = Number(process.env.MM_EXPECTED_ADDED_ENTRIES ?? 8);
if (additions.length !== expectedAdded) throw new Error(`Expected ${expectedAdded} replacement journal entries, got ${additions.length}`);
const entries = keep.concat(additions);
if (entries.length !== 4000) throw new Error(`Expected 4000 journal entries, got ${entries.length}`);
const objects = entries.map((entry) => {
  const body = `${JSON.stringify(entry)}\n`; const hash = crypto.createHash('sha256').update(body).digest('hex');
  return { logical_role: 'journal_entry', dataset_id: 'ds.foundation.journal.core', bucket: 'foundation-lake', key: `journal/v1/2026/09/16/${entry.journal_id}.json`, content_sha256: hash, bytes: Buffer.byteLength(body), content_type: 'application/json; charset=utf-8', create_only: true, source_evidence_ids: entry.evidence_ids, local_path: null, preflight_status: 'NOT_CHECKED' };
});
const plan = { schema_version: 'planned-writes.v1', run_id: 'run_make_money_new1000_20260916.journal', write_authorized: false, objects, forbidden_operations: ['CopyObject', 'DeleteObject', 'Move', 'Rename', 'Overwrite', 'LegacyUniversalMutation'] };
fs.writeFileSync(outputPath, JSON.stringify({ entries, planned_writes: plan }, null, 2));
console.log(JSON.stringify({ outputPath, kept: keep.length, added: additions.length, planned: objects.length, addedNames: [...selected] }, null, 2));
