# 調査記録の書き方（見本と必須項目）

新しい事例を調べた人（人でもAIでも）が書く「調査記録」の形です。
見本は [`keygen.example.json`](./keygen.example.json)（実在の事例 Keygen の記録を短く削ったもの）。
全体の流れは [`../COLLECT_TO_UI.md`](../COLLECT_TO_UI.md) を読んでください。

## この記録は何か

- 調べた事実と出典を、1事例1件の JSON にしたものです。ファイルの中身は**配列**（`[ {...} ]`）にします。1件だけでも配列にします。
- 書くのは「集める層」です。事実・出典・日付・数字を広く書きます。外貨は元の通貨のまま書きます（円にしない）。
- 画面に出る文（一覧の文、概要、章、成功の秘訣）は、ここには書きません。後の段で別のファイルに作ります。
- この記録は `add-entity-records.ts --from-research` で一覧（`data/entities-index.json`）に入ります。入る前に下の2つの検査を通ります。
  1. 事業記録の形の検査（`src/shared/schemas/financial-entity.json`。`parseFinancialEntitiesResiliently` が使う）
  2. 読者向けの変換（`src/lib/company-access/reader-case-projection.ts` の `projectReaderCase`）と、その形の検査（`src/shared/reader-case.ts`）

見本は、この2つを通ることを確かめてあります（2026-10-07）。

## 必須の項目（無いと検査で落ちる）

印の意味: **必須** = 無いと形の検査で落ちる。**必須（道具）** = 形の検査は通るが、後の段が止まる・何も出ない。任意 = 書けるなら書く。

### いちばん外側

| 項目 | 印 | 型 | 書き方 |
|---|---|---|---|
| `id` | **必須** | 文字列 | `ent_` で始める。英小文字・数字・`_`・`-`。例 `ent_keygen_f67d337b226e` |
| `ticker` | **必須** | 文字列 | 短い大文字の略号。上場していなくてよい |
| `name` | **必須** | 文字列 | 事業名 |
| `tagline` | **必須** | 文字列 | 何の事業かの1〜2文 |
| `sector` | **必須** | 選択肢 | `AI_AUTOMATION` `NICHE_SAAS` `MONOPOLY_MFG` `CONTENT_MEDIA` `PHYSICAL_ASSET` `FINTECH_INFRA` `LOCAL_SERVICES` `UNKNOWN` |
| `scale` | **必須** | 選択肢 | `SOLO` `SMALL_TEAM` `SCALEUP` `ENTERPRISE` `UNKNOWN` |
| `founder` | **必須** | 文字列 | 分からなければ `未確認` |
| `country` | **必須** | 文字列 | 分からなければ `未確認` |
| `url` | **必須** | 文字列 | 公式サイトの URL（`https://...`）。重複の判定にも使う |
| `verifiedBadge` | **必須** | 真偽 | 新しい調査は `false` |
| `growthRateYoY` | **必須** | 数 | 分からなければ `0` にし、`isGrowthUnconfirmed: true` を付ける |
| `architecturePattern` | **必須** | 文字列 | どう売っているかの1文 |
| `pipelineStack` | **必須** | 文字列 | 分からなければ `未確認` |
| `targetPainWallet` | **必須** | 文字列 | 分からなければ `未確認` |
| `tags` | **必須** | 文字列の配列 | `収集事例` は道具が自動で足す |
| `pnl` | **必須** | 下の表 | 損益の欄 |
| `operations` | **必須** | 下の表 | 運営の欄 |
| `strategy` | **必須** | 下の表 | 戦略の欄 |
| `temporal` | 任意（書くなら全部必須） | 下の表 | 時期の欄。書くと7項目すべてが必須になる |
| `facts` | **必須（道具）** | 下の表 | 出典つきの事実。これが無いと画面に出す事実が無い |
| `reaudit.sources` | **必須（道具）** | 下の表 | 出典の一覧。無いと根拠カードが作られず、選別で落ちる |
| `unknownsNotes` | 任意 | **文字列の配列** | 1つの文字列にすると落ちる |
| `essence` | 任意（書くなら3項目必須） | 文字列3つ | `whatItDoes` `targetCustomer` `painRelief` |
| `legalEntity` `description` `officialUrl` `publishability` `batchId` `financialStatus` `observations` `observationsStream` `claimBindings` | 任意 | 見本どおり | `publishability` は `PUBLISHABLE` `PARTIAL` `RAW` `ARCHIVED` `REJECTED_AS_CASE` のどれか |
| `evidenceCards` | 書かない | — | `--from-research` が `reaudit.sources` から自動で作る |
| `reader` | 書かない | — | 書いても捨てられる。画面の中身は後の段が作る |

