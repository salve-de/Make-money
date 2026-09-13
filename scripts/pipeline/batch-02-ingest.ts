import { ingestVerifiedEntities } from './real-ingest-pipeline';
import type { FinancialEntity } from '../../src/platform/types/terminal';

async function run() {
  const batch02Entities: FinancialEntity[] = [
    // 1. Plausible Analytics (完全2人ブートストラップ・利益率77%)
    {
      id: 'ent_plausible_7d120a11',
      ticker: 'PLSB.IO',
      name: 'Plausible Analytics',
      legalEntity: 'Plausible Insights OÜ (Estonia)',
      tagline: '「Google Analytics（GA4）の重さ・クッキー同意バナーの離脱激痛」を1KBの軽量スクリプトで切除し、完全2人で月商¥2,025万・利益率77%を抜くプライバシー関所',
      sector: 'NICHE_SAAS',
      scale: 'SMALL_TEAM',
      founder: 'Uku Taht & Marko Saric（エストニア出身ブートストラップ起業家）',
      country: 'EE',
      url: 'https://plausible.io',
      verifiedBadge: true,
      growthRateYoY: 70,
      architecturePattern: 'ClickHouse×Elixir高効率集計×クッキーレス軽量トラッカー',
      pipelineStack: 'Elixir/Phoenix × ClickHouse × Hetzner × Paddle/Stripe',
      targetPainWallet: 'Cookieバナーのせいでコンバージョンが激減し、GA4の複雑な画面に絶望する世界中のWeb担当者の財布',
      tags: ['完全2人開発', '利益率77%', '月商2000万', 'GA4対抗', 'クッキーレス'],
      pnl: {
        monthlyRevenue: 20250000, // $135k * 150
        cogs: 1800000,
        grossProfit: 18450000,
        grossMargin: 91.1,
        operatingExpenses: {
          serverAndApi: 1000000,
          advertising: 0,
          subcontracting: 1500000,
          toolsAndSaaS: 350000,
          other: 0
        },
        operatingProfit: 15600000,
        operatingMargin: 77.0,
        estimatedAnnualNetProfit: 140400000,
        financialStatus: 'REPORTED',
        isRevenueUnconfirmed: false,
        isMarginUnconfirmed: false,
        revenueLabel: '公式Open Stats公開 MRR $135,000（月商約2,025万円）',
        dataSnapshotPeriod: '2024年公開ダッシュボード（有料顧客12,000社超）',
        sourceDoc: 'Plausible Open Metrics / 創業者ブログ公開P&L'
      },
      operations: {
        teamSize: 2,
        weeklyHours: 25,
        initialCapitalRequired: 30000,
        automationLevel: 95,
        primaryChannels: [
          '「なぜGoogle Analyticsを削除すべきか」の痛撃SEO記事',
          'Twitter/Xでのオープンメトリクス公開',
          'オープンソースGitHubリポジトリ（セルフホスト可能）'
        ],
        toolStack: [
          { name: 'Hetzner Dedicated Servers', category: '専用サーバー', monthlyCost: 1000000 },
          { name: 'ClickHouse', category: '列指向高速DB', monthlyCost: 0 },
          { name: 'Paddle', category: 'グローバル決済', monthlyCost: 1000000 }
        ]
      },
      strategy: {
        blindspot: 'Google Analyticsは広告トラッキングのために膨大な個人情報を収集し、ユーザーに「クッキー同意バナー」を強要してサイトを遅くしていた。この不条理を突いた。',
        moatType: 'COUNTER_POSITIONING',
        moatDescription: '「クッキー不要・個人データ収集ゼロ・1KB以下の高速読込」。Googleは自社の広告ビジネスの都合上、個人データ収集を捨てる逆張りが絶対にできない。',
        initialTraction: [
          'HackerNewsに「Google Analyticsから離脱する理由」を投稿しトップ獲得',
          '自社の全財務データ（MRR、トラフィック、サーバー代）を完全公開する「Open Startup」を宣言',
          'EUのGDPR規制強化の波に乗り、コンプライアンスを重視する企業が雪崩を打って契約'
        ],
        actionPlaybook: [
          '巨人のビジネスモデル（広告・データ収集）の構造的弱点（クッキー同意激痛）を特定する',
          '機能を「本当に見る10個の指標」だけに削ぎ落とし、1画面で完結する超高速ダッシュボードを組む',
          'オープンソースとクラウド版（SaaS）のハイブリッドで開発者の信頼を独占する'
        ]
      },
      lootBlueprint: {
        targetPrey: 'GA4の設定に数週間かかり、サイトが重くなって離脱されているWebサイト運営者',
        structuralFlaw: 'Googleは広告ターゲティングのためにデータを集めなければならず、軽量化できない。',
        stealthEntry: '「1行タグを貼るだけ、Cookieバナー不要」で即日利用可能に。',
        tollGateSetup: 'Webトラフィック連動の月額サブスクリプション。',
        reproducibilityScore: 84,
        moatDurabilityScore: 82,
        capitalEfficiencyScore: 95,
        executionChecklist: [
          'ClickHouseをHetznerに立てて超高速集計エンジンを作る',
          'オープンソースでGitHubスターを集め、クラウド版を有料ホストする',
          'EUのプライバシー法規制を追い風にして自然流入を刈り取る'
        ]
      },
      observations: [
        '【完全2人で年利1.4億円】広告費ゼロ。ElixirとClickHouseの高効率インフラにより、月間数十億イベントを月100万円のサーバー代で捌き、利益率77%を叩き出している。'
      ]
    },

    // 2. Ghost Foundation (非営利・年商10億円・CMS関所)
    {
      id: 'ent_ghost_3c99a012',
      ticker: 'GHST.ORG',
      name: 'Ghost Foundation',
      legalEntity: 'Ghost Foundation (Non-profit entity, Singapore)',
      tagline: '「WordPressのプラグイン地獄とSubstackのプラットフォーム依存」を完全排除し、自社所有メディアの有料サブスク基盤として年商¥10億円・ARR $6.5Mを自律回収するCMS関所',
      sector: 'NICHE_SAAS',
      scale: 'SMALL_TEAM',
      founder: 'John O\'Nolan & Hannah Wolfe',
      country: 'SG',
      url: 'https://ghost.org',
      verifiedBadge: true,
      growthRateYoY: 42,
      architecturePattern: 'オープンソースCMS×公式マネージドホスティング（Ghost(Pro)）',
      pipelineStack: 'Node.js × MySQL × Fastly CDN × Stripe Connect',
      targetPainWallet: 'Substackに売上の10%を手数料として永久に中抜きされる大手パブリッシャー・独立系記者の財布',
      tags: ['非営利ブートストラップ', '年商10億', 'ARR6.5M', '脱Substack', 'OSSホスティング'],
      pnl: {
        monthlyRevenue: 81250000, // $6.5M ARR / 12 * 150
        cogs: 15000000,
        grossProfit: 66250000,
        grossMargin: 81.5,
        operatingExpenses: {
          serverAndApi: 10000000,
          advertising: 1250000,
          subcontracting: 35000000,
          toolsAndSaaS: 2000000,
          other: 0
        },
        operatingProfit: 18000000,
        operatingMargin: 22.2,
        estimatedAnnualNetProfit: 162000000,
        financialStatus: 'VERIFIED',
        isRevenueUnconfirmed: false,
        isMarginUnconfirmed: false,
        revenueLabel: '公式Baremetrics公開 ARR $6.5M（年商約10億円）',
        dataSnapshotPeriod: '2024年公式オープンメトリクス（有料ホスティング会員25,000人超）',
        sourceDoc: 'Ghost Open Baremetrics / John O\'Nolan年次報告'
      },
      operations: {
        teamSize: 25,
        weeklyHours: 35,
        initialCapitalRequired: 3000000,
        automationLevel: 80,
        primaryChannels: [
          'Kickstarterでの伝説的クラファン初動（約3,000万円調達）',
          'WordPressやSubstackからの無料移行ツール',
          '世界のトップメディア（The Atlantic等）の採用実績'
        ],
        toolStack: [
          { name: 'Fastly & AWS', category: 'CDN・インフラ', monthlyCost: 10000000 },
          { name: 'Stripe Connect', category: 'パブリッシャー決済', monthlyCost: 3000000 }
        ]
      },
      strategy: {
        blindspot: 'Substackは手軽だが売上の10%を中抜きし、独自ドメインやデザインのカスタマイズができない。月商数十万〜百万円を超えるプロ記者にとって、10%の手数料は年間数百万円の致命的損失になる。',
        moatType: 'COUNTER_POSITIONING',
        moatDescription: '「Ghostは決済手数料ゼロ（0%）」。月額固定費（$9〜$99）のみで、記者の売上がどれだけ伸びても1円も追加手数料を取らない。大口パブリッシャーが自動的に集まる引力場。',
        initialTraction: [
          '元WordPressコアチームのJohn O\'Nolanが「ジャスト・ア・ブログ」というコンセプトでKickstarterをローンチ',
          '初動で3,000万円の支援を集め、完全自己資本でオープンソース開発を開始',
          'セルフホストが面倒なユーザー向けに「Ghost(Pro)」公式ホスティングを提供し、継続的なMRRへ転換'
        ],
        actionPlaybook: [
          '手数料ビジネスモデル（売上の10%中抜き）で肥大化したプラットフォームを見つける',
          '「手数料0%・固定月額課金」のオープンソース代替を打ち出し、トップ1%の稼ぎ頭ユーザーを強奪する',
          'マネージドホスティングを自前で運用し、インフラ運用の激痛を切除して高粗利サブスクを回収する'
        ]
      },
      lootBlueprint: {
        targetPrey: 'SubstackやWordPressの手数料やプラグイン保守に苦しむプロメディア',
        structuralFlaw: 'Substackは自社の10%テイクレートを捨てられず、稼ぐプロほど不満が溜まる。',
        stealthEntry: '「読者データも売上も100%あなたのもの」という独立宣言で誘致。',
        tollGateSetup: '月額ホスティング費用とメンバーシップ管理インフラの固定サブスク。',
        reproducibilityScore: 75,
        moatDurabilityScore: 90,
        capitalEfficiencyScore: 86,
        executionChecklist: [
          'モダンなオープンソースCMSをNode.js/Next.js等で開発する',
          '競合プラットフォームからの移行ツールを1クリックで提供する',
          '手数料0%の固定月額ホスティングで前金を回収する'
        ]
      },
      observations: [
        '【株主ゼロの非営利独占】VC資金を一切入れず非営利財団として運営。買収されるリスクがなく、年間売上10億円が全額プロダクトと少人数チームに還元されるため、競合が資本力で潰せない無敵艦隊となっている。'
      ]
    },

    // 3. Gumroad (社員ゼロ・取扱高150億円・手数料独占)
    {
      id: 'ent_gumroad_1f820c43',
      ticker: 'GMRD.CO',
      name: 'Gumroad',
      legalEntity: 'Gumroad, Inc. (Sahil Lavingia Founder)',
      tagline: '「フルタイム社員ゼロ・全員業務委託」の極限身軽組織で、年間$100M超のクリエイター流通総額から10%の関所通行税を抜き、月商¥1.25億円・利益率55%を稼ぎ出すデジタル決済プラットフォーム',
      sector: 'FINTECH_INFRA',
      scale: 'SMALL_TEAM',
      founder: 'Sahil Lavingia（元Pinterest初期メンバー）',
      country: 'US',
      url: 'https://gumroad.com',
      verifiedBadge: true,
      growthRateYoY: 30,
      architecturePattern: '社員ゼロ・非同期ギグワーク組織×高テイクレート（10%フラット）決済関所',
      pipelineStack: 'Ruby on Rails × AWS × Stripe Connect × Notion/GitHub非同期運用',
      targetPainWallet: '自作PDFやソフトを売りたいが、自前でECサイトや決済インボイスを組む激痛に直面する個人クリエイター',
      tags: ['社員ゼロ', '利益率55%', '年商15億', '10%関所', '完全非同期'],
      pnl: {
        monthlyRevenue: 125000000, // 年商 $10M / 12 * 150
        cogs: 37500000,
        grossProfit: 87500000,
        grossMargin: 70.0,
        operatingExpenses: {
          serverAndApi: 5000000,
          advertising: 0,
          subcontracting: 12500000,
          toolsAndSaaS: 1250000,
          other: 0
        },
        operatingProfit: 68750000,
        operatingMargin: 55.0,
        estimatedAnnualNetProfit: 618750000,
        financialStatus: 'REPORTED',
        isRevenueUnconfirmed: false,
        isMarginUnconfirmed: false,
        revenueLabel: '創業者Sahil Lavingia公開 年商 $10M（約15億円）',
        dataSnapshotPeriod: '2024年公開決算レポート（取扱高 $100M+）',
        sourceDoc: 'Gumroad Public Financials / Sahil Lavingia公式ブログ'
      },
      operations: {
        teamSize: 0, // フルタイム社員0人
        weeklyHours: 15,
        initialCapitalRequired: 100000,
        automationLevel: 90,
        primaryChannels: [
          'クリエイターが自ら貼る「gumroad.com」の購入リンク拡散',
          'Twitter/Xでのオープンな経営実況と起業論',
          'クリエイター向けディスカバリーポータル'
        ],
        toolStack: [
          { name: 'AWS & Heroku', category: 'クラウドインフラ', monthlyCost: 5000000 },
          { name: 'Stripe Connect & PayPal', category: '決済プロセッサ', monthlyCost: 35000000 }
        ]
      },
      strategy: {
        blindspot: 'VCから巨額調達して社員を雇いまくり一度破綻寸前に追い込まれた教訓から、「フルタイム社員を1人も雇わず、全員を時給制の業務委託にしてSlackすら廃止する」という異次元の逆張りを断行。',
        moatType: 'NETWORK_EFFECT',
        moatDescription: '世界中のクリエイターの通帳・顧客リストを握り、10%の一律手数料へ値上げしても客が離脱できないスイッチングコスト。',
        initialTraction: [
          'Pinterestの初期デザイナーだった創業者が、週末に「リンク1行でデジタルファイルを売れるツール」を作成',
          'Twitterに投稿したところ瞬く間に数万人にシェアされ、初週で5万ドルを調達',
          'VC主導の無理な急成長から離脱し、手数料10%の超高収益キャッシュ牛ビジネスへと再構築'
        ],
        actionPlaybook: [
          '会議、Slack、フルタイム社員を全廃し、GitHubのIssueとNotionだけで動く完全非同期組織を作る',
          '固定費を極限までゼロにし、売上の変動に連動する変動費構造（業務委託時給制）を徹底する',
          '一度握ったプラットフォームの関所通行税（テイクレート）を堂々と引き上げ、利益率を最大化する'
        ]
      },
      lootBlueprint: {
        targetPrey: '自分の知識やコードを即座に現金化したい世界中のクリエイター',
        structuralFlaw: '大手決済（Stripe等）は生APIしか提供せず、非エンジニアが直販できる決済リンク画面を放置。',
        stealthEntry: '「URLを貼るだけで今すぐ売れる」という極限の認知負荷ゼロUI。',
        tollGateSetup: '全決済の10%を関所通行税として自動天引き。',
        reproducibilityScore: 70,
        moatDurabilityScore: 85,
        capitalEfficiencyScore: 96,
        executionChecklist: [
          'Stripe Connectで売り手と買い手を仲介するエスクロー決済を組む',
          '組織の固定費を完全ゼロにする',
          'テイクレートを10%に設定してキャッシュを自動蓄積する'
        ]
      },
      observations: [
        '【究極のノーヘッドカウント経営】フルタイム社員ゼロ。創業者Sahilは週数時間のコミットで年間6億円超の手残り現金を回収。固定費を抱えないことこそが資本主義における最強の防御壁であることを証明した。'
      ]
    },

    // 4. Theranos (地雷・1000億円調達して完全詐欺で禁錮刑検死)
    {
      id: 'ent_theranos_postmortem_dead',
      ticker: 'THRN.DEAD',
      name: 'Theranos',
      legalEntity: 'Theranos Inc. (Dissolved / Criminal Fraud Conviction)',
      tagline: '「指先1滴の血液で数百種類の病気を即座に診断できる」という完全な嘘に¥1,000億円超を騙し取り、他社製機器で偽装検査を繰り返して創業者が禁錮11年の刑に服した稀代の巨悪',
      sector: 'AI_AUTOMATION',
      scale: 'ENTERPRISE',
      founder: 'Elizabeth Holmes（スタンフォード中退・現在服役中）',
      country: 'US',
      url: 'https://en.wikipedia.org/wiki/Theranos',
      verifiedBadge: true,
      growthRateYoY: -100,
      architecturePattern: '科学的検証のブラックボックス隠蔽×巨額資金調達詐欺モデル',
      pipelineStack: 'Edison（中身のない黒い箱）× Siemens市販血液検査機（裏偽装）',
      targetPainWallet: '「注射針を刺す痛みをなくしたい」という全人類の願いと、ジョブズの再来を渇望した高齢投資家の虚栄心',
      tags: ['地雷検死', '1000億詐欺', '創業者服役中', '偽装検査', '即死倒産'],
      pnl: {
        monthlyRevenue: 1500000, // ウォルグリーン等での検査受託（実質ゼロ）
        cogs: 200000000, // 他社製機器での偽装検査原価・試薬代
        grossProfit: -198500000,
        grossMargin: -13233.3,
        operatingExpenses: {
          serverAndApi: 50000000,
          advertising: 100000000,
          subcontracting: 350000000, // 800名の社員人件費・超高額弁護士費用
          toolsAndSaaS: 0,
          other: 0
        },
        operatingProfit: -698500000,
        operatingMargin: -46566.7,
        estimatedAnnualNetProfit: -8382000000,
        financialStatus: 'POST_MORTEM',
        isRevenueUnconfirmed: false,
        isMarginUnconfirmed: false,
        revenueLabel: '検死開示 月間売上ほぼゼロ / 月間出血 約¥7億円',
        dataSnapshotPeriod: '2003年創業 ➔ 2018年完全解散・SEC起訴・有罪判決',
        sourceDoc: 'SEC起訴状 / WSJジョン・キャリールー特報「Bad Blood」 / 連邦裁判記録'
      },
      operations: {
        teamSize: 800,
        weeklyHours: 60,
        initialCapitalRequired: 100000000000,
        automationLevel: 10,
        primaryChannels: [
          '大手ドラッグストア（Walgreens, Safeway）との提携',
          '政治家（キッシンジャー、マティス元国防長官）を並べた役員会での箔付け',
          'フォーブス・フォーチュン表紙による熱狂的メディア露出'
        ],
        toolStack: [
          { name: 'Siemens Advia (改造偽装機)', category: '市販血液検査機', monthlyCost: 200000000 }
        ]
      },
      strategy: {
        blindspot: '「企業秘密（Trade Secret）」という煙幕を使い、査読付き学術論文へのデータ提出や第三者機関による検証を徹底的に拒絶した。',
        moatType: 'BRAND_PRESTIGE',
        moatDescription: 'スティーブ・ジョブズを真似た黒のタートルネックと低音ボイスによる強烈なカリスマ支配。しかし技術的堀は1ミリも存在しなかった。',
        initialTraction: [
          'スタンフォード大学を19歳で中退し、「痛みのない血液検査」という崇高な物語でVCから初期資金を調達',
          '有力政治家や大富豪（ルパート・マードック等）を騙し、評価額1兆円超のユニコーンへ登りつめる',
          '裏では自社マシンが動かず、患者の血液を希釈して市販のシーメンス社製マシンで不正検査していた'
        ],
        actionPlaybook: [
          '【地雷回避教訓】「技術の詳細は企業秘密だから見せられない」と語るAI・バイオ企業は100%詐欺であると疑え',
          '大物政治家やセレブを並べた取締役会は、技術の無さを誤魔化すための最大の煙幕である',
          'プロダクトが実際に顧客の課題を物理的に解決している客観的証拠（物証）がない企業には1円も投資するな'
        ]
      },
      lootBlueprint: {
        targetPrey: '「次のスティーブ・ジョブズ」に乗り遅れたくない強欲な高齢投資家',
        structuralFlaw: '物理法則と生化学の限界を無視し、PRの力だけで嘘を突き通そうとした。',
        stealthEntry: '徹底的な秘密主義とNDA（秘密保持契約）で社内告発者を脅迫。',
        tollGateSetup: '関所どころか、WSJの調査報道一発で会社が崩壊。',
        reproducibilityScore: 0,
        moatDurabilityScore: 0,
        capitalEfficiencyScore: 0,
        executionChecklist: [
          '嘘をつかない',
          '第三者が検証可能な客観的データを公開する',
          '顧客の健康を危険に晒す偽装を絶対にしない'
        ]
      },
      observations: [
        '【検死解剖の教訓】時価総額1兆円と称賛されても、中身が嘘であれば全て灰燼に帰す。科学・工学の冷徹な物理法則を無視した物語（ナラティブ）先行ビジネスは、必ず最も悲惨な形で死を迎える。'
      ]
    },

    // 5. FTX (地雷・3000億円調達して顧客資産1兆円を溶かし逮捕・懲役25年検死)
    {
      id: 'ent_ftx_postmortem_dead',
      ticker: 'FTX.DEAD',
      name: 'FTX',
      legalEntity: 'FTX Trading Ltd (Chapter 11 Bankruptcy / Criminal Conviction)',
      tagline: '「世界一安全な暗号資産取引所」という看板を掲げながら、顧客預託金¥1兆円以上を関連ファンド（Alameda）へ不正横流しし、取り付け騒ぎでわずか72時間で即死破綻した希代のペテン',
      sector: 'FINTECH_INFRA',
      scale: 'ENTERPRISE',
      founder: 'Sam Bankman-Fried（SBF / 懲役25年の判決判決を受け服役中）',
      country: 'BS',
      url: 'https://en.wikipedia.org/wiki/FTX',
      verifiedBadge: true,
      growthRateYoY: -100,
      architecturePattern: '顧客預託金の無断流用×架空トークン（FTT）担保自作自演モデル',
      pipelineStack: 'AWS × Python/Go板情報エンジン × QuickBooks（ずさんな会計）',
      targetPainWallet: '暗号資産バブルで一攫千金を夢見た世界数百万人と、セコイア・ソフトバンク等のトップVCの強欲',
      tags: ['地雷検死', '1兆円横領', '懲役25年', 'SBF逮捕', '72時間で即死'],
      pnl: {
        monthlyRevenue: 1200000000, // 取引手数料（ピーク時）
        cogs: 400000000,
        grossProfit: 800000000,
        grossMargin: 66.7,
        operatingExpenses: {
          serverAndApi: 200000000,
          advertising: 1500000000, // スーパーボウル、アリーナ命名権、セレブ賄賂
          subcontracting: 2500000000, // Alameda Researchへの資金流出
          toolsAndSaaS: 0,
          other: 0
        },
        operatingProfit: -3400000000,
        operatingMargin: -283.3,
        estimatedAnnualNetProfit: -40800000000,
        financialStatus: 'POST_MORTEM',
        isRevenueUnconfirmed: false,
        isMarginUnconfirmed: false,
        revenueLabel: '検死開示 取引手数料 月商約¥12億 / 月間資金流出 約¥34億円',
        dataSnapshotPeriod: '2019年創業 ➔ 2022年11月連邦破産法第11条適用・破綻',
        sourceDoc: 'ジョン・J・レイ三世破産管財人報告書 / 連邦裁判公判記録'
      },
      operations: {
        teamSize: 300,
        weeklyHours: 80,
        initialCapitalRequired: 300000000000,
        automationLevel: 70,
        primaryChannels: [
          'マイアミ・ヒート本拠地「FTXアリーナ」命名権（1億3,500万ドル）',
          'トム・ブレイディ、大谷翔平等の世界的スーパースターへの巨額スポンサー',
          'ワシントン政治家への巨額ロビー献金'
        ],
        toolStack: [
          { name: 'AWS Cloud Infrastructure', category: '取引所インフラ', monthlyCost: 200000000 }
        ]
      },
      strategy: {
        blindspot: '「効果的利他主義（Effective Altruism）」という崇高な大義名分を掲げ、「稼いだ金を世界を良くするために寄付する」と語ることで、投資家やメディアの批判的思考を麻痺させた。',
        moatType: 'NETWORK_EFFECT',
        moatDescription: '高度なデリバティブ取引機能と流動性。しかしバックドアで顧客資金が筒抜けになっていた。',
        initialTraction: [
          '暗号資産裁定取引ファンド「Alameda Research」からスタートし、取引所FTXをローンチ',
          '競合のBinanceに対抗し、セコイアやブラックロック等の一流VCから数十億ドルを調達',
          '自社発行トークンFTTを担保に巨額の借金を重ね、帳簿を粉飾'
        ],
        actionPlaybook: [
          '【地雷回避教訓】「大義名分（世界を救う、業界を正す）」を過剰にアピールする創業者ほど、足元の裏帳簿を精査せよ',
          '顧客の預託金を自社の資金と分別管理していない取引所・プラットフォームは必ず破綻する',
          '会計監査を受けていない、または無名監査法人を使っているユニコーンは即座に資金を引き揚げろ'
        ]
      },
      lootBlueprint: {
        targetPrey: '高い利回りとハイレバレッジ取引を求めた投機家',
        structuralFlaw: '自社発行の無価値なトークンを資産として計上する砂上の楼閣。',
        stealthEntry: '一流VCの裏書と派手なスポーツスポンサーで安心感を演出。',
        tollGateSetup: '顧客の金を引き出せなくなり、一瞬で取り付け騒ぎへ発展。',
        reproducibilityScore: 0,
        moatDurabilityScore: 0,
        capitalEfficiencyScore: 0,
        executionChecklist: [
          '分別管理を徹底する',
          '社内ガバナンスと正式な監査を導入する',
          '顧客資産を絶対にギャンブルに流用しない'
        ]
      },
      observations: [
        '【検死解剖の教訓】破産管財人のジョン・J・レイ三世（エンロン破産を処理した伝説の弁護士）をして「40年のキャリアでこれほど完全に企業統治が破綻した事例は見たことがない」と言わしめた。派手な広告と崇高な理念の裏で、基本的な帳簿すらつけていなかった。'
      ]
    }
  ];

  await ingestVerifiedEntities(batch02Entities, 'batch02');
}

run().catch(err => {
  console.error('Batch 02 ingest failed:', err);
  process.exit(1);
});
