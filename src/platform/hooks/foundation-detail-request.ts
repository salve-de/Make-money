export interface BusinessDetailRequestInput {
  targetId: string;
  latestDossierHash?: string;
}

/** 詳細の取得先。公開目録の事例だけを返す /api/businesses の1本だけ（収集基盤の直読みは無い）。 */
export function businessDetailRequestUrls(input: BusinessDetailRequestInput): string[] {
  const entity = encodeURIComponent(input.targetId);
  return [`/api/businesses?entity_id=${entity}${input.latestDossierHash
    ? `&dossier_hash=${encodeURIComponent(input.latestDossierHash)}`
    : ''}`];
}

/** 一時的な失敗（Workers の資源上限 1102 の 503、途中で落ちた 500、ゲートウェイ系）。少し待てば同じ要求が通る。 */
const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);
const DEFAULT_RETRY_DELAYS_MS = [400, 1200];

export interface DetailRetryOptions {
  /** 失敗を取り直す前に待つ時間。要素の数だけ取り直す。 */
  retryDelaysMs?: readonly number[];
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function fetchBusinessDetailResponse(
  fetcher: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  input: BusinessDetailRequestInput,
  options: DetailRetryOptions = {},
): Promise<Response> {
  const url = businessDetailRequestUrls(input)[0];
  const retryDelays = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const sleep = options.sleep ?? defaultSleep;
  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    try {
      response = await fetcher(url);
    } catch (error) {
      if (attempt >= retryDelays.length) throw error;
      await sleep(retryDelays[attempt]);
      continue;
    }
    if (response.ok || !TRANSIENT_STATUSES.has(response.status) || attempt >= retryDelays.length) return response;
    await sleep(retryDelays[attempt]);
  }
}
