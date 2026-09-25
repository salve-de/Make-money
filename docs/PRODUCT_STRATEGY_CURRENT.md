# Make-money — PRODUCT STRATEGY CURRENT

Status: **CURRENT PRODUCT DIRECTION / PUBLIC PRODUCT NORTH STAR**

Updated: **2026-09-18**

Scope: **Make-money 単体の公開Product。SellRelayとの接続はこのProductを先に成立させた後に行う。**

---

## 0. この文書の位置づけ

この文書は、Make-money の「今ユーザーに何を見せ、何を感じさせ、どんなProductとして公開するか」の正本である。

既存文書との関係は以下。

1. `PROJECT_CHARTER.md` / README の Ultimate North Star
   - 長期思想・資本主義の裏帳簿・マネーの交差点という最上位目的。
2. `docs/DATA_COLLECTION_MASTER_GUIDE.md` / `docs/GOLDEN_INGEST_SCHEMA.md`
   - 何をどう集めるかの収集正本。
3. **この `docs/PRODUCT_STRATEGY_CURRENT.md`**
   - 収集したデータを、公開Productとしてどうユーザー価値へ変換するかのCURRENT正本。
4. `docs/PROJECT_MASTER_HISTORY_AND_STRATEGY.md`
   - 過去実装・修復・Phase履歴。

この文書は収集仕様や長期North Starを上書きしない。**「公開Productの現在地」を固定する。**

SellRelayは後段。Make-money公開時点ではSellRelay機能を前提にしない。

---

# 1. 今回の結論

## Make-money は記事メディアではない

Make-money を、

- ビジネス記事サイト
- 成功者インタビュー集
- 会社DBだけのサイト
- 副業診断
- 起業のお勉強サイト
- 「あなたにはこの3案」だけを返す簡易診断

にはしない。

### 現時点の仮決定

> # **Make-money = 世界の金儲けを監視する Money Intelligence Terminal**
>
> 開いた瞬間に、**「今、金儲けの世界で何が起きているか」**を数秒で走査できる。
> 気になったものだけ30秒、2分、完全Dossierへと段階的に掘れる。
> 記事を最初から最後まで読む必要はない。

3,341件以上の事業DBはProductの裏側にある巨大な証拠庫・比較母集団であり、表面の主役ではない。

表面の主役は、DB・最新外部情報・成功・失敗・財務・人数・期間を横断して抽出された **Money Signal / 発見**。

---

# 2. ここへ至った経緯

## 2.1 最初の方向: 大量の事業事例DB

Make-money は世界中の企業・個人事業・SaaS・実業・失敗例を集め、

- 誰が
- 誰から
- 何に対して
- どう金を取り
- 売上はいくらで
- 原価はいくらで
- 何が手元に残ったか
- どう客を取ったか
- どこに競争上の死角があったか

を蓄積する大規模な事業DBとして進んできた。

2026-09-17 時点でUI対象は 3,341 entities。

ただし Phase 206 の記録どおり、`targetPainWallet` / `structuralFlaw` にはバルク生成由来の類似クラスタが 2,075件残存している。**「3,341件ある」こと自体を品質保証と誤認してはならない。**

## 2.2 DBを主役にする案を棄却

ユーザーは3,341社を全部読みたいわけではない。

DBだけを正面に出すと初見反応は、

> 「企業データベースね。で？」

になりやすい。

DBは重要だが、役割は、

> **「この発見は本当に単発なのか？ 過去にもあるのか？ 失敗側はどうなのか？」を確認する証拠庫**

と再定義した。

## 2.3 「勝ち筋」「傾向」「どうやれば稼げるか」を前面に出す案

次に、

- AIで開発コストが下がった
- Distributionが重要
- SaaSは死んでいない
- Solo businessが増えている
- Weird / Joke系でもStatusや競争で金が動く

といった「現在の勝ち筋・傾向」をトップで説明する案を検討した。

