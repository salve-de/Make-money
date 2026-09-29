# 決済データによる売上確認

事例の運営者が、自分のStripeを**読み取り専用**でつなぐと、実際の売上を確認して「決済データで確認済み」と表示できる。運営者の自己申告ではなく、決済側の実データに基づく（TrustMRRと同じ考え方）。**キーは保存しない。**

## 運営者がやること

Stripeで「制限付きAPIキー」（`rk_live_` または `rk_test_` で始まるキー）を作り、次の3つを**読み取りだけ**で付ける。書き込み権限は付けない。

| 権限（読み取りのみ） | 使う理由 |
|---|---|
| アカウント | 決済アカウントのサイト（ビジネス設定のURL）と既定通貨を読む |
| 残高の取引 | 直近30日の売上（成功した支払い）と返金を数える |
| サブスクリプション | 有効な契約を月額に換算する |

Stripe画面での権限名は時期や言語で変わることがある。足りないときは、APIが「どの権限が足りないか」を日本語で返す。`sk_` で始まる通常のシークレットキーは受け付けない。

## サーバーが確認すること（この順）

1. Firebaseでログイン済み。本文は8KBまで。
2. キーが `rk_live_` / `rk_test_` で、この環境の決済モード（`paymentLiveMode()`）と同じ。本番に `rk_test_`、テストに `rk_live_` は不可。
3. 事例が公開されていて、公式サイトがある。公式サイトが共有サービス上（GitHub、Wikipedia、X など。`src/lib/verification/site-domain.ts` の簡易リスト）だと、ドメインの一致では持ち主を確認できないため受け付けない。
4. 同じ人が同じ事例を、直近1時間に確認していない。
5. Stripeの自分のアカウントから、サイトのドメイン（`www.` を除き小文字）を取り、事例の公式サイトのドメインと**完全一致**するか見る。違えば売上は読まずに終了。
6. 売上とMRRを読み、D1へ1行追加する。

## 保存するもの・しないもの

| | |
|---|---|
| 保存する | 事例ID、確認した人のFirebase UID（1時間制限と退会時の削除だけに使う）、決済アカウントIDの**SHA-256**、サイトのドメイン、通貨、直近30日の売上、MRR、有効なサブスク数、期間、確認時刻 |
| 保存しない | **制限付きAPIキー**、決済アカウントID（ハッシュ以外）、顧客・カード・メール、支払い1件ごとの明細、StripeのAPI応答そのもの |
| ログに出さない | キー、Stripeのエラー本文（キーの一部を含みうる）、決済アカウントID、UID。失敗の種類の名前だけを出す |
| 公開APIが返さない | UID、決済アカウントID（ハッシュも）、キー |

退会（`DELETE /api/user/me`）で、その人の確認行も削除される。表は `migrations/d1/0012_verified_revenue.sql`。

## 数字の決め方

- **直近30日の売上** = 成功した支払いの合計 − 返金額。Stripeの「残高の取引」のうち、決済アカウントの**既定通貨**のものだけを足す。あとから失敗した支払い・返金の取り消しはその分だけ戻す。手数料・入金・紛争は数えない。税込の入金額で、返金が上回ると**負の値**になる。
- **MRR** = 有効なサブスクリプションの各明細を月額に換算して足す。year ÷ 12、week × 52 ÷ 12、day × 365 ÷ 12、`interval_count` と数量を掛ける。最後に1回だけ四捨五入。定価ベース。課金を止めている契約（`pause_collection`）と、試用中・支払い遅延は数えない。
- **`null` になる場合**（数字をでっち上げない）:
  - 既定通貨以外の契約がある → `mrrMinor` も `activeSubscriptions` も `null`
  - 契約に割引が付いている、従量課金・段階料金・数量変換がある → `mrrMinor` だけ `null`（件数は出す）
  - 有効な契約が1000件を超える → 両方 `null`（売上は出す）
