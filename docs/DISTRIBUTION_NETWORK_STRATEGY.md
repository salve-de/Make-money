# Distribution Network Strategy
## Distribution Marketplace を「自己増殖する販売網」へ拡張する設計正本

**Status:** Strategy / Not yet implemented  
**Updated:** 2026-09-28

---

## 0. 結論

今回検討した「MLM的な自己増殖する販売網」は、Make-Moneyに存在しなかった別事業ではない。

既存のMake-Moneyにはすでに `PROJECT_CHARTER.md` と `docs/OPPORTUNITY_BUILDER.md` に以下の **Distribution Marketplace** が定義されている。

- Creator / Provider が商品・SaaS・サービス・コード・事業を提供
- Distributor / Partner が第三者商品を紹介・販売
- Buyer が購入
- Make-Money が discovery / marketplace / attribution / payment / payout / ledger / feedback を接続
- 商品単位の単発 commission / 継続 commission
- click → conversion → refund → payout の一貫台帳
- Stripe Connect 等を想定した分配
- 商品 × 販売者 × チャネルの成果データ還流
- Goal Layer による「月いくら稼ぎたいか」からの必要販売数逆算

したがって今回の案は既存構想を置き換えない。

**追加するべきものは、販売者自身が次の販売者を生み、顧客も販売者へ転換し、販売網そのものが増殖する Network Distribution Layer である。**

```text
Opportunity
  ↓
Build / Create
  ↓
Publish
  ↓
Marketplace
  ↓
Distributor
  ↓
Buyer
  ↓
Buyer → Distributor
  ↓
New Buyer
  ↓
Revenue Feedback
  ↓
より精度の高いOpportunity / Distribution Matching
```

---

## 1. 既存Make-Moneyにすでにあるもの

### 1.1 4者モデル

| 主体 | 役割 |
|---|---|
| Creator / Provider | 商品・サービスを作り、価格・販売条件・紹介条件を設定 |
| Distributor / Partner | 許可された第三者商品を紹介・販売して成果報酬を得る |
| Buyer | 商品・サービスを購入 |
| Make-Money | 発見、掲載、attribution、決済、分配、台帳、成果データ還流 |

### 1.2 既存Distribution Marketplaceの必須要件

- 商品単位の紹介・販売可否
- 単発 commission
- 継続 commission
- attribution window / source / channel
- click → conversion → refund → payout ledger
- seller onboarding
- Platform fee
- refund / chargeback 調整
- 販売者ごとの実績・継続率・不正検知
- 商品 × 販売者 × チャネルの成果集計
- 規制領域を一般商品から分離する policy gate

### 1.3 既存パートナー制度との区別

既存 `/partners` は **Make-Money自体を紹介する制度**。

Distribution Marketplace は **Make-Money上の第三者商品を販売する制度**。

今回追加する Network Distribution Layer は、このDistribution Marketplaceを自己増殖化する上位レイヤー。

---

## 2. 今回追加するもの

### 2.1 Distributor → Distributor の紹介グラフ

販売者Aが、新しい販売者Bを紹介できる。

ただし報酬の原因は「Bを登録させたこと」ではない。

**Bが第三者Buyerに実売上を作り、その売上が確定したときだけ、Bのdirect commissionとは別にAへ小さな network override を発生させる。**

```text
A: Distributor
   │
   └─ BをDistributorとして紹介
          │
          └─ Buyer X が商品購入
                 ↓
           B: direct commission
           A: small network override
           Provider: seller revenue
           Make-Money: platform fee
```

**人を連れてきただけでは報酬を発生させない。**

---

## 3. 深い階層ではなく横に広がる販売網

10階層・20階層の報酬ツリーを主軸にしない。

初期設計では、

1. 本人の直接販売
2. 直接紹介したDistributorの実販売

までの **1-level override** を本命とする。

2-level以上は、法務・収益性・ユーザー行動・不正率を確認するまで実装しない。

理由:

- 直接販売報酬の方が理解しやすい
- 深い階層は報酬原資を薄める
- 初期参加者だけ有利に見えやすい
- 複垢・自己取引・名義貸し等の不正動機が増える
- 法務・税務・広告・勧誘・消費者保護が複雑になる
- Make-Moneyの本質は「人頭」ではなく「実際に売れるDistribution Network」にある

**Network reward は直接販売の補助であり、直接販売を上回る主役にしない。**

---

## 4. 報酬の原則

```text
Buyer payment
  ↓
refund / chargeback / fraud 判定
  ↓
settled revenue
  ├─ Provider revenue
  ├─ Direct Distributor commission
  ├─ Optional Network override
  └─ Make-Money Platform fee
```

優先順位は必ず、

```text
Direct seller reward > Network override
```

とする。

