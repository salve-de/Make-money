import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { prepareFoundationResearch } from '../src/lib/foundation/ingest';
import { assessCoverage } from '../src/lib/foundation/coverage';

type Obj = Record<string, any>;
const inputDir = resolve(process.argv[2] || 'data/collection/shards_20260909_04b');
const outputDir = resolve(process.argv[3] || inputDir);
const concurrency = Math.max(1, Number(process.argv[4] || 4));

async function main() {
  const files = (await readdir(inputDir)).filter((name) => name.endsWith('.request.json')).sort();
  let cursor = 0;
  const outputs: Obj[] = [];
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= files.length) return;
      const name = files[index];
      const input = JSON.parse(await readFile(resolve(inputDir, name), 'utf8')) as Obj;
      const coverage = assessCoverage(input.bundle);
      const planned = await prepareFoundationResearch(input.bundle, input.raw_evidence);
      const output = {
        run_id: input.bundle.run_id,
        collection_tier: 'PARTIAL_OR_ENRICHED',
        coverage,
        reconciliation: { status: 'REVIEW_REQUIRED', gaps: ['This additive shard is not a DEEP_RECONCILED claim; no source inventory audit was asserted.'] },
        planned_writes: planned,
      };
      const outName = name.replace(/\.request\.json$/, '.plan.json');
      await writeFile(resolve(outputDir, outName), JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
      outputs[index] = { request: name, plan: outName, objects: planned.objects.length, coverage_status: coverage.status, pending: coverage.pending.length };
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, () => worker()));
  const coverageStatuses = outputs.reduce<Map<string, number>>((map, item) => map.set(item.coverage_status, (map.get(item.coverage_status) || 0) + 1), new Map<string, number>());
  console.log(JSON.stringify({ input_dir: inputDir, output_dir: outputDir, shards: outputs.length, objects: outputs.reduce((sum, item) => sum + item.objects, 0), coverage_statuses: Object.fromEntries(coverageStatuses), pending_total: outputs.reduce((sum, item) => sum + item.pending, 0) }));
}

main().catch((error) => { console.error(error instanceof Error ? error.stack || error.message : error); process.exitCode = 1; });
