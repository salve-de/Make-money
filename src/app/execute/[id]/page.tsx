import React from 'react';
import { notFound } from 'next/navigation';

import { findExecutionSource } from '@/lib/execution/source';
import { ExecutionClient } from './ExecutionClient';

export default async function ExecutionPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const entity = await findExecutionSource(id);
  if (!entity) notFound();

  return <ExecutionClient entity={entity} />;
}
