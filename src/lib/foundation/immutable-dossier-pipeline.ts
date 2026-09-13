import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { gzip as gzipCb, gunzip as gunzipCb } from 'node:zlib';
import type { FinancialEntity } from '@/shared/terminal';
import type {
  CasUpdateResult,
  DossierPointerStore,
} from '@/lib/storage/dossier-pointer-cas';
import { getDossierStoragePath } from './dossier-projection';

const gzip = promisify(gzipCb);
const gunzip = promisify(gunzipCb);

/**
 * 決定論的 Canonical JSON 文字列化（キー再帰ソート）
 */
export function stringifyDeterministic(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => stringifyDeterministic(item));
    return `[${items.join(',')}]`;
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stringifyDeterministic(obj[k])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * R2 / S3 互換ブロブストレージクライアント型
 */
export interface R2BlobStorageClient {
  putObject(
    key: string,
    body: Buffer,
    options?: {
      ifNoneMatch?: string;
      contentType?: string;
      contentEncoding?: string;
    }
  ): Promise<{ status: number; etag?: string }>;

  getObject(key: string): Promise<{ body: Buffer; contentType?: string } | null>;
}

export class BlobAlreadyExistsError extends Error {
  readonly code = 'BLOB_ALREADY_EXISTS';
  constructor(key: string) {
    super(`Blob already exists at ${key} (If-None-Match condition triggered).`);
    this.name = 'BlobAlreadyExistsError';
  }
}

export class ChecksumMismatchError extends Error {
  readonly code = 'CHECKSUM_MISMATCH';
  constructor(expected: string, actual: string) {
    super(`Readback checksum mismatch: expected ${expected}, got ${actual}`);
    this.name = 'ChecksumMismatchError';
  }
}

/**
 * インメモリ R2 モックストレージ（テスト用）
 */
export class MemoryR2BlobStorage implements R2BlobStorageClient {
  public store = new Map<string, Buffer>();

  public async putObject(
    key: string,
    body: Buffer,
    options?: { ifNoneMatch?: string }
  ): Promise<{ status: number; etag?: string }> {
    if (options?.ifNoneMatch === '*' && this.store.has(key)) {
      throw new BlobAlreadyExistsError(key);
    }
    this.store.set(key, Buffer.from(body));
    return { status: 200, etag: `etag_${Date.now()}` };
  }

  public async getObject(
    key: string
  ): Promise<{ body: Buffer; contentType?: string } | null> {
    const data = this.store.get(key);
    if (!data) return null;
    return { body: Buffer.from(data), contentType: 'application/json' };
  }
}

export interface StoreDossierResult {
  hash: string;
  storagePath: string;
  uncompressedBytes: number;
  compressedBytes: number;
  isNewBlob: boolean;
  casResult: CasUpdateResult;
}

/**
 * イミュータブルDossier保存 ＆ Readback自己検証パイプライン
 * 
 * 7つの不可逆ステップ:
 * 1. Canonical JSON 化（キーソート決定論的JSON）
 * 2. 非圧縮 Canonical JSON の SHA-256 計算
 * 3. gzip 圧縮
 * 4. R2 PUT（If-None-Match: * による CAS 保存）
 * 5. GET readback
 * 6. decompress ＆ SHA-256 再検証（破損・サイレントコラプション完全排除）
 * 7. 成功後のみ Pointer CAS 更新
 */
export async function storeImmutableDossierWithReadback(
  entity: FinancialEntity,
  storage: R2BlobStorageClient,
  pointerStore: DossierPointerStore
): Promise<StoreDossierResult> {
  // 1. Canonical JSON 文字列化
  const canonicalJson = stringifyDeterministic(entity);
  const uncompressedBuffer = Buffer.from(canonicalJson, 'utf8');

  // 2. 非圧縮 Canonical JSON の SHA-256
  const hash = createHash('sha256').update(uncompressedBuffer).digest('hex');
  const storagePath = getDossierStoragePath(entity.id, hash);

  // 3. gzip 圧縮
  const compressedBuffer = await gzip(uncompressedBuffer);

  // 4. R2 PUT（If-None-Match: *）
  let isNewBlob = false;
  try {
    await storage.putObject(storagePath, compressedBuffer, {
      ifNoneMatch: '*',
      contentType: 'application/json',
      contentEncoding: 'gzip',
    });
    isNewBlob = true;
  } catch (error) {
    if (error instanceof BlobAlreadyExistsError) {
      // CASストレージのため、同一ハッシュが既に存在していれば正常（冪等）
      isNewBlob = false;
    } else {
      throw error;
    }
  }

  // 5. GET readback
  const readbackObj = await storage.getObject(storagePath);
  if (!readbackObj) {
    throw new Error(`Readback failed: object not found at ${storagePath}`);
  }

  // 6. decompress ＆ SHA-256 再検証
  const readbackDecompressed = await gunzip(readbackObj.body);
  const readbackHash = createHash('sha256').update(readbackDecompressed).digest('hex');
  if (readbackHash !== hash) {
    throw new ChecksumMismatchError(hash, readbackHash);
  }

  // 7. 成功後のみ pointer CAS 更新
  const revision = entity.sourceRevision ?? 1;
  const casResult = await pointerStore.compareAndSwap({
    entityId: entity.id,
    hash,
    sourceRevision: revision,
    updatedAt: Date.now(),
  });

  return {
    hash,
    storagePath,
    uncompressedBytes: uncompressedBuffer.length,
    compressedBytes: compressedBuffer.length,
    isNewBlob,
    casResult,
  };
}