### `pnl`（損益）

今の形の検査は、数の欄に `null` を許しません（数でないと落ちる）。そのため、**分からない数は `0` を置き、必ず次の2つを付けます。**

1. その欄の「未確認」の印（`isRevenueUnconfirmed` など）を `true` にする。
2. 確かな数字が1つも無ければ `financialStatus: "UNAVAILABLE"` にする。

この `0` は「0円だった」という意味ではありません（[OWNER_INTENT 3章](../OWNER_INTENT.md)）。画面の事実と数字は `facts` から作られ、`pnl` の数は画面に出ません。品質の検査も、この2つの印がある欄の計算は見ません。印を付けずに `0` を置くと、0円の事実として扱われるので禁止です。本人が公表した売上などの数字は、`pnl` に入れる前に、まず `facts` に元の通貨のまま書きます。
（`null` を受け付ける形への見直しは、まだ決まっていません。）

| 項目 | 印 | 型 |
|---|---|---|
| `monthlyRevenue` `cogs` `grossProfit` `grossMargin` `operatingProfit` `operatingMargin` `estimatedAnnualNetProfit` | **必須** | 数 |
| `operatingExpenses` | **必須** | `serverAndApi` `advertising` `subcontracting` `toolsAndSaaS` `other` の5つの数がすべて必須 |
| `isRevenueUnconfirmed` `isCogsUnconfirmed` `isGrossProfitUnconfirmed` `isGrossMarginUnconfirmed` `isCostsUnconfirmed` `isOperatingProfitUnconfirmed` `isMarginUnconfirmed` `isNetProfitUnconfirmed` | **0を置いた欄は必須で `true`**（形の検査は見ないので、書き忘れても落ちない。自分で確かめる） | 真偽 |
| `financialStatus` | 確かな数字が無ければ `UNAVAILABLE` | `VERIFIED` `REPORTED` `ESTIMATED` `POST_MORTEM` `UNAVAILABLE` |
| `sourceClass` | 任意 | `PRIMARY` `INDEPENDENT_SECONDARY` `COMMUNITY` `MODEL` |
| `revenueLabel` `dataSnapshotPeriod` `sourceDoc` | 任意 | 文字列。`sourceDoc` は URL |

### `operations`（運営）

| 項目 | 印 | 型 |
|---|---|---|
| `teamSize` `weeklyHours` `initialCapitalRequired` `automationLevel` | **必須** | 数（分からなければ `0` と、対応する `is...Unconfirmed: true`） |
| `primaryChannels` | **必須** | 文字列の配列（空でよい） |
| `toolStack` | **必須** | 配列（空でよい）。中身を書くなら1つずつ `name` `category` `monthlyCost` が必須 |

### `strategy`（戦略）

| 項目 | 印 | 型 |
|---|---|---|
| `blindspot` `moatDescription` | **必須** | 文字列（分からなければ `未確認`） |
| `moatType` | **必須** | `COUNTER_POSITIONING` `SWITCHING_COST` `NETWORK_EFFECT` `CORNERED_RESOURCE` `SCALE_ECONOMIES` `BRAND_PRESTIGE` `PROCESS_POWER` `UNKNOWN` |
| `initialTraction` `actionPlaybook` | **必須** | 文字列の配列（空でよい） |

