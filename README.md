# GOLDMINE RADAR

> **次に金持ちになる人は、何を見ているのか。**

世界中の「実際に金が動いた証拠」、伸びている需要、成功・失敗事例、既存サービス、政府・企業支出を結び、**次に狙える事業機会**へ変換するデータベース／発見サービスです。

## 中核構造

```text
Money Signal → Opportunity → Demand → Product / Service → Customer → New Money Signal
```

- 見る人: まだ知らない稼ぎ方と金脈を発見する
- 作る人: 次に作るもの・需要・最初の顧客を探す
- 掲載者: 自分のサービスを発見・比較・利用してもらう
- 買い手: 問題を解決するサービスを比較する
- 発掘者: 早期発見と先見性を証明する
- 法人・投資家: 市場、支出、競合、事業者を追う

## 実装済みMVP

- 金額・人数・期間・初期費用から始まる発見フィード
- 検索、カテゴリー、個人向け条件の絞り込み
- Opportunity、Money Signal、ServiceのDB表示
- 「欲しい」「作れそう」「追う」「保存」
- MY GOLDMINE（ブラウザ保存）
- URL-firstのサービス掲載フォーム
- 投稿・反応APIの入力検証
- 証拠ランク、DEMO表示、Organic／Promotion分離
- Supabase/PostgreSQL用スキーマ
- PRD、ユーザー心理、情報設計、信用、収益化、KPI、運用計画

## 起動

```bash
npm install
npm run dev
```

## 検証

```bash
npm run typecheck
npm run build
```

## 注意

現在の画面内の金額・企業・サービスは、UIとデータ構造を検証するための**明示されたDEMOデータ**です。富や収益を保証するサービスではありません。実データ公開時には、金額タイプ、出典、調査日、証拠ランク、更新履歴を必須にします。

詳細計画は [`docs/MASTER_PLAN.md`](docs/MASTER_PLAN.md) を参照してください。
