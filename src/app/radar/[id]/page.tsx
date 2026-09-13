import React from 'react';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { publicEntity } from '@/lib/company-access/public-entity';
import { normalizeFinancialEntity } from '@/shared/financial-integrity';
import { parseFinancialEntities } from '@/shared/financial-entity-schema';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { FinancialEntity } from '@/platform/types/terminal';
import {
  MARKET_RADAR_TRENDS,
  MARKET_RADAR_LANDMINES,
} from '@/platform/data/marketRadarData';
import { RadarDetailClientShell } from './RadarDetailClientShell';

export const revalidate = 60; // 1分ごとに動的再検証 (ISR)

export async function generateStaticParams() {
  const trendParams = MARKET_RADAR_TRENDS.map((trend) => ({ id: trend.id }));
  const landmineParams = MARKET_RADAR_LANDMINES.map((mine) => ({ id: mine.id }));
  return [...trendParams, ...landmineParams];
}

async function getEntities(): Promise<FinancialEntity[]> {
  try {
    const localPath = resolve(process.cwd(), 'data/entities-index.json');
    const content = await readFile(localPath, 'utf8');
    const parsed = parseFinancialEntities(JSON.parse(content));
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(normalizeFinancialEntity);
    }
  } catch (error) {
    console.warn('[RadarDetailPage] Failed to read entities-index.json, fallback to mock data:', error);
  }
  return INSTITUTIONAL_ENTITIES;
}

interface RadarDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RadarDetailPage({ params }: RadarDetailPageProps) {
  const { id } = await params;
  const entities = await getEntities();

  return <RadarDetailClientShell id={id} entities={entities.map(publicEntity)} />;
}
