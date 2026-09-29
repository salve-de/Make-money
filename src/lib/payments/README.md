# Payment entitlement

The public P&L/evidence remains free. PRO sells the twelve structural analyses.
Three plans are sold: the JPY 1,980 one-time founding pass (permanent access), and PRO monthly / yearly
subscriptions (see "Plans and environment variables"). Both subscription prices are decided only by
runtime environment variables, never in code.

## Plans and environment variables

| id | 名前 | 種類 | 金額 | 販売を止める方法 |
| --- | --- | --- | --- | --- |
| `founding-pass` | 金鉱録 PRO 創刊版（永久アクセス権） | 買い切り | 1,980円（コード固定） | `FOUNDING_PASS_ENABLED=0` |
| `pro-monthly` | 金鉱録 PRO 月額 | 毎月更新 | `PRO_MONTHLY_PRICE_JPY` | 環境変数が未設定・不正 |
| `pro-yearly` | 金鉱録 PRO 年額 | 毎年更新 | `PRO_YEARLY_PRICE_JPY` | 環境変数が未設定・不正 |

- `PRO_MONTHLY_PRICE_JPY` / `PRO_YEARLY_PRICE_JPY`: 金額（円）。1〜99,999,999 の整数だけが有効。
  空・0・負数・小数・`1,980` のような桁区切り・先頭 0 は「値段が決まっていない」扱いで、そのプランは
  売らない（`available: false`、購入は 400）。値段を変えたときに影響するのは、その後の新規購入だけ
  （すでに契約中の人は、契約したときの金額のまま更新される）。
- `FOUNDING_PASS_ENABLED`: `0` のときだけ創刊版の販売を止める。ほかの値・未設定は今までどおり販売する。
- `STRIPE_SECRET_KEY` と `STRIPE_WEBHOOK_SECRET` のどちらかが無い環境では、全プランが `available: false`
  で、購入も始められない（503）。
- Stripe の管理画面で商品や価格を作る必要はない。Checkout を作るたびに金額をサーバーが指定する。

## Billing APIs

| API | 認証 | 返すもの |
| --- | --- | --- |
| `GET /api/billing/plans` | 不要 | `{ plans: [{ id, name, priceJpy: number \| null, interval: 'once' \| 'month' \| 'year', available }] }`。順番は創刊版・月額・年額。`no-store` |
| `POST /api/checkout` | Firebase | body `{ product }`（`founding-pass` / `pro-monthly` / `pro-yearly`）。`{ url }`（Stripe Checkout）。金額・ユーザー ID は body から受け取らない。販売していないプランは 400「このプランは現在販売していません」 |
| `GET /api/billing/status` | Firebase | `{ isPro, plan: 'founding-pass' \| 'pro-monthly' \| 'pro-yearly' \| null, renewsAt: number \| null, cancelAtPeriodEnd, canManage }`。台帳か Stripe が読めないときは 503（権利を推測で与えない） |
| `POST /api/billing/portal` | Firebase | `{ url }`（Stripe カスタマーポータル）。本人の契約が無ければ 404 |
| `POST /api/checkout/status` | Firebase | 既存。月額・年額の `session_id` にも対応（`pending` / `confirmed` / `revoked` / `unpaid`） |

`GET /api/billing/status` の読み方:

- `isPro` は `getProEntitlement` と同じ判定（同じ台帳、同じ Stripe 再確認）。
- `plan` は権利を与えているプラン。月額・年額の契約が有効ならそのプラン、なければ創刊版。
  権利が無いとき、および旧契約で月額か年額か判別できないときは `null`。
- `renewsAt` は **Unix ミリ秒**（`new Date(renewsAt)` でそのまま使える）。月額・年額だけで、創刊版は
  `null`。`cancelAtPeriodEnd` が `true` のときは「更新日」ではなく「利用できる最終日」を指す。
- `canManage` は、カスタマーポータルを開ける契約があるか。支払い失敗中（`past_due` など）の契約も
  `true` にして、カード情報を直せるようにする。終了済み（`canceled`）は `false`。
