import { publicEntity } from '@/lib/company-access/public-entity';
import { getCachedEntities } from '@/lib/company-access/static-entities-cache';
import React from 'react';
import { aggregateMacroIntelligence } from '@/lib/intelligence/macro-aggregator';
import { PlaybookClientShell } from './PlaybookClientShell';

export const revalidate = 60; // 1分ごとに動的再検証 (ISR)

async function getEntities() {
  return getCachedEntities();
}

export default async function PlaybookPage() {
  const entities = await getEntities();
  const macroData = aggregateMacroIntelligence(entities.map(publicEntity));

  return <PlaybookClientShell macroData={macroData} entities={entities.map(publicEntity)} />;
}
