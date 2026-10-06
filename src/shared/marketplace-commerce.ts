/**
 * Make-Money 内の購入（テスト購入）と紹介の、ブラウザへ渡してよい形。
 * 利用者IDや紹介リンクの内部IDは含めない。
 */

/** 'test' = 実際の請求なしのテスト購入。'stripe_test' = Stripe のテスト鍵での決済（未接続）。'off' = 購入を受け付けない。 */
export type CommercePaymentMode = 'test' | 'stripe_test' | 'off';

export const REFERRAL_RATE_MAX_PERCENT = 50;
export const COMMERCE_PRICE_MIN_JPY = 100;
export const COMMERCE_PRICE_MAX_JPY = 10_000_000;

/** 掲載ページに出す販売条件。 */
export interface PublicCommerceOffer {
  priceJpy: number;
  referralRatePercent: number;
  mode: CommercePaymentMode;
}

/** 出品者が編集する販売条件。 */
export interface OwnedCommerceOffer {
  listingId: string;
  enabled: boolean;
  priceJpy: number;
  referralRatePercent: number;
  updatedAt: string;
}

export type CommerceOrderStatus = 'paid' | 'refunded';
export type ReferralNote = 'none' | 'credited' | 'self_excluded' | 'seller_excluded' | 'other_listing' | 'no_reward';

/** 受領書・購入一覧・販売一覧で使う注文。 */
export interface CommerceOrderView {
  orderId: string;
  listingSlug: string;
  title: string;
  priceJpy: number;
  mode: 'test';
  status: CommerceOrderStatus;
  createdAt: string;
  paidAt: string | null;
  refundedAt: string | null;
  /** 見ている人が買い手か売り手か */
  viewerRole: 'buyer' | 'seller';
  referral: {
    note: ReferralNote;
    /** 売り手にだけ出す。買い手には紹介があったかどうかだけ。 */
    ratePercent: number | null;
    rewardJpy: number | null;
  };
}

/** 紹介者の成果（掲載ごと）。 */
export interface ReferralSummary {
  code: string;
  listingSlug: string;
  title: string;
  ratePercent: number;
  clicks: number;
  orders: number;
  refundedOrders: number;
  accruedJpy: number;
  reversedJpy: number;
  createdAt: string;
}

export interface ReferralLedgerEntry {
  orderId: string;
  title: string;
  kind: 'accrued' | 'reversed';
  amountJpy: number;
  ratePercent: number;
  createdAt: string;
}

export interface OwnListingRow {
  listingId: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
  priceJpy: number | null;
  offerEnabled: boolean;
  updatedAt: string;
}

export interface CommerceActivity {
  purchases: CommerceOrderView[];
  sales: CommerceOrderView[];
  referrals: ReferralSummary[];
  ledger: ReferralLedgerEntry[];
  listings: OwnListingRow[];
}

/** 画面の価格表示。購入金額は丸めずに出す（「3万円」ではなく「29,800円」）。 */
export function formatExactYen(amountJpy: number): string {
  return `${Math.round(amountJpy).toLocaleString('ja-JP')}円`;
}

/** 価格×報酬率（基準点＝0.01%）から報酬額。1円未満は切り捨て。 */
export function referralRewardJpy(priceJpy: number, rateBp: number): number {
  return Math.floor((priceJpy * rateBp) / 10_000);
}

export const REFERRAL_NOTE_LABELS: Record<ReferralNote, string> = {
  none: '紹介なし',
  credited: '紹介経由（報酬を記録）',
  self_excluded: '自分の紹介リンクのため報酬なし',
  seller_excluded: '出品者本人の紹介リンクのため報酬なし',
  other_listing: '別の商品の紹介リンクのため報酬なし',
  no_reward: '紹介経由（この商品は報酬なし）',
};
