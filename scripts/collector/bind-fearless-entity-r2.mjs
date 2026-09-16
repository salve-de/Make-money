import fs from 'node:fs';

const batchPath = 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const replacementPath = 'data/incoming/batch_fearless_business_20260916.json';
const r2Path = 'data/incoming/raw_snapshots_fearless_business_20260916.r2-result.json';
const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const replacement = JSON.parse(fs.readFileSync(replacementPath, 'utf8'))[0];
const r2 = JSON.parse(fs.readFileSync(r2Path, 'utf8')).results[0];
if (!r2?.payloadReadback || !r2?.manifestReadback) throw new Error('Fearless raw R2 readback is incomplete');
const entity = batch.find((item) => item.id === replacement.id);
if (!entity) throw new Error(`Fearless entity not found: ${replacement.id}`);
const rawStorage = { bucket: 'foundation-raw', payloadKey: r2.payloadKey, manifestKey: r2.manifestKey, bytes: r2.payloadBytes, readbackVerified: true };
entity.sourceMetadata = { ...entity.sourceMetadata, rawStorage };
entity.evidenceCards = entity.evidenceCards.map((card) => ({ ...card, sourceMetadata: { ...(card.sourceMetadata ?? {}), rawStorage } }));
for (const observation of entity.observationsStream ?? []) observation.rawStorage = rawStorage;
fs.writeFileSync(replacementPath, `${JSON.stringify([entity], null, 2)}\n`);
fs.writeFileSync(batchPath, `${JSON.stringify(batch, null, 2)}\n`);
console.log(JSON.stringify({ entityId: entity.id, payloadKey: r2.payloadKey, manifestKey: r2.manifestKey, readbackVerified: true }, null, 2));
