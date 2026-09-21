import { readFile, writeFile } from 'node:fs/promises';
import { materializeScheduledR2Handoff } from '../src/lib/foundation/scheduled-r2-handoff';
import { prepareFoundationResearch, validateResearchBundle } from '../src/lib/foundation/ingest';

async function main() {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) throw new Error('Usage: r2-queue-materialize.ts INPUT.json OUTPUT.json');
  const input = JSON.parse(await readFile(inputPath, 'utf8'));
  const result = await materializeScheduledR2Handoff({
    queue: input.queue || input,
    source_runs: Array.isArray(input.source_runs) ? input.source_runs : [],
    queue_path: input.queue_path || null,
  });
  const bundle = validateResearchBundle(result.bundle);
  const plannedWrites = await prepareFoundationResearch(bundle);
  const output = {
    schema_version: 'r2-queue-materialization.v1',
    queue_path: input.queue_path || null,
    materialization: {
      included_items: result.included_items,
      skipped_items: result.skipped_items,
      skipped_research_items: result.skipped_research_items,
      source_count: result.source_count,
      evidence_count: result.evidence_count,
      entity_count: result.entity_count,
      claim_count: result.claim_count,
      metric_count: result.metric_count,
      money_signal_count: result.money_signal_count,
      event_count: result.event_count,
      relationship_count: result.relationship_count,
      observation_count: result.observation_count,
    },
    request: { write_authorized: true, bundle },
    planned_writes: plannedWrites,
  };
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({
    status: 'VALIDATED_FOR_R2_HANDOFF',
    included_items: result.included_items,
    planned_writes: plannedWrites.objects.length,
    skipped_research_items: result.skipped_research_items.length,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
