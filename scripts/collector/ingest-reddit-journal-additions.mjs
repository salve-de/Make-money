import fs from 'node:fs';
import crypto from 'node:crypto';

const planPath = process.env.MM_PLAN_PATH ?? '/tmp/mm-journal-plan-reddit-replacements-20260916.json';
const outputPath = process.env.MM_RESULT_PATH ?? '/tmp/mm-journal-reddit-replacements-result-20260916.json';
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const selectedNames = new Set(JSON.parse(process.env.MM_SELECTED_NAMES ?? '["Anonymous Feedback Widget SaaS (Gr00byandahalf)","Unlust (anonymous solo B2C app)"]'));
const identityRefs = new Set(plan.entries.filter((entry) => selectedNames.has(entry.payload?.canonical_name)).flatMap((entry) => entry.subject_refs || []));
const wantedRefs = identityRefs;
const items = plan.entries.map((entry, index) => ({ entry, object: plan.planned_writes.objects[index] })).filter(({ entry }) => [...wantedRefs].some((ref) => (entry.subject_refs || []).includes(ref)));
const expectedItems = Number(process.env.MM_EXPECTED_ITEMS ?? 8);
if (items.length !== expectedItems) throw new Error(`Expected ${expectedItems} new journal entries, got ${items.length}`);
const { preflightR2Object, putR2ObjectCreateOnly } = await import('../../src/lib/storage/r2.ts');
const results = [];
for (const item of items) {
  const body = `${JSON.stringify(item.entry)}\n`;
  const hash = crypto.createHash('sha256').update(body).digest('hex');
  if (hash !== item.object.content_sha256 || Buffer.byteLength(body) !== item.object.bytes) throw new Error(`Plan mismatch: ${item.object.key}`);
  const preflight = await preflightR2Object({ bucket: item.object.bucket, key: item.object.key, body, contentType: item.object.content_type });
  if (preflight.status === 'EXISTS_CONFLICT') throw new Error(`R2 conflict: ${item.object.key}`);
  const write = await putR2ObjectCreateOnly({ bucket: item.object.bucket, key: item.object.key, body, contentType: item.object.content_type, metadata: { 'foundation-run-id': 'run_make_money_new1000_20260916', 'foundation-dataset-id': 'ds.foundation.journal.core', 'foundation-schema-version': 'journal-entry.v1' } });
  results.push({ index: item.entry.journal_id, status: write.status, bucket: write.bucket, key: write.key, bytes: write.bytes, sha256: write.sha256, readback: write.readback });
}
const output = { schemaVersion: 'bounded-foundation-journal-additions.v1', planPath, planned: items.length, preflight: { absent: results.filter((item) => item.status === 'CREATED').length, identical: results.filter((item) => item.status === 'EXISTS_IDENTICAL').length }, writes: { created: results.filter((item) => item.status === 'CREATED').length, identical: results.filter((item) => item.status === 'EXISTS_IDENTICAL').length, readbackVerified: results.filter((item) => item.readback?.bytes_match && item.readback?.sha256_match).length }, results };
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, planned: output.planned, preflight: output.preflight, writes: output.writes }, null, 2));
