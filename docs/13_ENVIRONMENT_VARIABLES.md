# 環境変数・Secret

## 1. ブラウザ公開設定

`config.js` に置けるのは次だけ。

| Key | 必須 | 用途 |
|---|---:|---|
| `supabaseUrl` | 本番Cloud時 | Supabase Project URL |
| `supabaseAnonKey` | 本番Cloud時 | Public Anon Key |
| `siteUrl` | 推奨 | Appの公開URL |

```js
window.GOLDMINE_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "PUBLIC_ANON_KEY",
  siteUrl: "https://your-domain.example/",
};
```

Anon Keyは公開前提だが、RLSが正しいことが必須。

## 2. Supabase Edge Function Secret

```bash
supabase secrets set \
  SITE_URL=https://your-domain.example \
  ALLOWED_ORIGINS=https://your-domain.example \
  SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY \
  SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
  STRIPE_SECRET_KEY=sk_live_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxx \
  STRIPE_PRICE_PRO=price_xxx \
  STRIPE_PRICE_RESEARCH=price_xxx \
  STRIPE_PRICE_TEAM=price_xxx \
  RESEND_API_KEY=re_xxx \
  EMAIL_FROM='GOLDMINE RADAR <radar@your-domain.example>' \
  CRON_SECRET='LONG_RANDOM_VALUE' \
  NEWSLETTER_TOKEN_SECRET='ANOTHER_LONG_RANDOM_VALUE'
```

`SUPABASE_URL`はSupabase Runtimeで自動設定される。

## 3. Key一覧

| Key | Secret | Function | 説明 |
|---|---:|---|---|
| `SITE_URL` | No | 全体 | Return / Confirmationの基準Origin |
| `ALLOWED_ORIGINS` | No | Browser API | CORS Allowlist。カンマ区切り |
| `SUPABASE_URL` | No | 全体 | Project URL。Runtime提供 |
| `SUPABASE_ANON_KEY` | Public | User Function | User JWTを引き継ぐClient |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Server Function | RLSを越える管理処理 |
| `STRIPE_SECRET_KEY` | **Yes** | Stripe | Checkout / Portal / Retrieve |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | Webhook | Stripe Signature検証 |
| `STRIPE_PRICE_PRO` | Internal | Checkout | Pro Recurring Price |
| `STRIPE_PRICE_RESEARCH` | Internal | Checkout | Research Recurring Price |
| `STRIPE_PRICE_TEAM` | Internal | Checkout | Team Recurring Price |
| `RESEND_API_KEY` | **Yes** | Email | Transactional / Digest送信 |
| `EMAIL_FROM` | No | Email | 認証済みFrom Address |
| `CRON_SECRET` | **Yes** | Digest | Scheduler認証 |
| `NEWSLETTER_TOKEN_SECRET` | **Yes** | Newsletter | 解除TokenのHMAC |

## 4. Secret生成

```bash
openssl rand -base64 48
```

`CRON_SECRET`と`NEWSLETTER_TOKEN_SECRET`は別の値にする。

## 5. Rotation

### Service Role

- 漏えい疑い時は即時Rotate
- 全Edge Function Secretを更新
- 旧Keyを無効化
- Audit Logを確認

### Stripe Webhook Secret

- Stripe側で新Secretを作成
- Supabase Secretを更新
- EventをTest送信
- 旧Endpointを停止

### Newsletter Token Secret

変更すると、既存の決定的Unsubscribe Tokenが無効になる。

Rotation手順:

1. 旧Secretを`NEWSLETTER_TOKEN_SECRET_PREVIOUS`として一時保持する設計へ拡張する
2. Unsubscribe Functionで新旧両方を検証する
3. 新しいEmailは新Secretを使う
4. 十分な期間後に旧Secretを破棄する

初期公開前に長期運用するSecretを確定する。

## 6. Environment別設定

### Local

- `SITE_URL=http://localhost:4173`
- Stripe Test Mode
- Resend Test AddressまたはSandbox
- Supabase Local / Preview Project

### Preview

- Preview Domainを`ALLOWED_ORIGINS`へ追加
- Stripe Test Mode
- 本番Email Listへ送らない
- Preview用Database

### Production

- Production DomainだけをCORS Allowlistへ登録
- Stripe Live Mode
- 認証済みEmail Domain
- Production Database
- MonitoringとBackup有効

## 7. Secret Scan

CIでBrowser Sourceに次が含まれないことを確認する。

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`

Repository全体についてはGitHub Secret Scanningまたは同等機能を有効にする。

## 8. Cron例

Schedulerから週次配信:

```bash
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  "https://YOUR_PROJECT.supabase.co/functions/v1/send-digest?frequency=weekly&limit=100"
```

日次:

```bash
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  "https://YOUR_PROJECT.supabase.co/functions/v1/send-digest?frequency=daily&limit=100"
```

同じ期間の配信は`subscription_id + digest_key`で重複送信を防ぐ。
