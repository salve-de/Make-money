import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { gzip as gzipCb, gunzip as gunzipCb } from 'node:zlib';
import type { FinancialEntity } from '@/shared/terminal';
import type {
  CasUpdateResult,
  DossierPointer,
  DossierPointerStore,
} from '@/lib/storage/dossier-pointer-cas';
import { buildD1PointerUpsertSql } from '@/lib/storage/dossier-pointer-cas';
import {
  putR2ObjectCreateOnly,
  readR2Object,
  getFoundationBucket,
  R2ObjectConflictError,
  type FoundationBucketRole,
} from '@/lib/storage/r2';
import { executeD1, queryD1 } from '@/lib/storage/d1';
import {
  computeDossierContentHash,
  getDossierStoragePath,
  stringifyDeterministic,
} from './dossier-projection';

export { stringifyDeterministic } from './dossier-projection';

const gzip = promisify(gzipCb);
const gunzip = promisify(gunzipCb);

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

  // 2. 非圧縮 Canonical JSON の SHA-256（共通関数へ完全一本化）
  const hash = computeDossierContentHash(entity);
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
  let readbackDecompressed: Buffer;
  try {
    readbackDecompressed = await gunzip(readbackObj.body);
  } catch (decompressError) {
    throw new ChecksumMismatchError(
      hash,
      `CORRUPT_GZIP:${(decompressError as Error).message}`
    );
  }

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

/**
 * Cloudflare R2 プロダクション用ブロブストレージアダプター
 */
export class CloudflareR2BlobStorage implements R2BlobStorageClient {
  constructor(private readonly bucketRole: FoundationBucketRole = 'lake') {}

  public async putObject(
    key: string,
    body: Buffer,
    options?: {
      ifNoneMatch?: string;
      contentType?: string;
      contentEncoding?: string;
    }
  ): Promise<{ status: number; etag?: string }> {
    const bucket = getFoundationBucket(this.bucketRole);
    try {
      const res = await putR2ObjectCreateOnly({
        bucket,
        key,
        body: new Uint8Array(body),
        contentType: options?.contentType || 'application/json',
      });
      return { status: res.status === 'CREATED' ? 201 : 200, etag: res.sha256 };
    } catch (err) {
      if (err instanceof R2ObjectConflictError) {
        throw new BlobAlreadyExistsError(key);
      }
      throw err;
    }
  }

  public async getObject(
    key: string
  ): Promise<{ body: Buffer; contentType?: string } | null> {
    const bucket = getFoundationBucket(this.bucketRole);
    const obj = await readR2Object(bucket, key);
    if (!obj) return null;
    return {
      body: Buffer.from(obj.body),
      contentType: obj.contentType || 'application/json',
    };
  }
}

/**
 * Cloudflare D1 プロダクション用ポインタストアアダプター
 */
export class CloudflareD1PointerStore implements DossierPointerStore {
  public async get(entityId: string): Promise<DossierPointer | null> {
    const rows = await queryD1<{
      entity_id: string;
      hash: string;
      source_revision: number;
      updated_at: number;
    }>(
      'SELECT entity_id, hash, source_revision, updated_at FROM dossier_pointers WHERE entity_id = ? LIMIT 1',
      [entityId]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      entityId: r.entity_id,
      hash: r.hash,
      sourceRevision: r.source_revision,
      updatedAt: r.updated_at,
    };
  }

  public async compareAndSwap(newPointer: DossierPointer): Promise<CasUpdateResult> {
    // 1. D1 への条件付きアトミックUPSERT実行（単調増加revisionのみ適用）
    const { sql, params } = buildD1PointerUpsertSql(newPointer);
    const result = await executeD1(sql, params);
    
    if (result.changes > 0) {
      return {
        success: true,
        applied: true,
        current: newPointer,
      };
    }

    // 2. changes === 0 の場合: 再読込して状態を厳密に分類
    const latest = await this.get(newPointer.entityId);
    if (
      latest &&
      latest.sourceRevision === newPointer.sourceRevision &&
      latest.hash === newPointer.hash
    ) {
      // 同一リビジョン・同一ハッシュで既に書き込み完了（冪等成功）
      return { success: true, applied: false, current: latest };
    }
    if (
      latest &&
      latest.sourceRevision === newPointer.sourceRevision &&
      latest.hash !== newPointer.hash
    ) {
      // 同一リビジョンで異なるハッシュが先に書き込まれた（競合）
      return {
        success: false,
        applied: false,
        current: latest,
        conflictReason: 'REVISION_EQUAL_DIFFERENT_HASH',
      };
    }
    return {
      success: false,
      applied: false,
      current: latest,
      conflictReason: 'STALE_REVISION',
    };
  }
}
