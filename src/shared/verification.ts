/**
 * 決済データ（Stripe）で確認できた売上。
 *
 * 公開してよい項目だけを持つ。運営者のユーザーID、決済アカウントID（ハッシュも含む）、
 * APIキーは、この型にもAPIの応答にも含めない。
 * 金額は通貨の最小単位（JPYは円、USDはセント）、時刻はUNIX秒。
 */
export type VerifiedRevenue = {
  entityId: string;
  provider: 'stripe';
  /** 決済アカウントに登録されたサイトのドメイン（www.を除いた小文字）。事例の公式サイトと一致したものだけが保存される。 */
  accountDomain: string;
  /** 決済アカウントの既定通貨（大文字3文字。例: JPY）。売上・月額はこの通貨だけで数える。 */
  currency: string;
  /** 直近30日に成功した支払いの合計から返金額を引いた額。返金が上回ると負になる。 */
  last30dRevenueMinor: number;
  /** 有効なサブスクリプションの月額換算の合計。割引・従量課金・別通貨などで正確に出せないときは null。 */
  mrrMinor: number | null;
  /** 有効なサブスクリプションの件数。別通貨の契約があるときなど、数えきれないときは null。 */
  activeSubscriptions: number | null;
  periodStart: number;
  periodEnd: number;
  verifiedAt: number;
};

/** 確認済みの事例一覧の1行（事例ごとの最新）。 */
export type VerifiedEntity = { entityId: string; verifiedAt: number };

/** POST /api/verification/stripe の本文。キーは1回の確認にだけ使い、保存しない。 */
export type VerificationSubmitRequest = { entityId: string; restrictedKey: string };

/** GET /api/verification?entity_id=... と POST /api/verification/stripe（成功時）の応答。 */
export type VerificationLookupResponse = { verification: VerifiedRevenue | null };

/** GET /api/verification/list の応答。 */
/** `unavailable` は一覧を読めなかったとき。空の一覧は「確認済みが無い」ではなく「今は分からない」。 */
export type VerificationListResponse = { verified: VerifiedEntity[]; unavailable?: true };

/** 売上を数える期間（日）。 */
export const VERIFICATION_WINDOW_DAYS = 30;

/** 同じ利用者が同じ事例を確認し直せるまでの間隔（秒）。 */
export const VERIFICATION_COOLDOWN_SECONDS = 60 * 60;

/** キーに付ける権限（すべて読み取りだけ）。Stripe画面での表記は変わることがある。 */
export const STRIPE_READ_PERMISSIONS = ['アカウント', '残高の取引', 'サブスクリプション'] as const;
export type StripeReadPermission = (typeof STRIPE_READ_PERMISSIONS)[number];

export const VERIFICATION_ERROR_CODES = [
  'unauthorized',
  'invalid_request',
  'too_large',
  'key_not_restricted',
  'key_malformed',
  'mode_mismatch',
  'too_many_attempts',
  'not_found',
  'entity_site_missing',
  'entity_site_shared',
  'stripe_site_missing',
  'site_mismatch',
  'key_rejected',
  'permission_missing',
  'currency_missing',
  'too_many_records',
  'cooldown',
  'stripe_unavailable',
  'unavailable',
] as const;
export type VerificationErrorCode = (typeof VERIFICATION_ERROR_CODES)[number];

/** 失敗時の応答。`error` は画面にそのまま出せる日本語。分岐には `code` を使う。 */
export type VerificationErrorResponse = {
  error: string;
  code: VerificationErrorCode;
  /** permission_missing のとき、キーに付けてほしい権限の一覧。 */
  permissions?: readonly StripeReadPermission[];
  /** cooldown のとき、次に確認できるまでの秒数。 */
  retryAfterSeconds?: number;
};
