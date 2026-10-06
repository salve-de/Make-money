/**
 * 掲載を外部の SellRelay（紹介販売の仕組み）へつなぐ時の、ブラウザへ渡してよい形。
 * 利用者ID・SellRelay 側のID・SellRelay の紹介コードは含めない。
 *
 * Make-Money 内のテスト購入の紹介（marketplace-commerce）とは別の経路。こちらは作者の既存の申込み・決済URLへ
 * 紹介の印を付けて送るだけで、決済・報酬の記録は SellRelay 側が持つ。
 */

export const DISTRIBUTION_CATEGORIES = ['business', 'productivity', 'design', 'development', 'lifestyle'] as const;
export const DISTRIBUTION_PLATFORMS = ['web', 'ios', 'android'] as const;
export const DISTRIBUTION_CURRENCIES = ['JPY', 'USD'] as const;

/** SellRelay の商品下書きの制約（e53f21ff 時点）。報酬率は 0.01% 単位（100 = 1%）。 */
export const DISTRIBUTION_LIMITS = {
  name: [1, 50],
  tagline: [5, 90],
  description: [20, 2500],
  audience: [3, 200],
  price: [1, 10_000_000],
  rateBp: [100, 8000],
  months: [1, 24],
} as const;

export interface DistributionTerms {
  name: string;
  tagline: string;
  description: string;
  audience: string;
  category: (typeof DISTRIBUTION_CATEGORIES)[number];
  platforms: (typeof DISTRIBUTION_PLATFORMS)[number][];
  /** 最小通貨単位の整数（円、またはセント） */
  price: number;
  currency: (typeof DISTRIBUTION_CURRENCIES)[number];
  /** 紹介報酬率。0.01% 単位 */
  rate: number;
  /** 紹介報酬を払う月数 */
  months: number;
}

export type DistributionState = 'listing_only' | 'account_required' | 'unlinked' | 'checking' | 'linked';

export interface DistributionStatus {
  state: DistributionState;
  /** 'contract-test' はテスト用の偽接続。画面では本番連携として扱わない。 */
  mode: 'contract-test' | 'live' | null;
  canLink: boolean;
  canRefer: boolean;
  /** /marketplace/go/{32桁} だけ。外部のURLは渡さない。 */
  referralUrl: string | null;
}

export const LISTING_ONLY: DistributionStatus = { state: 'listing_only', mode: null, canLink: false, canRefer: false, referralUrl: null };

export const DISTRIBUTION_REFERRAL_PATH = /^\/marketplace\/go\/[a-f0-9]{32}$/;

const STATES: readonly string[] = ['listing_only', 'account_required', 'unlinked', 'checking', 'linked'];

/** API の応答を検査する。形が違えば例外。 */
export function parseDistributionStatus(value: unknown): DistributionStatus {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid distribution response');
  const row = value as Record<string, unknown>;
  if (typeof row.state !== 'string' || !STATES.includes(row.state)
    || (row.mode !== null && row.mode !== 'contract-test' && row.mode !== 'live')
    || typeof row.canLink !== 'boolean' || typeof row.canRefer !== 'boolean'
    || (row.referralUrl !== null && (typeof row.referralUrl !== 'string' || !DISTRIBUTION_REFERRAL_PATH.test(row.referralUrl)))) {
    throw new Error('Invalid distribution response');
  }
  return {
    state: row.state as DistributionState,
    mode: row.mode,
    canLink: row.canLink,
    canRefer: row.canRefer,
    referralUrl: row.referralUrl as string | null,
  };
}

/** サーバーの理由コードを画面の日本語にする。 */
export const DISTRIBUTION_ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: 'ログインが必要です',
  ACCOUNT_REQUIRED: 'SellRelayのアカウントとの連携が必要です。現在は掲載のみです',
  RELAY_NOT_CONNECTED: '紹介販売の連携はまだ接続されていません。通常の掲載・申込みは使えます',
  SELF_REFERRAL: '自分の商品には紹介リンクを作れません',
  PLATFORM_REFERRAL_NOT_IMPLEMENTED: '運営自身の送客はこの紹介リンクでは扱いません',
  REFERRAL_NOT_READY: 'SellRelay側で紹介の許可、または販売の準備が済んでいません',
  REFERRAL_NOT_FOUND: '紹介リンクが見つかりません',
  LISTING_CHANGED: '連携した後に掲載内容が変わっています。内容を確かめてください',
  TERMS_CHANGED: '連携した時の条件と違います。元の条件を確かめてください',
  PRODUCT_MATCH_AMBIGUOUS: '対応するSellRelayの商品を1つに決められません。SellRelay側の商品を確かめてください',
  RELAY_PRODUCT_CHANGED: 'SellRelay側の商品内容が変わっています。内容を確かめてください',
  RELAY_PRODUCT_REJECTED: 'SellRelayが商品の下書きを受け付けませんでした。入力を確かめてもう一度お試しください',
  RELAY_IDENTITY_MISMATCH: 'SellRelayのアカウントが一致しません',
  RELAY_REFERRAL_CHANGED: 'SellRelay側の紹介情報が変わっています。もう一度お試しください',
  LISTING_NOT_LINKED: 'この掲載はまだSellRelayにつながっていません',
  LISTING_NOT_FOUND: 'この掲載を確認できません（公開中の自分の掲載だけ連携できます）',
  INVALID_TERMS: '商品情報・価格・紹介条件の入力を確かめてください',
  INVALID_INPUT: '送信内容が正しくありません',
  INVALID_REFERENCE: '指定が正しくありません',
  UNSAFE_URL: '登録したサービスURL・申込みURLを確かめてください（https の公開URLだけ使えます）',
  UNSAFE_REDIRECT: '紹介先のURLが登録内容と一致しないため、移動を止めました',
  INVALID_RELAY_ORIGIN: '紹介販売の接続設定が正しくありません',
  RATE_LIMITED: '操作の回数が上限に達しました。しばらくしてからもう一度お試しください',
  INPUT_TOO_LARGE: '送信内容が大きすぎます',
  RELAY_UNAVAILABLE: '紹介販売の連携を確認できませんでした。時間をおいてもう一度お試しください',
};

export function distributionErrorMessage(code: unknown): string {
  return (typeof code === 'string' && DISTRIBUTION_ERROR_MESSAGES[code]) || DISTRIBUTION_ERROR_MESSAGES.RELAY_UNAVAILABLE;
}
