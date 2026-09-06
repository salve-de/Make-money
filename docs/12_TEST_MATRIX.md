# テストMatrix

## 1. 自動検査

`npm run verify` で実行する。

### Data Integrity

- ID / Slug重複
- Opportunity → Signal / Demand / Service参照
- Signal → Source参照
- Collection → Opportunity参照
- Listing → Service参照
- Score 0〜100
- RiskとNext Stepの最低件数
- 危険URL
- 必須File

### Core Logic

- Scoreの決定性
- Demand Gap計算
- 日本語正規化
- 横断検索
- Filterの非破壊性
- Personalization
- Hash Route
- State Migration
- CSV
- HTML Escape
- URL検証
- 各投稿Form検証

### SQL

- RLS
- Rate Limit
- Stripe Event冪等性
- Newsletter Delivery冪等性
- Claim承認関数
- Submission Materialization
- Counter Trigger
- Public View
- Organic RankingにPromotion JOINがないこと
- `SECURITY DEFINER`の`search_path`

### Edge Functions

- 必須Function存在
- 共通Error Handler
- DNS解決
- Manual Redirect
- IPv4 / IPv6拒否
- HMAC Token
- Stripe署名
- Billing Event記録
- Newsletter確認
- Cron Secret
- Browser Secret混入なし

### CI Smoke Test

- `index.html`取得
- `src/v2/app.js`取得
- `styles/v2.css`取得
- Service Worker対象File

## 2. Browser E2E

### 初回体験

- [ ] HomeがDesktopで崩れない
- [ ] Mobile 375pxで横Scrollしない
- [ ] 初期Personalizationを完了できる
- [ ] Skipできる
- [ ] 選択内容でおすすめ順が変わる
- [ ] Reload後も保存される

### Search / DB

- [ ] `⌘/Ctrl + K`で検索を開ける
- [ ] `/`キーで検索を開ける
- [ ] Escで閉じる
- [ ] Keyboardで結果を選べる
- [ ] 日本語QueryでOpportunity / Demandが同時に出る
- [ ] Category Filter
- [ ] Solo / Low Budget Filter
- [ ] Sort
- [ ] Empty State

### Opportunity

- [ ] 詳細を開ける
- [ ] Amount Type表示
- [ ] Evidence表示
- [ ] Score内訳
- [ ] Entry Route
- [ ] Acquisition Channel
- [ ] Risk
- [ ] Next Steps
- [ ] Source Link
- [ ] Related Signal / Demand / Service
- [ ] Save
- [ ] Watch
- [ ] Compare
- [ ] Collection追加
- [ ] Want / Would Pay / Build

### MY GOLDMINE

- [ ] 保存案件のみ表示
- [ ] Watch一覧
- [ ] Portfolio集計
- [ ] Suggested Opportunity
- [ ] Export
- [ ] Import
- [ ] Cross-tab同期

### Demand

- [ ] Demand一覧
- [ ] Gap Score
- [ ] Want投票
- [ ] Would Pay投票
- [ ] Detail
- [ ] Related Opportunity
- [ ] Existing Solution

### Service

- [ ] Service検索
- [ ] Intent Filter
- [ ] Trust Level
- [ ] External URL
- [ ] Claim Form
- [ ] Review Form
- [ ] Helpful Vote
- [ ] Related Demand / Opportunity
- [ ] Listing作成

### Marketplace

- [ ] Listing検索
- [ ] Type Filter
- [ ] Listing作成
- [ ] Required Validation
- [ ] Deadline Validation
- [ ] Application
- [ ] Duplicate Application拒否
- [ ] Withdraw
- [ ] OwnerとApplicant双方のDashboard
- [ ] Application Count

### Collections / Workspace

- [ ] Collection作成
- [ ] Visibility
- [ ] Item追加 / 削除
- [ ] Follow
- [ ] Share
- [ ] Note作成 / 編集 / 削除
- [ ] CSV出力

### Account / Auth

