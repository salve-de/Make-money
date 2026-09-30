import type { BusinessSaleCategory, OwnedBusinessSaleListing } from '@/shared/business-sale';
import { findPublishProblem, parseBusinessSaleCreate } from '@/shared/business-sale-input';
import { parseIntegerInput } from './format';

/** 掲載フォームの入力値。金額・開始年は、入力したままの文字で持つ。 */
export interface BusinessSaleForm {
  title: string;
  category: BusinessSaleCategory;
  establishedYear: string;
  monthlyRevenueJpy: string;
  monthlyProfitJpy: string;
  askingPriceJpy: string;
  summary: string;
  reasonForSale: string;
  includedAssets: string;
  sellerName: string;
}

export const EMPTY_BUSINESS_SALE_FORM: BusinessSaleForm = {
  title: '',
  category: 'ecommerce',
  establishedYear: '',
  monthlyRevenueJpy: '',
  monthlyProfitJpy: '',
  askingPriceJpy: '',
  summary: '',
  reasonForSale: '',
  includedAssets: '',
  sellerName: '',
};

export function formFromListing(listing: OwnedBusinessSaleListing): BusinessSaleForm {
  return {
    title: listing.title,
    category: listing.category,
    establishedYear: String(listing.establishedYear),
    monthlyRevenueJpy: String(listing.monthlyRevenueJpy),
    monthlyProfitJpy: String(listing.monthlyProfitJpy),
    askingPriceJpy: String(listing.askingPriceJpy),
    summary: listing.summary,
    reasonForSale: listing.reasonForSale,
    includedAssets: listing.includedAssets,
    sellerName: listing.sellerName,
  };
}

/**
 * API へ送る本文（作成・更新で共通）。決めた10項目だけを入れる。
 * 売上の根拠・検証の記録・状態は、ここには入れない（状態は公開するときにだけ呼び出し側が足す）。
 */
export function toBusinessSalePayload(form: BusinessSaleForm): Record<string, unknown> {
  return {
    title: form.title,
    summary: form.summary,
    category: form.category,
    establishedYear: parseIntegerInput(form.establishedYear),
    monthlyRevenueJpy: parseIntegerInput(form.monthlyRevenueJpy),
    monthlyProfitJpy: parseIntegerInput(form.monthlyProfitJpy),
    askingPriceJpy: parseIntegerInput(form.askingPriceJpy),
    reasonForSale: form.reasonForSale,
    includedAssets: form.includedAssets,
    sellerName: form.sellerName,
  };
}

export type FormCheck = { ok: true } | { ok: false; field: string; message: string };

/**
 * 送信前の確認。サーバーと同じ検証関数を使うので、通らない内容は送らない。
 * 'publish' では、公開に必要な説明・手放す理由・引き渡すものも確認する。
 */
export function checkBusinessSaleForm(form: BusinessSaleForm, intent: 'save' | 'publish', now?: Date): FormCheck {
  const parsed = parseBusinessSaleCreate(toBusinessSalePayload(form), now);
  if (!parsed.ok) return { ok: false, field: parsed.field, message: parsed.message };
  if (intent === 'publish') {
    const problem = findPublishProblem(parsed.value);
    if (problem) return { ok: false, ...problem };
  }
  return { ok: true };
}
