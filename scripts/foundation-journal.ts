import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import {
  getFoundationBucket,
  preflightR2Object,
  putR2ObjectCreateOnly,
  sha256Hex,
  R2ObjectConflictError,
} from '../src/lib/storage/r2';

type Row = Record<string, unknown>;
const isObject = (x: unknown): x is Row => !!x && typeof x === 'object' && !Array.isArray(x);
const strings = (x: unknown): string[] => Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string' && !!v.trim()) : [];
const text = (x: unknown): string | null => typeof x === 'string' && x.trim() ? x.trim() : null;
const dt = (x: unknown): string | null => typeof x === 'string' && !Number.isNaN(Date.parse(x)) ? x : null;

function safeType(value: string) {
  return value.replace(/[^A-Za-z0-9._:-]+/g, '_').replace(/^_+|_+$/g, '') || 'general';
}

function subjectRefs(kind: string, row: Row, bundle: Row): string[] {
  const refs = new Set<string>();
  for (const id of strings(row.entity_ids)) refs.add(id);
  for (const key of ['entity_id', 'subject_entity_id', 'payer_entity_id', 'receiver_entity_id']) {
    const value = text(row[key]); if (value) refs.add(value);
  }
  if (kind === 'entity') { const id = text(row.entity_id); if (id) refs.add(id); }
  if (!refs.size) {
    const runId = text(bundle.run_id); if (runId) refs.add(`run:${runId}`);
    else refs.add(`query:${text((bundle.subject as Row | undefined)?.query) || 'unknown'}`);
  }
  return [...refs];
}

function evidenceIds(row: Row) { return [...new Set(strings(row.evidence_ids))]; }
function sourceIds(bundle: Row, ids: string[]) {
  const wanted = new Set(ids); const out = new Set<string>();
  for (const ev of Array.isArray(bundle.evidence) ? bundle.evidence.filter(isObject) : []) {
    if (wanted.has(String(ev.evidence_id))) { const sourceId = text(ev.source_id); if (sourceId) out.add(sourceId); }
  }
  return [...out];
}

function observedAt(row: Row, fallback: string) {
  for (const key of ['observed_at', 'occurred_at', 'point_in_time', 'period_end', 'period_start', 'valid_from']) {
    const value = dt(row[key]); if (value) return value;
  }
  return fallback;
}

function validTime(row: Row) {
  const value = {
    point_in_time: dt(row.point_in_time),
    valid_from: dt(row.valid_from),
    valid_to: dt(row.valid_to),
    period_start: dt(row.period_start),
    period_end: dt(row.period_end),
  };
  return Object.values(value).some(Boolean) ? value : null;
}

function originalText(row: Row): string | null {
  for (const key of ['text', 'statement', 'description', 'canonical_name', 'purpose']) {
    const value = text(row[key]); if (value) return value;
  }
  return null;
}

function recordId(kind: string, row: Row, index: number) {
  const keyMap: Record<string, string> = {
    entity: 'entity_id', claim: 'claim_id', metric: 'metric_id', money_signal: 'money_signal_id',
    event: 'event_id', relationship: 'relationship_id', observation: 'kind',
  };
  return text(row[keyMap[kind]]) || String(index);
}

function observationType(kind: string, row: Row) {
  if (kind === 'metric') return `foundation.metric.${safeType(text(row.metric_type) || 'general')}`;
  if (kind === 'money_signal') return `foundation.money.${safeType(text(row.money_type) || 'general')}`;
  if (kind === 'event') return `foundation.event.${safeType(text(row.event_type) || 'general')}`;
  if (kind === 'relationship') return `foundation.relationship.${safeType(text(row.predicate) || 'general')}`;
  if (kind === 'observation') return `foundation.observation.${safeType(text(row.kind) || 'general')}`;
  if (kind === 'entity') return 'foundation.entity.identity';
  return `foundation.${kind}`;
}

function projectionRef(kind: string, row: Row, index: number) {
  return kind === 'observation' ? [] : [`${kind}:${recordId(kind, row, index)}`];
}

function makeJournalEntry(kind: string, row: Row, index: number, bundle: Row) {
  const runId = text(bundle.run_id) || 'run_unknown';
  const recordedAt = dt(bundle.retrieved_at) || new Date().toISOString();
  const evIds = evidenceIds(row);
  const seed = `${runId}|${kind}|${recordId(kind, row, index)}|${JSON.stringify(row)}`;
  const journalId = `jr_${createHash('sha256').update(seed).digest('hex').slice(0, 24)}`;
  const agent = isObject(bundle.agent) ? bundle.agent : {};
  const origin = text(row.origin_type);
  const verification = text(row.verification_status);
  const confidence = typeof row.confidence === 'number' && row.confidence >= 0 && row.confidence <= 1 ? row.confidence : 0.5;

  return {
    schema_version: 'journal-entry.v1',
    journal_id: journalId,
    subject_refs: subjectRefs(kind, row, bundle),
    observation_type: observationType(kind, row),
    payload_schema_ref: null,
    payload: row,
    text_original: originalText(row),
    origin_type: ['reported','observed','estimated','inferred','unknown'].includes(origin || '') ? origin : 'observed',
    verification_status: ['SUPPORTED','CONFLICTED','UNVERIFIED','SUPERSEDED','RETRACTED'].includes(verification || '') ? verification : 'UNVERIFIED',
    confidence,
    source_availability: evIds.length ? 'source_backed' : 'source_not_yet_checked',
    valid_time: validTime(row),
    observed_at: observedAt(row, recordedAt),
    recorded_at: recordedAt,
    provenance: {
      run_id: runId,
      collector: text(agent.name) || 'unknown-agent',
      collection_channel: text(row.collection_channel) || 'research_bundle',
      purpose: text(bundle.purpose),
      source_ids: sourceIds(bundle, evIds),
      source_locator: null,
      parser_or_transform_version: 'make-money-journal-materializer.v1'
    },
    evidence_ids: evIds,
    supersedes: strings(row.supersedes),
    superseded_by: strings(row.superseded_by),
    typed_projection_refs: projectionRef(kind, row, index),
    rights_status: null,
    tags: [kind],
    notes: null
  };
}

