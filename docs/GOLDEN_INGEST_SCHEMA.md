# 【最高決定版】キーエンス品質・黄金データ収集仕様書 (Golden Ingest Schema)

> **対象**: 全AIエージェント（Antigravity, Claude, GPT, Cursor）、外部リサーチスクリプト、データ収集サブエージェント  
> **目的**: どのAI・スクリプトがどこから読んでも「何を集め、どのキー名・型・単位でR2/自社台帳に投入すればよいか」を1秒で直感理解させ、手戻りとデータ欠落を永久にゼロにする。

## 0. プロジェクトの北極星とデータ収集の理念（なぜ集めるのか）

> **【プロジェクトの北極星】**:
> **「世に溢れる『努力・理念・綺麗事』という欺瞞の煙幕を完全に焼き払い、世界中の『生々しい金儲けの事実と手口（資本主義の裏帳簿）』を冷徹に白日の下に晒し続けることで、隷属と理不尽から抜け出そうと抗う全人類に『これを持たずに動くのは自殺行為だ』と確信させる【絶対の武器（資本主義のデフォルトOS）】となり、あらゆる事業・起業・投資が始まる『最初の起点（マネーの交差点）』として君臨し、その巨大な引力場（情報の関所）で全方位から富を抜き続けること。」**

### 【最高視座：我々が最もメタ的に収集したいもの】
我々が収集したいのは特定の企業データではなく、綺麗事（努力・理念）を完全に剥ぎ取った後に残る**【資本主義における『富の不可逆な移転メカニズム（物理法則）』のログ】**そのものである：
1. **「弱点の力学」（なぜ金が動いたか）**: 人間や組織が理性を失って財布を開かざるを得なかったサバンナOSの急所（保身恐怖、極限の怠惰、虚栄心、解約不能の監禁、独占利権）。
2. **「配管の力学」（どうやって現金を吸い上げたか）**: 労働から解放され、大手の自爆（カニバリズム）、プラットフォーム規約の盲点、他人の欲望、前金総取りを燃料にして自動で現金を吸い上げた構造的レバレッジ（関所）。
3. **「現金の力学」（結果として通帳に何が起きたか）**: 見栄の年商ではなく、原価・手数料・税を全て引いた後に「創業者個人の通帳に実際に残った現金実額（真の手残り）」、または幻想が崩壊して即死した「致死出血点」。

### データ収集エージェントの鉄則（限定の完全排除）
1. **あらゆる前提・限定の完全排除**: SaaS、製造、物販、店舗、メディア、下請け、大企業、個人、表、裏など、いかなる業種・規模・形態・場所の限定も一切禁止する。資本主義で現実に金が動いている（または尽きて死んだ）事実は全て収集対象である。
2. **収集項目と足切り条件の完全分離**: 人数・粗利・原価・URL・創業者・ツール等は**当然すべて徹底調査して記録する**。しかし、**いかなる項目の有無や数値も【収集の足切り条件】には絶対にしない**。
3. **事実と手口（裏帳簿）の全量記録**: 綺麗事の定型文を排し、誰から・どんな手口で・いくら抜いたか（またはどこで死んだか）の客観的ログを記録せよ。

### 【取れるのに漏らすな：5大深層底引き網ルート（必須巡回）】
ネット上に公開されているのにAIが浅い表面クロールで漏らしがちな以下の5大一次情報を必ず掘り尽くせ：
1. **創業者個人の過去ログ（X, Reddit, IndieHackers, HackerNews）**: 会社の公式発表ではなく、創業者個人のリプ欄やAMAに転がっている「初動の泥臭いズル」「Stripe管理画面スクショ」「初期P&Lのポロリ告白」。
2. **Wayback Machine（初期魚拓）**: 現在の洗練されたサイトではなく、創業初期の「ショボい初期機能」「買い切り時代の生々しい価格」「初期の泥臭いタグライン」。
3. **求人票（Job Description / Wantedly / Lever等）**: 採用要項に赤裸々に書かれた「社内で実際に稼働しているツール群（AWS, Stripe, Snowflake等）」「現場の真の課題・ボトルネック」「本当の職種別組織比率」。
4. **裏アフィリエイト・キックバック配管（フッター, ASP, Rewardful等）**: 表のLPには出ない「売上の30〜50%永久キックバック」「紹介報酬」という、広告費ゼロで広げている真の集客エンジン。
5. **解約怨嗟・悪評（Trustpilot, Reddit, G2等）**: 公式のサクラ事例ではなく、「解約できない」「データが人質」「他社に移れず泣く泣く払っている」という、高収益を支える理不尽な監禁（スイッチングコスト）の実態。

---