しかしこれも弱かった。

理由は、**ユーザーがお勉強をしたいわけではない**から。

「今の勝ち筋5選」を読ませるだけでは、ビジネス記事・コンサル資料・講義へ退行する。

## 2.4 「あなたならこの3つ」を返すDecision Engine案

Pre-Action Visitor心理には、Choice overload を減らし、1000案ではなく「自分ならこの3つ」に圧縮してほしい欲求がある。

しかし、Make-money全体を3問診断→3候補へ縮めると、

- 全貌を失う
- Bloomberg / PitchBook的な知覚価値を失う
- 安い副業診断に見える
- ユーザーの探索・発見・驚きが死ぬ

ため、主Productにはしない。

**全貌は見える。しかし今見るべきものは圧縮されている。**

この両立を目指す。

## 2.5 「Opportunityを提示する」案

「まだ取り切られていない金」「今入れる市場」を直接出す案も検討した。

これもProductの一部にはなり得るが、トップの唯一の主役にはしない。

理由:

- すべてを「今すぐ参入機会」に変換すると断定が強くなる
- 面白い現象・失敗・逆転・構造変化を捨ててしまう
- 情報商材的に見えやすい
- ユーザーは必ずしも今日起業案を決定しに来ているとは限らない

## 2.6 「何が変わった？」を記事として見せる案

「AIで何が変わったか」「SaaS死亡説の反証」「一人会社の上限」等を記事化する案を検討。

テーマ自体は強い。

しかし、**記事として読ませることが弱い**。

ユーザーは長文を読む前に、

> 「今日、何か面白いเงินจริงの動きはあるか？」

を走査したい。

ここから、現在の Money Terminal 方針へ到達した。

---

# 3. 人間は何を求めているのか

2026-09-17 に SellRelay repository で作成された以下のCURRENT REFERENCEを、Make-moneyのPre-Action心理の参照元として扱う。

- `SellRelay/docs/USER_PSYCHOLOGY_PRE_ACTION_VISITOR.md`
- `SellRelay/docs/USER_PSYCHOLOGY_ALL_ROLES.md`

これらは明示的に **SellRelay / Make-money 共通心理** として記述されている。

## 3.1 Pre-Action Visitor

単なる副業情報探索者ではない。

> **現在地への不満・不安・焦りを持ち、他人の成功を手掛かりに、できるだけ少ない金・時間・努力で、自分が上へ行ける現実的な経路を探している人。**

表面のQuery:

- 最近何が儲かる？
- 実際誰が儲かってる？
- AIでできない？
- 一人でできる？
- 今から遅い？
- 初期費用少ないものは？
- 失敗すると何を失う？
- こんな簡単なサイトで本当に金になる？

深層には以下がある。

### 安全

将来詰みたくない。金は選択肢・逃げ道・時間・安全へ変換できる。

### Autonomy / Control

会社・上司・顧客・Platformに人生を完全に握られたくない。
自分の収入・時間・仕事を自分で動かしている感覚が欲しい。

### Competence

「自分にもできる」「自分は無力ではない」と確認したい。
そのため、遠い大富豪より、**自分と近い条件の成功者**が強く刺さる。

### Status / 相対比較

絶対所得だけではなく、同年代・同業・身近な人より上か下かが気になる。

### Effort回避 / Reward-Effort比

同じRewardなら、金・時間・精神負荷が少ない方法を選びたい。
無意味な調査・判断・回り道を避けたい。

### Loss回避

大きく稼ぎたいが、大きく失いたくない。
Upsideと同時に、必要資金・時間・失敗側も知りたい。

### Present bias / Time-to-money

3年後の巨大成果だけでなく、「今月の最初の5万円」も強い。

### Social learning

自分ですべてを試行錯誤せず、成功者・失敗者の実例から学びたい。

### Curiosity / Surprise

自分の予想と現実が衝突した時に強く注意が向く。

