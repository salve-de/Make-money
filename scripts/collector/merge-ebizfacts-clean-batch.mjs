import fs from 'node:fs';

const basePath = process.env.MM_BASE_FILE ?? 'data/incoming/batch_ebizfacts_profiles_1000_20260916.json';
const replacementPath = process.env.MM_REPLACEMENT_FILE ?? 'data/incoming/batch_ebizfacts_replacements_11_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_ebizfacts_profiles_clean_1000_20260916.json';
const forbidden = /(gambl|casino|betting|sportsbook|psychedelic|shroom|porn|escort|adult|toto22|crypto\s*casino|iptv)/i;
const norm = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const replacements = JSON.parse(fs.readFileSync(replacementPath, 'utf8'));
if (!Array.isArray(base) || !Array.isArray(replacements)) throw new Error('Expected entity arrays');

const bad = base.filter((entity) => forbidden.test(JSON.stringify(entity)));
if (bad.length !== replacements.length) throw new Error(`Expected ${bad.length} replacements, received ${replacements.length}`);
if (replacements.some((entity) => forbidden.test(JSON.stringify(entity)))) throw new Error('Replacement contains forbidden content');

const badIds = new Set(bad.map((entity) => entity.id));
const retained = base.filter((entity) => !badIds.has(entity.id));
const merged = [...retained, ...replacements];
if (merged.length !== 1000) throw new Error(`Expected exactly 1000 entities, received ${merged.length}`);

for (const field of ['id', 'name', 'ticker']) {
  const values = merged.map((entity) => norm(entity[field]));
  if (new Set(values).size !== values.length) throw new Error(`Duplicate normalized ${field}`);
}

fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ base: base.length, removed: bad.length, replacements: replacements.length, output: merged.length, outputPath }, null, 2));
