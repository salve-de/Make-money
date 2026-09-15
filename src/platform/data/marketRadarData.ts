export type RadarCategory =
  | 'ALL'
  | 'AI_INFRA'
  | 'UNBUNDLED_SAAS'
  | 'PLATFORM_PARASITE'
  | 'VERTICAL_COMPLIANCE'
  | 'BORING_BUSINESS'
  | 'DATA_AS_A_SERVICE'
  | 'CREATOR_PIPELINE'
  | 'OSS_INTEGRATION';

export interface MarketRadarTrendItem {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  growthRate: string;
  heatScore: number;
  sparklineData: number[];
  category: RadarCategory;
  categoryLabel: string;
  estimatedMonthlyProfit: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  
  // 第1段：マクロ・レーダー
  macroContext: {
    heading: string;
    whyNow: string;
    targetPainWallet: string;
  };

  // 第2段：大手の死角 ＆ 実証勝者
  gapAndProof: {
    incumbentGap: {
      incumbentName: string;
      fatalDilemma: string;
      incumbentPricing: string;
    };
    provenPlayer: {
      name: string;
      entityId?: string;
      teamSize: string;
      monthlyProfit: string;
      grossMargin: string;
      paybackDays: string;
      proofSnippet: string;
    };
  };

  // 第3段：参入アクション攻略本
  actionablePlaybook: {
    unbundlingAngle: string;
    first10CustomersLog: string;
    threeToolStack: {
      name: string;
      role: string;
      cost: string;
    }[];
    totalMonthlyCost: string;
    fatalPitfalls: string;
    pricingRecommendation: string;
  };
}

export const RADAR_CATEGORIES: { key: RadarCategory; label: string; icon: string }[] = [
  { key: 'ALL', label: 'すべての傾向', icon: '🔥' },
  { key: 'AI_INFRA', label: 'AI配管・データ', icon: '⚡' },
  { key: 'UNBUNDLED_SAAS', label: '外資SaaS解体', icon: '✂️' },
  { key: 'PLATFORM_PARASITE', label: 'SNS規約寄生', icon: '📦' },
  { key: 'VERTICAL_COMPLIANCE', label: '地方・法規制SaaS', icon: '⚖️' },
  { key: 'BORING_BUSINESS', label: '退屈な実業関所', icon: '🛠️' },
  { key: 'DATA_AS_A_SERVICE', label: 'スクレイピングDaaS', icon: '📊' },
  { key: 'CREATOR_PIPELINE', label: 'メディア自動化', icon: '🎬' },
  { key: 'OSS_INTEGRATION', label: 'OSS社内導入代行', icon: '🚀' },
];