例:

- 半年かけたAI SaaS → 月$90
- 6時間で作ったサービス → 3日で$20K

「AIが重要」という一般論より、**なぜこの差？**の方が強い。

---

# 4. 初見ユーザーに何を感じさせれば成功か

成功状態は「勉強になった」ではない。

初見ユーザーの内面を、次の順に動かす。

```text
知らなかった
↓
え、面白い / そんなことある？
↓
これ俺にも関係あるかもしれない
↓
ここは信用できそう（数字・失敗・出典がある）
↓
自分で全部調べなくていい
↓
ここを見ていれば何か拾えそう
↓
見逃したくない / また来たい
```

## 4.1 初見10秒の成功状態

ユーザーが以下を自然に想起すれば成功。

> 「普通のビジネスニュースじゃない」
>
> 「世界でเงินจริงがどう動いているか見える」
>
> 「成功談だけじゃなく失敗や数字もある」
>
> 「俺が知らないものがここにある」
>
> 「自分でX、Reddit、Indie Hackers、ブログ、決算を全部巡回しなくていい」
>
> **「ここ見てれば何か拾えそう」**

## 4.2 特に欲しい感情

1. **驚き** — 「そんなのでそんな稼げるの？」
2. **自己投影 / 羨望** — 「特別な巨大企業じゃない。自分側の人間でも起きている」
3. **優位感** — 「これを知っていれば知らない人より一歩先」
4. **安堵** — 「世界中を自分で監視しなくていい」
5. **信用** — 「成功だけでなく失敗・母数・推定区分も見せる」
6. **再訪欲** — 「今日も何か変な金の動きが出ていないか見たい」

---

# 5. こう感じられたら失敗

以下の想起はProduct failureとみなす。

### 「ビジネスニュースサイトね」

ニュースの羅列に見えたら失敗。

### 「勉強になりそう」

講義・MBA・起業教育に見えたら弱い。

### 「成功者の自慢話集」

成功事例だけで、失敗母数・条件・再現性がない。

### 「企業DBね。で？」

データ件数だけを価値にしている。

### 「副業診断ね」

3問答えるだけで3案を返すCheap diagnosisに見える。

### 「情報商材っぽい」

「誰でも」「簡単」「絶対」「月100万」など、証拠より煽りが前に出る。

### 「難しい金融端末で俺には無理」

高密度が、意味不明な専門用語と装飾グラフの山になっている。

### 「俺には関係ない」

巨大企業・億万長者ばかりで、少人数・低資本・個人・地味な実業・失敗が見えない。

### 「前に見た時と何も変わってない」

静的DB・固定記事化して再訪理由を失う。

---

# 6. Product UIの中心: LIVE MONEY SIGNALS

## 6.1 トップは記事一覧にしない

トップの主役は **LIVE MONEY SIGNALS**。

巨大Hero・長い解説・カード記事一覧は避ける。

最小Heroの直下から本体を始める。

例:

```text
MAKE-MONEY                                      Search   Database

See how money is actually being made.
3,341 businesses tracked · successes · failures · economics

[ ALL ] [ SOLO ] [ AI ] [ SAAS ] [ WEIRD ] [ FAST ] [ FAILURE ]

LIVE MONEY SIGNALS                               Last 7 days

SOLO ↑      1-founder SaaS reaches $125K MRR
            2 years flat → one segment changed everything
            HIGH EVIDENCE · 18 related · 31 failures          WHY →

AI ≠ MONEY  6 hours → $20K / 6 months → $90/mo
            Building speed wasn't the separator
            2 DIRECT · 43 RELATED                             COMPARE →

WEIRD ↑     ~$221K gross in 7 days from a ranking page
            Paying became the competition itself
            FOUNDER REPORTED · STATUS × COMPETITION           WHY →

FAILURE     17 similar tools launched. Most never found distribution
            Same tech. Different outcome.
            FAILURE CLUSTER                                   INSPECT →
```

