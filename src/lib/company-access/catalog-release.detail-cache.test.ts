import { gzipSync } from 'node:zlib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => {
  const dossier = { id: 'ent_cached', name: 'Cached' };
  const text = JSON.stringify(dossier);
  // vi.hoisted の中では import 前なので、require で node:crypto を使う
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash: sha } = require('node:crypto') as typeof import('node:crypto');
  return { dossier, text, hash: sha('sha256').update(text).digest('hex'), readR2Object: vi.fn() };
});
const { dossier, text } = fixture;
const mocks = fixture;

vi.mock('../../../data/catalog-release.json', () => ({
  default: { summaries: { key: '', hash: '' }, discovery: { key: '', hash: '' }, details: { ent_cached: fixture.hash }, approvalCandidateIds: [], publishedCount: 1 },
}));
// 目印（現在の版を指す1枚）は無い扱い。同梱の版で動く。事例データの読みだけを数える
vi.mock('@/lib/storage/r2', () => ({
  getFoundationBucketAsync: vi.fn().mockResolvedValue({}),
  readR2Object: (bucket: unknown, key: string) => (key === 'views/make-money/catalog-v1/current.json' ? Promise.resolve(null) : fixture.readR2Object(bucket, key)),
}));
vi.mock('@/shared/financial-entity-schema', () => ({
  parseFinancialEntitiesResiliently: (rows: unknown[]) => ({ validEntities: rows }),
}));
vi.mock('./public-entity', () => ({ isPublishableEntity: () => true }));

import { clearReleaseEntityCacheForTest, findReleaseEntity } from './catalog-release';

describe('公開版の詳細の isolate 内キャッシュ', () => {
  beforeEach(() => { clearReleaseEntityCacheForTest(); mocks.readR2Object.mockReset(); });

  it('同じ事例は R2 から1回だけ読み、同じオブジェクトを返す', async () => {
    mocks.readR2Object.mockResolvedValue({ body: gzipSync(text) });
    const [a, b] = await Promise.all([findReleaseEntity('ent_cached'), findReleaseEntity('ENT_CACHED')]);
    const c = await findReleaseEntity('ent_cached');
    expect(a).toEqual(dossier);
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(mocks.readR2Object).toHaveBeenCalledTimes(1);
  });

  it('読み込みの失敗は覚えず、次の要求で読み直す', async () => {
    mocks.readR2Object.mockRejectedValueOnce(new Error('R2 unavailable')).mockResolvedValue({ body: gzipSync(text) });
    await expect(findReleaseEntity('ent_cached')).rejects.toThrow('Catalog release is unavailable');
    expect(await findReleaseEntity('ent_cached')).toEqual(dossier);
    expect(mocks.readR2Object).toHaveBeenCalledTimes(2);
  });

  it('目録に無い事例は R2 を読まずに null', async () => {
    expect(await findReleaseEntity('ent_missing')).toBeNull();
    expect(mocks.readR2Object).not.toHaveBeenCalled();
  });
});
