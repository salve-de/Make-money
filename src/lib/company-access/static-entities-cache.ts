import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { parseFinancialEntitiesResiliently } from '@/shared/financial-entity-schema';
import { normalizeFinancialEntity } from '@/shared/financial-integrity';
import { reconcileFinancialEntity } from '@/platform/data/financial-reconciliation';
import { INSTITUTIONAL_ENTITIES, INSTITUTIONAL_ENTITY_ALIASES } from '@/platform/data/mockLedgerData';
import type { FinancialEntity } from '@/platform/types/terminal';

let cachedEntitiesPromise: Promise<FinancialEntity[]> | null = null;

export async function getCachedEntities(): Promise<FinancialEntity[]> {
  if (cachedEntitiesPromise) {
    return cachedEntitiesPromise;
  }

  cachedEntitiesPromise = (async () => {
    try {
      const localPath = resolve(process.cwd(), 'data/entities-index.json');
      const content = await readFile(localPath, 'utf8');
      const raw = JSON.parse(content);
      const { validEntities } = parseFinancialEntitiesResiliently(raw);

      if (validEntities.length > 0) {
        const normalized = validEntities
          .filter((entity) => !INSTITUTIONAL_ENTITY_ALIASES[entity.id])
          .map(reconcileFinancialEntity)
          .map(normalizeFinancialEntity);

        const keyenceIdx = normalized.findIndex((e) => e.id === 'ent_keyence');
        if (keyenceIdx > 0) {
          const [keyence] = normalized.splice(keyenceIdx, 1);
          normalized.unshift(keyence);
        }
        return normalized;
      }
    } catch (error) {
      console.warn('[static-entities-cache] Failed to read entities-index.json, fallback to mock data:', error);
    }
    return INSTITUTIONAL_ENTITIES;
  })();

  return cachedEntitiesPromise;
}
