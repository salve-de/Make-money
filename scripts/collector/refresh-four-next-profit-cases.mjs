import fs from 'node:fs';

const inputPath = 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const replacementsPath = 'data/incoming/batch_next_profit_cases_20260916.json';
const batch = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const replacements = JSON.parse(fs.readFileSync(replacementsPath, 'utf8'));
const names = new Set(replacements.map((item) => item.name));
if (replacements.length !== 4 || names.size !== 4) throw new Error('Expected four unique replacement records');
for (const name of names) if (batch.filter((item) => item.name === name).length !== 1) throw new Error(`Expected exactly one existing record: ${name}`);
const existingIds = new Set(batch.filter((item) => !names.has(item.name)).map((item) => item.id));
const existingTickers = new Set(batch.filter((item) => !names.has(item.name)).map((item) => item.ticker));
for (const item of replacements) if (existingIds.has(item.id) || existingTickers.has(item.ticker)) throw new Error(`Collision outside replacement set: ${item.name}`);
const next = batch.filter((item) => !names.has(item.name)).concat(replacements);
if (next.length !== 1000 || new Set(next.map((item) => item.id)).size !== 1000 || new Set(next.map((item) => item.name)).size !== 1000 || new Set(next.map((item) => item.ticker)).size !== 1000) throw new Error('Identity invariant failed');
fs.writeFileSync(inputPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(JSON.stringify({ inputPath, count: next.length, refreshed: replacements.map((item) => ({ id: item.id, name: item.name, ticker: item.ticker })) }, null, 2));
