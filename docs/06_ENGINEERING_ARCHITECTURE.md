# 技術設計

## 1. 状態の区別

現在の`main`は価値検証用の旧Vanilla JavaScript SPAであり、本番ターゲット構成とは異なる。

### 現在の`main`

- HTML + ES Modules
- 独自CSS
- Hash routing
- localStorage
- Node標準サーバー・テスト
- PWA Service Worker

### 本番ターゲット（2026-09-06 ユーザー決定）

- Next.js + TypeScript
- Cloudflare Workers
- Neon PostgreSQL
- Drizzle ORM
- Firebase Auth
- Stripe
- Cloudflare R2（オブジェクト保存が必要な場合）
- Google Cloud Run / Cloud Run Jobs（重い・長時間処理が必要な場合）
- GitHub / GitHub Actions
- 共有調査・根拠データは`salve-de/universal-foundation`

**Supabase、Cloudflare Pages、Cloudflare Tunnelは通常の本番構成には採用しない。**

## 2. Webアプリ

本番アプリはNext.js App Router + TypeScriptを正とする。

Cloudflare Workers上でNext.jsを動かすため、実装時点でCloudflareが正式に推奨する互換レイヤーを使用する。2026-09-06時点では`vinext`が推奨経路。

- 動的なNext.js処理: Cloudflare Workers
- HTML/CSS/JS/画像等: Workers Static Assets
- Git連携の自動ビルド/公開: Workers Buildsを利用可能
- 本番URL: Custom Domain
- Pagesは新規本番ホストとして使わない
- Tunnelは通常の公開経路として使わない

Workers固有処理をアプリ全体へ広げず、ホスティング境界に寄せる。

## 3. データ層

### Neon PostgreSQL

本番のリレーショナルデータはNeon PostgreSQLへ置く。

主要な関係は次を基本とする。

共有収集では、出典の有無を保存の入口で必須にしない。出典がない候補は `UNVERIFIED` として保持し、出典・検証状態・取得日は別フィールドで扱う。利益、コスト、利益率、手取りは売上・GMV・資金調達と別の金額種別として扱う。

- profiles
- categories
- opportunities
- money_signals
- services
- demands
- evidence_sources
- opportunity_signals
- opportunity_services
- opportunity_demands
- reactions
- demand_votes
- saves
- follows
- collections
- service_claims
- submissions
- product_events
- newsletter_subscriptions

旧`supabase/` SQLは過去のデータモデル参考資産としてのみ扱う。必要なモデルをDrizzle schema/migrationへ移植し、Supabase固有API・Auth・Storage・Service Roleへの新規依存は作らない。共有調査・根拠データの正規契約は `salve-de/universal-foundation` とする。

### Drizzle ORM

- schemaをTypeScript側で管理する
- migrationをレビュー可能な形で残す
- 本番DB変更はアプリデプロイと無秩序に混ぜない
- 必要カラムのみ取得し、不要な`SELECT *`を避ける

## 4. 認証・認可

認証はFirebase Authを使用する。

基本フロー:

```text
Browser
  -> Firebase Auth login
  -> Firebase ID token
  -> Next.js / Worker server boundary
  -> token verification + user/role authorization
  -> Neon query/mutation
```

ブラウザへNeonの管理資格情報を渡さない。Firebaseでログインできることと、Neon上のデータを操作できることは別に判定する。

- 初回閲覧・検索ではログインを要求しない
- クラウド保存、Claim、投稿履歴等では必要に応じてログインを要求する
- 管理者権限はサーバー側で検証する
- Firebase UIDとアプリ内部ユーザーIDの対応を一意に管理する

## 5. 決済

Stripeを使用する。

- Checkout / Subscription / Customer Portal等は必要な商品設計に合わせて採用
- Webhookを本番の契約状態の更新元として扱う
- クライアント自己申告だけで有料権限を付与しない
- Webhookの署名検証・重複配送対策を行う

## 6. オブジェクト/ファイル

画像、添付、生成物などオブジェクト保存が必要になった場合はCloudflare R2を使う。

共有可能な調査原典・研究データについてはMake-money独自のR2配置を作らず、`universal-foundation`のデータ契約とRunbookを正とする。

## 7. 重い処理

Cloudflare Workersへ次を押し込まない。

- 長時間バッチ
- 大量スクレイピング
- ブラウザ自動化
- 大きなPDF/画像処理
- native依存処理
- Pythonの方が自然な処理

必要な場合だけCloud Run / Cloud Run Jobsへ分離する。

## 8. 検索

初期はPostgreSQL標準機能を優先する。

- generated `tsvector`
- `pg_trgm`による表記揺れ・部分一致
- カテゴリー、地域、根拠、状態の複合index
- 人気度と検索適合度・信頼度を分離

外部検索サービスは実データ量と性能測定で必要性が出るまで追加しない。

## 9. 分析イベント

最低限、次を`product_events`等へ記録する。

- page_view
- search
- filter_changed
- opportunity_opened
- signal_source_opened
- save
- follow
- compare_added
- demand_want_vote
- demand_pay_vote
- service_outbound_click
- submission_started / completed
- claim_started / completed
- pricing_viewed

個人特定が不要なイベントは匿名セッションで扱う。

## 10. セキュリティ

- DB資格情報・Stripe secret・Firebase server credentialsをブラウザへ置かない
- URLはhttp/httpsのみ許可し、外部取得はSSRF対策を行う
- ユーザー入力は出力先に応じて適切にエスケープ/サニタイズ
- 管理処理をクライアント表示だけで許可しない
- 投稿・投票・ログイン・決済へ適切なレート制限/Bot対策
- 外部リンクへ`noopener noreferrer`
- CSP、Permissions-Policy、Referrer-Policy等を設定
- Firebase ID token / セッションをサーバー側で検証
- Stripe Webhook署名を必ず検証

## 11. 品質ゲート

本番Next.js実装では最低限次を必須化する。

- typecheck
- lint
- unit/integration tests
- production build
- Cloudflare Workers向けbuild/compatibility check
- Firebase Auth -> server -> Neonの認証E2E
- Stripe Webhookのテスト
- モバイル実機・キーボード操作・主要アクセシビリティ
- GitHub ActionsでPR/push時に自動検証

実装チェックで問題が出ても、ユーザー決定なしにVercelやSupabaseへ自動的に戻してはならない。具体的な互換性問題を修正するか、阻害要因を明示する。