例として報酬原資100なら、

```text
直接販売者       80
紹介元販売者     20
```

のように、直接販売者へ大きく寄せる。これは説明用であり確定料率ではない。

---

## 5. Customer → Distributor を成長ループにする

通常のaffiliateは、

```text
Distributor → Buyer → 終了
```

になりやすい。

Make-Moneyでは購入後に、

- この商品を自分も紹介する
- この商品を自分のStoreに追加する
- この事業を自分でも運営する

という導線を持てる。

```text
Distributor
  ↓
Buyer
  ↓
Buyer becomes Distributor
  ↓
New Buyer
  ↓
New Distributor
  ↓
...
```

**顧客獲得が同時にDistribution Network獲得になること**が、このレイヤーの最大の成長機構。

---

## 6. Personal Storefront

単なるaffiliate link一覧ではなく、各Distributorが自分の販売面を持つ。

```text
makemoney.example/@sato

SATO STORE
├─ AI SaaS
├─ Website / App
├─ Template
├─ Research product
├─ Education
└─ Other approved products
```

DistributorはMarketplaceの商品を選び、自分のStoreへ並べる。

将来は、

- 独自説明
- 比較
- Bundle
- 推奨順
- 対象顧客別Collection
- 自分が作った商品
- 他者が作った商品

を同じStoreで扱える。

販売者を「リンクを配る人」ではなく、**小さな販売事業の運営者**へ変える。

---

## 7. Creator / Distributor / Buyer の役割を固定しない

同じユーザーが複数ロールを持てる。

```text
Buyer
  ↓
Distributorになる
  ↓
Marketplace商品を販売
  ↓
Make-Money Builderで自分の商品を作る
  ↓
Creatorになる
  ↓
他Distributorに販売してもらう
```

Make-Money内で、

```text
Consume → Distribute → Create → Recruit Distribution → Sell
```

の循環を作る。

供給側と販売側の両方が増える。

---

## 8. AI Distribution Assistant

販売者の摩擦は「何を、どこで、どう売るか分からない」こと。

Make-Moneyが保有する商品・販売・チャネルの実績データを使って、販売materialを生成する。

候補:

- X投稿
- 長文記事
- 比較ページ
- Landing Page
- Short video script
- YouTube script
- Email
- Newsletter
- FAQ
- product comparison
- Store description
- buyer persona別訴求

ただしスパム装置にはしない。

- 虚偽実績
- なりすまし
- deceptive claims
- 規約違反投稿
- 禁止商品
- 無差別大量送信

は制御対象。

最終形では、

```text
Product × Distributor × Audience × Channel × Creative
```

の相性を実績から学習する。

---

## 9. 参加条件の原則

Distributorになる条件として、

- 高額入会金
- mandatory inventory
- 自己購入義務
- monthly purchase quota
- 報酬受領権を得るためだけの有料会員化

を前提にしない。

基本は **Distributor登録0円**。

有料機能を設ける場合も、AI・分析・Store高度化など独立した機能の対価として分離する。

**ユーザーが払う金ではなく、第三者Buyerへの実販売によって経済が成立すること**を原則とする。

これは名称だけで法的区分を回避するための設計ではない。法的評価は実態・契約・勧誘・報酬条件等に依存するため、本番導入前に対象国ごとの専門家レビューを必須とする。

---

## 10. 不正防止

Network rewardは通常affiliateよりも Sybil / self-dealing incentive を増やす。

最低限、

- payment settled
- refund window
- chargeback check
- duplicate identity
- duplicate payment instrument
- suspicious IP/device graph
- self-purchase detection
- circular purchasing
- reciprocal purchasing
- abnormal conversion
- unusually concentrated downstream revenue

を監視する。

Commission lifecycle:

```text
PENDING
  ↓
SETTLED
  ↓
ELIGIBLE
  ↓
PAYABLE
  ↓
PAID
```

返金・chargeback・不正確定時は `VOID / REVERSED`。

Network overrideも元売上と同じorder lineageへ紐付ける。

---

## 11. 最低限の概念データモデル

### Distributor

```text
distributor_id
user_id
status
joined_at
referrer_distributor_id?
country
payout_account_status
risk_status
```

### Product Distribution Terms

```text
product_id
provider_id
distribution_enabled
direct_commission_type
direct_commission_value
network_override_enabled
network_override_type
network_override_value
max_network_depth
attribution_window
eligible_regions
policy_class
```

### Attribution

```text
attribution_id
product_id
distributor_id
channel
source
campaign
click_at
converted_at
buyer_id
order_id
```

### Commission Ledger

```text
commission_id
order_id
beneficiary_distributor_id
source_distributor_id
commission_role
depth
amount
status
eligible_at
paid_at
reversal_reason
```

