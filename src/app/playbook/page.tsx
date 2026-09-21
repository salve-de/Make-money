import { publicEntity } from '@/lib/company-access/public-entity';
import React from 'react';
import { readCachedLocalPublishableEntities } from '@/lib/company-access/local-entity-index';
import { FinancialEntity } from '@/platform/types/terminal';
import { aggregateMacroIntelligence } from '@/lib/intelligence/macro-aggregator';
import { PlaybookClientShell } from './PlaybookClientShell';

export const revalidate = 60; // 1分ごとに動的再検証 (ISR)

async function getEntities(): Promise<FinancialEntity[]> {
  return readCachedLocalPublishableEntities();
}

export default async function PlaybookPage() {
  const entities = await getEntities();
  const macroData = aggregateMacroIntelligence(entities.map(publicEntity));

  // Macro intelligence needs the full server-side catalog, but the client
  // ticker renders only a small visible window. Keep the large dossier data
  // out of the static RSC/HTML payload.
  return <PlaybookClientShell macroData={macroData} entities={entities.slice(0, 12).map(publicEntity)} />;
}
