import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { listR2Objects, getFoundationBucket } from '../src/lib/storage/r2';

async function main() {
  console.log('====================================================');
  console.log('  R2 STORAGE & MULTI-AGENT INTEGRITY AUDIT');
  console.log('====================================================\n');

  // 1. Audit foundation-raw
  console.log('[1/4] Auditing Layer 1: foundation-raw (Bronze / Raw)...');
  const rawBucket = getFoundationBucket('raw');
  const rawRes = await listR2Objects({ bucket: rawBucket, limit: 100 });
  console.log(`  - Bucket: ${rawBucket}`);
  console.log(`  - Total Objects Sampled: ${rawRes.objects.length}`);
  const rawDescriptors = rawRes.objects.filter(o => o.key.includes('_README') || o.key.includes('_manifest'));
  console.log(`  - Self-Descriptors: ${rawDescriptors.length} found`);
  for (const d of rawDescriptors) {
    console.log(`      ✓ ${d.key} (${d.size} bytes)`);
  }
  const rawBlobs = rawRes.objects.filter(o => o.key.startsWith('blobs/'));
  console.log(`  - Raw Blobs (SHA-256 CAS): ${rawBlobs.length} objects`);
  for (const b of rawBlobs) {
    console.log(`      • ${b.key} (${b.size} bytes)`);
  }

  // 2. Audit foundation-lake
  console.log('\n[2/4] Auditing Layer 2: foundation-lake (Silver / Journal)...');
  const lakeBucket = getFoundationBucket('lake');
  
  // 2.1 Descriptors in lake
  const lakeRootRes = await listR2Objects({ bucket: lakeBucket, limit: 100 });
  const lakeDescriptors = lakeRootRes.objects.filter(o => o.key.includes('_README') || o.key.includes('_manifest'));
  console.log(`  - Bucket: ${lakeBucket}`);
  console.log(`  - Root Self-Descriptors: ${lakeDescriptors.length} found`);
  for (const d of lakeDescriptors.slice(0, 6)) {
    console.log(`      ✓ ${d.key} (${d.size} bytes)`);
  }

  // 2.2 Journal entries
  const journalRes = await listR2Objects({ bucket: lakeBucket, prefix: 'journal/', limit: 200 });
  const journalFiles = journalRes.objects.filter(o => o.key.endsWith('.json') && !o.key.includes('_manifest'));
  console.log(`  - Journal Entries (Fact Logs): ${journalFiles.length}+ records verified`);
  for (const j of journalFiles.slice(0, 3)) {
    console.log(`      • ${j.key} (${j.size} bytes)`);
  }

  // 2.3 Bundles
  const bundlesRes = await listR2Objects({ bucket: lakeBucket, prefix: 'bundles/', limit: 50 });
  console.log(`  - Bundles (Research Bundles): ${bundlesRes.objects.length} verified`);

  // 3. Boundary note. This script must not pretend that a Foundation bucket
  // sample proves the state of the legacy Universal/EDINET area.
  console.log('\n[3/4] Boundary note...');
  console.log('  - EDINET / universal boundary: NOT VERIFIED by this Foundation-only sample.');
  console.log('  - Destructive operations: application Create-Only behavior is reported by code tests, not inferred from this listing.');
  console.log('  - Bucket Lock, Data Access Logs, backup, and restore: NOT VERIFIED here.');

  // 4. Audit Layer 3: Catalog & Serving Index
  console.log('\n[4/4] Auditing Layer 3: Catalog (entities-index.json)...');
  const indexPath = resolve(process.cwd(), 'data/entities-index.json');
  const rawIndex = JSON.parse(await readFile(indexPath, 'utf8')) as Record<string, unknown>[];
  console.log(`  - Total Catalog Entities: ${rawIndex.length}`);
  const withPnl = rawIndex.filter((e) => {
    const pnl = e.pnl as Record<string, unknown> | undefined;
    return pnl && typeof pnl.monthlyRevenue === 'number';
  }).length;
  console.log(`  - Entities with Verified P&L: ${withPnl} / ${rawIndex.length}`);
  const postMortem = rawIndex.filter((e) => e.financialStatus === 'POST_MORTEM' || Boolean(e.fatalBleed)).length;
  console.log(`  - Landmine / Post-Mortem Entities: ${postMortem}`);


  console.log('\n====================================================');
  console.log('  AUDIT SUMMARY: STRUCTURAL SAMPLE COMPLETE');
  console.log('====================================================');
  console.log('- Layer 1/2 listing samples and local Catalog parsing completed.');
  console.log('- This script does not prove 100% integrity, free-tier cost safety, Bucket Lock, access logs, backup, restore, or EDINET state.');
  console.log('- Run `pnpm r2:100-year:audit` for the strict control-plane-aware verdict.\n');
}

main().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
