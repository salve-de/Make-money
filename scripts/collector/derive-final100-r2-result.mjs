import fs from 'node:fs';

const finalPath = process.env.MM_FINAL_FILE ?? 'data/incoming/batch_final100_subset_of_new1000_20260916.json';
const allR2Path = process.env.MM_ALL_R2_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.r2-result.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/raw_snapshots_final100_20260916.r2-result.json';
const final = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
const allR2 = JSON.parse(fs.readFileSync(allR2Path, 'utf8'));
const ids = new Set(final.map((entity) => entity.id));
const results = allR2.results.filter((item) => ids.has(item.entityId) && item.payloadReadback && item.manifestReadback);
const output = { ...allR2, requested: results.length, completed: results.length, createdPayloads: results.filter((item) => item.payloadStatus === 'CREATED').length, existingPayloads: results.filter((item) => item.payloadStatus && item.payloadStatus !== 'CREATED').length, createdManifests: results.filter((item) => item.manifestStatus === 'CREATED').length, existingManifests: results.filter((item) => item.manifestStatus && item.manifestStatus !== 'CREATED').length, readbackVerified: results.length, results };
if (results.length !== 100) throw new Error(`Expected 100 final results, got ${results.length}`);
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, requested: output.requested, completed: output.completed, readbackVerified: output.readbackVerified }, null, 2));
