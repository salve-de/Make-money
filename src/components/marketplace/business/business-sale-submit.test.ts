import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OwnedBusinessSaleListing } from '@/shared/business-sale';
import type { BusinessSaleForm } from './business-sale-form';
import { submitBusinessSaleForm, submitBusinessSaleInquiry } from './business-sale-submit';

const TEN_KEYS = [
  'askingPriceJpy', 'category', 'establishedYear', 'includedAssets', 'monthlyProfitJpy',
  'monthlyRevenueJpy', 'reasonForSale', 'sellerName', 'summary', 'title',
];

const form: BusinessSaleForm = {
  title: '中古カメラ専門のネットショップ',
  category: 'ecommerce',
  establishedYear: '2021',
  monthlyRevenueJpy: '1200000',
  monthlyProfitJpy: '300000',
  askingPriceJpy: '4500000',
  summary: '中古カメラを仕入れてネットで販売しています。月の受注は約120件です。',
  reasonForSale: '本業に専念するため',
  includedAssets: 'ドメイン、ショップのアカウント',
  sellerName: '山田商店',
};

function listing(overrides: Partial<OwnedBusinessSaleListing> = {}): OwnedBusinessSaleListing {
  return {
    id: 'listing-1', slug: 'camera-shop-0123456789', title: form.title, summary: form.summary, category: 'ecommerce', establishedYear: 2021,
    monthlyRevenueJpy: 1_200_000, monthlyProfitJpy: 300_000, askingPriceJpy: 4_500_000, revenueBasis: 'self_reported', sellerName: '山田商店',
    updatedAt: '2026-09-29T00:00:00.000Z', reasonForSale: form.reasonForSale, includedAssets: form.includedAssets, status: 'draft',
    createdAt: '2026-09-29T00:00:00.000Z', ...overrides,
  };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
let fetchMock: ReturnType<typeof vi.fn>;
const calls = () => fetchMock.mock.calls.map(([url, init]) => ({
  url: url as string,
  method: (init as RequestInit).method,
  body: (init as RequestInit).body ? JSON.parse((init as RequestInit).body as string) as Record<string, unknown> : undefined,
}));

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('submitBusinessSaleForm: new listing', () => {
  it('saves a draft with one POST of the ten fields and no status', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true, listing: listing() }, 201));
    const outcome = await submitBusinessSaleForm({ token: 'tok', form, listingId: null, intent: 'draft' });
    expect(outcome).toEqual({ kind: 'saved', listing: listing(), leave: true });
    const [only, ...rest] = calls();
    expect(rest).toEqual([]);
    expect(only).toMatchObject({ url: '/api/marketplace/businesses', method: 'POST' });
    expect(Object.keys(only.body!).sort()).toEqual(TEN_KEYS);
    expect(only.body).toMatchObject({ title: form.title, monthlyRevenueJpy: 1_200_000, askingPriceJpy: 4_500_000, sellerName: '山田商店' });
  });

  it('publishes by creating the draft first, then changing only the status', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ success: true, listing: listing() }, 201))
      .mockResolvedValueOnce(json({ success: true, listing: listing({ status: 'published' }) }));
    const outcome = await submitBusinessSaleForm({ token: 'tok', form, listingId: null, intent: 'publish' });
    expect(outcome).toEqual({ kind: 'saved', listing: listing({ status: 'published' }), leave: true });
    const [create, publish] = calls();
    expect(create).toMatchObject({ url: '/api/marketplace/businesses', method: 'POST' });
    expect(Object.keys(create.body!).sort()).toEqual(TEN_KEYS);
    expect(publish).toEqual({ url: '/api/marketplace/businesses/listing-1', method: 'PATCH', body: { status: 'published' } });
  });

  it('keeps the saved draft when publishing fails, and never creates a second one', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ success: true, listing: listing() }, 201))
      .mockResolvedValueOnce(json({ error: '公開するには、手放す理由を書いてください', field: 'reasonForSale' }, 400));
    const outcome = await submitBusinessSaleForm({ token: 'tok', form, listingId: null, intent: 'publish' });
    expect(outcome).toEqual({
      kind: 'failed',
      field: 'reasonForSale',
      message: '下書きは保存しました。公開はできませんでした: 公開するには、手放す理由を書いてください',
      draft: listing(),
    });
    expect(calls().map((call) => call.method)).toEqual(['POST', 'PATCH']);
  });

  it('reports a rejected create without a draft', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: '作成の回数が上限に達しました。しばらくしてからもう一度お試しください' }, 429));
    const outcome = await submitBusinessSaleForm({ token: 'tok', form, listingId: null, intent: 'draft' });
    expect(outcome).toMatchObject({ kind: 'failed', message: expect.stringContaining('上限') });
    expect(outcome).not.toHaveProperty('draft');
    expect(calls()).toHaveLength(1);
  });
});