数値は必ず実データ・出典・推定区分に基づく。上記はUI形式例。

## 6.2 1 Signalの役割

1 row / 1 Signalで最初に伝えるのは、

- 何が起きた
- いくら
- 何が異常 / 面白い
- Evidence quality
- どれくらい関連データがあるか

のみ。

記事本文は置かない。

---

# 7. Progressive Disclosure — 3秒 → 30秒 → 完全Dossier

## Level 1: 3秒

走査。

> **1人 / $125K MRR / SaaS / ↑**

何が起きたかだけ理解。

## Level 2: 30秒

Signal rowを展開。

- WHY THIS MATTERS
- WHAT CHANGED / WHAT SEPARATED WINNERS
- 成功数 / 失敗数
- 根拠の質
- 代表例
- 差が大きかった要素
- Last updated

## Level 3: 本気で調べる

Full Dossierへ。

- 会社 / Founder
- P&L
- Revenue / profit / estimated take-home
- acquisition
- pricing
- headcount
- launch timeline
- AI利用
- tools
- failures
- sources
- estimates
- related entities
- raw evidence

原則:

> **「もっと読む」ではなく「もっと調べる」。**

---

# 8. Signalの種類

トップを「毎回新しいMonster企業が出るか」に依存させない。

Signal typeを複数持つ。

1. **BREAKOUT** — 急に大きな金が出た
2. **SHIFT** — 複数事例で構造が変わった
3. **REVERSAL** — 世間の通説とデータが逆
4. **OUTLIER** — 異常な利益 / 速度 / 人数 / 原価
5. **CONTRAST** — 似た条件なのに結果が真逆
6. **FAILURE** — 盛大な失敗・閉鎖・失速
7. **BASE RATE** — 派手な成功の裏に大量の失敗
8. **NEW MECHANISM** — 新しい集金・配分・行動原理
9. **COST COLLAPSE** — AI・ツール等で必要人数や原価が崩れた
10. **DURABLE** — 流行と逆に長期間稼ぎ続けている

このため「すごい新サービス」が毎日生まれなくてもトップは更新できる。

**更新単位は“新しい会社”ではなく“新しい発見”。**

---

# 9. Signal候補の判定軸

候補をトップへ昇格する際は、少なくとも次を評価する。

- Money magnitude — 動いたเงินจริงの大きさ
- Surprise — 予想とのズレ
- Evidence quality — 証拠の強さ
- Recency — 新しさ / 更新性
- Breadth — 単発か複数事例か
- Contrast strength — 成功失敗差の強さ
- Relevance — 個人・少人数ユーザーに関係するか
- Reproducibility insight — 何が特殊で何が一般化可能か
- Base-rate visibility — 失敗母数を確認できるか

**Revenueが大きいだけでSignalにはしない。**

---

# 10. DBの役割

DBはProductの証拠庫・比較母集団。

```text
新しい外部情報 / 新企業 / 数字更新 / 失敗 / 閉鎖
↓
Raw Eventとして取得
↓
既存3,341+ entitiesと照合
↓
普通の更新ならDBのみ更新
↓
異常 / 反転 / パターン / 差分があればSignal候補
↓
Evidence検証
↓
LIVE MONEY SIGNALへ昇格
```

DB UIは残す。

しかしトップで最初に3,341社一覧を投げない。

### DBがユーザーへ与える意味

> 「Make-moneyは思いつきで言っているのではない。このSignalの裏に大量の成功・失敗・生データがある。」

各Signalから、

- Related cases
- Similar winners
- Similar failures
- Compare
- Full database query

へ降りられるようにする。

---

# 11. Data quality / Trust

Make-moneyは成功欲求を入口にしても、情報商材化してはいけない。

表示値には最低限、次の区分を持つ。