- 金額は通貨の最小単位（JPYは円、USDはセント）。時刻はUNIX秒。通貨は大文字3文字。
- 売上の元になる取引が2000件を超える規模は、自動では確認しない（422）。

## API

| | |
|---|---|
| `POST /api/verification/stripe`（要ログイン） | 本文 `{ entityId, restrictedKey }` → 成功 `200 { verification }` |
| `GET /api/verification?entity_id=...`（認証不要） | `{ verification: VerifiedRevenue \| null }`。その事例の最新1件 |
| `GET /api/verification/list`（認証不要） | `{ verified: [{ entityId, verifiedAt }] }`。事例ごとの最新、新しい順、最大2000件 |

型は `src/shared/verification.ts`。失敗時は `{ error, code }`（`error` は画面に出せる日本語、分岐には `code`）。

| status | code | 場面 |
|---|---|---|
| 400 | `key_not_restricted` | `rk_` で始まらない（`sk_` など） |
| 400 | `key_malformed` / `invalid_request` | キーの形式、本文が不正 |
| 400 | `mode_mismatch` | 決済モードと合わないキー |
| 400 | `key_rejected` | Stripeがキーを受け付けない |
| 400 | `permission_missing` | 権限不足。`permissions` に付けてほしい権限の一覧 |
| 401 | `unauthorized` | ログインしていない |
| 403 | `site_mismatch` | 決済アカウントのサイトと事例の公式サイトが違う |
| 403 | `stripe_site_missing` / `entity_site_missing` / `entity_site_shared` | 比べるサイトがない、共有サービス上 |
| 404 | `not_found` | 事例が見つからない |
| 413 | `too_large` | 本文が大きすぎる |
| 422 | `too_many_records` / `currency_missing` | 件数が多すぎる、既定通貨がない |
| 429 | `cooldown` | 同じ人・同じ事例は1時間に1回まで（`Retry-After` あり）。失敗した試行は数えない |
| 429 / 502 | `too_many_attempts` / `stripe_unavailable` | 試行が多すぎる（同じ接続元から1時間30回）、Stripeに届かない |
| 503 | `unavailable` | D1・事例の参照・決済設定が使えない。GETも同じ |

## 画面を作る人へ

- キーは入力欄から1回送るだけ。localStorage・URL・アプリの状態・ログに残さず、送信したら（成功でも失敗でも）入力欄を空にする。
- 成功時の `verification` は、そのまま表示に使える。`mrrMinor` / `activeSubscriptions` が `null` のときは「未確認」と出し、0円とは書かない。
- 失敗時は `error` をそのまま出してよい。権限不足（`permission_missing`）では `permissions` を並べて、Stripeでどの権限を付けるかを示す。
- 確認済みバッジは `GET /api/verification/list` を1回読んで、事例IDで引く。

## 限界（先に知っておくこと）

- **サイトの一致は持ち主の証明ではない。** Stripeのビジネス設定のURLは本人が入力する。他人のサイトを書いたアカウントでも、ドメインは一致する。確認済みバッジの信頼は「そのStripeアカウントの実データ」であって「その事例の運営者本人」までは保証しない。強めるなら、DNSのTXTレコードなどによる所有確認を足す。`account_id_hash` は、同じ決済アカウントで複数の事例を確認する不正を調べるために残している。
- 顧客単位の割引や、税込・税抜の違いはMRRに反映されない。紛争（チャージバック）は売上から引かない。
- 決済アカウントの既定通貨以外の売上は数えない。多通貨で売る事業は実際より小さく見える。

## 検証

```
pnpm exec vitest run src/lib/verification src/app/api/verification src/app/api/user/me
```

Stripe・Firebase・D1（実SQLiteに migration を流して確認）はテストで差し替えている。**本物のStripeキーでの通し確認と、Stripe画面上の権限名の突き合わせは未実施。** 本番D1へのmigration適用もしていない。
