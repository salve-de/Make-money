# 【最高決定版】キーエンス品質・黄金データ収集仕様書 (Golden Ingest Schema)

> **対象**: 全AIエージェント（Antigravity, Claude, GPT, Cursor）、外部リサーチスクリプト、データ収集サブエージェント  
> **目的**: どのAI・スクリプトがどこから読んでも「何を集め、どのキー名・型・単位でR2/自社台帳に投入すればよいか」を1秒で直感理解させ、手戻りとデータ欠落を永久にゼロにする。

---

## 1. 収集の鉄則（サバンナOS ＆ 逆算義務）
1. **優等生AI病の完全禁止（「非公開だから取れない」は即失格）**:
   - 売上や利益が未公開でも調査は続ける。ただし「単価 × 推定アクティブ顧客数」や原価の逆算は、入力・期間・出典・仮定を明示して再現できる場合だけ実施し、`originType: 'estimated'` と計算式を付ける。根拠が足りない値は `UNAVAILABLE` / `未確認` として残し、0円・仮の人数・仮の利益率で埋めない。
2. **定型タグライン・英語クローラー生ログの撲滅**:
   - 「公開資料に基づく...」「〇〇は情報管理ツールです」といった無味乾燥な文章は知覚価値を殺す。「誰のどんな痛みの財布（保身・虚栄心・怠惰）を突いていくら抜いているか」の生々しい日本語で書け。
3. **略奪転用方程式（LOOT_BLUEPRINT）の必須化**:
   - 読者は企業のファンブックを読みに来ているのではない。「今夜別業界で同じズルを使って稼ぐならどう組むか」の配管設計図・コードスニペットを必ず含めよ。

---

## 2. 必須10大属性（全社共通・完全網羅チェックリスト）

| # | フィールド名 | 型 | 単位・形式 | 必須要件・収集基準 |
|---|---|---|---|---|
| 1 | `id` | `string` | `ent_<company>_<hash>` | R2およびMake-Money内で一意のエンティティID |
| 2 | `ticker` | `string` | `AAA.BBB` | 4〜10文字のシンボル（例: `KEYENCE`, `GYM.SHRK`, `BRWS.AI`） |
| 3 | `name` | `string` | 文字列 | 企業・サービス正式名称 |
| 4 | `tagline` | `string` | 日本語1行 | サバンナOS直撃のタグライン（痛みの財布＋手口＋数字） |
| 5 | `sector` | `enum` | 7大カテゴリ | `'AI_AUTOMATION'` \| `'NICHE_SAAS'` \| `'MONOPOLY_MFG'` \| `'CONTENT_MEDIA'` \| `'PHYSICAL_ASSET'` \| `'FINTECH_INFRA'` \| `'LOCAL_SERVICES'` |
| 6 | `scale` | `enum` | 4大区分 + 未確認 | `'SOLO'`（完全1人） \| `'SMALL_TEAM'`（2〜10人） \| `'SCALEUP'`（11〜50人） \| `'ENTERPRISE'`（50人超） \| `'UNKNOWN'`（根拠未確認） |
| 7 | `founder` | `string` | 人名 | 創業者名（複数名はカンマ区切り） |
| 8 | `country` | `string` | ISO 2文字 | 国コード（`JP`, `US`, `UK`, `IE` 等） |
| 9 | `url` | `string` | URL | 公式サイトURL |
| 10 | `temporal` | `object` | 年代・判定 | 創業年、初動突破時期、データ観測期、賞味期限判定 |

---

## 3. 各セクション詳細仕様

### 3.1 財務ステートメント (`pnl`)
すべての金額は**「円（JPY）」**で統一。為替はドル円 150円、ポンド円 190円で換算。

```typescript
pnl: {
  monthlyRevenue: number;         // 月商（円）。必須。
  cogs: number;                   // 売上原価（円）。仕入れ、ホスティング直結原価等。
  grossProfit: number;            // 粗利益（円） = monthlyRevenue - cogs
  grossMargin: number;            // 粗利率（%） = (grossProfit / monthlyRevenue) * 100
  operatingExpenses: {
    serverAndApi: number;         // サーバー・推論API代（円）
    advertising: number;          // 広告宣伝費（円）
    subcontracting: number;       // 外注・業務委託費（円）
    toolsAndSaaS: number;         // ツール・SaaS利用料（円）
    other: number;                // その他固定費（円）
  };
  operatingProfit: number;        // 営業利益（円） = grossProfit - 経費合計
  operatingMargin: number;        // 営業利益率（%） = (operatingProfit / monthlyRevenue) * 100
  estimatedAnnualNetProfit: number;// 年間純利益推計（円）
  financialStatus: 'VERIFIED' | 'REPORTED' | 'ESTIMATED' | 'POST_MORTEM' | 'UNAVAILABLE';
  dataSnapshotPeriod: string;     // 例: "2024年通期決算" / "2024年最新Stripe公開データ"
  sourceDoc: string;              // 一次情報源（例: "有価証券報告書", "創業者インタビュー", "公開ダッシュボード"）
  estimationLogic?: string;       // 推計時の計算式（例: "単価$29 × 顧客3,000人 × 150円 ＝ 月商 約¥1,300万"）
}
```