- 月額・年額と創刊版が両方有効なときは、更新日と解約予約を持つ月額・年額側の `plan` を返す。

## Source of truth

- D1 `payment_events` is an append-only ledger of normalized Stripe facts.
  Apply `migrations/d1/0002_payments.sql` after `0001_users.sql`.
- A transactional D1 batch stores a purchase and any already observed refund or
  dispute together. `id` is the Stripe event ID (with a deterministic suffix for
  observations); its primary key makes retry delivery idempotent.
- Facts refer to individual charge/subscription IDs. Refunds arriving before a
  checkout remain associated with the charge; a later grant cannot erase them.
- A paid monthly/yearly checkout (`checkout.session.completed` or
  `checkout.session.async_payment_succeeded`) stores one `subscription` fact keyed by the
  subscription ID: `{ userId, active, expiresAt }`. `active` is true for `active`/`trialing`;
  `expiresAt` is the latest `current_period_end`. A session that is not complete, paid, in JPY and
  one of our two subscription plans is ignored (200, nothing stored). For one of ours, the fact is
  stored only when `client_reference_id`, the session `metadata.userId`, the subscription
  `metadata.userId` and its plan all agree; otherwise the webhook answers 503 so Stripe retries and
  nothing is granted.
- Full refund revokes that purchase; partial refunds preserve access. An open or
  lost dispute suspends access. A won/closed dispute restores it unless refunded.
  Separate purchases are independent: refunding an old order cannot erase a new one.
- `authorizePro(request)` verifies Firebase UID and calls `getProEntitlement(uid)`.
  D1 must prove an owned purchase. Stripe's current charge/dispute status is then
  checked, so delayed refund webhooks cannot grant stale access. Provider/database
  failure returns 503; a local flag or `users.legacy_is_pro` never authorizes.
- Stripe test and live events are partitioned and the webhook rejects mode mismatch.
  No card details, raw webhook payloads, or customer email are stored in this ledger.

## Legacy reconciliation

Migrated `stripe_customer_id`/`stripe_subscription_id` are used only to retrieve
and verify existing Stripe records. Email matching is forbidden. An anonymous
historic session requires an existing server-stored customer binding and legacy
paid flag; a conflicting Stripe UID is rejected. Subscription access requires
an active current period, paid invoice, and unrefunded invoice charge. A separate
founding-pass purchase survives subscription cancellation.

## Webhook deployment

