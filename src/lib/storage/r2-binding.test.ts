import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ env: {} as Record<string, unknown> }));
vi.mock('../runtime/cloudflare', () => ({ getCloudflareRuntimeEnv: async () => state.env, getRuntimeEnvValue: async (key: string) => state.env[key] }));
import {
  getFoundationBucketAsync,
  preflightR2Object,
  putR2ObjectCreateOnly,
  readR2Object,
  R2BucketMissingError,
  R2ObjectConflictError,
  R2ReadbackVerificationError,
} from './r2';
afterEach(() => { state.env = {}; });
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

function bindingState() {
  const objects = new Map<string, Uint8Array>();
  const list = vi.fn(async () => ({ objects: [] }));
  const head = vi.fn(async (key: string) => {
    const body = objects.get(key);
    return body ? { size: body.byteLength, httpMetadata: { contentType: 'application/json' } } : null;
  });
  const get = vi.fn(async (key: string) => {
    const body = objects.get(key);
    if (!body) return null;
    const copy = body.slice();
    return { size: copy.byteLength, arrayBuffer: async () => copy.buffer };
  });
  const put = vi.fn(async (key: string, value: Uint8Array, options?: { onlyIf?: { etagDoesNotMatch?: string } }) => {
    if (objects.has(key) && options?.onlyIf?.etagDoesNotMatch === '*') throw Object.assign(new Error('conflict'), { status: 412 });
    objects.set(key, value.slice());
    return { size: value.byteLength, arrayBuffer: async () => value.slice().buffer };
  });
  const binding = { list, head, get, put };
  state.env = { APP_R2_BUCKET: 'make-money-production-private', APP_R2: binding };
  return { objects, list, head, get, put };
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
    return { size: 7, arrayBuffer: async () => new TextEncoder().encode('corrupt').buffer };
  });
  await expect(putR2ObjectCreateOnly({ bucket: 'make-money-production-private', key: 'tests/corrupt.json', body: 'expected', contentType: 'text/plain' })).rejects.toBeInstanceOf(R2ReadbackVerificationError);
});
