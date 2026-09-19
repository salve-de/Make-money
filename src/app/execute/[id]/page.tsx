import React from 'react';
import { notFound } from 'next/navigation';

import { findCachedPublishableEntity } from '@/lib/company-access/local-entity-index';
import { publicEntity } from '@/lib/company-access/public-entity';
import type { FinancialEntity } from '@/shared/terminal';
import { ExecutionClient } from './ExecutionClient';

async function getEntity(id: string): Promise<FinancialEntity | null> {
  const entity = await findCachedPublishableEntity(id);
  return entity ? publicEntity(entity) : null;
}

export default async function ExecutionPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const entity = await getEntity(id);
  if (!entity) notFound();

  return <ExecutionClient entity={entity} />;
}