- **VERIFIED / PUBLIC FACT** — 公式・一次情報等で確認済み
- **FOUNDER / COMPANY REPORTED** — 当事者申告
- **ESTIMATED** — Make-money推定
- **UNKNOWN / NOT CONFIRMED** — 未確認

SellRelay将来の `Verified Sale` と混同しないため、Make-money側の用語は必要に応じて `SOURCE VERIFIED` 等へ明確化する。

Phase 206で残る類似クラスタなど、品質が十分でないフィールドをSignal生成の主要根拠として自動使用しない。

**Signalは、母数が多いからではなく、根拠が十分だから出す。**

---

# 12. AIの役割

AIをChatbotとして前面に置くことが中心ではない。

AIの主仕事は裏側。

1. 世界中の許容された情報源を監視
2. Raw Eventを収集
3. Entityへ結合
4. 既存DBと比較
5. 異常 / 反転 / Cluster / Failure差を検出
6. Signal候補を生成
7. 根拠・推定・反例を確認
8. 短いSignalへ圧縮
9. 定期更新

ユーザーがAIと会話したい場合は補助機能として、

> 「このSignalと似た失敗例だけ見せて」
> 「1人・元手10万円以下に関係するSignalに絞って」

など、**既存データの探索コマンド**として使う方がProductに合う。

---

# 13. 「傾向」は文章で講義しない

弱い:

> 一人会社が増えています。

強い:

- 時系列
- 成功 / 失敗件数
- 人数
- 粗利
- Time-to-revenue
- AI利用有無
- カテゴリ差

を短い数字・小型チャート・方向記号で見せる。

ただし、集計できない数字を捏造しない。

例（形式のみ）:

```text
SOLO PROFITABILITY       ↑
2024 █████
2025 ███████
2026 █████████

GENERIC AI WRAPPER       ↓
Success     ██
Failure     █████████
```

---

# 14. 心理 → UI対応表

| 人間側の欲求・習性 | Make-moneyでの表現 |
|---|---|
| 「なんで？」という好奇心 | 異常・矛盾・対比を先に出す |
| 派手な数字へAttention | 金額・人数・期間を最初に見せる |
| 自分と比較したい | Founder人数、資金、期間、Skill、Audience有無 |
| 「俺にも？」 | 類似条件・低資本・Solo等フィルター |
| Effortを減らしたい | 3秒→30秒→完全Dossier |
| 失敗したくない | SuccessとFailure/Base rateをセット |
| 最新を逃したくない | New / Changed / Last updated |
| 信用したい | Source / Reported / Estimated / Confidence |
| 全貌を把握したい | DB完全アクセス |
| でも迷いたくない | TopではSignalへ圧縮 |
| Status / 相対比較 | 「1人」「同年代」「少人数」等、距離を示す |
| Surpriseを求める | 通説と現実の反転、似た2社の真逆結果 |

---

# 15. External UX / Psychology research basis

今回の方向性は、以下の外部知見とも整合する。

## Web scanning

Nielsen Norman Group:
- Webユーザーは全文精読より、目的の情報を探してscanする。
- F-shaped pattern等、重要情報を先に認識できる構造が必要。

Reference:
- https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/

## Information scent

ユーザーはクリック先に欲しいものがあると予測できる手掛かりを必要とする。

Signal rowには、タイトルだけでなく、金額・人数・一行の意味・Evidenceを出す。

Reference:
- https://www.nngroup.com/articles/information-scent/

## Progressive disclosure

最初から全機能・全情報を見せず、頻繁に必要な情報を先に出し、要求時に詳細を開くことで高機能と簡潔さを両立する。

Reference:
- https://www.nngroup.com/articles/progressive-disclosure/

## Self-Determination Theory

Autonomy / Competence / Relatedness。
特にMake-moneyでは、

- 自分で選べる
- 自分にも結果を出せる

感覚が重要。

Reference:
- https://selfdeterminationtheory.org/topics/application-basic-psychological-needs/

