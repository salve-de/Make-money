import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const getContext = vi.hoisted(() => vi.fn<(...args: unknown[]) => { env: Record<string, unknown> }>());
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: getContext }));
import { getCloudflareRuntimeEnv, getRuntimeEnvValue } from './cloudflare';

beforeEach(() => { getContext.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); });

it('reads installed worker bindings using only synchronous context access', async () => {
  const bucket = { get: () => undefined };
  const env = { TEST_RUNTIME_VALUE: ' worker-value ', BUCKET: bucket };
  getContext.mockReturnValue({ env });
  expect(await getCloudflareRuntimeEnv()).toBe(env);
  expect(await getRuntimeEnvValue('TEST_RUNTIME_VALUE')).toBe('worker-value');
  expect(getContext.mock.calls).toEqual([[], []]);
});

it('returns null in Node without launching an implicit async Wrangler context', async () => {
  getContext.mockImplementation(() => { throw new Error('No installed context'); });
  expect(await getCloudflareRuntimeEnv()).toBeNull();
  expect(await getRuntimeEnvValue('TEST_RUNTIME_VALUE')).toBeUndefined();
  expect(getContext.mock.calls).toEqual([[], []]);
});

it('process env takes precedence and does not require a Cloudflare context', async () => {
  vi.stubEnv('TEST_RUNTIME_VALUE', ' node-value ');
  expect(await getRuntimeEnvValue('TEST_RUNTIME_VALUE')).toBe('node-value');
  expect(getContext).not.toHaveBeenCalled();
});

it('falls back from blank process env and ignores non-string bindings', async () => {
  vi.stubEnv('TEST_RUNTIME_VALUE', ' ');
  getContext.mockReturnValue({ env: { TEST_RUNTIME_VALUE: ' worker-value ', BUCKET: {} } });
  expect(await getRuntimeEnvValue('TEST_RUNTIME_VALUE')).toBe('worker-value');
  expect(await getRuntimeEnvValue('BUCKET')).toBeUndefined();
});

it('can find context installed after an earlier missing-context lookup', async () => {
  getContext.mockImplementationOnce(() => { throw new Error('Not initialized yet'); });
  expect(await getCloudflareRuntimeEnv()).toBeNull();
  const env = { TEST_RUNTIME_VALUE: 'ready' };
  getContext.mockReturnValue({ env });
  expect(await getCloudflareRuntimeEnv()).toBe(env);
});
