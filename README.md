# GOLDMINE RADAR

> **実際に金が動いた証拠から、次に狙える事業機会を発見し、需要・サービス・顧客まで接続するDB／マーケットプレイス。**

GOLDMINE RADAR は、成功談を読むだけのメディアでも、AIが思いつきを量産するアイデア集でもありません。

```text
Money Signal
  ↓ なぜ金が動いたか
Opportunity Window
  ↓ 誰が何に困っているか
Demand Gap
  ↓ 既存の解決策と不足
Service / Product
  ↓ 顧客・ベータ・提携・売買
New Money Signal
```

を同じデータグラフで接続します。

表側は、見た瞬間に「こんな稼ぎ方があるのか」「まだ自分にも入口がある」と理解できる発見フィード。裏側は、金・需要・サービス・根拠・利用者反応・募集結果を蓄積する事業機会DBです。

## 中核価値

- 誰が、誰に、何のために、いくら払ったかを追う **Money Signal DB**
- 金が動き、需要が続き、まだ入口が残る **Opportunity DB**
- 欲しい人に対して解決策が足りない **Demand Gap DB**
- 既存サービス、価格、信頼度、募集目的を調べる **Service DB**
- 顧客、ベータ利用者、提携先、専門家、PoCを探す **募集市場**
- 保存、追跡、比較、調査メモをまとめる **MY GOLDMINE**
- 発掘者が公開リストを作れる **Collections**
- 投稿、所有者Claim、レビュー、訂正、審査を行う **Contribution & Moderation**

## 実装済み

### 発見・調査

- パーソナライズされた発見フィード
- 金額・人数・期間・初期費用から始まるOpportunityカード
- 事業機会、金の動き、サービス、需要、募集、コレクションの横断検索
- カテゴリー、地域、個人開発、低予算、勢い、証拠、更新日の絞り込み
- 根拠ランク A–D
- 売上、利益、MRR、ARR、GMV、資金調達、実支出、契約上限、推定値の分離
- 透明なOpportunity Score
- 最大4件の比較
- 市場ヒートとランキング
- 関連するSignal、Demand、Service、Sourceの相互リンク
- リスク、参入経路、顧客獲得経路、最初の3ステップ

### 個人向け

- 保存、追跡、需要投票、支払意思、作れそう反応
- MY GOLDMINE
- 調査メモとタグ
- 公開・限定公開・非公開コレクション
- JSONエクスポート／インポート
- 調査メモCSV出力
- アプリ内通知
- 複数タブ同期
- ダーク／ライト表示
- PWA／Service Worker

### 掲載者・市場参加者向け

- URL起点のサービス掲載
- 未充足需要、Money Signal、訂正の投稿
- サービスページの所有者Claim
- 顧客、ベータ、提携、PoC、フィードバックの募集
- 募集への応募と状態管理
- サービスレビューと「参考になった」投票
- 掲載者ダッシュボード
- 閲覧、保存、問い合わせ、募集応募の集計UI
- プロモーションとOrganic評価の分離

### 本番基盤

- Supabase Auth
- PostgreSQLスキーマ、RLS、公開View、集計Trigger
- ローカル状態とクラウド状態の同期RPC
- 投稿から正式データへ変換する審査関数
- Claim承認後の所有権付与
- 募集応募・レビュー・コレクション・反応の自動集計
- Stripe Checkout、Billing Portal、署名付きWebhook、イベント冪等処理
- Resendによる二重確認メール、解除リンク、日次／週次ダイジェスト
- DNS解決とリダイレクト再検証を含むURL PreviewのSSRF対策
- Edge Function Rate Limitと監査ログ
- GitHub ActionsによるNodeテスト、Deno型検査、静的サーバーSmoke Test

## デモモードと本番モード

Supabaseを設定しない場合は、明示された体験用データとブラウザ保存で全画面を確認できます。表示される金額・企業・サービスはUIとロジック検証用であり、実在の収益実績として扱いません。

Supabaseを設定すると、公開Viewと関係テーブルから実データグラフを読み込み、デモデータはフォールバックになります。認証後は保存・反応・メモ・コレクション・応募・通知をクラウド同期します。

## ローカル起動

外部依存なしで動きます。Node.js 22以上を利用してください。

