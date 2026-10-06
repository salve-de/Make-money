/** 購入・紹介 API を呼ぶ共通処理。失敗はサーバーが返した日本語の理由をそのまま画面に出す。 */
export class CommerceRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'CommerceRequestError';
  }
}

export async function commerceRequest<T>(
  path: string,
  token: string,
  init: { method?: 'GET' | 'POST' | 'PUT'; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method ?? 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
      signal: init.signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new CommerceRequestError('通信できませんでした。接続を確かめてもう一度お試しください', 0);
  }
  let data: unknown = null;
  try { data = await response.json(); } catch { /* 本文なし */ }
  if (!response.ok) {
    const message = data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
      ? (data as { error: string }).error
      : '処理できませんでした。時間をおいてもう一度お試しください';
    throw new CommerceRequestError(message, response.status);
  }
  return data as T;
}

export function newRequestKey(): string {
  return crypto.randomUUID().replace(/-/g, '');
}
