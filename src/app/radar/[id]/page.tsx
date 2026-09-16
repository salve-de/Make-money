import React from 'react';
import { publicEntity } from '@/lib/company-access/public-entity';
import { getCachedEntities } from '@/lib/company-access/static-entities-cache';
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
  return getCachedEntities();
}

interface RadarDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RadarDetailPage({ params }: RadarDetailPageProps) {
  const { id } = await params;
  const entities = await getEntities();

  return <RadarDetailClientShell id={id} entities={entities.map(publicEntity)} />;
}