## 1. 収集の鉄則（サバンナOS ＆ 逆算義務）
1. **落ちてない・探してもないなら仕方ない原則（無理な深追いの厳禁 ＆ 合理的推計）**:
   - ネット上に落ちていない、探しても公開されていない一次情報（詳細なツール代内訳、サーバー原価の細かい勘定等）は、**「落ちていないのだから仕方がない」**。無理に深追いして調査の手を止めたり、クローラーをループさせて自爆することは厳禁とする。
   - 業界相場、社員規模、ビジネス構造からAIが合理的に想像・推計（`originType: 'estimated'`）して堂々と埋め、前に進め。我々が知りたいのは重箱の隅の数字ではなく**「誰のどんな痛みの財布を突いて現金を抜いたかの構造」**である。
2. **小手先コード・Webhook定義の完全排除（構造要点への集中）**:
   - 略奪転用方程式（`LOOT_BLUEPRINT`）に、ZapierのWebhook定義やStripe課金コード、プロンプトスニペット等の小手先のコードを長々と貼り付ける必要は一切ない。
   - 「どの弱点を突き、大手のどの自爆構造を利用し、どうやって中間マージンを強奪するか」という**ビジネス構造・戦略設計の要点**のみを鋭利に記述せよ。
3. **定型タグライン・英語クローラー生ログの撲滅**:
   - 「公開資料に基づく...」「〇〇は情報管理ツールです」といった無味乾燥な文章は知覚価値を殺す。「誰のどんな痛みの財布（保身・虚栄心・怠惰）を突いていくら抜いているか」の生々しい日本語で書け。
4. **勝ち組特化 ＆ 地雷組検死の両輪収集（生存者バイアスの粉砕）**:
   - 成功事例（業種・規模不問。7大業種・全規模から、構造的に利益と現金を抜き続ける勝者）だけでなく、**「大爆死・資金炎上・即死した地雷事例（Quibi, Clubhouse, 規約変更即死SaaS等）」も全体の約2〜3割の比率で必ず集めよ**。
   - 地雷企業は `financialStatus: 'POST_MORTEM'` とし、**`FATAL_BLEED`（死因出血検死解剖）カードを100%必須配備**せよ（どこで資金が尽きたか、どの特異点で即死したかの冷徹なレントゲン）。
   - 地雷企業における `LOOT_BLUEPRINT` は「同じ地雷を二度と踏まないための逆張り回避配管・生存設計図」として記述せよ。

---

## 2. 基本10属性（柔軟収集・項目欠落による足切り完全禁止）

> **【限定・足切りの完全排除原則】**:
> **URLがなくたっていい。公式サイトが消滅していようが、オフラインビジネス（製造・下請け・店舗・商社等）や匿名事業でURL・創業者名が存在しなかろうが全く問題ない。**
> 形式的な項目の欠落を理由にした足切り・収集破棄は永久に禁止する。金儲けや大爆死の生々しい事実・手口（裏帳簿）があれば、柔軟に全て拾い上げよ。

| # | フィールド名 | 型 | 単位・形式 | 収集基準・柔軟性規定 |
|---|---|---|---|---|
| 1 | `id` | `string` | `ent_<name>_<hash>` | R2およびMake-Money内で一意のエンティティID [必須] |
| 2 | `ticker` | `string` | `AAA.BBB` | 4〜10文字のシンボル（例: `KEYENCE`, `GYM.SHRK`。なければIDから自動生成可） |
| 3 | `name` | `string` | 文字列 | 企業・サービス・事業・手口の正式名称 [必須] |
| 4 | `tagline` | `string` | 日本語1行 | サバンナOS直撃のタグライン（痛みの財布＋手口＋数字） [必須] |
| 5 | `sector` | `enum` | 7大カテゴリ | `'AI_AUTOMATION'` \| `'NICHE_SAAS'` \| `'MONOPOLY_MFG'` \| `'CONTENT_MEDIA'` \| `'PHYSICAL_ASSET'` \| `'FINTECH_INFRA'` \| `'LOCAL_SERVICES'`（大枠判定で可） |
| 6 | `scale` | `enum` | 4大区分 + 未確認 | `'SOLO'` \| `'SMALL_TEAM'` \| `'SCALEUP'` \| `'ENTERPRISE'` \| `'UNKNOWN'` |
| 7 | `founder` | `string` | 人名・組織名 | 創業者・仕掛け人名（**匿名・不明・組織名いずれも可**） |
| 8 | `country` | `string` | ISO 2文字 | 国コード（`JP`, `US`, `UK`, `IE` 等。不明なら `JP` または `GLOBAL`） |
| 9 | `url` | `string \| null` | URL | 公式サイトURL（**任意・なし可**。サイト消滅、非Web、下請け、オフライン等の場合は `null` または省略） |
| 10 | `temporal` | `object` | 年代・判定 | 創業年、初動期、観測期、賞味期限判定（取れる範囲で記録） |

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

