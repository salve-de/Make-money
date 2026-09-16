import fs from 'node:fs';

const oldPlan = JSON.parse(fs.readFileSync(process.env.MM_OLD_PLAN_PATH ?? '/tmp/mm-journal-plan-replaced-20260916.json', 'utf8'));
const newPlan = JSON.parse(fs.readFileSync(process.env.MM_NEW_PLAN_PATH ?? '/tmp/mm-journal-plan-reddit-replacements-20260916.json', 'utf8'));
const oldResult = JSON.parse(fs.readFileSync('data/incoming/foundation_journal_bounded_result_20260916.json', 'utf8'));
const additionsResult = JSON.parse(fs.readFileSync(process.env.MM_ADDITIONS_RESULT_PATH ?? '/tmp/mm-journal-reddit-replacements-result-20260916.json', 'utf8'));
const oldNames = new Set(JSON.parse(process.env.MM_REMOVED_NAMES ?? '["Easiest Way to Make Quick $$ With no Money or Skills","He\'s Earning $16K Per Month Via This MLM Company"]'));
const obsoleteRefs = new Set(oldPlan.entries.filter((entry) => [...oldNames].some((name) => JSON.stringify(entry).includes(name))).flatMap((entry) => entry.subject_refs || []));
const obsoleteIndices = new Set(oldPlan.entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => [...obsoleteRefs].some((ref) => (entry.subject_refs || []).includes(ref))).map(({ index }) => index));
const expectedObsolete = Number(process.env.MM_EXPECTED_OBSOLETE_ENTRIES ?? 8);
if (obsoleteIndices.size !== expectedObsolete) throw new Error(`Expected ${expectedObsolete} obsolete indices, got ${obsoleteIndices.size}`);
const newIndexByOldIndex = new Map();
let nextIndex = 0;
for (let oldIndex = 0; oldIndex < oldPlan.entries.length; oldIndex += 1) {
  if (obsoleteIndices.has(oldIndex)) continue;
  newIndexByOldIndex.set(oldIndex, nextIndex);
  nextIndex += 1;
}
const kept = oldResult.results.filter((item) => !obsoleteIndices.has(item.index)).map((item) => ({ ...item, index: newIndexByOldIndex.get(item.index) }));
const newIndexByJournalId = new Map(newPlan.entries.map((entry, index) => [entry.journal_id, index]));
const added = additionsResult.results.map((item) => ({ ...item, index: newIndexByJournalId.get(item.index) })).sort((a, b) => a.index - b.index);
const expectedAdded = Number(process.env.MM_EXPECTED_ADDED_ENTRIES ?? 8);
if (added.some((item) => !Number.isInteger(item.index)) || added.length !== expectedAdded) throw new Error('New journal result indices could not be mapped');
const results = kept.concat(added).sort((a, b) => a.index - b.index);
if (results.length !== 4000 || new Set(results.map((item) => item.index)).size !== 4000) throw new Error('Merged journal result is not exactly 4000 unique entries');
const output = { schemaVersion: 'bounded-foundation-journal-ingest.v1', planPath: process.env.MM_NEW_PLAN_PATH ?? '/tmp/mm-journal-plan-reddit-replacements-20260916.json', concurrency: 1, planned: results.length, preflight: { absent: results.filter((item) => item.status === 'CREATED').length, identical: results.filter((item) => item.status === 'EXISTS_IDENTICAL').length }, writes: { created: results.filter((item) => item.status === 'CREATED').length, identical: results.filter((item) => item.status === 'EXISTS_IDENTICAL').length, readbackVerified: results.filter((item) => item.readback?.bytes_match && item.readback?.sha256_match).length }, results };
fs.writeFileSync('data/incoming/foundation_journal_bounded_result_20260916.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ planned: output.planned, obsoleteRemoved: obsoleteIndices.size, additions: added.length, preflight: output.preflight, writes: output.writes }, null, 2));
