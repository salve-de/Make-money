import { readdir, readFile, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';
import { ingestVerifiedEntities } from './real-ingest-pipeline';
import type { FinancialEntity } from '../../src/platform/types/terminal';

const INCOMING_DIR = resolve(process.cwd(), 'data/incoming');
const PROCESSED_DIR = resolve(process.cwd(), 'data/incoming/processed');

async function main() {
  console.log('================================================================');
  console.log('  MAKEMONEY INCOMING BATCH PROCESSOR (Multi-Chat Collector)');
  console.log('================================================================\n');

  if (!existsSync(INCOMING_DIR)) {
    await mkdir(INCOMING_DIR, { recursive: true });
  }
  if (!existsSync(PROCESSED_DIR)) {
    await mkdir(PROCESSED_DIR, { recursive: true });
  }

  const files = (await readdir(INCOMING_DIR, { withFileTypes: true }))
    .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
    .map(dirent => dirent.name);

  if (files.length === 0) {
    console.log(`[INFO] No new JSON batches found in data/incoming/. Ready for new drops.`);
    return;
  }

  console.log(`[FOUND] Found ${files.length} incoming batch file(s) in data/incoming/:`);
  files.forEach(f => console.log(`  - ${f}`));

  let totalEntities = 0;

  for (const file of files) {
    const filePath = join(INCOMING_DIR, file);
    console.log(`\n----------------------------------------------------------------`);
    console.log(`[PROCESSING] Reading ${file}...`);
    try {
      const rawContent = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(rawContent);
      const batchEntities: FinancialEntity[] = Array.isArray(parsed) ? parsed : [parsed];

      console.log(`[PARSED] ${batchEntities.length} entities in ${file}. Running ingest pipeline...`);
      await ingestVerifiedEntities(batchEntities, file.replace(/\.json$/, ''));

      // 処理成功 ➔ processed/ へ移動
      const processedPath = join(PROCESSED_DIR, file);
      await rename(filePath, processedPath);
      console.log(`[ARCHIVED] Moved ${file} -> data/incoming/processed/`);

      totalEntities += batchEntities.length;
    } catch (err) {
      console.error(`❌ [FAILED] Error processing batch ${file}:`, err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  }

  // マスター台帳・CLAIMED_TARGETS・重複リストの最新化同期
  console.log(`\n--- [SYNC] Synchronizing deduplication registry and claimed targets ---`);
  try {
    execSync('pnpm registry:sync', { stdio: 'inherit' });
    console.log(`[SYNC] Registry synchronized successfully.`);
  } catch (err) {
    console.warn(`[SYNC WARNING] registry:sync had non-fatal error:`, err);
  }

  // 最後にリント品質ガードレールを実行
  console.log(`\n--- [AUDIT] Running check-ingest-quality ---`);
  try {
    execSync('node scripts/architecture/check-ingest-quality.mjs', { stdio: 'inherit' });
    console.log(`[AUDIT] Quality guardrails passed.`);
  } catch (err) {
    console.error(`❌ [AUDIT FAILED] check-ingest-quality found violations:`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  console.log(`\n================================================================`);
  console.log(`🎉 [SUCCESS] Successfully ingested ${totalEntities} entities from ${files.length} batches!`);
  console.log(`================================================================\n`);
}

main().catch(err => {
  console.error('Fatal error in process-incoming:', err);
  process.exit(1);
});
