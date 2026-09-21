import { publicEntity } from '@/lib/company-access/public-entity';
import React from 'react';
import { readCachedLocalPublishableEntities } from '@/lib/company-access/local-entity-index';
import { FinancialEntity } from '@/platform/types/terminal';
import { PartnersClient } from './PartnersClient';

export const revalidate = 60; // 1分ごとに動的再検証 (ISR)

async function getEntities(): Promise<FinancialEntity[]> {
  return readCachedLocalPublishableEntities();
}

export default async function PartnersPage() {
  const entities = await getEntities();
  // The client only renders the first ticker items. Do not serialize the full
  // catalog into this static page; the detail ledger remains the source for
  // the complete dataset.
  return <PartnersClient entities={entities.slice(0, 12).map(publicEntity)} />;
}
