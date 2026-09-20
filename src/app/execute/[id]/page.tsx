import React from 'react';
import { notFound } from 'next/navigation';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { publicEntity } from '@/lib/company-access/public-entity';
import { parseFinancialEntitiesResiliently } from '@/shared/financial-entity-schema';
import { normalizeFinancialEntity } from '@/shared/financial-integrity';
import { reconcileFinancialEntity } from '@/platform/data/financial-reconciliation';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import type { FinancialEntity } from '@/shared/terminal';
import { ExecutionClient } from './ExecutionClient';

async function getEntity(id: string): Promise<FinancialEntity | null> {
  let entities: FinancialEntity[] = [];
  try {
    const localIndexPath = resolve(process.cwd(), 'data/entities-index.json');
    const parsed: unknown = JSON.parse(await readFile(localIndexPath, 'utf8'));
    const { validEntities } = parseFinancialEntitiesResiliently(parsed);
    entities = validEntities;
  } catch (error) {
    console.warn('[ExecutionPage] Failed to read entities-index.json, using static core:', error);
    entities = INSTITUTIONAL_ENTITIES;
  }

  const target = entities.find((entity) => entity.id === id || entity.id.toLowerCase() === id.toLowerCase())
    ?? INSTITUTIONAL_ENTITIES.find((entity) => entity.id === id || entity.id.toLowerCase() === id.toLowerCase())
    ?? null;

  return target ? publicEntity(normalizeFinancialEntity(reconcileFinancialEntity(target))) : null;
}

export default async function ExecutionPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const entity = await getEntity(id);
  if (!entity) notFound();

  return <ExecutionClient entity={entity} />;
}
