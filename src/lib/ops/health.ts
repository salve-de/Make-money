/**
 * 死活監視用のヘルスチェック。外部の監視サービスから認証なしで叩く前提。
 * 返すのは「動いているか」だけ。内部のエラー文・件数・接続先・環境変数は一切返さない。
 */

export type HealthCheckResult = 'ok' | 'ng';

export interface HealthChecks {
  /** D1（APP_DB）に `SELECT 1` が通るか。 */
  database: HealthCheckResult;
  /** 公開カタログ（公開版の要約）が読めて、件数が公開版の記録と一致するか。 */
  catalog: HealthCheckResult;
}

export interface HealthReport {
  status: 'ok' | 'down';
  version: string;
  /** 配備中の公開版（catalog release）の識別子（要約のハッシュの先頭12文字）。公開データの印で、秘密ではない。 */
  release: string;
  time: string;
  checks: HealthChecks;
}

export interface HealthDependencies {
  /** D1 に `SELECT 1` を投げる。失敗は例外にする。 */
  pingDatabase: () => Promise<unknown>;
  /** 公開カタログを読む。件数を返す。読めない時は例外にする。 */
  readCatalogCount: () => Promise<number>;
  /** 公開版の記録上の件数。 */
  expectedCatalogCount: number;
  version: string;
  /** 配備中の公開版の要約ハッシュ（全体）。応答には先頭12文字だけ出す。 */
  releaseHash: string;
  now?: () => Date;
  /** 各確認の上限（ミリ秒）。 */
  timeoutMs?: number;
}

export const DEFAULT_HEALTH_TIMEOUT_MS = 4_000;

async function settle(task: () => Promise<boolean>, timeoutMs: number): Promise<HealthCheckResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });
    // 例外・タイムアウト・偽はすべて ng。理由は外へ出さない
    return (await Promise.race([task(), timeout])) ? 'ok' : 'ng';
  } catch {
    return 'ng';
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** バージョン表記を、画面や応答に出して安全な短い文字列へ整える。 */
export function sanitizeVersion(value: string | undefined): string {
  const cleaned = (value ?? '').trim();
  return /^[A-Za-z0-9._+-]{1,40}$/.test(cleaned) ? cleaned : 'unknown';
}

export async function runHealthChecks(dependencies: HealthDependencies): Promise<HealthReport> {
  const timeoutMs = dependencies.timeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
  const [database, catalog] = await Promise.all([
    settle(async () => { await dependencies.pingDatabase(); return true; }, timeoutMs),
    settle(async () => (await dependencies.readCatalogCount()) === dependencies.expectedCatalogCount, timeoutMs),
  ]);
  return {
    status: database === 'ok' && catalog === 'ok' ? 'ok' : 'down',
    version: sanitizeVersion(dependencies.version),
    release: /^[a-f0-9]{64}$/.test(dependencies.releaseHash) ? dependencies.releaseHash.slice(0, 12) : 'unknown',
    time: (dependencies.now?.() ?? new Date()).toISOString(),
    checks: { database, catalog },
  };
}
