import {
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getCloudflareRuntimeEnv, getRuntimeEnvValue } from '../runtime/cloudflare';

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

export interface R2ListObject {
  key: string;
  size?: number;
  etag?: string;
  lastModified?: Date;
}

export interface R2ListResult {
  objects: R2ListObject[];
  truncated: boolean;
  cursor?: string;
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

const FOUNDATION_BUCKET_BINDING_NAMES: Record<FoundationBucketRole, string> = {
  raw: 'FOUNDATION_R2_RAW',
  lake: 'FOUNDATION_R2_LAKE',
  restricted: 'FOUNDATION_R2_RESTRICTED',
  public: 'FOUNDATION_R2_PUBLIC',
};

interface R2WorkerObject {
  size?: number;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
  httpEtag?: string;
  etag?: string;
  uploaded?: Date;
  body?: ReadableStream<Uint8Array>;
  arrayBuffer?: () => Promise<ArrayBuffer>;
}

export interface R2ByteRange {
  offset: number;
  length: number;
}

interface R2WorkerListObject {
  key?: string;
  size?: number;
  etag?: string;
  httpEtag?: string;
  uploaded?: Date;
}

interface R2WorkerListResult {
  objects?: R2WorkerListObject[];
  truncated?: boolean;
  cursor?: string;
}

interface R2WorkerBinding {
  head(key: string): Promise<R2WorkerObject | null>;
  get(key: string, options?: { range?: R2ByteRange }): Promise<R2WorkerObject | null>;
  put(
    key: string,
    value: Uint8Array,
    options?: {
      onlyIf?: { etagDoesNotMatch?: string };
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    }
  ): Promise<R2WorkerObject | null>;
  list(options?: { limit?: number; prefix?: string; cursor?: string }): Promise<unknown>;
}

type R2Backend =
  | { kind: 'binding'; binding: R2WorkerBinding }
  | { kind: 's3'; client: S3Client };

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

/** Resolve a configured Foundation bucket after the Worker request context exists. */
export async function getFoundationBucketAsync(role: FoundationBucketRole): Promise<string> {
  const envKey = FOUNDATION_BUCKET_ENV_KEYS[role];
  const bucket = await getRuntimeEnvValue(envKey, { runtimeFirst: true }) || FOUNDATION_BUCKET_DEFAULTS[role];
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

/**
 * S3資格情報またはCloudflare WorkerのR2 bindingが使えるかを確認する。
 * バケットの実在確認は行わないため、Put前には必ずpreflightを通す。
 */
export async function isR2ConfiguredAsync(
  bucket = getFoundationBucket('lake')
): Promise<boolean> {
  return Boolean((await getR2BindingForBucket(bucket)) || readCredentials());
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

function isR2WorkerBinding(value: unknown): value is R2WorkerBinding {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<R2WorkerBinding>;
  return (
    typeof candidate.head === 'function' &&
    typeof candidate.get === 'function' &&
    typeof candidate.put === 'function' &&
    typeof candidate.list === 'function'
  );
}

async function getR2BindingForBucket(bucket: string): Promise<R2WorkerBinding | null> {
  const roles = Object.keys(FOUNDATION_BUCKET_DEFAULTS) as FoundationBucketRole[];
  const resolvedRoles = await Promise.all(roles.map(async (candidateRole) => ({
    role: candidateRole,
    bucket: await getFoundationBucketAsync(candidateRole),
  })));
  const role = resolvedRoles.find((candidate) => candidate.bucket === bucket)?.role;
  const runtimeEnv = await getCloudflareRuntimeEnv();
  const appBucket = await getRuntimeEnvValue('APP_R2_BUCKET');
  const binding = bucket === appBucket ? runtimeEnv?.APP_R2 : role ? runtimeEnv?.[FOUNDATION_BUCKET_BINDING_NAMES[role]] : null;
  return isR2WorkerBinding(binding) ? binding : null;
}

async function resolveR2Backend(bucket: string): Promise<R2Backend> {
  const binding = await getR2BindingForBucket(bucket);
  return binding
    ? { kind: 'binding', binding }
    : { kind: 's3', client: createR2Client() };
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
    status?: number;
    $metadata?: { httpStatusCode?: number };
  };

  return (
    candidate.status === 412 ||
    candidate.$metadata?.httpStatusCode === 409 ||
    candidate.$metadata?.httpStatusCode === 412 ||
    candidate.name === 'PreconditionFailed' ||
    candidate.name === 'ConditionalRequestConflict' ||
    candidate.Code === 'PreconditionFailed'
  );
}

function workerObjectToHead(
  object: R2WorkerObject
): Omit<R2ObjectHead, 'exists'> & { exists: true } {
  return {
    exists: true,
    contentLength: object.size,
    contentType: object.httpMetadata?.contentType,
    metadata: object.customMetadata,
    etag: object.httpEtag || object.etag,
    lastModified: object.uploaded,
  };
}

async function readWorkerObject(
  binding: R2WorkerBinding,
  bucket: string,
  key: string,
  range?: R2ByteRange
): Promise<R2ObjectRead | null> {
  const response = await binding.get(key, range ? { range } : undefined);
  if (!response) return null;

  let body: Uint8Array;
  if (response.arrayBuffer) {
    body = new Uint8Array(await response.arrayBuffer());
  } else if (response.body) {
    body = new Uint8Array(await new Response(response.body).arrayBuffer());
  } else {
    throw new R2ReadbackVerificationError(bucket, key, 'object body was empty');
  }

  return { ...workerObjectToHead(response), body };
}

async function assertR2BucketAvailableWithBackend(
  bucket: string,
  backend: R2Backend
): Promise<void> {
  if (backend.kind === 'binding') {
    try {
      await backend.binding.list({ limit: 1 });
    } catch (error) {
      if (isNotFoundError(error)) throw new R2BucketMissingError(bucket);
      throw error;
    }
    return;
  }

  try {
    await backend.client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (isNotFoundError(error)) throw new R2BucketMissingError(bucket);
    throw error;
  }
}

async function readR2ObjectWithBackend(
  bucket: string,
  key: string,
  backend: R2Backend,
  range?: R2ByteRange
): Promise<R2ObjectRead | null> {
  if (backend.kind === 'binding') {
    try {
      return await readWorkerObject(backend.binding, bucket, key, range);
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  }

  try {
    const response = await backend.client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ...(range
          ? { Range: `bytes=${range.offset}-${range.offset + range.length - 1}` }
          : {}),
      })
    );
    if (!response.Body) {
      throw new R2ReadbackVerificationError(bucket, key, 'object body was empty');
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

export async function assertR2BucketAvailable(bucket: string): Promise<void> {
  const normalizedBucket = bucket.trim();
  if (!normalizedBucket) {
    throw new R2ConfigurationError('An exact R2 bucket name is required');
  }
  if (normalizedBucket === 'universal') {
    throw new R2ConfigurationError('Legacy universal cannot be a Foundation R2 target');
  }

  const backend = await resolveR2Backend(normalizedBucket);
  await assertR2BucketAvailableWithBackend(normalizedBucket, backend);
}

export async function headR2Object(bucket: string, key: string): Promise<R2ObjectHead> {
  const normalizedBucket = bucket.trim();
  const normalizedKey = key.trim();
  if (!normalizedBucket || !normalizedKey) {
    throw new R2ConfigurationError('An exact R2 bucket and key are required');
  }

  const backend = await resolveR2Backend(normalizedBucket);
  if (backend.kind === 'binding') {
    try {
      const response = await backend.binding.head(normalizedKey);
      return response ? workerObjectToHead(response) : { exists: false };
    } catch (error) {
      if (isNotFoundError(error)) return { exists: false };
      throw error;
    }
  }

  try {
    const response = await backend.client.send(
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
    if (isNotFoundError(error)) return { exists: false };
    throw error;
  }
}

export async function readR2Object(bucket: string, key: string): Promise<R2ObjectRead | null> {
  const normalizedBucket = bucket.trim();
  const normalizedKey = key.trim();
  if (!normalizedBucket || !normalizedKey) {
    throw new R2ConfigurationError('An exact R2 bucket and key are required');
  }

  const backend = await resolveR2Backend(normalizedBucket);
  return readR2ObjectWithBackend(normalizedBucket, normalizedKey, backend);
}

/**
 * Read a byte range from an existing object. This is a read-only optimization
 * for locating records inside immutable Foundation bundles.
 */
export async function readR2ObjectRange(
  bucket: string,
  key: string,
  range: R2ByteRange
): Promise<R2ObjectRead | null> {
  const normalizedBucket = bucket.trim();
  const normalizedKey = key.trim();
  if (
    !normalizedBucket ||
    !normalizedKey ||
    !Number.isInteger(range.offset) ||
    range.offset < 0 ||
    !Number.isInteger(range.length) ||
    range.length < 1
  ) {
    throw new R2ConfigurationError('An exact R2 bucket, key, and valid byte range are required');
  }

  const backend = await resolveR2Backend(normalizedBucket);
  return readR2ObjectWithBackend(normalizedBucket, normalizedKey, backend, range);
}

function normalizeListObject(value: unknown): R2ListObject | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as R2WorkerListObject;
  if (typeof candidate.key !== 'string' || !candidate.key.trim()) return null;
  return {
    key: candidate.key,
    ...(typeof candidate.size === 'number' ? { size: candidate.size } : {}),
    ...(typeof candidate.etag === 'string' || typeof candidate.httpEtag === 'string'
      ? { etag: candidate.httpEtag || candidate.etag }
      : {}),
    ...(candidate.uploaded instanceof Date ? { lastModified: candidate.uploaded } : {}),
  };
}

/**
 * List an existing Foundation prefix without creating an index or changing
 * the R2 layout. Callers must continue while `truncated` is true; an R2 list
 * response may contain fewer objects than the requested limit.
 */
export async function listR2Objects(input: {
  bucket?: string;
  prefix?: string;
  cursor?: string;
  limit?: number;
} = {}): Promise<R2ListResult> {
  const bucket = (input.bucket || getFoundationBucket('lake')).trim();
  const prefix = input.prefix?.trim() || '';
  const limit = Math.min(Math.max(1, Math.floor(input.limit ?? 100)), 1000);

  if (!bucket) throw new R2ConfigurationError('An exact R2 bucket is required');
  if (bucket === 'universal') {
    throw new R2ConfigurationError('Legacy universal cannot be a Foundation R2 target');
  }

  const backend = await resolveR2Backend(bucket);
  if (backend.kind === 'binding') {
    try {
      const raw = (await backend.binding.list({
        limit,
        ...(prefix ? { prefix } : {}),
        ...(input.cursor ? { cursor: input.cursor } : {}),
      })) as R2WorkerListResult;
      const objects = Array.isArray(raw?.objects)
        ? raw.objects
            .map(normalizeListObject)
            .filter((item): item is R2ListObject => Boolean(item))
        : [];
      return {
        objects,
        truncated: raw?.truncated === true,
        ...(typeof raw?.cursor === 'string' && raw.cursor ? { cursor: raw.cursor } : {}),
      };
    } catch (error) {
      if (isNotFoundError(error)) throw new R2BucketMissingError(bucket);
      throw error;
    }
  }

  try {
    const response = await backend.client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ...(prefix ? { Prefix: prefix } : {}),
        ...(input.cursor ? { ContinuationToken: input.cursor } : {}),
        MaxKeys: limit,
      })
    );
    const objects = (response.Contents || [])
      .map((item) =>
        normalizeListObject({
          key: item.Key,
          size: item.Size,
          etag: item.ETag,
          uploaded: item.LastModified,
        })
      )
      .filter((item): item is R2ListObject => Boolean(item));
    return {
      objects,
      truncated: response.IsTruncated === true,
      ...(response.NextContinuationToken ? { cursor: response.NextContinuationToken } : {}),
    };
  } catch (error) {
    if (isNotFoundError(error)) throw new R2BucketMissingError(bucket);
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
  const backend = await resolveR2Backend(bucket);
  await assertR2BucketAvailableWithBackend(bucket, backend);

  const existing = await readR2ObjectWithBackend(bucket, key, backend);
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
  const backend = await resolveR2Backend(bucket);

  const preflight = await (async (): Promise<R2PreflightResult> => {
    await assertR2BucketAvailableWithBackend(bucket, backend);
    const existing = await readR2ObjectWithBackend(bucket, key, backend);
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
  })();
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

  if (backend.kind === 'binding') {
    try {
      const result = await backend.binding.put(key, body, {
        onlyIf: { etagDoesNotMatch: '*' },
        httpMetadata: { contentType: input.contentType },
        customMetadata: {
          ...input.metadata,
          'foundation-sha256': sha256,
        },
      });
      if (!result) throw new R2ObjectConflictError(bucket, key);
    } catch (error) {
      if (error instanceof R2ObjectConflictError || isConditionalConflict(error)) {
        throw new R2ObjectConflictError(bucket, key);
      }
      throw error;
    }
  } else {
    try {
      await backend.client.send(
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
      if (isConditionalConflict(error)) throw new R2ObjectConflictError(bucket, key);
      throw error;
    }
  }

  const readback = await readR2ObjectWithBackend(bucket, key, backend);
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
  const publicDomain = await getRuntimeEnvValue('CLOUDFLARE_R2_PUBLIC_DOMAIN');
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
