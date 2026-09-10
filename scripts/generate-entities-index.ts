import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { INSTITUTIONAL_ENTITIES } from '../src/platform/data/mockLedgerData';
import { projectBundleToFinancialEntity } from '../src/lib/foundation/projector';
import { FinancialEntity } from '../src/platform/types/terminal';

async function main() {
  console.log('=== [1/4] Loading baseline entities ===');
  const entityMap = new Map<string, FinancialEntity>();
  const nameMap = new Map<string, string>(); // lowerName -> id

  // 1. 静的定義されている実在13銘柄をベースとしてロード
  for (const entity of INSTITUTIONAL_ENTITIES) {
    entityMap.set(entity.id, entity);
    nameMap.set(entity.name.toLowerCase(), entity.id);
  }
  console.log(`Loaded ${entityMap.size} baseline verified entities.`);

  // 2. data/collection/ 配下の収集JSONを探索して追加マージ
  console.log('=== [2/4] Scanning data/collection/ for raw bundles ===');
  const collectionDir = resolve(process.cwd(), 'data/collection');
  try {
    const files = await readdir(collectionDir);
    for (const file of files) {
      if (file.endsWith('.request.json') || file.endsWith('.saved.json')) {
        try {
          const filePath = resolve(collectionDir, file);
          const content = JSON.parse(await readFile(filePath, 'utf8'));
          const bundle = content.bundle || content;
          const projected = projectBundleToFinancialEntity(bundle);
          
          if (projected) {
            const lowerName = projected.name.toLowerCase();
            // Unknown Entity や空文字はスキップ
            if (lowerName === 'unknown entity' || !lowerName.trim()) {
              continue;
            }

            // 同名企業が既に存在する場合は、既存の高品質データを優先しつつ補完
            if (nameMap.has(lowerName)) {
              const existingId = nameMap.get(lowerName)!;
              const existing = entityMap.get(existingId)!;
              // observationsStream や timelineEvents を加算マージ
              if (projected.observationsStream && projected.observationsStream.length > 0) {
                const mergedObs = [...(existing.observationsStream || [])];
                const existingTexts = new Set(mergedObs.map((o) => o.text));
                for (const obs of projected.observationsStream) {
                  if (!existingTexts.has(obs.text)) {
                    mergedObs.push(obs);
                    existingTexts.add(obs.text);
                  }
                }
                existing.observationsStream = mergedObs;
              }
              entityMap.set(existingId, existing);
              console.log(`~ Merged observations for existing entity: ${existing.name}`);
            } else if (!entityMap.has(projected.id)) {
              entityMap.set(projected.id, projected);
              nameMap.set(lowerName, projected.id);
              console.log(`+ Ingested new entity from ${file}: ${projected.name} (${projected.id})`);
            }
          }
        } catch (err) {
          console.warn(`Warning: Could not parse ${file}:`, err);
        }
      }
    }
  } catch {
    console.log('No data/collection directory found or empty.');
  }

  const allEntities = Array.from(entityMap.values());
  console.log(`=== [3/4] Aggregated total: ${allEntities.length} entities ===`);

  // 3. ローカルに entities-index.json を保存
  const outputPath = resolve(process.cwd(), 'data/entities-index.json');
  await writeFile(outputPath, JSON.stringify(allEntities, null, 2), 'utf8');
  console.log(`Successfully generated index file: ${outputPath} (${(Buffer.byteLength(JSON.stringify(allEntities)) / 1024).toFixed(1)} KB)`);

  // 4. サマリー表示
  console.log('=== [4/4] Done. Sample entities: ===');
  allEntities.slice(0, 5).forEach((e, idx) => {
    console.log(`  ${idx + 1}. [${e.ticker}] ${e.name} - 月商: ¥${e.pnl.monthlyRevenue.toLocaleString()} (${e.temporal?.viabilityLabel || '判定未'})`);
  });
  console.log('R2同期は行いません。このコマンドはローカル表示キャッシュの生成専用です。');
}

main().catch((err) => {
  console.error('Failed to generate entities index:', err);
  process.exit(1);
});
