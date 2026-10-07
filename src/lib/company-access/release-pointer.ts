import { manifestObjectKey, type PointerLogEntry, type ReleasePointer } from '@/shared/catalog-manifest';

/**
 * 「いま公開している版の目印」を進める手順（保存先に依存しない部分）。
 * 保存先の実装は scripts/publish-catalog-release.ts が R2 に結ぶ。試験では入れ物を差し替える。
 *
 * - 目印だけが書き換え可能（ETag で、読んだ版を上書きする時だけ書く）。事例データ・manifest は新規作成のみ。
 * - 書き換えるたびに、いつ・どの版から・どの版へを1件ずつ記録する（消さない）。
 */
export interface PointerStore {
  /** いまの目印と、その ETag。まだ無ければ null。 */
  read(): Promise<{ pointer: ReleasePointer; etag: string | null } | null>;
  /** 目印を書く。expectedEtag が null なら「まだ無い時だけ」、文字列なら「その版のままの時だけ」。 */
  write(pointer: ReleasePointer, expectedEtag: string | null): Promise<void>;
  /** 書き換えの記録を1件、新規に作る。 */
  log(entry: PointerLogEntry): Promise<void>;
}

export type AdvanceResult =
  | { status: 'ADVANCED'; from: string | null; to: string }
  | { status: 'UNCHANGED'; to: string };

export async function advanceReleasePointer(
  store: PointerStore,
  next: { manifestHash: string; publishedCount: number },
  now: Date = new Date(),
): Promise<AdvanceResult> {
  const current = await store.read();
  if (current?.pointer.manifestHash === next.manifestHash) {
    // 目印は進んだのに記録の書き込みだけ失敗していた場合に備え、同じ内容の記録を置き直す。
    // 記録の名前も中身も目印から決まり、同じものが既にあれば何も変わらないので、何度やっても安全。
    const { pointer } = current;
    await store.log({ version: 1, at: pointer.updatedAt, from: pointer.previous?.manifestHash ?? null, to: pointer.manifestHash, publishedCount: pointer.publishedCount });
    return { status: 'UNCHANGED', to: next.manifestHash };
  }
  const at = now.toISOString();
  const pointer: ReleasePointer = {
    version: 1,
    manifestHash: next.manifestHash,
    manifestKey: manifestObjectKey(next.manifestHash),
    publishedCount: next.publishedCount,
    updatedAt: at,
    previous: current ? { manifestHash: current.pointer.manifestHash, updatedAt: current.pointer.updatedAt } : null,
  };
  await store.write(pointer, current ? current.etag : null);
  await store.log({ version: 1, at, from: current?.pointer.manifestHash ?? null, to: next.manifestHash, publishedCount: next.publishedCount });
  return { status: 'ADVANCED', from: current?.pointer.manifestHash ?? null, to: next.manifestHash };
}

/** 記録の置き場所の名前。時刻の順に並び、同じ時刻でも版が違えば別の名前になる。 */
export function pointerLogKey(prefix: string, entry: PointerLogEntry): string {
  return `${prefix}${entry.at.replace(/[:.]/g, '-')}_${entry.to.slice(0, 12)}.json`;
}