Subscribe the signed endpoint to `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `charge.refunded`,
`charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`,
`charge.dispute.funds_withdrawn`, `charge.dispute.funds_reinstated`,
`customer.subscription.updated`, and `customer.subscription.deleted`.
Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Firebase project configuration,
and the D1 `APP_DB` binding. Node verification can use the explicit D1 REST config.
Never mix test keys with live event fulfillment. Checkout refuses to start without
persistence and webhook configuration. `/success` only checks status; it never grants.
Monthly/yearly plans need no additional webhook events beyond the list above.

## Subscription lifecycle

- 更新・解約・支払い失敗・返金は、台帳ではなく **読むたびに Stripe** で確認する（`subscriptionStillEntitled`）。
  権利が有効なのは、契約の状態が `active`、今の請求期間が終わっていない、最新の請求書が支払い済み、
  その請求書の決済が返金・異議中でないとき。Webhook の到着を待たずに、更新も解約も反映される。
- 解約予約（期間終了で解約）は、期間が終わるまで権利が続く。期間が終わって Stripe が `canceled`
  にすると権利が消える。`past_due`（支払い失敗）の間は権利が止まり、支払いが復旧すると自動で戻る。
- `customer.subscription.updated` / `deleted` は、`active`・`trialing` 以外の状態のときだけ「無効」の
  事実を追記する。台帳に「有効」の事実が一度でもあれば、読むときは必ず Stripe に確認する。
- 創刊版（買い切り）と月額・年額は別々に判定する。月額・年額が終わっても、創刊版は残る。
- すでに更新される月額・年額があるユーザーの `POST /api/checkout`（月額・年額）は 409 で断る（二重課金の防止）。
  解約予約済みなら新しい契約を始められる。購入状況を確認できないときは 503。
- 月額・年額を買うたびに Stripe の Customer が新しく作られる（買い直しでは別の Customer になる）。
  カスタマーポータルは、選ばれた契約の Customer で開く。

## Customer portal

`POST /api/billing/portal` は Stripe のカスタマーポータルの URL を作る。**Stripe の管理画面で
ポータルの設定を保存していないと作れない**（テストモードと本番で別々。本番は本番モードで保存する）。
Stripe ダッシュボードの 設定 > Billing > カスタマーポータル を開き、次を有効にして保存する
（画面の文言は Stripe 側の表示に従う）:

- サブスクリプションの解約（解約のタイミングは「請求期間の終了時」を推奨）
- 支払い方法の更新
- 請求書の履歴の表示
- プランの変更は有効にしない。商品や価格を Stripe に登録していない（Checkout ごとに金額を指定する）ため、
  切り替え先を作れない。月額から年額への切り替えは、解約予約をしてから買い直す

未設定だと Stripe がエラーを返し、API は 503 を返す。`return_url` は
`NEXT_PUBLIC_APP_URL`（未設定ならリクエストの origin）の `/`。

## Verification

`pnpm exec vitest run src/lib/payments` executes real SQLite migrations/transaction
rollback and actual Stripe webhook-signature verification, with provider calls
mocked. Cases cover anonymous/wrong UID, mode mismatch, partial/full refund before
and after completion, repurchase, duplicates, disputes, delayed payment, provider
failure, legacy subscriptions, and false legacy paid flags.

`billing.test.ts` covers the monthly/yearly plans: price parsing, `GET /api/billing/plans`,
subscription checkout parameters and the duplicate-purchase guard, webhook fulfillment and
its account-binding failures, renewal/cancellation/failed payment/refund, `GET /api/billing/status`,
`POST /api/billing/portal`, and `/api/checkout/status` for subscriptions. Stripe is mocked there, so
none of it proves a real purchase, real portal session or webhook delivery; those need their own
end-to-end check in Stripe test mode.

On 2026-09-11 a read-only inventory of the configured Stripe test account found
one unpaid anonymous checkout session and zero subscriptions. No real charge or
refund was created. Test-mode API availability does not prove deployed Firebase,
webhook delivery, or a production purchase; those require their own end-to-end proof.

Official behavior references: [Stripe webhook ordering and duplicates](https://docs.stripe.com/webhooks),
[charge refund amounts](https://docs.stripe.com/api/charges/object),
[dispute states](https://docs.stripe.com/api/disputes/object).

## Build success versus deployment readiness

A public-page build intentionally succeeds without authentication. In that case
no Firebase client is initialized and login/signup display a configuration error.
Set **all four at browser build time**: `NEXT_PUBLIC_FIREBASE_API_KEY`,
`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and
`NEXT_PUBLIC_FIREBASE_APP_ID`. The same project ID must be available to the server
JWT verifier. Firebase must enable the chosen Google/email providers and authorize
the deployed domain. Storage bucket/messaging sender values are optional here.

Production paid readiness additionally requires applied D1 migrations, reachable
`APP_DB`, matching live Stripe key/webhook secret, registered webhook event delivery,
and a verified authenticated purchase/status/refund path. For monthly/yearly plans it also
requires `PRO_MONTHLY_PRICE_JPY` / `PRO_YEARLY_PRICE_JPY` in the runtime environment, the saved
live-mode customer portal settings, and one real subscribe → status → portal → cancel → refund pass.
A local green build, SQLite tests, or the test-key read-only inventory is not evidence of these settings.
Secrets are never filled with mock values or created by this application.

## Known gaps

- アカウント削除（`DELETE /api/user/me`）は Stripe の契約を解約しない。台帳の本人との紐付けは匿名化されるため、
  削除後は本人がポータルから解約できなくなり、課金が続く。削除の前に契約を解約させるか、削除時に
  解約予約を入れる対応が必要（未対応）。
- 月額・年額の申し込み画面での「更新日・金額・解約方法」の表示（特定商取引法の定期購入の表示）は画面側の担当範囲。
