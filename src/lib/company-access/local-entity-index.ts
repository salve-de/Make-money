import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { isPublishableEntity } from '@/lib/company-access/public-entity';
import { reconcileFinancialEntity } from '@/platform/data/financial-reconciliation';
import type { FinancialEntity } from '@/platform/types/terminal';
import { parseFinancialEntitiesResiliently } from '@/shared/financial-entity-schema';
import { normalizeFinancialEntity } from '@/shared/financial-integrity';
import { findReleaseEntity, readReleaseSummaries, usesCatalogRelease } from './catalog-release';

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
    const { INSTITUTIONAL_ENTITY_ALIASES } = await import('@/platform/data/mockLedgerData');
    const localIndexPath = resolve(process.cwd(), 'data/entities-index.json');
    const parsed: unknown = JSON.parse(await readFile(localIndexPath, 'utf8'));
    const { validEntities } = parseFinancialEntitiesResiliently(parsed);
    const entities = validEntities
      .filter((entity) => !INSTITUTIONAL_ENTITY_ALIASES[entity.id])
      .map(reconcileFinancialEntity)
      .filter(isPublishableEntity)
      .map(normalizeFinancialEntity);

    const featuredIdx = entities.findIndex((entity) => entity.id === 'ent_photoai');
    if (featuredIdx > 0) {
      const [featured] = entities.splice(featuredIdx, 1);
      entities.unshift(featured);
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
  if (await usesCatalogRelease()) return readReleaseSummaries();
  return (await getCachedLocalEntityIndex()).entities;
}

export async function findCachedPublishableEntity(id: string): Promise<FinancialEntity | null> {
  if (await usesCatalogRelease()) return findReleaseEntity(id);
  const cache = await getCachedLocalEntityIndex();
  let raw = cache.byId.get(id)
    ?? cache.byId.get(id.toLowerCase())
    ?? null;
  if (!raw) {
    const { findInstitutionalEntity, INSTITUTIONAL_ENTITIES } = await import('@/platform/data/mockLedgerData');
    raw = findInstitutionalEntity(id)
      ?? INSTITUTIONAL_ENTITIES.find((entity) => entity.id.toLowerCase() === id.toLowerCase())
      ?? null;
  }
  if (!raw) return null;

  const entity = normalizeFinancialEntity(reconcileFinancialEntity(raw));
  return isPublishableEntity(entity) ? entity : null;
}
