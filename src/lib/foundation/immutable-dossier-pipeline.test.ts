import { describe, expect, it } from 'vitest';
import type { FinancialEntity } from '@/shared/terminal';
import { MemoryDossierPointerStore } from '@/lib/storage/dossier-pointer-cas';
import {
  ChecksumMismatchError,
  MemoryR2BlobStorage,
  storeImmutableDossierWithReadback,
  stringifyDeterministic,
} from './immutable-dossier-pipeline';

const sampleEntity = {
  id: 'biz_pipeline_test',
  name: 'Pipeline Test Corp',
  ticker: 'PTC',
  sector: 'NICHE_SAAS',
  scale: 'SOLO',
  country: 'US',
  tagline: 'Test pipeline',
  founder: 'Tester',
  url: 'https://example.com',
  verifiedBadge: true,
  architecturePattern: 'Test Pattern',
  pipelineStack: 'Test Stack',
  targetPainWallet: 'Test Wallet',
  tags: ['test'],
  sourceRevision: 1,
  publishability: 'PUBLISHABLE',
  growthRateYoY: 100,
  pnl: {
    monthlyRevenue: 50000,
    cogs: 5000,
    grossProfit: 45000,
    grossMargin: 90,
    operatingExpenses: {
      serverAndApi: 1000,
      advertising: 0,
      subcontracting: 0,
      toolsAndSaaS: 500,
      other: 500,
    },
    operatingProfit: 43000,
    operatingMargin: 86,
    estimatedAnnualNetProfit: 516000,
  },
} as unknown as FinancialEntity;

describe('Immutable Dossier Pipeline', () => {
  it('determinstic stringification produces identical hash regardless of key insertion order', () => {
    const objA = { z: 1, a: 2, m: { nestedB: true, nestedA: 'hello' } };
    const objB = { a: 2, m: { nestedA: 'hello', nestedB: true }, z: 1 };

    const jsonA = stringifyDeterministic(objA);
    const jsonB = stringifyDeterministic(objB);

    expect(jsonA).toBe(jsonB);
    expect(jsonA).toBe('{"a":2,"m":{"nestedA":"hello","nestedB":true},"z":1}');
  });

  it('runs complete 7-step pipeline: canonical json -> sha256 -> gzip -> put -> readback -> verify -> CAS', async () => {
    const storage = new MemoryR2BlobStorage();
    const pointerStore = new MemoryDossierPointerStore();

    const result = await storeImmutableDossierWithReadback(
      sampleEntity,
      storage,
      pointerStore
    );

    expect(result.hash).toHaveLength(64);
    expect(result.storagePath).toContain(`views/make-money/dossier-v1/objects/`);
    expect(result.storagePath).toContain(`${result.hash}.json.gz`);
    expect(result.isNewBlob).toBe(true);
    expect(result.casResult.success).toBe(true);
    expect(result.casResult.applied).toBe(true);
    expect(result.compressedBytes).toBeLessThan(result.uncompressedBytes);

    // ポインタが正しく最新化されていること
    const pointer = await pointerStore.get(sampleEntity.id);
    expect(pointer).not.toBeNull();
    expect(pointer?.hash).toBe(result.hash);
    expect(pointer?.sourceRevision).toBe(1);
  });

  it('handles concurrent PUTs of the same entity hash gracefully without corrupting storage', async () => {
    const storage = new MemoryR2BlobStorage();
    const pointerStore = new MemoryDossierPointerStore();

    // 10個の並行保存タスク
    const tasks = Array.from({ length: 10 }, () =>
      storeImmutableDossierWithReadback(sampleEntity, storage, pointerStore)
    );

    const results = await Promise.all(tasks);

    // 最初の1件だけが isNewBlob = true、残りは false（既存CAS再利用）
    const newBlobCount = results.filter((r) => r.isNewBlob).length;
    expect(newBlobCount).toBe(1);

    // 全タスクが成功完了していること
    for (const res of results) {
      expect(res.hash).toBe(results[0].hash);
      expect(res.casResult.success).toBe(true);
    }

    // ストレージに格納されているキーが1つだけであること
    expect(storage.store.size).toBe(1);
  });

  it('detects bit-rot or storage corruption during readback and aborts CAS update', async () => {
    const storage = new MemoryR2BlobStorage();
    const pointerStore = new MemoryDossierPointerStore();

    // ストレージの getObject をモックして改ざんデータを返すようにする
    const originalPut = storage.putObject.bind(storage);
    storage.putObject = async (key, body, opts) => {
      const res = await originalPut(key, body, opts);
      // 改ざん: 不正なバッファで上書き
      storage.store.set(key, Buffer.from('corrupted_garbage_not_matching_hash'));
      return res;
    };

    await expect(
      storeImmutableDossierWithReadback(sampleEntity, storage, pointerStore)
    ).rejects.toThrowError(ChecksumMismatchError);

    // 検証失敗によりポインタは一切更新されていないこと
    const pointer = await pointerStore.get(sampleEntity.id);
    expect(pointer).toBeNull();
  });
});