describe('submitBusinessSaleForm: existing listing', () => {
  it('saves a draft edit with one PATCH of the ten fields and no status', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true, listing: listing({ title: '更新後' }) }));
    const outcome = await submitBusinessSaleForm({ token: 'tok', form, listingId: 'listing-1', intent: 'draft' });
    expect(outcome).toEqual({ kind: 'saved', listing: listing({ title: '更新後' }), leave: false });
    const [only] = calls();
    expect(only).toMatchObject({ url: '/api/marketplace/businesses/listing-1', method: 'PATCH' });
    expect(Object.keys(only.body!).sort()).toEqual(TEN_KEYS);
    expect(calls()).toHaveLength(1);
  });

  it('publishes with the ten fields and the status in a single PATCH', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true, listing: listing({ status: 'published' }) }));
    const outcome = await submitBusinessSaleForm({ token: 'tok', form, listingId: 'listing-1', intent: 'publish' });
    expect(outcome).toMatchObject({ kind: 'saved', leave: true });
    const [only] = calls();
    expect(Object.keys(only.body!).sort()).toEqual([...TEN_KEYS, 'status'].sort());
    expect(only.body).toMatchObject({ status: 'published' });
    expect(calls()).toHaveLength(1);
  });

  it('saves changes to a published listing without touching the status', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true, listing: listing({ status: 'published' }) }));
    const outcome = await submitBusinessSaleForm({ token: 'tok', form, listingId: 'listing-1', intent: 'changes' });
    expect(outcome).toMatchObject({ kind: 'saved', leave: false });
    expect(calls()[0].body).not.toHaveProperty('status');
  });

  it('reports the server refusing a state change', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: '募集を終了した掲載は変更できません' }, 409));
    const outcome = await submitBusinessSaleForm({ token: 'tok', form, listingId: 'listing-1', intent: 'changes' });
    expect(outcome).toEqual({ kind: 'failed', field: '', message: '募集を終了した掲載は変更できません' });
  });
});

describe('submitBusinessSaleForm: nothing is sent for a form that would be rejected', () => {
  it.each(['draft', 'publish', 'changes'] as const)('checks the %s intent before any request', async (intent) => {
    const outcome = await submitBusinessSaleForm({ token: 'tok', form: { ...form, monthlyRevenueJpy: '1.5' }, listingId: null, intent });
    expect(outcome).toEqual({ kind: 'invalid', field: 'monthlyRevenueJpy', message: '月商（円）は整数で入力してください' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not publish or save changes to a listing that lacks the text a buyer needs', async () => {
    for (const intent of ['publish', 'changes'] as const) {
      const outcome = await submitBusinessSaleForm({ token: 'tok', form: { ...form, includedAssets: '' }, listingId: 'listing-1', intent });
      expect(outcome).toMatchObject({ kind: 'invalid', field: 'includedAssets' });
    }
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(json({ success: true, listing: listing() }, 201));
    expect(await submitBusinessSaleForm({ token: 'tok', form: { ...form, includedAssets: '' }, listingId: null, intent: 'draft' })).toMatchObject({ kind: 'saved' });
  });

  it('never sends the revenue basis, a verification record or an owner', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true, listing: listing() }, 201));
    await submitBusinessSaleForm({ token: 'tok', form, listingId: null, intent: 'draft' });
    const sent = JSON.stringify(calls().map((call) => call.body));
    for (const forbidden of ['revenueBasis', 'revenue_basis', 'verification', 'userId', 'stripe']) expect(sent).not.toContain(forbidden);
  });
});

describe('submitBusinessSaleInquiry', () => {
  const inquiry = { token: 'tok', listingId: 'listing-1', message: '  売上の推移を教えていただけますか。  ', contactEmail: ' Buyer@Example.COM ' };

  it('sends the trimmed message and the lowercase email, and nothing else', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true, inquiryId: 'i1' }, 201));
    expect(await submitBusinessSaleInquiry(inquiry)).toEqual({ ok: true });
    expect(calls()).toEqual([{
      url: '/api/marketplace/businesses/listing-1/inquiries',
      method: 'POST',
      body: { message: '売上の推移を教えていただけますか。', contactEmail: 'buyer@example.com' },
    }]);
  });

  it('sends nothing for a message that is too short or an email that is not valid', async () => {
    expect(await submitBusinessSaleInquiry({ ...inquiry, message: '短い' })).toEqual({ ok: false, message: '問い合わせ内容は10文字以上で入力してください' });
    expect(await submitBusinessSaleInquiry({ ...inquiry, contactEmail: 'buyer' })).toEqual({ ok: false, message: 'メールアドレスの形式が正しくありません' });
    expect(await submitBusinessSaleInquiry({ ...inquiry, contactEmail: '' })).toEqual({ ok: false, message: '連絡先のメールアドレスを入力してください' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the server message when the daily limit is reached', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: '同じ掲載への問い合わせは1日1回までです。明日以降にもう一度お試しください' }, 429));
    expect(await submitBusinessSaleInquiry(inquiry)).toEqual({ ok: false, message: '同じ掲載への問い合わせは1日1回までです。明日以降にもう一度お試しください' });
  });
});
