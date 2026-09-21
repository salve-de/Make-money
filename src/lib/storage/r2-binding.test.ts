import { afterEach, expect, it, vi } from 'vitest';
import { S3Client } from '@aws-sdk/client-s3';
const state = vi.hoisted(() => ({ env: {} as Record<string, unknown>, scoped: false }));
vi.mock('../runtime/cloudflare', () => ({
  getCloudflareRuntimeEnv: async () => state.env,
  getRuntimeEnvValue: async (key: string) => state.env[key],
  hasCloudflareRuntimeEnvScope: () => state.scoped,
}));
import {
  getFoundationBucketAsync,
  preflightR2Object,
  putR2MutableView,
  putR2ObjectCreateOnly,
  readR2Object,
  R2BucketMissingError,
  R2ObjectConflictError,
  R2ReadbackVerificationError,
  R2ViewConcurrentModificationError,
} from './r2';
afterEach(() => { state.env = {}; state.scoped = false; vi.restoreAllMocks(); vi.unstubAllEnvs(); });
it('resolves the private bucket name from Worker vars instead of a hardcoded former bucket', async () => {
  const get = vi.fn(async () => ({ arrayBuffer: async () => new TextEncoder().encode('private object').buffer }));
  state.env = { APP_R2_BUCKET: 'make-money-production-private', APP_R2: { get, head: vi.fn(), put: vi.fn(), list: vi.fn() } };
  const object = await readR2Object('make-money-production-private', 'attachments/example');
  expect(new TextDecoder().decode(object!.body)).toBe('private object');
  expect(get).toHaveBeenCalledOnce();
});

it('resolves a custom Foundation bucket from the request runtime binding', async () => {
  state.env = { FOUNDATION_R2_LAKE_BUCKET: 'custom-foundation-lake' };
  await expect(getFoundationBucketAsync('lake')).resolves.toBe('custom-foundation-lake');
});

it('uses local S3 credentials for Foundation reads instead of a stale dev preview binding', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('CLOUDFLARE_R2_ACCOUNT_ID', 'test-account');
  vi.stubEnv('CLOUDFLARE_R2_ACCESS_KEY_ID', 'test-access');
  vi.stubEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'test-secret');
  const previewGet = vi.fn(async () => ({ arrayBuffer: async () => new TextEncoder().encode('preview').buffer }));
  state.env = {
    FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
    FOUNDATION_R2_LAKE: { head: vi.fn(), get: previewGet, put: vi.fn(), list: vi.fn() },
  };
  const s3Send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({
    Body: { transformToByteArray: async () => new TextEncoder().encode('direct-r2') },
    ContentLength: 9,
    ContentType: 'application/json',
  } as never);

  const object = await readR2Object('foundation-lake', 'views/example.json');

  expect(new TextDecoder().decode(object!.body)).toBe('direct-r2');
  expect(s3Send).toHaveBeenCalledOnce();
  expect(previewGet).not.toHaveBeenCalled();
});

it('keeps an explicit Worker runtime scope binding-first in local development', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('CLOUDFLARE_R2_ACCOUNT_ID', 'test-account');
  vi.stubEnv('CLOUDFLARE_R2_ACCESS_KEY_ID', 'test-access');
  vi.stubEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'test-secret');
  state.scoped = true;
  const previewGet = vi.fn(async () => ({ arrayBuffer: async () => new TextEncoder().encode('scoped-binding').buffer }));
  state.env = {
    FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
    FOUNDATION_R2_LAKE: { head: vi.fn(), get: previewGet, put: vi.fn(), list: vi.fn() },
  };
  const s3Send = vi.spyOn(S3Client.prototype, 'send');

  const object = await readR2Object('foundation-lake', 'views/scoped.json');

  expect(new TextDecoder().decode(object!.body)).toBe('scoped-binding');
  expect(previewGet).toHaveBeenCalledOnce();
  expect(s3Send).not.toHaveBeenCalled();
});

it('does not redirect non-Foundation private reads to local S3', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('CLOUDFLARE_R2_ACCOUNT_ID', 'test-account');
  vi.stubEnv('CLOUDFLARE_R2_ACCESS_KEY_ID', 'test-access');
  vi.stubEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'test-secret');
  const previewGet = vi.fn(async () => ({ arrayBuffer: async () => new TextEncoder().encode('private-binding').buffer }));
  state.env = {
    APP_R2_BUCKET: 'make-money-production-private',
    APP_R2: { head: vi.fn(), get: previewGet, put: vi.fn(), list: vi.fn() },
  };
  const s3Send = vi.spyOn(S3Client.prototype, 'send');

  const object = await readR2Object('make-money-production-private', 'attachments/example');

  expect(new TextDecoder().decode(object!.body)).toBe('private-binding');
  expect(previewGet).toHaveBeenCalledOnce();
  expect(s3Send).not.toHaveBeenCalled();
});

it('keeps binding-first reads when local S3 credentials are absent', async () => {
  const fake = bindingState();
  const object = await readR2Object('make-money-production-private', 'attachments/example');
  expect(object).toBeNull();
  expect(fake.get).toHaveBeenCalledOnce();
});

it('keeps local development writes on the existing Worker binding path', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('CLOUDFLARE_R2_ACCOUNT_ID', 'test-account');
  vi.stubEnv('CLOUDFLARE_R2_ACCESS_KEY_ID', 'test-access');
  vi.stubEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'test-secret');
  const fake = bindingState();

  await putR2ObjectCreateOnly({
    bucket: 'make-money-production-private',
    key: 'tests/local-development-write.json',
    body: 'binding-write',
    contentType: 'text/plain',
  });

  expect(fake.put).toHaveBeenCalled();
});

