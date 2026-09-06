import { BusinessItem } from '@/types/business';

export const BUSINESS_DATA: BusinessItem[] = [
  {
    id: 'biz-001',
    slug: 'photo-ai-levels',
    title: 'Photo AI（写真生成スタジオ）',
    tagline: '完全1人・古典的PHPのみで月商3,800万円を稼ぐ人工知能写真スタジオ',
    founderName: 'ピーター・レベルズ',
    founderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    founderBio: '完全一人で年間五十億円規模のウェブ事業群を運営する世界最強のソロプレナー。社員ゼロ、外部出資ゼロ。',
    monthlyRevenueJpy: 38000000,
    monthlyProfitJpy: 32000000,
    profitMarginPercent: 84.2,
    initialInvestmentJpy: 0,
    monthsToProfitability: 1,
    teamSize: 1,
    weeklyHoursSpent: 6,
    businessModel: '継続課金型ツール',
    targetMarket: '個人向け',
    primaryAcquisitionChannel: '短文投稿網',
    skillRequired: '基本開発',
    automationLevel: '自律稼働型',
    isVerified: true,
    isForSale: false,
    summary: '利用者が自分の日常写真を数枚アップロードするだけで、プロカメラマンが撮影したようなスタジオ品質の宣材写真を大量自動生成するサービス。高額な撮影スタジオやカメラマン費用を削減したい層に爆発的ヒット。',
    financialBreakdown: {
      grossRevenue: 38000000,
      serverAndApiCost: 4500000,
      advertisingCost: 0,
      outsourcingCost: 1500000,
      netProfit: 32000000,
      profitMarginPercent: 84.2
    },
    tools: [
      {
        name: 'Vultr GPUクラウド',
        category: '計算基盤',
        purpose: '画像生成モデルの推論実行サーバー',
        monthlyCostJpy: 3500000,
        officialUrl: 'https://www.vultr.com'
      },
      {
        name: 'Stripe決済窓口',
        category: '決済',
        purpose: '世界百五十カ国からの月額自動引き落とし',
        monthlyCostJpy: 1140000,
        officialUrl: 'https://stripe.com'
      },
      {
        name: 'Cloudflare',
        category: '高速配信・防御',
        purpose: '大量画像のキャッシュ配信とDDoS攻撃防御',
        monthlyCostJpy: 30000,
        officialUrl: 'https://cloudflare.com'
      }
    ],
    first100UsersStrategy: '自らの短文投稿アカウント（フォロワー数十万人）で、開発中の生画面と生成ビフォーアフター画像を毎日投稿。「今すぐ試したい人はリプライ」と呼びかけ、手動でベータ版URLを送付して初日百人を即日獲得。広告費は完全ゼロ。',
    reproducibilityPlaybook: [
      {
        step: 1,
        title: '画像生成オープンソースのローカル検証',
        description: 'Flux等のオープンモデルをクラウドGPU上で動かし、実用的な人物再現ができる設定値を特定する。'
      },
      {
        step: 2,
        title: '超最小限の会員画面構築',
        description: '凝ったデザインは作らず、決済窓口（Stripe）と画像アップロード枠だけの画面を24時間以内に公開する。'
      },
      {
        step: 3,
        title: '短文投稿での制作過程全公開（Build in Public）',
        description: '「今日この機能を作った」「売上が10万円を超えた」など数字と画面を毎日発信して拡散の波を作る。'
      },
      {
        step: 4,
        title: '月額プランへの自動誘導',
        description: '単発課金から「月20枚生成・月額3,980円」の継続サブスクリプションへ完全移行し、固定給を固める。'
      }
    ],
    proSecretInsight: '【特別会員限定・解錠済】最大の参入障壁は画像品質ではなく「生成待ち時間の離脱防止」。ピーター氏は生成中に画面上に「撮影スタジオのメイキング風アニメーション」を表示させることで、待機中の解約率を65%低減させた。また、GPUサーバーは常時稼働させず、キュー滞留数に応じて自動で増減させる独自スクリプトにより月間300万円のコスト削減に成功している。',
    featured: true,
    publishedAt: '2026-08-15'
  },
  {
    id: 'biz-002',
    slug: 'headshotpro-postma',
    title: 'HeadshotPro（仕事用顔写真AI）',
    tagline: '社員ゼロで年商5.4億円。売上30%還元の無人営業軍団で世界を獲ったAIサービス',
    founderName: 'ダニー・ポストマ',
    founderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    founderBio: 'デザインとSEOの達人。複数のAI小規模ビジネスを立ち上げ、わずか1年で年商数億円を突破したソロ開発者。',
    monthlyRevenueJpy: 45000000,
    monthlyProfitJpy: 35100000,
    profitMarginPercent: 78.0,
    initialInvestmentJpy: 50000,
    monthsToProfitability: 1,
    teamSize: 1,
    weeklyHoursSpent: 8,
    businessModel: '継続課金型ツール',
    targetMarket: '法人向け',
    primaryAcquisitionChannel: '検索自動集客',
    skillRequired: '基本開発',
    automationLevel: '自律稼働型',
    isVerified: true,
    isForSale: false,
    summary: 'リモートワーク企業の社員証やLinkedInアイコン用の顔写真を、全員スタジオに行かせることなく統一した高品質フォーマットで生成するB2B特化AIツール。大企業の導入が相次ぐ。',
    financialBreakdown: {
      grossRevenue: 45000000,
      serverAndApiCost: 4800000,
      advertisingCost: 2100000,
      outsourcingCost: 3000000,
      netProfit: 35100000,
      profitMarginPercent: 78.0
    },
    tools: [
      {
        name: 'Next.js + Vercel',
        category: 'フロント基盤',
        purpose: '世界最高速の画面描画とグローバル配信',
        monthlyCostJpy: 150000,
        officialUrl: 'https://vercel.com'
      },
      {
        name: 'Replicate API',
        category: 'AI画像モデル',
        purpose: 'Stable Diffusion / Fluxのクラウド推論',
        monthlyCostJpy: 3800000,
        officialUrl: 'https://replicate.com'
      },
      {
        name: 'Rewardful',
        category: '紹介管理',
        purpose: 'アフィリエイターへの成果報酬自動計算と支払い',
        monthlyCostJpy: 50000,
        officialUrl: 'https://rewardful.com'
      }
    ],
    first100UsersStrategy: '「AI Headshot Generator」という高需要キーワードを先回りし、超高速な比較ランディングページを作成。さらに就活生向けインフルエンサー10名に無料提供し、TikTokでビフォーアフターを投稿してもらって初月で500名の有料顧客を獲得。',
    reproducibilityPlaybook: [
      {
        step: 1,
        title: 'B2B企業の顔写真ペインに着目',
        description: '「新入社員が入るたびにプロカメラマンを手配するのが面倒」という総務・人事の悩みに絞り込む。'
      },
      {
        step: 2,
        title: '高額アフィリエイト報酬の設計',
        description: '売上の30%を永久還元する制度を作り、ブロガーや比較サイト運営者が競って自社を紹介する構造を構築。'
      },
      {
        step: 3,
        title: 'チーム一括管理機能の実装',
        description: '人事担当者がURLを配布するだけで社員100人分の写真が一括収集・生成される企業プランを投入。'
      }
    ],
    proSecretInsight: '【特別会員限定・解錠済】ダニー氏の最大の勝ち筋は「アフィリエイトの即時承認」。他社が承認に30日かける中、支払い確定後24時間で紹介報酬を自動送金する仕組みにしたため、世界のトップアフィリエイターが一斉に他社からHeadshotProの紹介へ乗り換えた。',
    featured: true,
    publishedAt: '2026-08-20'
  },
  {
    id: 'biz-003',
    slug: 'tldr-newsletter-dan-ni',
    title: 'TLDR ニュースレター',
    tagline: '1人創業から年商15億円超。日刊テック電子手紙の最強スポンサーシップ帝国',
    founderName: 'ダン・ニー',
    founderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    founderBio: 'スクレイピングツール事業を売却後、短文で読めるITニュース要約レターを立ち上げ、購読者700万人へ育てたメディア起業家。',
    monthlyRevenueJpy: 125000000,
    monthlyProfitJpy: 102500000,
    profitMarginPercent: 82.0,
    initialInvestmentJpy: 100000,
    monthsToProfitability: 3,
    teamSize: 22,
    weeklyHoursSpent: 12,
    businessModel: '定期手紙',
    targetMarket: '法人向け',
    primaryAcquisitionChannel: '有料広告',
    skillRequired: '発信力',
    automationLevel: '半自動型',
    isVerified: true,
    isForSale: false,
    summary: '「エンジニアが朝の5分で読める」テクノロジー・ビジネスの厳選要約手紙。AWS、Google、Microsoft等の大手IT企業が喉から手が出る開発者リストを抱え、最上位広告枠は1日450万円で完売。',
    financialBreakdown: {
      grossRevenue: 125000000,
      serverAndApiCost: 1500000,
      advertisingCost: 12000000,
      outsourcingCost: 9000000,
      netProfit: 102500000,
      profitMarginPercent: 82.0
    },
    tools: [
      {
        name: 'Amazon SES',
        category: '大量メール配信',
        purpose: '毎日700万通のメールを確実に受信箱に届ける格安基盤',
        monthlyCostJpy: 800000,
        officialUrl: 'https://aws.amazon.com/ses/'
      },
      {
        name: 'Stripe Invoicing',
        category: '法人請求決済',
        purpose: '大企業スポンサーからの数百万円単位の自動請求',
        monthlyCostJpy: 250000,
        officialUrl: 'https://stripe.com'
      }
    ],
    first100UsersStrategy: 'Redditのプログラミング系掲示板（r/programming）で「今日の重要なテックニュースまとめ」を毎日手作業で投稿。末尾に「毎朝メールで受け取りたい人はこちら」と自作LPを添え、最初の1,000人を完全無料で集めた。',
    reproducibilityPlaybook: [
      {
        step: 1,
        title: '高年収・ニッチ層の特定',
        description: '広告主（大企業）が喉から手が出るほど採用・宣伝したい「エンジニア」「AI研究者」「医師」等の読者層に絞る。'
      },
      {
        step: 2,
        title: '5分で読める短文要約フォーマット',
        description: '長文コラムを廃止し、見出し＋3行要約＋元リンクの極めてタイパの高い形式を固定化する。'
      },
      {
        step: 3,
        title: '有料広告での読者獲得アクセル',
        description: '1人獲得単価（CPA）が200円以下になるMeta/X広告を回し、読者数10万人まで一気にブースト。'
      },
      {
        step: 4,
        title: '広告枠の自社直接販売',
        description: '広告代理店を挟まず、サイト上に「空き枠カレンダー」を公開してB2B企業から直接予約を受け付ける。'
      }
    ],
    proSecretInsight: '【特別会員限定・解錠済】TLDRの真の利益エンジンは「リターゲティング広告の自前運用」。自社メルマガの購読者に対してMeta広告を安価に再配信し、他社スポンサーへのクリック率を異常値まで高めることで、広告主のリピート率92%を維持している。',
    featured: true,
    publishedAt: '2026-08-25'
  },
  {
    id: 'biz-004',
    slug: 'the-rundown-ai-rowan',
    title: 'The Rundown AI（日刊人工知能手紙）',
    tagline: '創刊2年で年商10.5億円。AI情報爆発の波を捉えた20代起業家の勝利の方程式',
    founderName: 'ローワン・チャン',
    founderAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    founderBio: '20代でChatGPTのローンチ直後にAI特化ニュースレターを創刊。200万人の読者コミュニティを築きForbes等で特集される。',
    monthlyRevenueJpy: 87500000,
    monthlyProfitJpy: 65625000,
    profitMarginPercent: 75.0,
    initialInvestmentJpy: 30000,
    monthsToProfitability: 2,
    teamSize: 8,
    weeklyHoursSpent: 15,
    businessModel: '定期手紙',
    targetMarket: '法人向け',
    primaryAcquisitionChannel: '短文投稿網',
    skillRequired: '発信力',
    automationLevel: '半自動型',
    isVerified: true,
    isForSale: false,
    summary: '世界の最新AIツール、研究論文、活用事例を毎日平易な日本語/英語で解説する配信メディア。企業スポンサー広告に加え、年額15万円の教育アカデミー（Rundown University）で巨大なLTVを実現。',
    financialBreakdown: {
      grossRevenue: 87500000,
      serverAndApiCost: 1200000,
      advertisingCost: 15000000,
      outsourcingCost: 5675000,
      netProfit: 65625000,
      profitMarginPercent: 75.0
    },
    tools: [
      {
        name: 'Beehiiv',
        category: 'ニュースレター配信基盤',
        purpose: '紹介プログラム、広告ネットワーク、会員管理の一体化',
        monthlyCostJpy: 150000,
        officialUrl: 'https://beehiiv.com'
      },
      {
        name: 'SparkLoop',
        category: '読者相互紹介',
        purpose: '他社ニュースレターとの提携による自動読者増加',
        monthlyCostJpy: 400000,
        officialUrl: 'https://sparkloop.app'
      }
    ],
    first100UsersStrategy: 'X上で毎日「今日発表された驚異のAIツール7選」という図解スレッドを投下。スレッドの最終ツイートに「毎朝無料で届くメルマガはこちら」と導線を置き、初月で10万フォロワーと5万読者を一気に獲得。',
    reproducibilityPlaybook: [
      {
        step: 1,
        title: 'メガトレンドの初動に特化',
        description: 'AIエージェント、自動運転、ヒューマノイドなど、今後10年伸びる特定分野を名前冠にする。'
      },
      {
        step: 2,
        title: '短文投稿網での高密度キュレーション',
        description: '海外の英語論文やGitHubリポジトリを日本語でわかりやすく図解し、知見の翻訳差益を取る。'
      },
      {
        step: 3,
        title: 'バックエンド教育プログラムの展開',
        description: '無料読者の中から「社内にAIを導入したいビジネスマン」向けに高単価ワークショップを販売。'
      }
    ],
    proSecretInsight: '【特別会員限定・解錠済】ローワン氏の真骨頂は「紹介ループ（Referral Engine）」。メルマガ内で「3人友達に紹介したら非公開AIプロンプト集プレゼント」「10人紹介で限定コミュニティ招待」としたことで、読者が勝手に宣伝マンとなり、広告費ゼロで毎月2万人の新規読者が自動増殖している。',
    featured: true,
    publishedAt: '2026-08-28'
  },
  {
    id: 'biz-005',
    slug: 'notion-minimal-easlo',
    title: 'Notionミニマルテンプレート販売',
    tagline: '20代青年が完全1人で年間1.1億円。仕入れゼロ・原価ゼロのデジタル資産帝国',
    founderName: 'イースロ（ジェイソン・チン）',
    founderAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    founderBio: '2021年からNotionのシンプルかつ美しいタスク管理・財務管理テンプレートを販売。完全1人で累計数億円を稼ぎ出す。',
    monthlyRevenueJpy: 9200000,
    monthlyProfitJpy: 8740000,
    profitMarginPercent: 95.0,
    initialInvestmentJpy: 0,
    monthsToProfitability: 1,
    teamSize: 1,
    weeklyHoursSpent: 4,
    businessModel: '知識・様式販売',
    targetMarket: '個人向け',
    primaryAcquisitionChannel: '短文投稿網',
    skillRequired: '完全ノーコード',
    automationLevel: '自律稼働型',
    isVerified: true,
    isForSale: false,
    summary: 'Notionを使った仕事術・貯金管理・目標達成のテンプレート。白黒ミニマルな洗練されたデザインが世界中で愛され、Gumroadおよび自社サイトを通じて毎月数千個が自動でダウンロード販売されている。',
    financialBreakdown: {
      grossRevenue: 9200000,
      serverAndApiCost: 60000,
      advertisingCost: 0,
      outsourcingCost: 400000,
      netProfit: 8740000,
      profitMarginPercent: 95.0
    },
    tools: [
      {
        name: 'Notion',
        category: '商品制作',
        purpose: 'テンプレートの設計と複製配布リンク生成',
        monthlyCostJpy: 1500,
        officialUrl: 'https://notion.so'
      },
      {
        name: 'Gumroad / Lemon Squeezy',
        category: '電子決済・配信',
        purpose: 'デジタル商品の即時決済とファイル自動ダウンロード',
        monthlyCostJpy: 400000,
        officialUrl: 'https://gumroad.com'
      }
    ],
    first100UsersStrategy: '自作した「無料の週間タスク管理テンプレート」をXに投稿し、「欲しい人はRT＆いいねしたらDMで自動配布」と設定。一晩で3,000RTされ、取得したメアド宛に有料の完全版テンプレートを案内して初月50万円を突破。',
    reproducibilityPlaybook: [
      {
        step: 1,
        title: '日常生活の課題をNotionで極限まで美しく整理',
        description: '家計簿、副業タスク、習慣トラッカーなど、誰でも毎日使う機能を洗練されたデザインで組む。'
      },
      {
        step: 2,
        title: '無料版を餌にしたメールアドレス収集',
        description: '基本機能を無料配布してリストを構築し、バックエンドのPro版（約5,000円〜15,000円）へ誘導。'
      },
      {
        step: 3,
        title: '全自動決済とバンドル販売',
        description: '全テンプレートをセットにした「完全パック（約3万円）」を用意し、顧客単価を最大化。'
      }
    ],
    proSecretInsight: '【機関PRO限定】イースロ氏の勝因は「SEOとPinterestを活用した検索トラフィックの自動化」。SNSの単発流入に依存せず、テンプレート活用記事を自社ブログとPinterestへ体系的に配置し、毎月10万人の購買確度の高い検索ユーザーが自然流入する安定導線を構築している。',
    featured: true,
    publishedAt: '2026-09-01'
  },
  {
    id: 'biz-006',
    slug: 'shipfast-marc-lou',
    title: 'ShipFast & TrustMRR',
    tagline: '完全1人で月商1,200万円。開発ボイラープレートから売上可視化SaaSへ華麗なる進化',
    founderName: 'マーク・ルー',
    founderAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    founderBio: 'バリ島在住のソロプレナー。自らの失敗談と収益を包み隠さず動画で公開し、個人開発者界隈で絶大な支持を集める。',
    monthlyRevenueJpy: 12000000,
    monthlyProfitJpy: 10800000,
    profitMarginPercent: 90.0,
    initialInvestmentJpy: 0,
    monthsToProfitability: 1,
    teamSize: 1,
    weeklyHoursSpent: 10,
    businessModel: '継続課金型ツール',
    targetMarket: '個人向け',
    primaryAcquisitionChannel: '短文投稿網',
    skillRequired: '基本開発',
    automationLevel: '自律稼働型',
    isVerified: true,
    isForSale: false,
    summary: 'Next.jsでWebサービスを作る際に必要な「決済・認証・メール・データベース」が最初から全部揃った下地コードを販売。その後、Stripeの売上を認証して公開するTrustMRRなど複数SaaSを展開。',
    financialBreakdown: {
      grossRevenue: 12000000,
      serverAndApiCost: 200000,
      advertisingCost: 0,
      outsourcingCost: 1000000,
      netProfit: 10800000,
      profitMarginPercent: 90.0
    },
    tools: [
      {
        name: 'Next.js + Tailwind CSS',
        category: '開発フレームワーク',
        purpose: '最高速のプロダクト構築',
        monthlyCostJpy: 0,
        officialUrl: 'https://nextjs.org'
      },
      {
        name: 'Supabase',
        category: 'データベース',
        purpose: 'サーバーレスでのデータ保管と認証',
        monthlyCostJpy: 10000,
        officialUrl: 'https://supabase.com'
      }
    ],
    first100UsersStrategy: '自らが過去に10個以上のサービスを立ち上げて挫折した泥臭い失敗談をYouTubeとXで動画公開。「もう毎回ログインと決済を実装するのにうんざりしたから、自分用のスターターキットを作った」と語り、予約販売初日で300万円を売り上げた。',
    reproducibilityPlaybook: [
      {
        step: 1,
        title: '同業者が毎回行う面倒な作業をパッケージ化',
        description: '認証、決済、SEOメタタグ、メール送信など、誰もが毎回ゼロから組む基礎部品をまとめる。'
      },
      {
        step: 2,
        title: '買い切り（Lifetime Deal）で初速の現金を最大化',
        description: '月額課金を嫌うエンジニアに対し、「一度買えば永久アップデート無料」として爆発的な購入数を獲得。'
      },
      {
        step: 3,
        title: '購入者を自社次のSaaSの初期ユーザーへ横展開',
        description: 'ShipFastの購入者数千人に対し、自作のアクセス解析SaaSやM&Aプラットフォームを直接販売。'
      }
    ],
    proSecretInsight: '【特別会員限定・解錠済】マーク氏は自作サイトのフッターに「Built with ShipFast」というバッジを必ず埋め込み、自社製品が動くたびに新規顧客が自然発生する究極のバイラルループを埋め込んでいる。',
    featured: false,
    publishedAt: '2026-09-02'
  },
  {
    id: 'biz-007',
    slug: 'bolt-storage-nick-huber',
    title: 'Bolt Storage（無人セルフストレージ）',
    tagline: '地方の古い貸倉庫を完全無人化。泥臭い実体ビジネス近代化で資産150億円',
    founderName: 'ニック・フーバー',
    founderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    founderBio: '「Sweaty Startup（汗をかく起業）」の提唱者。IT競争を避け、競合が老齢化した実体サービスをデジタル化して巨万の富を築く。',
    monthlyRevenueJpy: 18000000,
    monthlyProfitJpy: 8100000,
    profitMarginPercent: 45.0,
    initialInvestmentJpy: 5000000,
    monthsToProfitability: 6,
    teamSize: 4,
    weeklyHoursSpent: 5,
    businessModel: '特化型通販',
    targetMarket: '地域実店舗向け',
    primaryAcquisitionChannel: '検索自動集客',
    skillRequired: '個別営業',
    automationLevel: '自律稼働型',
    isVerified: true,
    isForSale: true,
    askingPriceJpy: 220000000,
    summary: '引退間際の高齢オーナーから地方の赤字セルフストレージ（貸倉庫）を買収。スマートロックと遠隔カメラを導入し、現地管理人をゼロにしてWebから即日電子契約できる仕組みで高収益化。',
    financialBreakdown: {
      grossRevenue: 18000000,
      serverAndApiCost: 300000,
      advertisingCost: 1500000,
      outsourcingCost: 8100000,
      netProfit: 8100000,
      profitMarginPercent: 45.0
    },
    tools: [
      {
        name: 'OpenTech Alliance',
        category: '遠隔電子錠システム',
        purpose: 'スマホによる倉庫ドアの開閉と入退館自動管理',
        monthlyCostJpy: 200000,
        officialUrl: 'https://opentechalliance.com'
      },
      {
        name: 'Googleマイビジネス (MEO)',
        category: '地域検索対策',
        purpose: '「近くのトランクルーム」検索で1位表示を獲得',
        monthlyCostJpy: 0,
        officialUrl: 'https://google.com/business'
      }
    ],
    first100UsersStrategy: '周辺地域の住宅街に「今なら初月500円で使える荷物置き場」というチラシを手配りしつつ、Googleマップの口コミを徹底的に集めて地域内での独占的ポジションを確立。',
    reproducibilityPlaybook: [
      {
        step: 1,
        title: '後継者のいない地方貸倉庫・コインランドリーの発掘',
        description: '登記簿謄本や地元の不動産屋を回り、Webサイトすら持っていない老朽施設を探す。'
      },
      {
        step: 2,
        title: 'スマートロック導入による固定人件費の完全切除',
        description: '現地管理人の人件費をゼロにし、契約から鍵の発行までをすべてLINE・Web上で完結させる。'
      },
      {
        step: 3,
        title: '稼働率80%達成後の金融機関リファイナンス',
        description: 'キャッシュフローを証明して物件の担保価値を上げ、投資資金を全額回収して次の物件を買収。'
      }
    ],
    proSecretInsight: '【特別会員限定・解錠済】ニック氏の最大の武器は「海外（フィリピン）の遠隔オペレーション部隊」。電話対応や防犯カメラ監視を月給数万円の英語ネイティブ人材に完全委託することで、米国内の高額な人件費を完全に回避している。',
    featured: false,
    publishedAt: '2026-09-02'
  },
  {
    id: 'biz-008',
    slug: 'tiktok-shop-faceless-health',
    title: 'TikTok Shop 顔出しなし実演物販',
    tagline: '顔出しゼロ・在庫リスク極小。手元レビュー動画の量産で月商2,200万円を自動化',
    founderName: '匿名クリエイターチーム',
    founderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    founderBio: '20代の元会社員2名で運営。TikTokアルゴリズムの徹底解析により、顔を出さずに商品レビュー動画を自動量産。',
    monthlyRevenueJpy: 22000000,
    monthlyProfitJpy: 5280000,
    profitMarginPercent: 24.0,
    initialInvestmentJpy: 200000,
    monthsToProfitability: 2,
    teamSize: 2,
    weeklyHoursSpent: 12,
    businessModel: '顔出しなし動画広告',
    targetMarket: '個人向け',
    primaryAcquisitionChannel: '短尺動画網',
    skillRequired: '人工知能の指示のみ',
    automationLevel: '半自動型',
    isVerified: true,
    isForSale: false,
    summary: '健康器具や姿勢矯正グッズ、スキンケア商品をメーカーから無償提供させ、顔を出さずに手元の実演とビフォーアフター動画を投稿。TikTok Shopの決済リンクから爆発的な購入を生む。',
    financialBreakdown: {
      grossRevenue: 22000000,
      serverAndApiCost: 100000,
      advertisingCost: 0,
      outsourcingCost: 16620000,
      netProfit: 5280000,
      profitMarginPercent: 24.0
    },
    tools: [
      {
        name: 'CapCut Pro + AI音声',
        category: '動画編集',
        purpose: 'ナレーションの自動合成と字幕の自動配置',
        monthlyCostJpy: 2000,
        officialUrl: 'https://capcut.com'
      },
      {
        name: 'TikTok Shop Seller Center',
        category: '販売窓口',
        purpose: 'アフィリエイト連携と成果報酬の即時受取',
        monthlyCostJpy: 0,
        officialUrl: 'https://seller.tiktok.com'
      }
    ],
    first100UsersStrategy: '競合が少ない新発売のヘルスケア商品をTikTok Shop内で特定し、メーカーに「無料で動画を5本作るからサンプルを送ってほしい」とDM。届いた初日に5本投稿し、うち1本が100万回再生され初週で300万円の売上を記録。',
    reproducibilityPlaybook: [
      {
        step: 1,
        title: '手元実演に適した「ビフォーアフターが明確な商品」選定',
        description: '姿勢サポーター、毛穴吸引器、小型超音波洗浄機など、画面上で効果が1秒で伝わる商品を選ぶ。'
      },
      {
        step: 2,
        title: '「問題提起 → 実演 → 衝撃結果」の黄金構成テンプレート',
        description: '最初の2秒で「まだこんな無駄なことやってるの？」と止め、顔を出さず商品だけを見せる。'
      },
      {
        step: 3,
        title: '海外の格安動画編集者への外注化',
        description: '撮影した生動画をクラウドに上げ、カットと字幕付けを1本1,500円で外注して1日3本投稿体制を作る。'
      }
    ],
    proSecretInsight: '【特別会員限定・解錠済】このチームは自社のアカウントだけでなく、売れ筋動画の台本と素材を「マイクロアフィリエイター50人」に配布して別アカウントで同時多発投稿させている。プラットフォームの露出面を面で支配することで、垢BANリスクを分散しながら売上を維持している。',
    featured: false,
    publishedAt: '2026-09-02'
  },
  {
    id: 'biz-009',
    slug: 'clay-ai-cold-outbound-agency',
    title: 'Clay×AI 超パーソナライズ営業代行',
    tagline: '2人チームで月利520万円。AIが全自動で企業リサーチしてアポを量産する次世代受託',
    founderName: '佐藤＆高橋（AI受託スタジオ）',
    founderAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    founderBio: 'B2B営業出身の2名が立ち上げ。旧来のテレアポを全廃し、データスクレイピングとLLMを組み合わせてアポ獲得を全自動化。',
    monthlyRevenueJpy: 8000000,
    monthlyProfitJpy: 5200000,
    profitMarginPercent: 65.0,
    initialInvestmentJpy: 50000,
    monthsToProfitability: 1,
    teamSize: 2,
    weeklyHoursSpent: 10,
    businessModel: '業務自動化受託',
    targetMarket: '法人向け',
    primaryAcquisitionChannel: '個別連絡',
    skillRequired: '人工知能の指示のみ',
    automationLevel: '半自動型',
    isVerified: true,
    isForSale: false,
    summary: '企業の決算短信、採用求人、幹部のSNS投稿をAIで自動収集し、「御社の現在抱えている課題〇〇に合わせた提案です」という極めて自然な営業メールを月間3万通自動送信。獲得した商談アポ1件につき3万円を課金。',
    financialBreakdown: {
      grossRevenue: 8000000,
      serverAndApiCost: 1200000,
      advertisingCost: 0,
      outsourcingCost: 1600000,
      netProfit: 5200000,
      profitMarginPercent: 65.0
    },
    tools: [
      {
        name: 'Clay.com',
        category: 'データ収集・突合',
        purpose: '企業の求人・SNS・売上データの自動エンリッチメント',
        monthlyCostJpy: 120000,
        officialUrl: 'https://clay.com'
      },
      {
        name: 'Instantly.ai',
        category: 'コールドメール自動配信',
        purpose: '複数ドメインからの迷惑メール判定を回避したメール配信',
        monthlyCostJpy: 80000,
        officialUrl: 'https://instantly.ai'
      }
    ],
    first100UsersStrategy: '自社の自動化システムを使い、資金調達直後のSaaS企業100社に対して「御社の今月の採用職種に合わせた見込み顧客リスト50件を無料で差し上げます」とメール。返信率が14%を超え、即座に5社と月額固定＋成果報酬の顧問契約を締結。',
    reproducibilityPlaybook: [
      {
        step: 1,
        title: '「アポ獲得に困っているB2B企業」のリストアップ',
        description: '資金調達を発表したばかりのスタートアップや、営業職の求人を大量に出している企業を狙う。'
      },
      {
        step: 2,
        title: 'Clayを用いた完全自動リサーチワークフローの構築',
        description: 'ターゲット企業のWebサイトから「社長のインタビュー記事」を読み込み、Claudeでパーソナライズ文を生成。'
      },
      {
        step: 3,
        title: '完全成果報酬での参入障壁破壊',
        description: '「商談が取れなければ1円もいただきません」と提案し、成約時に1アポ3万円〜5万円を確実に回収。'
      }
    ],
    proSecretInsight: '【特別会員限定・解錠済】返信率を劇的に引き上げる秘訣は「相手の会社が出している未解決の求人票」への言及。「〇〇ポジションの採用が苦戦されていると拝見し、その業務をAIで代行する具体案をお持ちしました」と送ることで、通常の営業メールの8倍の返信率を叩き出している。',
    featured: false,
    publishedAt: '2026-09-02'
  },
  {
    id: 'biz-010',
    slug: 'local-sweaty-cleaning-modern',
    title: '地方特化 外壁・高圧洗浄デジタル近代化',
    tagline: '電話対応ゼロ・Web即時見積もり。地味な清掃ビジネスをDXして月利240万円',
    founderName: '武田 健司',
    founderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    founderBio: '元Webディレクター。過当競争の受託Web制作を辞め、地元で競合が高齢者ばかりの外壁洗浄・害虫駆除へ転身。',
    monthlyRevenueJpy: 4500000,
    monthlyProfitJpy: 2475000,
    profitMarginPercent: 55.0,
    initialInvestmentJpy: 350000,
    monthsToProfitability: 1,
    teamSize: 1,
    weeklyHoursSpent: 15,
    businessModel: '業務自動化受託',
    targetMarket: '地域実店舗向け',
    primaryAcquisitionChannel: '検索自動集客',
    skillRequired: '完全ノーコード',
    automationLevel: '半自動型',
    isVerified: true,
    isForSale: false,
    summary: '戸建て住宅やアパートの外壁高圧洗浄・排水管洗浄。顧客がスマホで写真を撮って送るだけで、LINE公式アカウントのBotが3秒で自動見積もりを発行。電話なしで即時予約が確定する近代化モデル。',
    financialBreakdown: {
      grossRevenue: 4500000,
      serverAndApiCost: 50000,
      advertisingCost: 450000,
      outsourcingCost: 1525000,
      netProfit: 2475000,
      profitMarginPercent: 55.0
    },
    tools: [
      {
        name: 'LINE公式アカウント + Lステップ',
        category: '顧客対応自動化',
        purpose: '写真送付からの自動見積もり計算とカレンダー予約',
        monthlyCostJpy: 30000,
        officialUrl: 'https://linestep.jp'
      },
      {
        name: 'ケルヒャー業務用高圧洗浄機',
        category: '実務設備',
        purpose: '高品質かつ短時間での外壁洗浄作業',
        monthlyCostJpy: 0,
        officialUrl: 'https://kaercher.com'
      }
    ],
    first100UsersStrategy: '地元のGoogleマイビジネスに登録し、知人の家の外壁を格安で清掃して劇的なビフォーアフター写真と星5つの口コミを20件蓄積。「地域名 外壁洗浄」でマップ1位になり、自然と予約が埋まる状態に。',
    reproducibilityPlaybook: [
      {
        step: 1,
        title: '「電話見積もりが当たり前」の古い業界を選ぶ',
        description: '高圧洗浄、剪定、不用品回収など、見積もりに数日待たされるのが当たり前のレガシー分野を狙う。'
      },
      {
        step: 2,
        title: 'LINEでの3秒自動見積もり導線の作成',
        description: '「建坪」と「写真」を選ぶだけで目安金額が即座に出て、空き日程をタップして予約完了する仕組みを組む。'
      },
      {
        step: 3,
        title: '実作業の地域の職人への委託',
        description: '自分はWeb集客と見積もり管理に専念し、実作業は地元のフリー職人に売上の50%で発注して完全手離れ。'
      }
    ],
    proSecretInsight: '【特別会員限定・解錠済】武田氏は一度作業した顧客に対し、半年後に「排水管の無料点検案内」、1年後に「屋根の劣化診断」をLINEで自動送信している。この自動追客の仕組みにより、顧客の4割が年間リピーター化し、新規広告費を年々削減することに成功している。',
    featured: false,
    publishedAt: '2026-09-03'
  }
];
