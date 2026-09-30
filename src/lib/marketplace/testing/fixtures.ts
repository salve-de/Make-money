import { NextRequest } from 'next/server';
import type { DatabaseSync } from 'node:sqlite';

import type { BusinessSaleFields } from '@/shared/business-sale';

/** テスト専用の共通データ。本番コードからは import しない。 */
export const listingFields: BusinessSaleFields = {
  title: 'Camera Shop',
  summary: '中古カメラを仕入れてネットで販売しています。月の受注は約120件です。',
  category: 'ecommerce',
  establishedYear: 2021,
  monthlyRevenueJpy: 1_200_000,
  monthlyProfitJpy: 300_000,
  askingPriceJpy: 4_500_000,
  reasonForSale: '本業に専念するため',
  includedAssets: 'ドメイン、ショップのアカウント',
  sellerName: '山田商店',
};

export interface SeedOptions {
  id?: string;
  userId?: string;
  slug?: string;
  title?: string;
  status?: 'draft' | 'published' | 'closed';
  category?: string;
  askingPriceJpy?: number;
  updatedAt?: string;
  revenueBasis?: string;
  verificationId?: string | null;
}

/** 状態や更新日時を自由に決めた掲載を、SQL で直接入れる。id を返す。 */
export function seedBusinessSale(database: DatabaseSync, options: SeedOptions = {}): string {
  const id = options.id ?? crypto.randomUUID();
  database.prepare(
    `INSERT INTO business_sale_listings(id,user_id,slug,title,summary,category,established_year,monthly_revenue_jpy,monthly_profit_jpy,
       asking_price_jpy,revenue_basis,verification_id,reason_for_sale,included_assets,seller_name,status,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id, options.userId ?? 'seller-1', options.slug ?? `slug-${id.slice(0, 8)}`, options.title ?? `Title ${id.slice(0, 4)}`,
    listingFields.summary, options.category ?? 'ecommerce', 2021, 1_200_000, 300_000, options.askingPriceJpy ?? 4_500_000,
    options.revenueBasis ?? 'self_reported', options.verificationId ?? null, listingFields.reasonForSale,
    listingFields.includedAssets, listingFields.sellerName, options.status ?? 'published',
    options.updatedAt ?? '2026-09-01 00:00:00', options.updatedAt ?? '2026-09-01 00:00:00',
  );
  return id;
}

export function listingRow(database: DatabaseSync, id: string): Record<string, unknown> | undefined {
  return database.prepare('SELECT * FROM business_sale_listings WHERE id=?').get(id) as Record<string, unknown> | undefined;
}

export function inquiryRows(database: DatabaseSync): Record<string, unknown>[] {
  return database.prepare('SELECT * FROM business_sale_inquiries ORDER BY created_at,id').all() as Record<string, unknown>[];
}

/** 作成 API に送る、正しい本文。 */
export function createBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...listingFields, ...overrides };
}

/** Bearer トークン付き（または無し）の JSON リクエスト。rawBody を渡すと本文をそのまま送る。 */
export function jsonRequest(
  url: string,
  init: { method?: string; body?: unknown; rawBody?: string; token?: string | null } = {},
): NextRequest {
  const headers: Record<string, string> = {};
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const hasBody = init.rawBody !== undefined || init.body !== undefined;
  if (hasBody) headers['Content-Type'] = 'application/json';
  return new NextRequest(url, {
    method: init.method ?? (hasBody ? 'POST' : 'GET'),
    headers,
    body: init.rawBody ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
  });
}
