import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { getFoundationBucketAsync, readR2Object } from '@/lib/storage/r2';

/** 公開目録の中身（要約・詳細）を読めない時の失敗。画面は「目録を読み込めません」と出し、見本データや全件索引には落とさない。 */
export class CatalogUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'CatalogUnavailableError';
  }
}

export function decodeCatalogArtifact(bytes: Uint8Array, expectedHash: string): unknown {
  const json = gunzipSync(bytes, { maxOutputLength: 24 * 1024 * 1024 });
  if (createHash('sha256').update(json).digest('hex') !== expectedHash) throw new Error('Catalog artifact hash mismatch');
  return JSON.parse(json.toString('utf8')) as unknown;
}

export function runsInWorkers(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
}

/** 手元の公開版の置き場（`pnpm catalog:prepare` が作る .catalog-release/）。Workers には無い。 */
export function localReleaseDir(): string | null {
  if (runsInWorkers()) return null;
  return process.env.CATALOG_RELEASE_DIR?.trim() || resolve(process.cwd(), '.catalog-release');
}

/** 手元の置き場の1ファイル（無ければ null）。 */
export async function readLocalReleaseFile(name: string): Promise<Buffer | null> {
  const directory = localReleaseDir();
  if (!directory) return null;
  try {
    return await readFile(resolve(directory, name));
  } catch {
    return null;
  }
}

/** 手元の公開版から読む。Workers では読まない。 */
async function readLocalArtifact(hash: string): Promise<unknown | null> {
  const bytes = await readLocalReleaseFile(`${hash}.json.gz`);
  if (!bytes) return null;
  try {
    return decodeCatalogArtifact(bytes, hash);
  } catch {
    return null;
  }
}

/** 中身の指紋で決まる成果物を、手元の置き場 → R2 の順に読む。指紋が合わなければ失敗する。 */
export async function readStoredArtifact(key: string, hash: string): Promise<unknown> {
  if (!key || !/^[a-f0-9]{64}$/.test(hash)) throw new CatalogUnavailableError('Catalog release has not been prepared');
  const local = await readLocalArtifact(hash);
  if (local !== null) return local;
  try {
    const object = await readR2Object(await getFoundationBucketAsync('lake'), key);
    if (!object) throw new Error('Catalog release object is missing');
    return decodeCatalogArtifact(object.body, hash);
  } catch (error) {
    throw new CatalogUnavailableError('Catalog release is unavailable', { cause: error });
  }
}
