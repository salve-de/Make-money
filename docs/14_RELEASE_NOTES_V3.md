# GOLDMINE RADAR V3 Release Notes

## 目的

V3は、静的な事業アイデアDBから、次の循環が実際に動くPlatformへ変える更新である。

```text
発見する
→ 保存・追跡する
→ 需要を示す
→ サービスを掲載する
→ 顧客・Beta・提携へ募集する
→ 結果を新しいMoney Signalとして蓄積する
```

## Product

- Homeを「次に金持ちになる人は、何を見ているのか。」を中心に再設計
- 初回Personalization
- Opportunity Feed / DB
- Money Signal DB
- Demand Gap DB
- Service DB
- Marketplace Listing
- Rankings
- Market Heat
- Cross DB Search
- Compare
- MY GOLDMINE
- Collections
- Research Workspace
- Publisher Dashboard
- Account / Alerts
- Pricing
- Trust / Methodology
- Moderation Console

## Interaction

- Save
- Watch
- Want
- Would Pay
- Build
- Too Crowded
- Demand Want / Would Pay
- Compare最大4件
- Collection追加
- Note作成・編集・削除
- Listing作成
- Listing応募・取下げ
- Review投稿
- Helpful Vote
- Correction Request
- Product Claim
- JSON Export / Import
- CSV Note Export
- Theme
- Keyboard Search

## Live Data

Supabase設定時は次を取得し、画面用Data Graphへ変換する。

- Organic Ranked Opportunities
- Public Money Signals
- Public Products
- Public Demands
- Public Listings
- Public Collections
- Opportunity ↔ Signal
- Opportunity ↔ Demand
- Opportunity ↔ Product
- Product ↔ Demand
- Signal ↔ Source
- Collection ↔ Opportunity

取得失敗時は、誤った空画面ではなく明示されたDemo DataへFallbackする。

## Database

追加:

- Product Membership
- User Preference
- Research Note
- Collection / Item / Follow
- Listing / Application
- Review / Helpful Vote
- Correction Request
- Notification
- Newsletter Subscription / Delivery
- Subscription / Billing Event
- URL Preview Cache
- Function Rate Limit
- Edge Audit
- Moderation Audit
- Product Demand
- Demand Reaction

自動化:

- Collection Item / Follower Count
- Listing Application Count
- Review Average / Count
- Review Helpful Count
- Opportunity Reaction Count
- Demand Intent / Solution Count
- Auth User Profile作成

## Moderation

- Pending DataをCanonical DBへ変換する`materialize_submission`
- Claim承認時にMembershipとOwnerを付与する`review_product_claim`
- Review / Correction / Listing / Claimを同じQueueで確認
- 審査Audit
- Publication後のNotification

## Billing

- Authenticated Checkout
- Plan Allowlist
- Same-origin Return URL
- Customer Metadata
- Subscription Metadata
- Billing Portal
- Raw Body Signature Verification
- Event ID Idempotency
- Subscription State Sync
- Payment Failure Notification

## Email

- Rate Limited Subscribe
- Double Opt-in
- Confirmation Expiry
- HMAC Unsubscribe Token
- One-click Unsubscribe
- Daily / Weekly Digest
- Delivery Ledger
- Duplicate Digest Prevention
- Cron Secret

## URL Preview

- Public http/https only
- Credential拒否
- Nonstandard Port拒否
- Hostname blocklist
- IPv4 / IPv6 Reserved Range拒否
- A / AAAA DNS検証
- Manual Redirect
- Redirect先再検証
- Timeout
- Body Size Limit
- HTML Content-Type
- Cache
- Rate Limit

## UI / Accessibility

- Dark / Light
- Desktop Sidebar
- Mobile Bottom Navigation
- Responsive Grid / Table
- Focus Visible
- Skip Link
- Modal Focus Entry / Return
- Keyboard Search
- Reduced Motion
- Print Styles
- Loading / Empty / Error / Toast

## Quality

- Data Integrity Check
- Score / Search / Route Unit Test
- Contribution Validation Test
- Security Test
- SQL Invariant Check
- Edge Boundary Check
- Deno Type Check
- Static Server Smoke Test
- PWA Cache Versioning

## Removed

- 旧`src/app.js`
- 旧`src/core.js`
- 旧`src/data.js`
- 旧`styles/app.css`
- 旧Core Test

単一の現行実装を`src/v2`へ集約した。

## 公開前に外部設定が必要なもの

- 本番Supabase Project
- Auth URL
- Production Data
- Stripe Account / Price / Webhook
- Resend Domain
- Site Domain
- Terms / Privacy / Commercial Disclosure
- Monitoring
- Backup

コード内に秘密鍵や本番アカウント情報は保存しない。
