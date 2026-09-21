import { INSTITUTIONAL_ENTITY_ALIASES } from '@/platform/data/mockLedgerData';
import { publicEntity, publicSummaryEntity } from '@/lib/company-access/public-entity';
import { findCachedPublishableEntity, readCachedLocalPublishableEntities } from '@/lib/company-access/local-entity-index';
import React, { Suspense } from 'react';
import { TerminalShell } from '../platform/components/layout/TerminalShell';
import registry from '../../data/collected-registry.json';
import Link from 'next/link';
export const dynamic = 'force-dynamic';

export default async function Home(props: { searchParams?: Promise<{ entity?: string }> }) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const requestedEntityId = searchParams?.entity ? INSTITUTIONAL_ENTITY_ALIASES[searchParams.entity] || searchParams.entity : undefined;
  const entities = await readCachedLocalPublishableEntities();
  const selected = requestedEntityId ? await findCachedPublishableEntity(requestedEntityId) : null;
  const unavailable = requestedEntityId && !selected ? registry.find((row) => row.id.toLowerCase() === requestedEntityId.toLowerCase()) : null;

  // The list receives summaries; only the selected dossier is read in full.
  const initial = entities.slice(0, 100);
  if (selected && !initial.some((entity) => entity.id === selected.id)) initial.push(selected);
  const optimizedEntities = initial.map((ent) => {
    if (selected?.id === ent.id) {
      return publicEntity(selected);
    }
    return publicSummaryEntity(ent);
  });

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060709]" />}>
      {unavailable ? <aside role="status" className="bg-amber-950 p-4 text-sm text-amber-100">
        {unavailable.name}：詳細の公開確認が完了していないため、未確認の財務・分析は表示していません。
        <Link className="ml-3 underline" href={`/execute/${encodeURIComponent(unavailable.id)}`}>{unavailable.name}の稼ぎ方を実行する（空の計画から開始）</Link>
      </aside> : null}
      <TerminalShell initialEntities={optimizedEntities} entityAliases={INSTITUTIONAL_ENTITY_ALIASES}
        catalogTags={[...new Set(entities.flatMap((entity) => entity.tags ?? []))].sort()}
        catalogBatchIds={[...new Set(entities.flatMap((entity) => entity.batchId ? [entity.batchId] : []))].sort()} />
    </Suspense>
  );
}
