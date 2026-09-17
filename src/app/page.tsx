import { INSTITUTIONAL_ENTITIES, INSTITUTIONAL_ENTITY_ALIASES } from '@/platform/data/mockLedgerData';
import { publicEntity, publicSummaryEntity } from '@/lib/company-access/public-entity';
import { parseFinancialEntitiesResiliently } from '@/shared/financial-entity-schema';
import { normalizeFinancialEntity } from '@/shared/financial-integrity';
import { reconcileFinancialEntity } from '@/platform/data/financial-reconciliation';
import React, { Suspense } from 'react';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TerminalShell } from '../platform/components/layout/TerminalShell';
import type { FinancialEntity } from '@/platform/types/terminal';

async function getInitialEntities(): Promise<FinancialEntity[]> {
  try {
    const localIndexPath = resolve(process.cwd(), 'data/entities-index.json');
    const parsed: unknown = JSON.parse(await readFile(localIndexPath, 'utf8'));
    const { validEntities, invalidEntities } = parseFinancialEntitiesResiliently(parsed);

    if (invalidEntities.length > 0) {
      console.error(`[HomePage] CRITICAL: Quarantined ${invalidEntities.length} invalid entities while serving ${validEntities.length} valid entities:`, invalidEntities.slice(0, 5));
    }

    if (validEntities.length > 0) {
      const normalized = validEntities
        .filter((entity) => !INSTITUTIONAL_ENTITY_ALIASES[entity.id])
        .map(reconcileFinancialEntity)
        .map(normalizeFinancialEntity);
      const photoAiIdx = normalized.findIndex((e) => e.id === 'ent_photoai');
      if (photoAiIdx > 0) {
        const [photoAi] = normalized.splice(photoAiIdx, 1);
        normalized.unshift(photoAi);
      }
      const keyenceIdx = normalized.findIndex((e) => e.id === 'ent_keyence');
      if (keyenceIdx > 0) {
        const [keyence] = normalized.splice(keyenceIdx, 1);
        normalized.unshift(keyence);
      }
      return normalized;
    }
  } catch (error) {
    console.error('[HomePage] Catastrophic failure reading entities-index.json; fallback to static core:', error);
  }
  return INSTITUTIONAL_ENTITIES;
}


export default async function Home(props: { searchParams?: Promise<{ entity?: string }> }) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const requestedEntityId = searchParams?.entity;
  const entities = await getInitialEntities();

  // 1億件スケール耐性: 
  // 1. URLで直接指定されたエンティティ（パーマリンク・テスト時）および初期展開候補（キーエンス等）は完全版をSSR供給。
  // 2. 一覧用の残りの企業は軽量サマリー（publicSummaryEntity）として供給し、初期HTMLサイズを最小化。
  // 3. クライアントで選択された他企業はオンデマンドLazy Loadingで0.01秒昇華。
  const optimizedEntities = entities.map((ent, idx) => {
    const isTarget = requestedEntityId && (ent.id === requestedEntityId || ent.id.toLowerCase() === requestedEntityId.toLowerCase());
    if (isTarget || idx < 2 || ent.id === 'ent_keyence' || ent.id === 'ent_photoai') {
      return publicEntity(ent);
    }
    return publicSummaryEntity(ent);
  });

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060709]" />}>
      <TerminalShell initialEntities={optimizedEntities} entityAliases={INSTITUTIONAL_ENTITY_ALIASES} />
    </Suspense>
  );
}


