# GOLDMINE RADAR — Product / Business / Implementation Master Plan

## 0. 最終判断

作るものは、単なる「ビジネスアイデアDB」でも「新サービス投稿サイト」でもない。

> **世界の金・需要・サービス・人を接続し、次に自分が入れる事業機会を発見するネットワーク**

表側は短時間で驚きと可能性を得られる発見フィード、裏側はMoney Signal・Demand・Opportunity・Product・Entity・Sourceを結ぶDB、有料価値は監視・比較・検証・時間短縮である。

中核ループ:

```text
Money Signal
  → なぜ金が動いたか
  → 未充足Demand
  → Opportunity
  → Product / Serviceが掲載・誕生
  → Customer・利用・売上
  → New Money Signal
```

---

## 1. ユーザーに起こす感情

最上位目的は、ユーザーに次を感じさせること。

> 世の中には、自分がまだ知らない金の流れと稼ぎ方が大量にある。  
> このサイトを見続ければ、他人より早く金脈を見つけ、自分も大きく稼げる可能性がある。

感情の順番:

1. **驚き** — こんなところに金があるのか
2. **自己接続** — 1人・小資本なら自分にも近い
3. **未完了感** — 成功済みではなく、まだ入口が残っている
4. **所有感** — この金脈を自分が見つけた
5. **先行者感** — 他人より早く気づいた
6. **実行可能感** — 次に何を確認するか分かる
7. **再訪動機** — 今日も新しい金の動きがあるかもしれない

そのため、Opportunityは次の順で見せる。

1. 金額・成長
2. 人数・期間・初期費用
3. 何を売ったか
4. 誰が払ったか
5. なぜ今金が動いたか
6. まだ残る入口
7. 自分との適合条件
8. 根拠・金額タイプ・調査日
9. リスク
10. 今週確認する3つ

「必ず儲かる」「億万長者になれる」とは断定しない。夢を先に見せるが、数字の意味と不確実性は隠さない。

---

## 2. 誰が使うか

### 2.1 見物・可能性探索層

本音: 儲け話、刺激、自分にも可能性がある感覚が欲しい。

機能:

- 金額起点のショート型フィード
- 1人開発・低資本・短期間フィルター
- 保存、欲しい、作れそう、追う
- MY GOLDMINE
- 似た金脈
- 共有カード

### 2.2 実際に作る人

本音: 次に作るもの、需要、価格、最初の顧客を見つけたい。

機能:

- Money SignalとDemandの根拠
- 競合・価格・未充足需要
- 参入ルート
- 顧客獲得経路
- 必要人数・費用・期間
- リスク
- 今週の検証項目
- 将来: 「作ります」宣言と需要者通知

### 2.3 サービス掲載者

本音: 顧客、ベータ利用者、提携先、フィードバック、信用が欲しい。

機能:

- URL-first無料掲載
- Productページ
- 関連Opportunityへの接続
- Claim
- 閲覧、保存、比較、外部遷移分析
- Intent: 顧客／ベータ／提携／紹介／出資／売却／人材
- 明示されたPromotion

### 2.4 商品・サービスを探す人

本音: 問題を早く解決したい。

機能:

- 問題・カテゴリー検索
- 対象顧客・価格・ビジネスモデル比較
- 代替サービス
- 確認状態
- 外部遷移・問い合わせ

この層がいないと、掲載者同士が宣伝するだけの場所になる。

### 2.5 情報発掘者・キュレーター

本音: 先見性、専門性、発見者としての地位が欲しい。

機能:

- Money Signal、成功・失敗、価格変更、買収、需要の投稿
- 採用率、根拠品質、訂正率、保存率
- 早期発見履歴
- 専門カテゴリー

投稿数だけのランキングは禁止する。

### 2.6 代理店・フリーランス・専門家

本音: 成長前の顧客を見つけたい。

機能:

- 成長Signal
- 支援Intent
- 提案受付設定
- 無差別DM防止
- 将来: マッチング・紹介料

### 2.7 投資家・買収者

本音: 良い事業へ早く接触したい。

機能:

- 売上・利益・運営時間・集客経路
- 売却意向
- 本人確認
- 非公開資料申請
- 初期は外部M&Aサービスへ送客

### 2.8 新規事業・コンサル・市場調査

本音: 意思決定時間を短縮したい。

機能:

- 市場マップ
- 支出・資金・M&A・価格の時系列
- 類似市場
- 出典履歴
- CSV・API・チーム共有

### 2.9 発信者・ニュースレター

本音: 継続的な面白いネタが欲しい。

機能:

- 金額付き共有カード
- 公開コレクション
- 出典付き引用
- RSS・週刊まとめ
- アフィリエイト可能なサービス

---

## 3. DBの中心オブジェクト

### 3.1 Money Signal

実際に起きた金・需要イベント。

- 売上
- 利益
- ARR / MRR
- GMV
- 資金調達
- 契約上限
- 実支出
- 買収価格
- 希望売却額
- 第三者推定
- 需要増加

