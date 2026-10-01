/**
 * 公開目録の門（1か所）。
 *
 * 画面と API に出してよい事例は、公開目録 data/catalog-release.json の details に入っている事例だけ。
 * 本番でも手元の開発画面でも、どのワークツリー・ブランチでも同じ判定にするため、環境変数や実行場所の分岐は入れない。
 * node 専用の import を持たないので、サーバーとブラウザの両方から使える。
 */
import manifest from '../../data/catalog-release.json';

const details: Record<string, string> = manifest.details;

const canonicalById = new Map<string, string>(Object.keys(details).map((id) => [id.toLowerCase(), id]));

function key(id: unknown): string {
  return typeof id === 'string' ? id.trim().toLowerCase() : '';
}

/** 目録にある事例の ID か（大文字小文字は区別しない）。 */
export function isCatalogId(id: unknown): boolean {
  const normalized = key(id);
  return normalized.length > 0 && canonicalById.has(normalized);
}

/** 目録にある事例の ID（正式な綴り）。 */
export function catalogIds(): string[] {
  return Object.keys(details);
}

/** 目録の正式な綴りの ID。目録に無ければ undefined。 */
export function canonicalCatalogId(id: unknown): string | undefined {
  return canonicalById.get(key(id));
}

/** 行のうち、目録にある事例だけを残す。 */
export function filterToCatalog<T extends { id: string }>(rows: readonly T[]): T[] {
  return rows.filter((row) => isCatalogId(row.id));
}

/** 目録にある事例の詳細ハッシュ。目録に無ければ undefined。 */
export function catalogDetailHash(id: unknown): string | undefined {
  const canonical = canonicalCatalogId(id);
  return canonical ? details[canonical] : undefined;
}
