import { INSTITUTIONAL_ENTITIES, INSTITUTIONAL_ENTITY_ALIASES } from '@/platform/data/mockLedgerData';
import { publicEntity } from '@/lib/company-access/public-entity';
import { parseFinancialEntities } from '@/shared/financial-entity-schema';
import { normalizeFinancialEntity } from '@/shared/financial-integrity';
import React, { Suspense } from 'react';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TerminalShell } from '../platform/components/layout/TerminalShell';
import type { FinancialEntity } from '@/platform/types/terminal';

const INITIAL_FEED_LIMIT = 200;

async function getInitialEntities(): Promise<FinancialEntity[]> {
  try {
    const localIndexPath = resolve(process.cwd(), 'data/entities-index.json');
    const parsed: unknown = JSON.parse(await readFile(localIndexPath, 'utf8'));
    const allEntities = parseFinancialEntities(parsed)
      .filter((entity) => !INSTITUTIONAL_ENTITY_ALIASES[entity.id])
      .map(normalizeFinancialEntity);
    if (allEntities.length > 0) {
      // 10,000件スケール時もSSR HTMLの巨大化を防ぎ0.01秒描画を死守するため、初期描画分を先頭200件に制限
      return allEntities.slice(0, INITIAL_FEED_LIMIT);
    }
  } catch (error) {
    console.warn('[HomePage] Failed to read entities-index.json, fallback to mock data:', error);
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

