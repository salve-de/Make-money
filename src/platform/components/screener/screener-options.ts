import type { BusinessScale, MoatType } from '../../types/terminal';

/**
 * 絞り込みの選択肢と見出し。PC の左の欄（LedgerFilterRail）とスマホの「絞り込み・検索」（AdvancedScreenerModal）が
 * 同じ条件を同じ名前で出すよう、ここ1か所で持つ。
 */
export const SCREENER_LABELS = {
  scales: '事業の規模',
  margin: '営業利益率の下限',
  capital: '初期資金の上限',
  moats: '事業の参入障壁',
  tags: '事例の特徴',
  multiple: '複数選択可',
  tagSearch: '特徴タグを検索',
  tagClear: '特徴タグをすべて解除',
} as const;

export const SCALE_OPTIONS: readonly { id: BusinessScale; label: string }[] = [
  { id: 'SOLO', label: '一人で運営' },
  { id: 'SMALL_TEAM', label: '2〜10人' },
  { id: 'SCALEUP', label: '11〜100人' },
  { id: 'ENTERPRISE', label: '101人以上' },
];

/** 営業利益率の下限（0 は指定なし） */
export const MARGIN_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 0, label: '指定なし' },
  { value: 30, label: '30%以上' },
  { value: 50, label: '50%以上' },
  { value: 80, label: '80%以上' },
];

/** 初期資金の上限（null は上限なし） */
export const CAPITAL_OPTIONS: readonly { value: number | null; label: string }[] = [
  { value: 0, label: '0円' },
  { value: 1_000_000, label: '100万円以内' },
  { value: null, label: '上限なし' },
];

export const MOAT_OPTIONS: readonly { id: MoatType; label: string }[] = [
  { id: 'COUNTER_POSITIONING', label: '競合と異なる土俵' },
  { id: 'SWITCHING_COST', label: '乗り換えにくさ' },
  { id: 'NETWORK_EFFECT', label: '利用者が増えるほど価値が増す' },
  { id: 'CORNERED_RESOURCE', label: '独自の資源' },
  { id: 'SCALE_ECONOMIES', label: '規模の経済' },
  { id: 'PROCESS_POWER', label: '独自の業務プロセス' },
];

/** 特徴タグの一覧表示。数千件になっても重くならず、探せるようにする（検索は全件が対象）。 */
export const TAG_PREVIEW_COUNT = 10;
export const TAG_MAX_COUNT = 50;

export function pickVisibleTags(input: {
  tags: readonly string[];
  counts: Record<string, number>;
  selected: readonly string[];
  query: string;
  expanded: boolean;
}): { shown: string[]; matched: number; hidden: number } {
  const q = input.query.trim().toLowerCase();
  const matched = input.tags.filter((tag) => tag.toLowerCase().includes(q));
  // 選択中を先頭に、続けて件数の多い順（同数は五十音順）
  const sorted = [...matched].sort((a, b) => {
    const sa = input.selected.includes(a) ? 0 : 1;
    const sb = input.selected.includes(b) ? 0 : 1;
    return sa - sb || (input.counts[b] ?? 0) - (input.counts[a] ?? 0) || a.localeCompare(b, 'ja');
  });
  const limit = q || input.expanded ? TAG_MAX_COUNT : TAG_PREVIEW_COUNT;
  const selectedInMatch = sorted.filter((tag) => input.selected.includes(tag)).length;
  const shown = sorted.slice(0, Math.max(limit, selectedInMatch));
  return { shown, matched: matched.length, hidden: matched.length - shown.length };
}
