# Make-Money 最終プロダクト計画

最終決定: 2026-10-02

この文書は、Make-Moneyの**プロダクト機能・ユーザー体験・実装境界の最終計画**です。
データ収集・事実/推論・権利・保存の規則は [OWNER_INTENT.md](./OWNER_INTENT.md) と既存の収集正本を維持します。

古いREADME、PROJECT_CHARTER、過去のPhase記録、旧UI、旧機能にこの文書と食い違う案が残っていても、**プロダクト機能の範囲についてはこの文書を優先**します。

---

## 1. 最終的に何を提供するか

Make-Moneyは、単なる「儲かった事例のデータベース」でも、単なるAIノーコードツールでも、単なるMarketplaceでもありません。

ユーザーが次の流れを一つのサービス内で進められることを中核価値とします。

```text
大量の実在事例を見る
↓
今どこで需要・変化・金が動いているか知る
↓
大量の事例と現在の市場から、共通する勝ち方・機会を知る
↓
自分なら何を作るか決める
↓
その場でAIを使って実際に作る
↓
公開し、価格と決済を付けて買える状態にする
↓
Make-Money内で売る
↓
他人の商品を自分が営業・紹介して売ることもできる
↓
自分の商品をMake-Money内で広告できる
↓
実際の閲覧・作成・販売・継続等の結果が次の需要・機会判定に戻る
```

これをMake-Money本体とします。

---

## 2. ユーザーから見える中核機能

### 2.1 CASES — 事例DB

「世の中では実際に、誰が・誰に・何を・いくらで売り、どう顧客を取り、どの程度利益を残しているのか」を大量に見られる場所。

主要内容:

- 何を売っているか
- 誰が買っているか
- 価格
- 売上・利益・原価・手残り
- 最初の顧客
- 現在の集客経路
- 人数・必要資本・作業量
- 使用ツール・技術
- 紹介・前金・継続構造
- なぜ成立したか
- 何が壊れる条件か
- 失敗・撤退・ピボット
- 今も通用するか
- 出典、時点、事実/本人申告/第三者推計/推定/推測の区別

大量の事例があること自体を価値にしつつ、一覧を眺めるだけで終わらせません。後段のTrend / Opportunity / Buildの入力になります。

### 2.2 TRENDS — トレンド・需要

過去の成功談ではなく、**今どこで需要・供給・競争・価格・不満・実売上が変化しているか**を見る場所。

単独の1指標ではなく、可能な範囲で複数Signalを統合します。

例:

- 検索関心
- 新規サービス・新規参入
- 価格変化
- 求人・採用
- 顧客の不満・要望
- 新しい事例
- 競争増減
- Make-Money内の閲覧・保存
- Build数
- 掲載数
- 販売数
- 継続・返金などの実績

最終的には外部トレンドだけでなく、Make-Money内の実行・取引データも使い、「実際に何が作られ、何が売れ始めているか」を見せられる状態を目指します。

### 2.3 OPPORTUNITIES — 共通項・勝ち方・何をやるか

大量事例とTrendを、ユーザーが実際に使える判断へ圧縮します。

役割:

- 複数事例から共通する収益構造を抽出
- 成功条件と失敗条件を分離
- 顧客、価格、集客、必要資本、人数、作業量を比較
- 現在のTrendと組み合わせる
- 「この条件なら、今どんな事業が作れるか」へ落とす

単なる汎用AIチャットではなく、Make-Money独自データを入力にする意思決定機能です。

### 2.4 BUILD — 実際に作る

Opportunityを読んで外部のBolt/Lovable/v0等へ放り出すのではなく、Make-Money内からそのまま作り始められるようにします。

流れ:

```text
Case / Trend / Opportunity
↓
顧客・商品・価格・必要機能をBuild Spec化
↓
AIコード生成provider
↓
Preview
↓
自然言語で修正
↓
ソース取得
```

Make-Moneyの差別化は「コード生成AIを自作すること」ではありません。
**何を作るべきか、その事業が誰に何をいくらで売るものかを知った状態で生成を始められること**です。

### 2.5 LAUNCH — 公開して買える状態にする

BuildとMarketplaceの間に必要な機能です。

```text
生成
↓
検査
↓
公開
↓
URL
↓
価格
↓
決済
↓
実際に購入可能
```

Buildでコードができただけでは商品完成としません。
Hosting、Domain、DB、決済等を接続し、実際に購入できる状態まで持っていきます。

