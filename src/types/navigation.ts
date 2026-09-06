export const MAIN_VIEW_TYPES = [
  'PORTAL',
  'FINDER',
  'IDEAS_VAULT',
  'TERMINAL',
  'COLLECTIONS_LIST',
  'COLLECTION_DETAIL',
  'SIGNALS_LIST',
  'SIGNAL_DETAIL',
  'LEADERBOARD',
] as const;

export type MainViewType = (typeof MAIN_VIEW_TYPES)[number];

export function parseMainView(value: string | null): MainViewType {
  const normalized = value?.toUpperCase() ?? '';
  return MAIN_VIEW_TYPES.includes(normalized as MainViewType)
    ? (normalized as MainViewType)
    : 'PORTAL';
}
