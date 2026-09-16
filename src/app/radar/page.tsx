import { publicEntity } from '@/lib/company-access/public-entity';
import { getCachedEntities } from '@/lib/company-access/static-entities-cache';
import React from 'react';
import { RadarClientShell } from './RadarClientShell';

export const revalidate = 60; // 1分ごとに動的再検証 (ISR)

async function getEntities() {
  return getCachedEntities();
}

export default async function RadarPage() {
  const entities = await getEntities();
  return <RadarClientShell entities={entities.map(publicEntity)} />;
}