Launchは独立した巨大ワークスペースにせず、Builderの完成工程として一体化させます。

### 2.6 MARKET — 作った商品をMake-Moneyで売る

ユーザーが作ったSaaS、Webサービス、デジタル商品等をMake-Money内に掲載できます。

重要なのは、単なる出品一覧にしないことです。

Case / Trend / Opportunityと接続し、

- どの市場向けの商品か
- 関連する需要
- 関連事例
- 価格
- 実績
- 販売条件

を同じデータ空間で扱います。

### 2.7 DISTRIBUTE — 他人の商品を売って稼ぐ

ユーザーは必ずしも自分で商品を作る必要はありません。

商品提供者が販売を許可した商品について、他ユーザーが専用リンク等を使って営業・紹介・販売し、成果に応じて報酬を得られるようにします。

必要な概念:

- 商品ごとの販売可否
- 紹介・販売報酬
- 単発/継続報酬
- attribution
- click / conversion / order
- refund時の調整
- commission
- payout状態

Make-Money自身の紹介制度とは別です。
**Make-Money上の商品を他ユーザーが販売する市場**を意味します。

### 2.8 PROMOTE — 自分の商品をMake-Money内で広告する

出品者が、自分の商品をMake-Money内で有料露出できます。

候補枠:

- Trend
- Opportunity
- 関連事例
- 検索結果
- Marketplace

最初から広告ネットワーク全体を作る必要はありません。
商品、対象カテゴリ、予算、期間、表示、click、conversionを持つところから始めます。

広告であることはユーザーに明確に表示します。

---

## 3. 裏側の最重要機能 — FEEDBACK

ユーザー向けには上の8機能ですが、Make-Moneyを長期的に強くするのはFeedbackです。

可能な範囲で次を記録します。

- 何が見られたか
- 何が保存されたか
- どのOpportunityからBuildされたか
- 何が公開されたか
- 何がMarketplaceへ掲載されたか
- 何が売れたか
- 誰が販売したか
- どのチャネルから売れたか
- 価格
- conversion
- refund
- 継続

そして、

```text
実際の行動・取引
↓
Signal
↓
Trend
↓
Opportunity
↓
Build
↓
また実際の行動・取引
```

という閉じたループにします。

長期的な差別化は、生成AIそのものではなく、
**「実際に何が作られ、何が売れ、どの条件で継続したか」という独自データ**です。

---

## 4. 内部では4エンジンにまとめる

ユーザー向け機能を8個の別サービスとして作りません。

### A. Intelligence Engine

担当:

- Case
- Signal
- Trend
- Opportunity

流れ:

```text
Case
↓
Signal
↓
Trend
↓
Opportunity
```

OpportunityをAIの妄想で作らず、事例・市場Signal・実績を根拠に作ります。

### B. Creation Engine

担当:

- Project
- Build Spec
- Build
- Preview
- Launch

コード生成providerやHosting providerは交換可能な外部工場として利用します。
Make-MoneyはOpportunity、Build Spec、ユーザー関係、実績を握ります。

### C. Commerce Engine

担当:

- Product
- Market
- Distribution
- Promotion
- Order
- Commission

Market / Distribution / Promotionを別々の巨大システムにせず、同じProductを中心に分岐させます。

```text
             Product
           /    |     \
        購入   紹介    広告
         |      |      |
       Order Commission Promotion
```

### D. Feedback Engine

担当:

- Event
- Attribution
- Order result
- Retention
- Refund
- Aggregate Signal

CommerceとCreationの結果をIntelligenceへ返します。

---

## 5. 中核データモデル

最終的に必要な概念は大きく次です。

- `Case` — 実在する事業事例
- `Signal` — 市場・需要・供給等の観測
- `Trend` — Signalの時系列変化
- `Opportunity` — 事例とTrendから得た実行候補
- `Project` — ユーザーが作っている事業
- `Product` — 公開・販売可能な商品
- `PartnerOffer` — 他ユーザーが販売できる条件
- `Attribution` — 誰が顧客を連れてきたか
- `Order` — 実際の購入
- `Commission` — 紹介・販売報酬
- `Promotion` — Make-Money内広告
- `Event` — 閲覧、保存、Build、掲載、購入等の行動

画面数や機能名を増やしても、同じ概念を二重に作らないこと。

---

## 6. 個人開発で成立させるための境界

