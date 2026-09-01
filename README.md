# GOLDMINE RADAR

**実際に金が動いた証拠から、次の事業機会を発見するDB／マーケットプレイス。**

GOLDMINE RADAR は、成功談を読むだけのメディアでも、AIが思いつきを量産するアイデア集でもありません。

- 誰が、誰から、何に、いくら受け取ったかを示す **Money Signal**
- 金が動き、需要が続き、まだ参入余地がある **Opportunity Window**
- 欲しい人に対して解決策が不足している **Demand Gap**
- 既存サービス、創業者、支援者、顧客を接続する **Service Database**

を同じデータモデルで結びます。

表側は、見た瞬間に「こんな稼ぎ方があるのか」「まだ自分にも入口がある」と理解できる発見フィード。裏側は、金・需要・サービス・根拠の関係を蓄積する事業機会DBです。

## 現在実装されているもの

### 発見と調査

- パーソナライズされた発見フィード
- 金脈DB、金の動きDB、サービスDB、未充足需要DB
- 全DB横断検索（`⌘/Ctrl + K`）
- カテゴリー、地域、根拠ランク、参入状態、個人開発向け条件による絞り込み
- 勢い、需要の空白、作りやすさ、金額、更新日による並べ替え
- 根拠ランク A–D と数字の種類の明示
- 金脈同士の最大4件比較
- ランキングと市場ヒート

### 個人向け

- 興味分野、1人開発、低予算、日本向けによる初期パーソナライズ
- 保存、追跡、比較、反応
- `MY GOLDMINE` ポートフォリオ
- 早期発見スコア
- 市場別の最有力入口、リスク、最初の行動

### 掲載者・コミュニティ向け

- サービス、未充足需要、金の動きの投稿
- URLからサービス名の下書き生成
- サービスページの所有者Claim
- 「欲しい」「金を払ってもよい」の需要投票
- 掲載者ダッシュボード
- 閲覧、注目、関連需要、発見経路の分析UI
- 未確認情報と確認済み情報の明確な分離

### 運用・品質

- モバイル、タブレット、デスクトップ対応
- PWA manifest と Service Worker
- localStorageによる操作・投稿データの永続化
- 入力エスケープと基本的なXSS対策
- Node標準テストランナーによるユニットテスト
- 参照整合性・必須ファイル・危険URLの静的検証
- GitHub ActionsによるCI
- 本番移行用Supabaseスキーマ、RLS、集計View

## 起動

外部依存はありません。Node.js 20以上を使います。

```bash
npm run dev
```

ブラウザで `http://localhost:4173` を開きます。

検証は次です。

```bash
npm run verify
```

## デモデータについて

現在のフロントには、UIとロジックを確認するための**明示された体験用データ**が入っています。数字を実在する確定実績として表示するものではありません。本番公開時は、管理画面またはETLから検証済みデータをSupabaseへ投入し、`DEMO_MODE` を解除します。

## 技術構成

| 層 | 現在 | 本番移行 |
|---|---|---|
| UI | Vanilla JavaScript SPA | そのまま利用可能 |
| CSS | 独自レスポンシブCSS | デザイントークンとして継続 |
| ルーティング | Hash routing | 静的ホスティング対応 |
| ローカル状態 | localStorage | 未ログイン体験・キャッシュ |
| 本番DB | SQLスキーマ実装済み | Supabase PostgreSQL |
| 認証 | ローカル体験 | Supabase Auth |
| 投稿審査 | UI・状態設計 | submissions + moderation |
| 検索 | クライアント全文検索 | PostgreSQL FTS / pg_trgmへ拡張 |
| 配信 | 任意の静的ホスト | GitHub Pages / Cloudflare Pages等 |

## ディレクトリ

```text
.
├── index.html
├── src/
│   ├── app.js          # 画面、イベント、ローカル状態、ルーティング
│   ├── core.js         # 検索、評価、比較、整形の純粋関数
│   └── data.js         # 体験用の構造化データ
├── styles/app.css      # UI全体
├── assets/
├── scripts/
│   ├── dev.mjs         # 静的開発サーバー
│   └── check.mjs       # データ・ファイル検証
├── tests/core.test.mjs
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   └── seed.sql
├── docs/
└── .github/workflows/quality.yml
```

## プロダクト原則

1. **夢を先に見せ、根拠で信用させる。** 金額、人数、期間、入口を先に理解できるようにする。
2. **資金調達、売上、利益、GMV、契約上限、推定を混同しない。**
3. **広告と評価順位を分離する。** 有料掲載でオーガニック順位は上がらない。
4. **投稿数より根拠品質を優先する。** ゴミ投稿で発見体験を壊さない。
5. **情報ではなく接続を生む。** Money Signal → Opportunity → Demand → Service → Customer → 新しいMoney Signal の循環を作る。
6. **重い入力を要求しない。** URL、保存、反応、数個の選択から価値を返す。

## 文書

- [プロダクト総合計画](docs/00_MASTER_PLAN.md)
- [要件定義](docs/01_PRODUCT_REQUIREMENTS.md)
- [情報設計・UX](docs/02_UX_INFORMATION_ARCHITECTURE.md)
- [データ・根拠・スコア](docs/03_DATA_EVIDENCE_SCORING.md)
- [収益化・成長戦略](docs/04_MONETIZATION_GROWTH.md)
- [投稿審査・運用](docs/05_OPERATIONS_MODERATION.md)
- [技術設計](docs/06_ENGINEERING_ARCHITECTURE.md)
- [公開ロードマップ](docs/07_LAUNCH_ROADMAP.md)

## 本番化に必要な外部設定

コードは外部アカウントなしでも動作します。複数ユーザーで共有される本番サービスにする際は、次だけが必要です。

1. Supabaseプロジェクト作成
2. `supabase/migrations/001_initial_schema.sql` の適用
3. Authのメールログイン設定
4. URL・Anon Keyのランタイム設定
5. 初期データの検証・投入
6. プライバシーポリシー、利用規約、問い合わせ先の事業者情報への差し替え

## ライセンス

Private repository。外部公開時のライセンスは事業方針確定後に設定してください。
