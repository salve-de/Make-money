import { readFile, writeFile } from 'node:fs/promises';
import { ingestFoundationResearch, prepareFoundationResearch } from '../src/lib/foundation/ingest';
import { assessCoverage } from '../src/lib/foundation/coverage';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { resolve } from 'node:path';

async function main() {
  const [mode, input, output] = process.argv.slice(2);
  if (!['prepare', 'ingest'].includes(mode) || !input || !output) {
    throw new Error('Usage: tsx scripts/foundation-collect.ts prepare|ingest INPUT.json RECEIPT.json');
  }
  const request = JSON.parse(await readFile(input, 'utf8'));
  const canonical = process.env.FOUNDATION_REPO;
  if (!canonical) throw new Error('Set FOUNDATION_REPO to an authenticated clone of salve-de/universal-foundation');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  async function schemaCheck(name: string, value: unknown) {
    const schema = JSON.parse(await readFile(resolve(canonical!, 'schemas/foundation', name), 'utf8'));
    const validate = ajv.compile(schema);
    if (!validate(value)) throw new Error(JSON.stringify(validate.errors));
  }
  await schemaCheck('research-bundle.v1.schema.json', request.bundle);
  const coverage = assessCoverage(request.bundle);
  const plan = await prepareFoundationResearch(request.bundle, request.raw_evidence);
  await schemaCheck('planned-writes.v1.schema.json', plan);
  // Persist the intended keys before any provider write, including on a later failure.
  await writeFile(output, JSON.stringify({ coverage, planned_writes: plan }, null, 2), { flag: 'wx' });
  if (mode === 'ingest') {
    if (request.write_authorized !== true) throw new Error('write_authorized:true required');
    const result = await ingestFoundationResearch(request);
    await writeFile(`${output}.result.json`, JSON.stringify({ coverage, ...result }, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ coverage, counts: result.counts, readback_verified: result.readback_verified }));
  } else console.log(JSON.stringify({ coverage, planned: plan.objects.length }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Collection failed'); process.exitCode = 1; });
