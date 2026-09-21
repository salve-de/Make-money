import { publicEntity } from '@/lib/company-access/public-entity';
import { normalizeFinancialEntity } from '@/shared/financial-integrity';
import { parseFinancialEntities } from '@/shared/financial-entity-schema';
import React from 'react';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { FinancialEntity } from '@/platform/types/terminal';
import { aggregateMacroIntelligence } from '@/lib/intelligence/macro-aggregator';
import { PlaybookClientShell } from './PlaybookClientShell';

export const revalidate = 60; // 1分ごとに動的再検証 (ISR)

async function getEntities(): Promise<FinancialEntity[]> {
  try {
    const localPath = resolve(process.cwd(), 'data/entities-index.json');
    const content = await readFile(localPath, 'utf8');
    const parsed = parseFinancialEntities(JSON.parse(content));
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(normalizeFinancialEntity);
    }
  } catch (error) {
    console.warn('[PlaybookPage] Failed to read entities-index.json, fallback to mock data:', error);
  }
  return INSTITUTIONAL_ENTITIES;
}

export default async function PlaybookPage() {
  const entities = await getEntities();
  const macroData = aggregateMacroIntelligence(entities.map(publicEntity));

  // Macro intelligence needs the full server-side catalog, but the client
  // ticker renders only a small visible window. Keep the large dossier data
  // out of the static RSC/HTML payload.
  return <PlaybookClientShell macroData={macroData} entities={entities.slice(0, 12).map(publicEntity)} />;
}
