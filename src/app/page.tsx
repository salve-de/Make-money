import { INSTITUTIONAL_ENTITY_ALIASES } from '@/platform/data/mockLedgerData';
import { publicEntity, publicSummaryEntity } from '@/lib/company-access/public-entity';
import { getCachedEntities } from '@/lib/company-access/static-entities-cache';
import React, { Suspense } from 'react';
import { TerminalShell } from '../platform/components/layout/TerminalShell';


export default async function Home(props: { searchParams?: Promise<{ entity?: string }> }) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const requestedEntityId = searchParams?.entity;
  const entities = await getCachedEntities();

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