function bindingState() {
  const objects = new Map<string, Uint8Array>();
  const etags = new Map<string, string>();
  let revision = 0;
  const list = vi.fn(async () => ({ objects: [] }));
  const head = vi.fn(async (key: string) => {
    const body = objects.get(key);
    return body ? { size: body.byteLength, etag: etags.get(key), httpMetadata: { contentType: 'application/json' } } : null;
  });
  const get = vi.fn(async (key: string) => {
    const body = objects.get(key);
    if (!body) return null;
    const copy = body.slice();
    return { size: copy.byteLength, etag: etags.get(key), arrayBuffer: async () => copy.buffer };
  });
  const put = vi.fn(async (
    key: string,
    value: Uint8Array,
    options?: { onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string } }
  ) => {
    const currentEtag = etags.get(key);
    if (objects.has(key) && options?.onlyIf?.etagDoesNotMatch === '*') {
      throw Object.assign(new Error('conflict'), { status: 412 });
    }
    if (options?.onlyIf?.etagMatches && currentEtag !== options.onlyIf.etagMatches) {
      return null;
    }
    revision += 1;
    const etag = `etag-${revision}`;
    objects.set(key, value.slice());
    etags.set(key, etag);
    return { size: value.byteLength, etag, arrayBuffer: async () => value.slice().buffer };
  });
  const binding = { list, head, get, put };
  state.env = { APP_R2_BUCKET: 'make-money-production-private', APP_R2: binding };
  return { objects, etags, list, head, get, put };
}

it('creates a binding object and verifies byte/hash readback', async () => {
  const fake = bindingState();
  const result = await putR2ObjectCreateOnly({ bucket: 'make-money-production-private', key: 'tests/create.json', body: '{"ok":true}', contentType: 'application/json' });
  expect(result).toMatchObject({ status: 'CREATED', bytes: 11, readback: { bytes_match: true, sha256_match: true }, provider_calls: { put_object: 1 } });
  expect(fake.put).toHaveBeenCalledOnce();
  expect(new TextDecoder().decode(fake.objects.get('tests/create.json'))).toBe('{"ok":true}');
});

it('returns identical, rejects conflicting, and protects concurrent create-only writes', async () => {
  const fake = bindingState();
  await putR2ObjectCreateOnly({ bucket: 'make-money-production-private', key: 'tests/idempotent.json', body: 'same', contentType: 'text/plain' });
  await expect(preflightR2Object({ bucket: 'make-money-production-private', key: 'tests/idempotent.json', body: 'same', contentType: 'text/plain' })).resolves.toMatchObject({ status: 'EXISTS_IDENTICAL' });
  await expect(putR2ObjectCreateOnly({ bucket: 'make-money-production-private', key: 'tests/idempotent.json', body: 'different', contentType: 'text/plain' })).rejects.toBeInstanceOf(R2ObjectConflictError);
  const outcomes = await Promise.allSettled([
    putR2ObjectCreateOnly({ bucket: 'make-money-production-private', key: 'tests/race.json', body: 'a', contentType: 'text/plain' }),
    putR2ObjectCreateOnly({ bucket: 'make-money-production-private', key: 'tests/race.json', body: 'b', contentType: 'text/plain' }),
  ]);
  expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
  expect(outcomes.filter((item) => item.status === 'rejected')).toHaveLength(1);
  expect(fake.put).toHaveBeenCalledTimes(2);
});

it('fails closed for a missing bucket and readback corruption', async () => {
  const fake = bindingState();
  fake.list.mockRejectedValueOnce(Object.assign(new Error('missing'), { status: 404 }));
  await expect(preflightR2Object({ bucket: 'make-money-production-private', key: 'tests/missing.json', body: 'x', contentType: 'text/plain' })).rejects.toBeInstanceOf(R2BucketMissingError);

  const corrupt = bindingState();
  corrupt.put.mockImplementationOnce(async (key: string) => {
    corrupt.objects.set(key, new TextEncoder().encode('corrupt'));
    corrupt.etags.set(key, 'etag-corrupt');
    return { size: 7, etag: 'etag-corrupt', arrayBuffer: async () => new TextEncoder().encode('corrupt').buffer };
  });
  await expect(putR2ObjectCreateOnly({ bucket: 'make-money-production-private', key: 'tests/corrupt.json', body: 'expected', contentType: 'text/plain' })).rejects.toBeInstanceOf(R2ReadbackVerificationError);
});


it('CAS-guards mutable product views against stale writers', async () => {
  const fake = bindingState();
  const first = await putR2MutableView({
    bucket: 'make-money-production-private',
    key: 'views/make-money/v1/entities/ent_demo.json',
    body: '{"revision":1}',
    contentType: 'application/json',
  }, { expectedEtag: null });
  expect(first.status).toBe('CREATED');

  const snapshot = await readR2Object(
    'make-money-production-private',
    'views/make-money/v1/entities/ent_demo.json',
  );
  expect(snapshot?.etag).toBeTruthy();

  const second = await putR2MutableView({
    bucket: 'make-money-production-private',
    key: 'views/make-money/v1/entities/ent_demo.json',
    body: '{"revision":2}',
    contentType: 'application/json',
  }, { expectedEtag: snapshot!.etag! });
  expect(second.status).toBe('UPDATED');

  await expect(putR2MutableView({
    bucket: 'make-money-production-private',
    key: 'views/make-money/v1/entities/ent_demo.json',
    body: '{"revision":0}',
    contentType: 'application/json',
  }, { expectedEtag: snapshot!.etag! })).rejects.toBeInstanceOf(R2ViewConcurrentModificationError);

  expect(new TextDecoder().decode(fake.objects.get('views/make-money/v1/entities/ent_demo.json'))).toBe('{"revision":2}');
});
