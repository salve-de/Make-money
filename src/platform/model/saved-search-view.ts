import type { CatalogFilters } from './entity-filter';

const FILTER_LABELS: Record<string, string> = {
  SOLO: '一人で運営',
  HIGH_MARGIN: '営業利益率50%以上',
  ZERO_CAPITAL: '初期資金0円',
  MONOPOLY: '大企業',
  AI_NATIVE: 'AI・自動化',
};
const SCALE_LABELS: Record<string, string> = { SOLO: '一人で運営', SMALL_TEAM: '2〜10人', SCALEUP: '11〜100人', ENTERPRISE: '101人以上' };
const MOAT_LABELS: Record<string, string> = {
  COUNTER_POSITIONING: '競合と異なる土俵',
  SWITCHING_COST: '乗り換えにくさ',
  NETWORK_EFFECT: '利用者が増えるほど価値増',
  CORNERED_RESOURCE: '独自の資源',
  SCALE_ECONOMIES: '規模の経済',
  PROCESS_POWER: '独自の業務プロセス',
};

type SearchCondition = { query: string; filters: Pick<CatalogFilters, 'filter' | 'batch' | 'tags' | 'screener'> };

/** 保存できる条件があるか。保存した事例（BOOKMARKED）は条件ではないので保存しない。 */
export function hasSavableCondition({ query, filters }: SearchCondition): boolean {
  if (filters.filter === 'BOOKMARKED') return false;
  return Boolean(query.trim()) || filters.filter !== 'ALL' || filters.batch !== 'ALL' || filters.tags.length > 0 || Boolean(filters.screener);
}

/** 条件を短い日本語の並びにする（例: 検索「AI」・一人で運営・タグ: 新着・利益率50%以上）。 */
export function describeSearchCondition({ query, filters }: SearchCondition): string[] {
  const parts: string[] = [];
  if (query.trim()) parts.push(`検索「${query.trim()}」`);
  if (FILTER_LABELS[filters.filter]) parts.push(FILTER_LABELS[filters.filter]);
  if (filters.batch !== 'ALL') parts.push('登録回で絞り込み');
  if (filters.tags.length > 0) parts.push(`タグ: ${filters.tags.join('・')}`);
  const screener = filters.screener;
  if (screener) {
    if (screener.scales.length > 0) parts.push(`規模: ${screener.scales.map((scale) => SCALE_LABELS[scale] ?? scale).join('・')}`);
    if (screener.minMargin > 0) parts.push(`営業利益率${screener.minMargin}%以上`);
    if (screener.maxCapital !== null) parts.push(screener.maxCapital <= 0 ? '初期資金0円' : `初期資金${Math.round(screener.maxCapital / 10_000).toLocaleString('ja-JP')}万円以内`);
    if (screener.moats.length > 0) parts.push(`強み: ${screener.moats.map((moat) => MOAT_LABELS[moat] ?? moat).join('・')}`);
    if (screener.selectedTags?.length) parts.push(`タグ: ${screener.selectedTags.join('・')}`);
  }
  return parts;
}

/**
 * 一覧の見出しに出す条件の要約。検索語・絞り込み・保存した事例の表示を、いま画面に効いている状態からそのまま作る。
 * 保存条件の名前とは違い、保存した事例の表示（BOOKMARKED）も条件として含める。何も効いていなければ空の配列。
 */
export function describeLedgerCondition(condition: SearchCondition): string[] {
  const parts = describeSearchCondition(condition);
  if (condition.filters.filter === 'BOOKMARKED') parts.unshift('保存した事例');
  return parts;
}

/** 名前の初期値。条件の並びをつなげて60文字に収める。 */
export function defaultSavedSearchName(condition: SearchCondition): string {
  const text = describeSearchCondition(condition).join('・') || '保存した条件';
  return text.length > 60 ? `${text.slice(0, 59)}…` : text;
}