### 3.2 動的証拠カード (`evidenceCards`)
企業固有の特異点事実を最低2枚以上（うち `LOOT_BLUEPRINT` は必須）配備せよ。

1. **`LOOT_BLUEPRINT`（略奪転用方程式）[必須]**:
   - `punchline`: この手口を別業界へ転用する急所。
   - `details`: 3ステップの転用手順。
   - `codeSnippet`: 現場保全テキスト、DM文面、配管擬似コード。
2. **`THE_CRIME`（身も蓋もない一行の真実）**:
   - 誰から・いくら・どんな手口で抜いているかのレントゲン。
3. **`DIRTY_GENESIS`（初期ゲリラ戦ログ）**:
   - 最初の100人を仕留めた泥臭い自演、手作業代行、Reddit潜入などの事実ログ。
4. **`INCUMBENT_TRAP`（大手の自爆構造）**:
   - 大手が既存の高単価売上やメンツを守るために手を出せないカニバリズム障壁。
5. **`FATAL_BLEED`（死因出血検死解剖）[地雷企業のみ]**:
   - 破滅した企業の資金炎上原因と即死のメカニズム。

### 3.3 運用体制 (`operations`)
```typescript
operations: {
  teamSize: number;               // 現在のチーム人数
  isTeamSizeUnconfirmed?: boolean;// 人数が未確認なら true。0を実績として扱わない
  initialTeamSize?: number;       // 創業初期の人数（1 = 完全1人）
  currentTeamSize?: number;       // 現在の人数
  weeklyHours: number;            // 週稼働時間。未確認ならフラグを付ける
  isWeeklyHoursUnconfirmed?: boolean;
  initialCapitalRequired: number; // 初期投下資本（円）。未確認なら0とフラグを併用
  isCapitalUnconfirmed?: boolean;
  automationLevel: number;        // 自動化レベル（1〜100%）。未確認ならフラグを付ける
  isAutomationUnconfirmed?: boolean;
  primaryChannels: string[];      // 主要集客経路（3つ）
  toolStack: {                    // 現場配管ツール一覧（確認できたものだけ。未確認なら空配列）
    name: string;                 // ツール名（Stripe, AWS, Cloudflare, Next.js等）
    category: string;             // 用途カテゴリ（決済, インフラ, DB, メール等）
    monthlyCost: number;          // 根拠がある月額コスト（円）
    isCostUnconfirmed?: boolean;  // 費用が未確認なら true。0円の実績と解釈しない
    purpose: string;              // 具体的な役割
  }[];
}
```

### 3.3.1 未確認値の境界契約

- 外部資料にない値は、内部互換のため数値 `0` を保持する場合でも必ず `is*Unconfirmed: true` を付け、UI・集計・ランキングでは実績値として扱わない。
- `scale`、`strategy.moatType`、`temporal.viabilityStatus` は根拠がない場合に `UNKNOWN` を使う。
- `toolStack` と `primaryChannels` は確認できた項目だけを入れる。未確認を理由に架空のツール・費用・チャネルを追加しない。
- `verifiedBadge` と `VERIFIED` は一次資料と期間・対象が一致する場合だけ付ける。推計は `ESTIMATED`、報告は `REPORTED`、根拠不足は `UNAVAILABLE` / `UNKNOWN` として、出典・計算式・確認日を残す。

### 3.4 資本主義の裏帳簿戦略 (`strategy`)
```typescript
strategy: {
  blindspot: string;              // 既存大手・競合が見落としている盲点（痛みの財布直撃）
  moatType: 'COUNTER_POSITIONING' | 'SWITCHING_COST' | 'NETWORK_EFFECT' | 'CORNERED_RESOURCE' | 'SCALE_ECONOMIES' | 'BRAND_PRESTIGE' | 'PROCESS_POWER' | 'UNKNOWN';
  moatDescription: string;        // 堀の構造的説明
  incumbentDilemma: string;       // 大手が真似できない理由（カニバリズム障壁）
  secretInsight: string;          // 創業者だけが知っている業界の裏の真実
  initialTraction: string[];      // 初動突破のマイルストーン（3つ）
  actionPlaybook: string[];       // 3ステップのアクション手順
  coldOutreachTemplate: string;   // 今夜使えるコールド営業・提案文テンプレート
}
```

