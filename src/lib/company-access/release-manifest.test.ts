import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 同梱の版・版A・版Bは、同じ事例 ent_a の「一覧の1行」だけが違う。ビルドし直さずに文が変わることを確かめる。
const fx = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require('node:crypto') as typeof import('node:crypto');
  const sha = (text: string) => createHash('sha256').update(text).digest('hex');
  // 811c9dc5 は空の文の指紋（textFingerprint('')）
  const dossier = (line: string) => JSON.stringify({ id: 'ent_a', name: 'A', reader: { display: { listLine: { factId: 'f1', factHash: '811c9dc5', text: line } } } });
  const versions = Object.fromEntries(['bundled', 'A', 'B'].map((name) => {
    const detail = dossier(`${name}の1行`);
    const detailHash = sha(detail);
    const summaries = JSON.stringify([{ id: 'ent_a', name }]);
    const discovery = JSON.stringify({ name });
    const manifest = JSON.stringify({
      version: 1, sourceHash: sha(name), sourceCount: 1, publishedCount: 1,
      summaries: { hash: sha(summaries), key: `views/make-money/catalog-v1/objects/${sha(summaries)}.json.gz` },
      discovery: { hash: sha(discovery), key: `views/make-money/catalog-v1/objects/${sha(discovery)}.json.gz` },
      details: { ent_a: detailHash }, approvalCandidateIds: [],
    });
    return [name, { detail, detailHash, manifest, manifestHash: sha(manifest) }];
  })) as Record<string, { detail: string; detailHash: string; manifest: string; manifestHash: string }>;
  return { versions, r2: new Map<string, Uint8Array | string>(), pointerFails: false, reads: [] as string[] };
});

vi.mock('../../../data/catalog-release.json', () => ({ default: JSON.parse(fx.versions.bundled.manifest) }));
vi.mock('@/lib/storage/r2', () => ({
  getFoundationBucketAsync: vi.fn().mockResolvedValue({}),
  readR2Object: async (_bucket: unknown, key: string) => {
    fx.reads.push(key);
    if (key === 'views/make-money/catalog-v1/current.json' && fx.pointerFails) throw new Error('R2 unavailable');
    const body = fx.r2.get(key);
    if (body === undefined) return null;
    return { exists: true, body: typeof body === 'string' ? new TextEncoder().encode(body) : body, etag: `"${key.length}"` };
  },
}));
vi.mock('@/shared/financial-entity-schema', () => ({ parseFinancialEntitiesResiliently: (rows: unknown[]) => ({ validEntities: rows }) }));
vi.mock('./public-entity', () => ({ isPublishableEntity: () => true }));

import { listLineFor } from '@/shared/list-lines';
import { manifestObjectKey, POINTER_KEY } from '@/shared/catalog-manifest';
import { getDossierStoragePath } from '@/lib/foundation/dossier-projection';
import { clearReleaseEntityCacheForTest, findReleaseEntity } from './catalog-release';
import { clearManifestCacheForTest, getResolvedManifest, POINTER_TTL_MS } from './release-manifest';

/** 版の成果物（目録と事例の詳細）を R2 に置く。新規作成だけで、後から書き換えない。 */
function putVersion(name: string) {
  const v = fx.versions[name];
  fx.r2.set(manifestObjectKey(v.manifestHash), gzipSync(v.manifest));
  fx.r2.set(getDossierStoragePath('ent_a', v.detailHash), gzipSync(v.detail));
}
/** 目印を進める（書き換えてよいのは、これだけ）。 */
function point(name: string) {
  const v = fx.versions[name];
  fx.r2.set(POINTER_KEY, JSON.stringify({ version: 1, manifestHash: v.manifestHash, manifestKey: manifestObjectKey(v.manifestHash), publishedCount: 1, updatedAt: '2026-10-08T00:00:00.000Z', previous: null }));
}
async function shownLine(): Promise<string | null> {
  const entity = await findReleaseEntity('ent_a');
  return listLineFor(entity?.reader?.display, { id: 'f1', text: '' });
}
const passTtl = () => vi.setSystemTime(new Date(Date.now() + POINTER_TTL_MS + 1000));

beforeEach(() => {
  // 手元の置き場は空にして、本番と同じく R2 の目印から読む道だけを通す
  vi.stubEnv('CATALOG_RELEASE_DIR', mkdtempSync(join(tmpdir(), 'catalog-release-test-')));
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-08T00:00:00Z'));
  fx.r2.clear();
  fx.reads.length = 0;
  fx.pointerFails = false;
  clearManifestCacheForTest();
  clearReleaseEntityCacheForTest();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  putVersion('bundled');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('目印で版を切り替える', () => {
  it('目印を版Aから版Bに進めると、ビルドなしで画面の文が版Bに変わる', async () => {
    putVersion('A');
    putVersion('B');
    point('A');
    expect(await shownLine()).toBe('Aの1行');
    expect((await getResolvedManifest()).source).toBe('pointer');

    point('B');
    // 数分のキャッシュの間は、まだ版A
    expect(await shownLine()).toBe('Aの1行');
    passTtl();
    expect(await shownLine()).toBe('Bの1行');
    expect((await getResolvedManifest()).manifestHash).toBe(fx.versions.B.manifestHash);
  });

  it('目印を戻すと、前の版の文に戻る（版は書き換えず、目印だけを動かす）', async () => {
    putVersion('A');
    putVersion('B');
    point('B');
    expect(await shownLine()).toBe('Bの1行');
    point('A');
    passTtl();
    expect(await shownLine()).toBe('Aの1行');
  });

  it('目印が読めない時は、同梱の版で画面が出る', async () => {
    putVersion('A');
    fx.pointerFails = true;
    expect(await shownLine()).toBe('bundledの1行');
    expect((await getResolvedManifest()).source).toBe('bundled');
  });

  it('目印がまだ無い時も、同梱の版で画面が出る', async () => {
    expect(await shownLine()).toBe('bundledの1行');
  });

  it('目印が指す目録が壊れている・無い時は、同梱の版に戻る', async () => {
    point('A'); // 目録の置き物は無い
    expect(await shownLine()).toBe('bundledの1行');
    fx.r2.set(manifestObjectKey(fx.versions.A.manifestHash), gzipSync('{"壊れた":true}'));
    passTtl();
    expect(await shownLine()).toBe('bundledの1行');
  });

  it('一時的に目印を読めなくなっても、直前に読めた版を使い続ける', async () => {
    putVersion('A');
    point('A');
    expect(await shownLine()).toBe('Aの1行');
    fx.pointerFails = true;
    passTtl();
    expect(await shownLine()).toBe('Aの1行');
  });

  it('キャッシュの間は目印を読み直さない', async () => {
    putVersion('A');
    point('A');
    await shownLine();
    const pointerReads = () => fx.reads.filter((key) => key === POINTER_KEY).length;
    const before = pointerReads();
    await shownLine();
    await shownLine();
    expect(pointerReads()).toBe(before);
  });
});