```bash
npm ci
npm run dev
```

ブラウザで `http://localhost:4173` を開きます。

検証:

```bash
npm run verify
```

## 本番接続

### 1. Supabase

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

適用される主なMigration:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_platform_complete.sql
supabase/migrations/003_security_operations.sql
supabase/migrations/004_runtime_content.sql
```

### 2. 公開設定

`config.example.js` を `config.js` にコピーし、**公開Anon Keyのみ**設定します。

```js
window.GOLDMINE_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_PUBLIC_ANON_KEY",
  siteUrl: window.location.origin + window.location.pathname,
};
```

以下は絶対にブラウザへ置きません。

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `CRON_SECRET`
- `NEWSLETTER_TOKEN_SECRET`

### 3. Edge Functions

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

Secret一覧と設定手順は [`docs/13_ENVIRONMENT_VARIABLES.md`](docs/13_ENVIRONMENT_VARIABLES.md) を参照してください。

### 4. Stripe

- Pro、Research、必要ならTeamのRecurring Priceを作成
- Price IDをSupabase Secretへ設定
- Webhook URLを `stripe-webhook` に設定
- 最低限次のイベントを購読
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

### 5. メール

- Resendで配信ドメインを認証
- `EMAIL_FROM` を認証済みドメインへ設定
- 日次／週次Cronから `send-digest` を呼び出す
- `x-cron-secret` に `CRON_SECRET` を渡す

## ディレクトリ

```text
.
├── index.html
├── config.example.js
├── src/v2/
│   ├── app.js                 # Shell、ルーティング、イベント、フォーム
│   ├── core.js                # 検索、評価、検証、状態移行
│   ├── data.js                # 体験用の接続データ
│   ├── live-data.js           # Supabase公開グラフの変換
│   ├── store.js               # Local-first状態管理
│   ├── cloud.js               # Auth / REST / RPC / Functions
│   ├── components.js          # UI部品
│   ├── dialogs.js             # 投稿・審査ダイアログ
│   └── pages/                 # 各画面
├── styles/v2.css
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── config.toml
├── scripts/
├── tests/
└── docs/
```

## 信用原則

1. **夢を先に見せ、根拠で信用させる。**
2. **数字の種類を混同しない。** 資金調達は顧客売上ではなく、GMVは運営者利益ではない。
3. **広告とOrganic評価を分離する。** 支払いでOpportunity Scoreや根拠ランクを変更できない。
4. **所有権と証拠確認を分離する。** Claim承認だけが編集権限を付与する。
5. **投稿数より根拠品質を優先する。** 重複、期間、原資料、権利、利害関係を審査する。
6. **未確認情報は未確認と表示する。** 推定・自己申告・第三者推定を監査済みと表現しない。
7. **個人データを掲載者へ横流ししない。** 掲載者には集計値を返し、応募本文やメールは目的内でのみ扱う。

## 文書

- [総合計画](docs/00_MASTER_PLAN.md)
- [プロダクト要件](docs/01_PRODUCT_REQUIREMENTS.md)
- [UX・情報設計](docs/02_UX_INFORMATION_ARCHITECTURE.md)
- [データ・根拠・スコア](docs/03_DATA_EVIDENCE_SCORING.md)
- [収益化・成長](docs/04_MONETIZATION_GROWTH.md)
- [運用・審査](docs/05_OPERATIONS_MODERATION.md)
- [技術設計](docs/06_ENGINEERING_ARCHITECTURE.md)
- [公開ロードマップ](docs/07_LAUNCH_ROADMAP.md)
- [本番運用Runbook](docs/08_PRODUCTION_RUNBOOK.md)
- [セキュリティ・プライバシー](docs/09_SECURITY_PRIVACY.md)
- [データ収集Pipeline](docs/10_DATA_PIPELINE.md)
- [法務・公開チェック](docs/11_LEGAL_LAUNCH_CHECKLIST.md)
- [テストMatrix](docs/12_TEST_MATRIX.md)
- [環境変数](docs/13_ENVIRONMENT_VARIABLES.md)
- [V3 Release Notes](docs/14_RELEASE_NOTES_V3.md)

## ライセンス

Private repository. All rights reserved.
