import type { OwnedBusinessSaleListing, OwnedBusinessSaleWithInquiries } from '@/shared/business-sale';

/**
 * ブラウザから事業の売買 API を呼ぶ関数。送る内容の組み立て（method・宛先・ヘッダー）と、
 * エラー文の取り出しをここに集め、画面の部品からは切り離してテストできるようにしている。
 */
export type ClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; field?: string };

const NETWORK_ERROR = '通信に失敗しました。接続を確認して、もう一度お試しください';
const UNKNOWN_ERROR = '処理できませんでした。時間をおいてもう一度お試しください';

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function callApi<T>(
  token: string,
  path: string,
  init: { method: string; body?: unknown; signal?: AbortSignal },
  pick: (data: Record<string, unknown>) => T,
): Promise<ClientResult<T>> {
  try {
    const response = await fetch(path, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
      signal: init.signal,
    });
    const data = await readJson(response);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: typeof data.error === 'string' ? data.error : UNKNOWN_ERROR,
        field: typeof data.field === 'string' ? data.field : undefined,
      };
    }
    return { ok: true, data: pick(data) };
  } catch {
    return { ok: false, status: 0, message: NETWORK_ERROR };
  }
}

const listingOf = (data: Record<string, unknown>) => data.listing as OwnedBusinessSaleListing;

/** 下書きを作る。 */
export function postBusinessSaleDraft(token: string, payload: Record<string, unknown>) {
  return callApi(token, '/api/marketplace/businesses', { method: 'POST', body: payload }, listingOf);
}

/** 掲載を更新する。payload に status を足すと、公開・募集終了にもなる。 */
export function patchBusinessSale(token: string, id: string, payload: Record<string, unknown>) {
  return callApi(token, `/api/marketplace/businesses/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }, listingOf);
}

/** 自分の掲載と、届いた問い合わせ。 */
export function getMyBusinessSales(token: string, signal?: AbortSignal) {
  return callApi(
    token,
    '/api/marketplace/businesses/mine',
    { method: 'GET', signal },
    (data) => (Array.isArray(data.listings) ? data.listings as OwnedBusinessSaleWithInquiries[] : []),
  );
}

/** 掲載への問い合わせを送る。 */
export function postBusinessSaleInquiry(token: string, listingId: string, body: { message: string; contactEmail: string }) {
  return callApi(token, `/api/marketplace/businesses/${encodeURIComponent(listingId)}/inquiries`, { method: 'POST', body }, () => null);
}
