import fs from 'node:fs';

const inputPath = 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const replacementPath = 'data/incoming/batch_accounting_replacement_20260916.json';
const ledgerPath = 'data/CLAIMED_TARGETS.txt';
const oldName = 'He Paid $7K For An Instagram Page That Just Raised $2.5M';
const batch = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const replacements = JSON.parse(fs.readFileSync(replacementPath, 'utf8'));
const ledger = fs.readFileSync(ledgerPath, 'utf8');
if (replacements.length !== 1) throw new Error('Expected one replacement entity');
const entity = replacements[0];
if (!ledger.includes(entity.name)) throw new Error(`Claim lock missing: ${entity.name}`);
if (batch.filter((item) => item.name === oldName).length !== 1) throw new Error(`Expected exactly one old case: ${oldName}`);
if (batch.some((item) => item.id === entity.id || item.name === entity.name || item.ticker === entity.ticker)) throw new Error(`Collision: ${entity.name}`);
const next = batch.filter((item) => item.name !== oldName).concat(entity);
if (next.length !== 1000) throw new Error(`Expected 1000 after replacement, got ${next.length}`);
for (const key of ['id', 'name', 'ticker']) if (new Set(next.map((item) => String(item[key] ?? '').toLowerCase().trim())).size !== next.length) throw new Error(`Duplicate ${key} after replacement`);
fs.writeFileSync(inputPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(JSON.stringify({ inputPath, count: next.length, removed: oldName, added: { id: entity.id, name: entity.name, ticker: entity.ticker } }, null, 2));
