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

  const profileV2 = JSON.parse(await readFile(resolve(canonical, 'registry/collection/business-case.v2.json'), 'utf8'));
  const deepProfile = JSON.parse(await readFile(resolve(canonical, 'registry/collection/business-case.v1.json'), 'utf8'));
  const currentProduct = consumerContract();

  if (mode === 'requirements') {
    console.log(JSON.stringify({
      collection_policy: profileV2,
      deep_research_checklist: deepProfile,
      product_contract: { ...currentProduct, enrichment_only: true },
      rule: 'Product output/UI fields guide enrichment but are not universal source-fact completion requirements.'
    }, null, 2));
    return;
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

  // Deep reconciliation is intentionally Foundation-centric. The current Make-Money
  // product interfaces contain derived/presentation fields (moat, psychology, score,
  // opportunity, etc.) that are useful enrichment targets but are not source facts and
  // must not block collection completeness.
  const reconciliation = reconcileCollection(request.bundle, deepProfile.required_fields, []);

  if (mode === 'audit') {
    await writeFile(output, JSON.stringify({
      collection_policy: profileV2,
      deep_research_checklist: deepProfile,
      coverage,
      reconciliation,
      product_contract: { ...currentProduct, enrichment_only: true }
    }, null, 2), { flag: 'wx' });
    console.log(JSON.stringify(reconciliation));
    if (reconciliation.status !== 'RECONCILED_WITHIN_SCOPE') process.exitCode = 1;
    return;
  }

  if (mode === 'ingest-complete' && (coverage.pending.length || reconciliation.status !== 'RECONCILED_WITHIN_SCOPE')) {
    throw new Error('Deep collection incomplete: ' + reconciliation.gaps.join('; '));
  }

  const plan = await prepareFoundationResearch(request.bundle, request.raw_evidence);
  await schemaCheck('planned-writes.v1.schema.json', plan);

  // Persist the intended core/typed keys before any provider write, including on a later failure.
  await writeFile(output, JSON.stringify({
    collection_policy: profileV2,
    deep_research_checklist: deepProfile,
    coverage,
    reconciliation,
    product_contract: { ...currentProduct, enrichment_only: true },
    planned_writes: plan
  }, null, 2), { flag: 'wx' });

  if (mode === 'ingest' || mode === 'ingest-complete') {
    if (request.write_authorized !== true) throw new Error('write_authorized:true required');
    const result = await ingestFoundationResearch(request);
    await writeFile(`${output}.result.json`, JSON.stringify({
      collection_policy: profileV2,
      coverage,
      reconciliation,
      ...result
    }, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({
      collection_tier: mode === 'ingest-complete' ? 'DEEP_RECONCILED' : 'PARTIAL_OR_ENRICHED',
      coverage,
      reconciliation,
      counts: result.counts,
      readback_verified: result.readback_verified
    }));
  } else {
    console.log(JSON.stringify({
      collection_tier: 'PREPARED_PARTIAL_ALLOWED',
      coverage,
      reconciliation,
      planned: plan.objects.length
    }));
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Collection failed');
  process.exitCode = 1;
});
