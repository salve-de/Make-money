# GOLDMINE RADAR

> 世界中の「実際に金が動いた証拠」を集め、次に大きくなる市場と、自分が入れる事業機会を発見するデータベース／発見サービス。

GOLDMINE RADAR は、成功事例メディア、事業機会DB、サービスディレクトリ、需要DBを、**Money Signal → Opportunity → Product → Customer → 新しい Money Signal** という一つの循環に統合するプロダクトです。

## 何を提供するか

- 誰が、何を作り、どれくらい売上・利益・契約・売却を得たか
- 企業・政府・消費者の金が、どの分野へ移動しているか
- なぜその需要が生まれたか
- 既存サービスでは何が満たされていないか
- 個人・小規模チームがどこから参入できるか
- 自分のサービスを掲載し、顧客・ベータ利用者・提携先を探す導線

## プロダクトの中心

表側は、金額・人数・期間から始まる **Opportunity Feed**。裏側は、サービス・人物・企業・金の動き・需要・根拠を接続した **Money Flow Database** です。

ユーザーに与える中心感情は次です。

> 世の中には、まだ自分が知らない金儲けの方法が大量にある。普通の人も成功している。このサイトを見続ければ、自分も金脈を早く見つけられるかもしれない。

## 現在の実装

このリポジトリには以下を含みます。

- Next.js App Router / TypeScript のレスポンシブWeb版MVP
- Opportunity、Money Signal、Product、Demand Gap のデモDB
- 保存、反応、MY GOLDMINE
- URL起点のサービス掲載フロー
- 投稿APIのSupabase接続準備とローカルフォールバック
- Supabase初期スキーマ
- プロダクト戦略、PRD、データ設計、収益、成長、運用、ロードマップ

## ローカル起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## 環境変数

`.env.example` を `.env.local` にコピーしてください。Supabaseを設定しなくてもデモモードで動作します。

```bash
cp .env.example .env.local
```

## ドキュメント

- [Vision](docs/00-VISION.md)
- [Product Strategy](docs/01-PRODUCT-STRATEGY.md)
- [PRD](docs/02-PRD.md)
- [Users & Jobs](docs/03-USERS-AND-JOBS.md)
- [Information Architecture](docs/04-INFORMATION-ARCHITECTURE.md)
- [Data Model](docs/05-DATA-MODEL.md)
- [Trust & Moderation](docs/06-TRUST-AND-MODERATION.md)
- [Monetization](docs/07-MONETIZATION.md)
- [Growth Loops](docs/08-GROWTH-LOOPS.md)
- [Metrics](docs/09-METRICS.md)
- [Roadmap](docs/10-ROADMAP.md)
- [Implementation](docs/11-IMPLEMENTATION.md)
- [Launch Plan](docs/12-LAUNCH-PLAN.md)
- [Research & Competitors](docs/13-RESEARCH-AND-COMPETITORS.md)
- [Decision Log](docs/DECISIONS.md)

## 重要な原則

1. 夢を先に見せるが、数字の意味を偽らない。
2. 資金調達、売上、利益、GMV、契約上限、推定値を分離する。
3. 広告費でOrganic順位を買えないようにする。
4. 自由投稿は構造化し、出典・所有者・確認レベルを表示する。
5. ユーザーの重い入力を避け、閲覧・保存・選択を中心にする。
6. AI生成アイデアだけで終わらず、必ずMoney Signal、Demand、Product、Evidenceへ接続する。

## License

Private repository. All rights reserved.
