# 全プロジェクト共通：完全自律データ収集 ＆ 100年R2保存プロトコル (Autonomous Ingest & 100-Year R2 Protocol)

> **最高運用契約**: ユーザーは長文プロンプトや追加条件を絶対に書かない。
> 「AGENTS.md見てデータ集めて」の一言で、全AI（Antigravity, Claude, ChatGPT, Cursor）は一切の追加質問・手戻りなしに完全自律稼働せよ。
> 本プロトコルは、Make-Money、Investrader、universal-foundation、および今後立ち上がる全プロジェクトにそのまま適用可能な【最高標準契約】である。

---

## Ⅰ. 0クリック自走原則（Zero-Effort Execution）

1. **一言発動（One-Phrase Trigger）**:
   - ユーザーが「AGENTS.md見てデータ集めて」「〇〇のデータ集めてR2に入れて」と一言口にした瞬間、AIは一切の質問（「どの企業にしますか？」「どう保存しますか？」等）を返さず、直ちに底引き網調査とR2保存を開始せよ。
2. **優等生AI病の完全粉砕**:
   - 「非公開だから取れない」は即失格。単価×推定アクティブ顧客数×業界原価率（Stripe 2.9%+$0.30、サーバー代、API代等）からP&Lウォーターフォールを科学的に逆算し、`originType: 'estimated'` と計算式を明記せよ。
3. **道徳・美談の完全排除**:
   - 創業者の綺麗事（「価値ある発信でファンを増やした」）を焼き払い、Reddit自演、コールドDM爆撃、ToS隙間ハック等の泥臭い初動突破事実ログを抉り出せ。

---

## Ⅱ. 3大収集モード切り替えトリガー（ユーザーの一言で即時分岐）

AIはユーザーの短い一言から意図を即座に判定し、以下の3モードのいずれかに自律分岐せよ（追加質問は厳禁）：

| ユーザーの指示（一言） | 実行モード | 構成比 | 収集対象・必須要件 |
|:---|:---|:---:|:---|
| **「勝ちの方だけ集めて」**<br>「成功事例だけ」「黒字事例だけ」 | **① 勝ち組特化モード** | **10:0** | 業種・規模・利益率の数値による限定・足切りは一切禁止。物販・製造・SaaS・メディア・店舗等、資本主義の構造を突いて現金を抜いている勝者を柔軟に全量収集。<br>（必須: `LOOT_BLUEPRINT`, `THE_CRIME`） |
| **「地雷の方だけ集めて」**<br>**「負けの方だけ集めて」**<br>「大爆死事例だけ」「失敗企業集めて」 | **② 地雷検死解剖モード** | **0:10** | 業種・規模不問。巨額調達即死、CAC高騰炎上、規約変更死、固定費過多死などの失敗・撤退ログを柔軟に収集。<br>（必須: `financialStatus: 'POST_MORTEM'`, **`FATAL_BLEED`（死因出血解剖）[100%必須]**, `LOOT_BLUEPRINT`（回避配管）） |
| **「データ集めて」**<br>「AGENTS.md見てやって」<br>（※特に指定がない場合） | **③ 攻守混合デフォルト** | **7:3** | 勝ち組（約7〜8割）と地雷組（約2〜3割）を柔軟に底引き網収集。生存者バイアスを粉砕し、損失回避本能を着火させる。 |

> **【限定完全排除の最高鉄則】**:
> 「粗利〇〇%以上でなければならない」「完全1人でなければならない」といった狭小な思考停止フィルターは一切禁止する。
> 粗利30%の物販でも在庫回転で富を抜いていれば勝ち組であり、数万人規模の大企業の手口も、1人SaaSの手口も全て等しく対象である。形式の枠に囚われず、金が動いている生々しい事実と構造を柔軟に拾い上げよ。

---

## Ⅲ. 必須10大属性 ＆ 完全体JSON（Golden Schema）

全ての収集データは、以下の10属性を1つも欠落させてはならない：

