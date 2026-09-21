import React from 'react';
import { readCachedLocalPublishableEntities } from '@/lib/company-access/local-entity-index';
import type { FinancialEntity } from '@/platform/types/terminal';
import type { SnapshotEntity } from '@/platform/utils/financialSnapshot';
import { RadarClientShell } from './RadarClientShell';

export const revalidate = 60; // 1分ごとに動的再検証 (ISR)

async function getEntities(): Promise<FinancialEntity[]> {
  return readCachedLocalPublishableEntities();
}

function toTickerEntity(entity: FinancialEntity): SnapshotEntity {
  return { id: entity.id, name: entity.name, pnl: entity.pnl };
}

export default async function RadarPage() {
  const entities = await getEntities();
  return <RadarClientShell entities={entities.map(toTickerEntity)} />;
}
