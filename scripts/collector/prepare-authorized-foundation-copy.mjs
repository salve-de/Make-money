import fs from 'node:fs';

const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (!inputPath || !outputPath) throw new Error('Usage: node prepare-authorized-foundation-copy.mjs INPUT.json OUTPUT.json');
const request = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
request.write_authorized = true;
if (process.env.MM_OMIT_RAW === '1') request.raw_evidence = [];
fs.writeFileSync(outputPath, `${JSON.stringify(request, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ inputPath, outputPath, write_authorized: request.write_authorized, rawEvidence: request.raw_evidence?.length ?? null }, null, 2));
