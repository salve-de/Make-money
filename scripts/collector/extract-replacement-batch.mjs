import fs from 'node:fs';

const sourcePath = process.argv[2];
const outputPath = process.argv[3];
const names = process.argv.slice(4);
if (!sourcePath || !outputPath || !names.length) throw new Error('Usage: node extract-replacement-batch.mjs SOURCE.json OUTPUT.json NAME...');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const selected = names.map((name) => source.find((entity) => entity.name === name));
if (selected.some((entity) => !entity)) throw new Error('Replacement name not found');
fs.writeFileSync(outputPath, `${JSON.stringify(selected, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, count: selected.length, names: selected.map((entity) => entity.name) }, null, 2));
