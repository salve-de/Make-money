import { isEntityIdParam } from './compare-ids';

/** 「これで作る」から /build へ渡す事例IDを検査して読む。形が違えば null（材料にしない）。 */
export function parseBuildCaseParam(value: string | string[] | null | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = raw?.trim();
  return id && isEntityIdParam(id) ? id : null;
}

/** 事例を材料にして作る入口へ。IDの形が不正なら材料なしの入口にする。 */
export function buildHref(entityId: string): string {
  return isEntityIdParam(entityId) ? `/build?case=${encodeURIComponent(entityId)}` : '/build';
}

/** その事例を材料にして事業の案を作る画面（既存の事業検討）。事例は選択済みで開き、できた案には材料の事例IDが残る。 */
export function synthesisHref(entityId: string): string {
  return `/?mode=SYNTHESIS&entity=${encodeURIComponent(entityId)}`;
}
