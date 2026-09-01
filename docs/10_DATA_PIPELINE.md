# データ収集・検証Pipeline

## 1. データの最小単位

GOLDMINE RADARは記事を保存するのではなく、次のEntityとRelationへ分解する。

- `Entity`: 人、企業、政府、Fund、Community
- `Product`: 商品、SaaS、App、Service、事業
- `Money Signal`: 誰が誰へ何のためにいくら払ったか
- `Demand`: 誰がどの過程で困り、いくら払えるか
- `Opportunity`: SignalとDemandから導く、まだ残る入口
- `Source`: 主張を裏付ける原資料
- `Listing`: 顧客、Beta、提携、PoCなどの具体的募集

Relation:

```text
Opportunity ── supports/contradicts ── Money Signal
Opportunity ── based_on ── Demand
Opportunity ── existing/complement/substitute ── Product
Money Signal ── evidenced_by ── Source
Product ── addresses ── Demand
```

## 2. 情報源の優先順位

### A: 一次証拠

- 法定開示
- 政府の支出・契約・落札
- 公式決算・買収発表
- 決済・会計の監査済み接続
- 確定成約資料

### B: 本人・企業の直接開示

- Founder本人の売上公開
- 会社Blog / Press Release
- 本人Interview
- 所有者が提出した資料

### C: 第三者推定

- Traffic / App / EC売上推定
- 信頼できる調査会社
- 複数の間接指標からの推計

### D: 未確認

- User投稿
- SNSの単独主張
- 出典へ到達できない記事
- AI生成仮説

Dは発見の入口には使えるが、強いOpportunity Scoreの根拠にはしない。

## 3. Ingestion Flow

```text
Discover
  ↓
Fetch / Submit
  ↓
Deduplicate
  ↓
Extract claims
  ↓
Classify number type
  ↓
Attach source and locator
  ↓
Human review
  ↓
Publish canonical entity
  ↓
Monitor for change / stale
```

### Discover

- 公式API
- RSS / Press Release
- 政府Open Data
- Founder本人の公開
- User Submission
- Owner Claim
- Existing page correction

### Fetch / Submit

自動取得で保存するもの:

- URL
- Final URL
- Title
- Publisher
- Published At
- Retrieved At
- Content Hash
- License Note

URL Previewは、サービス掲載の入力補助に使う。本文の無断再配信には使わない。

### Deduplicate

重複Key候補:

- Canonical URL
- Domain + Product Name
- Entity + Signal Type + Period + Amount
- Government Contract ID
- Filing Document ID
- Acquisition Buyer + Target + Date

同じニュースを10記事から集めても、Money Signalは一件に統合し、Sourceだけ複数紐付ける。

### Extract Claims

一つのSourceから複数Claimを切り出す。

例:

```text
「月商300万円」
「一人で運営」
「顧客の70%が紹介」
「2026年8月時点」
```

それぞれにSource Locatorを持たせる。

### Number Classification

必須分類:

- Revenue
- Profit
- MRR
- ARR
- GMV
- Funding
- Contract Ceiling
- Actual Spend
- Acquisition Price
- Asking Price
- Estimated Revenue
- Growth Rate
- Price

必須属性:

- Amount
- Currency
- Period
- Start / End
- Gross / Net
- Actual / Estimate
- Payer
- Receiver

## 4. Opportunity生成

Opportunityは、AIが単独で作るアイデアではない。

最低条件:

1. Money Signalが一件以上ある
2. Demandまたは不満の証拠がある
3. 既存Productを確認している
4. 買い手が具体的
5. 最初の獲得経路が説明できる
6. 入口が残る理由がある
7. 反証条件とRiskがある
8. 今週確認する行動がある

AIの役割:

- Sourceから構造化下書き
- Entity候補の同定
- 類似Signal / Product候補
- Number Type候補
- Opportunityの入口候補
- Risk候補

人間の役割:

- 数字種類の確定
- SourceがClaimを支えるか確認
- 権利と公開範囲の確認
- 自己申告と監査済みの分離
- Opportunityの飛躍を抑える
- 最終公開

## 5. Score更新

```text
Evidence       25%
Momentum       22%
Demand Gap     23%
Distribution   14%
Feasibility    16%
```

更新Trigger:

- 新しいMoney Signal
- SourceのEvidence Grade変更
- Demand反応の増加
- 新しいProductの参入
- Price変更
- Listingの増加
- 失敗・撤退・規制変更
- SourceのLink切れ
- Stale期限到達

Scoreは公開判断の補助であり、利益保証ではない。

## 6. Stale管理

目安:

- Price: 30〜90日
- MRR / Revenue: 90〜180日
- Funding / Acquisition: Eventとして永続、現在値にはしない
- Government Contract: 契約期間終了まで監視
- Product Availability: 30日
- Search / Hiring / Traffic推定: 30〜60日

Stale時:

- 削除せずStatusを変更
- 最終確認日を表示
- ScoreのEvidence / Momentumを減点
- 追跡Userへ通知
- 新しいSourceを募集

## 7. User Submission

投稿直後:

- Canonical DBへ直接公開しない
- `submissions`へ保存
- URL、Email、長さ、重複Keyを検証
- 未確認として扱う

審査:

1. Duplicate
2. Number Type
3. Source
4. Period
5. Rights
6. Conflict of Interest
7. Personal Data
8. Promotion Disclosure

承認後:

- `materialize_submission`でCanonical Dataへ変換
- Moderation Auditを保存
- 投稿者へ通知
- 関連Opportunity / Demand / Productへ接続

## 8. 初期公開データ

最初の公開は件数より密度を優先する。

最低目標:

- 一次・直接開示のMoney Signal 30件
- Opportunity 15件
- Demand 20件
- Product 50件
- 各OpportunityにSource 2件以上
- 各Opportunityに既存Product 3件以上
- 成功だけでなく失敗・撤退Signal 5件以上

初期対象:

- Micro SaaS
- Subscription App
- Browser Extension
- Shopify App
- WordPress Plugin
- Small Developer Tool
- Niche Database / Directory
- Productized Service

## 9. 品質KPI

- Evidence A/B比率
- Source Locator付与率
- SignalのPayer / Receiver確定率
- Number Type分類率
- Duplicate統合率
- 公開後訂正率
- Stale超過率
- Link切れ率
- OpportunityからSourceへの到達率
- Submission承認率
- 審査時間

最重要は総件数ではなく、ユーザーが「なぜ金が動き、自分はどこから入れるか」を再検証できる割合である。
