import { MARKETPLACE_CATEGORIES, MARKETPLACE_CATEGORY_LABELS } from './marketplace-listing';

/** 既存マーケット（製品）の区分に、事業の売買で使う4区分を足したもの。 */
export const BUSINESS_SALE_CATEGORIES = [
  ...MARKETPLACE_CATEGORIES,
  'ecommerce',
  'content',
  'saas',
  'service',
] as const;

export type BusinessSaleCategory = (typeof BUSINESS_SALE_CATEGORIES)[number];

export const BUSINESS_SALE_CATEGORY_LABELS: Record<BusinessSaleCategory, string> = {
  ...MARKETPLACE_CATEGORY_LABELS,
  ecommerce: 'EC・ネット販売',
  content: 'ブログ・情報サイト',
  saas: 'SaaS',
  service: 'サービス・受託',
};

/**
 * 掲載の状態。掲載者が公開を申請すると pending_review になり、運営者が承認したものだけが published になる。
 * 掲載者が自分で published・rejected にすることはできない。
 */
export const BUSINESS_SALE_STATUSES = ['draft', 'pending_review', 'published', 'rejected', 'closed'] as const;
export type BusinessSaleStatus = (typeof BUSINESS_SALE_STATUSES)[number];

/** 掲載者が API に送れる状態 */
export const BUSINESS_SALE_REQUESTABLE_STATUSES = ['draft', 'pending_review', 'closed'] as const;
export type BusinessSaleRequestedStatus = (typeof BUSINESS_SALE_REQUESTABLE_STATUSES)[number];

export const BUSINESS_SALE_STATUS_LABELS: Record<BusinessSaleStatus, string> = {
  draft: '下書き',
  pending_review: '審査待ち',
  published: '公開中',
  rejected: '却下',
  closed: '募集終了',
};

/** 売上の根拠。検証済みにできるのは売上検証の仕組みだけで、この機能の API からは付けられない。 */
export const BUSINESS_SALE_REVENUE_BASES = ['self_reported', 'stripe_verified'] as const;
export type BusinessSaleRevenueBasis = (typeof BUSINESS_SALE_REVENUE_BASES)[number];

export const BUSINESS_SALE_REVENUE_BASIS_LABELS: Record<BusinessSaleRevenueBasis, string> = {
  self_reported: '本人申告',
  stripe_verified: 'Stripeで確認済み',
};

/** 入力の長さ・金額の上限。DB の CHECK と揃え、金額の上限だけはアプリ側で持つ。 */
export const BUSINESS_SALE_LIMITS = {
  titleMin: 2,
  titleMax: 100,
  summaryMax: 600,
  /** 公開するときに最低限必要な説明の長さ */
  summaryPublishMin: 20,
  reasonMax: 400,
  assetsMax: 400,
  sellerNameMax: 50,
  establishedYearMin: 1900,
  /** 月商・月の利益の上限（10億円） */
  monthlyAmountMax: 1_000_000_000,
  /** 希望価格の上限（100億円） */
  askingPriceMax: 10_000_000_000,
  inquiryMessageMin: 10,
  inquiryMessageMax: 2000,
  contactEmailMax: 254,
} as const;

/** 掲載の id（randomUUID）と slug（英小文字・数字・ハイフン）の形。合わないものは DB を引かずに 404 にする。 */
export const BUSINESS_SALE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const BUSINESS_SALE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const BUSINESS_SALE_SLUG_MAX_LENGTH = 80;

/** 公開一覧の最大件数 */
export const BUSINESS_SALE_LIST_LIMIT = 100;

export const BUSINESS_SALE_NOTICE =
  '掲載内容は売り手の申告です。金鉱録は売買の仲介・価格の保証・契約の代行をしません。取引の前に、決済記録・契約書・税務書類を必ず確認してください。';

/** 売り手が入力する項目。公開・下書きのどちらでも同じ形。 */
export interface BusinessSaleFields {
  title: string;
  summary: string;
  category: BusinessSaleCategory;
  establishedYear: number;
  monthlyRevenueJpy: number;
  monthlyProfitJpy: number;
  askingPriceJpy: number;
  reasonForSale: string;
  includedAssets: string;
  sellerName: string;
}

/** 公開一覧の1行。売り手の user_id も買い手の連絡先も含めない。 */
export interface PublicBusinessSaleSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: BusinessSaleCategory;
  establishedYear: number;
  monthlyRevenueJpy: number;
  monthlyProfitJpy: number;
  askingPriceJpy: number;
  revenueBasis: BusinessSaleRevenueBasis;
  sellerName: string;
  updatedAt: string;
}

/** 公開詳細。一覧の項目に、手放す理由と引き渡すものが加わる。 */
export interface PublicBusinessSaleListing extends PublicBusinessSaleSummary {
  reasonForSale: string;
  includedAssets: string;
}

/** 売り手本人だけが見る掲載。 */
export interface OwnedBusinessSaleListing extends PublicBusinessSaleListing {
  status: BusinessSaleStatus;
  /** 却下の理由。掲載者本人にだけ返し、公開側には出さない */
  reviewNote: string | null;
  createdAt: string;
}

/** 売り手が管理画面で見る問い合わせ。買い手の user_id は含めない。 */
export interface BusinessSaleInquiryView {
  id: string;
  message: string;
  contactEmail: string;
  createdAt: string;
}

export interface OwnedBusinessSaleWithInquiries extends OwnedBusinessSaleListing {
  inquiryCount: number;
  inquiries: BusinessSaleInquiryView[];
}

/**
 * 希望価格 ÷ (月の利益 × 12)。年間の利益の何年分で売りに出しているかを表す。
 * 利益が0以下、または値が不正なときは倍率を出さない（null）。
 */
export function calcPriceMultiple(askingPriceJpy: number, monthlyProfitJpy: number): number | null {
  if (!Number.isFinite(askingPriceJpy) || !Number.isFinite(monthlyProfitJpy)) return null;
  if (askingPriceJpy < 0 || monthlyProfitJpy <= 0) return null;
  return askingPriceJpy / (monthlyProfitJpy * 12);
}

/** 倍率の表示。100倍未満は小数1桁、それ以上は整数。 */
export function formatPriceMultiple(multiple: number): string {
  if (multiple >= 100) return `${Math.round(multiple).toLocaleString('ja-JP')}倍`;
  return `${(Math.round(multiple * 10) / 10).toFixed(1)}倍`;
}
