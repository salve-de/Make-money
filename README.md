# GOLDMINE RADAR

**実際に金が動いた証拠から、次の事業機会を発見するDB／マーケットプレイス。**

GOLDMINE RADAR は、成功談を読むだけのメディアでも、AIが思いつきを量産するアイデア集でもありません。

- 誰が、誰から、何に、いくら受け取ったかを示す **Money Signal**
- 金が動き、需要が続き、まだ参入余地がある **Opportunity Window**
- 欲しい人に対して解決策が不足している **Demand Gap**
- 既存サービス、創業者、支援者、顧客を接続する **Service Database**

を同じデータモデルで結びます。

表側は、見た瞬間に「こんな稼ぎ方があるのか」「まだ自分にも入口がある」と理解できる発見フィード。裏側は、金・需要・サービス・根拠の関係を蓄積する事業機会DBです。

## データ収集の共通契約

出典は信用状態を決める情報であって、候補を拾う入口の絶対条件ではありません。出典なしの候補も「未確認」「出典未取得」と明示して保存・表示し、後から根拠を追補します。利益は最優先で、売上、利益、コスト、利益率、手取りを別々の金額・期間として扱います。

- [Make-Money収集要件](docs/08_COLLECTION_CONTRACT.md)
- [Universal Foundationの共通収集基準](https://github.com/salve-de/universal-foundation/blob/main/docs/UNIVERSAL_COLLECTION_BASELINE.md)
- [Universal Foundation完全化要件（PR #3）](https://github.com/salve-de/universal-foundation/blob/codex/universal-collection-contract-20260906/docs/UNIVERSAL_COMPLETION_REQUIREMENTS.md)

## 実装状態

`main` は現在、旧Vanilla JavaScript SPA実装です。これは既存の動作確認用実装であり、**本番ターゲット技術構成ではありません**。

本番ターゲットは2026-09-06に次で確定しました。

- **App:** Next.js + TypeScript
- **Web runtime / hosting:** Cloudflare Workers
- **Next.js on Workers:** Cloudflareが現時点で推奨する互換レイヤーを使用（現在は `vinext`）
- **Database:** Neon PostgreSQL
- **ORM / schema:** Drizzle ORM
- **Authentication:** Firebase Auth
- **Payments:** Stripe
- **Object/file storage:** Cloudflare R2（必要な場合）
- **Heavy/long-running jobs:** Google Cloud Run / Cloud Run Jobs（必要な場合）
- **Source / CI:** GitHub / GitHub Actions
- **Shared research/evidence:** `salve-de/universal-foundation`

**Supabaseは本番構成では使用しません。Cloudflare Pages / Tunnelも通常の本番配信経路には使用しません。**

## 現在の旧mainで確認できる機能

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

## 旧mainの起動

現在の`main`はNode.js 20以上で起動できます。

```bash
npm run dev
```

ブラウザで `http://localhost:4173` を開きます。

```bash
npm run verify
```

## デモデータについて

現在の旧フロントには、UIとロジックを確認するための**明示された体験用データ**が入っています。数字を実在する確定実績として表示するものではありません。

本番では、検証済みの構造化データをNeon PostgreSQLへ反映し、共有可能な調査・根拠データは`universal-foundation`の契約に従います。

## 技術構成

| 層 | 現在の`main` | 本番ターゲット |
|---|---|---|
| App | Vanilla JavaScript SPA | Next.js + TypeScript |
| Routing | Hash routing | Next.js App Router |
| Web runtime | Node標準のローカル静的サーバー | Cloudflare Workers |
| Static assets | ローカル静的配信 | Workers Static Assets |
| DB | デモ/localStorage中心 | Neon PostgreSQL |
| ORM | なし | Drizzle ORM |
| Auth | ローカル体験 | Firebase Auth |
| Payments | 未接続 | Stripe |
| Object storage | なし | Cloudflare R2（必要時） |
| Heavy jobs | なし | Cloud Run / Jobs（必要時） |
| CI | GitHub Actions | GitHub Actions |

## 旧Supabase資産について

`supabase/` ディレクトリとSupabase向けSQLは**過去の設計資産**です。本番採用方針ではありません。

本番実装時は、必要なデータモデルだけをNeon + Drizzle向けに移植し、Supabase Auth / Storage / Service Role / Supabase固有RLSへの新規依存は追加しません。

## プロダクト原則

1. **夢を先に見せ、信頼状態を明示する。** 金額、人数、期間、入口、出典の有無を先に理解できるようにする。
2. **資金調達、売上、利益、GMV、契約上限、推定を混同しない。**
3. **広告と評価順位を分離する。** 有料掲載でオーガニック順位は上がらない。
4. **投稿数よりデータ品質を優先する。** 出典なしの候補は捨てず未確認として分離し、ゴミ投稿で発見体験を壊さない。
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
- [データ収集契約](docs/08_COLLECTION_CONTRACT.md)

## 本番化に必要な外部設定

1. Cloudflare Workersプロジェクト・Custom Domain設定
2. Neon PostgreSQL作成とDrizzle migration適用
3. Firebase Auth設定
4. Stripe本番設定・Webhook設定
5. R2が必要な機能だけR2バケット/権限設定
6. 重いバッチが必要な場合だけCloud Run / Jobs設定
7. 初期データの検証・投入
8. プライバシーポリシー、利用規約、問い合わせ先の事業者情報への差し替え

## ライセンス

Private repository。外部公開時のライセンスは事業方針確定後に設定してください。
