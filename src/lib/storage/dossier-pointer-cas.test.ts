import { describe, expect, it } from 'vitest';
import {
  MemoryDossierPointerStore,
  buildD1PointerUpsertSql,
  type DossierPointer,
} from './dossier-pointer-cas';

describe('DossierPointer CAS Engine', () => {
  it('100 concurrent updates guarantee monotonic revision progression and maximum revision convergence', async () => {
    const store = new MemoryDossierPointerStore();
    const entityId = 'biz_concurrent_test';

    // 1〜100のリビジョンをシャッフルした配列を作成
    const revisions = Array.from({ length: 100 }, (_, i) => i + 1);
    for (let i = revisions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [revisions[i], revisions[j]] = [revisions[j], revisions[i]];
    }

    // 100個の非同期更新タスクを同時に発行（人工的なランダム遅延を含む）
    const tasks = revisions.map(async (rev) => {
      // 0〜5ms の微小ジッター
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
      const pointer: DossierPointer = {
        entityId,
        hash: `sha256_rev_${rev}_${'0'.repeat(40)}`,
        sourceRevision: rev,
        updatedAt: Date.now(),
      };
      return store.compareAndSwap(pointer);
    });

    const results = await Promise.all(tasks);

    // 最大リビジョン100のタスクは必ず成功（applied: true）していること
    const rev100Result = results.find(
      (_, idx) => revisions[idx] === 100
    );
    expect(rev100Result?.success).toBe(true);

    // 最終的にストアに格納されているポインタは確実に最大リビジョン100であること
    const finalPointer = await store.get(entityId);
    expect(finalPointer).not.toBeNull();
    expect(finalPointer?.sourceRevision).toBe(100);
    expect(finalPointer?.hash).toBe(`sha256_rev_100_${'0'.repeat(40)}`);
  });

  it('rejects stale revisions when an older worker finishes later', async () => {
    const store = new MemoryDossierPointerStore();
    const entityId = 'biz_stale_test';

    // Writer B (Revision 2) が先に書き込み完了
    const p2: DossierPointer = {
      entityId,
      hash: 'hash_v2',
      sourceRevision: 2,
      updatedAt: 1000,
    };
    const res2 = await store.compareAndSwap(p2);
    expect(res2.success).toBe(true);
    expect(res2.applied).toBe(true);

    // Writer A (Revision 1, 遅延した古いワーカー) が後から書き込もうとする
    const p1: DossierPointer = {
      entityId,
      hash: 'hash_v1',
      sourceRevision: 1,
      updatedAt: 900,
    };
    const res1 = await store.compareAndSwap(p1);
    expect(res1.success).toBe(false);
    expect(res1.applied).toBe(false);
    expect(res1.conflictReason).toBe('STALE_REVISION');
    expect(res1.current?.sourceRevision).toBe(2);

    // ストアが v2 のままであること
    const current = await store.get(entityId);
    expect(current?.sourceRevision).toBe(2);
    expect(current?.hash).toBe('hash_v2');
  });

  it('handles idempotent retries gracefully', async () => {
    const store = new MemoryDossierPointerStore();
    const entityId = 'biz_idempotent_test';

    const p1: DossierPointer = {
      entityId,
      hash: 'hash_v1',
      sourceRevision: 1,
      updatedAt: 1000,
    };
    const res1 = await store.compareAndSwap(p1);
    expect(res1.applied).toBe(true);

    // 同一リビジョン・同一ハッシュで再試行
    const resRetry = await store.compareAndSwap(p1);
    expect(resRetry.success).toBe(true);
    expect(resRetry.applied).toBe(false); // 重複適用はなし
  });

  it('detects nondeterministic build conflict when same revision has different hashes', async () => {
    const store = new MemoryDossierPointerStore();
    const entityId = 'biz_conflict_test';

    const p1A: DossierPointer = {
      entityId,
      hash: 'hash_v1_A',
      sourceRevision: 1,
      updatedAt: 1000,
    };
    await store.compareAndSwap(p1A);

    const p1B: DossierPointer = {
      entityId,
      hash: 'hash_v1_B',
      sourceRevision: 1,
      updatedAt: 1001,
    };
    const resConflict = await store.compareAndSwap(p1B);
    expect(resConflict.success).toBe(false);
    expect(resConflict.conflictReason).toBe('REVISION_EQUAL_DIFFERENT_HASH');
  });

  it('generates correct Cloudflare D1 SQL statement with monotonic clause', () => {
    const pointer: DossierPointer = {
      entityId: 'biz_d1_test',
      hash: 'sha256_mock',
      sourceRevision: 5,
      updatedAt: 123456789,
    };
    const { sql, params } = buildD1PointerUpsertSql(pointer);
    expect(sql).toContain('WHERE excluded.source_revision > dossier_pointers.source_revision');
    expect(params[0]).toBe('biz_d1_test');
    expect(params[1]).toBe('sha256_mock');
    expect(params[2]).toBe(5);
  });
});
