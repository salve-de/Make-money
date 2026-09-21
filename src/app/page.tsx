import React, { Suspense } from 'react';
import { TerminalShell } from '../platform/components/layout/TerminalShell';
import Link from 'next/link';
import type { FinancialEntity } from '@/shared/terminal';
export const dynamic = 'force-dynamic';

export default async function Home(props: { searchParams?: Promise<{ entity?: string }> }) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  // The production page intentionally starts with no server-side catalog. The
  // browser owns bounded catalog/Foundation pages, while local development
  // keeps the working-tree index and deep-link fallback below.
  const productionCatalog = process.env.NODE_ENV === 'production';
  let requestedEntityId = searchParams?.entity;
  let entityAliases: Record<string, string> = {};
  let entities: FinancialEntity[] = [];
  let selected: FinancialEntity | null = null;
  let unavailable: { id: string; name: string } | null = null;
  let publicEntity: ((entity: FinancialEntity) => FinancialEntity) | undefined;
  let publicSummaryEntity: ((entity: FinancialEntity) => FinancialEntity) | undefined;

  if (!productionCatalog) {
    const [ledgerModule, publicEntityModule, localIndexModule, registryModule] = await Promise.all([
      import('@/platform/data/mockLedgerData'),
      import('@/lib/company-access/public-entity'),
      import('@/lib/company-access/local-entity-index'),
      import('../../data/collected-registry.json'),
    ]);
    entityAliases = ledgerModule.INSTITUTIONAL_ENTITY_ALIASES;
    requestedEntityId = searchParams?.entity ? entityAliases[searchParams.entity] || searchParams.entity : undefined;
    publicEntity = publicEntityModule.publicEntity;
    publicSummaryEntity = publicEntityModule.publicSummaryEntity;
    entities = await localIndexModule.readCachedLocalPublishableEntities();
    selected = requestedEntityId ? await localIndexModule.findCachedPublishableEntity(requestedEntityId) : null;
    if (requestedEntityId && !selected) {
      unavailable = registryModule.default.find((row) => row.id.toLowerCase() === requestedEntityId!.toLowerCase()) ?? null;
    }
  }

  // Production loads the accepted catalog through its bounded client API
  // pages. Avoid expanding all 3,085 summaries and facet arrays during every
  // SSR request; the client already owns cursor-based loading and merging.
  // The list receives summaries; only the selected dossier is read in full.
  const initial = entities.slice(0, 100);
  if (selected && !initial.some((entity) => entity.id === selected.id)) initial.push(selected);
  const optimizedEntities = initial.map((ent) => {
    if (selected?.id === ent.id) {
      return publicEntity!(selected);
    }
    return publicSummaryEntity!(ent);
  });

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060709]" />}>
      {unavailable ? <aside role="status" className="bg-amber-950 p-4 text-sm text-amber-100">
        {unavailable.name}：詳細の公開確認が完了していないため、未確認の財務・分析は表示していません。
        <Link className="ml-3 underline" href={`/execute/${encodeURIComponent(unavailable.id)}`}>{unavailable.name}の稼ぎ方を実行する（空の計画から開始）</Link>
      </aside> : null}
      <TerminalShell initialEntities={optimizedEntities} entityAliases={entityAliases}
        catalogTags={productionCatalog ? [] : [...new Set(entities.flatMap((entity) => entity.tags ?? []))].sort()}
        catalogBatchIds={productionCatalog ? [] : [...new Set(entities.flatMap((entity) => entity.batchId ? [entity.batchId] : []))].sort()} />
    </Suspense>
  );
}
