import { INSTITUTIONAL_ENTITIES, INSTITUTIONAL_ENTITY_ALIASES } from '@/platform/data/mockLedgerData';
import { publicEntity } from '@/lib/company-access/public-entity';
import React, { Suspense } from 'react';
import { TerminalShell } from '../platform/components/layout/TerminalShell';

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060709]" />}>
      <TerminalShell initialEntities={INSTITUTIONAL_ENTITIES.map(publicEntity)} entityAliases={INSTITUTIONAL_ENTITY_ALIASES} />
    </Suspense>
  );
}

