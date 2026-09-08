type CloudflareRuntimeEnv = Record<string, unknown>;

let runtimeEnvPromise: Promise<CloudflareRuntimeEnv | null> | undefined;

/**
 * OpenNext/Workersの実行時envを取得する。
 * Node.jsで直接起動した場合はCloudflareコンテキストが無いためnullを返す。
 */
export async function getCloudflareRuntimeEnv(): Promise<CloudflareRuntimeEnv | null> {
  runtimeEnvPromise ??= (async () => {
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');
      const context = await getCloudflareContext({ async: true });
      return context.env as unknown as CloudflareRuntimeEnv;
    } catch {
      return null;
    }
  })();

  return runtimeEnvPromise;
}

/**
 * Node.jsの環境変数を優先し、Workersではbinding/secretのenvを読む。
 * 値そのものをログへ出さない前提で、サーバー専用の呼び出し元から使う。
 */
export async function getRuntimeEnvValue(name: string): Promise<string | undefined> {
  const processValue = process.env[name]?.trim();
  if (processValue) return processValue;

  const runtimeEnv = await getCloudflareRuntimeEnv();
  const runtimeValue = runtimeEnv?.[name];
  return typeof runtimeValue === 'string' && runtimeValue.trim()
    ? runtimeValue.trim()
    : undefined;
}
