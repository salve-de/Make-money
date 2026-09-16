import fs from 'node:fs';

const fullPlanPath = process.env.MM_FULL_PLAN_PATH ?? '/tmp/mm-journal-plan-fearless-20260916.json';
const oldResultPath = process.env.MM_OLD_RESULT_PATH ?? 'data/incoming/foundation_journal_bounded_result_20260916.json';
const deltaResultPath = process.env.MM_DELTA_RESULT_PATH ?? '/tmp/mm-journal-fearless-delta-result-20260916.json';
const outputPath = process.env.MM_OUTPUT_PATH ?? 'data/incoming/foundation_journal_bounded_result_20260916.json';
const full = JSON.parse(fs.readFileSync(fullPlanPath, 'utf8'));
const old = JSON.parse(fs.readFileSync(oldResultPath, 'utf8'));
const delta = JSON.parse(fs.readFileSync(deltaResultPath, 'utf8'));
const oldByKey = new Map((old.results ?? []).map((item) => [`${item.bucket}/${item.key}`, item]));
const deltaByKey = new Map((delta.results ?? []).map((item) => [`${item.bucket}/${item.key}`, item]));
const results = full.planned_writes.objects.map((object, index) => {
  const key = `${object.bucket}/${object.key}`;
  const item = deltaByKey.get(key) ?? oldByKey.get(key);
  if (!item) throw new Error(`Missing journal result for ${key}`);
  return { ...item, index };
});
const output = {
  schemaVersion: 'bounded-foundation-journal-ingest.v1', planPath: fullPlanPath, concurrency: delta.concurrency ?? 8, planned: results.length,
  preflight: { absent: results.filter((item) => item.status === 'CREATED').length, identical: results.filter((item) => item.status === 'EXISTS_IDENTICAL').length },
  writes: { created: results.filter((item) => item.status === 'CREATED').length, identical: results.filter((item) => item.status === 'EXISTS_IDENTICAL').length, readbackVerified: results.filter((item) => item.readback?.bytes_match && item.readback?.sha256_match).length },
  results,
};
if (output.planned !== 4000 || output.writes.readbackVerified !== 4000) throw new Error(`Merged journal result incomplete: planned=${output.planned}, readback=${output.writes.readbackVerified}`);
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, planned: output.planned, preflight: output.preflight, writes: output.writes }, null, 2));
