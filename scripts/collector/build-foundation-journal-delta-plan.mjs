import fs from 'node:fs';

const fullPlanPath = process.env.MM_FULL_PLAN_PATH ?? '/tmp/mm-journal-plan-fearless-20260916.json';
const oldResultPath = process.env.MM_OLD_RESULT_PATH ?? 'data/incoming/foundation_journal_bounded_result_20260916.json';
const outputPath = process.env.MM_OUTPUT_PATH ?? '/tmp/mm-journal-fearless-delta-plan-20260916.json';
const full = JSON.parse(fs.readFileSync(fullPlanPath, 'utf8'));
const old = JSON.parse(fs.readFileSync(oldResultPath, 'utf8'));
const existingKeys = new Set((old.results ?? []).map((item) => `${item.bucket}/${item.key}`));
const selected = full.entries.map((entry, index) => ({ entry, object: full.planned_writes.objects[index] })).filter(({ object }) => !existingKeys.has(`${object.bucket}/${object.key}`));
if (!selected.length) throw new Error('No journal delta remains');
const output = {
  entries: selected.map((item) => item.entry),
  planned_writes: { ...full.planned_writes, objects: selected.map((item) => item.object) },
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ fullEntries: full.entries.length, oldResults: old.results?.length ?? 0, deltaEntries: output.entries.length, outputPath }, null, 2));