## Status motivation

Status / respectへの欲求は人間の重要な動機として研究されている。

Reference:
- Anderson, Hildreth & Howland, Is the desire for status a fundamental human motive?
- https://pubmed.ncbi.nlm.nih.gov/25774679/

## Upward social comparison

上方比較は、相手が「自分にも到達可能」と感じられる時に自己改善動機へつながりやすい。

Reference:
- van de Ven et al.
- https://pubmed.ncbi.nlm.nih.gov/21383070/

## Mental effort

Mental effortは意思決定上のcostとして評価される。
一方でEffortには価値を高める側面もあるため、「人間は努力を絶対嫌う」とは断定しない。

Make-moneyでは **無意味な調査・探索・判断コストを減らす**。

References:
- https://pubmed.ncbi.nlm.nih.gov/41266148/
- https://www.sciencedirect.com/science/article/abs/pii/S1364661318300202

## Curiosity / information seeking

Novelty・relevance・information gap・答えが得られそうな感覚が好奇心と探索を動かす。

Make-moneyは「AI市場成長」ではなく、

> 似た二人の結果が極端に違う。なぜ？

のような情報ギャップを作る。

---

# 16. 競合・隣接サービスから取るべき構造

## Product Hunt

取る:
- 今日見る理由
- freshness
- scanning

取らない:
- 人気投票を収益の証明として扱うこと

## Exploding Topics

取る:
- 巨大データをTrend / Signalへ圧縮
- 方向・時系列の高速走査

取らない:
- Trendだけで「儲かる」と判定

## Crunchbase / PitchBook系

取る:
- 大量データを市場変化・比較へ変換
- Professional terminalとしての信頼

取らない:
- 巨大企業/投資家だけに寄せること

## Starter Story

取る:
- 実際のRevenue / startup cost / founder context
- 成功事例の具体性

取らない:
- Success story自体をProductの主役にすること

## Bloomberg Terminal 的思想

取る:
- 高密度
- scanability
- 数字中心
- drill-down

取らない:
- 初見ユーザーまで専門用語の海へ投げ込むこと

原則:

> **高密度。低認知負荷。**

---

# 17. Top page CURRENT案

## Header

- MAKE-MONEY
- Search
- Database
- Saved / Pro（将来）

## Minimal hero

長文Heroは避ける。

候補:

> **See how money is actually being made.**

補足:

> Businesses · successes · failures · economics · current signals

## Filter chips

- ALL
- SOLO
- AI
- SAAS
- WEIRD
- FAST
- FAILURE
- HIGH MARGIN

固定ではなく検証可能。

## Main

**LIVE MONEY SIGNALS**

ホーム面積の大半をここへ使う。

## Secondary

**WHAT'S MOVING**

- Solo ↑
- Generic AI wrapper ↓
- Vertical SaaS →
- Weird money ↑

※実集計値があるもののみ。

## Bottom / secondary surface

**DATABASE — 3,341+ businesses**

Explore everything →

---

# 18. 記事の位置づけ

記事はProductの本体ではない。

利用用途:

- SEO流入
- 外部共有
- Signalの長期解説
- レポート形式が必要なケース

しかしホーム・ログイン後・再訪体験は、

> 記事一覧 → 記事を読む

ではなく、

> Signal → 展開 → Compare → Dossier → Raw evidence

を基本とする。

---

# 19. 更新頻度問題への答え

懸念:

> 「毎日、目玉になる超大成功サービスなんて出るのか？」

答え:

**目玉をNew Monsterだけに依存させない。**

新しい会社がなくても、

- Revenue更新
- 失速
- 閉鎖
- Pivot
- Pricing変更
- AI利用の変化
- Headcount圧縮
- 類似事例増加
- Failure cluster発見
- 過去仮説の反証
- 成功/失敗差の発見

がSignalになる。

### 更新階層

