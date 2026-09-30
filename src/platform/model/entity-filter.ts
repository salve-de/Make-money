import type { FinancialEntity, GridFilterOption } from '@/shared/terminal';

/** Minimal input contract: no React, network, modal or storage dependency. */
export type FilterCandidate = Pick<FinancialEntity, 'id' | 'scale' | 'sector' | 'sectorBasis'> & {
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
  // 業種は SEC の標準産業分類が根拠の時だけ使う（キーワードからの推測では絞り込まない）
  AI_NATIVE: (entity) => entity.sectorBasis?.source === 'SEC_SIC' && entity.sector === 'AI_AUTOMATION',
  BOOKMARKED: (entity, bookmarks) => bookmarks.has(entity.id),
};

export const GRID_FILTERS = Object.keys(predicates) as GridFilterOption[];

export function parseGridFilter(value: string | null | undefined): GridFilterOption {
  return GRID_FILTERS.find((filter) => filter === value) ?? 'ALL';
}

type ScreenerQuery = NonNullable<CatalogFilters['screener']>;

/** `?tags=a,b` を最大50件・各200文字までの重複なしの配列にする。 */
function parseTagsParam(value: string | null | undefined): string[] {
  if (!value) return [];
  const tags: string[] = [];
  for (const part of value.split(',')) {
    const tag = part.trim();
    if (tag && tag.length <= 200 && !tags.includes(tag)) tags.push(tag);
    if (tags.length >= 50) break;
  }
  return tags;
}

/** `?screener={...}` を検証して読む。形が違えば条件なし（null）として扱う。 */
function parseScreenerParam(value: string | null | undefined): ScreenerQuery | null {
  if (!value || value.length > 5000) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const s = parsed as Record<string, unknown>;
    const strings = (items: unknown): items is string[] => Array.isArray(items) && items.length <= 50 && items.every((item) => typeof item === 'string' && item.length <= 200);
    if (!strings(s.scales) || !strings(s.moats) || typeof s.minMargin !== 'number' || !Number.isFinite(s.minMargin)) return null;
    if (s.maxCapital !== null && (typeof s.maxCapital !== 'number' || !Number.isFinite(s.maxCapital))) return null;
    if (s.selectedTags !== undefined && !strings(s.selectedTags)) return null;
    return { scales: s.scales, minMargin: s.minMargin, maxCapital: s.maxCapital as number | null, moats: s.moats, ...(s.selectedTags ? { selectedTags: s.selectedTags } : {}) };
  } catch {
    return null;
  }
}

export function readEntityFilterQuery(params: Pick<URLSearchParams, 'get'> | null) {
  return {
    filter: parseGridFilter(params?.get('filter')),
    batch: params?.get('batch') || 'ALL',
    tags: parseTagsParam(params?.get('tags')),
    screener: parseScreenerParam(params?.get('screener')),
  };
}

/** 検索語と絞り込みを、一覧で同じ条件を開くURLにする（既定値は省く）。保存した条件を開くときに使う。 */
export function catalogQueryHref(query: string, filters: Pick<CatalogFilters, 'filter' | 'batch' | 'tags' | 'screener'>): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (filters.filter !== 'ALL' && filters.filter !== 'BOOKMARKED') params.set('filter', filters.filter);
  if (filters.batch !== 'ALL') params.set('batch', filters.batch);
  if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
  if (filters.screener) params.set('screener', JSON.stringify(filters.screener));
  const text = params.toString();
  return text ? `/?${text}` : '/';
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