export const MARKET_RADAR_TRENDS: MarketRadarTrendItem[] = [
  {
    id: 'trend-ai-doc-pipeline',
    badge: 'TREND 01 / AI配管インフラ',
    title: '社内文書の「AI即食いクリーンMarkdown化」代行',
    subtitle: 'Claude CodeやCodex普及に伴い、社内の汚いExcel/Word/手書きPDFをAIが読める形式に前処理する配管需要が急騰',
    growthRate: '+240%',
    heatScore: 98,
    sparklineData: [15, 22, 35, 48, 72, 98],
    category: 'AI_INFRA',
    categoryLabel: 'AI配管・データ',
    estimatedMonthlyProfit: '月利 200万〜600万円',
    difficulty: 'EASY',
    macroContext: {
      heading: 'AIエージェントの現場浸透と「社内データのゴミ屋敷化」の摩擦',
      whyNow: '企業が最新のコーディングエージェントや社内AIを導入したものの、実務の9割が複雑な結合セルExcelやPDFのためAIが構文エラーで停止。AI本体よりも「AIに食わせるためのデータ前処理配管」に巨額予算が流出している。',
      targetPainWallet: '中堅・大手企業の情シス・DX推進責任者が抱える「数千万円投資したAIプロジェクトがデータ不備で止まり、経営陣に詰められる」保身恐怖の財布。',
    },
    gapAndProof: {
      incumbentGap: {
        incumbentName: '大手SIer / 総合コンサルティング会社',
        fatalDilemma: '大手SIerは1件数千万円〜数億円の基幹システム刷新案件として請け負うビジネスモデルのため、月額数万円〜数十万円で即日動く軽量コンバーターを単体提供すると自社のSI工数が蒸発して自滅する。',
        incumbentPricing: '初期数千万円〜 ＋ 開発期間6ヶ月以上',
      },
      provenPlayer: {
        name: 'Firecrawl / anydoc エコシステム',
        entityId: 'ent_betterstack',
        teamSize: '1〜3人（超少数精鋭）',
        monthlyProfit: '月利 200万〜600万円',
        grossMargin: '94%',
        paybackDays: '即日〜14日',
        proofSnippet: 'GitHubでanydocがわずか数週間で2万Star超えを記録。社内文書をMarkdownへ自動変換するAPIを法人契約させ、広告費ゼロで初月から黒字化。',
      },
    },
    actionablePlaybook: {
      unbundlingAngle: '大企業向け全自動化ではなく、「地方の製造業・医療法人の古い帳票PDFとExcelに特化した日本語変換パイプライン」としてローカルへタイムマシン移植。',
      first10CustomersLog: '地元の税理士・社労士事務所や製造業30社に「御社の複雑なExcel台帳を、ChatGPTやClaudeでそのまま質問・集計できる形に即日テスト変換します（無料サンプル作成）」とメール・電話で連絡。1画面の変換デモを見せて即日契約。',
      threeToolStack: [
        { name: 'anydoc / Marker (OSS)', role: '高速PDF/Excel Markdown変換コア', cost: '無料' },
        { name: 'Cloudflare Workers & R2', role: '変換ファイルのセキュア一時保管・API受付', cost: '月0円〜1,500円' },
        { name: 'Stripe Billing', role: '月額保守料金の自動引き落とし', cost: '成果報酬 3.6%' },
      ],
      totalMonthlyCost: '月額実費: 約1,500円〜3,000円',
      fatalPitfalls: '【即死地雷】自前でOCRや独自AIモデルをゼロから開発しようとするな。GitHub上の最新OSSを組み合わせてDockerで動かすだけに徹底せよ。',
      pricingRecommendation: '初期セットアップ費 20万円 ＋ 月額保守 3万〜5万円（契約企業10社で月30万〜50万円の完全自動ストック）',
    },
  },
  {
    id: 'trend-unbundled-saas-cloudflare',
    badge: 'TREND 02 / 外資SaaS解体',
    title: '外資SaaSの円安値上げ疲れを突く「1機能特化・格安クラウド移設」',
    subtitle: 'ZendeskやDatadogの毎月数十万円の請求書にキレた企業を、月3,000円で自走する専用基盤へ丸ごと乗り換えさせるモデル',
    growthRate: '+185%',
    heatScore: 92,
    sparklineData: [20, 28, 42, 55, 78, 92],
    category: 'UNBUNDLED_SAAS',
    categoryLabel: '外資SaaS解体',
    estimatedMonthlyProfit: '月利 300万〜1,200万円',
    difficulty: 'MEDIUM',
    macroContext: {
      heading: '円安と多機能化による「外資SaaSの強制値上げ」に対する現場の怨嗟',
      whyNow: '米系SaaSが円安とAI機能追加を名目に毎年20〜30%値上げを強行。企業の現場では「使っているのは問い合わせ受付の1機能だけなのに毎月何十万円も取られる」という不満が極限に達している。',
      targetPainWallet: 'スタートアップや中堅企業のCTO・経営企画が抱える「SaaS経費を今期中に30%削減せよ」という取締役会からの締め上げ予算。',
    },
    gapAndProof: {
      incumbentGap: {
        incumbentName: 'Zendesk / Salesforce / Datadog',
        fatalDilemma: '大手は株主向けにARRの極大化と全社包括契約を維持する必要があるため、ユーザーが日常で一番使っている1機能だけを月数千円で切り売りすると自社の売上が激減する。',
        incumbentPricing: '月額 20万〜150万円（ユーザー数課金で青天井）',
      },
      provenPlayer: {
        name: 'Better Stack / ResolveHQ モデル',
        entityId: 'ent_betterstack',
        teamSize: '完全1人〜数人',
        monthlyProfit: '月利 300万〜1,200万円',
        grossMargin: '92%',
        paybackDays: '3日〜7日',
        proofSnippet: '大手の1/10価格で障害通知・ログ監視だけを切り出し。円安で悲鳴を上げた日本企業や海外スタートアップの乗り換え需要を一網打尽にし急成長。',
      },
    },
    actionablePlaybook: {
      unbundlingAngle: '高額サポートツールの全機能を模倣せず、「社内SlackやLINEと直結したシンプルな問い合わせチケット管理」だけに絞り込み、大手の1/10価格で直販。',
      first10CustomersLog: 'XやWantedlyで「ZendeskやSalesforceの請求書が高すぎる」と愚痴っているCTO・創業者を検索し、「月額コストを1/10にする移行実績があります。初期費用無料、浮いた差額の一部のみ成功報酬」とDM送信。',
      threeToolStack: [
        { name: 'Cloudflare Workers & D1', role: 'サーバーレス自前API・データベース', cost: '無料枠内' },
        { name: 'Chatwoot / ResolveHQ (OSS)', role: 'オープンソースの問い合わせUI', cost: '無料' },
        { name: 'Resend / Postmark', role: '通知メール高速配信API', cost: '月0円〜2,000円' },
      ],
      totalMonthlyCost: '月額実費: 約2,000円',
      fatalPitfalls: '【即死地雷】大手が持っている無駄な便利機能を全部作ろうとするな。「チケット管理と返信」という死活問題の1機能だけを絶対に落とさず高速化せよ。',
      pricingRecommendation: '初期データ移行費 15万円 ＋ 月額保守 29,800円（大手の年間300万円が年間50万円に削減されるため即決成約）',
    },
  },
  {
    id: 'trend-parasite-short-commerce',
    badge: 'TREND 03 / SNS規約寄生',
    title: 'TikTok Shopアルゴリズム優遇に乗る「手元15秒実演アフィリエイト」',
    subtitle: '顔出し・声出し・在庫ゼロ。Amazonに対抗してプラットフォームが無料でばら撒くECトラフィックを前金総取りするモデル',
    growthRate: '+380%',
    heatScore: 96,
    sparklineData: [10, 18, 30, 52, 75, 96],
    category: 'PLATFORM_PARASITE',
    categoryLabel: 'SNS規約寄生',
    estimatedMonthlyProfit: '月利 150万〜500万円',
    difficulty: 'EASY',
    macroContext: {
      heading: '巨大プラットフォームの「ECシェア争奪戦」による無料露出のバブル',
      whyNow: 'TikTokがAmazonの流通シェアを奪うため、商品タグ付きの実演ショート動画に不当なアルゴリズム優遇（莫大な無料インプレッション）をばら撒くボーナスタイムが到来している。',
      targetPainWallet: '深夜にスマホを眺めながら「日常の小さな不便を解決したい」と衝動買いする10代〜40代のドーパミン直撃の財布。',
    },
    gapAndProof: {
      incumbentGap: {
        incumbentName: '既存ECモール（Amazon, 楽天市場）',
        fatalDilemma: '既存モールは検索型の受動購入モデルのため、動画による衝動買いを促進するSNSアルゴリズムを持たず、インフルエンサーへの露出優遇を自社で配布できない。',
        incumbentPricing: '高い広告出稿料（CPC広告）と出店料',
      },
      provenPlayer: {
        name: '海外手元実演アフィリエイト軍団',
        entityId: 'ent_midjourney',
        teamSize: '完全1人（スマホ1台）',
        monthlyProfit: '月利 150万〜500万円',
        grossMargin: '30%〜40%（実効利）',
        paybackDays: '即日〜7日',
        proofSnippet: '海外でバズった1,000円の日用便利グッズをサンプル調達し、手元だけで開封・実演する15秒動画を量産。広告費ゼロで初月月商2,000万円・報酬400万円を抜く事例が多発。',
      },
    },
    actionablePlaybook: {
      unbundlingAngle: '海外（中国・米国）のTikTok Shop急上昇ランキングで1万個売れているアイテムを特定し、構成をそのまま日本市場向けの手元動画としてタイムマシン複製。',
      first10CustomersLog: 'クリエイターセンターから無料サンプルを取り寄せ、デスクライトの下で手元だけの手順（問題提起 ➔ 実演 ➔ 衝撃のビフォーアフター）を15秒で撮影し毎日3本投稿。CapCutで自動字幕とトレンド音源を載せるだけ。',
      threeToolStack: [
        { name: 'TikTok Shop Creator Center', role: '無料サンプル調達・売上計測配管', cost: '無料' },
        { name: 'CapCut Pro', role: 'スマホ動画自動字幕・エフェクト編集', cost: '月1,100円' },
        { name: 'FastMoss / Shoplus', role: '海外TikTok Shop急上昇データ分析', cost: '月0円〜数千円' },
      ],
      totalMonthlyCost: '月額実費: 約1,100円',
      fatalPitfalls: '【即死地雷】自分の顔や声を入れるな。自分の感情が入ると量産が止まる。手元と効果音・字幕だけの「無機質な実演機械」として動画を量産せよ。',
      pricingRecommendation: '仕入れ原価ゼロ（無料サンプル） ➔ アフィリエイト報酬 15%〜25%を毎日自動回収',
    },
  },
  {
    id: 'trend-niche-compliance-saas',
    badge: 'TREND 04 / 地方・法規制SaaS',
    title: '義務化・法規制対応を突く「1業界特化・現場勤怠＆点呼マイクロSaaS」',
    subtitle: '運送・建設・産廃などの2024年法改正義務化でパニックになった地方中小を、LINEと1画面だけで救う月数千円ツール',
    growthRate: '+210%',
    heatScore: 94,
    sparklineData: [12, 20, 38, 55, 76, 94],
    category: 'VERTICAL_COMPLIANCE',
    categoryLabel: '地方・法規制SaaS',
    estimatedMonthlyProfit: '月利 150万〜450万円',
    difficulty: 'EASY',
    macroContext: {
      heading: '国の法規制義務化と「IT音痴な現場経営者」の罰則パニック',
      whyNow: '働き方改革や法改正（運送業の点呼記録義務、建設業の時間外規制、電子帳簿保存法）により、紙でやっていた中小企業が「行政処分・免許停止」の恐怖に直面。複雑な大手SaaSは使いこなせず現場が拒絶している。',
      targetPainWallet: '地方中小企業の社長が抱える「労基署の監査で摘発され、免許停止や営業停止で会社が潰れる」保身・生存恐怖の財布。',
    },
    gapAndProof: {
      incumbentGap: {
        incumbentName: '汎用労務SaaS（SmartHR, マネーフォワード等）',
        fatalDilemma: '大手汎用SaaSは上場企業や一般オフィスワーカー向けに作られているため、「トラック運転手が早朝5時にLINEでアルコールチェック結果を送信する」「現場監督が雨天中止を一括送信する」といった土着の現場泥臭い業務に特化すると自社の汎用設計が崩壊する。',
        incumbentPricing: '基本料数万円 ＋ 従業員1人あたり月額数百円（初期導入費数十万円）',
      },
      provenPlayer: {
        name: '地方トラック点呼Bot / 現場出欠チェッカー',
        entityId: 'ent_betterstack',
        teamSize: '完全1人運営',
        monthlyProfit: '月利 250万〜400万円',
        grossMargin: '96%',
        paybackDays: '初日成約',
        proofSnippet: 'LINE公式アカウントとGoogleスプレッドシートをWebhookで繋いだだけの点呼記録ツールを地元の運送会社30社に導入。月額9,800円で解約率0.1%の永久ストック化。',
      },
    },
    actionablePlaybook: {
      unbundlingAngle: '大手の人事労務機能を一切作らず、「法令で定められた点呼記録・アルコールチェックの保管義務」という法律の急所1点のみをLINE Botで自動化。',
      first10CustomersLog: '地元のトラック協会や建設業団体の会員名簿から30社に電話・FAX。「法改正対応の点呼記録、専用アプリのインストール不要で運転手のLINEから3秒で完了するやつを作りました。1ヶ月無料で試してください」と連絡し初月8社成約。',
      threeToolStack: [
        { name: 'LINE Messaging API', role: '現場運転手・作業員の入力インターフェース', cost: '月0円〜5,000円' },
        { name: 'Cloudflare Workers & Supabase', role: '点呼ログ保管・CSV法令フォーマット出力', cost: '月0円〜3,500円' },
        { name: 'Stripe Billing', role: '月額定期引き落とし配管', cost: '成果報酬 3.6%' },
      ],
      totalMonthlyCost: '月額実費: 約3,500円〜8,500円',
      fatalPitfalls: '【即死地雷】専用アプリ（iOS/Android）を作るな。現場の50代・60代ドライバーはApp Storeからアプリを入れるだけで離脱する。日本人の100%が入れているLINE以外を絶対に使わせるな。',
      pricingRecommendation: '月額 9,800円〜19,800円（会社単位課金。100社集めれば月商100万〜200万円の完全放置ストック）',
    },
  },
  {
    id: 'trend-boring-business-dispatch',
    badge: 'TREND 05 / 退屈な実業関所',
    title: '「退屈な実業（空き家整理・エアコン・解体）」の事前見積もり・相見積もり代行関所',
    subtitle: 'ネット検索でボッタクられる恐怖に震える一般人をLINEで集め、地元の優良職人へ送客して手数料15〜20%を前金で抜くモデル',
    growthRate: '+160%',
    heatScore: 90,
    sparklineData: [25, 32, 45, 60, 75, 90],
    category: 'BORING_BUSINESS',
    categoryLabel: '退屈な実業関所',
    estimatedMonthlyProfit: '月利 200万〜800万円',
    difficulty: 'MEDIUM',
    macroContext: {
      heading: '空き家激増・親の遺品整理と「ボッタクリ悪徳業者」への防衛本能',
      whyNow: '団塊世代の高齢化により、地方の空き家整理・遺品整理・解体需要が過去最高を記録。一方で「チラシの業者に頼んだら100万円請求された」被害が多発し、消費者は相場が分からずパニックになっている。',
      targetPainWallet: '遠方に住む子供世代が抱える「親の実家を片付けたいが、悪徳業者にカモられたくない・何社も現地見積もり立ち会う時間がない」苦痛と怠惰の財布。',
    },
    gapAndProof: {
      incumbentGap: {
        incumbentName: '大手マッチングプラットフォーム（くらしのマーケット等）',
        fatalDilemma: '大手マッチングは登録業者から毎月の出店料・成約料を取るビジネスモデルのため、顧客側に立って「この3社から最安で安心な1社を中立にスクリーニングしてあげる」という個別コンシェルジュをやると加盟業者同士が喧嘩してプラットフォームが崩壊する。',
        incumbentPricing: '出店料 ＋ 手数料20%（顧客は自分で業者を選ばされ疲弊）',
      },
      provenPlayer: {
        name: '空き家整理・解体コンシェルジュLINE',
        entityId: 'ent_betterstack',
        teamSize: '1〜2名（非対面）',
        monthlyProfit: '月利 300万〜650万円',
        grossMargin: '85%',
        paybackDays: '即日回収',
        proofSnippet: '「スマホで部屋の写真を送るだけで、地元で一番安い優良業者3社の相見積もりが即日届くLINE窓口」を開設。成約ごとに施工費（平均50万円）の15%（7.5万円）を紹介料として職人から受領。',
      },
    },
    actionablePlaybook: {
      unbundlingAngle: '自分で作業員やトラックを抱えるのではなく、「写真3枚を送れば概算見積もりと業者選定を代行してくれるLINE窓口」という情報の関所（紹介業）に徹する。',
      first10CustomersLog: 'Google広告（「実家 片付け 費用」「空き家 解体 相場」など月3万円出稿）と地元の葬儀場・不動産屋へ「無料の片付け見積もり代行カード」を設置。地元の優良片付け業者3社と「成約時15%キックバック契約」を締結。',
      threeToolStack: [
        { name: 'LINE公式アカウント (Lステップ)', role: '写真受領・自動問診・見積もり提示', cost: '月2,980円' },
        { name: 'Notion / Airtable', role: '提携業者リスト・案件ステータス台帳', cost: '無料' },
        { name: 'Google Ads (地域限定)', role: '「親の実家 処分」特化のリスティング広告', cost: '月3万〜5万円' },
      ],
      totalMonthlyCost: '月額実費: 約5,000円（広告費除く）',
      fatalPitfalls: '【即死地雷】絶対に自前で軽トラや倉庫を持つな。固定費を持った瞬間に労働集約の泥沼に転落する。客と職人の間に立つ「情報の関所（送客配管）」以外に1円も投資するな。',
      pricingRecommendation: 'ユーザー側は完全無料 ➔ 地元施工業者から成約額の15%〜20%をバックマージンとして回収（1件あたり5万〜15万円の現金着金）',
    },
  },
  {
    id: 'trend-scraping-daas-monitoring',
    badge: 'TREND 06 / スクレイピングDaaS',
    title: '官公庁入札・自治体公示・不動産登記の「クモの巣自動監視＆即時通知DaaS」',
    subtitle: '帝国データバンク等の年間数百万円の法人契約を払えない零細企業へ、欲しい公示情報だけを月3,000円でLINE通知するデータ切り売りモデル',
    growthRate: '+190%',
    heatScore: 91,
    sparklineData: [18, 25, 40, 58, 72, 91],
    category: 'DATA_AS_A_SERVICE',
    categoryLabel: 'スクレイピングDaaS',
    estimatedMonthlyProfit: '月利 100万〜350万円',
    difficulty: 'EASY',
    macroContext: {
      heading: '公的入札・許認可公示の「Webサイトの前時代性と見落としリスク」',
      whyNow: '日本全国の自治体や官公庁が毎日数千件の入札や補助金情報を公開しているが、サイトが昭和のHTMLで作られておりRSSもAPIもないため、中小企業の営業マンが手動で巡回しては見落として商機を失っている。',
      targetPainWallet: '中小の土木・清掃・ITベンダーの営業部長が抱える「競合に先に入札公告を見つけられ、数千万円の案件を指をくわえて奪われる」機会損失への恐怖。',
    },
    gapAndProof: {
      incumbentGap: {
        incumbentName: '帝国データバンク / NJSS / 入札王',
        fatalDilemma: '大手入札情報データベースは年間契約60万円〜数百万円で全業種網羅のエンタープライズ向けに売っているため、「自分の市と隣の市の除雪・清掃案件だけ月2,980円で通知してくれ」という零細企業のワガママに対応すると高単価プランが全滅する。',
        incumbentPricing: '年間契約 60万〜200万円（解約縛りあり）',
      },
      provenPlayer: {
        name: '自治体入札特化Bot / 登記アラート',
        entityId: 'ent_betterstack',
        teamSize: '完全1人（自走スクリプト）',
        monthlyProfit: '月利 180万〜320万円',
        grossMargin: '97%',
        paybackDays: '即日',
        proofSnippet: 'Pythonで特定県の公共事業入札ページを毎朝クローリングし、条件に一致した案件を工務店のSlack/LINEに自動通知。1社月額4,980円で300社が継続利用中。',
      },
    },
    actionablePlaybook: {
      unbundlingAngle: '全国の入札を網羅しようとせず、「特定県・特定市町村の、ビル清掃・除雪・空調工事」など、大手が相手にしない狭小ジャンルに特化したピンポイント通知Botとして構築。',
      first10CustomersLog: '地元のビルメンテナンス・空調設備工事業者50社をGoogleマップでリスト化。「御社が参加できる市役所の入札案件が出た瞬間にLINEに即時通知するBotを組んだので、今月は無料でお使いください」とFAXまたは電話。3社がテスト利用し翌月全社有料継続。',
      threeToolStack: [
        { name: 'Puppeteer / Playwright (Python/Node)', role: '自治体HTMLヘッドレススクレイピング', cost: '無料' },
        { name: 'Cloudflare Cron Triggers & KV', role: '毎朝の定時巡回と差分検知キャッシュ', cost: '無料枠内' },
        { name: 'LINE Notify / Discord Webhook', role: '顧客専用チャンネルへの即時通知', cost: '無料' },
      ],
      totalMonthlyCost: '月額実費: 約0円〜1,500円（ほぼ完全ゼロ）',
      fatalPitfalls: '【即死地雷】相手先サーバーに負荷をかける過度なリクエストを送るな。1日1回〜2回、早朝の差分検知のみに絞り、キャッシュと比較して更新があった場合のみ通知せよ。',
      pricingRecommendation: '初期設定費 無料 ＋ 月額 4,980円/社（100社で月商50万円、原価ほぼゼロの純利益率98%）',
    },
  },
  {
    id: 'trend-creator-repurposing-engine',
    badge: 'TREND 07 / メディア自動化',
    title: 'YouTube・音声の「ショート動画切り抜き＆縦型字幕自動錬金」配管',
    subtitle: '毎月数十万円の外注費に悲鳴を上げるビジネス系YouTuberや講師から、長尺動画を預かり1クリックで10本の縦型リールを自動納品するモデル',
    growthRate: '+310%',
    heatScore: 95,
    sparklineData: [8, 15, 28, 50, 72, 95],
    category: 'CREATOR_PIPELINE',
    categoryLabel: 'メディア自動化',
    estimatedMonthlyProfit: '月利 150万〜600万円',
    difficulty: 'EASY',
    macroContext: {
      heading: '動画市場の「縦型ショート偏重」とクリエイターの外注費破産',
      whyNow: 'YouTube ShortsやInstagram Reels、TikTokの台頭で、クリエイターは長尺動画だけでなく毎日ショート動画を投稿しないと登録者が激減する構造に。しかし動画編集者を雇うと1本5,000円〜1万円かかり、月30万円以上の赤字で息切れしている。',
      targetPainWallet: '登録者1万〜10万人のビジネス系インフルエンサー・オンライン講師が抱える「ショート動画を作らないと死ぬが、外注費が高すぎて手元にお金が残らない」キャッシュ枯渇の恐怖。',
    },
    gapAndProof: {
      incumbentGap: {
        incumbentName: '動画編集クラウドソーシング（ココナラ、クラウドワークス等）',
        fatalDilemma: 'クラウドソーシングは人間の手動編集が前提のため、1本の納品に数日かかり、修正指示のやり取りで依頼者の時間が奪われる。AIで即時10本出力する全自動配管を安価で提供すると動画編集者の仕事がなくなりマッチング手数料が激減する。',
        incumbentPricing: '1本あたり 5,000円〜15,000円 ＋ 納期3〜5日',
      },
      provenPlayer: {
        name: 'OpusClip / Vizard 日本語ローカライズ運用勢',
        entityId: 'ent_midjourney',
        teamSize: '1名（自動スクリプト）',
        monthlyProfit: '月利 200万〜500万円',
        grossMargin: '88%',
        paybackDays: '3日以内',
        proofSnippet: '最新のWhisper音声認識と要約APIを組み合わせ、YouTubeのURLを入れるだけでフックのある30秒を自動検出し、字幕付き縦型動画を3分で生成するサービスを月額定額でインフルエンサーに提供。',
      },
    },
    actionablePlaybook: {
      unbundlingAngle: '全ジャンルの動画編集ではなく、「ビジネス系・教育系YouTuberのトーク動画」に特化し、話のヤマ場をAIで自動検知して縦型にトリミングする専用パイプラインを構築。',
      first10CustomersLog: '登録者3万〜10万人のYouTubeチャンネル20件の動画から、勝手に最高品質のショート動画を3本作成。「御社の動画から3分で作ったサンプルです。気に入れば毎月の全動画を月額3万円で自動切り抜き納品します」とメール。2名が即決契約。',
      threeToolStack: [
        { name: 'OpenAI Whisper / Groq API', role: '超高速文字起こしとタイムスタンプ取得', cost: '1動画数円' },
        { name: 'Remotion / FFmpeg (Docker)', role: '縦型クロップ・字幕自動レンダリング', cost: '月1,500円' },
        { name: 'Stripe Subscription', role: '月額定額保守の決済配管', cost: '成果報酬 3.6%' },
      ],
      totalMonthlyCost: '月額実費: 約2,500円〜5,000円',
      fatalPitfalls: '【即死地雷】エンタメ系やバラエティ動画に手を出すな。効果音やテロップの好みが細かすぎて修正地獄に陥る。「本人が喋っているだけのビジネス・対談動画」のみをターゲットにせよ。',
      pricingRecommendation: '月額 29,800円〜49,800円（切り抜き無制限または月15本。10人で月商30万〜50万円の完全自動化）',
    },
  },
  {
    id: 'trend-oss-selfhost-integrator',
    badge: 'TREND 08 / OSS社内導入代行',
    title: '海外爆発オープンソース（n8n, Supabase）の「自社セルフホスト構築＆保守代行」',
    subtitle: 'ZapierやMakeの毎月数十万円の従量課金にキレた企業や、機密データを米国に預けられない企業へ、自社専用VPSにOSSを立てて月額保守を抜くモデル',
    growthRate: '+275%',
    heatScore: 97,
    sparklineData: [10, 22, 38, 55, 78, 97],
    category: 'OSS_INTEGRATION',
    categoryLabel: 'OSS社内導入代行',
    estimatedMonthlyProfit: '月利 300万〜1,000万円',
    difficulty: 'MEDIUM',
    macroContext: {
      heading: 'クラウドSaaSの「従量課金インフレ」と機密データ外部流出の防衛線',
      whyNow: 'ZapierやMake、Firebaseなどの従量課金SaaSが、アクセス数やワークフロー数に応じて月数十万〜数百万円に跳ね上がる企業が続出。また「顧客データを海外SaaSに預けてはいけない」コンプライアンス規制が厳格化している。',
      targetPainWallet: '企業の情シス・情報セキュリティ責任者が抱える「SaaSの請求書が予想外に爆発して予算オーバーになる恐怖」と「個人情報漏洩で始末書を書かされる恐怖」。',
    },
    gapAndProof: {
      incumbentGap: {
        incumbentName: '大手SIer / クラウドインテグレーター',
        fatalDilemma: '大手SIerは数百万円の個別開発やAWSマネージドサービスのライセンス販売マージンで儲けているため、「月額3,000円のさくらVPSに無料のOSS（n8nやSupabase）をDockerで立てて月5万円で保守する」という小回りの効く格安パッケージを売ると自社の利益が吹き飛ぶ。',
        incumbentPricing: '初期構築 300万〜1,000万円 ＋ 月額数十万円〜',
      },
      provenPlayer: {
        name: '海外OSS国内導入パートナー',
        entityId: 'ent_betterstack',
        teamSize: '完全1人（エンジニア個人）',
        monthlyProfit: '月利 350万〜800万円',
        grossMargin: '95%',
        paybackDays: '即日〜3日',
        proofSnippet: 'GitHubで急成長するオープンソース自動化ツール「n8n」を、企業の国内クラウドや自社サーバーにDockerでセットアップし、無制限の自動化環境を構築。初期50万円＋月額5万円で20社と契約。',
      },
    },
    actionablePlaybook: {
      unbundlingAngle: 'システムを自作するのではなく、「世界最強のOSSを、日本語の現場が安心して使えるように国内VPSにインストールして保守してあげる」という黒子・翻訳者ポジションを独占。',
      first10CustomersLog: 'Xで「Zapier 高すぎ」「Make 従量課金で死んだ」とポストしているSaaS企業やWeb制作会社を検索。「n8nを貴社専用サーバーに立てれば、月額固定3,000円のサーバー代だけでワークフロー無制限に回せます。構築から連携まで代行します」とDM。3社が即日発注。',
      threeToolStack: [
        { name: 'n8n / Supabase (OSS)', role: '無制限ワークフロー自動化・自社DBコア', cost: '無料' },
        { name: 'さくらのVPS / Hetzner', role: '国内/格安クラウド実行サーバー', cost: '月2,000円〜5,000円' },
        { name: 'Uptime Kuma (OSS)', role: 'サーバー死活監視・障害自動LINE通知', cost: '無料' },
      ],
      totalMonthlyCost: '月額実費: 約3,000円（サーバー代のみ）',
      fatalPitfalls: '【即死地雷】OSSのコアコードを勝手に改造してフォークするな。バージョンアップのたびにメンテナンス不能になって炎上する。Dockerコンテナの標準イメージをそのまま使い、連携スクリプトだけを管理せよ。',
      pricingRecommendation: '初期構築費 30万〜50万円 ＋ 月額保守監視 3万〜5万円（Zapierの月20万円が月5万円になるため顧客は歓喜して永久契約）',
    },
  },
];

