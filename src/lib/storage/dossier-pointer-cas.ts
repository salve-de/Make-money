/**
 * Dossier Pointer Atomic CAS (Compare-And-Swap) Engine
 * 
 * 複数ワーカーや並行パイプラインからの同時書き込みにおいて、
 * 古いリビジョンによる最新ポインタの巻き戻し（Stale Pointer Overwrite）を物理的に防ぐ。
 */

export interface DossierPointer {
  entityId: string;
  hash: string;
  sourceRevision: number;
  updatedAt: number;
}

export interface CasUpdateResult {
  success: boolean;
  current: DossierPointer | null;
  applied: boolean;
  conflictReason?: 'STALE_REVISION' | 'REVISION_EQUAL_DIFFERENT_HASH';
}

export interface DossierPointerStore {
  get(entityId: string): Promise<DossierPointer | null>;
  compareAndSwap(
    newPointer: DossierPointer,
    expectedRevision?: number | null
  ): Promise<CasUpdateResult>;
}

/**
 * 非同期直列化のためのエンティティ別Mutex
 */
class AsyncEntityMutex {
  private locks = new Map<string, Promise<void>>();

  public async acquire<T>(entityId: string, task: () => Promise<T> | T): Promise<T> {
    while (this.locks.has(entityId)) {
      await this.locks.get(entityId);
    }

    let release: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(entityId, lockPromise);

    try {
      return await task();
    } finally {
      this.locks.delete(entityId);
      release!();
    }
  }
}

/**
 * インメモリ CAS ポインタストア（参照実装・テスト・ローカル用）
 */
export class MemoryDossierPointerStore implements DossierPointerStore {
  private pointers = new Map<string, DossierPointer>();
  private mutex = new AsyncEntityMutex();

  public async get(entityId: string): Promise<DossierPointer | null> {
    const p = this.pointers.get(entityId);
    return p ? { ...p } : null;
  }

  /**
   * 単調増加アトミック CAS 更新
   * - 新規: 登録成功
   * - newRevision > currentRevision: 最新化成功
   * - newRevision === currentRevision && newHash === currentHash: 冪等成功
   * - newRevision <= currentRevision: 拒絶 (STALE_REVISION)
   * - expectedRevision が明示指定されている場合: currentRevision !== expectedRevision で拒絶
   */
  public async compareAndSwap(
    newPointer: DossierPointer,
    expectedRevision?: number | null
  ): Promise<CasUpdateResult> {
    return this.mutex.acquire(newPointer.entityId, async () => {
      const current = this.pointers.get(newPointer.entityId);

      // 1. 明示的な expectedRevision チェックがある場合
      if (expectedRevision !== undefined) {
        const actualRev = current ? current.sourceRevision : null;
        if (actualRev !== expectedRevision) {
          return {
            success: false,
            applied: false,
            current: current ? { ...current } : null,
            conflictReason: 'STALE_REVISION',
          };
        }
      }

      // 2. 既存ポインタが存在しない場合
      if (!current) {
        const stored: DossierPointer = {
          ...newPointer,
          updatedAt: newPointer.updatedAt || Date.now(),
        };
        this.pointers.set(newPointer.entityId, stored);
        return {
          success: true,
          applied: true,
          current: { ...stored },
        };
      }

      // 3. 同一リビジョン・同一ハッシュは冪等成功 (No-op)
      if (
        current.sourceRevision === newPointer.sourceRevision &&
        current.hash === newPointer.hash
      ) {
        return {
          success: true,
          applied: false,
          current: { ...current },
        };
      }

      // 4. 同一リビジョンだがハッシュが異なる（決定論的ビルド違反）
      if (current.sourceRevision === newPointer.sourceRevision) {
        return {
          success: false,
          applied: false,
          current: { ...current },
          conflictReason: 'REVISION_EQUAL_DIFFERENT_HASH',
        };
      }

      // 5. リビジョン逆行の試行（遅延ワーカーによる巻き戻し防止）
      if (newPointer.sourceRevision < current.sourceRevision) {
        return {
          success: false,
          applied: false,
          current: { ...current },
          conflictReason: 'STALE_REVISION',
        };
      }

      // 6. 単調増加更新の適用
      const updated: DossierPointer = {
        ...newPointer,
        updatedAt: newPointer.updatedAt || Date.now(),
      };
      this.pointers.set(newPointer.entityId, updated);

      return {
        success: true,
        applied: true,
        current: { ...updated },
      };
    });
  }
}

/**
 * Cloudflare D1 (SQLite) 用のアトミック更新SQL生成ヘルパー
 * 並行Worker間でも単一トランザクション / 条件付きUPDATEで巻き戻しを防ぐ。
 */
export function buildD1PointerUpsertSql(pointer: DossierPointer): {
  sql: string;
  params: (string | number)[];
} {
  return {
    sql: `
      INSERT INTO dossier_pointers (entity_id, hash, source_revision, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(entity_id) DO UPDATE SET
        hash = excluded.hash,
        source_revision = excluded.source_revision,
        updated_at = excluded.updated_at
      WHERE excluded.source_revision > dossier_pointers.source_revision;
    `.trim(),
    params: [
      pointer.entityId,
      pointer.hash,
      pointer.sourceRevision,
      pointer.updatedAt || Date.now(),
    ],
  };
}
