import type { FinancialEntity } from './terminal';

/** Planning context reads only entity.reader (facts with sources); free-text fields are not carried. */
export type ExecutionSource = Pick<FinancialEntity, 'id' | 'name' | 'reader'> & {
  contextUnavailable?: boolean;
};

export function executionSource(entity: FinancialEntity): ExecutionSource {
  const { id, name, reader } = entity;
  return { id, name, reader };
}

export function identityOnlyExecutionSource(id: string, name: string): ExecutionSource {
  return { id, name, contextUnavailable: true };
}