- Raw DB updates: 高頻度
- Signal candidates: 自動 / 半自動
- Top Live Signals: 根拠確認後更新
- 大きな月次/週次分析: 必要な場合のみ

「毎日長文記事を書く」運用にはしない。

---

# 20. Monetization — 現時点では仮説

価格・課金はまだ最終決定しない。

ただし月約3,000円を払う理由は、記事本数ではない。

> **世界中の金儲けを自分で巡回・比較・検証する時間を消し、重要な変化だけを逃さないこと。**

Pro候補:

- Signal history
- Full comparisons
- Advanced filters
- Failure clusters
- Raw evidence / source detail
- Saved searches / watchlists
- Alerts
- AI-assisted database queries
- Full P&L / estimates

将来の高額版は、情報量ではなく高額意思決定の精度を売る。

現時点ではまず公開ProductのRetention / Usefulnessを優先する。

---

# 21. SellRelayとの関係 — 今は繋げない

決定:

> **まずMake-money単体を最強にして公開する。SellRelayは後から接続する。**

公開版Make-moneyはSellRelayがなくても成立しなければならない。

そのため現時点では、

- SellRelay referral flow
- Product listing
- Partner commission
- Verified Sale連携

をMake-moneyのProduct価値の前提にしない。

将来接続する場合も、Make-moneyの探索・Signal・DB体験を壊さず、後段Action layerとして追加する。

---

# 22. 実装へ移す際の優先順位

## P0 — Current product contract

- この文書を公開Product正本にする
- 既存Ultimate North Star / ingestion docsと責務分離

## P1 — Signal data model

各Signalに最低限:

- id
- signalType
- headline
- shortMeaning
- primaryMetric
- evidenceClass
- confidence
- observedAt / updatedAt
- relatedEntities
- relatedFailures
- comparison
- mechanism
- source references

を持たせる。

## P2 — Homepage Terminal

- Minimal hero
- Filter chips
- High-density LIVE MONEY SIGNAL rows
- Expand-in-place
- DBへのdrill-down

## P3 — Comparison / evidence

- Success vs failure
- Similar cases
- Evidence state
- Source timestamps

## P4 — Automated Signal candidate generation

- external monitoring
- entity matching
- anomaly / contrast / change detection
- candidate queue
- evidence gate

## P5 — Retention / monetization

- Saved signals
- Watchlist
- Alerts
- Signal history
- Pro

SellRelay integrationはこの後。

---

# 23. Product Success / Failure Gate

## Success

初見ユーザーが10秒以内に、

1. ここが何のサイトか理解する
2. 少なくとも1つ「知らなかった / そんなことある？」を見つける
3. 自分にも関係し得ると感じる
4. 数字・失敗・Evidenceがあり、胡散臭い成功談だけではないと分かる
5. 「また見れば何か拾えそう」と感じる

## Failure

初見ユーザーが、

- 「ビジネスニュース」
- 「起業のお勉強」
- 「成功者インタビュー集」
- 「会社DB」
- 「副業診断」
- 「情報商材」
- 「難しすぎる分析ツール」

のどれかとして理解した場合。

---

# 24. 最終仮決定

Make-money公開版の価値を一文にするなら:

> **世界中でเงินจริงがどう生まれ、何が変わり、何が失敗しているかを大量の事業データと最新情報から監視し、読むべき発見だけを数秒で走査できるMoney Intelligence Terminal。**

ユーザーにさせたい行動は「勉強」ではない。

```text
開く
↓
走査する
↓
驚く
↓
気になるSignalを展開
↓
比較する
↓
必要なら個別Dossier / DB / Evidenceへ潜る
↓
また新しいSignalを見に戻る
```

Make-moneyの核心は、

> **「世界の金儲けを覗いたら、自分の常識が1つ壊れ、しかも根拠まで確認できて、また見に来たくなる」**

状態を作ること。

これを現時点の **PUBLIC PRODUCT NORTH STAR** とする。
