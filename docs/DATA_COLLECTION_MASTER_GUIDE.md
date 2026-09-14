# 【最高正本】資本主義の裏帳簿：完全自律データ収集マスターガイド ＆ 歴代事故・フィードバック全集 (Data Collection Master Guide & Post-Mortem Ledger)

> **最高運用契約（ゼロプロンプト宣言）**:
> **ユーザーは長文のプロンプトや前提条件を絶対に書かない。**
> ユーザーが他AI（ChatGPT, Claude, Cursor, Antigravity等）に投げる指示は、以下の**「1行」**のみである：
> ```markdown
> GitHubの docs/DATA_COLLECTION_MASTER_GUIDE.md （または https://raw.githubusercontent.com/salve-de/Make-money/codex/reliability-boundaries/docs/DATA_COLLECTION_MASTER_GUIDE.md ）を読んで、資本主義の裏帳簿データを集めて。
> ```
> 本文書を読み込んだ全てのAIは、一切の追加質問・手戻り・過去のやらかしをゼロにして完全自律稼働せよ。
>
> **【最重要・重複絶対禁止条項（無駄足ゼロ契約）】**:
> 1. **収集済みリストの事前照合義務**:
>    - 調査を開始する前に、必ず最新の収集済み企業一覧 [docs/COLLECTED_ENTITIES.md](https://raw.githubusercontent.com/salve-de/Make-money/codex/reliability-boundaries/docs/COLLECTED_ENTITIES.md) （現在332社）を全件取得せよ。
>    - ここに掲載されている企業（およびその製品名・旧社名・グループ会社・直接の親会社・子会社）を再収集することは**「計算資源と人間の時間の完全な浪費・重大インシデント」**とする。
> 2. **エイリアス・製品名の衝突地雷の事前回避**:
>    - 「Basecamp ➔ 37signals」「Uniqlo ➔ Fast Retailing」「Instagram/WhatsApp ➔ Meta」「YouTube ➔ Alphabet」「ConvertKit ➔ Kit」「MicroAcquire ➔ Acquire.com」「Cursor ➔ Anysphere」「Wise ➔ Wise (TransferWise)」など、製品名や別名で既存企業と被るケースを必ず事前照合して排除せよ。
> 3. **機械的重複遮断（インジェスト即死）**:
>    - 収集されたデータはインジェスト時に `check-ingest-quality.mjs` により、ID重複・社名重複・Ticker重複・公式ドメイン重複が1件でもあると**1秒で物理的にreject（即時破棄）**される。重複の調査に費やした時間は全て無駄になるため、候補出しの時点で重複を100%排除せよ。

---

## Ⅰ. 何を集めるか（データ収集の北極星 ＆ 本質）

### 1. プロジェクトの北極星
> **「世に溢れる『努力・理念・綺麗事』という欺瞞の煙幕を完全に焼き払い、世界中の『生々しい金儲けの事実と手口（資本主義の裏帳簿）』を冷徹に白日の下に晒し続けることで、隷属と理不尽から抜け出そうと抗う全人類に『これを持たずに動くのは自殺行為だ』と確信させる【絶対の武器（資本主義のデフォルトOS）】となり、あらゆる事業・起業・投資が始まる『最初の起点（マネーの交差点）』として君臨し、その巨大な引力場（情報の関所）で全方位から富を抜き続けること。」**

### 2. 収集対象：資本主義における「富の不可逆な移転メカニズム（物理法則）」
綺麗事（努力・理念・顧客感動）を完全に剥ぎ取った後に残る、生々しい現金の配管ログを収集する：
1. **「弱点の力学」（なぜ金が動いたか）**:
   - 人間や組織が理性を失って財布を開かざるを得なかった急所（保身恐怖、極限の怠惰、虚栄心、解約不能の監禁、独占利権）。
2. **「配管の力学」（どうやって現金を吸い上げたか）**:
   - 労働から解放され、大手の自爆（カニバリズム障壁）、プラットフォーム規約の隙間、他人の欲望、前金総取りを燃料にして自動で現金を吸い上げた構造的レバレッジ（関所）。
3. **「現金の力学」（結果として通帳に何が起きたか）**:
   - 見栄の年商ではなく、原価・決済手数料・推論API代・インフラ・税を全て引いた後に「創業者個人の通帳に実際に残った現金実額（真の手残り）」、または幻想が崩壊して即死した「致死出血点」。

### 3. 周辺・隣接・裏の生態系5大重力場（企業単体に閉じるな）
1. **サプライヤー・黒子の原価構造**: どのAPI、どの下請け、どの物流網にいくら払っているか。
2. **法規制・許認可・プラットフォーム規約の隙間**: グレーゾーン、独占利権、参入障壁。
3. **顧客による異常な裏転用・二次流通**: 開発者が想定しなかった儲かる使われ方。
4. **競合の死線（カニバリズム障壁）**: 大手が構造上真似できない理由（真似すると自社の主力利益が吹き飛ぶジレンマ）。
5. **出資者・利権分配の力学**: 誰が本当の黒幕で、誰が利益を吸い上げているか。

### 4. 収集のポートフォリオ比率（攻守両輪）
- **勝ち組事例（約7〜8割）**: 構造的に利益と現金を抜き続ける勝者（`LOOT_BLUEPRINT` 必須）。
- **地雷検死事例（約2〜3割）**: 巨額調達即死、CAC高騰、規約変更死、固定費過多死（`financialStatus: "POST_MORTEM"`, `FATAL_BLEED` 必須）。
- ※ユーザーが「勝ちだけ」「地雷だけ」と指定した場合は 10:0 または 0:10 に即時自律分岐せよ。

---

## Ⅱ. 何を気をつけるか（鉄則 ＆ 思考のトラップ撲滅）

### 1. 収集項目と足切り条件の完全分離（ゼロ足切り原則）
- **収集項目**: 人数、粗利、原価、URL、創業者、ツール構成など、**必要なデータは当然すべて徹底調査して記録する**。
- **足切り条件（完全排除）**: **いかなる項目の有無や数値も【収集の足切り条件（フィルター）】には絶対にしない**。
- 粗利が10%でも90%でも、社員が1人でも1万人でも、URLがあっても無くても、金儲け・大爆死の事実があれば柔軟に全て拾い上げて記録せよ。

### 2. 「落ちてない・探してもないなら仕方ない原則」（捏造・ループの厳禁）
- ネット上に公開されていない一次情報（詳細なツール代内訳等）は、**「落ちていないのだから仕方がない」**。
- 無理に深追いして調査の手を止めたり、クローラーを無限ループさせて自爆することは厳禁。
- 業界相場・ビジネス構造から合理的に推計（`originType: "estimated"`）して堂々と埋め、前に進め。取れないものは `null` や `UNKNOWN` のままで誠実に受容せよ。

### 3. SaaSバイアスの完全根絶
- オフライン事業（スーパー、外食、製造、クリニック等）に `Stripe Billing` や `Vercel` などのSaaSツールを安易に設定する手抜きを永久に禁止する。
- POSレジ、受発注EDI、自社物流、卸問屋など、業界の物理法則に即したリアルな配管を記録せよ。

### 4. 略奪チェックリスト・関所表現の画一テンプレ禁止
- 全社が同じ3行（「LPを作る」「Stripeを繋ぐ」「広告を打つ」）になるような手抜きテンプレート流し込みを永久に禁止する。
- 業態（物販D2C、メディア、Fintech、受託、店舗）固有の略奪ステップと関所構造を記録せよ。

### 5. 抽象文章・水増しテンプレの完全排除
- 「価値あるサービスを提供し顧客満足度を高める」といった無味乾燥な優等生ポエムは1文字たりとも許されない。
- 「誰のどんな痛みの財布（保身・虚栄心・怠惰・恐怖）を突いていくら抜いているか」の生々しい客観事実のみを記録せよ。

---

## Ⅲ. 歴代重大事故・やらかし・フィードバック全集（地雷録：二度と繰り返すな）

過去に外部AI（ChatGPT, Claude等）が生成したデータにおいて発生し、外科的クレンジングを余儀なくされた重大インシデントの全記録である。**今後稼働するAIは、以下の地雷を1つでも踏んだら即座に失格とみなす。**

### 事故①：為替レート逆数掛けバグ（数倍〜数十倍の計算狂い）
- **発生事象**: TSMC（台湾セミコンダクター）の財務換算時、新台湾ドル（NTD/JPY = 4.71477）を誤って「割り算（1/4.71477掛け）」した。結果、本来年商約13.65兆円の世界的巨人を「年商約6,000億円」と出力し、規模を4倍以上縮小させて台帳を破壊した。
- **根本原因**: 外貨から日本円に換算する際、レートの掛け算と割り算の方向を取り違えた。
- **絶対防止策**: 外貨から日本円への換算は必ず**「現地通貨額 × 為替レート ＝ 日本円」**である。逆数で割るな。計算結果の桁数（兆円・億円）が常識的感覚と一致しているか必ず自己検算せよ。

### 事故②：タグラインのケタ・単位誤爆（100倍誤記）
- **発生事象**: PayPalのデータ生成時、P&L実額は年商4.96兆円（月商4,136億円）と正しく計算していたにもかかわらず、`tagline` 本文中で「年商497兆円を支配する決済関所」と100倍の誤記を出力した（日本の国家予算の4倍以上）。
- **根本原因**: 本文とP&Lオブジェクトを別々に思考し、単位（兆・億・万）の突合確認を怠った。
- **絶対防止策**: 本文・タグライン・P&Lの数値単位（億円・兆円）は必ず事前照合し、ケタの矛盾をゼロにせよ。

### 事故③：既存ID・名称・Tickerの衝突
- **発生事象**: 37signalsのTickerに `BASECAMP` を指定して既存別レコードと衝突。また、WeWorkにおいて既存の検死レコードと完全同一名称（`WeWork`）でインジェストしようとし、一意性制約エラーでCIが停止した。
- **根本原因**: カタログ全体でのキー一意性（`id`, `name`, `ticker`）の確認を怠った。
- **絶対防止策**: 同一企業で別切り口（例: 破綻前夜の検死版）を記録する場合は、`WeWork (2019破綻前夜検死)` のように名称・IDを明確に一意化せよ。

### 事故④：未公開（UNAVAILABLE）時の未確認フラグ欠落
- **発生事象**: Mailchimpや非公開ブートストラップ企業において、売上未開示（`financialStatus: "UNAVAILABLE"`）としているにもかかわらず、`isRevenueUnconfirmed: true`, `isMarginUnconfirmed: true` の明示フラグを落としてバリデーションを破壊した。
- **根本原因**: スキーマ上の契約（未開示時は未確認フラグが必須）を理解せず、数値を0にしただけで満足した。
- **絶対防止策**: 財務未公開時は `financialStatus: "UNAVAILABLE"` とし、`isRevenueUnconfirmed: true`, `isMarginUnconfirmed: true` を漏れなく付与せよ。

### 事故⑤：スキーマ型不足によるリント即死
- **発生事象**: `operations` オブジェクト内の `weeklyHours`, `initialCapitalRequired`, `automationLevel` や、`evidenceCards` 内の `evidenceStatus`（`REPORTED` / `POST_MORTEM`）、`observations`（文字列配列）と `observationsStream`（オブジェクト配列）の分離が漏れ、CIの型検査で一斉にエラーとなった。
- **根本原因**: 最新スキーマ（`docs/GOLDEN_INGEST_SCHEMA.md`）の型定義を部分的にしか参照しなかった。
- **絶対防止策**: `docs/GOLDEN_INGEST_SCHEMA.md` に定義された完全体JSONのキーと型を1文字の狂いもなく完全準拠せよ。

### 事故⑥：取れなかった情報へのモック捏造・固定文字列流し込み
- **発生事象**: スクレイピングやWeb調査で創業者やタイトルが取れなかった際、三項演算子のフォールバックで架空のモック文字列（"Screen Studio...", "Adam Pietrasiak" 等）を捏造流し込みした。
- **根本原因**: 欠損を恐れるあまり、AIが勝手に想像したデータを確定Factとして偽装した。
- **絶対防止策**: 取れなかったものは堂々と `UNKNOWN`、空配列、未判定にせよ。確定Factの偽装は最大の禁忌である。

### 事故⑦：社内造語・スラングの外部データ本文への混入
- **発生事象**: 「サバンナOS」「略奪配管」といった本プロジェクトの開発用メタ言語を、企業解説やタグラインの表文にそのまま書き込んでリント（`check-ingest-quality.mjs`）で弾かれた。
- **根本原因**: 開発者向けメタ概念と、エンドユーザーに届ける客観的ビジネス知性の境界を混同した。
- **絶対防止策**: データ本文は客観的・学術的・平易な日本語（「保身恐怖」「独占利権」「スイッチングコスト」「解約障壁」等）で記述せよ。

### 事故⑧：#01〜#04カード非表示・1行ポツン手抜き事故（essence欠落・証拠カード不足・見出し記号欠落）
- **発生事象**: 画面右側の「#01 要するに何屋か / 誰からお金をもらっているか / どんな悩みを解決しているか」が丸ごと非表示になり、上部証拠カードが2枚しか出ず、#02〜#04が太字見出しなしの1行ポツンとなって画面がスカスカになった。
- **根本原因**: 外部AIが `essence` を任意項目と誤認して空欄で出力し、証拠カード（`evidenceCards`）を2枚でサボり、`strategy`（盲点・堀・大手の弱点）に `【パンチライン見出し】` という見出し記号を付けずに短文1行で済ませた。
- **絶対防止策**:
  1. `essence`（whatIsIt, whoPays, solvedProblem）は3項目すべて40文字以上で完全記述せよ（空欄絶対禁止）。
  2. `evidenceCards` は最低3枚（#01 財務ウォーターフォール、#02 サバンナOS急所、#03 4マス重要指標グリッド）を完全配備せよ（2枚以下は即時リジェクト）。
  3. `strategy` の #02, #03, #04 は必ず `【パンチライン見出し】詳細な構造解説本文` の形式で記述せよ（【】がない単文1行はリジェクト対象）。

---

## Ⅳ. 完全体JSON出力フォーマット（最高正本）

各事例は、以下の完全体JSON構造で過不足なく出力せよ：

```json
{
  "id": "ent_linear_app",
  "ticker": "LINEAR",
  "name": "Linear",
  "legalEntity": "Linear Orbit, Inc.",
  "tagline": "Jiraの重厚長大な苦痛から逃げ惑う世界中のエンジニアの極限の怠惰を突き、月額$10/人でARR 100億円超・解約率ほぼゼロを支配する高速Issueトラッカー",
  "sector": "NICHE_SAAS",
  "scale": "SMALL_TEAM",
  "founder": "Karri Saarinen / Tuomas Artman",
  "country": "US",
  "url": "https://linear.app",
  "verifiedBadge": true,
  "growthRateYoY": 120,
  "architecturePattern": "Local-first sync architecture (Zero latency UI)",
  "pipelineStack": [
    "TypeScript", "React", "Node.js", "SQLite/IndexedDB (Client-side)", "Stripe Billing", "AWS"
  ],
  "targetPainWallet": "動作の遅いJiraに毎日1時間奪われるエンジニアの苛立ちと開発組織の生産性低下恐怖",
  "tags": ["DevTools", "IssueTracker", "LocalFirst", "HighGrossMargin", "B2BSaaS"],
  "pnl": {
    "monthlyRevenue": 830000000,
    "cogs": 41500000,
    "grossProfit": 788500000,
    "grossMargin": 95,
    "operatingExpenses": {
      "serverAndApi": 30000000,
      "advertising": 50000000,
      "subcontracting": 80000000,
      "toolsAndSaaS": 20000000,
      "other": 50000000
    },
    "operatingProfit": 558500000,
    "operatingMargin": 67,
    "estimatedAnnualNetProfit": 6700000000,
    "financialStatus": "REPORTED",
    "dataSnapshotPeriod": "2023〜2024年（ARR $60M+公表値ベース）",
    "sourceDoc": "TechCrunch / Forbes / Linear公式発表 / Karri Saarinenインタビュー",
    "estimationLogic": "課金シート数推計 × 単価($8〜$14/月) × ドル円(150円) ➔ 年商約100億円(月商約8.3億円)。少数精鋭(約50名)のため販管費極小で営業利益率65%超。",
    "isRevenueUnconfirmed": false,
    "originType": "reported",
    "isMarginUnconfirmed": false
  },
  "evidenceCards": [
    {
      "id": "ev_linear_traction",
      "title": "招待制口コミと熱狂的デザイナー・エンジニアコミュニティによるCACゼロ拡大",
      "summary": "広告費をほぼ使わず、Twitter(X)上でのキーボードショートカット動画と招待制バイラルで初期拡大を達成。",
      "sourceType": "INTERVIEW",
      "sourceUrl": "https://linear.app/about",
      "evidenceStatus": "REPORTED",
      "details": [
        "初期2年間は完全招待制で運用し、待機リストに数万人を並ばせることで希少価値を演出",
        "創業者自身が元Airbnb/Coinbaseのリードデザイナーであり、UI/UXの極限の美しさでバイラル誘発",
        "有料転換率が高く、導入した開発チームが他社へ転職した際にLinearを持ち込むオーガニックループ"
      ]
    }
  ],
  "observationsStream": [
    {
      "id": "obs_linear_01",
      "text": "Jiraという業界巨人が多機能化しすぎて極端に重くなった隙間を突き、キーボードだけで全操作が完了する爆速体験で切り崩した古典的アンバンドリングの教科書事例。"
    }
  ],
  "temporal": {
    "foundedYear": 2019,
    "initialTractionPeriod": "2019〜2020年（招待制フェーズ）",
    "dataSnapshotPeriod": "2023〜2024年",
    "eraContext": "リモートワーク普及と開発組織のスピード重視化。JiraのUI肥大化への怨嗟がピークに達したタイミング。",
    "viabilityStatus": "ACTIVE_PLAYBOOK",
    "currentViabilityAnalysis": "ローカルファーストUIと圧倒的デザイン品質は現在も強力な参入障壁。ただし競合クローンが急増中。",
    "timelineEvents": [
      { "year": "2019", "event": "元Airbnb/Coinbase幹部により創業、シード調達" },
      { "year": "2020", "event": "パブリックベータ公開、爆発的口コミで普及" },
      { "year": "2023", "event": "シリーズBでAccelより調達、ARR $60M突破" }
    ]
  },
  "operations": {
    "weeklyHours": 40,
    "isWeeklyHoursUnconfirmed": true,
    "initialCapitalRequired": 5000000,
    "isCapitalUnconfirmed": true,
    "automationLevel": 80,
    "isAutomationUnconfirmed": true
  },
  "strategy": {
    "moatType": "SWITCHING_COST",
    "networkEffect": "TEAM_COLLABORATION",
    "pricingPower": "HIGH",
    "substitutability": "HARD"
  },
  "observations": [
    "Jiraの肥大化・鈍重化に対するエンジニアの生理的嫌悪を突いた特化型アンバンドリング",
    "ローカルファースト同期によりオフラインでもミリ秒単位で動く圧倒的知覚品質",
    "デザイナーとエンジニアが自発的に他社へ布教するバイラルループ"
  ],
  "essence": {
    "coreMechanism": "ローカルファーストアーキテクチャによるゼロレイテンシーUIと、キーボード駆動の極限の作業効率化。",
    "unfairAdvantage": "元トップテック出身者による圧倒的デザイン完成度と、エンジニア心理を熟知した細部への偏執狂的こだわり。",
    "customerRetention": "全プロジェクトとタスクが蓄積され、ショートカットに身体が慣れることで他ツールへの移行が苦痛になる監禁構造。"
  },
  "lootBlueprint": {
    "blueprintId": "bp_linear_localfirst",
    "targetVulnerability": "業界大手が長年の機能追加でUIが重厚長大化し、現場の利用者が毎日イライラしながら使っている苦痛。",
    "cannibalizationBarrier": "大手はエンタープライズの複雑な権限管理やレガシー連携を捨てるわけにいかず、UIをシンプルに作り直せない。",
    "tollGateSetup": "最も利用頻度の高いコアワークフロー（Issue作成・移動）だけを切り出し、極限の爆速体験を提供してチーム単位で課金。",
    "executionChecklist": [
      "1. 既存巨大ツール（Jira、Salesforce等）で現場ユーザーが『重い・遅い』と怨嗟の声を上げている特定画面を特定する",
      "2. クライアント側DB（IndexedDB/SQLite）を活用し、ネット接続を待たずに即時画面が動くプロトタイプを作る",
      "3. 開発者コミュニティやXで操作GIF動画を投稿し、初期コアユーザーを招待制で囲い込む"
    ]
  },
  "publishability": "PUBLISHABLE",
  "claimBindings": []
}
```

---

## Ⅴ. 外部AIへの委託用・1行コピペ指示文

あなたが外部AI（ChatGPT, Claude, Cursor等）にデータを集めさせる際、以下の1行をそのまま投げれば、AIはこのドキュメントを直接参照して過去のミスをゼロにして自走する：

```markdown
GitHubの docs/DATA_COLLECTION_MASTER_GUIDE.md （https://raw.githubusercontent.com/salve-de/Make-money/codex/reliability-boundaries/docs/DATA_COLLECTION_MASTER_GUIDE.md ）に書かれている「資本主義の裏帳簿収集マスターガイド」を完全に熟読せよ。そこに記載された「収集済みリスト docs/COLLECTED_ENTITIES.md の332社との重複厳禁」および「過去の重大やらかし事故（為替逆数、100倍誤記、ID重複、未確認フラグ欠落、SaaS誤爆）」を絶対に繰り返さず、完全体JSONフォーマットで [業種/企業/件数] のデータを生成せよ。
```

---

## Ⅵ. 1億社スケール対応：収集段階での重複防止マスター台帳（Deduplication Registry）

### 1. 1億社収集における物理的課題と解決策
- **課題**: 全プロパティを含む台帳（`entities-index.json`）は1万社・1億社になると数十GB〜数TBに達し、外部AIや収集スクリプトが読み込めなくなる。
- **解決策**: 企業名（正規化）・Ticker・公式ドメインの3点のみを凝縮した**【超軽量・収集済みマスター台帳】（`data/collected-registry.json` および R2 Lake Manifest）**を常時同期。1社あたりわずか200バイト、10万社でも20MB、1億社でもBloom FilterやD1（SQLite B-Tree）により0.001秒で重複判定が可能。

### 2. 事前重複判定コマンド（収集前・候補選定時に叩け）
収集スクリプトや外部AI、人間は、調査を開始する前に以下のコマンドで被りを一瞬で判定できる：

```bash
# 1. 単一社名・ドメイン・エイリアス判定
pnpm dedup:check "Costco"
# ➔ {"status": "EXISTS", "reason": "社名が完全に一致します: [Costco Wholesale Corporation]"}

pnpm dedup:check "basecamp"
# ➔ {"status": "EXISTS", "reason": "エイリアス/製品名「basecamp」は既存の [37signals...] に該当します"}

# 2. 複数候補の一括判定（重複企業と新規安全企業を一瞬で自動仕分け）
pnpm dedup:check "Costco" "Stripe" "Notion" "架空の新規AI企業"

# 3. カンマ区切りリストの一括判定
pnpm dedup:check --list "Costco, Stripe, 新規企業A, 新規企業B"

# 4. 候補リストテキストファイルの一括判定
pnpm dedup:check --file candidate_companies.txt
```

### 3. 次回収集用プロンプトの自動生成
現在の収集済み企業（332社）を全件除外ブラックリストとして埋め込み、手薄なセクターを優先指示するプロンプトを一撃で生成する：
```bash
pnpm prompt:collect
# ➔ data/next-collection-prompt.txt に一発生成
```

### 4. インジェスト時の機械的重複拒絶ガードレール（Mechanical Ingest Blocker）
万が一、重複企業がデータに含まれていた場合、CIおよびコミット前の `pnpm lint`（`scripts/architecture/check-ingest-quality.mjs`）が物理的に検知し、ID重複・社名重複・Ticker重複・ドメイン重複を**1秒で完全reject（即時破棄）**する。これにより、マスター台帳の多重登録・汚染は永久にゼロに保たれる。

### 5. マスター台帳の自動同期
新規データをインジェストした後は、以下のコマンドで超軽量レジストリ、R2 Manifest、および人間・外部AI用一覧リストへ即時反映される：
```bash
pnpm registry:sync
```

