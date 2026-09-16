import fs from 'node:fs';

const inputPath = 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const replacementsPath = 'data/incoming/batch_next_profit_cases_20260916.json';
const ledgerPath = 'data/CLAIMED_TARGETS.txt';
const oldNames = ['$700/Month Creating Fake People for Brands on Fiverr', '$1,000/Month From 5 Faceless AI Music Channels', '15-Year-Old Made $30K With AI In A Few Weeks', '$550/Month From Super-Niche Etsy Health Trackers'];
const batch = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const replacements = JSON.parse(fs.readFileSync(replacementsPath, 'utf8'));
const ledger = fs.readFileSync(ledgerPath, 'utf8');
if (replacements.length !== 4) throw new Error('Expected four replacement entities');
for (const entity of replacements) {
  if (!ledger.includes(entity.name)) throw new Error(`Claim lock missing: ${entity.name}`);
  if (batch.some((item) => item.id === entity.id || item.name === entity.name || (entity.ticker && item.ticker === entity.ticker))) throw new Error(`Collision: ${entity.name}`);
}
for (const name of oldNames) if (batch.filter((item) => item.name === name).length !== 1) throw new Error(`Expected exactly one old case: ${name}`);
const next = batch.filter((item) => !oldNames.includes(item.name)).concat(replacements);
if (next.length !== 1000) throw new Error(`Expected 1000 after replacement, got ${next.length}`);
for (const key of ['id', 'name', 'ticker']) if (new Set(next.map((item) => String(item[key] ?? '').toLowerCase().trim())).size !== next.length) throw new Error(`Duplicate ${key} after replacement`);
fs.writeFileSync(inputPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(JSON.stringify({ inputPath, count: next.length, removed: oldNames, added: replacements.map((item) => ({ id: item.id, name: item.name, ticker: item.ticker })) }, null, 2));
