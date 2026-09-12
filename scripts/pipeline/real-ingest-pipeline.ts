import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getFoundationBucket, putR2ObjectCreateOnly, sha256Hex } from '../../src/lib/storage/r2';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';
import { inspectFinancialIntegrity } from '../../src/shared/financial-integrity';
import type { FinancialEntity } from '../../src/platform/types/terminal';

/**
 * 実在企業のデータを検証し、R2 (foundation-lake) にイミュータブル保存し、目録に追記するコア関数
 */
export async function ingestVerifiedEntities(entities: FinancialEntity[], batchName: string) {
  console.log(`\n================================================================`);
  console.log(`  INGESTING BATCH [${batchName}]: ${entities.length} Real-World Entities`);
  console.log(`================================================================\n`);

  // 1. スキーマ & 算術整合性バリデーション
  console.log('--- [1/3] Validating Schema & Financial Arithmetic Integrity ---');
  for (const ent of entities) {
    // A. スキーマチェック
    try {
      parseFinancialEntity(ent);
    } catch (err) {
      console.error(`Schema validation FAILED for ${ent.name} (${ent.id}):`, err);
      throw err;
    }

    // B. 算術整合性チェック (1円・0.1%の狂いも許さない)
    const check = inspectFinancialIntegrity(ent.pnl);
    if (check.profitConflict || check.grossConflict || check.marginConflict) {
      const msg = `Arithmetic integrity FAILED for ${ent.name}: ` +
        `profitConflict=${check.profitConflict}, grossConflict=${check.grossConflict}, marginConflict=${check.marginConflict} ` +
        `[calcProfit=${check.calculatedProfit}, pnlProfit=${ent.pnl.operatingProfit}, calcMargin=${check.calculatedMargin?.toFixed(2)}%, pnlMargin=${ent.pnl.operatingMargin}%]`;
      console.error(msg);
      throw new Error(msg);
    }
    console.log(`  ✓ ${ent.name.padEnd(25)} [REV: ¥${ent.pnl.monthlyRevenue.toLocaleString()} / OPM: ${ent.pnl.operatingMargin}%] PASS`);
  }

  // 2. Cloudflare R2 (foundation-lake) にイミュータブル保存
  console.log('\n--- [2/3] Materializing to Cloudflare R2 (foundation-lake) ---');
  const lakeBucket = getFoundationBucket('lake');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '/') + `/${batchName}`;

  for (const ent of entities) {
    const journalKey = `journal/v1/${dateStr}/${ent.id}.json`;
    const payload = JSON.stringify({
      schema_version: 'journal-entry.v1',
      journal_id: `jr_${ent.id.replace('ent_', '')}`,
      recorded_at: new Date().toISOString(),
      entity: ent,
      source_provenance: {
        method: 'DEEP_DIRECT_RESEARCH',
        researcher: 'Antigravity Core Analyst',
        verified_sources: [
          ent.url,
          ent.pnl.sourceDoc
        ]
      }
    }, null, 2);

    const sha = await sha256Hex(payload);
    const writeResult = await putR2ObjectCreateOnly({
      bucket: lakeBucket,
      key: journalKey,
      body: payload,
      contentType: 'application/json; charset=utf-8',
      metadata: {
        'foundation-entity-id': ent.id,
        'foundation-schema-version': 'journal-entry.v1',
        'foundation-sha256': sha
      }
    });

    console.log(`  ✓ R2 PUT: ${lakeBucket}/${journalKey} [Status: ${writeResult.status}, SHA: ${sha.slice(0, 10)}]`);
  }

  // 3. 目録 (data/entities-index.json) に追記・更新
  console.log('\n--- [3/3] Syncing Catalog Index (data/entities-index.json) ---');
  const indexPath = resolve(process.cwd(), 'data/entities-index.json');
  const existing: FinancialEntity[] = JSON.parse(await readFile(indexPath, 'utf8'));

  const newIds = new Set(entities.map(e => e.id));
  const filteredExisting = existing.filter(e => !newIds.has(e.id));
  const updatedCatalog = [...entities, ...filteredExisting];

  await writeFile(indexPath, JSON.stringify(updatedCatalog, null, 2), 'utf8');
  console.log(`  ✓ Catalog synchronized! Total entities: ${updatedCatalog.length} (Added/Updated: ${entities.length})`);
  console.log(`\n================================================================\n`);
  return updatedCatalog.length;
}
