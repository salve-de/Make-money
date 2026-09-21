import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { isPublishableEntity } from '@/lib/company-access/public-entity';
import { reconcileFinancialEntity } from '@/platform/data/financial-reconciliation';
import {
  INSTITUTIONAL_ENTITIES,
  INSTITUTIONAL_ENTITY_ALIASES,
  findInstitutionalEntity,
} from '@/platform/data/mockLedgerData';
import type { FinancialEntity } from '@/platform/types/terminal';
import { parseFinancialEntitiesResiliently } from '@/shared/financial-entity-schema';
import { normalizeFinancialEntity } from '@/shared/financial-integrity';

interface LocalEntityIndex {
  entities: FinancialEntity[];
  byId: Map<string, FinancialEntity>;
  cachedAt: number;
}

let localEntityIndex: LocalEntityIndex | null = null;
const LOCAL_ENTITY_INDEX_TTL_MS = 60_000;

export async function getCachedLocalEntityIndex(): Promise<LocalEntityIndex> {
  const now = Date.now();
  if (localEntityIndex && now - localEntityIndex.cachedAt < LOCAL_ENTITY_INDEX_TTL_MS) {
    return localEntityIndex;
  }

  try {
    const localIndexPath = resolve(process.cwd(), 'data/entities-index.json');
    const parsed: unknown = JSON.parse(await readFile(localIndexPath, 'utf8'));
    const { validEntities } = parseFinancialEntitiesResiliently(parsed);
    const entities = validEntities
      .filter((entity) => !INSTITUTIONAL_ENTITY_ALIASES[entity.id])
      .map(reconcileFinancialEntity)
      .filter(isPublishableEntity)
      .map(normalizeFinancialEntity);

    const keyenceIdx = entities.findIndex((entity) => entity.id === 'ent_keyence');
    if (keyenceIdx > 0) {
      const [keyence] = entities.splice(keyenceIdx, 1);
      entities.unshift(keyence);
    }

    const byId = new Map<string, FinancialEntity>();
    for (const entity of entities) {
      byId.set(entity.id, entity);
      byId.set(entity.id.toLowerCase(), entity);
    }

    localEntityIndex = { entities, byId, cachedAt: now };
    return localEntityIndex;
  } catch {
    localEntityIndex = { entities: [], byId: new Map(), cachedAt: now };
    return localEntityIndex;
  }
}

export async function readCachedLocalPublishableEntities(): Promise<FinancialEntity[]> {
  return (await getCachedLocalEntityIndex()).entities;
}

export async function findCachedPublishableEntity(id: string): Promise<FinancialEntity | null> {
  const cache = await getCachedLocalEntityIndex();
  const raw = cache.byId.get(id)
    ?? cache.byId.get(id.toLowerCase())
    ?? findInstitutionalEntity(id)
    ?? INSTITUTIONAL_ENTITIES.find((entity) => entity.id.toLowerCase() === id.toLowerCase())
    ?? null;
  if (!raw) return null;

  const entity = normalizeFinancialEntity(reconcileFinancialEntity(raw));
  return isPublishableEntity(entity) ? entity : null;
}
