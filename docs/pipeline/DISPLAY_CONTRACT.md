# 表示契約（事例の詳細画面に出す項目）

正本は `src/shared/display-contract.ts`（項目・埋まり方・収集側への一行指示）。この文書はその説明。収集（事例担当の AGENT_BRIEF）・取り込み・診断・画面が同じ定義を見る。

## 項目（画面で読む順）
| key | 名前 | 何で埋まるか（どれか1つ。推論は画面で「推測」と明記） |
|---|---|---|
| LEAD | リード | 推論 HEADLINE。`src/shared/lead-standard.ts` の checkLead に通ること（製品説明・幅・時点不詳の詰め込み・出典に無い数字は不可） |
| KEY_NUMBER | 主要数字 | 数値 REVENUE / OPERATING_INCOME / NET_INCOME / PROFIT / EXIT_VALUE / USERS（推定でない、出典・時点つき） |
| WHO_WHAT_PRICE | 誰が何をいくらで | 事実 DESCRIPTION か推論 BUSINESS_MODEL、かつ 事実 PRICING か数値 PRICE か推論 PRICING |
| CUSTOMER_PAIN | 客の痛み | 推論 CUSTOMER_PAIN / CUSTOMER |
| START_AND_FIRST_CUSTOMERS | 始め方と最初の客 | 事実 FOUNDING、推論 FIRST_CUSTOMERS / STORY |
| MONEY_AND_TIME | 売上・費用・利益と時期 | 数値 REVENUE / 利益 / COST、推論 REVENUE_ESTIMATE / COST_STRUCTURE / TAKE_HOME |
| OPERATIONS | 運営 | 事実 TEAM / TOOL / CHANNEL、推論 CAPITAL_AND_TEAM / TOOLS / CHANNELS |
| TURNS | 転機・失敗・工夫 | 事実 EVENT / EXIT / FUNDING、推論 PIVOTS / FAILURE_CAUSE / WHY_IT_WORKED |
| VIABILITY | 今の有効性 | 推論 VIABILITY / TIMELINE |
| INTERESTING_FACT | 面白い事実 | 事実 OTHER、推論 INCUMBENT_BLINDSPOT / LESSON / UPFRONT_CASH / REFERRAL / LOCK_IN |
| SOURCES | 出典 | 本人・公式・届出を優先。利用規約で表示できない紹介サイト（eBiz Facts 等）は不可。本文が取得できること |
| IMAGE | 画像 | 実際の製品画面（ストア画面写真 → 公式の製品画面 → アイコン）。宣伝バナー・人物写真は不可。権利判定つき |

## 形式で落ちやすい点（取り込みの形式検査 `ReaderCaseSchema`）
- 日付（statedAt・period 等）は `YYYY-MM` か `YYYY-MM-DD`。年だけ（`2016`）は形式外で取り込みが保留になる。月が分からない時は日付欄を空にし、年は本文に書く。
- 通貨欄は3文字の通貨コードだけ。人数などの単位は unit 欄。

## 画面に出るまでの段と、出せない時の戻し先
取り込み（import-case-rebuild）→ 反映（case-reflect: 取り込み版が旧版を置き換える。基準に通らなければ旧版も出さない）→ 照合（出典本文と事実の照合）→ 審査（受領書）→ 選別（select-finished）→ 公開データ作り（catalog:prepare）→ 画面。

出せなかった事例は `scripts/reader-case/display-diagnose.ts` が `data/case-feedback/<id>.json` に理由を書く。
- `collector`: 事例担当が直すこと（表示契約の空き項目・リード・出典・形式）。
- `pipeline`: 経路が進めること（照合・審査・画像・目録）。
作り直した出力は入力指紋が変わるので、その事例だけ再判定される。
