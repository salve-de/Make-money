export interface BusinessDetailRequestInput {
  targetId: string;
  latestDossierHash?: string;
  knownCurated: boolean;
  knownFoundation: boolean;
}

export function businessDetailRequestUrls(input: BusinessDetailRequestInput): string[] {
  const entity = encodeURIComponent(input.targetId);
  const normal = `/api/businesses?entity_id=${entity}${input.latestDossierHash
    ? `&dossier_hash=${encodeURIComponent(input.latestDossierHash)}`
    : ''}`;
  const foundationOnly = `/api/businesses?entity_id=${entity}&foundationOnly=true`;

  if (input.knownCurated) return [normal];
  if (input.knownFoundation) return [foundationOnly];

  // A deep link can run before either catalog has loaded. Try the cheap
  // Foundation path first; if Foundation is absent or unavailable in this
  // environment, allow one normal lookup so curated deep links still resolve.
  return [foundationOnly, normal];
}

/** 一時的な失敗（Workers の資源上限 1102 の 503、途中で落ちた 500、ゲートウェイ系）。少し待てば同じ要求が通る。 */
const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);
const DEFAULT_RETRY_DELAYS_MS = [400, 1200];

export interface DetailRetryOptions {
  /** 最後の経路を取り直す前に待つ時間。要素の数だけ取り直す。 */
  retryDelaysMs?: readonly number[];
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function fetchBusinessDetailResponse(
  fetcher: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  input: BusinessDetailRequestInput,
  options: DetailRetryOptions = {},
): Promise<Response> {
  const urls = businessDetailRequestUrls(input);
  const retryDelays = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const sleep = options.sleep ?? defaultSleep;
  let response: Response | null = null;
  for (let index = 0; index < urls.length; index += 1) {
    const isLast = index + 1 === urls.length;
    // 最後の経路だけ、一時的な失敗を取り直す。途中の経路は従来どおり 404/503 で次の経路へ進む。
    for (let attempt = 0; ; attempt += 1) {
      try {
        response = await fetcher(urls[index]);
      } catch (error) {
        if (!isLast || attempt >= retryDelays.length) throw error;
        await sleep(retryDelays[attempt]);
        continue;
      }
      if (response.ok || !isLast || !TRANSIENT_STATUSES.has(response.status) || attempt >= retryDelays.length) break;
      await sleep(retryDelays[attempt]);
    }
    if (response.ok) return response;
    const mayTryNormalFallback =
      !isLast &&
      (response.status === 404 || response.status === 503);
    if (!mayTryNormalFallback) return response;
  }
  if (!response) throw new Error('Business detail request plan was empty');
  return response;
}