1. `id`: 一意のエンティティID（`ent_<name>_<hash>`）
2. `ticker`: 4〜10文字のシンボル（例: `KEYENCE`, `GYM.SHRK`, `FAIL.BLEED`）
3. `name`: 正式名称
4. `tagline`: サバンナOS直撃の日本語1行（痛みの財布＋手口＋数字）
5. `sector`: 7大業種（`AI_AUTOMATION` / `NICHE_SAAS` / `MONOPOLY_MFG` / `CONTENT_MEDIA` / `PHYSICAL_ASSET` / `FINTECH_INFRA` / `LOCAL_SERVICES`）
6. `scale`: 規模区分（`SOLO` 完全1人 / `SMALL_TEAM` 2〜10人 / `SCALEUP` 11〜50人 / `ENTERPRISE` 50人超 / `UNKNOWN`）
7. `founder`: 創業者実名
8. `country`: 国コード（ISO 2文字）
9. `url`: 公式サイトURL
10. `temporal`: 時系列・賞味期限インテリジェンス（創業年、初動獲得期、観測期、賞味期限5大判定、時代背景、現在の勝敗分析）

### P&L因数分解（円換算・Stripe手数料控除・創業者手残り）
すべての金額は円（JPY）で統一（1ドル=150円、1ポンド=190円換算）：
- `monthlyRevenue`（月商） / `cogs`（売上原価） / `grossProfit`（粗利益） / `grossMargin`（粗利率%）
- `operatingExpenses`: `serverAndApi`（推論・サーバー代）, `advertising`（広告費）, `subcontracting`（外注費）, `toolsAndSaaS`（ツール代）, `other`（その他）
- `operatingProfit`（営業利益） / `operatingMargin`（営業利益率%） / `estimatedAnnualNetProfit`（年間純利益）
- `financialStatus`: `VERIFIED` / `REPORTED` / `ESTIMATED` / `POST_MORTEM` / `UNAVAILABLE`

### 稼働ツール配管（`operations.toolStack`）
実際に確認できたツール群を月額原価（円）付きで列挙（Stripe, AWS, Cloudflare, Next.js等）。

---

## Ⅳ. 100年壊れないR2保存の3層メダリオン構造

R2ストレージは、人間の感情による物理フォルダ整理を永久に禁止し、以下の**「3層構造（物理移動ゼロ）」**で完全固定する：

```text
［Layer 1: 原物（Bronze / Raw）］ ── 完全不変（Write-Once, 削除・上書き禁止）
  └─ foundation-raw/blobs/sha256/<hash>              （Web魚拓、PDF原本、スクレイピングHTML）

［Layer 2: 保存票（Silver / Lake）］ ── 追記専用（Append-Only）
  └─ foundation-lake/journal-entry.v1/<id>.json      （上記Golden完全体JSON、事実ログ）

［Layer 3: 目録・提供ビュー（Gold / View）］ ── 全自動再生成可能（Derived）
  └─ entities-index.json / D1                        （単一目録側で1行JOINして画面へ描画）

【絶対不可侵境界】
  └─ universal/data-assets/financials/               （EDINET正本領域には一切触れない・書き込まない）
```

### 100年運用の4大鉄則
1. **原物を解析結果で置き換えない**: 原本は永久不変。訂正も新しい履歴として追記する。
2. **保存完了を先に宣言しない**: 不完全な取得・保留・失敗はその状態で保持する。
3. **同じ依頼を再送しても壊れない**: 不変ハッシュにより重複再送されても安全に同一結果へ収斂する（冪等性）。
4. **復元できることを実際に試す**: 上位のGoldやUIキャッシュが全損しても、原物と保存票からいつでも100%全自動再生成できる。

---

## Ⅴ. 他プロジェクト（Investrader, Foundation等）への導入手順

本プロトコルを他のリポジトリに展開する際は、以下の3ステップのみで完了する：

1. **AGENTS.mdの先頭に本プロトコルを宣言**:
   ```markdown
   > **2026-09-13 最高運用契約**: 「AGENTS.md見てデータ集めて」の一言で完全自走せよ。正本は `docs/architecture/AUTONOMOUS_DATA_INGEST_PROTOCOL.md`。
   ```
2. **プロジェクトのバケット設定（wrangler.jsonc）にR2バケットを接続**:
   - `RAW_BUCKET`: `foundation-raw`（原物保管庫）
   - `LAKE_BUCKET`: `foundation-lake`（保存票・Journal保管庫）
3. **台帳（D1またはJSON index）へのマッピング**:
   - 物理パスをいじらず、そのプロジェクトの主キーストア（例: Investraderの銘柄コード、Make-Moneyのentity ID）とR2オブジェクトを1行JOINする。
