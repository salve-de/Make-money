import fs from 'node:fs';

const inputPath = 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const replacementPath = 'data/incoming/batch_new_reddit_replacements_20260916.json';
const ledgerPath = 'data/CLAIMED_TARGETS.txt';
const oldNames = ['Easiest Way to Make Quick $$ With no Money or Skills', "He's Earning $16K Per Month Via This MLM Company"];
const newEntities = JSON.parse(fs.readFileSync(replacementPath, 'utf8'));
const ledger = fs.readFileSync(ledgerPath, 'utf8');
const batch = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (!Array.isArray(batch) || batch.length !== 1000) throw new Error(`Expected 1000 input entities, got ${batch.length}`);
if (newEntities.length !== 2) throw new Error('Expected two replacement entities');
for (const entity of newEntities) {
  if (!ledger.includes(entity.name)) throw new Error(`Claim lock missing for ${entity.name}`);
  if (batch.some((item) => item.id === entity.id || item.name === entity.name || item.ticker === entity.ticker)) throw new Error(`Collision for ${entity.name}`);
}
const oldCount = oldNames.reduce((count, name) => count + batch.filter((entity) => entity.name === name).length, 0);
if (oldCount !== 2) throw new Error(`Expected exactly two old targets, got ${oldCount}`);
const next = batch.filter((entity) => !oldNames.includes(entity.name)).concat(newEntities);
if (next.length !== 1000) throw new Error(`Replacement changed count to ${next.length}`);
const unique = (key) => new Set(next.map((entity) => String(entity[key] ?? '').toLowerCase().trim())).size === next.length;
for (const key of ['id', 'name', 'ticker']) if (!unique(key)) throw new Error(`Duplicate ${key} after replacement`);
for (const name of oldNames) if (next.some((entity) => entity.name === name)) throw new Error(`Old entity remains: ${name}`);
fs.writeFileSync(inputPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(JSON.stringify({ inputPath, count: next.length, removed: oldNames, added: newEntities.map((entity) => ({ id: entity.id, name: entity.name, ticker: entity.ticker })) }, null, 2));
