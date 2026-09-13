type CloudflareRuntimeEnv = Record<string, unknown>;

/**
 * OpenNext/Workersの実行時envを取得する。
 * Node.jsで直接起動した場合はCloudflareコンテキストが無いためnullを返す。
 */
export async function getCloudflareRuntimeEnv(): Promise<CloudflareRuntimeEnv | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    // Only use context installed by the Worker entrypoint or explicit dev setup.
    // Async mode starts a Wrangler simulator in plain Node.js production.
    const context = getCloudflareContext();
    return context.env as unknown as CloudflareRuntimeEnv;
  } catch {
    return null;
  }
}

/**
 * Node.jsの環境変数を優先し、Workersではbinding/secretのenvを読む。
 * 値そのものをログへ出さない前提で、サーバー専用の呼び出し元から使う。
 */
export async function getRuntimeEnvValue(name: string, options: { runtimeFirst?: boolean } = {}): Promise<string | undefined> {
  const readRuntimeValue = async (): Promise<string | undefined> => {
    const runtimeEnv = await getCloudflareRuntimeEnv();
    const runtimeValue = runtimeEnv?.[name];
    return typeof runtimeValue === 'string' && runtimeValue.trim()
      ? runtimeValue.trim()
      : undefined;
  };

  if (options.runtimeFirst) {
    const runtimeValue = await readRuntimeValue();
    if (runtimeValue) return runtimeValue;
  }

  const processValue = process.env[name]?.trim();
  if (processValue) return processValue;
  return readRuntimeValue();
}