function collectEntries(bundle: Row) {
  const entries: Row[] = [];
  const groups: Array<[string, unknown]> = [
    ['entity', bundle.entities], ['claim', bundle.claims], ['metric', bundle.metrics],
    ['money_signal', bundle.money_signals], ['event', bundle.events], ['relationship', bundle.relationships],
    ['observation', bundle.observations],
  ];
  for (const [kind, value] of groups) {
    if (!Array.isArray(value)) continue;
    value.filter(isObject).forEach((row, index) => entries.push(makeJournalEntry(kind, row, index, bundle)));
  }
  return entries;
}

function dateParts(value: string) {
  const d = new Date(value); return {
    year: String(d.getUTCFullYear()).padStart(4, '0'),
    month: String(d.getUTCMonth() + 1).padStart(2, '0'),
    day: String(d.getUTCDate()).padStart(2, '0'),
  };
}

async function main() {
  const [mode, input, output] = process.argv.slice(2);
  if (!['prepare', 'ingest'].includes(mode) || !input || !output) {
    throw new Error('Usage: foundation-journal.ts prepare|ingest REQUEST.json RECEIPT.json');
  }
  const canonical = process.env.FOUNDATION_REPO;
  if (!canonical) throw new Error('Set FOUNDATION_REPO to an authenticated clone of salve-de/universal-foundation');
  const request = JSON.parse(await readFile(resolve(input), 'utf8')) as Row;
  const bundle = request.bundle;
  if (!isObject(bundle)) throw new Error('request.bundle is required');

  const ajv = new Ajv2020({ allErrors: true, strict: false }); addFormats(ajv);
  const journalSchema = JSON.parse(await readFile(resolve(canonical, 'schemas/foundation/journal-entry.v1.schema.json'), 'utf8'));
  const plannedSchema = JSON.parse(await readFile(resolve(canonical, 'schemas/foundation/planned-writes.v1.schema.json'), 'utf8'));
  const validateJournal = ajv.compile(journalSchema); const validatePlan = ajv.compile(plannedSchema);

  const entries = collectEntries(bundle);
  for (const entry of entries) if (!validateJournal(entry)) throw new Error(JSON.stringify(validateJournal.errors));

  const bucket = getFoundationBucket('lake'); const objects = [] as Row[];
  for (const entry of entries) {
    const body = `${JSON.stringify(entry)}\n`; const parts = dateParts(String(entry.recorded_at));
    objects.push({
      logical_role: 'journal_entry', dataset_id: 'ds.foundation.journal.core', bucket,
      key: `journal/v1/${parts.year}/${parts.month}/${parts.day}/${entry.journal_id}.json`,
      content_sha256: await sha256Hex(body), bytes: new TextEncoder().encode(body).byteLength,
      content_type: 'application/json; charset=utf-8', create_only: true,
      source_evidence_ids: entry.evidence_ids, local_path: null, preflight_status: 'NOT_CHECKED', body
    });
  }
  const plan = {
    schema_version: 'planned-writes.v1', run_id: `${text(bundle.run_id) || 'run_unknown'}.journal`,
    write_authorized: mode === 'ingest',
    objects: objects.map((object) => {
      const metadata = { ...object };
      delete metadata.body;
      return metadata;
    }),
    forbidden_operations: ['CopyObject','DeleteObject','Move','Rename','Overwrite','LegacyUniversalMutation']
  };
  if (!validatePlan(plan)) throw new Error(JSON.stringify(validatePlan.errors));
  await writeFile(resolve(output), JSON.stringify({ entries, planned_writes: plan }, null, 2), { flag: 'wx' });
  if (mode === 'prepare') { console.log(JSON.stringify({ journal_entries: entries.length, planned: objects.length })); return; }
  if (request.write_authorized !== true) throw new Error('write_authorized:true required');

  for (const obj of objects) {
    const pre = await preflightR2Object({ bucket: String(obj.bucket), key: String(obj.key), body: String(obj.body), contentType: String(obj.content_type) });
    obj.preflight_status = pre.status;
    if (pre.status === 'EXISTS_CONFLICT') throw new R2ObjectConflictError(pre.bucket, pre.key);
  }
  const results = [] as Row[];
  for (const obj of objects) {
    const result = await putR2ObjectCreateOnly({
      bucket: String(obj.bucket), key: String(obj.key), body: String(obj.body), contentType: String(obj.content_type),
      metadata: { 'foundation-run-id': String(bundle.run_id), 'foundation-dataset-id': 'ds.foundation.journal.core', 'foundation-schema-version': 'journal-entry.v1' }
    });
    results.push(result as unknown as Row);
  }
  await writeFile(`${resolve(output)}.result.json`, JSON.stringify({ journal_entries: entries.length, results }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ journal_entries: entries.length, created: results.filter(x => x.status === 'CREATED').length, identical: results.filter(x => x.status === 'EXISTS_IDENTICAL').length }));
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Journal materialization failed'); process.exitCode = 1; });