必須: 支払者、受取者、金額タイプ、期間、通貨、発生日、出典、調査日、証拠ランク。

### 3.2 Demand

誰が何を欲し、既存製品の何に不満を持ち、どの程度払う可能性があるか。

サイト内の「欲しい」「払う」「作れそう」も内部Signalになるが、外部市場全体へそのまま一般化しない。

### 3.3 Opportunity

Money SignalとDemandから導く「まだ入口が残る場所」。

- なぜ今
- 誰が払うか
- 未充足需要
- 参入ルート
- 人数・費用・期間
- 顧客獲得経路
- 証拠・勢い・個人参入・競争余地
- リスク
- 今週の確認事項

AIが勝手に作った案ではなく、必ず関連Signal・Demand・Productを持つ。

### 3.4 Product / Service

既に存在する解決策。

- URL
- 対象顧客
- 価格
- ビジネスモデル
- 地域・言語
- 運営者
- Intent
- Claim・確認状態
- 関連Opportunity

### 3.5 Entity

Person、Company、Government、Fundを同一基盤で扱う。

### 3.6 Source

URL、発行者、公開日、取得日、一次／二次、利用条件、どの主張を支えるかを保持する。

### 3.7 Intent

掲載者が現在求めているもの。

- 顧客
- ベータ利用者
- フィードバック
- 提携先
- アフィリエイター
- 出資
- 買収
- 人材

---

## 4. 中核機能

### 4.1 Opportunity Feed

ホームの主役。検索窓から始めず、金額・人数・期間から始まるカードを見せる。

### 4.2 Opportunity Detail

金が動いた理由、未充足需要、入口、リスク、根拠、今週の行動まで一続きで表示。

### 4.3 Money Signal DB

売上・利益・調達・契約・支出を混ぜず、誰から誰へ金が動いたかを見る。

### 4.4 Product / Service DB

掲載者の宣伝と買い手の比較を両立。Promotionは別枠。

### 4.5 MY GOLDMINE

保存をブックマークではなく、自分専用の金脈ポートフォリオとして扱う。

将来:

- 市場の勢い変化
- 新規競合
- 新しい成功・失敗
- 保存後の成長
- 早期発見率

### 4.6 Opportunity Gap

長期的な独自価値。

> 欲しい人が多いのに、十分なサービスが存在しない領域

入力:

- 外部Demand
- 既存サービス数
- 価格
- 低評価理由
- サイト内検索
- 欲しい／払う／作れそう
- 比較・外部遷移

### 4.7 URL-first Listing

URLを入力し、対象顧客、説明、価格、Intentを構造化して審査へ送る。

本番のURL解析は安全なワーカーで行い、localhost・private IP・redirect・任意JS実行を禁止する。

### 4.8 Claim & Vendor Analytics

所有者確認後に編集と分析を開放。

- ドメインメール
- DNS TXT
- HTML meta
- 必要に応じて法人資料

分析:

- 閲覧
- 保存
- 比較
- 外部遷移
- どのOpportunityから見られたか
- 需要が強い属性

---

## 5. 信用設計

### 証拠ランク

| Grade | 定義 |
|---|---|
| A | 一次・公式・法定・確定 |
| B | 当事者直接開示＋補助根拠 |
| C | 信頼できる第三者推定 |
| D | 未確認自己申告 |
| DEMO | UI検証用の架空値 |

### 確認状態

1. 未確認
2. 所有者確認済み
3. 基本情報確認済み
4. 指標接続済み
5. 証拠確認済み
6. 監査済み

決済接続と会計監査を同じ意味にしない。

### Organic順位に使う

- 証拠品質
- 鮮度
- 需要
- 勢い
- 参入可能性
- 顧客獲得経路
- 質の高い反応
- 操作補正

### Organic順位に使わない

- 広告費
- 有料契約
- 運営との関係
- 単純PV
- 未確認売上

### 投稿モデレーション

投稿は公開レコードと分離し、以下を経る。

```text
Submission → 自動検査 → 人間審査 → 公開／修正／却下
```

重複、短縮URL、禁止カテゴリー、誇大表現、出典不一致、マルウェア候補を検査する。

---

## 6. 収益化

### Free

- 発見フィード
- 基本検索
- 限定保存
- 基本Opportunity
- サービス基本掲載
- 共有カード

### Pro

- 全根拠
- 高度フィルター
- 比較
- 保存上限解除
- ウォッチ・通知
- 自分向け適合

### Research

- 時系列
- 市場マップ
- CSV
- 出典差分
- チーム共有

### Vendor

- Claim
- 詳細分析
- ベータ募集
- リード
- 比較分析
- Promotion

### Enterprise / API

- API
- 高頻度エクスポート
- 権限
- 独自分類
- SLA

優先順位:

1. 個人Pro
2. Vendor分析
3. 明示Promotion
4. 法人Research
5. アフィリエイト
6. API
7. 紹介料

