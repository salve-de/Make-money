import { readFile, writeFile } from 'node:fs/promises';
import { ingestFoundationResearch, prepareFoundationResearch } from '../src/lib/foundation/ingest';
import { assessCoverage } from '../src/lib/foundation/coverage';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { resolve } from 'node:path';
import { reconcileCollection } from '../src/lib/foundation/reconciliation';
import { consumerContract } from './foundation-product-fields';

async function main() {
  const [mode, input, output] = process.argv.slice(2);
  if (!['requirements', 'audit', 'prepare', 'ingest', 'ingest-complete'].includes(mode) || (mode !== 'requirements' && (!input || !output))) {
    throw new Error('Usage: foundation-collect.ts requirements | audit|prepare|ingest|ingest-complete INPUT.json RECEIPT.json');
  }
  const canonical = process.env.FOUNDATION_REPO;
  if (!canonical) throw new Error('Set FOUNDATION_REPO to an authenticated clone of salve-de/universal-foundation');
  const profile = JSON.parse(await readFile(resolve(canonical, 'registry/collection/business-case.v1.json'), 'utf8'));
  const currentProduct = consumerContract();
  if (mode === 'requirements') {
    console.log(JSON.stringify({ profile, product_contract: currentProduct }, null, 2)); return;
  }
  const request = JSON.parse(await readFile(input, 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  async function schemaCheck(name: string, value: unknown) {
    const schema = JSON.parse(await readFile(resolve(canonical!, 'schemas/foundation', name), 'utf8'));
    const validate = ajv.compile(schema);
    if (!validate(value)) throw new Error(JSON.stringify(validate.errors));
  }
  await schemaCheck('research-bundle.v1.schema.json', request.bundle);
  const coverage = assessCoverage(request.bundle);
  const reconciliation = reconcileCollection(request.bundle, profile.required_fields,
    request.bundle.purpose === 'make_money' ? currentProduct.fields : []);
  const audit = request.bundle.observations?.find((x: { kind?: string }) => x.kind === 'collection_audit.v1');
  if (request.bundle.purpose === 'make_money' && audit?.product_contract_sha256 !== currentProduct.sha256) {
    reconciliation.gaps.push('Current product contract hash missing/stale');
    reconciliation.status = 'REVIEW_REQUIRED';
  }
  if (mode === 'audit') {
    await writeFile(output, JSON.stringify({ coverage, reconciliation, currentProduct }, null, 2), { flag: 'wx' });
    console.log(JSON.stringify(reconciliation));
    if (reconciliation.status !== 'RECONCILED_WITHIN_SCOPE') process.exitCode = 1;
    return;
  }
  if (mode === 'ingest-complete' && (coverage.pending.length || reconciliation.status !== 'RECONCILED_WITHIN_SCOPE')) {
    throw new Error('Collection incomplete: ' + reconciliation.gaps.join('; '));
  }
  const plan = await prepareFoundationResearch(request.bundle, request.raw_evidence);
  await schemaCheck('planned-writes.v1.schema.json', plan);
  // Persist the intended keys before any provider write, including on a later failure.
  await writeFile(output, JSON.stringify({ coverage, reconciliation, planned_writes: plan }, null, 2), { flag: 'wx' });
  if (mode === 'ingest' || mode === 'ingest-complete') {
    if (request.write_authorized !== true) throw new Error('write_authorized:true required');
    const result = await ingestFoundationResearch(request);
    await writeFile(`${output}.result.json`, JSON.stringify({ coverage, reconciliation, ...result }, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ coverage, reconciliation, counts: result.counts, readback_verified: result.readback_verified }));
  } else console.log(JSON.stringify({ coverage, reconciliation, planned: plan.objects.length }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Collection failed'); process.exitCode = 1; });