- [ ] Local Mode
- [ ] Supabase設定
- [ ] Sign Up
- [ ] Email Login
- [ ] Magic Link
- [ ] Password Recovery
- [ ] Sign Out
- [ ] Token Refresh
- [ ] Profile更新
- [ ] Theme
- [ ] Newsletter Frequency
- [ ] Cloud Sync

### Moderation

- [ ] MemberはAdminへAccess不可
- [ ] ModeratorはQueueを読める
- [ ] Submission承認
- [ ] Canonical Data作成
- [ ] Review公開
- [ ] Correction承認
- [ ] Listing公開
- [ ] Claim承認
- [ ] Claim後にOwnership付与
- [ ] Audit Log

## 3. RLS Matrix

| Data | anon | member本人 | 他member | Vendor当事者 | moderator |
|---|---:|---:|---:|---:|---:|
| Published Opportunity | R | R | R | R | R/W |
| Own Preference | - | R/W | - | - | R |
| Own Note | - | R/W | - | - | R |
| Reaction個票 | - | R/W | - | - | R |
| Public Collection | R | R | R | R | R/W |
| Private Collection | - | R/W | - | - | R |
| Open Listing | R | R | R | R/W | R/W |
| Application本文 | - | Applicant R/W | - | Owner R/W | R/W |
| Published Review | R | R | R | R | R/W |
| Pending Review | - | Author R | - | - | R/W |
| Notification | - | R/W | - | - | - |
| Subscription | - | R | - | - | R/W |
| Billing Event | - | - | - | - | R/W |

`R`: Read, `W`: Write, `-`: No access

## 4. Edge Abuse Test

### URL Preview

- [ ] `localhost`
- [ ] `127.0.0.1`
- [ ] `0.0.0.0`
- [ ] `10.0.0.0/8`
- [ ] `172.16.0.0/12`
- [ ] `192.168.0.0/16`
- [ ] `169.254.169.254`
- [ ] IPv6 loopback
- [ ] IPv6 ULA
- [ ] IPv4 mapped IPv6
- [ ] Public URL → Private Redirect
- [ ] Redirect loop
- [ ] Custom Port
- [ ] Credentials in URL
- [ ] 2MB HTML
- [ ] PDF / Image
- [ ] Slow response
- [ ] DNS failure
- [ ] Rate Limit

### Stripe

- [ ] Missing Signature
- [ ] Invalid Signature
- [ ] Duplicate Event
- [ ] Unknown Price
- [ ] Unknown User Metadata
- [ ] Replayed Checkout
- [ ] External Return URL
- [ ] Unauthenticated Checkout

### Newsletter

- [ ] Invalid Email
- [ ] Repeated Subscribe
- [ ] Confirmation expiry
- [ ] Replayed Confirmation
- [ ] Invalid Unsubscribe
- [ ] Replayed Unsubscribe
- [ ] Duplicate Digest
- [ ] Invalid Cron Secret
- [ ] Delivery failure

## 5. Accessibility

- [ ] Skip Link
- [ ] Landmark
- [ ] Heading order
- [ ] Button accessible name
- [ ] Focus visible
- [ ] Modal focus entry / return
- [ ] Esc close
- [ ] Keyboard search
- [ ] Contrast
- [ ] `prefers-reduced-motion`
- [ ] 200% zoom
- [ ] Screen readerでEvidence / Scoreを理解できる

## 6. Performance

目標:

- Static Shell 200KB以内を目安
- Initial UIを外部APIなしで描画
- Live Data失敗時もDemo Fallback
- Search 1000件で100ms以内を目標
- ImageはLazy Load
- API Responseを必要列へ限定
- Public ViewとIndexを利用
- URL PreviewはCache
- DigestはBatch処理

## 7. Release Gate

Merge可能:

- Node Test全Pass
- SQL Check全Pass
- Edge Check全Pass
- Deno Check全Pass
- Static Smoke Test全Pass
- Critical Browser Flow全Pass
- Console Errorなし
- Mobile横Scrollなし
- Secret Scan問題なし
- Demo表記あり
- Legal Copy確認済み

Critical未完了なら公開しない。Cosmeticな問題だけを別Issueへ送る。
