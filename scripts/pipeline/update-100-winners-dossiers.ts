import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { buildFinancialEntityFromDef, RawWinnerDef } from './generate-100-winners-data';
import type { FinancialEntity } from '../../src/platform/types/terminal';

const winnersDefsPath = resolve(process.cwd(), 'data/winners-100-definitions.json');
const indexPath = resolve(process.cwd(), 'data/entities-index.json');

const rawDefs: RawWinnerDef[] = JSON.parse(readFileSync(winnersDefsPath, 'utf8'));
const entities: FinancialEntity[] = JSON.parse(readFileSync(indexPath, 'utf8'));

console.log(`Loaded ${rawDefs.length} definitions and ${entities.length} index entities.`);

const enrichedEntitiesMap = new Map<string, FinancialEntity>();
for (const def of rawDefs) {
  const entity = buildFinancialEntityFromDef(def);
  enrichedEntitiesMap.set(entity.id.toLowerCase(), entity);
}

let replacedCount = 0;
const updatedEntities = entities.map((existing) => {
  const replacement = enrichedEntitiesMap.get(existing.id.toLowerCase());
  if (replacement) {
    replacedCount++;
    // 既存の tags のうち、既に承認されて「収集事例」が外れている場合は外れた状態を尊重
    const existingHadCollectionTag = (existing.tags || []).includes('収集事例');
    const finalTags = existingHadCollectionTag
      ? replacement.tags
      : (replacement.tags || []).filter(t => t !== '収集事例');
    
    return {
      ...replacement,
      tags: finalTags,
    };
  }
  return existing;
});

writeFileSync(indexPath, JSON.stringify(updatedEntities, null, 2), 'utf8');
console.log(`Successfully enriched and replaced ${replacedCount} entities in data/entities-index.json!`);
