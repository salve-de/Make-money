import { AsyncLocalStorage } from 'node:async_hooks';

import type { RelayClient } from './client';

const scope = new AsyncLocalStorage<RelayClient>();

/**
 * いま使う SellRelay の接続。既定は null（未接続）で、掲載と作者の外部申込みだけが動く。
 * 本番の接続・環境変数の秘密・OAuth・外部への通信は、ここでは一切有効にしない。
 */
export function distributionClient(): RelayClient | null {
  return scope.getStore() ?? null;
}

/** テストでだけ、偽の接続を処理の範囲に差し込む。HTTP の入力で選ばれることは無い。 */
export function withDistributionClient<T>(client: RelayClient, run: () => T): T {
  return scope.run(client, run);
}
