import { SECTOR_LABELS } from '@/shared/ui-strings';

/** 傾向画面の分野名。分類のない事例は本文に「未確認」を並べず「分類なし」とする。 */
export const PATTERN_SECTOR_LABELS: Record<string, string> = { ...SECTOR_LABELS, UNKNOWN: '分類なし' };