### Storefront

```text
store_id
owner_distributor_id
slug
visibility
products[]
collections[]
```

---

## 12. Make-Money全体への統合位置

```text
DISCOVER
世界の金脈を知る
      ↓
SYNTHESIS
自分の機会に変換
      ↓
BUILD
自分の商品・サービスを作る
      ↓
PUBLISH
公開
      ↓
MARKETPLACE
商品を掲載
      ↓
DISTRIBUTE
本人または第三者が販売
      ↓
NETWORK
販売者が新しい販売者を生む
      ↓
TRANSACTION
実売上
      ↓
REVENUE FEEDBACK
実績データを還流
      ↓
DISCOVER / MATCHING 精度向上
```

Network Distributionは独立サービスにしない。

**既存の「Opportunity → Ownership → Distribution → Transaction → Revenue Feedback」の Distribution を自己増殖化する拡張**として扱う。

---

## 13. コールドスタート

最初から「人を誘えば儲かる」を前面に出しても、売れる商品がなければネットワークは空回りする。

順序は以下。

### Phase A — Supply
Make-Money Builderで作られた商品 + 外部Provider商品を確保。

### Phase B — Direct Distribution
まず普通のaffiliate / resellerとして「本当に売れるか」を測る。

### Phase C — Storefront
販売実績のあるDistributorへStorefrontを与える。

### Phase D — Customer → Distributor
実際に商品を利用したBuyerが簡単にDistributorへ転換。

### Phase E — Network Override
Direct Distributionのunit economics、不正率、返金率、法務条件が成立した商品だけ有効化。

**MLMレイヤーを最初に作らない。売れる市場の上にだけ載せる。**

---

## 14. KPI

登録者数や紹介人数をNorth Starにしない。

- External Buyer GMV
- Settled GMV
- Distributor activation rate
- Distributor → first sale conversion
- Buyer → Distributor conversion
- Revenue per active distributor
- Direct vs network-derived GMV
- Refund / chargeback rate
- Fraud rate
- Product × Distributor × Channel conversion
- Distributor retention
- Creator revenue
- Distributor revenue
- Make-Money take rate
- Marketplace liquidity

最重要は **実際の第三者Buyer由来GMV**。

紹介人数が増えても第三者取引が増えていなければ成功扱いしない。

---

## 15. Make-MoneyのMoat

Network制度自体はコピーできる。

Moatは以下の結合。

```text
Opportunity intelligence
+
Builder
+
Creator supply
+
Distributor network
+
Attribution / payout ledger
+
Buyer behavior
+
Product × Distributor × Channel × Creative performance data
+
Revenue feedback
```

競合が後から同じcommission制度を作っても、

**「どの商品を、誰が、どの顧客へ、どのチャネル・訴求で売れば実際に成約・継続するか」**

という履歴は簡単には複製できない。

---

## 16. 採用判断

### 採用する

- Third-party Distribution Marketplace
- Direct affiliate / reseller commission
- Recurring commission
- Personal Storefront
- Buyer → Distributor conversion
- Distributor referral graph
- 実売上にだけ連動する small network override
- AI sales material generation
- Revenue Feedback
- Fraud / refund / chargeback ledger
- Product / region policy gates

### 初期には採用しない

- 深い多段階報酬
- recruitment自体への報酬
- 入会金を原資にするモデル
- mandatory self-purchase
- inventory loading
- paid qualification
- 規制商品への一律適用
- 虚偽・誇大な収益訴求
- 無差別自動SNS投稿

---

## 17. 実装優先順位

1. 現行 Distribution Marketplace の Direct Commission
2. Marketplace transaction / payout ledger
3. Storefront
4. Buyer → Distributor onboarding
5. Distributor referral graph を記録
6. 実データでunit economicsを確認
7. 対象国法務・税務・payout/KYC確認
8. 条件を満たす商品だけ1-level network override
9. AI Distribution Assistant
10. Product × Distributor × Channel matching

---

## 18. 最終定義

Make-Moneyが作るべきものは「MLMサイト」ではない。

**誰でも商品を作れる。誰でも他人の商品を売れる。顧客も販売者になれる。販売者が次の販売者を生める。そして全員の実取引がMake-Moneyのデータと収益を強くする Distribution Operating System。**

既存構想との関係:

```text
既存:
Distribution Marketplace

今回:
Distribution Marketplace
        +
Self-propagating Distributor Network
        +
Personal Storefront
        +
Customer → Distributor loop
        +
Network override
        +
AI Distribution Assistant
```

この文書は `PROJECT_CHARTER.md` と `docs/OPPORTUNITY_BUILDER.md` のDistribution Marketplace方針を変更せず、その自己増殖レイヤーを具体化する補助正本とする。
