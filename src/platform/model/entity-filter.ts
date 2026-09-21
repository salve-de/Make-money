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

export interface CatalogFilters {
  filter: GridFilterOption;
  batch: string;
  tags: string[];
  bookmarks: string[];
  screener: { scales: string[]; minMargin: number; maxCapital: number | null; moats: string[]; selectedTags?: string[] } | null;
}

/** Shared by paged server search and the merged Foundation/curated UI. */
export function matchesCatalogQuery(entity: FinancialEntity, query: string, filters?: CatalogFilters): boolean {
  if (filters) {
    if (!matchesGridFilter(entity, filters.filter, new Set(filters.bookmarks))) return false;
    if (filters.batch !== 'ALL' && entity.batchId !== filters.batch) return false;
    if (!filters.tags.every((tag) => (entity.tags ?? []).includes(tag))) return false;
    const screen = filters.screener;
    if (screen) {
      if (screen.scales.length && !screen.scales.includes(entity.scale)) return false;
      if (screen.minMargin > 0 && entity.pnl.operatingMargin < screen.minMargin) return false;
      if (screen.maxCapital !== null && (entity.operations.isCapitalUnconfirmed || entity.operations.initialCapitalRequired > screen.maxCapital)) return false;
      if (screen.moats.length && !screen.moats.includes(entity.strategy.moatType)) return false;
      if (screen.selectedTags?.length && !screen.selectedTags.some((tag) => (entity.tags ?? []).includes(tag))) return false;
    }
  }
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return entity.id.toLowerCase().includes(normalized) ||
    entity.name.toLowerCase().replace(/\s+/g, '').includes(normalized.replace(/\s+/g, '')) ||
    [entity.name, entity.ticker, entity.tagline, entity.founder, entity.strategy?.blindspot, ...(entity.tags ?? [])]
      .some((value) => value?.toLowerCase().includes(normalized));
}

export function parseCatalogFilters(raw: string | null): CatalogFilters | undefined {
  if (!raw) return undefined;
  if (raw.length > 100_000) throw new Error('Filters too large');
  const value = JSON.parse(raw);
  const strings = (items: unknown): items is string[] => Array.isArray(items) && items.length <= 5000 && items.every((item) => typeof item === 'string' && item.length <= 200);
  if (!value || typeof value !== 'object' || !GRID_FILTERS.includes(value.filter) || typeof value.batch !== 'string' || value.batch.length > 200 || !strings(value.tags) || !strings(value.bookmarks)) throw new Error('Invalid filters');
  if (value.screener !== null) {
    const s = value.screener;
    if (!s || !strings(s.scales) || !strings(s.moats) || !Number.isFinite(s.minMargin) || (s.maxCapital !== null && !Number.isFinite(s.maxCapital)) || (s.selectedTags !== undefined && !strings(s.selectedTags))) throw new Error('Invalid screener');
  }
  return value as CatalogFilters;
}

/** IDs eligible for the toolbar's "approve displayed" action. */
export function collectedEntityIds(visibleEntities: readonly ApprovalCandidate[]): string[] {
  return visibleEntities
    .filter((entity) => (entity.tags || []).includes('収集事例'))
    .map((entity) => entity.id);
}
