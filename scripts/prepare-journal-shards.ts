import { access, mkdir, readdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

type JsonObject = Record<string, any>;
const inputDir = resolve(process.argv[2] || 'data/collection/shards_20260909_04d');
const outputDir = resolve(process.argv[3] || 'data/collection/journal_shards_20260909_04d');
const concurrency = Math.max(1, Math.min(4, Number(process.argv[4] || 4)));
const foundationRepo = process.env.FOUNDATION_REPO?.trim();
if (!foundationRepo) throw new Error('FOUNDATION_REPO is required for journal-entry.v1 validation');

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

function runPrepare(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/foundation-journal.ts', 'prepare', inputPath, outputPath], {
      cwd: process.cwd(),
      env: { ...process.env, FOUNDATION_REPO: foundationRepo },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', rejectRun);
    child.on('close', (code) => code === 0 ? resolveRun() : rejectRun(new Error(stderr || `journal prepare exited with ${code}`)));
  });
}

async function main(): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  const files = (await readdir(inputDir)).filter((name) => name.endsWith('.request.json')).sort();
  let cursor = 0;
  const results: JsonObject[] = [];
  async function worker(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= files.length) return;
      const name = files[index];
      const inputPath = resolve(inputDir, name);
      const outputName = name.replace(/\.request\.json$/, '.journal-plan.json');
      const outputPath = resolve(outputDir, outputName);
      if (!(await exists(outputPath))) await runPrepare(inputPath, outputPath);
      const plan = JSON.parse(await readFile(outputPath, 'utf8')) as JsonObject;
      const result = { request: name, plan: outputName, entries: Array.isArray(plan.entries) ? plan.entries.length : 0, planned: plan.planned_writes?.objects?.length || 0 };
      results[index] = result;
      console.log(JSON.stringify(result));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, () => worker()));
  console.log(JSON.stringify({ input_dir: inputDir, output_dir: outputDir, shards: results.length, journal_entries: results.reduce((sum, row) => sum + Number(row.entries), 0), planned: results.reduce((sum, row) => sum + Number(row.planned), 0) }));
}

main().catch((error) => { console.error(error instanceof Error ? error.stack || error.message : error); process.exitCode = 1; });