### 3.5 時系列・賞味期限インテリジェンス (`temporal`)
```typescript
temporal: {
  foundedYear: number;            // 創業・ローンチ年（西暦4桁。例: 2021）
  initialTractionPeriod: string;  // 初動突破時期（例: "2021年春（Product Huntとデモ動画バイラル）"）
  dataSnapshotPeriod: string;     // 財務データの観測基準（例: "2024年通期推計"）
  viabilityStatus: 'ACTIVE_PLAYBOOK' | 'RISING_WAVE' | 'MATURED_MOAT' | 'HISTORICAL_WINDOW' | 'EVOLVING_BARRIER' | 'UNKNOWN';
  viabilityLabel: string;         // 日本語ラベル（例: "現在も有効", "先行者堀で堅牢", "トレンド最盛期"）
  eraContext: string;             // 当時なぜその手口が通用したのかの時代背景
  currentViabilityAnalysis: string;// 「今同じことをやるとどうなるか」の冷徹な客観分析
}
```

---

## 4. 完全体JSONテンプレート（1社分の完全形）

外部スクリプトやAIは、以下のJSONフォーマットをそのまま出力せよ：

```json
{
  "id": "ent_sample_338a08d2983b",
  "ticker": "SMPL.SAAS",
  "name": "Sample SaaS",
  "legalEntity": "Sample SaaS, Inc.",
  "tagline": "「既存ツールの重厚な設定に疲弊した」現場担当者の痛みを突き、1クリックの爆速UIで年商2.7億円・手残り純利85%を抜く完全1人要塞",
  "sector": "NICHE_SAAS",
  "scale": "SOLO",
  "founder": "Jane Doe",
  "country": "US",
  "url": "https://samplesaas.com",
  "verifiedBadge": true,
  "growthRateYoY": 28.5,
  "architecturePattern": "単機能特化・爆速UI",
  "pipelineStack": "Next.js × Cloudflare Workers × Stripe × Supabase",
  "targetPainWallet": "多機能すぎて動作が遅い大手SaaSに毎月数万円払わされている中小企業担当者のストレス",
  "tags": ["完全1人", "利益率80%超", "爆速ツール", "解約率極小"],
  "pnl": {
    "monthlyRevenue": 22500000,
    "cogs": 1125000,
    "grossProfit": 21375000,
    "grossMargin": 95.0,
    "operatingExpenses": {
      "serverAndApi": 350000,
      "advertising": 0,
      "subcontracting": 0,
      "toolsAndSaaS": 180000,
      "other": 500000
    },
    "operatingProfit": 20345000,
    "operatingMargin": 90.4,
    "estimatedAnnualNetProfit": 244140000,
    "financialStatus": "REPORTED",
    "dataSnapshotPeriod": "2024年（創業者公開ダッシュボード）",
    "sourceDoc": "創業者Xポストおよび公開Stripeダッシュボード",
    "estimationLogic": "月額$29プラン × 5,200契約 × 150円 ＝ 月商 約¥2,260万"
  },
  "evidenceCards": [
    {
      "id": "ev_sample_loot_blueprint",
      "type": "LOOT_BLUEPRINT",
      "title": "【略奪転用】大手の不要な機能を90%削ぎ落とし、単一の快感操作で月商2,000万円抜くコード",
      "badge": "略奪転用方程式",
      "evidenceStatus": "VERIFIED",
      "punchline": "大手が数年かけて肥大化させた機能を1画面に凝縮し、キーボードショートカットだけで操作を完結させる。",
      "details": [
        "【大手の不満レビューを総攫い】: G2やCapterraで「動作が重い」「設定が複雑」と書かれた競合の悪評を逆手にとる。",
        "【ローカルファースト設計】: サーバー通信を待たずに画面を0msで動かし、圧倒的な操作の快感を提供する。",
        "【買い切り＋年間アップデート課金】: 月額サブスク疲れのユーザーに対し、年額固定または買い切りで前金を総取りする。"
      ],
      "codeSnippet": "// 単一急所特化の配管設計図\n1. ユーザーの入力データをクライアント側IndexedDBへ即時保存（レイテンシ0ms）\n2. バックグラウンドでCloudflare D1へ差分同期\n3. Stripe Checkoutで年額$79プランを一発決済",
      "sourceNote": "Jane Doe 創業インタビュー"
    },
    {
      "id": "ev_sample_crime",
      "type": "THE_CRIME",
      "title": "原価率5%の完全1人要塞・広告費ゼロ",
      "badge": "急所直撃モデル",
      "evidenceStatus": "VERIFIED",
      "punchline": "広告費を1円も使わず、初期に投稿した1本のデモ動画のバイラルだけで有料顧客5,000人を獲得。",
      "details": [
        "Product HuntとHacker Newsで同日1位を獲得し、初期トラクションを確立。",
        "機能追加の要望を9割拒否し、アプリの軽量性と起動速度を死守。"
      ],
      "metrics": [
        {"label": "粗利率", "value": "95.0%", "isHighlight": true},
        {"label": "営業利益率", "value": "90.4%", "isHighlight": true},
        {"label": "社員数", "value": "完全1人", "isHighlight": true}
      ]
    },
    {
      "id": "ev_sample_incumbent_trap",
      "type": "INCUMBENT_TRAP",
      "title": "大手の自爆構造: エンタープライズ機能の肥大化による自縄自縛",
      "badge": "大手の死角",
      "evidenceStatus": "VERIFIED",
      "punchline": "大企業向けに数千の機能を詰め込んだ既存大手は、機能を削ってシンプルにすると大口顧客の稟議を満たせなくなるため、軽量版には絶対に参入できない。",
      "details": [
        "大手の営業組織は数千万円のエンタープライズ契約でノルマを追っているため、月額数ドルのツールには見向きもできない。"
      ]
    }
  ],
  "operations": {
    "teamSize": 1,
    "initialTeamSize": 1,
    "currentTeamSize": 1,
    "weeklyHours": 15,
    "initialCapitalRequired": 50000,
    "automationLevel": 90,
    "primaryChannels": ["X (Twitter) デモ動画", "GitHub / オーガニック検索", "開発者口コミ"],
    "toolStack": [
      {"name": "Cloudflare Pages/Workers", "category": "インフラ・エッジ", "monthlyCost": 15000, "purpose": "グローバル爆速静的配信"},
      {"name": "Stripe", "category": "決済", "monthlyCost": 720000, "purpose": "世界決済・ライセンス自動発行"},
      {"name": "Supabase", "category": "DB", "monthlyCost": 45000, "purpose": "ユーザー認証・ライセンス検証"}
    ]
  },
  "strategy": {
    "blindspot": "【多機能化に逃げる大手の死角をハック】大手がエンタープライズの要望で機能を増やし操作が重くなる中、逆張りで機能を極限まで削って『直感の1秒操作』に全リソースを集中。",
    "moatType": "COUNTER_POSITIONING",
    "moatDescription": "大手が真似できない極限のシンプルさと、個人開発者ならではの超高速改善サイクル。",
    "incumbentDilemma": "大手は既存の高単価契約を守るために機能を削ることができず、軽量特化モデルには指をくわえて見逃すしかない。",
    "secretInsight": "ユーザーはお金を『多機能さ』に払っているのではなく、『迷わずに作業が完了する安心感』に払っている。",
    "initialTraction": [
      "操作画面を撮影した15秒のGIF動画をXに投稿し、1万RTを獲得",
      "Product Huntローンチでプロダクト・オブ・ザ・デイを獲得",
      "初期1,000名に買い切り先行優待をオファーし即日完売"
    ],
    "actionPlaybook": [
      "Step 1: 競合ツールの中で最も頻繁に使われている単一機能だけを特定する",
      "Step 2: 余計な設定画面を全廃し、URLを開いた瞬間に作業できるUIを構築する",
      "Step 3: 年額または買い切りで前金を回収し、広告費ゼロでオーガニック拡散させる"
    ],
    "coldOutreachTemplate": "【Sample型・爆速業務改善アプローチ】\n「毎日の業務で、ツールを開いて設定するまでの待ち時間にイライラしていませんか？\n弊社の新ツールなら、キーボードだけで操作が5秒で完了します。\n無料デモを今すぐお試しください。」"
  },
  "temporal": {
    "foundedYear": 2022,
    "initialTractionPeriod": "2022年秋（Xデモ動画のバイラルとProduct Hunt 1位）",
    "dataSnapshotPeriod": "2024年（公式公開ダッシュボード）",
    "viabilityStatus": "ACTIVE_PLAYBOOK",
    "viabilityLabel": "現在も有効",
    "eraContext": "多機能SaaSへの疲れ（Tool Fatigue）と、単機能ミニマリズムへの回帰トレンド期",
    "currentViabilityAnalysis": "大手の機能肥大化がさらに進んでいるため、単一急所特化の軽量ツールの勝率は今なお極めて高い。"
  }
}
