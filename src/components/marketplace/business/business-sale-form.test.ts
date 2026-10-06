import { describe, expect, it } from 'vitest';

import type { OwnedBusinessSaleListing } from '@/shared/business-sale';
import {
  checkBusinessSaleForm,
  EMPTY_BUSINESS_SALE_FORM,
  formFromListing,
  toBusinessSalePayload,
  type BusinessSaleForm,
} from './business-sale-form';

const NOW = new Date('2026-09-29T03:00:00Z');

const complete: BusinessSaleForm = {
  title: '中古カメラ専門のネットショップ',
  category: 'ecommerce',
  establishedYear: '2021',
  monthlyRevenueJpy: '1,200,000',
  monthlyProfitJpy: '300000',
  askingPriceJpy: '４，５００，０００',
  summary: '中古カメラを仕入れてネットで販売しています。月の受注は約120件です。',
  reasonForSale: '本業に専念するため',
  includedAssets: 'ドメイン、ショップのアカウント',
  sellerName: '',
};

describe('toBusinessSalePayload', () => {
  it('sends exactly the ten listing fields, with amounts as whole numbers', () => {
    const payload = toBusinessSalePayload(complete);
    expect(Object.keys(payload).sort()).toEqual([
      'askingPriceJpy', 'category', 'establishedYear', 'includedAssets', 'monthlyProfitJpy',
      'monthlyRevenueJpy', 'reasonForSale', 'sellerName', 'summary', 'title',
    ]);
    expect(payload).toMatchObject({
      establishedYear: 2021,
      monthlyRevenueJpy: 1_200_000,
      monthlyProfitJpy: 300_000,
      askingPriceJpy: 4_500_000,
      category: 'ecommerce',
    });
  });

  it('never carries the revenue basis, a verification record, a status, an owner or a link', () => {
    const json = JSON.stringify(toBusinessSalePayload(complete));
    for (const forbidden of ['revenueBasis', 'revenue_basis', 'verification', 'status', 'userId', 'user_id', 'slug', 'url', 'Url']) {
      expect(json, forbidden).not.toContain(forbidden);
    }
  });

  it('drops an empty amount from the JSON, and turns an unreadable one into null instead of another number', () => {
    const json = JSON.parse(JSON.stringify(toBusinessSalePayload({ ...EMPTY_BUSINESS_SALE_FORM, monthlyRevenueJpy: '1.5', askingPriceJpy: '' }))) as Record<string, unknown>;
    expect(json).not.toHaveProperty('askingPriceJpy');
    expect(json.monthlyRevenueJpy).toBeNull();
  });
});

describe('formFromListing', () => {
  it('turns a stored listing back into form text', () => {
    const listing: OwnedBusinessSaleListing = {
      id: 'l1', slug: 's', title: 'T事業', summary: '説明', category: 'saas', establishedYear: 2020, monthlyRevenueJpy: 500_000,
      monthlyProfitJpy: 0, askingPriceJpy: 1_000_000, revenueBasis: 'self_reported', sellerName: '', updatedAt: 'x',
      reasonForSale: '理由', includedAssets: '資産', status: 'draft', reviewNote: null, createdAt: 'y',
    };
    expect(formFromListing(listing)).toEqual({
      title: 'T事業', category: 'saas', establishedYear: '2020', monthlyRevenueJpy: '500000', monthlyProfitJpy: '0',
      askingPriceJpy: '1000000', summary: '説明', reasonForSale: '理由', includedAssets: '資産', sellerName: '',
    });
  });
});

describe('checkBusinessSaleForm', () => {
  it('accepts a complete form for saving and publishing', () => {
    expect(checkBusinessSaleForm(complete, 'save', NOW)).toEqual({ ok: true });
    expect(checkBusinessSaleForm(complete, 'publish', NOW)).toEqual({ ok: true });
  });

  it('stops a form the server would reject, naming the field', () => {
    expect(checkBusinessSaleForm({ ...complete, title: '' }, 'save', NOW)).toMatchObject({ ok: false, field: 'title' });
    expect(checkBusinessSaleForm({ ...complete, establishedYear: '' }, 'save', NOW)).toMatchObject({ ok: false, field: 'establishedYear' });
    expect(checkBusinessSaleForm({ ...complete, establishedYear: '2027' }, 'save', NOW)).toMatchObject({ ok: false, field: 'establishedYear' });
    expect(checkBusinessSaleForm({ ...complete, monthlyRevenueJpy: '1.5' }, 'save', NOW)).toMatchObject({ ok: false, field: 'monthlyRevenueJpy', message: '月商（円）は整数で入力してください' });
    expect(checkBusinessSaleForm({ ...complete, askingPriceJpy: '' }, 'save', NOW)).toMatchObject({ ok: false, field: 'askingPriceJpy' });
    expect(checkBusinessSaleForm({ ...complete, monthlyProfitJpy: '2000000' }, 'save', NOW)).toMatchObject({ ok: false, field: 'monthlyProfitJpy' });
    expect(checkBusinessSaleForm({ ...complete, summary: 'https://example.com' }, 'save', NOW)).toMatchObject({ ok: false, field: 'summary' });
  });

  it('lets an incomplete draft be saved but not published', () => {
    const draft = { ...complete, summary: '短い', reasonForSale: '', includedAssets: '' };
    expect(checkBusinessSaleForm(draft, 'save', NOW)).toEqual({ ok: true });
    expect(checkBusinessSaleForm(draft, 'publish', NOW)).toMatchObject({ ok: false, field: 'summary' });
    expect(checkBusinessSaleForm({ ...complete, reasonForSale: '' }, 'publish', NOW)).toMatchObject({ ok: false, field: 'reasonForSale' });
    expect(checkBusinessSaleForm({ ...complete, includedAssets: '' }, 'publish', NOW)).toMatchObject({ ok: false, field: 'includedAssets' });
  });
});