基本掲載は無料。供給不足の初期に掲載課金しない。

---

## 7. 成長ループ

### Discovery Loop

金額カード → SNS共有 → 流入 → 保存・反応 → 需要データ → より良いカード

### Listing Loop

Opportunity閲覧 → 既存事業者が掲載 → Product DB増加 → 比較価値増加 → 買い手流入 → 掲載価値増加

### Builder Loop

Demand → 作ります宣言 → 需要者通知 → ベータ → 売上 → Money Signal

### Curator Loop

情報投稿 → 採用・保存 → 発見者信用 → より良い投稿 → 運営コスト低下

### Vendor Loop

掲載 → 保存・比較・遷移 → 市場反応 → ページ改善 → 利用価値増加

---

## 8. KPI

North Star:

> **Weekly Evidence-backed Opportunities Saved**

週に、根拠を確認した上で保存されたユニークOpportunity数。

主要KPI:

- 初回3カード閲覧
- Opportunity詳細到達
- 最初の保存
- D1 / D7 / D30
- MY GOLDMINE再訪
- Money Signal追加数
- A/B証拠比率
- サービス掲載・Claim率
- Opportunityあたり関連サービス数
- 外部遷移・問い合わせ
- Free → Pro
- Claim → Vendor

Guardrail:

- 誤情報訂正率
- 根拠切れ
- 未確認情報のメイン露出
- スパム
- Promotion誤認
- 同一事業者占有
- 通報対応時間

---

## 9. ロードマップ

### Phase 0 — 現在

- プロダクト定義
- DEMO UI
- 検索・絞り込み
- 反応・保存
- Money Signal / Service
- URL-first投稿API
- 信用・広告分離
- DBスキーマ
- CI

### Phase 1 — Curated MVP

- Supabase
- 認証
- 管理画面
- 50〜100件の実データ
- 出典・調査日・更新履歴
- 保存・反応永続化
- 基本SEO

### Phase 2 — Listing Supply

- 安全なURL解析
- Product投稿
- Claim
- Vendor Analytics
- ベータ募集

### Phase 3 — Opportunity Intelligence

- Demand集計
- Opportunity Gap
- 類似市場
- 時系列
- ウォッチ・通知
- 比較

### Phase 4 — Monetization

- Pro
- Vendor
- Promotion
- Research
- Stripe・権限

### Phase 5 — Network

- 発見者プロフィール
- 早期発見履歴
- 作ります宣言
- 需要者通知
- 支援Intent
- 外部取引連携

---

## 10. 技術設計

現在のMVP:

- Next.js App Router
- React / TypeScript
- 環境変数不要のDEMO
- localStorageで保存
- Route Handlerで投稿・反応を検証
- Vercel想定
- GitHub Actionsでtypecheck/build

Production:

- Supabase Auth
- PostgreSQL + RLS
- Storage
- Queue / Cron
- Transactional email
- Stripe
- Error monitoring
- 同意を伴うAnalytics

セキュリティ:

- Rate Limit
- Origin / CSRF
- RLS
- Service RoleをClientへ出さない
- URL解析のSSRF対策
- HTML sanitize
- Claim challenge期限
- 管理操作の監査ログ
- PromotionとOrganic評価を別テーブル・別権限

DB案は `supabase/migrations/0001_initial.sql` を参照。

---

## 11. 最初の実データ投入

初期対象:

- Micro SaaS
- Subscription app
- Browser extension
- Shopify app
- WordPress plugin
- Developer tool
- Niche DB / directory
- Newsletter / community
- Small web acquisition

一つのOpportunityを公開する最低条件:

- Money Signal 1件以上
- Demand根拠 1件以上
- 関連Productまたは「未確認」
- 金額タイプ
- 調査日
- 証拠ランク
- なぜ今
- まだ残る入口
- リスク
- 今週の確認項目
- 編集者

AIは抽出、正規化、重複、タグ、要約下書きを担当する。公開可否、数字の意味、出典対応、利用条件、Organic評価、参入判定は人間が確認する。

---

## 12. やらないこと

- 根拠のないAIアイデアを大量生成
- 投稿を即メインフィードへ出す
- 売上・利益・調達・GMVを混同
- 広告主をOrganic上位にする
- 偽の残り時間・利益保証
- 最初から決済・M&A・求人を全部内製
- 長い入力を終えないと価値が見えない構造
- 実在企業へ架空数字を付ける

---

## 13. MVP受入条件

- PC・スマホで主要画面が読める
- フィルターと検索が動く
- Opportunity詳細を展開できる
- 保存がMY GOLDMINEに残る
- Money Signalで支払者→受取者が分かる
- Serviceで価格・対象・Intentが分かる
- Promotionが明示される
- 投稿APIが不正URLと必須欠落を拒否する
- 正常投稿で審査IDが返る
- 全架空値がDEMOと表示される
- `npm run typecheck` と `npm run build` がCI対象になる
