import type { FinancialEntity } from './terminal';

/** Planning context is not a financial publication or a paid dossier. */
export type ExecutionSource = Pick<FinancialEntity,
  'id' | 'name' | 'tagline' | 'essence' | 'targetPainWallet' | 'architecturePattern' |
  'pipelineStack' | 'pricing' | 'acquisition' | 'lootBlueprint' | 'opportunityJudgment'
> & {
  strategy: Pick<FinancialEntity['strategy'], 'actionPlaybook' | 'initialTraction' | 'blindspot'>;
  operations: Pick<FinancialEntity['operations'], 'primaryChannels'>;
  contextUnavailable?: boolean;
};

export function executionSource(entity: FinancialEntity): ExecutionSource {
  const { id, name, tagline, essence, targetPainWallet, architecturePattern,
    pipelineStack, pricing, acquisition, lootBlueprint, opportunityJudgment } = entity;
  return {
    id, name, tagline, essence, targetPainWallet, architecturePattern,
    pipelineStack, pricing, acquisition, lootBlueprint, opportunityJudgment,
    strategy: { actionPlaybook: entity.strategy.actionPlaybook,
      initialTraction: entity.strategy.initialTraction, blindspot: entity.strategy.blindspot },
    operations: { primaryChannels: entity.operations.primaryChannels },
  };
}

export function identityOnlyExecutionSource(id: string, name: string): ExecutionSource {
  return { id, name, tagline: '', targetPainWallet: '', architecturePattern: '', pipelineStack: '',
    strategy: { actionPlaybook: [], initialTraction: [], blindspot: '' }, operations: { primaryChannels: [] },
    contextUnavailable: true };
}
