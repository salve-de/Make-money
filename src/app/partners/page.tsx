import { publicEntity } from '@/lib/company-access/public-entity';
import { normalizeFinancialEntity } from '@/shared/financial-integrity';
import { parseFinancialEntities } from '@/shared/financial-entity-schema';
import React from 'react';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { FinancialEntity } from '@/platform/types/terminal';
import { PartnersClient } from './PartnersClient';

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
    console.warn('[PartnersPage] Failed to read entities-index.json, fallback to mock data:', error);
  }
  return INSTITUTIONAL_ENTITIES;
}

export default async function PartnersPage() {
  const entities = await getEntities();
  // The client only renders the first ticker items. Do not serialize the full
  // catalog into this static page; the detail ledger remains the source for
  // the complete dataset.
  return <PartnersClient entities={entities.slice(0, 12).map(publicEntity)} />;
}
