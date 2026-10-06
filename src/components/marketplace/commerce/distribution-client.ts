import {
  DISTRIBUTION_REFERRAL_PATH,
  distributionErrorMessage,
  parseDistributionStatus,
  type DistributionStatus,
} from '@/shared/marketplace-distribution';

/** 掲載⇔SellRelay 連携 API を呼ぶ。失敗はサーバーの理由コードを日本語にして投げる。 */
export class DistributionRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'DistributionRequestError';
  }
}

export async function distributionRequest(
  token: string | null,
  init: { query?: Record<string, string>; body?: unknown; signal?: AbortSignal },
): Promise<DistributionStatus> {
  const path = `/api/marketplace/distribution${init.query ? `?${new URLSearchParams(init.query)}` : ''}`;
  let response: Response;
  try {
    response = await fetch(path, {
      method: init.body === undefined ? 'GET' : 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
      signal: init.signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new DistributionRequestError('通信できませんでした。接続を確かめてもう一度お試しください', 0);
  }
  let data: unknown = null;
  try { data = await response.json(); } catch { /* 本文なし */ }
  if (!response.ok) {
    const code = data && typeof data === 'object' ? (data as { code?: unknown }).code : null;
    throw new DistributionRequestError(distributionErrorMessage(code), response.status);
  }
  try {
    return parseDistributionStatus(data);
  } catch {
    throw new DistributionRequestError(distributionErrorMessage(null), response.status);
  }
}

export type CopyResult = 'copied' | 'unavailable' | 'failed' | 'unsafe';

/** コピーしてよいのは、このサイトの /marketplace/go/{32桁} だけ。外部のURLは信用しない。 */
export async function copyDistributionReferralUrl(
  path: string,
  origin: string,
  clipboard: Pick<Clipboard, 'writeText'> | undefined,
): Promise<CopyResult> {
  let url: URL;
  try {
    const base = new URL(origin);
    if (!DISTRIBUTION_REFERRAL_PATH.test(path) || !['https:', 'http:'].includes(base.protocol) || base.username || base.password) return 'unsafe';
    url = new URL(path, base.origin);
  } catch {
    return 'unsafe';
  }
  if (!clipboard || typeof clipboard.writeText !== 'function') return 'unavailable';
  try {
    await clipboard.writeText(url.href);
    return 'copied';
  } catch {
    return 'failed';
  }
}
