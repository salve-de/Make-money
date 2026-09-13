# Dynamic Dossier Architecture — Make-Money

## 目的

Make-Moneyは「全企業に同じ項目を埋める会社図鑑」ではない。

世界中のEntity / Evidence / Claim / Metric / MoneySignal / Event / Relationship / ObservationをFoundationへ損失なく蓄積し、各事例について**その時点で本当に存在する情報から、金が生まれた核心を最も分かりやすく見せる**。

キーエンスの現在UIはデータスキーマではなく、良いDossierの情報密度・読み味の参考実装である。

## 不変原則

1. **Foundationは自由、Viewは選別**
   - Foundationへ保存する情報を現在のUI項目で制限しない。
   - 未知の有用情報はObservation / Journalとして保持する。
2. **Entity != Case**
   - 会社、人物、顧客、サービス、プラットフォームはEntity。
   - 一つのEntityから複数の意味あるCaseが生まれてよい。
   - 関係情報しかないEntityを無理にFull Dossier化しない。
3. **最低モジュール数を強制しない**
   - データが無いのにFirst Cash / Moat / Steal This等を生成しない。
   - 情報量に応じて `FULL_DOSSIER / FOCUSED_CASE / SIGNAL / RELATED_ENTITY` とする。
4. **事実・計算・分析を分離する**
   - reported / observed / calculated / estimated / inferredを混ぜない。
   - CONFLICTED / UNVERIFIED / UNKNOWNを0や断定に変換しない。
5. **左は規律、右は個性**
   - 左台帳は比較可能な固定レイアウトを維持する。
   - 右Dossierは事例ごとに発火するモジュールを変える。
6. **UIはFoundationの正本にならない**
   - Dossier、ランキング、タグ、Window判定、Playbookは再生成可能なProjection。

## UIの固定骨格

### 左台帳

固定スロット:

- CASE / MONEY MECHANISM
- STRONGEST SIGNAL
- QUALITY / FRESHNESS

Strongest Signalは売上に固定しない。Revenue / Profit / MRR / Exit / First Cash / Customer Outcome / Time Saved等から、その事例で最も強い確認済みSignalを出す。

### 右Dossier

固定タブ:

- CORE
- FINANCIALS
- PLAYBOOK
- STREAM
- EVIDENCE

中のモジュールは可変。

## Module Library

現在の初期ライブラリ:

- BUSINESS DNA
- MONEY MACHINE
- FIRST CASH
- DISTRIBUTION ENGINE
- PRICING / PRICE EVOLUTION
- FINANCIAL X-RAY
- LEVERAGE
- CUSTOMER PROOF
- FAILURE / PIVOT
- CAPITAL CONTROL
- PLATFORM DEPENDENCY
- MARKET GLITCH
- MOAT / INCUMBENT DILEMMA
- STEAL THIS / TRANSFERABLE MECHANISM
- REALITY CHECK / DON'T COPY
- COUNTER EVIDENCE
- RESEARCH LIMIT

これは閉じた列挙ではない。将来、新しい有用な構造（Regulatory Arbitrage、Supply Constraint、Marketplace Liquidity、AI Displacement等）が見つかったら新しいModuleを追加し、過去データを再評価する。

## Moduleの発火条件

各Moduleは「存在する証拠」で発火する。

例:

- `FIRST CASH`: first_sale event / first-paying claim / early payment metricがある
- `PRICE EVOLUTION`: 異なる時点のprice metric、または出典付き価格履歴がある
- `LEVERAGE`: 同期間のRevenue/ProfitとHeadcountがある場合だけ計算
- `CUSTOMER PROOF`: customer relationship + outcome metric/claimがある
- `FAILURE / PIVOT`: failure / layoffs / pivot / shutdown等のEvent/Claimがある
- `COUNTER EVIDENCE`: CONFLICTED記録や明示的反証がある
- `STEAL THIS`: 根拠に紐づく既存Derivedまたは明示的なFact patternからのみ構成する

発火しない場合は非表示。空欄を埋めない。

## Case Level

- `FULL_DOSSIER`: 多方向の高価値Signalがあり、十分なEvidenceがある
- `FOCUSED_CASE`: 2〜数個のテーマで具体的価値がある
- `SIGNAL`: 一つの具体的Signalとして有用
- `RELATED_ENTITY`: 関係情報として保持するが独立記事化するには薄い

これは収益性ランキングではなく表示密度・調査状態。

## 100件〜100億件まで変えない意味モデル

件数が増えても次の論理は変えない。

```text
WORLD / SOURCES
  -> FOUNDATION (lossless facts + evidence)
  -> SIGNALS
  -> MODULE PROJECTION
  -> CASE / DOSSIER
  -> CROSS-CASE INTELLIGENCE
  -> GOLD WINDOW / USER DECISION
```

規模で変えるのは計算・検索インフラだけ。

- 小規模: read-time projectionでもよい
- 中〜大規模: projectionを事前生成しServing Read Modelへ置く
- 超大規模: partition / incremental projection / search index / analytical storeを使う

FoundationをUI都合で書き換えない。

## 最終的にユーザーへ答える問い

各Dossier単体では次を最短で答える。

1. 何で金を取っているか
2. 誰が何に払っているか
3. 何が金を生む構造なのか
4. 実際にどの数字で確認できるか
5. どう最初に突破したか
6. 何が壊れる条件か
7. 何が現在も使えるか
8. どの部分なら他市場へ転用できるか
9. どこまで事実で、どこから分析か

大量データが揃った後は、個別企業理解で終わらず、成功・失敗・価格・利益・集客・市場変化を横断し「今どこに金が残っているか」を発見する。これがGOLDMINE / Make-Moneyの上位価値である。