### `temporal`（時期。書くなら7つすべて必須）

| 項目 | 型 | 注意 |
|---|---|---|
| `foundedYear` | 数 | 例 `2016` |
| `initialTractionPeriod` `dataSnapshotPeriod` `eraContext` `currentViabilityAnalysis` | 文字列 | 分からなければ `未確認` |
| `viabilityStatus` | 選択肢 | `ACTIVE_PLAYBOOK` `RISING_WAVE` `MATURED_MOAT` `HISTORICAL_WINDOW` `EVOLVING_BARRIER` `UNKNOWN` |
| `viabilityLabel` | 文字列 | **忘れやすい**。分からなければ `未確認` |

### `facts`（出典つきの事実。画面の事実はここから作られる）

| 項目 | 印 | 型・決まり |
|---|---|---|
| `kind` | 必須（道具） | `DESCRIPTION` `PRICING` `FOUNDING` `TEAM` `CHANNEL` `TOOL` `EVENT` `EXIT` `FUNDING` `OTHER`。これ以外は `OTHER` になる |
| `text` | 必須（道具） | 1文〜数文、400字まで。**URL を入れない。「（出典: …）」を入れない。「2026-10-07確認」のような確認日の注記を入れない** |
| `sourceUrl` | 必須（道具） | `http(s)://` で始まる出典の URL。無い・形が違うと、その事実は捨てられる |
| `statedAt` | 任意 | 出典の日付。`YYYY-MM` か `YYYY-MM-DD`。**年だけ（`2016`）は使われない** |

- 1つの事実に1つの出典。数字は出典にある値をそのまま、元の通貨で書きます（例「月24ドル」）。
- 公式サイトを出典にした「何の事業か」の事実（`kind: DESCRIPTION`）を先頭に入れます。概要と一覧の文の元になります。
- 事実が無い欄を推測で埋めません。推測は後の「分析」の段で、印を付けて書きます。

### `reaudit`（調査の記録）

| 項目 | 印 | 型・決まり |
|---|---|---|
| `sources` | 必須（道具） | 配列。1つずつ `url`（必須）`publisher` `sourceType` `publicationDate`（`YYYY-MM-DD` か `null`）`checkedAt`（`YYYY-MM-DD`）`rightsTier` |
| `auditDate` | 任意 | `YYYY-MM-DD` |
| `unknown` `conflicts` | 任意 | 文字列の配列。取れなかったこと、出典どうしの食い違いと採った方を書く |
| `status` `timezone` `auditOwner` `method` `family` `supported` | 任意 | 見本どおり |

- `facts` で使った `sourceUrl` は、すべて `sources` にも入れます。
- `rightsTier` は、公式・本人の物は `TIER1_OFFICIAL`、事実だけ使える物（掲示板など）は `TIER2_FACTS_ONLY`。eBiz Facts は出典にしません（利用規約で表示禁止。[OWNER_INTENT 6章](../OWNER_INTENT.md)）。

## 落ちた時の表示の読み方

形の検査で落ちると、次のような表示が出ます。`#/` の後が落ちた場所、最後の語が理由です。

```
Invalid FinancialEntity: ... #/temporal required, ... #/unknownsNotes type
```

- `required`: 必須の項目が無い（この例では `temporal.viabilityLabel`）。
- `type`: 型が違う（この例では `unknownsNotes` が配列でなく文字列）。
- `enum`: 選択肢に無い値。

## 自分で確かめる

見本を書き換えたら、一時コピーで次を実行して通ることを確かめてください（`--from-research` が main に入った後の手順）。

```
node --import tsx scripts/reader-case/add-entity-records.ts --from-research docs/research-record/keygen.example.json --name example-check
```

成功すると `data/entity-additions/example-check.json` ができます。確かめるだけなら、このファイルは消してください（コミットしない）。
