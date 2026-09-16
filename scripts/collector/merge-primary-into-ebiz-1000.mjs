import fs from 'node:fs';

const basePath = process.env.MM_BASE_FILE ?? 'data/incoming/batch_ebizfacts_profiles_clean_enriched_1000_20260916.json';
const primaryPath = process.env.MM_PRIMARY_FILE ?? 'data/incoming/batch_primary_indie_evidence_3_enriched_20260916.json';
const primaryExtraPath = process.env.MM_PRIMARY_EXTRA_FILE ?? null;
const replacementPath = process.env.MM_REPLACEMENT_FILE ?? 'data/incoming/batch_ebizfacts_additional_100_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_new_1000_primary_enriched_20260916.json';
const removeNames = new Set([
  '$125/Month Renting Out Chest Freezer Space to Hunters',
  '$500/Year Passive Income From One DIY Ad Bench',
  '$149 Revenue From a 1-Hour Amazon Product',
  '$35K/Month Recycling Cash (Some Dude In a Pickup Truck)',
  'She Won $10,899 By Losing 81 Lbs in 14 Months',
  'Built Her Talent Agency To $11M/Year in Only 3 Years',
  '$175 Monthly Passive Income Selling Old Text on Amazon',
]);
const replacementNames = new Set([
  'Her Biz: $26.2K Profit Last Month',
  '$50,000 Profit From A Side Project',
  'First $5k Month as a Solopreneur',
]);
const norm = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const primary = JSON.parse(fs.readFileSync(primaryPath, 'utf8'));
const replacements = JSON.parse(fs.readFileSync(replacementPath, 'utf8'));
const primaryExtra = primaryExtraPath ? JSON.parse(fs.readFileSync(primaryExtraPath, 'utf8')) : [];
if (!Array.isArray(base) || !Array.isArray(primary) || !Array.isArray(primaryExtra) || !Array.isArray(replacements)) throw new Error('Expected base, primary records, optional extra primary records, and replacement array');
const retained = base.filter((entity) => !removeNames.has(entity.name));
if (base.length - retained.length !== 7) throw new Error('Expected exactly 7 removable records');
const selectedReplacements = replacements.filter((entity) => replacementNames.has(entity.name));
if (selectedReplacements.length !== 3) throw new Error('Expected exactly 3 selected replacement records');
const merged = [...retained, ...primary, ...primaryExtra, ...selectedReplacements];
if (merged.length !== 1000) throw new Error(`Expected 1000 entities, got ${merged.length}`);
for (const field of ['id', 'name', 'ticker']) {
  const values = merged.map((entity) => norm(entity[field]));
  if (new Set(values).size !== values.length) throw new Error(`Duplicate normalized ${field}`);
}
fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ base: base.length, removed: base.length - retained.length, primary: primary.length + primaryExtra.length, replacements: selectedReplacements.length, output: merged.length, outputPath }, null, 2));
