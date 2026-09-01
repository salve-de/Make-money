# 技術設計

## 1. 現在の実装方針

最初の価値検証を、外部APIやビルド環境に依存せず実行できる静的SPAとして実装した。

- HTML + ES Modules
- 独自CSS
- Hash routing
- localStorage
- Node標準サーバー・テスト
- PWA Service Worker

これにより、リポジトリを取得してすぐに全画面と主要操作を確認できる。

## 2. フロントの分離

### `src/data.js`

画面が要求する正規化済みエンティティ。現在は体験用データ。

### `src/core.js`

検索、正規化、スコア、フィルター、推薦、ルーティングなどDOMに依存しない関数。ユニットテスト対象。

### `src/app.js`

ルートごとのレンダリング、イベント委譲、localStorage状態、投稿、共有、PWA登録。

### `styles/app.css`

色、余白、カード、表、モバイルナビ、フォーム、詳細画面。

## 3. 本番データ層

Supabase PostgreSQLへ次の関係を持つ。

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

公開済みレコードは匿名読取可。投稿、保存、Claim、管理操作はRLSで分離する。

## 4. 本番接続方法

1. SQL migration適用
2. `SUPABASE_URL` と `SUPABASE_ANON_KEY` をホスト環境へ設定
3. 読取Adapterで公開Viewをフロント形式へ変換
4. 未ログイン投稿は `submissions` へ、ログイン投稿は `submitted_by` 付きで保存
5. 管理者が承認後、正規テーブルへ反映
6. localStorageは未ログイン操作とオフラインキャッシュに残す

## 5. 認証

推奨はSupabase AuthのメールOTP。

- 初回閲覧・検索・保存体験ではログインを要求しない
- 端末内保存からクラウド同期する時にログインを求める
- Claim、問い合わせ、公開コレクション、投稿履歴はログイン必須
- 管理者権限は`profiles.role`とサーバー側検証を併用

## 6. 検索

初期はクライアント検索。データ増加後は以下へ移す。

- PostgreSQL generated `tsvector`
- `pg_trgm`による表記揺れ・部分一致
- カテゴリー、地域、根拠、状態の複合index
- 人気度ではなく検索適合度と信頼度を分ける

## 7. 分析イベント

最低限、次を`product_events`へ送る。

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

個人特定が不要なイベントは匿名セッションIDで扱う。

## 8. セキュリティ

- Service Role Keyをブラウザへ置かない
- RLSを無効にしない
- URLはhttp/httpsのみ許可
- ユーザー文字列はHTMLエスケープ
- 管理処理をクライアントのrole表示だけで許可しない
- 投稿・投票へレート制限とBot対策を追加
- 外部リンクへ`noopener noreferrer`
- CSP、Permissions-Policy、Referrer-Policyを配信側で設定

## 9. 品質ゲート

- `npm run check` — 必須ファイル、ID、参照整合性、スコア範囲、危険URL
- `npm test` — コアロジック
- GitHub Actions — push / pull requestで自動実行
- 本番前 — モバイル実機、キーボード操作、スクリーンリーダー、Lighthouse