ユーザー価値を削るのではなく、巨大インフラを自作しないことで個人開発を成立させます。

### Make-Moneyが自前で持つ

- 事例・Evidence・市場Signal
- Trend算出
- Opportunity生成ロジック
- Build Spec
- Builder orchestration
- Marketplace
- Product / Order / Attribution / Commissionの台帳
- Promotion
- Feedback
- ユーザーとの関係
- 独自の実績データ

### 外部providerへ任せる

- 基盤LLM
- コード生成エンジン
- 生成中ランタイム
- Hosting基盤
- Domain/DNSの実処理
- 決済基盤
- 本人確認/KYC
- 実際の資金移動・payout
- Email等の汎用インフラ

Make-Moneyは「頭脳・市場・台帳・独自データ」を握り、交換可能なproviderを「工場・配管」として使います。

---

## 7. 最終計画から外すもの

以下はMake-Moneyの中核プロダクトではありません。

### M&A

**最終計画から外す。**
事業売買・M&AをMake-Moneyの主要導線にしません。
既存コードや過去文書にM&A機能が残っていても、この最終計画の中核には含めません。

### 独立したExecutionワークスペース

「実行計画」という別世界を大きく育てません。
必要な実行状態はOpportunity → Build → Launchの各段階へ吸収します。

### 独立Finder

別の50軸Finderを主要機能にしません。
探索・絞り込みはCases / Trends / Opportunitiesの中へ統合します。

### Compare専用プロダクト

比較自体は有用なので残せますが、独立した主役にはしません。
Case / Opportunity内の補助操作として扱います。

### 巨大SNS

投稿・フォロー・タイムラインを持つSNSを本体にはしません。
販売・広告・実績に直接つながる必要が出た場合だけ最小限追加します。

### Newsletter / Alert / Bookmark

有用な補助機能ですが、プロダクトの価値定義には置きません。
Cases / Trends / Opportunitiesを再訪・保存するための補助として扱います。

### Goal Layer

「月いくら欲しい」からの逆算は将来Opportunityへ追加可能ですが、独立した主役にはしません。

### 汎用AIチャット

AIチャットそのものを商品にしません。
Cases / Trends / Opportunities / Buildそれぞれの文脈に埋め込みます。

---

## 8. UIの主導線

最終的な主導線は、概念として次です。

```text
CASES
  ↓
TRENDS
  ↓
OPPORTUNITIES
  ↓
BUILD
  ↓
LAUNCH
  ↓
MARKET
  ├─ 自分の商品を売る
  ├─ 他人の商品を売る (DISTRIBUTE)
  └─ 自分の商品を広告する (PROMOTE)
```

ただし、これをそのまま8個の上部タブにすることを意味しません。
UIのタブ数や画面構成は別途最適化し、ユーザーが次に何をすればよいか自然につながるようにします。

---

## 9. 実装優先順位

価値は削らないが、依存関係に沿って作ります。

### Phase 1 — Intelligenceを完成

1. Casesを公開品質にする
2. Trend / Demand Signalを定義・収集・表示
3. Cases + TrendsからOpportunityを作る
4. Case → Opportunityの導線を一本化

### Phase 2 — Creationを閉じる

5. Opportunity → Build Spec
6. Build / Preview / 修正
7. Launch: Hosting / Domain / DB / Paymentを接続し購入可能にする

### Phase 3 — Commerceを閉じる

8. Product掲載
9. 実購入
10. Distribution
11. Commission / Attribution
12. Promotion

### Phase 4 — FeedbackをMoat化

13. 閲覧 → Build → Listing → Order → Retentionを同一系譜で計測
14. 実績をTrendへ返す
15. 実績をOpportunityへ返す
16. 「推測の市場機会」から「実際に作られ、売れた市場機会」へ進化

これは「後のPhaseの価値を捨てる」という意味ではありません。
**最終形は最初から固定し、前段が後段の入力になる依存順で実装する**という意味です。

---

## 10. 最終的な一文

Make-Moneyは、

> **世界中の実在事例と現在の需要から「どこに金があり、自分なら何をすればよいか」を発見し、その場で作り、公開し、売り、自分の商品を他人に売ってもらうことも、他人の商品を自分が売ることもでき、その実取引データが次の金脈発見をさらに賢くするプラットフォーム**

を作る。

このループに直接つながらない大型機能は、原則として本体から増やさない。
