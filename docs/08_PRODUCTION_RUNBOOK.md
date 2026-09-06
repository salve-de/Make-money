# 本番運用Runbook

## 1. 公開前の順序

1. Supabaseプロジェクトを作成する。
2. `001` から `004` までMigrationを順番に適用する。
3. AuthのSite URLとRedirect URLを本番ドメインへ変更する。
4. Edge Function Secretを設定する。
5. Edge FunctionsをDeployする。
6. Stripe Product / Recurring Price / Webhookを設定する。
7. Resendの送信ドメインを認証する。
8. `config.js` に公開URLとAnon Keyだけを設定する。
9. 一次根拠付きの初期データを投入する。
10. `npm run verify`、本番URLのSmoke Test、投稿から公開までのE2Eを実施する。

## 2. Migration

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

本番適用前にPreview環境へ適用し、以下を確認する。

- Migrationが空DBで成功する
- 既存データがあるDBでも成功する
- RLS有効化後に公開ページが読める
- 他ユーザーのメモ・応募・通知を読めない
- moderator以外が審査関数を実行できない
- PromotionなしでOrganic Rankingが生成される

## 3. Functions Deploy

```bash
supabase functions deploy url-preview
supabase functions deploy stripe-checkout
supabase functions deploy stripe-portal
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy newsletter-subscribe --no-verify-jwt
supabase functions deploy newsletter-confirm --no-verify-jwt
supabase functions deploy newsletter-unsubscribe --no-verify-jwt
supabase functions deploy send-digest --no-verify-jwt
```

JWTを無効にするFunctionは、Webhook署名、確認Token、Cron Secret、Origin制限、Rate Limitのいずれかで必ず守る。

## 4. Stripe疎通

1. テストモードでCheckoutを開始する。
2. `checkout.session.completed` が `billing_events` に一度だけ記録されることを確認する。
3. `subscriptions` に `user_id / customer_id / subscription_id / plan_code / status` が揃うことを確認する。
4. 同一Webhookを再送し、二重更新・二重通知が起きないことを確認する。
5. 支払い失敗イベントを送り、本人の通知だけが作成されることを確認する。
6. Billing Portalから解約し、`cancel_at_period_end` と最終状態を確認する。

## 5. メール疎通

1. 未ログイン状態からニュースレターを登録する。
2. `pending` で保存され、確認メールが届くことを確認する。
3. 確認URLを一度開き、`active` へ変わることを確認する。
4. 同じURLを再度開いても壊れないことを確認する。
5. Digestを手動実行し、`newsletter_deliveries` が一件だけ作られることを確認する。
6. 解除URLから `unsubscribed` へ変わり、以後配信対象にならないことを確認する。

## 6. URL Preview疎通

許可する例:

- 公開HTTPSページ
- HTTPSから別の公開HTTPSへのRedirect
- 1MB未満のHTML

拒否する例:

- `localhost`
- `127.0.0.1`
- RFC1918のプライベートIP
- Link-local / Cloud Metadata IP
- `.local` / `.internal`
- 認証情報を含むURL
- 80/443以外のPort
- HTML以外のContent-Type
- 1MBを超えるResponse
- Private IPへRedirectする公開URL

## 7. 毎日の確認

- Edge Functionの5xx率
- URL Previewの拒否率とTimeout
- 投稿審査待ち件数
- 訂正申請の未処理件数
- Stripe Webhook失敗件数
- Newsletter配信失敗件数
- Stale判定を超えたMoney Signal数
- 公開ページで根拠リンク切れが増えていないか

## 8. 毎週の確認

- 保存率、詳細遷移率、追跡率
- 「欲しい」から募集応募への遷移
- 掲載サービスの問い合わせ率
- 新規投稿の承認率とSpam率
- Evidence Grade別の閲覧・保存差
- Organic流入と共有流入
- Pro / ResearchのCheckout開始、完了、解約

## 9. Incident対応

### Stripe Webhook停止

1. Stripe Dashboardで失敗Eventを確認する。
2. `billing_events.error_message` を確認する。
3. 原因を修正する。
4. Stripeから失敗Eventを再送する。
5. `provider_event_id` による冪等性を確認する。

### 誤った金額を公開

1. 対象を即時 `stale` または `archived` にする。
2. Evidenceと期間・数字種類を再確認する。
3. 訂正履歴を `moderation_audit` に記録する。
4. 影響を受けるOpportunity Scoreを再計算する。
5. 追跡ユーザーへ訂正通知を出す。

### Spam大量投稿

1. Edge Rate LimitとIP傾向を確認する。
2. 未審査投稿を自動公開しない。
3. 重複KeyとDomain単位で束ねる。
4. Spam判定を監査ログへ残す。
5. 必要に応じてCaptchaを追加する。

### 個人情報漏えい疑い

1. 該当API / Functionを停止する。
2. Service Roleと関連SecretをRotateする。
3. 監査ログとAccess Logを保全する。
4. 影響対象と漏えい項目を特定する。
5. 法令・契約に従って通知と報告を行う。

## 10. Rollback

- フロントは直前の静的ReleaseへRollbackする。
- DB Migrationは原則Forward Fixする。
- 破壊的変更前はバックアップを取得する。
- Edge Functionは直前のGit Commitから再Deployする。
- 課金・メールの副作用処理は、Rollback前にQueueとWebhookを停止する。
