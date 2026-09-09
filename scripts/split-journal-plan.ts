import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type JsonObject = Record<string, unknown>;
type JournalPlan = {
  entries?: JsonObject[];
  planned_writes?: JsonObject & { objects?: JsonObject[] };
};

const inputPath = resolve(process.argv[2] || 'data/collection/run_make_money_1000_bottomtrawl_20260909_03b.journal-plan.json');
const outputDir = resolve(process.argv[3] || 'data/collection/journal_shards_20260909_03b');
const chunkSize = Math.max(1, Math.min(100, Number(process.argv[4] || 100)));

async function main(): Promise<void> {
  const input = JSON.parse(await readFile(inputPath, 'utf8')) as JournalPlan;
  const entries = Array.isArray(input.entries) ? input.entries : [];
  const objects = input.planned_writes?.objects;
  if (!Array.isArray(objects) || entries.length !== objects.length || entries.length === 0) {
    throw new Error('entries and planned_writes.objects must be non-empty and have equal length');
  }

  await mkdir(outputDir, { recursive: true });
  const outputs: JsonObject[] = [];
  for (let start = 0, shard = 1; start < entries.length; start += chunkSize, shard += 1) {
    const end = Math.min(entries.length, start + chunkSize);
    const name = `shard-${String(shard).padStart(3, '0')}.journal-plan.json`;
    const plan = {
      entries: entries.slice(start, end),
      planned_writes: {
        ...input.planned_writes,
        objects: objects.slice(start, end),
      },
    };
    const path = resolve(outputDir, name);
    await writeFile(path, JSON.stringify(plan) + '\n', { flag: 'wx' });
    outputs.push({ shard, name, entries: end - start, planned: end - start });
  }
  console.log(JSON.stringify({ input: inputPath, output_dir: outputDir, chunk_size: chunkSize, shards: outputs.length, entries: entries.length, planned: objects.length }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
