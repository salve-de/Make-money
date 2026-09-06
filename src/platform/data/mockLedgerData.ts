import { FinancialEntity } from '../types/terminal';

export const INSTITUTIONAL_ENTITIES: FinancialEntity[] = [
  {
    id: 'ent_keyence',
    ticker: '6861.T',
    name: 'キーエンス (KEYENCE)',
    legalEntity: '株式会社キーエンス',
    tagline: '営業利益率54%超。代理店を完全排除した直販コンサルティング営業の絶対王者',
    sector: 'MONOPOLY_MFG',
    scale: 'ENTERPRISE',
    founder: '滝崎武光',
    country: 'JP',
    url: 'https://www.keyence.co.jp',
    verifiedBadge: true,
    growthRateYoY: 14.8,
    pnl: {
      monthlyRevenue: 80000000000, // 月商約800億円 (年商約9,600億円)
      cogs: 14400000000, // 売上原価 (粗利率約82%)
      grossProfit: 65600000000,
      grossMargin: 82.0,
      operatingExpenses: {
        serverAndApi: 800000000,
        advertising: 3200000000,
        subcontracting: 4800000000,
        toolsAndSaaS: 1600000000,
        other: 12000000000, // 人件費・高額賞与含む
      },
      operatingProfit: 43200000000, // 営業利益 (約54%)
      operatingMargin: 54.0,
      estimatedAnnualNetProfit: 360000000000, // 純利約3,600億円
    },
    operations: {
      teamSize: 10500,
      weeklyHours: 45,
      initialCapitalRequired: 500000000,
      automationLevel: 88,
      primaryChannels: ['直販ダイレクトセールス', 'Web技術資料請求 (ホワイトペーパーSEO)', '即日デモ機発送'],
      toolStack: [
        { name: '内製基幹ERP・SFA (分単位行動管理)', category: '基幹業務', monthlyCost: 15000000 },
        { name: 'AWS クラウドインフラ', category: 'インフラ', monthlyCost: 8000000 },
        { name: 'ファブレス生産委託管理システム', category: 'サプライチェーン', monthlyCost: 5000000 },
      ],
    },
    strategy: {
      blindspot: '【「1分間数千万円のライン停止損失」に震える製造業の恐怖を狙い撃ち】製造業の購買部は相見積もりを取る時間すら惜しむ。代理店を排除し「即日デモ機を持参して工場の歩留まり改善を現場検証する」直販体制により、原価率18%の汎用センサーを定価の5〜10倍の「保険料込み独占価格」で即断即決させる。',
      moatType: 'PROCESS_POWER',
      moatDescription: '【7万社の製造現場データ独占 ✕ 当日発送率99.9%の物理物流網】競合が同等精度のセンサーを作っても、全国の製造ラインを分単位で回り尽くす直販コンサル部隊と、注文即日必着の物流インフラを模倣できないため、現場は代替品を探すリスクを冒せない。',
      initialTraction: [
        '自動線材切断機の開発から着手し、工場の現場担当者に直接ヒアリングを反復',
        '代理店経由の販売を全廃し、自社営業が直接工場に入り込む直販体制を確立',
        '「当日発送」を徹底し、工場の製造ライン停止という最大の痛みをゼロにする絶対的信頼を構築',
      ],
      actionPlaybook: [
        'Step 1: 自ら製造ラインを持たず、企画・設計・直接販売に特化するファブレス体制を敷く',
        'Step 2: 顧客が気づいていない「現場の歩留まり損失（コスト）」を定量化する診断シートを作成',
        'Step 3: 競合が相見積もりを出す前に、即日デモ機を持ち込んで現場検証を完了させ即決させる',
      ],
      coldOutreachTemplate: '【貴社〇〇工場の歩留まり改善に関するご提案】突然のご連絡失礼いたします。同業他社様で月間〇〇時間のライン停止損失をゼロにした「非接触センサーによる事前検知モデル」の実機デモ機を、明日午前中にお持ちして30分でテスト可能です。費用は一切発生いたしません。',
    },
  },
  {
    id: 'ent_stripe',
    ticker: 'STRIPE',
    name: 'Stripe',
    legalEntity: 'Stripe, Inc.',
    tagline: 'インターネットの決済インフラ。7行のコードで世界中の金融機関と接続するテイクレート2.9%',
    sector: 'FINTECH_INFRA',
    scale: 'ENTERPRISE',
    founder: 'Patrick & John Collison',
    country: 'US',
    url: 'https://stripe.com',
    verifiedBadge: true,
    growthRateYoY: 28.5,
    pnl: {
      monthlyRevenue: 180000000000, // 月商約1,800億円 (年商約$14B相当)
      cogs: 126000000000, // インターチェンジ手数料・金融機関原価
      grossProfit: 54000000000,
      grossMargin: 30.0,
      operatingExpenses: {
        serverAndApi: 7200000000,
        advertising: 1800000000,
        subcontracting: 3600000000,
        toolsAndSaaS: 2500000000,
        other: 21000000000, // エンジニア人件費
      },
      operatingProfit: 17900000000,
      operatingMargin: 9.9,
      estimatedAnnualNetProfit: 150000000000,
    },
    operations: {
      teamSize: 8000,
      weeklyHours: 40,
      initialCapitalRequired: 20000000,
      automationLevel: 95,
      primaryChannels: ['開発者コミュニティ (ボトムアップ)', 'APIドキュメントSEO', 'エコシステム・プラットフォーム連携 (Shopify, Substack等)'],
      toolStack: [
        { name: 'AWS & グローバル金融プライベートネットワーク', category: 'インフラ', monthlyCost: 40000000 },
        { name: '機械学習不正検知エンジン (Radar)', category: 'セキュリティ', monthlyCost: 12000000 },
        { name: '内製APIゲートウェイ & Billing Engine', category: '金融コア', monthlyCost: 20000000 },
      ],
    },
    strategy: {
      blindspot: '【決済導入の決定権は「財務役員」ではなく「現場の20代エンジニア」が握っていた】大手金融機関がスーツを着て数週間の法人審査を行っていた裏で、「7行のコードをコピペして即日決済が動くAPI」を開発者に無償提供。経営陣が気づいた時にはすべてのプロダクト基盤にStripeが深く埋め込まれ、リプレイス不可能な状態を作った。',
      moatType: 'SWITCHING_COST',
      moatDescription: '【顧客企業の売上データベースと税務・サブスク課金ロジックの人質化】単なるカード決済にとどまらず、顧客の継続課金状態・自動請求・130カ国の売上税計算まで丸ごと依存させるため、他社へ乗り換えるには全システム停止と数ヶ月の開発リスクを伴い、CTOが自発的に解約を拒絶する。',
      initialTraction: [
        '「Collison Installation」: 開発者仲間と会ったその場で「ラップトップを貸してごらん」と言ってStripeのコードを組み込み即日動かした',
        'Y Combinatorの同期スタートアップへ片っ端から直接導入を依頼',
        '世界最高峰のAPIドキュメントを無償公開し、開発者の間でバイラルを起こした',
      ],
      actionPlaybook: [
        'Step 1: 既存の複雑な業界手続き（金融・法務・税務）をAPIとコード数行に圧縮する',
        'Step 2: 意思決定者ではなく、現場の実装者（開発者）に熱狂される無料ツール・ドキュメントを配る',
        'Step 3: 取引量に応じた従量課金（2.9% + 30¢）で、顧客の成長と自社の売上を完全に連動させる',
      ],
    },
  },
  {
    id: 'ent_photoai',
    ticker: 'PHOTOAI',
    name: 'Photo AI',
    legalEntity: 'Levels.io BV',
    tagline: '完全1人で月商1,800万円・純利益率84%。プロカメラマン不要のAIポートレート生成SaaS',
    sector: 'AI_AUTOMATION',
    scale: 'SOLO',
    founder: 'Pieter Levels (@levelsio)',
    country: 'NL',
    url: 'https://photoai.com',
    verifiedBadge: true,
    growthRateYoY: 185.0,
    pnl: {
      monthlyRevenue: 18000000, // 月商1,800万円
      cogs: 2160000, // GPU・推論API費用 (Replicate/RunPod)
      grossProfit: 15840000,
      grossMargin: 88.0,
      operatingExpenses: {
        serverAndApi: 350000,
        advertising: 0, // X(Twitter)でのビルドインパブリックのみ
        subcontracting: 0, // 完全1人開発
        toolsAndSaaS: 220000,
        other: 150000,
      },
      operatingProfit: 15120000, // 営業利益
      operatingMargin: 84.0,
      estimatedAnnualNetProfit: 181440000, // 年間手残り約1.8億円
    },
    operations: {
      teamSize: 1,
      weeklyHours: 12,
      initialCapitalRequired: 30000,
      automationLevel: 98,
      primaryChannels: ['X (旧Twitter) Build in Public', 'TikTok/Instagramでの生成結果バイラル', 'Organic SEO'],
      toolStack: [
        { name: 'Replicate API (Stable Diffusion/Flux推論)', category: 'AIインフラ', monthlyCost: 1800000 },
        { name: 'Hetzner Dedicated Server (Ubuntu+PHP+SQLite)', category: 'サーバー', monthlyCost: 15000 },
        { name: 'Stripe Payments', category: '決済', monthlyCost: 520000 },
        { name: 'Postmark (トランザクションメール)', category: 'メール配信', monthlyCost: 8000 },
      ],
    },
    strategy: {
      blindspot: '【写真館に行くのが恥ずかしい人間の「見栄とコンプレックス」の即時換金】写真スタジオでカメラマンにポーズを取らされる屈辱と数万円の出費を嫌う層に対し、「自撮り数枚をアップロードするだけで、スタジオ以上の美男美女ポートレートが1分で手に入る」免罪符を$29/月で売り抜け、原価数円のAPI呼び出しで利益率84%を抜き続ける。',
      moatType: 'COUNTER_POSITIONING',
      moatDescription: '【創業者のX数十万フォロワーによる「CAC（顧客獲得コスト）ゼロ」の価格破壊】大手が数千万円の広告費と開発費を投じる中、開発過程と売上スクショの投稿だけで毎日数千人の新規顧客が流入。広告費が永久に0円のため、競合が同じ機能を広告で集客しても赤字で自滅する。',
      initialTraction: [
        'Stable Diffusionがオープンソース化された週に、自作スクリプトでアバター生成を開始',
        'X上で自分の写真をAI化して投稿し、反響を見てStripe決済リンクを即日設置',
        '初期購入者50人のフィードバックを元に、翌週にはセルフアップロードUIを実装して自動化',
      ],
      actionPlaybook: [
        'Step 1: 新しいAI基盤モデルが出たら、専門技術を一般人の虚栄心・実利（証明写真、アイコン）に変換する',
        'Step 2: 余計なフレームワークを使わず、最速で動くミニマムなスタックで決済導線を置く',
        'Step 3: 開発プロセスと売上数字をSNSでリアルタイム公開し、勝手に広告される状態を作る',
      ],
      coldOutreachTemplate: '【ポートレート写真のアップデートについて】突然のご連絡失礼します。貴殿のLinkedInプロフィール写真について、スタジオ撮影なしで3分でハリウッド級のライティングに補正するAIパイプラインを作成しました。サンプルを3枚無償生成しましたのでご確認ください。',
    },
  },
  {
    id: 'ent_headshotpro',
    ticker: 'HEADSHOT',
    name: 'HeadshotPro',
    legalEntity: 'Postma Innovations B.V.',
    tagline: '完全1人体制で年商5.4億円。売上の30%をアフィリエイト還元する企業向けAI顔写真生成',
    sector: 'AI_AUTOMATION',
    scale: 'SOLO',
    founder: 'Danny Postma',
    country: 'NL',
    url: 'https://www.headshotpro.com',
    verifiedBadge: true,
    growthRateYoY: 120.0,
    pnl: {
      monthlyRevenue: 45000000, // 月商4,500万円 (年商約5.4億円)
      cogs: 9000000, // GPU学習・推論コスト (約20%)
      grossProfit: 36000000,
      grossMargin: 80.0,
      operatingExpenses: {
        serverAndApi: 600000,
        advertising: 13500000, // 売上の30%をアフィリエイターへ報酬還元
        subcontracting: 400000, // カスタマーサポート外注
        toolsAndSaaS: 500000,
        other: 200000,
      },
      operatingProfit: 20800000, // 営業利益
      operatingMargin: 46.2,
      estimatedAnnualNetProfit: 249600000, // 年間純利約2.5億円
    },
    operations: {
      teamSize: 1,
      weeklyHours: 15,
      initialCapitalRequired: 50000,
      automationLevel: 96,
      primaryChannels: ['高額成果報酬アフィリエイト網 (30% Lifetime)', 'プログラマティックSEO (地域×職種×顔写真)', 'B2Bチーム一括導入'],
      toolStack: [
        { name: 'RunPod / Replicate (カスタムLoRA学習)', category: 'GPU推論', monthlyCost: 8500000 },
        { name: 'Rewardful (アフィリエイトトラッキング)', category: '営業', monthlyCost: 150000 },
        { name: 'Vercel + Next.js', category: 'ホスティング', monthlyCost: 60000 },
      ],
    },
    strategy: {
      blindspot: '【リモート企業の人事が抱える「社員の顔写真がバラバラで見栄えが悪い」社内政治の歪み】世界中に散らばるリモート社員をスタジオに集めるのは物理的に不可能。個人なら$20で躊躇するAI顔写真を、「会社の統一ブランディング」という大義名分で経理に1チーム$500〜$2,000のコーポレートカード決済を瞬時に切らせる。',
      moatType: 'NETWORK_EFFECT',
      moatDescription: '【検索1位〜10位の比較記事を「30%永久キックバック」で完全カルテル化】「AI Headshot おすすめ」でヒットする有力アフィリエイター全員に売上の30%を生涯還元。競合が自前でSEO記事を書いても、すでに全アフィリエイターがHeadshotProを1位に推す経済的共犯関係が完成しており、検索流入を物理的に奪えない。',
      initialTraction: [
        'Redditのr/RemoteWorkやLinkedInで、チーム写真のバラつきに悩む人事マネージャーへ直接アプローチ',
        '最初の10社に無料でお試し導入させ、BEFORE/AFTERの許可を得て事例LPを作成',
        'Rewardfulを導入し、テック系インフルエンサーに個別DMで特別35%マージンを提示してレビューを依頼',
      ],
      actionPlaybook: [
        'Step 1: 個人向けで流行ったAI機能を「法人・人事向け（企業の統一道具）」へリパッケージする',
        'Step 2: 広告費を自前で溶かさず、業界最大級のアフィリエイト還元率を設定して軍隊に売らせる',
        'Step 3: チーム単位（10人〜100人）の一括決済プランを用意し、客単価を10倍に引き上げる',
      ],
    },
  },
  {
    id: 'ent_tldr',
    ticker: 'TLDR',
    name: 'TLDR Newsletter',
    legalEntity: 'TLDR, LLC',
    tagline: '完全1人創業で700万人読者・年商15億円。1日450万円の広告枠が即完売するテック日刊レター',
    sector: 'CONTENT_MEDIA',
    scale: 'SMALL_TEAM',
    founder: 'Dan Ni',
    country: 'US',
    url: 'https://tldr.tech',
    verifiedBadge: true,
    growthRateYoY: 65.0,
    pnl: {
      monthlyRevenue: 125000000, // 月商1億2,500万円 (年商約15億円)
      cogs: 2500000, // メール配信原価 (AWS SES)
      grossProfit: 122500000,
      grossMargin: 98.0,
      operatingExpenses: {
        serverAndApi: 500000,
        advertising: 20000000, // 読者獲得広告 (Meta/Google/X)
        subcontracting: 15000000, // キュレーター・エディター外注費
        toolsAndSaaS: 800000,
        other: 2200000,
      },
      operatingProfit: 84000000, // 営業利益
      operatingMargin: 67.2,
      estimatedAnnualNetProfit: 1008000000, // 年間純利益約10億円
    },
    operations: {
      teamSize: 6,
      weeklyHours: 20,
      initialCapitalRequired: 100000,
      automationLevel: 85,
      primaryChannels: ['Meta/X広告によるCAC $1.5〜$2での読者獲得', '既存読者の紹介プログラム', 'エンジニア界隈の口コミ'],
      toolStack: [
        { name: 'Amazon SES (独自バルクメール配信基盤)', category: 'メールインフラ', monthlyCost: 2200000 },
        { name: '内製CMS & 広告枠予約管理システム', category: '業務システム', monthlyCost: 300000 },
        { name: 'Stripe Invoicing', category: '決済', monthlyCost: 400000 },
      ],
    },
    strategy: {
      blindspot: '【エンジニア採用に年間数千万円を溶かすメガテック企業の「余剰採用・宣伝予算」の吸い上げ】忙しいエンジニアに長文を読ませるのを諦め、「朝の5分で読める箇条書き」で毎朝700万人のインボックスを占領。エンジニアにリーチできず苦しむAWSやDatadogに対し、1日450万円の広告枠を数ヶ月先まで先払いで買わせる。',
      moatType: 'SCALE_ECONOMIES',
      moatDescription: '【700万人リストによるAmazon SES送信ドメインの最高到達率と、先払いキャッシュフロー】新規参入者が数百万通のメールを一斉送信すると即座に迷惑メールフォルダに沈むが、数年かけて築いた高開封率（35%超）ドメインによりGmail/Outlookの受信箱を最優先通過。後発が物理的に真似できない配信インフラを確立。',
      initialTraction: [
        'Hacker NewsやRedditで毎日話題のリンクをピックアップし、個人的に要約メールを友人20人に配信',
        '初期読者が「これ便利だから登録しろ」と社内Slackでシェアし、自然増殖',
        '読者数が1万人に達した段階で、初期のスポンサーに手動DMで1枠$200で販売開始',
      ],
      actionPlaybook: [
        'Step 1: 購買力のある高属性層（エンジニア、医師、財務幹部）に特化した箇条書き要約を毎日配信する',
        'Step 2: 読者獲得コスト（CAC）と年間広告売上（LTV）のユニットエコノミクスを成立させ、有料広告で加速',
        'Step 3: サブジャンル（AI、WebDev、Crypto、Founders）へ横展開し、同一インフラで売上を多角化',
      ],
    },
  },
  {
    id: 'ent_easlo',
    ticker: 'EASLO',
    name: 'Easlo (Notion OS)',
    legalEntity: 'Easlo Studio',
    tagline: '20代の個人が完全1人で年商1.1億円・純利益率95%。Notionテンプレート販売の最高峰',
    sector: 'CONTENT_MEDIA',
    scale: 'SOLO',
    founder: 'Easlo',
    country: 'SG',
    url: 'https://easlo.co',
    verifiedBadge: true,
    growthRateYoY: 35.0,
    pnl: {
      monthlyRevenue: 9500000, // 月商950万円 (年商約1.1億円)
      cogs: 0, // 原価ゼロ
      grossProfit: 9500000,
      grossMargin: 100.0,
      operatingExpenses: {
        serverAndApi: 15000,
        advertising: 0, // X・YouTube・TikTokのオーガニックのみ
        subcontracting: 0,
        toolsAndSaaS: 80000, // Gumroad決済手数料等含む
        other: 35000,
      },
      operatingProfit: 9370000, // 営業利益
      operatingMargin: 98.6,
      estimatedAnnualNetProfit: 112440000, // 年間純利約1.1億円
    },
    operations: {
      teamSize: 1,
      weeklyHours: 8,
      initialCapitalRequired: 0,
      automationLevel: 99,
      primaryChannels: ['X(Twitter)でのミニマルな操作GIF動画投稿', 'Gumroad/Notion公式ディレクトリ', '無料テンプレート配布からのメールリード獲得'],
      toolStack: [
        { name: 'Notion', category: '制作基盤', monthlyCost: 3000 },
        { name: 'Gumroad & Lemon Squeezy', category: 'デジタル決済', monthlyCost: 65000 },
        { name: 'ConvertKit (メール配信)', category: 'マーケティング', monthlyCost: 12000 },
      ],
    },
    strategy: {
      blindspot: '【「生産性を上げたいが、仕組みを作るのは怠惰で無理」なナレッジワーカーの自己満足欲求】ゼロから設計する知的苦痛に耐えられないユーザーに、「インフルエンサーと同じ洗練された画面」を$49でワンクリック複製させる。「これを買えば自分も一流になれる」という幻想を、原価ゼロの複製リンクで年商1億円超に換金。',
      moatType: 'BRAND_PRESTIGE',
      moatDescription: '【Notion公式アンバサダー認定とSNSでの「ミニマル白黒GIF」視覚的占有】Notion公式からの推薦枠を押さえ、SNS上では無駄な文字を一切排した「白黒操作GIF」のフォーマットを業界標準として定着。機能面で模倣されても、「本家Easlo製」というステータスが購入決定打となり、模倣品を無料のゴミに落とし込む。',
      initialTraction: [
        '無料の「読書管理テンプレート」を作成し、Twitterで「RTした人にDMで送ります」という企画でフォロワー爆増',
        '無料配布メールリストをConvertKitに蓄積し、1万人を超えたタイミングで有料の「Second Brain OS」をローンチ',
        '初日で数百万円が売れ、その後は完全自動の不労所得ループへ突入',
      ],
      actionPlaybook: [
        'Step 1: 複雑で誰もが途方に暮れる高機能SaaS（Notion, Airtable, Figma等）の完成テンプレートを作る',
        'Step 2: 無料版をフックにSNSで拡散させ、メールアドレスを数十万人分蓄積する',
        'Step 3: 上位互換のオールインワンOSを有料化（$49〜$129）し、完全自動決済で手離れさせる',
      ],
    },
  },
  {
    id: 'ent_clay_aaa',
    ticker: 'CLAYAAA',
    name: 'Clay×AI アウトバウンド営業代行',
    legalEntity: 'Apex Outbound Partners',
    tagline: '少数3人で月商800万円・営業利益率65%。調達直後のSaaS企業に成果報酬でアポを流し込む',
    sector: 'AI_AUTOMATION',
    scale: 'SMALL_TEAM',
    founder: 'Alex R.',
    country: 'US',
    url: 'https://apexoutbound.example.com',
    verifiedBadge: true,
    growthRateYoY: 310.0,
    pnl: {
      monthlyRevenue: 8000000,
      cogs: 800000, // プロキシ・メールアカウント購入・スクレイピング原価
      grossProfit: 7200000,
      grossMargin: 90.0,
      operatingExpenses: {
        serverAndApi: 350000,
        advertising: 0,
        subcontracting: 1200000, // フィリピンのデータクレンジング作業員
        toolsAndSaaS: 450000,
        other: 0,
      },
      operatingProfit: 5200000,
      operatingMargin: 65.0,
      estimatedAnnualNetProfit: 62400000,
    },
    operations: {
      teamSize: 3,
      weeklyHours: 25,
      initialCapitalRequired: 200000,
      automationLevel: 92,
      primaryChannels: ['CrunchbaseのSeries A調達企業への自動検知DM', '成果報酬（アポ獲得1件5万円）でのノーリスク提案'],
      toolStack: [
        { name: 'Clay.com (データエンリッチメント & ウォーターフォール)', category: '営業データ', monthlyCost: 180000 },
        { name: 'Smartlead.ai (大量ドメインコールドメール自動送信)', category: '送信インフラ', monthlyCost: 80000 },
        { name: 'OpenAI GPT-4o API (超個別化メール文面自動生成)', category: 'AI生成', monthlyCost: 90000 },
      ],
    },
    strategy: {
      blindspot: '【VC調達SaaSの「CAC（顧客獲得単価）の金銭感覚麻痺」と採用遅延の焦りを狙い撃ち】自社営業マンを採用すると1人年商800万円＋育成に半年かかる。VCからの成長圧力に怯える経営陣に対し、「初期費用ゼロ・1アポ5万円の完全成果報酬」で提案。他人の調達マネーから月500万円以上の純利をリスクゼロで吸い上げる。',
      moatType: 'COUNTER_POSITIONING',
      moatDescription: '【送信ドメイン即死（スパム判定）を回避する分散配信網と、競合が持たない独自差分DB】文面生成自体は誰でも真似できるが、月5万通送信してもGmailに弾かれない「温め済み分散ドメイン100個のローテーション網」と「特定SaaSのTechStack独自スクレイピング差分」を占有。後発が真似するとドメインが一瞬でブラックリスト入りして自滅する。',
      initialTraction: [
        'Crunchbaseで先週調達を発表した企業をリストアップ',
        'CEOの直近のPodcast出演発言を文字起こしし、その発言に言及した超個別化メールをテスト送信（返信率18%）',
        '「最初の3アポは無料、満足したら1件5万円の成果報酬契約」で成約率90%を記録',
      ],
      actionPlaybook: [
        'Step 1: ClayとSmartleadを契約し、セカンダリドメイン50個を購入してSPF/DKIMを設定（ウォームアップ）',
        'Step 2: 資金調達直後で金が余っており売上を急拡大させたい企業を自動トリガーで検知する',
        'Step 3: 相手の痛みに直撃する提案をAIでパーソナライズし、アポ単価5〜8万円の成果報酬で固定契約を結ぶ',
      ],
      coldOutreachTemplate: '【貴社のSeries A調達と営業チーム拡大について】〇〇様、先日の調達おめでとうございます。急拡大フェーズで直面する「SDR採用コストと立ち上がり遅延」を回避するため、来月貴社のカレンダーに商談を15件流し込みます。アポが成立しなかった場合は費用ゼロです。水曜14時にお話し可能でしょうか？',
    },
  },
  {
    id: 'ent_local_wash',
    ticker: 'LOCALWASH',
    name: '地域特化・無店舗型 高圧洗浄DX',
    legalEntity: 'クラフトウォッシュ合同会社',
    tagline: '完全1人運営で月商450万円・純利益率55%。LINE自動見積もりと空き職人の完全外注化',
    sector: 'LOCAL_SERVICES',
    scale: 'SOLO',
    founder: '田中 健二',
    country: 'JP',
    url: 'https://craftwash-demo.jp',
    verifiedBadge: true,
    growthRateYoY: 95.0,
    pnl: {
      monthlyRevenue: 4500000,
      cogs: 0,
      grossProfit: 4500000,
      grossMargin: 100.0,
      operatingExpenses: {
        serverAndApi: 30000,
        advertising: 500000, // Googleローカル検索広告 (PPC)
        subcontracting: 1500000, // 提携の個人清掃職人へ日給払い
        toolsAndSaaS: 45000,
        other: 250000,
      },
      operatingProfit: 2175000,
      operatingMargin: 48.3,
      estimatedAnnualNetProfit: 26100000,
    },
    operations: {
      teamSize: 1,
      weeklyHours: 15,
      initialCapitalRequired: 150000,
      automationLevel: 90,
      primaryChannels: ['Googleビジネスプロフィール (MEO) 口コミ最適化', '地域限定リスティング広告', '戸建てポスティング'],
      toolStack: [
        { name: 'Lステップ (LINE公式アカウント自動見積もりボット)', category: '営業自動化', monthlyCost: 25000 },
        { name: 'Google Ads (地域キーワード「外壁 高圧洗浄」)', category: '集客', monthlyCost: 450000 },
        { name: 'クラウドサイン (施工同意書自動締結)', category: '法務', monthlyCost: 10000 },
      ],
    },
    strategy: {
      blindspot: '【高圧洗浄は「どこに頼んでも結果が同じ」なのに、相場を知らない家主がボッタクリを恐れて発注できない心理】悪質なリフォーム業者に怯える戸建てオーナーに、「LINEで壁の写真を送るだけで10秒確定・追加請求一切なし（一律8万円）」という安心感を提供。相見積もりを取らせる前に即日予約を確定させ、競合の介在余地を消滅させる。',
      moatType: 'CORNERED_RESOURCE',
      moatDescription: '【「施工完了当日の現金手渡し」による地域の一流フリー職人の囲い込みとMEO独占】元請け企業から数ヶ月後に買掛金で支払われることに不満を持つ個人職人に対し、「現場完了後、その場で3.5万円即時送金」で囲い込み。営業力ゼロの優秀な職人を囲い込みつつ、施工客にその場でGoogle高評価レビューを書かせるループで地域MEO1位を不可逆固定。',
      initialTraction: [
        'ジモティーとココナラで地域の個人清掃職人10名と面談し、「仕事を回すので日程を空けてほしい」と提携',
        '戸建ての密集地域に「外壁の黒ずみ、そのままにしておくと外壁塗装で300万円かかります」というチラシを投函',
        'LINE公式アカウントに誘導し、写真を送ってもらうだけで即座に自動概算見積もりを返信',
      ],
      actionPlaybook: [
        'Step 1: 自分で作業せず、地域で信頼できるフリーランス職人と施工単価・安全基準を取り決める',
        'Step 2: LINE公式アカウントに見積もりシミュレーターを構築し、Google MEOで地域1位を狙う',
        'Step 3: 現場写真を送ってもらって成約させ、差額マージン（40〜50%）を手残りとして自動回収する',
      ],
    },
  },
];
