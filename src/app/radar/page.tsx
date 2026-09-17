import { normalizeFinancialEntity } from '@/shared/financial-integrity';
import { parseFinancialEntities } from '@/shared/financial-entity-schema';
import React from 'react';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import type { FinancialEntity } from '@/platform/types/terminal';
import type { SnapshotEntity } from '@/platform/utils/financialSnapshot';
import { RadarClientShell } from './RadarClientShell';

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
    console.warn('[RadarPage] Failed to read entities-index.json, fallback to mock data:', error);
  }
  return INSTITUTIONAL_ENTITIES;
}

function toTickerEntity(entity: FinancialEntity): SnapshotEntity {
  return { id: entity.id, name: entity.name, pnl: entity.pnl };
}

export default async function RadarPage() {
  const entities = await getEntities();
  return <RadarClientShell entities={entities.map(toTickerEntity)} />;
}
