import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ env: {} as Record<string, unknown> }));
vi.mock('../runtime/cloudflare', () => ({ getCloudflareRuntimeEnv: async () => state.env, getRuntimeEnvValue: async (key: string) => state.env[key] }));
import { readR2Object } from './r2';
afterEach(() => { state.env = {}; });
it('resolves the private bucket name from Worker vars instead of a hardcoded former bucket', async () => {
  const get = vi.fn(async () => ({ arrayBuffer: async () => new TextEncoder().encode('private object').buffer }));
  state.env = { APP_R2_BUCKET: 'make-money-production-private', APP_R2: { get, head: vi.fn(), put: vi.fn(), list: vi.fn() } };
  const object = await readR2Object('make-money-production-private', 'attachments/example');
  expect(new TextDecoder().decode(object!.body)).toBe('private object');
  expect(get).toHaveBeenCalledOnce();
});