収集・精錬を行うAIは、企業の性質に応じて以下のいずれかのフォーマットをそのまま出力せよ：

### 4.1 勝ち組企業（高収益・完全1人要塞型）テンプレート
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
    "moatDescription": "大手が真真似できない極限のシンプルさと、個人開発者ならではの超高速改善サイクル。",
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
```

### 4.2 地雷企業（大爆死・POST_MORTEM検死解剖型）テンプレート
```json
{
  "id": "ent_sample_failure_8829f01b",
  "ticker": "FAIL.BLEED",
  "name": "Sample Quibi/Fast Model",
  "legalEntity": "Sample Failure Corp.",
  "tagline": "「巨額資金で需要を捏造できる」という虚栄心に憑りつかれ、1,800億円を投下して半年で即死・全額焼失した資本主義の検死標本",
  "sector": "CONTENT_MEDIA",
  "scale": "ENTERPRISE",
  "founder": "Ex-Hollywood Mogul",
  "country": "US",
  "url": "https://samplefailure.com",
  "verifiedBadge": true,
  "architecturePattern": "巨額調達・過剰固定費・ユーザー不在",
  "pipelineStack": "独自スタジオ制作 × 専用アプリ × 巨額広告費",
  "targetPainWallet": "ハリウッド重鎮の虚栄心と、隙間時間に高品質動画を見たいという妄想ニーズ",
  "tags": ["大爆死", "POST_MORTEM", "資金炎上", "即死モデル"],
  "pnl": {
    "monthlyRevenue": 45000000,
    "cogs": 450000000,
    "grossProfit": -405000000,
    "grossMargin": -900.0,
    "operatingExpenses": {
      "serverAndApi": 50000000,
      "advertising": 600000000,
      "subcontracting": 200000000,
      "toolsAndSaaS": 10000000,
      "other": 300000000
    },
    "operatingProfit": -1565000000,
    "operatingMargin": -3477.7,
    "estimatedAnnualNetProfit": -18780000000,
    "financialStatus": "POST_MORTEM",
    "dataSnapshotPeriod": "サービス終了時（破綻検死報告）",
    "sourceDoc": "SEC届出書、ウォール・ストリート・ジャーナル検死報道",
    "estimationLogic": "月額$5プラン × 実質有料契約6万人 ＝ 月商4,500万円 に対し、コンテンツ制作・広告の月間燃焼費 約16億円"
  },
  "evidenceCards": [
    {
      "id": "ev_sample_fatal_bleed",
      "type": "FATAL_BLEED",
      "title": "死因出血検死解剖: 月間16億円のバーンレートとスクショ禁止による自滅",
      "badge": "死因解剖",
      "evidenceStatus": "VERIFIED",
      "punchline": "アプリ内のスクリーンショット共有を権利保護のために禁止したことで、SNSでのバイラルが完全停止。月間16億円の広告費を垂れ流して即死。",
      "details": [
        "【固定費の制御不能】: 1分あたり10万ドル以上のハリウッド級制作費を前払い契約でコミット。",
        "【ユーザー心理の完全誤認】: スマホユーザーが求めていたのは縦型短尺の『気軽な無料動画（TikTok）』であり、数分の映画もどきではなかった。",
        "【規約自爆】: スマホ完結を謳いながらテレビ出力（AirPlay）を制限し、パンデミック在宅需要を自ら逃走させた。"
      ],
      "metrics": [
        {"label": "投下資本", "value": "約1,800億円", "isHighlight": true},
        {"label": "生存期間", "value": "わずか6ヶ月", "isHighlight": true},
        {"label": "月間赤字", "value": "-15.6億円", "isHighlight": true}
      ]
    },
    {
      "id": "ev_sample_loot_blueprint_avoid",
      "type": "LOOT_BLUEPRINT",
      "title": "【地雷回避方程式】資本ゼロで需要を事前検証し、即死リスクを99.9%切除する配管",
      "badge": "地雷回避設計",
      "evidenceStatus": "VERIFIED",
      "punchline": "巨額の制作費を払う前に、既存のYouTube/TikTokでショート動画を無料公開し、完全視聴率が70%を超えた企画だけをプロダクト化する。",
      "details": [
        "Step 1: 自社アプリを作らず、既存プラットフォームでプロトタイプ動画をテスト投稿する。",
        "Step 2: 広告費を使わずにオーガニックで10万回再生されたテーマだけを抽出し、有料コミュニティ/コンテンツを組成する。",
        "Step 3: 固定費を月数万円のSaaS（Substack, Gumroad）に抑え、破滅確率を数学的ゼロに固定する。"
      ],
      "codeSnippet": "// 破滅回避・ゼロ固定費検証パイプライン\n1. 無料TikTokアカウントでショート動画を10本投稿（固定費¥0）\n2. バイラルした企画のURLからTypeformで事前メアド登録を回収\n3. 1,000人集まった時点でStripe決済リンクを発行して前金を回収"
    }
  ],
  "operations": {
    "teamSize": 250,
    "initialTeamSize": 200,
    "currentTeamSize": 0,
    "weeklyHours": 60,
    "initialCapitalRequired": 180000000000,
    "automationLevel": 10,
    "primaryChannels": ["スーパーボウル巨額テレビCM", "巨大ビルボード広告", "芸能人インフルエンサー買収"],
    "toolStack": [
      {"name": "独自カスタムCDN/アプリ基盤", "category": "インフラ", "monthlyCost": 45000000, "purpose": "専用DRM・縦横自動回転動画配信"},
      {"name": "大手代理店広告運用", "category": "マーケティング", "monthlyCost": 600000000, "purpose": "大衆向けテレビ・屋外広告"}
    ]
  },
  "strategy": {
    "blindspot": "【エゴと虚栄心が招いた死角】『ハリウッドの大物だから成功する』というハロー効果に投資家が眩惑され、エンドユーザーの『TikTokで十分』という冷酷な本能を完全無視。",
    "moatType": "UNKNOWN",
    "moatDescription": "堀は存在せず、巨額のキャッシュによる力技配布のみを試みて粉砕。",
    "incumbentDilemma": "YouTubeやTikTokが無料・UGCで無限のコンテンツを供給する中、有料・プロ制作のみで対抗しようとしたこと自体が構造的敗北。",
    "secretInsight": "ユーザーは『高品質な短尺動画』にお金を払わない。払うのは『自分の承認欲求』か『退屈の即時解消（無料）』だけである。",
    "initialTraction": [
      "ローンチ前に巨額調達のニュースで100万ダウンロードを記録",
      "無料体験期間終了後に有料転換率が8%未満へ急落",
      "半年で資金枯渇しサービス閉鎖・資産売却へ"
    ],
    "actionPlaybook": [
      "Step 1: 巨額調達を絶対に誇るな。固定費を月1万円以下に抑えろ",
      "Step 2: 自社プラットフォームを作るな。既存の巨大トラフィックに乗っかれ",
      "Step 3: スクリーンの共有やスクショを絶対に禁止するな。バイラルを自ら殺すな"
    ],
    "coldOutreachTemplate": "（※地雷事例のためコールド提案テンプレートは非推奨・自戒ログとして保持）"
  },
  "temporal": {
    "foundedYear": 2018,
    "initialTractionPeriod": "2020年春（巨額プロモーションによる強制DL）",
    "dataSnapshotPeriod": "2020年秋（破綻・サービス閉鎖）",
    "viabilityStatus": "HISTORICAL_WINDOW",
    "viabilityLabel": "時代限定・再現完全不能",
    "eraContext": "ストリーミング過熱期と、スマホ特化型プレミアム動画という幻想バブルの崩壊期",
    "currentViabilityAnalysis": "TikTok、YouTube Shorts、Reelsが無料短尺動画を支配した現在、短尺動画で有料サブスクを課金するモデルは完全即死する。"
  }
}
```

---

## 5. R2保存パイプライン（3層メダリオン受入れルール）

収集したデータは、以下の3層アーキテクチャ（`docs/architecture/STORAGE.md` 正本準拠）に従ってR2へ保存せよ：

1. **生原本（Layer 1: Bronze / Raw）**:
   - Web魚拓、PDF、スクレイピングHTML、一次資料 ➔ **`foundation-raw/blobs/sha256/<sha256_hash>`** へそのまま保存（Create-Only、上書き・削除禁止）。
2. **事実抽出・保存票（Layer 2: Silver / Lake）**:
   - 本仕様に従って生成した完全体JSON ➔ **`foundation-lake/journal-entry.v1/<id>.json`** へ保存（追記専用）。
3. **完成ビュー（Layer 3: Gold / Serving View）**:
   - 精錬されたDossier ➔ **`data/entities-index.json`**（ローカル台帳）へ登録、または **`datasets/ds.business.makemoney-dossiers.v1/<id>.json`** へ格納。
4. **【絶対不可侵境界】**:
   - **`universal/data-assets/financials/`（EDINET正本領域）には1文字たりとも書き込むな・触れるな。**

