import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMyBusinessSales, patchBusinessSale, postBusinessSaleDraft, postBusinessSaleInquiry } from './business-sale-client';

let fetchMock: ReturnType<typeof vi.fn>;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  fetchMock = vi.fn(async () => json({ success: true, listing: { id: 'l1', status: 'draft' } }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('business sale API client', () => {
  it('posts a draft with the bearer token and a JSON body', async () => {
    const result = await postBusinessSaleDraft('tok', { title: 'T', category: 'saas' });
    expect(result).toEqual({ ok: true, data: { id: 'l1', status: 'draft' } });
    expect(fetchMock).toHaveBeenCalledWith('/api/marketplace/businesses', {
      method: 'POST',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
      body: '{"title":"T","category":"saas"}',
      cache: 'no-store',
      signal: undefined,
    });
  });

  it('patches the listing id given, encoded into the path', async () => {
    await patchBusinessSale('tok', 'id-1', { status: 'published' });
    expect(fetchMock).toHaveBeenLastCalledWith('/api/marketplace/businesses/id-1', expect.objectContaining({ method: 'PATCH', body: '{"status":"published"}' }));
    await patchBusinessSale('tok', 'a/b?c', {});
    expect(fetchMock.mock.calls[1][0]).toBe('/api/marketplace/businesses/a%2Fb%3Fc');
  });

  it('reads my listings with no body and no content type, passing the abort signal', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true, listings: [{ id: 'l1' }] }));
    const controller = new AbortController();
    expect(await getMyBusinessSales('tok', controller.signal)).toEqual({ ok: true, data: [{ id: 'l1' }] });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/marketplace/businesses/mine');
    expect(init).toMatchObject({ method: 'GET', headers: { Authorization: 'Bearer tok' }, body: undefined, signal: controller.signal });
    expect(init.headers).not.toHaveProperty('Content-Type');
  });

  it('treats a missing listings array as empty', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true }));
    expect(await getMyBusinessSales('tok')).toEqual({ ok: true, data: [] });
  });

  it('posts an inquiry to the listing id', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true, inquiryId: 'i1' }, 201));
    expect(await postBusinessSaleInquiry('tok', 'l 1', { message: 'm', contactEmail: 'a@example.com' })).toEqual({ ok: true, data: null });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/marketplace/businesses/l%201/inquiries');
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({ message: 'm', contactEmail: 'a@example.com' });
  });

  it('returns the server message and field for a rejected request', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: '月商（円）は整数で入力してください', field: 'monthlyRevenueJpy' }, 400));
    expect(await postBusinessSaleDraft('tok', {})).toEqual({
      ok: false, status: 400, message: '月商（円）は整数で入力してください', field: 'monthlyRevenueJpy',
    });
    fetchMock.mockResolvedValueOnce(json({ error: '同じ掲載への問い合わせは1日1回までです' }, 429));
    expect(await postBusinessSaleInquiry('tok', 'l1', { message: 'm', contactEmail: 'a@example.com' })).toEqual({
      ok: false, status: 429, message: '同じ掲載への問い合わせは1日1回までです', field: undefined,
    });
  });

  it('falls back to a plain message when the failure has no readable body', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }));
    const result = await patchBusinessSale('tok', 'l1', {});
    expect(result).toMatchObject({ ok: false, status: 502 });
    expect(result.ok ? '' : result.message).toContain('処理できませんでした');
  });

  it('reports a network failure without throwing', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const result = await postBusinessSaleDraft('tok', {});
    expect(result).toMatchObject({ ok: false, status: 0 });
    expect(result.ok ? '' : result.message).toContain('通信に失敗しました');
  });
});
