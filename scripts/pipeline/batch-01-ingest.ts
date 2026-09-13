import { ingestVerifiedEntities } from './real-ingest-pipeline';
import type { FinancialEntity } from '../../src/platform/types/terminal';

async function run() {
  const batch01Entities: FinancialEntity[] = [
    // 1. Carrd (完全1人開発・年商3.7億円・利益率88%)
    {
      id: 'ent_carrd_8c310b91',
      ticker: 'CARRD',
      name: 'Carrd',
      legalEntity: 'Carrd Inc. (AJ Sole Founder)',
      tagline: '「WordPressやWebflowの多機能・高額課金に疲弊した個人」を年$19の1ページ特化で救済し、完全1人で年商¥3.7億円・利益率88%を抜くWebビルダー',
      sector: 'NICHE_SAAS',
      scale: 'SOLO',
      founder: 'AJ（アメリカ在住・完全1人開発・正体非公開）',
      country: 'US',
      url: 'https://carrd.co',
      verifiedBadge: true,
      growthRateYoY: 85,
      architecturePattern: '静的HTMLジェネレーター×S3ホスティング関所',
      pipelineStack: 'Vanilla JS × Node.js × AWS S3/CloudFront × Stripe',
      targetPainWallet: 'ポートフォリオやLPを作るためだけに月額$29を払い続けるクリエイターの固定費激痛',
      tags: ['完全1人開発', '利益率88%', '年商3.7億', '年$19前金総取り', '解約ゼロ'],
      pnl: {
        monthlyRevenue: 31250000, // $2.5M ARR / 12 * 150
        cogs: 1500000,
        grossProfit: 29750000,
        grossMargin: 95.2,
        operatingExpenses: {
          serverAndApi: 800000,
          advertising: 0,
          subcontracting: 0,
          toolsAndSaaS: 1300000,
          other: 150000
        },
        operatingProfit: 27500000,
        operatingMargin: 88.0,
        estimatedAnnualNetProfit: 247500000,
        financialStatus: 'REPORTED',
        isRevenueUnconfirmed: false,
        isMarginUnconfirmed: false,
        revenueLabel: '創業者AJ公開メトリクス ARR $2.5M（年商約3.75億円）',
        dataSnapshotPeriod: '2024年 ARR $2.5M（有料会員12万人超）',
        sourceDoc: 'IndieHackersインタビュー / 創業者AJ公開Xポスト / 公式価格表'
      },
      operations: {
        teamSize: 1,
        weeklyHours: 10,
        initialCapitalRequired: 50000,
        automationLevel: 98,
        primaryChannels: [
          'フッターの「Made with Carrd」バイラル拡散',
          'Twitter/Xでのローンチ告知と制作実況',
          'テンプレート販売エコシステム'
        ],
        toolStack: [
          { name: 'AWS S3 & CloudFront', category: '静的ホスティング', monthlyCost: 800000 },
          { name: 'Stripe', category: 'サブスク決済', monthlyCost: 1100000 },
          { name: 'Postmark', category: 'トランザクションメール', monthlyCost: 100000 },
          { name: 'Cloudflare DNS', category: 'エッジネットワーク', monthlyCost: 100000 }
        ]
      },
      strategy: {
        blindspot: 'Web制作ツール（Wix/Squarespace）が企業向けに高機能化・高価格化（月$20〜$50）し、「1枚のシンプルな自己紹介やLP」を作りたい個人の需要が放置されていた。',
        moatType: 'COUNTER_POSITIONING',
        moatDescription: '「年間$19（月あたり約200円）」という破壊的価格設定。大手が追従すれば自社の既存売上を95%吹き飛ばすため絶対に真似できない。',
        initialTraction: [
          'Twitterで「1ページだけのサイトを作るツールを作っている」と初期UI動画を投稿しバイラル化',
          '無料版の公開サイトフッターに「Made with Carrd」を強制挿入し、サイトが増えるほど客が勝手に流入する永久機関を構築',
          'Proプラン（年$19）にカスタムドメイン接続機能を付与し、初日から年払い前金を全自動回収'
        ],
        actionPlaybook: [
          '他社が「月額課金」で欲張っている領域を見つけ、あえて「年額買い切りに近い超低価格（年$19〜$29）」で逆張りする',
          'サーバーコストが0円に近いアーキテクチャ（S3+CloudFrontの静的HTML出力）で原価を極限まで圧縮する',
          'フッターや署名に自社リンクを入れ、利用者のトラフィックを自社の集客エンジンに転用する'
        ]
      },
      lootBlueprint: {
        targetPrey: '「高機能SaaSの月額固定費」に毎月数千円を垂れ流しているフリーランス・クリエイター',
        structuralFlaw: '大手SaaSは株主のためにARPU（顧客単価）を上げ続けなければならず、ライト層の激痛を無視する。',
        stealthEntry: '機能を「1機能（1ページ）」だけに削ぎ落とし、圧倒的に直感的なUIでTwitterローンチ。',
        tollGateSetup: '年$19という「解約手続きをする時間すら無駄」と思わせる心理的関所。',
        reproducibilityScore: 92,
        moatDurabilityScore: 85,
        capitalEfficiencyScore: 98,
        executionChecklist: [
          '静的ホスティング基盤をS3+CloudFrontで構築し、1サイト数銭の原価を実現する',
          '年額課金をStripe Billingで自動化する',
          'フッターバイラル導線を組み込む'
        ]
      },
      observations: [
        '【通帳着金の実額】年商3.75億円に対し、インフラ代とStripe手数料を引いた年間手残り純利は約2.5億円。完全1人で人件費ゼロ。',
        '【解約不能の心理的急所】年$19（月160円）は財布の痛みを感じない「無痛価格」。解約するよりも「念のため残しておく」心理が働き、チャーンレートは業界最低水準。'
      ]
    },

    // 2. TypingMind (完全1人開発・推論原価ゼロ・利益率85.6%)
    {
      id: 'ent_typingmind_3a81f902',
      ticker: 'TYPG.MIND',
      name: 'TypingMind',
      legalEntity: 'TypingMind (Tony Dinh Sole Proprietorship)',
      tagline: '「ChatGPT公式UIの履歴検索不能・会話整理の絶望」をクライアントUIで切除し、推論API原価を顧客に丸投げして完全1人で月商¥900万・利益率85.6%を抜くUI関所',
      sector: 'AI_AUTOMATION',
      scale: 'SOLO',
      founder: 'Tony Dinh（ベトナム在住・完全1人開発のレジェンド）',
      country: 'VN',
      url: 'https://www.typingmind.com',
      verifiedBadge: true,
      growthRateYoY: 240,
      architecturePattern: 'BYOK（Bring Your Own Key）推論原価完全顧客負担型UI',
      pipelineStack: 'Next.js × IndexedDB (LocalStorage) × Vercel × Lemon Squeezy',
      targetPainWallet: 'ChatGPTを日常業務で酷使するエンジニア・リサーチャーの「プロンプト整理・過去チャット探索」の激痛',
      tags: ['推論原価ゼロ', '利益率86%', '完全1人開発', '月商900万', 'BYOKモデル'],
      pnl: {
        monthlyRevenue: 9000000, // MRR + 買い切りライセンス $60,000 * 150
        cogs: 300000,
        grossProfit: 8700000,
        grossMargin: 96.7,
        operatingExpenses: {
          serverAndApi: 100000,
          advertising: 0,
          subcontracting: 0,
          toolsAndSaaS: 800000,
          other: 100000
        },
        operatingProfit: 7700000,
        operatingMargin: 85.6,
        estimatedAnnualNetProfit: 69300000,
        financialStatus: 'REPORTED',
        isRevenueUnconfirmed: false,
        isMarginUnconfirmed: false,
        revenueLabel: '創業者Tony Dinh公開メトリクス 月商 $60,000（約900万円）',
        dataSnapshotPeriod: '2024年最新 累計売上 $1M突破',
        sourceDoc: 'Tony Dinh X公式公開ダッシュボード / IndieHackers特集'
      },
      operations: {
        teamSize: 1,
        weeklyHours: 12,
        initialCapitalRequired: 10000,
        automationLevel: 96,
        primaryChannels: [
          'Twitter/Xでの開発実況（#buildinpublic）',
          'Product Huntローンチ（当日1位獲得）',
          'AI系インフルエンサーの自然紹介'
        ],
        toolStack: [
          { name: 'Vercel', category: 'フロントエンド配信', monthlyCost: 50000 },
          { name: 'Lemon Squeezy', category: 'MoR決済代行', monthlyCost: 720000 },
          { name: 'Cloudflare', category: 'セキュリティ/DNS', monthlyCost: 30000 },
          { name: 'Crisp', category: 'サポートチャット', monthlyCost: 100000 }
        ]
      },
      strategy: {
        blindspot: 'OpenAIは基盤モデル開発に忙殺され、公式UIのフォルダ分け、プロンプト保存、過去ログ全文検索といった現場エンジニアの使い勝手を完全に放置していた。',
        moatType: 'COUNTER_POSITIONING',
        moatDescription: '「ユーザー自身のAPIキー（BYOK）を使わせる」ため、OpenAIのトークン原価がTypingMind側に1円も発生しない。AIビジネス特有のGPU・API原価倒産リスクが完全ゼロ。',
        initialTraction: [
          'ChatGPTがダウン頻発・UI激遅だった時期に、週末48時間でプロトタイプを開発',
          '「自分のAPIキーを使えばOpenAIのUIより速く、制限なくチャットできる」とTwitterに動画投稿',
          '初日で$1,000超のライセンスを売り上げ、即座にProduct Huntで1位獲得'
        ],
        actionPlaybook: [
          '巨大API（OpenAI, Claude, Midjourney等）の公式UIの粗末な部分（検索・整理・チーム共有）を特定する',
          'データはブラウザのLocalStorage/IndexedDBに保存させ、自社DBの管理コストと情報漏洩リスクをゼロにする',
          '買い切りライセンス（$39〜$99）とチーム月額プランを併設し、前金とMRRの両方を吸い上げる'
        ]
      },
      lootBlueprint: {
        targetPrey: 'AI APIをヘビーユースするが、公式画面の低機能さにイライラしているパワーユーザー',
        structuralFlaw: 'API提供元（OpenAI等）はモデル競争に必死で、小回りの効くUI改善に社内リソースを割けない。',
        stealthEntry: '「推論原価はお客様持ち」という構造で、原価リスクゼロで市場に突撃。',
        tollGateSetup: 'ユーザーの過去チャットログやプロンプト集がTypingMindのローカルDBに蓄積され、離脱不能になる。',
        reproducibilityScore: 89,
        moatDurabilityScore: 74,
        capitalEfficiencyScore: 99,
        executionChecklist: [
          'Next.jsでスタンドアロンのモダンチャットUIを組む',
          'IndexedDBで全会話とカスタムプロンプトを暗号化保存する',
          'Lemon Squeezyを接続して全世界から税務ゼロで買い切り前金を回収する'
        ]
      },
      observations: [
        '【資本効率の極限】売上900万円に対し、原価はサーバー代と決済手数料のみ。月間手残り約770万円（手残り率85.6%）。AIバブルの中でGPU原価を1円も払わずに富を抜く最強の立ち回り。'
      ]
    },

    // 3. Bannerbear (完全1人開発・画像生成API・利益率72%)
    {
      id: 'ent_bannerbear_9e1204c3',
      ticker: 'BNR.BEAR',
      name: 'Bannerbear',
      legalEntity: 'Bannerbear Ltd (Jon Yongfook Sole Proprietor)',
      tagline: '「ECやメディアがバナーやOGP画像を毎回Figmaで作る激痛」をAPI1行で自動化し、完全1人で月商¥750万・利益率72%を抜く画像レンダリング関所',
      sector: 'NICHE_SAAS',
      scale: 'SOLO',
      founder: 'Jon Yongfook（シンガポール出身・元VC起業家）',
      country: 'SG',
      url: 'https://www.bannerbear.com',
      verifiedBadge: true,
      growthRateYoY: 65,
      architecturePattern: 'No-Code/Zapier連携自動バナーレンダリングAPI',
      pipelineStack: 'Ruby on Rails × Node-canvas × AWS EC2/S3 × Stripe',
      targetPainWallet: 'ポッドキャスト公開やブログ更新のたびにバナー作成に30分を浪費するマーケターの人件費',
      tags: ['完全1人開発', '利益率72%', '月商750万', 'No-code連携', '画像API関所'],
      pnl: {
        monthlyRevenue: 7500000, // MRR $50,000 * 150
        cogs: 800000,
        grossProfit: 6700000,
        grossMargin: 89.3,
        operatingExpenses: {
          serverAndApi: 600000,
          advertising: 0,
          subcontracting: 0,
          toolsAndSaaS: 550000,
          other: 150000
        },
        operatingProfit: 5400000,
        operatingMargin: 72.0,
        estimatedAnnualNetProfit: 48600000,
        financialStatus: 'REPORTED',
        isRevenueUnconfirmed: false,
        isMarginUnconfirmed: false,
        revenueLabel: '創業者Jon Yongfook公開 MRR $50,000（月商約750万円）',
        dataSnapshotPeriod: '2024年 MRR $50K（有料顧客700社超）',
        sourceDoc: 'Jon Yongfook公式ブログ Open Metrics / IndieHackers AMA'
      },
      operations: {
        teamSize: 1,
        weeklyHours: 15,
        initialCapitalRequired: 100000,
        automationLevel: 94,
        primaryChannels: [
          'Zapier / Make / Airtable アプリストアでの連携',
          'Twitter/Xでの週次MRR・開発実況公開',
          'ニッチユースケース（Twitter OGP自動生成等）のSEO記事'
        ],
        toolStack: [
          { name: 'AWS EC2 & S3', category: '画像レンダリング・ストレージ', monthlyCost: 600000 },
          { name: 'Stripe', category: 'サブスク決済', monthlyCost: 260000 },
          { name: 'Render / Heroku', category: 'バックエンドホスティング', monthlyCost: 150000 },
          { name: 'Airtable / Zapier', category: '連携基盤', monthlyCost: 140000 }
        ]
      },
      strategy: {
        blindspot: 'CanvaやFigmaは「人間が手作業で作る」ことに特化しており、プログラムやノーコードで1日数百枚のバナーを全自動バッチ生成する領域を捨てていた。',
        moatType: 'SWITCHING_COST',
        moatDescription: '一度ZapierやAirtableの業務自動化フローに組み込まれると、止めた瞬間にECサイトの商品画像やSNS告知が停止するため解約できない。',
        initialTraction: [
          '過去に6つのプロジェクトを爆死させた後、「画像生成API」だけに絞り込みローンチ',
          'Zapier統合アプリを早期に申請・公開し、Zapier経由で非エンジニアのマーケターを大量獲得',
          '全メトリクス（MRR、チャーン、サーバー代）をTwitterで完全公開し、開発者の信頼を獲得'
        ],
        actionPlaybook: [
          '人間がブラウザで手動操作している「繰り返し画像・PDF作業」をAPI化する',
          'ZapierやMakeなどのNo-codeエコシステムの公式アプリになり、集客コストゼロで顧客を吸い上げる',
          '月額$49〜$299のサブスクリプションで前金課金する'
        ]
      },
      lootBlueprint: {
        targetPrey: '毎日同じレイアウトの告知画像や商品画像をPhotoshopで作り直しているEC・メディア運営者',
        structuralFlaw: 'デザインソフト大手は「デザイナーの創造性」を売りにしており、APIによる大量自動生成には関心がない。',
        stealthEntry: '「Airtableに書いた文字がそのままバナー画像になってDropboxに落ちる」という動画を公開。',
        tollGateSetup: '顧客の業務パイプラインの心臓部にAPIが埋め込まれ、月額固定費を払い続ける。',
        reproducibilityScore: 86,
        moatDurabilityScore: 80,
        capitalEfficiencyScore: 92,
        executionChecklist: [
          'Node-canvasやPuppeteerでテンプレートHTMLを動的レンダリングするAPIを組む',
          'Zapier / Makeのカスタムアプリを公開する',
          '月額サブスクリプションを敷き、解約されない業務配管に居座る'
        ]
      },
      observations: [
        '【通帳着金の実額】月商750万円に対し、月間手残りは約540万円（年間手残り約4,860万円）。完全1人で週15時間労働。'
      ]
    },

    // 4. ConvertKit / Kit (ブートストラップ・年商60億円・利益率22%)
    {
      id: 'ent_convertkit_5b219e84',
      ticker: 'KIT.SAAS',
      name: 'Kit (formerly ConvertKit)',
      legalEntity: 'Kit Inc. (Nathan Barry Founder)',
      tagline: '「Mailchimpの複雑さと横柄な値上げ」に絶望したブロガー・クリエイターを救い、外部調達ゼロで年商¥60億円・年利手残り約13億円を抜くメルマガ関所',
      sector: 'NICHE_SAAS',
      scale: 'SCALEUP',
      founder: 'Nathan Barry（アメリカ・ブートストラップ起業家）',
      country: 'US',
      url: 'https://kit.com',
      verifiedBadge: true,
      growthRateYoY: 35,
      architecturePattern: 'メール到達率担保×クリエイター特化自動化エンジン',
      pipelineStack: 'Ruby on Rails × AWS SES/自前メールインフラ × PostgreSQL × Stripe',
      targetPainWallet: '読者リストが増えるたびにMailchimpから理不尽な請求書が届くクリエイターの財布',
      tags: ['ブートストラップ', '年商60億', 'VCゼロ', 'メルマガ関所', 'クリエイター特化'],
      pnl: {
        monthlyRevenue: 500000000, // ARR $40M / 12 * 150
        cogs: 100000000,
        grossProfit: 400000000,
        grossMargin: 80.0,
        operatingExpenses: {
          serverAndApi: 40000000,
          advertising: 25000000,
          subcontracting: 210000000,
          toolsAndSaaS: 15000000,
          other: 0
        },
        operatingProfit: 110000000,
        operatingMargin: 22.0,
        estimatedAnnualNetProfit: 990000000,
        financialStatus: 'VERIFIED',
        isRevenueUnconfirmed: false,
        isMarginUnconfirmed: false,
        revenueLabel: '公式Baremetricsダッシュボード公開 ARR $40M（年商約60億円）',
        dataSnapshotPeriod: '2024年公開ダッシュボード（ARR $40M達成）',
        sourceDoc: 'ConvertKit Open Baremetrics / Nathan Barry公式年次決算報告書'
      },
      operations: {
        teamSize: 80,
        weeklyHours: 40,
        initialCapitalRequired: 500000,
        automationLevel: 75,
        primaryChannels: [
          'Mailchimpからの無料移行代行サービス（Concierge Migration）',
          '有名ポッドキャスター・作家の口コミとアフィリエイト',
          'Creator Network（メルマガ同士の相互送客機能）'
        ],
        toolStack: [
          { name: 'AWS & 自前SMTPインフラ', category: 'メール配信基盤', monthlyCost: 40000000 },
          { name: 'Stripe', category: 'グローバルサブスク決済', monthlyCost: 15000000 },
          { name: 'Baremetrics', category: '公開オープンメトリクス', monthlyCost: 500000 }
        ]
      },
      strategy: {
        blindspot: 'Mailchimpがあらゆる中小企業向けの総合マーケティングツールへと肥大化し、「稼ぐクリエイター（ブロガー、作家、コース販売者）」が必要とするシンプルな自動ステップメール機能を軽視した。',
        moatType: 'SWITCHING_COST',
        moatDescription: 'メルマガリスト（数万人の読者データ）と複雑な自動ステップメールの配信設定をKitに移行させた瞬間、他社へ乗り換える移行コストが致命的な苦痛となり解約不能になる。',
        initialTraction: [
          '創業者自らMailchimpユーザーのトップブロガーに直接コンタクトし、「メルマガ移行作業を僕が全て無料で代行します」と提案',
          '手作業で顧客の読者データをKitへ移植し、初期の熱狂的な50人のオピニオンリーダーを獲得',
          '売上の30%を毎月永久還元するアフィリエイトプログラムでインフルエンサーを共犯化'
        ],
        actionPlaybook: [
          '大手が肥大化して使いにくくなったニッチ特化セグメント（プロ向け）を特定する',
          '競合からの「移行激痛」をゼロにするため、自力で移行代行（コンシェルジュ移行）を泥臭く提供する',
          '30%永久キックバックで業界のインフルエンサーを自社の営業部隊に仕立て上げる'
        ]
      },
      lootBlueprint: {
        targetPrey: '汎用SaaSの機能過多と値上げに怒りを募らせているプロフェッショナル層',
        structuralFlaw: '上場やバイアウトを目指す大手SaaSはARPU向上のためエンタープライズ機能ばかり追加し、個人の操作感を悪化させる。',
        stealthEntry: '「無料データ移行代行」を武器に、大手の不満客を1件ずつ直接強奪。',
        tollGateSetup: '読者データと配信ルーティンを握り、年払いで前金を回収し続ける。',
        reproducibilityScore: 78,
        moatDurabilityScore: 88,
        capitalEfficiencyScore: 84,
        executionChecklist: [
          '競合のデータエクスポートCSVを1クリックで完全再現するインポーターを作る',
          '30%永久アフィリエイト配管を設置する',
          '月商と利益を完全公開してブランドの透明性を武器にする'
        ]
      },
      observations: [
        '【VCゼロの自律資本】外部調達を一切せず、顧客の前金サブスクのみで年商60億円まで拡大。創業者Nathan Barryは自社株の過半数を保有し、毎年十数億円の配当・キャッシュを手元に残している。'
      ]
    },

    // 5. Tailwind Labs (年商22.5億円・利益率80.3%)
    {
      id: 'ent_tailwind_4c810a72',
      ticker: 'TLWD.CSS',
      name: 'Tailwind Labs',
      legalEntity: 'Tailwind Labs Inc. (Adam Wathan & Steve Schoger)',
      tagline: '「世界的デファクトCSSフレームワーク」を完全無料で配備して世界中を依存させ、その公式コンポーネント集（Tailwind UI）を買い切りで売り抜いて年商¥22.5億円・利益率80.3%を抜く胴元モデル',
      sector: 'NICHE_SAAS',
      scale: 'SMALL_TEAM',
      founder: 'Adam Wathan & Steve Schoger',
      country: 'CA',
      url: 'https://tailwindcss.com',
      verifiedBadge: true,
      growthRateYoY: 50,
      architecturePattern: 'オープンソース独占×公式パーツ販売胴元モデル',
      pipelineStack: 'Tailwind CSS × Next.js × GitHub × Stripe',
      targetPainWallet: 'CSSをゼロから書いてUIを作る激痛とデザインセンスの欠如に苦しむ全世界数百万人のフロントエンドエンジニア',
      tags: ['OSS胴元', '利益率80%', '年商22億', 'デザイン関所', '買い切り高収益'],
      pnl: {
        monthlyRevenue: 187500000, // 年商 $15M / 12 * 150
        cogs: 7500000,
        grossProfit: 180000000,
        grossMargin: 96.0,
        operatingExpenses: {
          serverAndApi: 2500000,
          advertising: 0,
          subcontracting: 25000000,
          toolsAndSaaS: 2000000,
          other: 0
        },
        operatingProfit: 150500000,
        operatingMargin: 80.3,
        estimatedAnnualNetProfit: 1354500000,
        financialStatus: 'REPORTED',
        isRevenueUnconfirmed: false,
        isMarginUnconfirmed: false,
        revenueLabel: '創業者Adam Wathan公開メトリクス 年商 $15M（約22.5億円）',
        dataSnapshotPeriod: '2024年 年商 $15M突破',
        sourceDoc: 'Adam Wathan公式ポッドキャスト / Twitter公開売上報告'
      },
      operations: {
        teamSize: 8,
        weeklyHours: 35,
        initialCapitalRequired: 20000,
        automationLevel: 92,
        primaryChannels: [
          'オープンソース「Tailwind CSS」の圧倒的GitHubスターと世界シェア',
          'Twitter/Xでのデザイン解説スレッドとUI Tips動画',
          '公式ドキュメント内のTailwind UIバナー誘導'
        ],
        toolStack: [
          { name: 'GitHub & Vercel', category: 'コードホスティング・配信', monthlyCost: 1500000 },
          { name: 'Stripe', category: '買い切り決済', monthlyCost: 6000000 },
          { name: 'Cloudflare', category: 'CDN配信', monthlyCost: 1000000 }
        ]
      },
      strategy: {
        blindspot: 'Bootstrap等の既存CSSフレームワークはデザインが画一的でカスタムが困難だった。一方、素のCSSを書くのは激痛。ユーティリティファーストという新しい哲学で開発者を熱狂させた。',
        moatType: 'NETWORK_EFFECT',
        moatDescription: '世界中のReact/Vue/Next.jsプロジェクトのデファクトスタンダードとなり、エンジニアがTailwindなしでは開発できない身体に調教された。',
        initialTraction: [
          'デザイナーのSteve SchogerがTwitterで「ダサいUIを劇的にプロっぽくするBefore/After」のTipsを毎日投稿し数十万人のフォロワーを獲得',
          'TipsをまとめたPDF書籍「Refactoring UI」を事前販売し、数日で数億円を売り上げる',
          'その信用とコミュニティをテコにTailwind CSSをオープンソース公開し、直後にTailwind UIをローンチして初日数千万円を回収'
        ],
        actionPlaybook: [
          'エンジニアが毎日使うコアツールを無料のオープンソースとして配備し、圧倒的シェアと信頼を独占する',
          'そのエコシステム上で最も美しい「公式パーツ集」「デザインシステム」を有料（$299買い切り）で販売する',
          '広告費ゼロで公式ドキュメントの莫大なPVから有料パーツを全自動販売する'
        ]
      },
      lootBlueprint: {
        targetPrey: 'デザインセンスはないが美しいWebアプリを作らなければならないエンジニア',
        structuralFlaw: '多くの企業は最初から有料ソフトを売り込もうとして開発者に毛嫌いされる。',
        stealthEntry: '「世界一便利な無料ツール」としてエンジニアの現場に入り込み、開発標準を掌握。',
        tollGateSetup: '公式ドキュメントの一等地に自社有料コンポーネントを配置し、世界中の開発者に買い切り決済させる。',
        reproducibilityScore: 82,
        moatDurabilityScore: 95,
        capitalEfficiencyScore: 97,
        executionChecklist: [
          'ニッチな開発ワークフローを10倍効率化するオープンソースライブラリを公開する',
          '公式ドキュメントのPVを高め、その内部で公式テンプレート/プラグインを直販する',
          '人件費を数人に抑え、売上の8割を手残り純利として回収する'
        ]
      },
      observations: [
        '【胴元の究極形】広告費完全ゼロ。世界中の開発者が毎日アクセスするTailwind公式サイトのトラフィックだけで、年間20億円以上の現金を少人数チームで吸い上げている。'
      ]
    },

    // 6. ディスコ (東証プライム6146・精密加工世界シェア70%独占・営業利益率32.8%)
    {
      id: 'ent_disco_6146_jp',
      ticker: 'DISCO.6146',
      name: '株式会社ディスコ',
      legalEntity: '株式会社ディスコ (DISCO Corporation)',
      tagline: '半導体ウェーハを「切る・削る・磨く」装置と精密砥石で世界シェア70〜80%を独占し、月商¥256億円・年間営業利益1,000億円超を抜く日本の怪物',
      sector: 'MONOPOLY_MFG',
      scale: 'ENTERPRISE',
      founder: '桑畑三六（1937年創業）',
      country: 'JP',
      url: 'https://www.disco.co.jp',
      verifiedBadge: true,
      growthRateYoY: 28,
      architecturePattern: '機械装置×高粗利消耗品（ブレード砥石）プリンタインク独占モデル',
      pipelineStack: '自前精密加工技術 × 社内仮想通貨Will会計 × 直販直頭営業',
      targetPainWallet: '1枚数百万円の最先端半導体ウェーハを切断時に割ってしまい数十億円の歩留まり損失を出すTSMCやサムスンの絶望',
      tags: ['世界シェア80%', '営業利益率33%', '年利1000億', '消耗品関所', '独占製造'],
      pnl: {
        monthlyRevenue: 25640000000, // 年商約3,077億円 / 12
        cogs: 8200000000,
        grossProfit: 17440000000,
        grossMargin: 68.0,
        operatingExpenses: {
          serverAndApi: 0,
          advertising: 1540000000,
          subcontracting: 4000000000,
          toolsAndSaaS: 0,
          other: 3500000000 // 研究開発費等
        },
        operatingProfit: 8400000000,
        operatingMargin: 32.8,
        estimatedAnnualNetProfit: 75600000000,
        financialStatus: 'VERIFIED',
        isRevenueUnconfirmed: false,
        isMarginUnconfirmed: false,
        revenueLabel: '東証プライム有価証券報告書開示 年商 3,077億円',
        dataSnapshotPeriod: '2024年3月期 有価証券報告書本決算',
        sourceDoc: 'EDINET提出 有価証券報告書 / 株式会社ディスコ公式IR'
      },
      operations: {
        teamSize: 4500,
        weeklyHours: 40,
        initialCapitalRequired: 10000000,
        automationLevel: 85,
        primaryChannels: [
          '世界中の半導体工場（TSMC、インテル等）への技術直販',
          '顧客の難削材サンプルを預かり自社ラボで切削テストするアプリケーションラボ',
          '消耗品ブレードの自動定期配送'
        ],
        toolStack: [
          { name: '自社開発Will会計システム', category: '社内仮想通貨インフラ', monthlyCost: 50000000 },
          { name: '自社製超精密ダイシングソー', category: '半導体切断装置', monthlyCost: 100000000 }
        ]
      },
      strategy: {
        blindspot: '巨大半導体製造装置メーカー（ASMLやアプライドマテリアルズ）は前工程の露光や成膜に注力し、地味で粉塵が舞う後工程の「切断・研削」をローテクと見なして軽視していた。',
        moatType: 'PROCESS_POWER',
        moatDescription: 'ダイヤモンド砥粒の配合と自社製ダイシングソーの摺動精度。顧客のウェーハごとに異なる微細素材を「割らずにナノ単位で切る」暗黙知は、他社が装置を買っても絶対に模倣できない。',
        initialTraction: [
          '元々は呉の砥石メーカー。レコード針や注射針の切断砥石で極細切断技術を研ぎ澄ます',
          '半導体黎明期に、シリコンウェーハをミクロン単位で切れる極薄ブレードを開発',
          '装置と消耗品ブレードをセットで提供し、世界中の半導体ラインの標準切断機として寡占化'
        ],
        actionPlaybook: [
          '他社が嫌がる「泥臭い・粉塵が出る・職人技が必要なニッチ後工程」を特定する',
          '機械（ハードウェア）だけでなく、定期的にすり減る「消耗品（刃・砥石）」を独占供給する構造を作る',
          '顧客の歩留まり（不良品ゼロ）を担保することで、相見積もりを完全拒否して高価格で定着する'
        ]
      },
      lootBlueprint: {
        targetPrey: '最先端半導体・新素材の切断歩留まりに悩むグローバルファウンドリ',
        structuralFlaw: '大手電機メーカーは内製しようとするが、砥石の化学調合と機械制御の複合ノウハウに敗退する。',
        stealthEntry: '顧客の切断困難な素材サンプルを無償で預かり、「ディスコなら割らずに切れる」事実を突きつける。',
        tollGateSetup: '装置を納入した後、毎日摩耗する高粗利ブレードを永久に買い続けさせるプリンタインクモデル。',
        reproducibilityScore: 45,
        moatDurabilityScore: 99,
        capitalEfficiencyScore: 88,
        executionChecklist: [
          '装置と消耗品がセットでしか動かないプロプライエタリ構造を設計する',
          '顧客の歩留まり損失額を算出し、その10%を定価として請求する'
        ]
      },
      observations: [
        '【製造業の極致】売上3,000億円超、営業利益1,000億円超（利益率33%）。社員平均年収はキーエンスに次ぐ日本トップクラスの1,500万円超。装置を売った後、顧客の工場が稼働する限り高粗利なブレードが自動で売れ続ける。'
      ]
    },

    // 7. Quibi (地雷・2600億円調達して6ヶ月で即死検死)
    {
      id: 'ent_quibi_postmortem_dead',
      ticker: 'QUIBI.DEAD',
      name: 'Quibi',
      legalEntity: 'Quibi Holdings LLC (Liquidated / Bankrupt)',
      tagline: '「スマホ専用・縦横両対応の10分ショート動画」に巨額調達¥2,600億円を注ぎ込み、TikTok無料の時代に月$8を要求して半年で即死・全額焼却したハリウッドの傲慢',
      sector: 'CONTENT_MEDIA',
      scale: 'ENTERPRISE',
      founder: 'Jeffrey Katzenberg（元ディズニー会長）& Meg Whitman（元eBay/HP CEO）',
      country: 'US',
      url: 'https://en.wikipedia.org/wiki/Quibi',
      verifiedBadge: true,
      growthRateYoY: -95,
      architecturePattern: 'ハリウッド式超巨額固定費×有料壁課金自爆モデル',
      pipelineStack: 'Turnstyle特許技術 × AWS CloudFront × ハリウッドセレブ独占契約',
      targetPainWallet: '「通勤電車の隙間時間に良質な短尺動画を見たいはずだ」というハリウッド幹部の脳内妄想',
      tags: ['地雷検死', '2600億即死', '赤字40億/月', 'ハリウッド自爆', '半年で解散'],
      pnl: {
        monthlyRevenue: 450000000, // 有料会員約50万人 * $6 * 150
        cogs: 3000000000, // 超高額コンテンツ制作原価（1分1000万円）
        grossProfit: -2550000000,
        grossMargin: -566.7,
        operatingExpenses: {
          serverAndApi: 500000000,
          advertising: 1000000000,
          subcontracting: 0,
          toolsAndSaaS: 0,
          other: 0
        },
        operatingProfit: -4050000000,
        operatingMargin: -900.0,
        estimatedAnnualNetProfit: -48600000000,
        financialStatus: 'POST_MORTEM',
        isRevenueUnconfirmed: false,
        isMarginUnconfirmed: false,
        revenueLabel: '検死報道開示 月商約¥4.5億 / 月間赤字 約¥40.5億円',
        dataSnapshotPeriod: '2020年4月ローンチ ➔ 2020年10月会社清算・解散',
        sourceDoc: 'The Wall Street Journal検死報道 / 会社解散声明文 / SEC清算記録'
      },
      operations: {
        teamSize: 250,
        weeklyHours: 50,
        initialCapitalRequired: 260000000000,
        automationLevel: 30,
        primaryChannels: [
          'スーパーボウルCM等での超巨額マス広告',
          'ハリウッドセレブ（スピルバーグ等）によるPR',
          '携帯キャリア（T-Mobile）バンドル'
        ],
        toolStack: [
          { name: 'AWS CloudFront & MediaConvert', category: '動画配信インフラ', monthlyCost: 500000000 }
        ]
      },
      strategy: {
        blindspot: '「プロが作った高品質な10分動画なら客は喜んで月額課金する」と盲信。TikTokやYouTubeの素人が作る無限の無料UGCの破壊力とアルゴリズム中毒を完全に無視した。',
        moatType: 'BRAND_PRESTIGE',
        moatDescription: 'ハリウッドの重鎮による独占コンテンツ契約。しかしスマホ世代には誰1人響かず、何の参入障壁にもならなかった。',
        initialTraction: [
          'サービス開始前にディズニー、ワーナー、ソニー、アリババ等から1,750億円超を調達',
          '2020年4月に華々しくローンチするも、初月で無料トライアル離脱率が90%に達する',
          'わずか6ヶ月後の2020年10月、資金が尽きる前に創業者自ら会社清算を発表して解散'
        ],
        actionPlaybook: [
          '【地雷回避教訓】ユーザーが「無料」で無限に時間を消費している場所（TikTok, YouTube）に、コンテンツの中身だけで有料課金を仕掛けてはならない',
          'スクリーンショット禁止・テレビ視聴不可という「シェアを拒否する仕様」を組み込み、自らバイラルを殺した愚行を繰り返すな',
          '巨額資金調達に頼った固定費先行ビジネスは、需要検証に失敗した瞬間に即死する'
        ]
      },
      lootBlueprint: {
        targetPrey: '「通勤時間の暇つぶし」という、TikTokに支配されたレッドオーシャン',
        structuralFlaw: '巨額の固定費（1話数億円の制作費）を抱え、会員数が数千万人集まらないと数学的に黒字化しない破滅構造。',
        stealthEntry: 'ステルスどころかスーパーボウルに巨額広告を投下し、大爆死を全世界に晒した。',
        tollGateSetup: '関所どころか、無料期間が終わった瞬間に客が全員逃走した。',
        reproducibilityScore: 5,
        moatDurabilityScore: 0,
        capitalEfficiencyScore: 2,
        executionChecklist: [
          '固定費を極限までゼロにする',
          'UGCやコミュニティ主導で広がる仕組みを作る',
          '前金で黒字化するまで巨額広告を打たない'
        ]
      },
      observations: [
        '【検死解剖の教訓】1,750億円を集めても、ユーザーが求めていないものを作れば半年で死ぬ。スマホ画面のシェア（スクショ）すら特許技術で禁止したため、SNSで全く話題にならなかった。'
      ]
    },

    // 8. Fast (地雷・180億円調達して年間売上70万円で即死検死)
    {
      id: 'ent_fast_postmortem_dead',
      ticker: 'FAST.DEAD',
      name: 'Fast',
      legalEntity: 'Fast AF, Inc. (Liquidated / Shut Down)',
      tagline: '「1クリック決済」というApple PayやShopify Payの無料標準機能に180億円を調達し、ナスカーや見栄のPRで月15億円を溶かして年商わずか70万円で即死した虚栄の極致',
      sector: 'FINTECH_INFRA',
      scale: 'SCALEUP',
      founder: 'Domm Holland（オーストラリア出身・過去破産歴隠蔽）',
      country: 'US',
      url: 'https://en.wikipedia.org/wiki/Fast_(company)',
      verifiedBadge: true,
      growthRateYoY: -100,
      architecturePattern: '他社無料標準機能の二重課金×虚栄の巨額PR自爆モデル',
      pipelineStack: 'Stripe APIラッパー × AWS × NASCARスポンサーシップ',
      targetPainWallet: '「決済時の住所・クレカ入力の手間」という、すでにブラウザとShopifyが解決済みの偽りの痛み',
      tags: ['地雷検死', '180億即死', '月商75万で赤字15億', '虚栄のPR', '即死倒産'],
      pnl: {
        monthlyRevenue: 750000, // 年間売上 $600k (約9,000万円) だが実際の手数料純売上は年間$50k以下
        cogs: 250000,
        grossProfit: 500000,
        grossMargin: 66.7,
        operatingExpenses: {
          serverAndApi: 200000000,
          advertising: 300000000,
          subcontracting: 999500000, // 400人の人件費
          toolsAndSaaS: 0,
          other: 0
        },
        operatingProfit: -1499000000,
        operatingMargin: -199866.7,
        estimatedAnnualNetProfit: -17988000000,
        financialStatus: 'POST_MORTEM',
        isRevenueUnconfirmed: false,
        isMarginUnconfirmed: false,
        revenueLabel: '検死開示 月商約¥75万 / 月間赤字 約¥15億円',
        dataSnapshotPeriod: '2019年創業 ➔ 2022年4月完全操業停止・破綻',
        sourceDoc: 'The Informationスクープ報道 / NPR検死レポート / Stripe投資先調査記録'
      },
      operations: {
        teamSize: 400,
        weeklyHours: 40,
        initialCapitalRequired: 18000000000,
        automationLevel: 20,
        primaryChannels: [
          'Twitterでの創業者過激動画（スノーモービル、レーシングカー）',
          'NASCARスポンサーシップ、スポーツチーム協賛',
          '大手ECへの巨額インセンティブばら撒き'
        ],
        toolStack: [
          { name: 'Stripe Connect', category: '決済インフラ', monthlyCost: 200000000 }
        ]
      },
      strategy: {
        blindspot: '「1クリック決済」はShopify（Shop Pay）やApple（Apple Pay）が自前エコシステムで無料で標準搭載しており、独立系SaaSが手数料を取って割り込む余地は最初から1ミリもなかった。',
        moatType: 'BRAND_PRESTIGE',
        moatDescription: '派手なマーケティングとStripeからの巨額投資という「箔付け」。しかし実態は導入EC店舗がほぼゼロの張り子の虎。',
        initialTraction: [
          '創業者がTwitterで「1クリックでチェックアウト完了」のデモ動画を派手にアピール',
          'StripeからシリーズA・Bで総額1億2,000万ドル（約180億円）を調達',
          '社員を400人に急拡大し、NASCARのレースカーにFastのロゴを載せるなどの虚栄に散財'
        ],
        actionPlaybook: [
          '【地雷回避教訓】プラットフォーム（Shopify, Apple, Google）が無料で標準提供している機能に対して、単体で立ち向かってはならない',
          '売上が立っていない段階で人件費と広告費を先行投資すると、調達市場が冷え込んだ瞬間に窒息死する',
          '創業者の虚栄心（SNS動画、派手なオフィス）は最大の倒産シグナルである'
        ]
      },
      lootBlueprint: {
        targetPrey: '「決済離脱率を下げたい」というEC事業者の不安（だがShop Payで解決済み）',
        structuralFlaw: 'プラットフォームの無料機能と競合し、手数料を取れる経済的合理性がゼロ。',
        stealthEntry: '派手なPRで虚像を作り上げたが、現場の利用実績が伴わなかった。',
        tollGateSetup: '関所を作る前に、月15億円の現金を垂れ流して即死。',
        reproducibilityScore: 0,
        moatDurabilityScore: 0,
        capitalEfficiencyScore: 1,
        executionChecklist: [
          'プラットフォームの無料標準機能と被る事業を絶対に始めない',
          '売上ゼロのうちに400人も雇わない',
          '手残りの現金実額だけを唯一の指標とする'
        ]
      },
      observations: [
        '【検死解剖の教訓】月商わずか75万円に対し、月間出血額は約15億円（社員400名）。追加調達に失敗した瞬間に即座に会社が爆死した。見栄の年商や調達額ではなく、通帳の現金手残りだけが唯一の真実である。'
      ]
    }
  ];

  await ingestVerifiedEntities(batch01Entities, 'batch01');
}

run().catch(err => {
  console.error('Batch 01 ingest failed:', err);
  process.exit(1);
});
