import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCloudflareRuntimeEnv } from '@/lib/runtime/cloudflare';
import { decodeCatalogArtifact, usesCatalogRelease } from './catalog-release';

vi.mock('@/lib/runtime/cloudflare', () => ({ getCloudflareRuntimeEnv: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe('immutable catalog release', () => {
  it('keeps next dev on local JSON even when the emulator has production vars', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.mocked(getCloudflareRuntimeEnv).mockResolvedValue({ ENVIRONMENT: 'production' });
    expect(await usesCatalogRelease()).toBe(false);
    expect(getCloudflareRuntimeEnv).not.toHaveBeenCalled();
  });
  it('uses R2 in the production Worker and local JSON in standalone Node', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.mocked(getCloudflareRuntimeEnv).mockResolvedValue({ ENVIRONMENT: 'production' });
    expect(await usesCatalogRelease()).toBe(true);
    vi.mocked(getCloudflareRuntimeEnv).mockResolvedValue(null);
    expect(await usesCatalogRelease()).toBe(false);
  });
  it('reads only the exact accepted bytes', () => {
    const text = JSON.stringify({ name: 'テスト', value: 123 });
    const hash = createHash('sha256').update(text).digest('hex');
    expect(decodeCatalogArtifact(gzipSync(text), hash)).toEqual({ name: 'テスト', value: 123 });
    expect(() => decodeCatalogArtifact(gzipSync(text.replace('123', '456')), hash)).toThrow('hash mismatch');
  });
  it('rejects corrupt compressed content', () => {
    expect(() => decodeCatalogArtifact(new Uint8Array([1, 2, 3]), 'a'.repeat(64))).toThrow();
  });
});