export interface MarketRadarLandmineItem {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  fatalityRate: string;
  burnRiskScore: number;
  fatalCategory: string;
  deadlyReason: {
    heading: string;
    mechanism: string;
    fatalMetrics: { label: string; value: string; warning: string }[];
  };
  graveyardExamples: {
    name: string;
    raisedOrLost: string;
    deathTrigger: string;
  }[];
  survivalWedge: {
    whatToAvoid: string;
    howToPivotOrSurvive: string;
  };
}

export const MARKET_RADAR_LANDMINES: MarketRadarLandmineItem[] = [
  {
    id: 'landmine-ai-wrapper',
    badge: 'LANDMINE 01 / AIラッパー即死罠',
    title: '薄い汎用AIラッパー（文章作成・要約・チャットボット）',
    subtitle: 'OpenAIやGoogleが公式アプデで無料機能追加した瞬間に差別化が消滅し、90日解約率65%で即死する罠',
    fatalityRate: '死亡率 92%',
    burnRiskScore: 98,
    fatalCategory: 'API依存・プラットフォーム即死',
    deadlyReason: {
      heading: '基礎モデル（OpenAI等）の自社機能化と、推論API原価の高止まりによるマージン圧迫',
      mechanism: 'APIを叩いて綺麗なUIを被せただけのサービスは、OpenAIが「Canvas」「GPTs」「Deep Research」などの新機能をリリースするたびに存在価値が数行のリリースノートで消滅。ユーザーは直接ChatGPTへ還流し、月額解約が雪崩を打つ。',
      fatalMetrics: [
        { label: '90日解約率 (Churn Rate)', value: '65%〜80%', warning: '穴の空いたバケツ状態で広告費が全損' },
        { label: '粗利率 (Gross Margin)', value: '15%〜25%', warning: 'トークン従量課金原価で利益が蒸発' },
        { label: '生き残り年数', value: '平均 6〜10ヶ月', warning: '次のメジャーアプデで事業蒸発' },
      ],
    },
    graveyardExamples: [
      { name: '汎用AIコピーライティングSaaS群', raisedOrLost: '累計数百億円超の資金', deathTrigger: 'ChatGPT PlusおよびGPT-4oの公式文章生成機能リリースで需要の8割が蒸発' },
      { name: '汎用PDFチャットボット群（2023年乱立）', raisedOrLost: '数億円の広告費', deathTrigger: 'ChatGPTおよびClaudeがファイル添付とPDFプレビューを標準無料搭載して一網打尽' },
    ],
    survivalWedge: {
      whatToAvoid: '「文章を自動生成する」「PDFと会話できる」という基礎モデルの能力そのものを売りにするな。絶対に無料機能で轢き殺される。',
      howToPivotOrSurvive: 'AI自体を売るのではなく、「地方自治体の古いスキャンPDFを自治体指定のCSVに直す」など、法規制・土着の現場フォーマットに埋め込まれた泥臭い配管に徹せよ。',
    },
  },
  {
    id: 'landmine-two-sided-marketplace',
    badge: 'LANDMINE 02 / 両面マッチング流動性枯渇',
    title: 'B2C両面マッチングアプリ（スキルシェア・フリマ・出会い）',
    subtitle: '「買い手」と「売り手」の両方を同時に集めなければ1円の価値も生まれず、数千万円の広告費が初月で燃え尽きる罠',
    fatalityRate: '死亡率 95%',
    burnRiskScore: 96,
    fatalCategory: '流動性トラップ・資本枯渇',
    deadlyReason: {
      heading: '鶏と卵のジレンマ（Cold-Start Problem）とプラットフォーム離脱（中抜き）',
      mechanism: '出品者がいなければ客が来ず、客がいなければ出品者が逃げる。両方を揃えるために巨額のリスティング・SNS広告費が必要。さらに一度マッチングが成立すると、双方が手数料（15〜20%）を嫌って「次回からLINEで直接取引」へ離脱し、LTVが極小化する。',
      fatalMetrics: [
        { label: '初期獲得CAC (顧客獲得単価)', value: '5,000円〜15,000円/人', warning: '少額決済の手数料では回収不能' },
        { label: '初月離脱率 (Choke Rate)', value: '85%以上', warning: '案件が見つからず出品者が即日放置' },
        { label: '中抜き率 (Platform Leakage)', value: '60%〜70%', warning: '次回以降は直接LINEで連絡' },
      ],
    },
    graveyardExamples: [
      { name: 'ローカル特化スキルシェアサービス群', raisedOrLost: '数億円の調達資金', deathTrigger: 'エリアごとの流動性を維持できず、東京以外の地方都市で過疎化して閉鎖' },
      { name: '特化型中古品フリマアプリ群', raisedOrLost: '数十億円の広告費', deathTrigger: 'メルカリの圧倒的流動性と配送網の前に出品が集まらず撤退' },
    ],
    survivalWedge: {
      whatToAvoid: '「誰でも出品できるプラットフォーム」を個人や小規模チームがゼロから作るな。資金力のある胴元にしか勝てないゲームである。',
      howToPivotOrSurvive: '両面市場を作るのではなく、「片側に立つ優良な職人3社を独占し、客をLINEで送客して15%前金で抜く」片側代行・紹介関所に徹せよ。',
    },
  },
  {
    id: 'landmine-commodity-saas',
    badge: 'LANDMINE 03 / コモディティ価格破壊',
    title: '汎用SNSスケジューラー / 汎用タスク・プロジェクト管理ツール',
    subtitle: 'Notion, Buffer, Trello, Canvaが無料枠で配っている領域に参入し、価格を月500円に下げても誰にも選ばれない罠',
    fatalityRate: '死亡率 88%',
    burnRiskScore: 90,
    fatalCategory: '大手の無料配布・コモディティ化',
    deadlyReason: {
      heading: 'スイッチングコストの不在と、巨大テックの「無料バンドル戦略」による絨毯爆撃',
      mechanism: '「タスクをカンバンで管理する」「Twitter/Instagramの投稿を予約する」という機能は完全にコモディティ化。NotionやCanvaが標準機能として無料で配っているため、新規ユーザーは1円も払う動機がない。低価格競争に突入し、サポートコストで自爆する。',
      fatalMetrics: [
        { label: '月次解約率 (Monthly Churn)', value: '10%〜15%/月', warning: '1年で既存顧客の8割が入れ替わる' },
        { label: '競合類似プロダクト数', value: '2,000件以上', warning: 'SEOでもAppStoreでも完全に埋没' },
        { label: 'ARPU (顧客平均単価)', value: '月数百円〜1,500円', warning: 'カード決済手数料と返金対応で赤字' },
      ],
    },
    graveyardExamples: [
      { name: 'インディー製SNS予約投稿ツール群', raisedOrLost: '数千時間の個人開発時間', deathTrigger: 'Twitter/XのAPI有料化（月100ドル〜）とMetaの公式予約機能強化で一網打尽' },
      { name: 'ミニマリスト向けToDoアプリ群', raisedOrLost: '無数の個人開発プロジェクト', deathTrigger: 'Apple標準リマインダーやNotionの進化によりマネタイズ不能で放棄' },
    ],
    survivalWedge: {
      whatToAvoid: '「全人類向けのシンプルなタスク管理・予約投稿」を作るな。「シンプル」は機能不足の言い訳とみなされ即解約される。',
      howToPivotOrSurvive: '「全国の歯科医院の自費診療リコールLINE自動配信」のように、特定の狭い業界のCRM・法規制と直結させた縦型ツールに偽装せよ。',
    },
  },
  {
    id: 'landmine-inventory-d2c',
    badge: 'LANDMINE 04 / 在庫＆キャッシュアウト地獄',
    title: '自社在庫保有型D2Cブランド・薄利多売Eコマース',
    subtitle: '売上高は派手に見えるが、輸送費・在庫廃棄・Meta広告費の高騰で通帳から現金が猛スピードで流出して黒字倒産する罠',
    fatalityRate: '死亡率 85%',
    burnRiskScore: 94,
    fatalCategory: '運転資本破綻・物理的在庫リスク',
    deadlyReason: {
      heading: '広告費高騰（iOSプライバシー改定以降）と、在庫という「現金の冷凍保存」による窒息',
      mechanism: '売上1,000万円でも、原価300万円＋広告費450万円＋倉庫・送料150万円＋決済手数料50万円で、手残り利益はわずか50万円。そこから次のロットの仕入れ代金（前払い300万円）を払うため、売上が伸びるほど手元現金が減り、通帳が先に干からびる。',
      fatalMetrics: [
        { label: 'ROAS (広告費用対効果)', value: '150%〜220%', warning: '初回購入では完全に赤字（LTV依存）' },
        { label: '在庫回転日数', value: '60日〜120日', warning: '現金が倉庫のダンボールに固定化' },
        { label: '最終実効手残り率', value: '3%〜8%未満', warning: '一度のセールや不良在庫で即赤字転落' },
      ],
    },
    graveyardExamples: [
      { name: '米大手D2Cマットレス・アパレル企業群', raisedOrLost: '数百億円のVC資金', deathTrigger: 'CAC高騰とリアル店舗展開の固定費に耐えきれず破産申請・叩き売り買収' },
      { name: '個人クラファンD2C物販勢', raisedOrLost: '自己資金数百万円', deathTrigger: '初回生産分の不良品率の高さと、クラファン終了後の自社EC集客不能で在庫山積み' },
    ],
    survivalWedge: {
      whatToAvoid: '自分でお金を払って工場に大量発注し、倉庫にダンボールを積むな。物理的在庫を持った瞬間に資本主義の最下層労働者になる。',
      howToPivotOrSurvive: '「TikTok Shopの無料サンプルをメーカーから取り寄せ、手元15秒動画で紹介してアフィリエイト報酬を抜く」在庫完全ゼロの送客関所に徹せよ。',
    },
  },
  {
    id: 'landmine-seo-dependent-affiliate',
    badge: 'LANDMINE 05 / アルゴリズム蒸発罠',
    title: 'SEO一本足打法のアフィリエイト・比較情報メディア',
    subtitle: 'Googleコアアルゴリズム改定とAI Overviewsの導入で検索流入が前日比80%蒸発し、修復不能の即死を遂げる罠',
    fatalityRate: '死亡率 90%',
    burnRiskScore: 95,
    fatalCategory: '検索エンジン依存・トラフィック消失',
    deadlyReason: {
      heading: 'Googleの「大手ドメイン偏重（ドメイン貸し）」と「AIによるゼロクリック検索」の挟み撃ち',
      mechanism: '個人や小規模メディアがどんなに良質な比較記事や体験談を書いても、Googleは上場企業の大手サブディレクトリ（ドメイン貸し）と公式直営サイトを最優先表示。さらに検索結果上部にAI回答が表示され、クリック自体が発生しない「ゼロクリック検索」が主流化し収益源が消滅。',
      fatalMetrics: [
        { label: 'コアアプデ時のPV蒸発率', value: '70%〜90%ダウン', warning: '予告なしに一晩で月商数百万円が数万円へ' },
        { label: 'ゼロクリック検索率', value: '約60%', warning: 'ユーザーが検索結果画面からサイトに来ない' },
        { label: '事業の売却価値 (Exit Multiple)', value: '年利の0.5倍以下に暴落', warning: '買い手がつかず無価値化' },
      ],
    },
    graveyardExamples: [
      { name: '個人アフィリエイター・ブログメディア群', raisedOrLost: '月商数百万円の事業資産', deathTrigger: '2023〜2024年Google Helpful Content Updateにより検索圏外へ一斉追放' },
      { name: '脱毛・クレカ・転職などの汎用比較サイト', raisedOrLost: '莫大な被リンク投資資金', deathTrigger: '大手ポータルサイトの独占とAI要約によりオーガニック流入が壊滅' },
    ],
    survivalWedge: {
      whatToAvoid: 'Googleのオーガニック検索順位を前提にした「〇〇 おすすめ」「〇〇 比較」ブログを作るな。検索順位の生殺与奪の権を他人に握られている。',
      howToPivotOrSurvive: '検索エンジンに頼らず、「特定業界のFAX/LINE直販」「公的入札通知Bot」「社内ツールへのワークフロー埋め込み」など、検索を経由しない直接課金配管を作れ。',
    },
  },
];

