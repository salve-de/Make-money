import fs from 'node:fs';

const shortlistPath = process.env.MM_SHORTLIST_FILE ?? 'data/incoming/batch_ebizfacts_profit_shortlist_100_20260916.json';
const primaryPath = process.env.MM_PRIMARY_FILE ?? 'data/incoming/batch_primary_indie_evidence_3_enriched_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_profit_shortlist_primary_enriched_100_20260916.json';
const removeNames = new Set([
  '$125/Month Renting Out Chest Freezer Space to Hunters',
  '$500/Year Passive Income From One DIY Ad Bench',
  '$3K in 45 Days Selling “Tiny AI Tools” Anyone Could Build',
]);
const norm = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const shortlist = JSON.parse(fs.readFileSync(shortlistPath, 'utf8'));
const primary = JSON.parse(fs.readFileSync(primaryPath, 'utf8'));
if (!Array.isArray(shortlist) || !Array.isArray(primary) || primary.length !== 3) throw new Error('Expected shortlist and three primary entities');
const retained = shortlist.filter((entity) => !removeNames.has(entity.name));
if (shortlist.length - retained.length !== primary.length) throw new Error('Replacement count mismatch');
const merged = [...retained, ...primary];
if (merged.length !== 100) throw new Error(`Expected 100 entities, received ${merged.length}`);
for (const field of ['id', 'name', 'ticker']) {
  const values = merged.map((entity) => norm(entity[field]));
  if (new Set(values).size !== values.length) throw new Error(`Duplicate normalized ${field}`);
}
fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ input: shortlist.length, removed: shortlist.length - retained.length, primary: primary.length, output: merged.length, outputPath }, null, 2));
