import bundled from '../../../data/catalog-release.json';
import { getFoundationBucketAsync, readR2Object } from '@/lib/storage/r2';
import {
  POINTER_KEY,
  createCatalogMembership,
  parseManifest,
  parsePointer,
  type CatalogManifest,
  type CatalogMembership,
} from '@/shared/catalog-manifest';
import { decodeCatalogArtifact, readLocalReleaseFile, runsInWorkers } from './release-store';

/**
 * いま公開している版の目録を、実行時に決める。
 *
 * 1. 手元の開発（Workers 以外）: 公開版の置き場の current.json（`pnpm catalog:prepare` が書く目印）。
 * 2. 本番: R2 の決まった1か所（POINTER_KEY）の目印。`pnpm catalog:publish` が、新しい版を書いて読み戻した後に進める。
 * 3. どちらも読めない時: ビルドに同梱した data/catalog-release.json に戻る（本番が壊れないようにするため）。
 *
 * 目印は数分だけ覚える。デプロイ（ビルド）をしなくても、目印を進めれば数分で新しい版に切り替わる。
 */

/** 目印を覚えておく時間。この間に目印を進めても、まだ前の版が見える。 */
export const POINTER_TTL_MS = 3 * 60 * 1000;
/** 読めなかった時に覚えておく時間（短くして、直ったらすぐ戻る）。 */
const FAILURE_TTL_MS = 30 * 1000;
/** 手元の開発では、目印を進めたらすぐ画面に出したいので短くする。 */
const LOCAL_TTL_MS = 2 * 1000;

export type ManifestSource = 'local' | 'pointer' | 'bundled';
export interface ResolvedManifest {
  manifest: CatalogManifest;
  source: ManifestSource;
  /** 目印が指す manifest の指紋。同梱の版なら null。 */
  manifestHash: string | null;
  membership: CatalogMembership;
}

function resolved(manifest: CatalogManifest, source: ManifestSource, manifestHash: string | null): ResolvedManifest {
  return { manifest, source, manifestHash, membership: createCatalogMembership(manifest.details) };
}

let bundledResolved: ResolvedManifest | undefined;
function bundledManifest(): ResolvedManifest {
  // 同梱の版は最後の砦なので、ここでは検査で落とさない（ビルド時に catalog:check が中身を保証する）
  bundledResolved ??= resolved(bundled as unknown as CatalogManifest, 'bundled', null);
  return bundledResolved;
}

async function loadFromManifestHash(manifestHash: string, manifestKey: string, readBytes: (hash: string, key: string) => Promise<Uint8Array | null>): Promise<CatalogManifest> {
  const bytes = await readBytes(manifestHash, manifestKey);
  if (!bytes) throw new Error('Catalog manifest object is missing');
  return parseManifest(decodeCatalogArtifact(bytes, manifestHash));
}

/** 手元の置き場の目印から。目印が無ければ null。 */
async function resolveLocal(): Promise<ResolvedManifest | null> {
  const pointerBytes = await readLocalReleaseFile('current.json');
  if (!pointerBytes) return null;
  const pointer = parsePointer(JSON.parse(pointerBytes.toString('utf8')) as unknown);
  const manifest = await loadFromManifestHash(pointer.manifestHash, pointer.manifestKey, async (hash) => readLocalReleaseFile(`${hash}.json.gz`));
  return resolved(manifest, 'local', pointer.manifestHash);
}

/** R2 の目印から。目印の置き物が無ければ null（まだ一度も進めていない）。 */
async function resolveFromR2(): Promise<ResolvedManifest | null> {
  const bucket = await getFoundationBucketAsync('lake');
  const object = await readR2Object(bucket, POINTER_KEY);
  if (!object) return null;
  const pointer = parsePointer(JSON.parse(new TextDecoder().decode(object.body)) as unknown);
  const manifest = await loadFromManifestHash(pointer.manifestHash, pointer.manifestKey, async (_hash, key) => (await readR2Object(bucket, key))?.body ?? null);
  return resolved(manifest, 'pointer', pointer.manifestHash);
}

let cache: { value: ResolvedManifest; expiresAt: number } | undefined;
let lastGood: ResolvedManifest | undefined;
let inflight: Promise<ResolvedManifest> | undefined;

async function resolveNow(): Promise<{ value: ResolvedManifest; ttl: number }> {
  if (!runsInWorkers()) {
    try {
      const local = await resolveLocal();
      if (local) return { value: local, ttl: LOCAL_TTL_MS };
    } catch (error) {
      console.warn('[catalog] local release pointer is unreadable; trying the next source', error);
    }
  }
  try {
    const remote = await resolveFromR2();
    if (remote) return { value: remote, ttl: POINTER_TTL_MS };
    return { value: bundledManifest(), ttl: POINTER_TTL_MS };
  } catch (error) {
    // 一時的な不調なら、直前に読めた版を使い続ける。一度も読めていなければ同梱の版
    console.warn('[catalog] release pointer is unreadable; using the previous or bundled release', error);
    return { value: lastGood ?? bundledManifest(), ttl: FAILURE_TTL_MS };
  }
}

/** いま公開している版（目録・版の出どころ・事例の判定）。数分のキャッシュつき。 */
export async function getResolvedManifest(): Promise<ResolvedManifest> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;
  if (!inflight) {
    inflight = resolveNow()
      .then(({ value, ttl }) => {
        cache = { value, expiresAt: Date.now() + ttl };
        if (value.source !== 'bundled') lastGood = value;
        return value;
      })
      .finally(() => { inflight = undefined; });
  }
  return inflight;
}

export async function getCatalogManifest(): Promise<CatalogManifest> {
  return (await getResolvedManifest()).manifest;
}

/** 事例が公開目録にあるかの判定（目印が指す版に従う）。 */
export async function getCatalogMembership(): Promise<CatalogMembership> {
  return (await getResolvedManifest()).membership;
}

/** テスト用: 目印のキャッシュを空にする。 */
export function clearManifestCacheForTest(): void {
  cache = undefined;
  lastGood = undefined;
  inflight = undefined;
}
