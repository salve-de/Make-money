import { expect } from 'vitest';

import type { PublicBusinessSaleListing, PublicBusinessSaleSummary } from '@/shared/business-sale';

/** テスト専用。renderToStaticMarkup の結果から、画面に見える文字だけを取り出す。 */
export function visibleText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * docs/design/TERMINAL_UI.md の禁止事項（丸いピル、12px 未満の文字、色の直書き、
 * 白の透明度指定、絵文字）が、描画した HTML に出ていないことを確かめる。
 */
export function expectTerminalStyle(html: string): void {
  expect(html).not.toMatch(/rounded-full/);
  expect(html).not.toMatch(/text-\[(?:9|10|11)px\]/);
  expect(html).not.toMatch(/(?:bg|text|border|shadow|from|to|via)-\[#[0-9a-fA-F]{3,8}\]/);
  expect(html).not.toMatch(/white\/\[/);
  expect(html).not.toMatch(/uppercase tracking-widest/);
  expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
}

export function summary(overrides: Partial<PublicBusinessSaleSummary> = {}): PublicBusinessSaleSummary {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'camera-shop-0123456789',
    title: '中古カメラ専門のネットショップ',
    summary: '中古カメラを仕入れてネットで販売しています。月の受注は約120件です。',
    category: 'ecommerce',
    establishedYear: 2021,
    monthlyRevenueJpy: 1_200_000,
    monthlyProfitJpy: 100_000,
    askingPriceJpy: 3_000_000,
    revenueBasis: 'self_reported',
    sellerName: '山田商店',
    updatedAt: '2026-09-20T03:00:00.000Z',
    ...overrides,
  };
}

export function detail(overrides: Partial<PublicBusinessSaleListing> = {}): PublicBusinessSaleListing {
  return {
    ...summary(),
    reasonForSale: '本業に専念するため',
    includedAssets: 'ドメイン、ショップのアカウント、在庫リスト',
    ...overrides,
  };
}
