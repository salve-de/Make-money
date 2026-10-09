import type { BusinessScale, MoatType } from '../../types/terminal';
import { AXES, axisOfWord } from '@/shared/case-taxonomy';

/**
 * 絞り込みの選択肢と見出し。PC の左の欄（LedgerFilterRail）とスマホの「絞り込み・検索」（AdvancedScreenerModal）が
 * 同じ条件を同じ名前で出すよう、ここ1か所で持つ。
 */
export const SCREENER_LABELS = {
  scales: '事業の規模',
  margin: '営業利益率の下限',
  capital: '初期資金の上限',
  moats: '事業の参入障壁',
  multiple: '複数選択可',
  tagClear: '選んだタグをすべて解除',
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

/**
 * タグの絞り込みは、決まった言葉の一覧（src/shared/case-taxonomy.ts）を軸ごと（分野・事業の形・売る相手・特徴）に並べる。
 * 同じ軸の中で複数選んだら「どれか」、軸をまたいだら「全部」。
 */
export const TAG_AXES = AXES.map((axis) => ({ id: axis.id, label: axis.label, words: axis.terms.map((t) => t.word) }));

/** その言葉を選んだ時の件数を数えるための選択: 同じ軸で選んでいる言葉は外し、この言葉だけを足す（ほかの軸はそのまま）。 */
export function selectionWithOnly(selected: readonly string[], word: string): string[] {
  const axis = axisOfWord(word);
  return [...selected.filter((tag) => axisOfWord(tag) !== axis), word];
}
