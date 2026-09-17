import type { FinancialEntity, GridFilterOption } from '@/shared/terminal';

/** Minimal input contract: no React, network, modal or storage dependency. */
export type FilterCandidate = Pick<FinancialEntity, 'id' | 'scale' | 'sector'> & {
  pnl: Pick<FinancialEntity['pnl'], 'operatingMargin'>;
  operations: Pick<FinancialEntity['operations'], 'isCapitalUnconfirmed' | 'initialCapitalRequired'>;
};

export type ApprovalCandidate = Pick<FinancialEntity, 'id' | 'tags'>;

type Predicate = (entity: FilterCandidate, bookmarks: ReadonlySet<string>) => boolean;
const predicates: Record<GridFilterOption, Predicate> = {
  ALL: () => true,
  SOLO: (entity) => entity.scale === 'SOLO',
  HIGH_MARGIN: (entity) => entity.pnl.operatingMargin >= 50,
  ZERO_CAPITAL: (entity) => !entity.operations.isCapitalUnconfirmed && entity.operations.initialCapitalRequired <= 0,
  MONOPOLY: (entity) => entity.scale === 'ENTERPRISE',
  AI_NATIVE: (entity) => entity.sector === 'AI_AUTOMATION',
  BOOKMARKED: (entity, bookmarks) => bookmarks.has(entity.id),
};

export const GRID_FILTERS = Object.keys(predicates) as GridFilterOption[];

export function parseGridFilter(value: string | null | undefined): GridFilterOption {
  return GRID_FILTERS.find((filter) => filter === value) ?? 'ALL';
}

export function readEntityFilterQuery(params: Pick<URLSearchParams, 'get'> | null) {
  return {
    filter: parseGridFilter(params?.get('filter')),
    batch: params?.get('batch') || 'ALL',
  };
}

export function matchesGridFilter(
  entity: FilterCandidate,
  filter: GridFilterOption,
  bookmarks: ReadonlySet<string>,
): boolean {
  return predicates[filter](entity, bookmarks);
}

/** IDs eligible for the toolbar's "approve displayed" action. */
export function collectedEntityIds(visibleEntities: readonly ApprovalCandidate[]): string[] {
  return visibleEntities
    .filter((entity) => (entity.tags || []).includes('収集事例'))
    .map((entity) => entity.id);
}
