import {
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export type FoundationBucketRole = 'raw' | 'lake' | 'restricted' | 'public';

export interface R2ObjectInput {
  bucket: string;
  key: string;
  body: Uint8Array | string;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface R2WriteResult {
  status: 'CREATED' | 'EXISTS_IDENTICAL';
  bucket: string;
  key: string;
  bytes: number;
  sha256: string;
  readback: {
    bytes_match: boolean;
    sha256_match: boolean;
  };
  provider_calls: {
    head_bucket: number;
    get_object: number;
    put_object: number;
  };
}

export interface R2ObjectHead {
  exists: boolean;
  contentLength?: number;
  contentType?: string;
  metadata?: Record<string, string>;
  etag?: string;
  lastModified?: Date;
}

export interface R2ObjectRead extends R2ObjectHead {
  exists: true;
  body: Uint8Array;
}

export interface R2PreflightResult {
  status: 'ABSENT' | 'EXISTS_IDENTICAL' | 'EXISTS_CONFLICT';
  bucket: string;
  key: string;
  bytes: number;
  sha256: string;
}

interface R2Credentials {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class R2ConfigurationError extends Error {
  readonly code = 'R2_NOT_CONFIGURED';

  constructor(message = 'Cloudflare R2 credentials are not configured') {
    super(message);
    this.name = 'R2ConfigurationError';
  }
}

export class R2ObjectConflictError extends Error {
  readonly code = 'R2_OBJECT_CONFLICT';

  constructor(readonly bucket: string, readonly key: string) {
    super(`R2 object already exists with different content: ${bucket}/${key}`);
    this.name = 'R2ObjectConflictError';
  }
}

export class R2BucketMissingError extends Error {
  readonly code = 'R2_BUCKET_MISSING';

  constructor(readonly bucket: string) {
    super(`R2 bucket does not exist or is not reachable: ${bucket}`);
    this.name = 'R2BucketMissingError';
  }
}

export class R2ReadbackVerificationError extends Error {
  readonly code = 'R2_READBACK_MISMATCH';

  constructor(
    readonly bucket: string,
    readonly key: string,
    message: string
  ) {
    super(`R2 read-back verification failed for ${bucket}/${key}: ${message}`);
    this.name = 'R2ReadbackVerificationError';
  }
}

const FOUNDATION_BUCKET_DEFAULTS: Record<FoundationBucketRole, string> = {
  raw: 'foundation-raw',
  lake: 'foundation-lake',
  restricted: 'foundation-restricted',
  public: 'foundation-public',
};

const FOUNDATION_BUCKET_ENV_KEYS: Record<FoundationBucketRole, string> = {
  raw: 'FOUNDATION_R2_RAW_BUCKET',
  lake: 'FOUNDATION_R2_LAKE_BUCKET',
  restricted: 'FOUNDATION_R2_RESTRICTED_BUCKET',
  public: 'FOUNDATION_R2_PUBLIC_BUCKET',
};

function readCredentials(): R2Credentials | null {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return { accountId, accessKeyId, secretAccessKey };
}

export function getFoundationBucket(role: FoundationBucketRole): string {
  const envKey = FOUNDATION_BUCKET_ENV_KEYS[role];
  const bucket = process.env[envKey]?.trim() || FOUNDATION_BUCKET_DEFAULTS[role];
  if (bucket === 'universal') {
    throw new R2ConfigurationError('Legacy universal cannot be a Foundation R2 target');
  }
  return bucket;
}

export function isR2Configured(bucket = getFoundationBucket('lake')): boolean {
  return Boolean(
    readCredentials() &&
      bucket.trim()
  );
}

function requireCredentials(): R2Credentials {
  const credentials = readCredentials();
  if (!credentials) {
    throw new R2ConfigurationError(
      'CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, and CLOUDFLARE_R2_SECRET_ACCESS_KEY are required'
    );
  }
  return credentials;
}

function createR2Client(): S3Client {
  const credentials = requireCredentials();
  return new S3Client({
    region: 'auto',
    endpoint: `https://${credentials.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
}

function toBytes(body: Uint8Array | string): Uint8Array {
  return typeof body === 'string' ? new TextEncoder().encode(body) : body;
}

export async function sha256Hex(body: Uint8Array | string): Promise<string> {
  const bytes = toBytes(body);
  const digestInput = new Uint8Array(bytes.byteLength);
  digestInput.set(bytes);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', digestInput);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function isNotFoundError(error: unknown): boolean {
  const candidate = error as {
    name?: string;
    Code?: string;
    $metadata?: { httpStatusCode?: number };
  };

  return (
    candidate.$metadata?.httpStatusCode === 404 ||
    candidate.name === 'NotFound' ||
    candidate.name === 'NoSuchKey' ||
    candidate.Code === 'NotFound' ||
    candidate.Code === 'NoSuchKey'
  );
}

function isConditionalConflict(error: unknown): boolean {
  const candidate = error as {
    name?: string;
    Code?: string;
    $metadata?: { httpStatusCode?: number };
  };

  return (
    candidate.$metadata?.httpStatusCode === 409 ||
    candidate.$metadata?.httpStatusCode === 412 ||
    candidate.name === 'PreconditionFailed' ||
    candidate.name === 'ConditionalRequestConflict' ||
    candidate.Code === 'PreconditionFailed'
  );
}

export async function assertR2BucketAvailable(bucket: string): Promise<void> {
  const normalizedBucket = bucket.trim();
  if (!normalizedBucket) {
    throw new R2ConfigurationError('An exact R2 bucket name is required');
  }
  if (normalizedBucket === 'universal') {
    throw new R2ConfigurationError('Legacy universal cannot be a Foundation R2 target');
  }

  try {
    await createR2Client().send(new HeadBucketCommand({ Bucket: normalizedBucket }));
  } catch (error) {
    if (isNotFoundError(error)) throw new R2BucketMissingError(normalizedBucket);
    throw error;
  }
}

export async function headR2Object(bucket: string, key: string): Promise<R2ObjectHead> {
  const normalizedBucket = bucket.trim();
  const normalizedKey = key.trim();
  if (!normalizedBucket || !normalizedKey) {
    throw new R2ConfigurationError('An exact R2 bucket and key are required');
  }

  try {
    const response = await createR2Client().send(
      new HeadObjectCommand({ Bucket: normalizedBucket, Key: normalizedKey })
    );
    return {
      exists: true,
      contentLength: response.ContentLength,
      contentType: response.ContentType,
      metadata: response.Metadata,
      etag: response.ETag,
      lastModified: response.LastModified,
    };
  } catch (error) {
    if (isNotFoundError(error)) {
      return { exists: false };
    }
    throw error;
  }
}

export async function readR2Object(bucket: string, key: string): Promise<R2ObjectRead | null> {
  const normalizedBucket = bucket.trim();
  const normalizedKey = key.trim();
  if (!normalizedBucket || !normalizedKey) {
    throw new R2ConfigurationError('An exact R2 bucket and key are required');
  }

  try {
    const response = await createR2Client().send(
      new GetObjectCommand({ Bucket: normalizedBucket, Key: normalizedKey })
    );
    if (!response.Body) {
      throw new R2ReadbackVerificationError(normalizedBucket, normalizedKey, 'object body was empty');
    }
    const body = await response.Body.transformToByteArray();
    return {
      exists: true,
      body,
      contentLength: response.ContentLength,
      contentType: response.ContentType,
      metadata: response.Metadata,
      etag: response.ETag,
      lastModified: response.LastModified,
    };
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

export async function preflightR2Object(input: R2ObjectInput): Promise<R2PreflightResult> {
  const bucket = input.bucket.trim();
  const key = input.key.trim();
  if (!bucket || !key) {
    throw new R2ConfigurationError('An exact R2 bucket and key are required');
  }
  if (bucket === 'universal') {
    throw new R2ConfigurationError('Legacy universal cannot be a Foundation R2 target');
  }

  const body = toBytes(input.body);
  const sha256 = await sha256Hex(body);
  await assertR2BucketAvailable(bucket);

  const existing = await readR2Object(bucket, key);
  if (!existing) {
    return { status: 'ABSENT', bucket, key, bytes: body.byteLength, sha256 };
  }

  const existingSha256 = await sha256Hex(existing.body);
  return {
    status: existingSha256 === sha256 ? 'EXISTS_IDENTICAL' : 'EXISTS_CONFLICT',
    bucket,
    key,
    bytes: body.byteLength,
    sha256,
  };
}

/**
 * Foundationの通常取り込み用。既存キーを上書きせず、新規キーだけ作成する。
 * 同じSHA-256を持つ既存オブジェクトは重複として扱い、別内容の衝突は停止する。
 */
export async function putR2ObjectCreateOnly(input: R2ObjectInput): Promise<R2WriteResult> {
  const bucket = input.bucket.trim();
  const key = input.key.trim();
  if (!bucket || !key) {
    throw new R2ConfigurationError('An exact R2 bucket and key are required');
  }
  if (bucket === 'universal') {
    throw new R2ConfigurationError('Legacy universal cannot be a Foundation R2 target');
  }

  const body = toBytes(input.body);
  const sha256 = await sha256Hex(body);
  const client = createR2Client();

  const preflight = await preflightR2Object(input);
  if (preflight.status === 'EXISTS_IDENTICAL') {
    return {
      status: 'EXISTS_IDENTICAL',
      bucket,
      key,
      bytes: body.byteLength,
      sha256,
      readback: { bytes_match: true, sha256_match: true },
      provider_calls: { head_bucket: 1, get_object: 1, put_object: 0 },
    };
  }
  if (preflight.status === 'EXISTS_CONFLICT') {
    throw new R2ObjectConflictError(bucket, key);
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentLength: body.byteLength,
        ContentType: input.contentType,
        IfNoneMatch: '*',
        Metadata: {
          ...input.metadata,
          'foundation-sha256': sha256,
        },
      })
    );
  } catch (error) {
    if (isConditionalConflict(error)) {
      throw new R2ObjectConflictError(bucket, key);
    }
    throw error;
  }

  const readback = await readR2Object(bucket, key);
  if (!readback) {
    throw new R2ReadbackVerificationError(bucket, key, 'object was not found after PutObject');
  }
  const readbackSha256 = await sha256Hex(readback.body);
  const bytesMatch = readback.body.byteLength === body.byteLength;
  const sha256Match = readbackSha256 === sha256;
  if (!bytesMatch || !sha256Match) {
    throw new R2ReadbackVerificationError(
      bucket,
      key,
      `bytes_match=${bytesMatch}, sha256_match=${sha256Match}`
    );
  }

  return {
    status: 'CREATED',
    bucket,
    key,
    bytes: body.byteLength,
    sha256,
    readback: { bytes_match: bytesMatch, sha256_match: sha256Match },
    provider_calls: { head_bucket: 1, get_object: 2, put_object: 1 },
  };
}

/**
 * 既存の汎用呼び出しとの互換用。未設定時にモック成功を返さない。
 * Foundation取り込みではputR2ObjectCreateOnlyを直接使う。
 */
export async function uploadToR2(
  key: string,
  body: Uint8Array | string,
  contentType = 'application/octet-stream',
  bucket = getFoundationBucket('lake')
): Promise<{ success: boolean; url: string; key: string }> {
  const result = await putR2ObjectCreateOnly({ bucket, key, body, contentType });
  const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN?.trim();
  const url = publicDomain ? `${publicDomain.replace(/\/$/, '')}/${key}` : '';
  return { success: true, url, key: result.key };
}

export async function getFromR2(
  key: string,
  bucket = getFoundationBucket('lake')
): Promise<string | null> {
  const object = await readR2Object(bucket, key);
  return object ? new TextDecoder().decode(object.body) : null;
}
