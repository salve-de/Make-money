import fs from 'node:fs';

const inputPath = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const candidatesPath = process.env.MM_CANDIDATES_FILE ?? 'data/incoming/batch_ebizfacts_additional_100_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? inputPath;
const removeNames = [
  '$4,200 From an AI Agent That Never Earned a Cent',
  'Earning $60,000 a Year Doing Absolutely Nothing',
  'Sexting His Way to $8000 in 2 Years',
  'This Naughty AI Model Made $1100 in 5 Days',
  "Fake News Websites Earning $10,000's Per Month",
  'The Shocking Reality of MLMs = $0.67 Per Hour',
  '$1.43 Per Hour Catfishing Lonely Dudes',
];
const addNames = [
  '$100K/Year Content Agency (in only 5 Hours a Week)',
  '$583,064 One-Woman WordPress Plugin',
  '$17.5K/Month No-Code Automation Agency',
  'This VA Has 4 Sources of Income',
  '$1 Million Selling Lesson Plans to Librarians',
  '$20K/Month Minimalist Phone App',
  '$40K/Month LinkedIn Automation',
];
const normalize = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
if (!Array.isArray(input) || input.length !== 1000 || !Array.isArray(candidates)) throw new Error('Expected 1000 input records and candidate array');
const remove = new Set(removeNames);
const additions = addNames.map((name) => candidates.find((entity) => entity.name === name));
if (additions.some((entity) => !entity)) throw new Error('One or more replacement candidates missing');
const inputIds = new Set(input.map((entity) => entity.id));
if (additions.some((entity) => inputIds.has(entity.id))) throw new Error('Replacement candidate already exists in input');
const retained = input.filter((entity) => !remove.has(entity.name));
if (retained.length !== 993) throw new Error(`Expected 993 retained records, got ${retained.length}`);
const merged = [...retained, ...additions];
if (merged.length !== 1000) throw new Error(`Expected 1000 records, got ${merged.length}`);
for (const field of ['id', 'name', 'ticker']) {
  const values = merged.map((entity) => normalize(entity[field]));
  if (new Set(values).size !== values.length) throw new Error(`Duplicate normalized ${field}`);
}
fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ inputPath, outputPath, removed: removeNames, added: additions.map((entity) => ({ name: entity.name, scale: entity.scale, founder: entity.founder })), count: merged.length }, null, 2));
