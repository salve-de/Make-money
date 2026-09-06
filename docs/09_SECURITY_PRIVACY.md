# セキュリティ・プライバシー設計

## 1. 信頼境界

### ブラウザへ置けるもの

- Supabase Project URL
- Supabase Public Anon Key
- 公開データ
- ローカル保存状態

### ブラウザへ置かないもの

- Supabase Service Role Key
- Stripe Secret / Webhook Secret
- Resend API Key
- Cron Secret
- Newsletter Token Secret
- 審査者だけが読める原資料
- 応募者メール、応募本文、調査メモ

秘密情報はSupabase Edge Function Secretとして保持する。

## 2. 認証と権限

役割:

- `member`: 保存、反応、応募、レビュー、投稿
- `researcher`: 将来の調査機能拡張用
- `vendor`: Claim済みサービスと募集の管理
- `moderator`: 投稿・レビュー・訂正・Claimの審査
- `editor`: 編集・公開運用
- `admin`: 権限付与と全体管理

原則:

- RoleはDBの`profiles.role`だけを信頼する。
- クライアントが送るRoleは無視する。
- ClaimのEvidence Gradeと編集権限を混同しない。
- Claim承認時のみ`product_memberships`へ所有権を付与する。
- `SECURITY DEFINER` Functionは`search_path = public`へ固定する。

## 3. RLS

公開可能:

- `published` のOpportunity、Money Signal、Demand、Product
- `open` のListing
- `published` のReview
- `public` のCollection
- 集計済み件数

本人・当事者だけ:

- Preferences
- Research Notes
- Reactionsの個票
- Listing Application本文
- Notification
- Subscription状態
- Newsletter設定

Staffだけ:

- Pending Submission
- Claim審査資料
- Correction審査
- Moderation Audit
- Billing Event Payload
- Rate Limit記録

## 4. SSRF対策

URL Previewは以下を行う。

1. `http` / `https` 以外を拒否
2. URL内のUsername / Passwordを拒否
3. 80 / 443以外のPortを拒否
4. `localhost`、`.local`、`.internal`、Metadata Hostを拒否
5. IPv4 / IPv6のPrivate、Loopback、Link-local、Reserved、Multicastを拒否
6. DNSのA / AAAAを解決し、全Addressを再確認
7. Redirectを自動追従せず、各Locationを同じ基準で再検証
8. Redirect回数を制限
9. Timeoutを設定
10. Content-Lengthと実読込Byteの両方を制限
11. HTML以外を拒否
12. 取得結果を短期間Cache
13. User / IP単位でRate Limit

DNS Rebindingを完全に消すには、最終接続IPを固定できるOutbound Proxyが最も強い。本実装はEdge Runtimeで可能な範囲として、解決時とRedirectごとの検証を行う。

## 5. XSS・入力処理

- 表示時に`escapeHTML`を適用
- URLは`safeExternalUrl`でProtocolとHostを検証
- 投稿本文の長さを制限
- HTMLをユーザー入力から直接挿入しない
- URL PreviewのMeta内容をTextとして扱う
- Markdown / Rich Textを導入する場合はSanitizerを必須化
- メール件名から改行とNULを除去

## 6. Stripe

- Checkout / Portalは認証必須
- Plan CodeはServer側AllowlistからPrice IDへ変換
- Return URLは`SITE_URL`と同一Originだけ許可
- Webhook署名をRaw Bodyで検証
- `provider_event_id`をPrimary Keyとして冪等化
- User IDとPlan CodeをCustomer / Subscription Metadataへ保持
- Price IDからもPlanを再判定
- Browserから購読状態を書き換えさせない
- 支払い失敗を本人へ通知

## 7. メール

- 登録時は`pending`
- 確認Tokenを通して`active`
- 確認TokenはHash保存
- 解除TokenはSubscription IDからHMAC生成し、DBにはHashだけ保存
- Digestは`subscription_id + digest_key`で冪等化
- 解除後は送信対象から除外
- Bounce / ComplaintのWebhook追加時は即時停止する

## 8. 個人情報最小化

取得する可能性がある情報:

- Auth Email
- 表示名・Handle
- 応募時の連絡先と本文
- Newsletter Email
- Stripe Customer / Subscription ID
- 行動Eventの匿名IDまたはUser ID

掲載者へ渡す情報:

- 閲覧、保存、比較、需要反応などの集計
- 本人が応募した場合のみ応募本文と連絡先

掲載者へ渡さない情報:

- 閲覧者個人のEmail
- 非公開メモ
- 他の応募先
- 課金識別子
- 個別の保存・反応履歴

## 9. Retention

初期方針:

- Rate Limit: 有効期限後に削除
- Edge Audit: 400日
- Billing Event: 法務・会計要件に合わせて保持
- Rejected Spam Payload: 90日後に本文削除を検討
- Withdrawn Application: 180日後に本文削除を検討
- Unsubscribed Newsletter: 再配信防止に必要な最小識別子のみ保持
- Deleted Account: 法令・不正防止要件を除き、本人データを削除または匿名化

正式公開前に利用規約・プライバシーポリシーへ反映する。

## 10. Threat Model

| 脅威 | 主な対策 |
|---|---|
| Spam投稿 | Rate Limit、審査、重複Key、将来Captcha |
| 売上の虚偽申告 | Evidence Grade、原資料、自己申告表示、訂正 |
| 広告によるランキング操作 | Promotion分離、Organic ViewにJOINしない |
| 他人のサービス乗っ取り | Claim Challenge、審査、Membership付与 |
| 他ユーザーの応募閲覧 | 当事者限定RLS |
| Webhook再送 | Event ID冪等化 |
| メール重複送信 | Digest Key冪等化 |
| URL Previewによる内部探索 | DNS・IP・Redirect・Port・Size・Timeout検証 |
| Stored XSS | Escape、Rich HTML不使用、長さ制限 |
| Service Role漏えい | Edge Secretのみ、CIでBrowser Bundleを検査 |
