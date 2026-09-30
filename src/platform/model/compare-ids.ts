/** 比較できる事例の数。画面の横幅と読みやすさから4件まで。 */
export const COMPARE_LIMIT = 4;

const ENTITY_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;

/** `?ids=a,b,c` を、重複と不正な値を除いた最大4件の配列にする。 */
export function parseCompareIds(value: string | null | undefined): string[] {
  if (!value) return [];
  const ids: string[] = [];
  for (const part of value.split(',')) {
    const id = part.trim();
    if (ENTITY_ID.test(id) && !ids.includes(id)) ids.push(id);
    if (ids.length >= COMPARE_LIMIT) break;
  }
  return ids;
}

export function compareHref(ids: readonly string[]): string {
  return ids.length > 0 ? `/compare?ids=${ids.map(encodeURIComponent).join(',')}` : '/compare';
}
