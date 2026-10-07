import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/storage/r2', () => ({
  getFoundationBucketAsync: vi.fn().mockResolvedValue({}),
  readR2Object: vi.fn().mockRejectedValue(new Error('手元の開発では R2 を読まない')),
}));

import { manifestObjectKey } from '@/shared/catalog-manifest';
import { clearManifestCacheForTest, getResolvedManifest } from './release-manifest';

const sha = (text: string) => createHash('sha256').update(text).digest('hex');

describe('手元の開発サーバ', () => {
  beforeEach(() => { clearManifestCacheForTest(); vi.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it('手元の置き場の目印が指す目録を、同梱の版と食い違っていても読む', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'catalog-local-'));
    const h = sha('x');
    const manifest = JSON.stringify({
      version: 1, sourceHash: h, sourceCount: 1, publishedCount: 1,
      summaries: { hash: h, key: 'k' }, discovery: { hash: h, key: 'k' }, details: { ent_local: h }, approvalCandidateIds: [],
    });
    const manifestHash = sha(manifest);
    writeFileSync(join(dir, `${manifestHash}.json.gz`), gzipSync(manifest));
    writeFileSync(join(dir, 'current.json'), JSON.stringify({ version: 1, manifestHash, manifestKey: manifestObjectKey(manifestHash), publishedCount: 1, updatedAt: 'x', previous: null }));
    vi.stubEnv('CATALOG_RELEASE_DIR', dir);
    const result = await getResolvedManifest();
    expect(result.source).toBe('local');
    expect(result.membership.catalogIds()).toEqual(['ent_local']);
  });

  it('置き場に目印が無ければ、R2 も読めない手元でも同梱の版で動く', async () => {
    vi.stubEnv('CATALOG_RELEASE_DIR', mkdtempSync(join(tmpdir(), 'catalog-empty-')));
    const result = await getResolvedManifest();
    expect(result.source).toBe('bundled');
    expect(result.membership.catalogIds().length).toBeGreaterThan(0);
  });
});
