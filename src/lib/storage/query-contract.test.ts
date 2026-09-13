import { describe, it, expect } from 'vitest';
import {
  CursorStaleError,
  MemoryQueryProvider,
  type TinyRecord,
} from './query-contract';

describe('QueryContract Conformance Test Suite', () => {
  const mockRecords: TinyRecord[] = [
    {
      entityId: 'ent_01',
      name: 'Alpha SaaS',
      ticker: 'ALPHA',
      sector: 'NICHE_SAAS',
      scale: 'SOLO',
      country: 'US',
      teamSize: 1,
      monthlyRevenue: 1000000,
      operatingMargin: 85,
      growthRateYoY: 120,
      tags: ['完全1人', 'B2B', '利益率80%超'],
      latestDossierHash: 'hash_alpha_v1',
      sourceRevision: 101,
      projectionGeneration: 1,
      publishability: 'PUBLISHABLE',
    },
    {
      entityId: 'ent_02',
      name: 'Beta Mfg',
      ticker: 'BETA',
      sector: 'MONOPOLY_MFG',
      scale: 'SMALL_TEAM',
      country: 'JP',
      teamSize: 5,
      monthlyRevenue: 5000000,
      operatingMargin: 50,
      growthRateYoY: 30,
      tags: ['製造', '直販'],
      latestDossierHash: 'hash_beta_v1',
      sourceRevision: 102,
      projectionGeneration: 1,
      publishability: 'PUBLISHABLE',
    },
    {
      entityId: 'ent_03',
      name: 'Gamma Bleed',
      ticker: 'GAMMA',
      sector: 'AI_AUTOMATION',
      scale: 'SCALEUP',
      country: 'US',
      teamSize: 20,
      monthlyRevenue: 2000000,
      operatingMargin: -40,
      growthRateYoY: 50,
      tags: ['AI', '赤字'],
      latestDossierHash: 'hash_gamma_v1',
      sourceRevision: 103,
      projectionGeneration: 1,
      publishability: 'PUBLISHABLE',
    },
    {
      entityId: 'ent_04_unapproved',
      name: 'Delta Raw Memo',
      ticker: 'DELTA',
      sector: 'NICHE_SAAS',
      scale: 'SOLO',
      country: 'UK',
      teamSize: 1,
      monthlyRevenue: 500000,
      operatingMargin: 90,
      growthRateYoY: 10,
      tags: ['未精錬'],
      latestDossierHash: 'hash_delta_raw',
      sourceRevision: 1,
      projectionGeneration: 1,
      publishability: 'PARTIAL', // 未昇格！
    },
    {
      entityId: 'ent_05_rejected',
      name: 'Epsilon Spam',
      ticker: 'EPSILON',
      sector: 'CONTENT_MEDIA',
      scale: 'SOLO',
      country: 'US',
      teamSize: 1,
      monthlyRevenue: 10000,
      operatingMargin: 5,
      growthRateYoY: 0,
      tags: ['スパム'],
      latestDossierHash: 'hash_epsilon_v1',
      sourceRevision: 1,
      projectionGeneration: 1,
      publishability: 'REJECTED_AS_CASE', // 却下！
    },
  ];

  const provider = new MemoryQueryProvider(mockRecords, 42);

  it('1. 昇格ゲート強制: 未承認・却下データは一般検索から物理遮断されること', async () => {
    const res = await provider.search(
      {},
      { field: 'name', direction: 'asc' },
      null,
      10
    );
    // mockRecords 5件中、PUBLISHABLE は 3件のみ
    expect(res.items.length).toBe(3);
    const ids = res.items.map((i) => i.entityId);
    expect(ids).toContain('ent_01');
    expect(ids).toContain('ent_02');
    expect(ids).toContain('ent_03');
    expect(ids).not.toContain('ent_04_unapproved');
    expect(ids).not.toContain('ent_05_rejected');
  });

  it('2. フィルタリング: 黒字・高利益率・タグ絞り込みが正確に動作すること', async () => {
    // 利益率80%超かつ黒字
    const res = await provider.search(
      { minOperatingMargin: 80, onlyProfitable: true },
      { field: 'operatingMargin', direction: 'desc' },
      null,
      10
    );
    expect(res.items.length).toBe(1);
    expect(res.items[0].entityId).toBe('ent_01');
    expect(res.items[0].operatingMargin).toBe(85);
  });

  it('3. 安定ソート ＆ Cursor ページネーション: 重複・欠落なく走査できること', async () => {
    // 1ページあたり1件で取得
    const page1 = await provider.search(
      {},
      { field: 'operatingMargin', direction: 'desc' },
      null,
      1
    );

    expect(page1.items.length).toBe(1);
    expect(page1.items[0].entityId).toBe('ent_01'); // 85%
    expect(page1.nextCursor).not.toBeNull();
    expect(page1.generation).toBe(42);

    // 2ページ目をカーソル指定で取得
    const page2 = await provider.search(
      {},
      { field: 'operatingMargin', direction: 'desc' },
      page1.nextCursor,
      1
    );

    expect(page2.items.length).toBe(1);
    expect(page2.items[0].entityId).toBe('ent_02'); // 50%
    expect(page2.nextCursor).not.toBeNull();

    // 3ページ目を取得
    const page3 = await provider.search(
      {},
      { field: 'operatingMargin', direction: 'desc' },
      page2.nextCursor,
      1
    );

    expect(page3.items.length).toBe(1);
    expect(page3.items[0].entityId).toBe('ent_03'); // -40%
    // これで末尾なので nextCursor は null
    expect(page3.nextCursor).toBeNull();

    // 3ページの全アイテムIDに重複・欠落がないこと
    const traversedIds = [
      page1.items[0].entityId,
      page2.items[0].entityId,
      page3.items[0].entityId,
    ];
    expect(traversedIds).toEqual(['ent_01', 'ent_02', 'ent_03']);
  });

  it('4. getTiny による単一エンティティ取得', async () => {
    const item = await provider.getTiny('ent_02');
    expect(item).not.toBeNull();
    expect(item?.ticker).toBe('BETA');
    expect(item?.latestDossierHash).toBe('hash_beta_v1');
    expect(item?.sourceRevision).toBe(102);

    const missing = await provider.getTiny('non_existent');
    expect(missing).toBeNull();
  });

  it('5. 世代不整合検知: インデックス更新後の古いカーソルは CURSOR_STALE で安全に遮断されること', async () => {
    // generation = 42 のプロバイダに対して、古い generation = 40 のカーソルを渡す
    const staleCursor = {
      indexGeneration: 40,
      sortValues: [85],
      entityId: 'ent_01',
    };

    await expect(
      provider.search({}, { field: 'operatingMargin', direction: 'desc' }, staleCursor, 10)
    ).rejects.toThrowError(CursorStaleError);

    try {
      await provider.search({}, { field: 'operatingMargin', direction: 'desc' }, staleCursor, 10);
    } catch (err) {
      expect((err as CursorStaleError).code).toBe('CURSOR_STALE');
      expect((err as CursorStaleError).cursorGeneration).toBe(40);
      expect((err as CursorStaleError).currentGeneration).toBe(42);
    }
  });
});
