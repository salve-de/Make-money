/**
 * 公開版の目録（manifest）と「いま公開している版の目印」（pointer）の形。
 *
 * - manifest: どの事例がどの詳細（指紋）で公開されているか、一覧・探索の成果物はどれか。中身の指紋で置き場所が決まり、書き換えない。
 * - pointer: 「いま公開している manifest はこれ」を指す1枚。R2 の決まった1か所に置き、これだけを書き換える。
 *   書き換えのたびに、いつ・どの版から・どの版へを pointer-log に1件ずつ残す（消さない）。
 * node 専用の import を持たないので、サーバー・スクリプト・テストのどこからでも使える。
 */

export const CATALOG_PREFIX = 'views/make-money/catalog-v1/';
/** いま公開している版の目印。ここだけを書き換えてよい（ETag つきの上書き）。 */
export const POINTER_KEY = `${CATALOG_PREFIX}current.json`;
/** 書き換えの記録（1回につき1件、新規作成のみ）。 */
export const POINTER_LOG_PREFIX = `${CATALOG_PREFIX}pointer-log/`;
const MANIFEST_PREFIX = `${CATALOG_PREFIX}manifests/`;

export function manifestObjectKey(manifestHash: string): string {
  return `${MANIFEST_PREFIX}${manifestHash}.json.gz`;
}

const HASH = /^[a-f0-9]{64}$/;

export interface ArtifactRef {
  hash: string;
  key: string;
}

export interface CatalogManifest {
  version: 1;
  sourceHash: string;
  sourceCount: number;
  publishedCount: number;
  summaries: ArtifactRef;
  discovery: ArtifactRef;
  details: Record<string, string>;
  /** 画面用の編集文を除いた中身の指紋（公開版を作る時の「引き継ぎ」の照合用。画面は読まない）。 */
  coreDetails?: Record<string, string>;
  approvalCandidateIds: string[];
}

export interface ReleasePointer {
  version: 1;
  manifestHash: string;
  manifestKey: string;
  publishedCount: number;
  updatedAt: string;
  /** 1つ前の版。初めての設定なら null。 */
  previous: { manifestHash: string; updatedAt: string } | null;
}

export interface PointerLogEntry {
  version: 1;
  at: string;
  from: string | null;
  to: string;
  publishedCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isArtifactRef(value: unknown): value is ArtifactRef {
  return isRecord(value) && typeof value.hash === 'string' && HASH.test(value.hash) && typeof value.key === 'string' && value.key.length > 0;
}

/** 目録として最低限そろっているか。壊れた目録は使わず、呼び出し側が同梱の版に戻る。 */
export function parseManifest(value: unknown): CatalogManifest {
  if (!isRecord(value) || value.version !== 1
    || !Number.isInteger(value.sourceCount) || !Number.isInteger(value.publishedCount)
    || !isArtifactRef(value.summaries) || !isArtifactRef(value.discovery)
    || !isRecord(value.details) || !Array.isArray(value.approvalCandidateIds)) {
    throw new Error('Invalid catalog manifest');
  }
  const details = value.details;
  const ids = Object.keys(details);
  if (ids.length !== value.publishedCount || !ids.every((id) => typeof details[id] === 'string' && HASH.test(details[id] as string))) {
    throw new Error('Invalid catalog manifest details');
  }
  if (!value.approvalCandidateIds.every((id) => typeof id === 'string')) throw new Error('Invalid catalog manifest candidates');
  return value as unknown as CatalogManifest;
}

export function parsePointer(value: unknown): ReleasePointer {
  if (!isRecord(value) || value.version !== 1
    || typeof value.manifestHash !== 'string' || !HASH.test(value.manifestHash)
    || value.manifestKey !== manifestObjectKey(value.manifestHash)
    || !Number.isInteger(value.publishedCount)
    || typeof value.updatedAt !== 'string') {
    throw new Error('Invalid release pointer');
  }
  const previous = value.previous;
  if (previous !== null && !(isRecord(previous) && typeof previous.manifestHash === 'string' && typeof previous.updatedAt === 'string')) {
    throw new Error('Invalid release pointer previous');
  }
  return value as unknown as ReleasePointer;
}

/** 目録に載っている事例の判定（大文字小文字は区別しない）。 */
export interface CatalogMembership {
  isCatalogId(id: unknown): boolean;
  catalogIds(): string[];
  canonicalCatalogId(id: unknown): string | undefined;
  filterToCatalog<T extends { id: string }>(rows: readonly T[]): T[];
  catalogDetailHash(id: unknown): string | undefined;
}

export function createCatalogMembership(details: Record<string, string>): CatalogMembership {
  const canonicalById = new Map<string, string>(Object.keys(details).map((id) => [id.toLowerCase(), id]));
  const key = (id: unknown) => (typeof id === 'string' ? id.trim().toLowerCase() : '');
  const canonical = (id: unknown) => canonicalById.get(key(id));
  return {
    isCatalogId: (id) => key(id).length > 0 && canonicalById.has(key(id)),
    catalogIds: () => Object.keys(details),
    canonicalCatalogId: canonical,
    filterToCatalog: (rows) => rows.filter((row) => canonicalById.has(key(row.id))),
    catalogDetailHash: (id) => {
      const found = canonical(id);
      return found ? details[found] : undefined;
    },
  };
}
