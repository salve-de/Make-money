/** 事業の売買の画面で使う、日時と数字入力の整形。副作用のない関数だけを置く。 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function jstParts(iso: string): { date: string; time: string } | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  const shifted = new Date(parsed.getTime() + JST_OFFSET_MS).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

/** 2026-09-29 のような日本時間の日付。読めない値は「—」。 */
export function formatJstDate(iso: string): string {
  return jstParts(iso)?.date ?? '—';
}

/** 2026-09-29 14:05 のような日本時間の日時。読めない値は「—」。 */
export function formatJstDateTime(iso: string): string {
  const parts = jstParts(iso);
  return parts ? `${parts.date} ${parts.time}` : '—';
}

/**
 * 整数の入力欄の読み取り。全角数字・カンマ・空白・末尾の「円」は許す。
 * 空欄は undefined、それ以外の文字（小数点・文字・マイナス）が混ざれば NaN。
 * 「1.5」を黙って「15」にするような桁の取り違えを起こさないため、数字以外は捨てずに無効にする。
 */
export function parseIntegerInput(raw: string): number | undefined {
  const cleaned = raw.normalize('NFKC').replace(/[,\s]/g, '').replace(/円$/, '');
  if (cleaned === '') return undefined;
  return /^\d{1,16}$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}
