'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RadarItemDetailView } from '@/platform/components/radar/RadarItemDetailView';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { resolveRadarProofEntityId } from '@/platform/model/radar-proof-link';
import type { SnapshotEntity } from '@/platform/utils/financialSnapshot';

interface RadarDetailClientShellProps {
  id: string;
  entities: SnapshotEntity[];
}

export const RadarDetailClientShell: React.FC<RadarDetailClientShellProps> = ({ id, entities }) => {
  const router = useRouter();
  const existingEntityIds = React.useMemo(() => entities.map((entity) => entity.id), [entities]);
  const resolveEntityId = React.useCallback(
    (entityId: string) => resolveRadarProofEntityId(entityId, existingEntityIds),
    [existingEntityIds],
  );

  const handleSelectEntity = (entityId: string) => {
    router.push(`/?entity=${entityId}&mode=LEDGER`);
  };

  return (
    <div className="flex term-screen w-full flex-col overflow-hidden bg-background">
      <GlobalHeader currentSection="RADAR" />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <RadarItemDetailView id={id} onSelectEntity={handleSelectEntity} resolveEntityId={resolveEntityId} />
      </main>
    </div>
  );
};
