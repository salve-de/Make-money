import { INSTITUTIONAL_ENTITIES, INSTITUTIONAL_ENTITY_ALIASES } from '@/platform/data/mockLedgerData';
import { publicEntity } from '@/lib/company-access/public-entity';
import { parseFinancialEntitiesResiliently } from '@/shared/financial-entity-schema';
import { normalizeFinancialEntity } from '@/shared/financial-integrity';
import React, { Suspense } from 'react';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TerminalShell } from '../platform/components/layout/TerminalShell';
import type { FinancialEntity } from '@/platform/types/terminal';

async function getInitialEntities(): Promise<FinancialEntity[]> {
  try {
    const localIndexPath = resolve(process.cwd(), 'data/entities-index.json');
    const parsed: unknown = JSON.parse(await readFile(localIndexPath, 'utf8'));
    const { validEntities, invalidEntities } = parseFinancialEntitiesResiliently(parsed);

    if (invalidEntities.length > 0) {
      console.error(`[HomePage] CRITICAL: Quarantined ${invalidEntities.length} invalid entities while serving ${validEntities.length} valid entities:`, invalidEntities.slice(0, 5));
    }

    if (validEntities.length > 0) {
      return validEntities
        .filter((entity) => !INSTITUTIONAL_ENTITY_ALIASES[entity.id])
        .map(normalizeFinancialEntity);
    }
  } catch (error) {
    console.error('[HomePage] Catastrophic failure reading entities-index.json; fallback to static core:', error);
  }
  return INSTITUTIONAL_ENTITIES;
}


export default async function Home() {
  const entities = await getInitialEntities();
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060709]" />}>
      <TerminalShell initialEntities={entities.map(publicEntity)} entityAliases={INSTITUTIONAL_ENTITY_ALIASES} />
    </Suspense>
  );
}

