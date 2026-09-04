import { CompanyRecord } from '../types/terminal';

export const TERMINAL_COMPANIES: CompanyRecord[] = [
  // 0-1. 実在の爆裂サクセス: outbid.lol（ジョナサン・ヴィルケ氏）
  {
    id: 'outbid-lol',
    ticker: 'SOLO-OUTBID',
    name: 'outbid.lol',
    japaneseName: 'outbid.lol（ジョナサン・ヴィルケ）',
    tagline: '3時間で作ったネタサイトが48時間で2,000万円の収益を叩き出した熱狂リーダーボード',
    scaleTier: 'SOLO_MICRO',
    businessModel: 'MICRO_SAAS',
    foundedYear: 2026,
    teamSize: 1,
    weeklyHours: 3,
    headquarters: 'ドイツ',
    verifiedStatus: 'VERIFIED_STRIPE',
    estimatedValuationJpy: 150000000,
    evMultiple: 7.5,
    isForSale: true,
    askingPriceJpy: 80000000,
    businessEssence: {
      whatItDoes: '入札額の高い順にプロダクトが並ぶだけのランキングリーダーボード',
      targetCustomer: '自分のプロダクトを目立たせたい世界中のインディー開発者・起業家',
      valueProposition: 'ProductHuntなどの不正投票に嫌気が差した起業家に、金さえ払えば確実に1位を取れる場所を提供',
      monetizationWay: '順位を争うオークション形式の直接入札決済（上位を維持するために入札額を競い合う）'
    },
    logoIcon: 'BID',
    founderAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
    productScreenshotUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop',
    founderName: 'ジョナサン・ヴィルケ',
    founderAge: '29歳 個人開発者',
    handFilters: ['SKILL_ZERO', 'ZERO_CAPITAL', 'SECOND_MOVER'],
    actionHeadline: '【48時間で2,000万円】3時間の開発と1.8ドルのドメインから生まれた世界規模の課金熱狂',
    executiveSummary: 'ドイツの29歳エンジニアが夕飯を作りながら3時間で開発。入札額の最も高いプロダクトが1位に並ぶだけのシンプルな仕組み。起業家たちの「1位を維持して宣伝したい」という承認欲求と見栄が暴走し、わずか2日間で13.2万ドル（約2,000万円）の決済が殺到した。',
    coreMoatDescription: '「無料ランキングの不正投票」を逆手に取り、「最初から金で順位を買う」という露骨なルールにしたことで世界的なバイラルが発生。エックス上での実況公開（Build in Public）が熱狂を加速させた。',
    primaryMoat: 'COUNTER_POSITIONING',
    moatScore: 92,
    tags: ['初期0円', '完全1人', '開発3時間', '48時間で2000万', 'エックス集客'],
    initialInvestmentJpy: 300,
    successStory: {
      headline: '3時間で作ったネタ投票サイトが、起業家の見栄を煽り48時間で2,000万円を強奪した手口',
      founderProfile: '毎回同じログイン画面や課金画面を作る下請け作業に飽き飽きしていた、ドイツの29歳ソフトウェア開発者（ジョナサン・ヴィルケ氏）',
      marketGlitch: '「既存のプロダクト投票サイトは裏での自作自演や不正投票ばかり。ならいっそ、堂々と金で順位を買わせるオークションにした方が起業家の承認欲求に火がつく」',
      breakthroughMoment: '1.8ドルの最安ドメインを取得し、夕飯を作りながら開発。エックスで「広告もAPIキーも不要、金で1位を買え」と投稿した瞬間、起業家たちの入札合戦が勃発。',
      actionableSteal: '「無料を謳って裏で小細工している既存業界（口コミ・ランキング）」を逆手に取り、「金で露骨に優遇されるパロディサービス」を1人のネタとして最速公開する'
    },
    personalizedRecipes: [
      {
        targetAudience: '開発やプログラミングが一切できないあなた用',
        customConcept: 'サイトを作るのをやめて「入札監視＆運用代行」にする',
        howToProfit: '「あのサイトで1位を取って自社製品を宣伝したいが、一日中入札を監視する暇がない起業家」に対し、「月額3万円で最安値での1位維持を代行します」とDMで提案し、手作業で運用フィーを抜く。'
      },
      {
        targetAudience: 'フォロワーや発信力がゼロのあなた用',
        customConcept: '世界向けSNSをやめて「身近な地元のリアル店舗」相手にする',
        howToProfit: '地元のパーソナルジムや美容室に直接行き、「駅前で一番目立つWeb枠を作ったので、月2万円で地域1位に固定しませんか？」と直談判。ペラサイト1枚をノーコードで作り、月額掲載料を直接回収する。'
      },
      {
        targetAudience: '日本の特定業界・士業向けにやりたいあなた用',
        customConcept: 'IT起業家向けをやめて「弁護士・税理士・専門家の優先相談枠」にする',
        howToProfit: '「相談の優先回答権（一番投げ銭した人の質問から優先で回答するLINE）」を特定の専門家と組んで立ち上げ、相談者からの課金手数料を30%中抜きする。'
      },
      {
        targetAudience: '日々の作業を極力減らして放置したいあなた用',
        customConcept: '自分でサイトを運営するのをやめて「真似したい人向けの型紙（素材）」を売る',
        howToProfit: '「同じような投票サイトが誰でも10分で作れる設定済みテンプレート」を作り、真似したがっているインディー開発者に買い切り5,000円で売って完全放置する。'
      }
    ],
    trapRecipe: {
      headline: '地方ライバル店舗の見栄と嫉妬心を煽り、入札金で月15万円を丸儲けする罠',
      targetPrey: '「隣の競合店にだけは負けたくない」とライバル心を燃やす、地方駅前の自営業（美容室・審美歯科・パーソナルジム）',
      trapMechanism: '「駅前で最も選ばれている店ランキング」をノーコードで1枚作成。ライバル店3社に「現在〇〇店が1位に入札しました。月額5万円で1位を奪い返せます」と案内するだけで、意地の張り合いで勝手に入札金が積み上がる。',
      pureProfitBreakdown: {
        initialCapital: '0円（ノーコード無料枠）',
        monthlyRevenue: '月5万円 × 競合3店舗 ＝ 15万円',
        systemCost: '月0円（LINEと無料フォームのみ）',
        netTakeHome: '月15万円の丸儲け（作業時間ゼロで完全放置）'
      }
    },
    derivedBusinessIdeas: [
      {
        title: '地方駅前・激戦区の「今週の地域1番店」オークション看板',
        targetNiche: '地方都市（大宮・船橋・梅田等）の美容院・脱毛サロン・パーソナルジム',
        executionSummary: '「今週、地域で1番露出されるおすすめ枠」を週単位オークション形式で販売。LINEとStripe決済だけで店舗オーナー同士を競わせ、競合の入札合戦で自動入金させる。',
        estimatedMonthlyProfit: '月利30万〜80万円（競合3〜5店舗からの自動引き落とし）'
      },
      {
        title: '国内インディー開発者・AIツールの「デイリー注目プロダクト」競売台帳',
        targetNiche: '自作AIツールやSaaSを広めたい日本の個人開発者・副業エンジニア',
        executionSummary: 'Product Huntの日本版として、毎日のトップ掲載枠を完全入札制で競売。Xでの自動告知ボットと連携し、開発者の宣伝欲・承認欲求を即時換金。',
        estimatedMonthlyProfit: '月利20万〜50万円（初期費用0円、完全自動運用）'
      },
      {
        title: '士業・コンサル向け「エリア限定・最優先相談枠」入札ディレクトリー',
        targetNiche: '税理士、行政書士、社労士などの顧客獲得に飢えている地域士業事務所',
        executionSummary: '「〇〇市でおすすめの相続税理士TOP3」などの特化ペラサイトを作成し、掲載順位を入札月額制で固定。相見積もりを嫌う士業に確約ポジションを売る。',
        estimatedMonthlyProfit: '月利40万〜100万円（10事務所×月4〜10万円）'
      }
    ],
    entryStrategy: {
      lensType: 'SECOND_MOVER',
      lensLabel: '【後出しジャンケン枠】既存大手が手を引いた「露骨な入札モデル」をニッチ市場で独占する',
      whyIncumbentCantWin: 'ProductHunt等の既存大手が露骨なオークションをやると「中立性を捨てた拝金主義」と世界中から大炎上するため、ブランドの看板が邪魔をして構造上絶対に真似できない。',
      targetVictimOrNiche: '自作プロダクトを目立たせたいインディー開発者、および特定バーティカル（士業・クリニック・美容サロン）の広告主層。',
      actionableEntryRoute: '「1番金を払った者が1位」という単純透明なルールと即時Stripe決済のみを配線し、競合同士の負けず嫌いと見栄を入札合戦へと転換する。',
      estimatedEasyProfit: '月利30万〜80万円（競合3〜5社からの自動引き落とし）'
    },
    financials: [
      { period: 'ローンチ初週', revenueJpy: 20000000, cogsJpy: 500, grossProfitJpy: 19999500, grossMarginPercent: 99.9, opexJpy: 600000, operatingProfitJpy: 19399500, operatingMarginPercent: 97.0, netIncomeJpy: 19399500, netMarginPercent: 97.0 }
    ],
    tools: [
      { name: 'supastarter (自作テンプレート)', category: '開発基盤', monthlyCostJpy: 0, purpose: '認証・決済を数分で組み込むボイラープレート', replacementDifficulty: 'LOW' },
      { name: 'Stripe', category: '決済', monthlyCostJpy: 0, purpose: '即時カード決済と自動入札反映', replacementDifficulty: 'LOW' },
      { name: 'Vercel / Cloudflare', category: 'サーバー', monthlyCostJpy: 3000, purpose: '急激なアクセス集中に耐えるホスティング', replacementDifficulty: 'LOW' }
    ],
    competitors: [
      { name: 'ProductHunt', scaleLabel: '米国巨大サイト', annualRevenueJpy: 1500000000, operatingMarginPercent: 20.0, moatSummary: '投票によるランキング（不正投票の温床）', pricingPower: '中' }
    ],
    initialTractionStrategy: 'エックス上でドメイン取得から実装風景までを実況投稿（Build in Public）。起業家たちのタイムラインを巻き込み、最初の数時間で口コミ拡散。',
    proSecretInsight: '入札額が更新されるたびにエックスの自動ボットが「〇〇社が1位を奪還！」と自動ツイートする仕掛けを組み込み、起業家の負けず嫌いとフォロワーへのアピール欲を強制点火した。',
    passbookDetails: {
      monthlyGrossJpy: 20000000,
      paymentFeeJpy: 600000,
      infraCostJpy: 3000,
      outsourcingJpy: 0,
      founderTakeHomeJpy: 19397000,
      taxReserveJpy: 5800000,
      bankStatementDate: 'ローンチ48時間確定明細'
    },
    playbook: {
      difficulty: '極めて容易',
      setupDays: 1,
      monthlyCustomersFor1MJpy: 10,
      step1: '既存の有名ランキングや比較サイトの不満（サクラ・ステマ・不正）を1つ特定する。',
      step2: '「完全入札制（1番金を払った奴が1番上に載る）」という極限まで単純な1枚ペラサイトをテンプレートで立ち上げる。',
      step3: 'エックスで「金で順位を買うサイト作ったった」とネタとして放流し、承認欲求の強い小金持ち起業家に喧嘩を売る。',
      copyPasteScript: 'No ads. No API keys. Just outbid your competitors to rank #1 and consider marketing done for today 🚀'
    },
    proDossier: {
      monetizationTrick: {
        corePsychologicalTrigger: '「ライバル企業より下に落ちたくない」という起業家の見栄と狂気の承認欲求',
        pricingPowerSecret: '定価を決めず「オークション形式」にしたため、値引き交渉の余地が物理的にゼロ。順位を死守するために客自身が入札額を跳ね上げる。',
        cashflowVelocity: 'Stripeによるカード即時決済。入札ボタンを押した瞬間にカードから引き落とされ、売掛金や未回収リスクが1円も存在しない。'
      },
      incumbentBlindspot: {
        whyGiantsCantEnter: 'ProductHuntなどの大手が「露骨な金儲けオークション」をやると「中立性を捨てた拝金主義」と世界中から大炎上するため、絶対に真似できない。',
        moatAgainstCopycats: 'ドイツの個人エンジニアが夕飯を作りながら作ったという「愛されるパロディ感」とXでの初動バズ。後発が真面目に真似しても「二番煎じの金儲け」と冷笑されるため、個人ネタ枠として不可侵の地位を確立。'
      },
      sevenDayBlueprint: {
        day1to2OfferSetup: '【餌の仕込み】無料のNext.jsテンプレートを取得し、リーダーボード画面とStripe決済のみを配線。デザインに凝らず1枚完結にする。',
        day3to4CashflowPipe: '【集金ライン開通】Stripe CheckoutとWebhookを連動。入金完了イベントを検知して即座にDBの順位を書き換える自動集金ループを開通。',
        day5to6FirstCustomers: '【初期3人強奪】Xで「金で順位を買うサイト作った」と短尺動画で公開。直近でランキングに不満を漏らしていた知り合いの起業家3人にDMで直接投げ込む。',
        day7AutomationEngine: '【不労化完成】入札順位の変動を検知してXに自動投稿するボットを配備。ユーザー同士が勝手に入札合戦を繰り広げる完全放置の集金装置が完成。'
      }
    },
    first100CustomersStrategy: {
      tacticalChannel: 'X（旧Twitter）のインディー開発者界隈 ＆ 不正投票に怒っていた起業家のタイムライン',
      exactAction: '1.8ドルのドメインを買い、夕飯を作りながら作った画面を動画で撮影。「広告枠の商談とか面倒だから、金払った奴を1位にするサイト作った」と1行ツイート。直近でProductHuntで悔しい思いをした起業家3人にリプライ。',
      conversionProof: '投稿から42分で最初の1人が入札（5ドル）。直後にライバルが15ドルで上書きし、6時間で入札額が1,000ドルを突破、48時間で2,000万円到達。'
    },
    earlyFailureLesson: {
      wastedMoneyOrTime: '過去3年間の下請け受託開発（累計500万円以上の未払いと数百時間の深夜残業）',
      whatWentWrong: '「機能が多ければ売れる」と信じ込み、過去に作ったSaaSは3ヶ月かけて複雑な管理画面を作ったが、登録者ゼロで爆死。',
      pivotMoment: '「機能など1つでいい。人間は機能を買っているのではなく『感情（見栄）』を買っている」と気づき、機能を極限まで削ぎ落としてオークション1本に絞った瞬間に爆発した。'
    },
    pricingDesign: {
      pricingTiers: '最低入札額5ドル〜上限なしの動的オークション制（1位維持のために入札額が釣り上がる）',
      freeTrialHook: '無料枠は一切なし（閲覧は無料、掲載は1セントたりとも妥協せず完全前払い決済）',
      averageOrderValue: '平均入札単価 約48,000円（最高単価は1社で35万円以上の連続入札）'
    },
  },

  // 0-2. 実在の爆裂サクセス: 週5時間で月900万の23歳ドイツ人
  {
    id: 'habit-app-23yo',
    ticker: 'SOLO-HABIT',
    name: 'Minimal Habit Tracker',
    japaneseName: '週5時間労働習慣アプリ（23歳ドイツ人）',
    tagline: '世界中を旅しながら週5時間労働で月900万円を着金させる23歳天才の手口',
    scaleTier: 'SOLO_MICRO',
    businessModel: 'MICRO_SAAS',
    foundedYear: 2025,
    teamSize: 1,
    weeklyHours: 5,
    headquarters: 'ベルリン / ノマド',
    verifiedStatus: 'VERIFIED_STRIPE',
    estimatedValuationJpy: 320000000,
    evMultiple: 3.0,
    isForSale: false,
    businessEssence: {
      whatItDoes: '1日1回ボタンをタップして習慣を記録するだけの極小単機能スマートフォンアプリ',
      targetCustomer: '複雑な自己管理アプリに挫折した世界中の若者・スマホ中毒者',
      valueProposition: '多機能すぎて使いこなせない既存アプリを捨て、1秒で達成感を味わえるミニマル体験を提供',
      monetizationWay: '年額4,000円または月額600円のアップルストア自動更新定期課金（サブスク）'
    },
    logoIcon: 'HABIT',
    founderAvatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
    productScreenshotUrl: 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=800&h=450&fit=crop',
    founderName: '23歳ドイツ人開発者',
    founderAge: '23歳 ノマド起業家',
    handFilters: ['PASSIVE', 'ZERO_CAPITAL', 'SECOND_MOVER'],
    actionHeadline: '【月利900万円・週5時間】旅する23歳が多機能を全廃して掴んだ不労課金の仕組み',
    executiveSummary: '23歳のドイツ人開発者が大学を中退し、世界中を旅しながら開発。既存の習慣アプリが多機能で重すぎることに着目し、画面中央の丸を1回押すだけの極小アプリを構築。TikTokのライフスタイル動画で集客し、月900万円の定期購読収入を完全一人・週5時間の保守で稼ぎ出す。',
    coreMoatDescription: '「多機能」を競う競合と真逆を行く「削ぎ落としの美学」。年額課金がデフォルトのため一度課金されると解約率が極めて低く、継続的なキャッシュが自動蓄積される。',
    primaryMoat: 'BRANDING',
    moatScore: 88,
    tags: ['完全1人', '週5時間労働', '月利900万', '年額サブスク', '旅する起業家'],
    initialInvestmentJpy: 15000,
    successStory: {
      headline: '世界中を旅しながら週5時間労働で月900万円を自動着金させた23歳天才の手口',
      founderProfile: '大学を中退し、リュック1つで世界を周りながらコードを書く23歳の個人開発者',
      marketGlitch: '「競合アプリは機能を増やしすぎて使いづらい。1日1回タップするだけの極小アプリこそ挫折せず、年額課金の解約を忘れる」',
      breakthroughMoment: 'TikTokで「海外を旅しながら週5時間だけ働く日常」を晒し、アプリを自然に露出。広告費ゼロでオーガニックに100万ダウンロードを突破。',
      actionableSteal: '「多機能化」をやめ、1つのボタンを押すだけのミニマルアプリを作り、ライフスタイル訴求のショート動画で集客する'
    },
    personalizedRecipes: [
      {
        targetAudience: 'アプリ開発ができないあなた用',
        customConcept: 'アプリを作らず「LINEオープンチャットの朝活サークル」にする',
        howToProfit: 'アプリ開発費ゼロ。「毎朝6時に起きて証拠写真を貼るだけ」のLINEグループを作り、月額1,500円の会費を集めて完全自動化運営する。'
      },
      {
        targetAudience: '動画で顔出ししたくないあなた用',
        customConcept: '顔出し動画をやめて「スマホ画面録画＋静かな作業音」にする',
        howToProfit: 'カフェで無言でスマホを操作する手元だけの動画をTikTokに量産。「この習慣だけで人生変わった」と文字入れし、アフィリエイトリンクやアプリへ誘導する。'
      },
      {
        targetAudience: '日本のビジネスマン向けにやりたいあなた用',
        customConcept: '習慣をやめて「資格試験の単語暗記・毎日1問ボット」にする',
        howToProfit: '宅建やTOEIC受験生向けに、毎日決まった時間に1問だけ届くLINE公式アカウントを構築。月額980円で受験日まで解約されないストック収入を作る。'
      },
      {
        targetAudience: '一度作ったら一切手を動かしたくないあなた用',
        customConcept: 'Notionやスプレッドシートの「極小習慣テンプレート」にして売る',
        howToProfit: 'アプリではなくNotionのテンプレートとして1日1クリックの習慣シートを作成。Gumroadで1個1,200円で販売し、SNSで自動告知して不労所得化する。'
      }
    ],
    trapRecipe: {
      headline: '三日坊主の罪悪感を逆手に取り、月額1,500円を自動回収するLINEサークルの罠',
      targetPrey: '「早起きや運動を続けたいがいつも3日で挫折する」全国の自己投資ワーカー',
      trapMechanism: 'アプリ開発ゼロ。「毎朝6時までに起きてLINEに写真を貼らないと強制退会」のデポジット制グループを作る。ルールを守れなかった人の参加費は全員で山分けされる仕組みにし、勝手に継続させる。',
      pureProfitBreakdown: {
        initialCapital: '0円（LINEオープンチャット無料）',
        monthlyRevenue: '月額1,500円 × 参加者100名 ＝ 15万円',
        systemCost: '月0円（ボット自動化無料枠）',
        netTakeHome: '月15万円の完全不労所得（週1時間の見守りのみ）'
      }
    },
    entryStrategy: {
      lensType: 'SECOND_MOVER',
      lensLabel: '【後出しジャンケン枠】先駆者の「英語・多機能アレルギー」を突いてLINEで回収する',
      whyIncumbentCantWin: '先駆者のドイツ人開発者はApp Storeのアプリしか作っておらず、日本の「LINE文化」や「コミュニティで励まし合う空気」には一生対応できない。',
      targetVictimOrNiche: '海外アプリの英語UIに挫折し、一人で黙々とボタンを押すのが寂しくてやめてしまった日本の副業・受験層。',
      actionableEntryRoute: 'アプリをインストールさせず、LINE公式アカウントだけで動く「1日1回タップ記録ボット」をMakeで即日立ち上げる。',
      estimatedEasyProfit: '月利20万〜60万円（LINE会員200〜600名）'
    },
    financials: [
      { period: '2025通期', revenueJpy: 108000000, cogsJpy: 16200000, grossProfitJpy: 91800000, grossMarginPercent: 85.0, opexJpy: 3000000, operatingProfitJpy: 88800000, operatingMarginPercent: 82.2, netIncomeJpy: 88800000, netMarginPercent: 82.2 }
    ],
    tools: [
      { name: 'Flutter / Swift', category: '開発', monthlyCostJpy: 0, purpose: 'iOSアプリ本体', replacementDifficulty: 'LOW' },
      { name: 'RevenueCat', category: '課金基盤', monthlyCostJpy: 15000, purpose: 'アプリ内課金の自動管理', replacementDifficulty: 'LOW' },
      { name: 'CapCut', category: '動画編集', monthlyCostJpy: 1500, purpose: 'TikTok集客動画の作成', replacementDifficulty: 'LOW' }
    ],
    competitors: [
      { name: 'Habitica', scaleLabel: '老舗ゲーミフィケーション', annualRevenueJpy: 300000000, operatingMarginPercent: 35.0, moatSummary: 'RPG要素（設定が面倒）', pricingPower: '中' }
    ],
    initialTractionStrategy: 'TikTokで「海外のカフェで朝起きてアプリの数字を見て海に行く」ショート動画を週3本投稿。動画の最後に「使ってるアプリはこれ」と自然に紹介。',
    proSecretInsight: '初回起動時に「無料トライアル開始」を押し忘れ防止リマインダー通知とセットで許諾させ、そのまま年額プランへスムーズに移行させるファネル設計。',
    passbookDetails: {
      monthlyGrossJpy: 9000000,
      paymentFeeJpy: 1350000,
      infraCostJpy: 25000,
      outsourcingJpy: 0,
      founderTakeHomeJpy: 7625000,
      taxReserveJpy: 2280000,
      bankStatementDate: '月間平均アップルストア着金'
    },
    playbook: {
      difficulty: '普通',
      setupDays: 14,
      monthlyCustomersFor1MJpy: 250,
      step1: 'App Storeで星3以下のレビューを調べ、「機能が多すぎて使いづらい」と嘆かれているジャンルを探す。',
      step2: '機能を1つに絞った単機能アプリをノーコード（FlutterFlow等）で組む。',
      step3: '「このアプリで人生変わった」系のエモい縦型動画をTikTok/Reelsに投下する。',
      copyPasteScript: 'I got tired of bloated habit apps, so I built one that literally takes 1 second a day.'
    },
    proDossier: {
      monetizationTrick: {
        corePsychologicalTrigger: '「自己嫌悪からの逃避」。三日坊主で自分を責めている人に「これなら1秒だから続けられる」と救済感を与えて財布を開かせる。',
        pricingPowerSecret: '月額600円と年額3,900円を並べ、「年額なら月額の65%オフ」と錯覚させて全員に年額一括払いを即決させる。解約忘れ率が80%を超える設計。',
        cashflowVelocity: 'Apple Storeによる自動更新。毎年同じ月に全ユーザーから一括で3,900円が口座に振り込まれ、月次維持費はサーバー代2万円のみ。'
      },
      incumbentBlindspot: {
        whyGiantsCantEnter: '大手アプリ企業は機能数を減らすと「開発者の仕事がなくなる」ため、会議で削ぎ落としを提案した瞬間に社内政治で握りつぶされる構造的ジレンマ。',
        moatAgainstCopycats: '「開発者の旅するライフスタイル動画」とアプリの世界観が一体化しているため、中国のコピー業者が同じUIを作ってもブランド愛着を奪えない。'
      },
      sevenDayBlueprint: {
        day1to2OfferSetup: '【餌の仕込み】Flutterのオープンソース習慣コードをクローンし、不要な全画面を削除して真ん中の丸ボタン1個だけを残す。',
        day3to4CashflowPipe: '【集金ライン開通】RevenueCatのSDKを組み込み、年額3,900円の課金ポップアップを起動直後に表示するよう配線。',
        day5to6FirstCustomers: '【初期3人強奪】Redditのサブレディット（r/getdisciplined）に「既存アプリが重すぎて作った極小アプリ」と愚痴を添えて投稿し最初の50人を獲得。',
        day7AutomationEngine: '【不労化完成】CapCutで手元操作動画を3本撮りため、TikTokに予約投稿。あとは旅の飛行機に乗るだけで自動入金が開始。'
      }
    },
    first100CustomersStrategy: {
      tacticalChannel: '海外掲示板Redditの自己規律コミュニティ（r/getdisciplined）',
      exactAction: '「既存アプリが重すぎてイライラしたから、1秒で終わるボタンだけのアプリ作った。広告もないから勝手に使ってくれ」と投稿。',
      conversionProof: '投稿から半日で1,200ダウンロード、そのうち84人が年額課金（約33万円即時売上）'
    },
    earlyFailureLesson: {
      wastedMoneyOrTime: '最初の開発期間6ヶ月と貯金120万円の消耗',
      whatWentWrong: 'カレンダー連携、メモ機能、グラフ分析などを盛り込みすぎて「誰にも使われない複雑なゴミ」を作り大爆死した。',
      pivotMoment: '「全部消せ！」と激怒し、画面の95%を削ぎ落として丸ボタン1個にした翌週からダウンロード数が100倍に跳ね上がった。'
    },
    pricingDesign: {
      pricingTiers: '年額3,900円（一番人気・92%が選択） / 月額600円',
      freeTrialHook: '3日間無料トライアル（Apple IDで1タップ登録、期間終了後に自動年額課金）',
      averageOrderValue: '客単価 3,900円（LTV 約8,500円・平均2.2年継続）'
    },
  },

  // 0-3. 実在の爆裂サクセス: 26日で1,500万円売却のカレブ・ディーン氏
  {
    id: 'running-app-caleb',
    ticker: 'SOLO-CALEB',
    name: 'Social Running Tracker',
    japaneseName: '26日売却ランニングアプリ（カレブ・ディーン）',
    tagline: '公開からたった26日で1,500万円以上で事業売却・株式30%を残した23歳の手口',
    scaleTier: 'SOLO_MICRO',
    businessModel: 'MICRO_SAAS',
    foundedYear: 2026,
    teamSize: 1,
    weeklyHours: 10,
    headquarters: '米国',
    verifiedStatus: 'VERIFIED_STRIPE',
    estimatedValuationJpy: 15000000,
    evMultiple: 5.0,
    isForSale: true,
    askingPriceJpy: 15000000,
    businessEssence: {
      whatItDoes: 'ランニングの連続継続日数（ストリーク）を友達と自慢し合うソーシャルランニングアプリ',
      targetCustomer: '走った記録をインスタやTikTokでシェアして認められたいZ世代ランナー',
      valueProposition: '孤独なランニングをゲーミフィケーション化し、友達とサボれない仕組みを提供',
      monetizationWay: '月額制プレミアムメンバーシップおよび初期バイラル後の事業一括売却（M&A）'
    },
    logoIcon: 'RUN',
    founderAvatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    productScreenshotUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=450&fit=crop',
    founderName: 'カレブ・ディーン',
    founderAge: '23歳 連続起業家',
    handFilters: ['SECOND_MOVER', 'ZERO_CAPITAL'],
    actionHeadline: '【26日で1,500万円売却】初期の爆発的熱狂を演出し、事業を即座に現金化した裏ワザ',
    executiveSummary: '23歳の開発者カレブ・ディーン氏が立ち上げたランニングアプリ。Z世代ランナーの「走ったことを友達に自慢したい」という承認欲求に特化。公開直後からエックスで熱狂的なコミュニティを形成し、わずか26日目に事業売却プラットフォームで1,500万円以上での買収提案を獲得。株式の30%を保持したまま現金を手に入れた。',
    coreMoatDescription: '「走る記録」ではなく「ストリーク（連続記録）が途切れる恐怖」と「仲間の視線」による強力な社会的スイッチングコスト。',
    primaryMoat: 'NETWORK_EFFECTS',
    moatScore: 90,
    tags: ['完全1人', '26日で1500万売却', '株式30%維持', 'M&A出口', '初期バイラル'],
    initialInvestmentJpy: 20000,
    successStory: {
      headline: '公開からたった26日で1,500万円以上で事業売却・株式30%を残した23歳の手口',
      founderProfile: '23歳でAIとノーコードを駆使してアプリを連続量産する個人開発者（カレブ・ディーン氏）',
      marketGlitch: '「大手のランニングアプリは機能が重すぎてソーシャル機能が弱い。走った成果を友達に自慢したいZ世代の承認欲求が放置されている」',
      breakthroughMoment: '公開直後からエックスとTikTokでランナー界隈に直接アプローチ。初期のエンゲージメントが爆発した瞬間を見計らい、買収プラットフォームに即座に出品して買い手を見つけた。',
      actionableSteal: 'アプリを何年も長期運営するのではなく、「初期トラクション（初速の熱狂）」が出た瞬間に事業売却プラットフォームで高値で売り抜ける'
    },
    personalizedRecipes: [
      {
        targetAudience: 'アプリ開発ができないあなた用',
        customConcept: 'アプリではなく「Instagram特化のランナーコミュニティ」にする',
        howToProfit: 'アプリ開発ゼロ。「月間100km走った人を毎日ストーリーズで表彰するアカウント」を作り、ランニングシューズやサプリのPR案件と、有料メンバーシップで稼いでアカウントごと売却する。'
      },
      {
        targetAudience: '長期運営やカスタマーサポートが嫌いなあなた用',
        customConcept: '最初から「初速だけ作って1ヶ月以内に売り抜ける」前提で動く',
        howToProfit: 'トレンドになっているキーワード（例: AI英語、筋トレ記録）のツールを作り、初月に100人集客した実績スクショを添えて事業売買サイト（ラッコM&A等）に即出品し、数十万〜数百万円で即時売却する。'
      },
      {
        targetAudience: '地元のリアルな人間関係があるあなた用',
        customConcept: 'オンラインをやめて「地元の社会人ランニングクラブ・朝活コミュニティ」にする',
        howToProfit: '休日の公園で集まるランニングコミュニティを立ち上げ、参加費1回1,000円や月額サブスク、オリジナルTシャツ販売で小さく手堅く月20万円の利益を確定させる。'
      },
      {
        targetAudience: 'ノーコードやAIツールが使えるあなた用',
        customConcept: '「ストリーク（連続記録）判定」のLINEボットを作って売却する',
        howToProfit: 'Make（Integromat）とLINE公式アカウントを連携させ、毎日の目標達成を報告すると連続日数がカウントされる仕組みを構築。受験生やダイエット層に提供し、初速が出たら事業譲渡する。'
      }
    ],
    trapRecipe: {
      headline: '初速の熱狂だけを演出し、運営がダルくなる前に事業売却市場で売り抜ける罠',
      targetPrey: '「自分で0からアプリを作る技術はないが、すでにユーザーが動いているアプリを買収したい」IT企業の経営者や富裕層',
      trapMechanism: 'アプリを長期運営するのを最初から諦める。初月に友達やSNSで100人集めた実績グラフのスクショを撮り、「月利20万円確定・成長率300%」の看板を掲げて事業売買市場（ラッコM&A等）に出品。一括でまとまった現金を手に入れる。',
      pureProfitBreakdown: {
        initialCapital: '2万円（ドメイン・ツール代）',
        monthlyRevenue: '事業売却代金: 300万〜1,500万円（一括着金）',
        systemCost: '月3,500円（データベース代のみ）',
        netTakeHome: '【一括300万〜1,500万円の現金強奪】（保有株の配当も残る）'
      }
    },
    entryStrategy: {
      lensType: 'SECOND_MOVER',
      lensLabel: '【後出しジャンケン枠】「ランニング」以外のニッチな継続（筋トレ・禁酒・勉強）で即売り抜ける',
      whyIncumbentCantWin: '先駆者はランニングしか見ておらず、日本のニッチな資格勉強（社労士・簿記）やダイエット習慣の市場には一生参入してこない。',
      targetVictimOrNiche: '勉強記録をSNSでシェアして承認欲求を満たしたい、日本の資格試験受験生やダイエット層。',
      actionableEntryRoute: '「毎日の学習継続日数」をTwitterに自動投稿するだけの簡易Webアプリを1週間で作成し、初動のユーザーがついた瞬間にラッコM&Aに出品する。',
      estimatedEasyProfit: '一括売却益100万〜300万円（年3回の売却サイクルで年商千万円）'
    },
    financials: [
      { period: '初月（売却時）', revenueJpy: 3000000, cogsJpy: 300000, grossProfitJpy: 2700000, grossMarginPercent: 90.0, opexJpy: 200000, operatingProfitJpy: 2500000, operatingMarginPercent: 83.3, netIncomeJpy: 15000000, netMarginPercent: 500.0 }
    ],
    tools: [
      { name: 'React Native', category: 'アプリ開発', monthlyCostJpy: 0, purpose: 'クロスプラットフォームアプリ開発', replacementDifficulty: 'LOW' },
      { name: 'Supabase', category: 'データベース', monthlyCostJpy: 3500, purpose: 'ユーザー認証と走行データ保存', replacementDifficulty: 'LOW' },
      { name: 'Acquire.com', category: '売却窓口', monthlyCostJpy: 0, purpose: '買収希望者とのマッチングと売却契約', replacementDifficulty: 'LOW' }
    ],
    competitors: [
      { name: 'Strava', scaleLabel: '世界大手', annualRevenueJpy: 35000000000, operatingMarginPercent: 15.0, moatSummary: '本格アスリート向け巨大コミュニティ', pricingPower: '高' }
    ],
    initialTractionStrategy: '地元のランニングクラブに潜入し、メンバーに直接アプリを触ってもらいフィードバックを獲得。彼らがインスタのストーリーズに投稿する画像を自動生成する機能を実装。',
    proSecretInsight: '買収交渉時、「全部を売り払う」のではなく「70%を売却して現金1,500万円を受け取り、30%の株式を残して将来のアップサイドも握る」というストラクチャーを提案し、買い手の信頼を獲得した。',
    passbookDetails: {
      monthlyGrossJpy: 15000000,
      paymentFeeJpy: 450000,
      infraCostJpy: 3500,
      outsourcingJpy: 0,
      founderTakeHomeJpy: 14546500,
      taxReserveJpy: 3000000,
      bankStatementDate: '事業売却代金着金明細'
    },
    playbook: {
      difficulty: '普通',
      setupDays: 7,
      monthlyCustomersFor1MJpy: 1,
      step1: '「友達と一緒にやらないとサボる」ジャンル（運動、勉強、禁煙、貯金）を選ぶ。',
      step2: '記録をオシャレな画像にしてSNSに1タップで投稿できるアプリを作る。',
      step3: '初速の数字（DAU1,000人など）が出たら、運営に飽きる前にAcquire.comに出品して売却金を手に入れる。',
      copyPasteScript: 'Sold my running app in 26 days for $100k+ while keeping 30% equity. Here is the exact playbook.'
    },
    proDossier: {
      monetizationTrick: {
        corePsychologicalTrigger: '「買い手の欲と焦り」。買い手のIT起業家は「ゼロから開発する時間を金で買いたい」「ライバルに奪われたくない」と焦っている。',
        pricingPowerSecret: '「全株売却ではなく70%売却で株式30%を残す」と提案。買い手は「創業者が逃げない」と安心し、値引き交渉ゼロで1,500万円の現金を即決送金した。',
        cashflowVelocity: '買収エスクローサービス（Acquire.com）による即時着金。契約締結から3営業日で1,500万円が銀行口座に着金。'
      },
      incumbentBlindspot: {
        whyGiantsCantEnter: 'StravaやNikeなどの巨人は「走った距離と速度の測定」に特化しており、Z世代の「オシャレなストーリーズ投稿画面」という軽薄な需要を軽視していた。',
        moatAgainstCopycats: '「初速で売却する」こと自体が戦略であるため、後発コピー業者が真似して開発を始めた頃には、すでに1,500万円を現金化して逃げ切っている。'
      },
      sevenDayBlueprint: {
        day1to2OfferSetup: '【餌の仕込み】React Nativeの走行計測ボイラープレートを使い、走った後にインスタ映えする画像を自動生成する画面だけを組む。',
        day3to4CashflowPipe: '【集金ライン開通】Acquire.com（日本ならラッコM&A）に売却希望アカウントを開設し、Googleアナリティクスを接続。',
        day5to6FirstCustomers: '【初期3人強奪】地元のランニングサークルに突撃し、走った後のスクショをメンバーにインスタ投稿してもらい初速1,000DLを演出。',
        day7AutomationEngine: '【不労化完成】売却リストに「急成長中・26日でMAU爆発」とタイトルをつけて公開。複数の買い手から即日買収打診を獲得。'
      }
    },
    first100CustomersStrategy: {
      tacticalChannel: '地元の大学ランニングクラブとInstagramストーリーズ',
      exactAction: '走った記録がそのままネオンカラーのオシャレな画像になる機能を実装し、走者に「これストーリーズに載せてみて」と依頼。',
      conversionProof: '最初の週末に20人が投稿し、その友達が次々にインストールして月曜の朝には300ダウンロードを突破。'
    },
    earlyFailureLesson: {
      wastedMoneyOrTime: '過去に作った3つのアプリ（累計8ヶ月の無給労働）',
      whatWentWrong: '「長年愛されるアプリを作ろう」としてアップデートを繰り返し、運営に疲弊してアクセスが落ち、1円も売れずに放置した。',
      pivotMoment: '「アプリを育てるな、初速の熱狂だけを作って即売却しろ」と気づき、長期運営を一切やめて26日で売却することに全集中した。'
    },
    pricingDesign: {
      pricingTiers: '事業売却価格 1,500万円一括（株式70%譲渡） ＋ 将来配当権（株式30%保有）',
      freeTrialHook: 'アプリ自体は完全無料（ユーザー獲得効率を最大化し、買収査定額を吊り上げるため）',
      averageOrderValue: '売却案件単価 15,000,000円'
    },
  },

  // 1. 巨大企業: キーエンス
  {
    id: 'keyence-6861',
    businessEssence: {
      whatItDoes: '工場の生産ラインで不良品をミリ秒で検知する高精度センサー・測定器の開発メーカー',
      targetCustomer: '自動車・電子部品・半導体・食品などの全国大手製造工場',
      valueProposition: '工場ラインの故障停止や欠陥品の流出による億単位の損害を即日出荷と直販技術で未然に防ぐ',
      monetizationWay: '代理店を一切挟まない直接販売による高単価測定機器の定価販売（値引きゼロ）'
    },
    logoIcon: 'KEY',
    founderAvatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=faces',
    productScreenshotUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=450&fit=crop',
    founderName: '滝崎武光',
    founderAge: 'キーエンス創業者',
    handFilters: ['GIANT_CRUMBS', 'NO_AUDIENCE'],
    ticker: '6861.T',
    name: 'KEYENCE Corporation',
    japaneseName: '株式会社キーエンス',
    tagline: '代理店を完全排除した直接販売と即日出荷で営業利益率51%を継続創出するFAの覇者',
    scaleTier: 'MEGA_CORP',
    businessModel: 'B2B_DIRECT',
    foundedYear: 1974,
    teamSize: 10500,
    weeklyHours: 45,
    headquarters: '大阪府大阪市東淀川区',
    verifiedStatus: 'AUDITED_PUBLIC',
    estimatedValuationJpy: 16800000000000,
    evMultiple: 14.3,
    isForSale: false,
    actionHeadline: '【粗利率83%】代理店排除の直接販売と即日出荷網により、年間5,960億円の営業現金を創出',
    executiveSummary: '工場の自動化（FA）用センサー、測定器、画像処理機器の世界的メーカー。自社工場を持たない完全ファブレス体制と、顧客工場に入り込んで潜在課題を直接聞き出す直販営業網を両立。新製品の約7割が世界初・業界初。',
    coreMoatDescription: '代理店を一切通さない直販営業が顧客工場の歩留まり改善を直接提案。午後5時までの発注を即日出荷する物流網により、工場停止リスクに怯える製造業にとって他社への乗り換え動機が完全に消滅。',
    primaryMoat: 'PROCESS_POWER',
    moatScore: 98,
    tags: ['巨大独占', '直販モデル', '粗利83%', '営業利益率51%', 'B2B製造'],
    initialInvestmentJpy: 10000000,
    successStory: {
      headline: '代理店を全廃し「即日出荷」と「顧客工場の故障防止」に狂気集中して粗利83%を叩き出した独占の軌跡',
      founderProfile: '1974年兵庫県で創業。当初の下請け機械製造から、壊れにくいセンサー開発へ舵を切った滝崎武光氏',
      marketGlitch: '「代理店を通すと顧客の声が届かず、他社との値引き合戦に巻き込まれる。工場は機械が止まるのを何より恐れているから、即納できるなら定価でも喜んで買う」',
      breakthroughMoment: '代理店を完全排除し、自社社員が全国の工場長へ直接デモ機を持ち込み。「機械を止めない即日出荷」で相見積もりを無力化し、利益率50%超の直販帝国を確立。',
      actionableSteal: '「中抜き業者（代理店・仲介）」を排除し、「顧客のダウンタイム（停止損失）を即座に防ぐ安心料」として値引きゼロの高単価で直販する'
    },
    personalizedRecipes: [
      {
        targetAudience: '高精度センサーなんて開発できないあなた用',
        customConcept: '自社開発をやめて「他社ツールの直販・導入コンサルタント」になる',
        howToProfit: '既存のSaaSやAIツールの代理店になり、自ら中小企業を直接訪問。「現場の業務停止を防ぐ即日サポート」をセットにして月額20万円のコンサル料を直販で取る。'
      },
      {
        targetAudience: '在庫や工場を持つ資金がないあなた用',
        customConcept: '完全ファブレス（製造外注）の「ニッチ特定用途オリジナル工具・グッズ」にする',
        howToProfit: '製造は国内の町工場に委託し、自らは「特定の職人（例: レザークラフト、特殊清掃）」向けの超高単価な専用道具だけをネットで直販し、粗利70%を確定させる。'
      },
      {
        targetAudience: '地方在住で身軽に動けるあなた用',
        customConcept: 'キーエンスの「即日出荷」を真似した「地元工場の緊急部品調達ランナー」になる',
        howToProfit: '地元の工場と月額顧問契約を結び、「ライン停止時の緊急部品を2時間以内に届ける特急便」を提供。部品の定価＋緊急出動費3万円で相見積もりを無力化する。'
      },
      {
        targetAudience: '営業トークや値引き交渉が苦手なあなた用',
        customConcept: 'キーエンス式「値引きゼロ・デモ機先行送付」のコンテンツ販売にする',
        howToProfit: 'サービスの一部を無料で試せるデモ（サンプル）を先に送りつけ、「もし気に入らなければ送り返して構いません」という条件で定価販売。相見積もりを封殺する。'
      }
    ],
    trapRecipe: {
      headline: '町工場の「人手不足と不良品流出の恐怖」を突く、iPad格安AI検査の罠',
      targetPrey: '「検品の人手が足りず、もし不良品を出したら大手取引先を切られる」と夜も眠れない地方の町工場長',
      trapMechanism: 'キーエンスの500万円の見積もりを見せてもらった直後に訪問。「中古iPadと無料AIで、まったく同じ不良品検知が初期10万円＋月1.5万円で動きます」と実演。比較対象が500万円なので即決で契約が取れる。',
      pureProfitBreakdown: {
        initialCapital: '3万円（中古iPad・スタンド代）',
        monthlyRevenue: '初期10万円 ＋ 月額1.5万円 × 30社 ＝ 月45万円',
        systemCost: '月3,000円（クラウドAI API代）',
        netTakeHome: '【月44万7,000円の安定ストック】（キーエンスのブランド力を逆利用）'
      }
    },
    derivedBusinessIdeas: [
      {
        title: '中古iPad×無料画像認識AIによる「零細町工場向け格安不良品検知」',
        targetNiche: 'キーエンスの500万円の見積もりに絶望した全国の従業員5〜20名の町工場',
        executionSummary: '中古iPadとスタンドを持参し、工場のライン横で即日デモ。「初期10万円＋月額1.5万円」で設置し、キーエンスの1/30の価格で即決契約を獲得。',
        estimatedMonthlyProfit: '月利60万〜150万円（町工場40社との月額保守ストック）'
      },
      {
        title: '地元製造業専門「2時間納品・緊急パーツ調達ランナー特急便」',
        targetNiche: '「ラインが止まると1時間で数百万円の損害が出る」地元の工業団地・加工工場',
        executionSummary: '月額3万円の基本顧問料で契約し、緊急部品の手配・即日持ち込みを代行。定価販売＋特急出動費で競合相見積もりをゼロにする。',
        estimatedMonthlyProfit: '月利50万〜120万円（15社との月額契約＋緊急手配マージン）'
      },
      {
        title: 'キーエンス式「即日実演デモ先行」による中小企業向けAI業務自動化直販',
        targetNiche: 'バックオフィスの手作業（請求書処理・受発注管理）に苦しむ地域中小企業',
        executionSummary: '事前に相手の実際の帳票を読み込ませたデモ画面を持参し、商談開始5分で実演。「気に入らなければ0円」の条件で定価50万円＋保守月5万円を受注。',
        estimatedMonthlyProfit: '月利80万〜200万円（月2〜3件の成約＋累積保守）'
      }
    ],
    entryStrategy: {
      lensType: 'GIANT_CRUMBS',
      lensLabel: '【巨人の食べこぼし枠】キーエンスが高すぎて買えない「町工場の零細ライン」を拾う',
      whyIncumbentCantWin: 'キーエンスの営業マンは平均年収2,000万円超。数百万円以上の高単価案件しか相手にできず、月額数万円の零細町工場に営業に行くのは人件費割れするため絶対に手を出せない。',
      targetVictimOrNiche: '「不良品検査を自動化したいが、キーエンスの見積もりを見たら500万円で絶望した」全国の従業員5〜20名の零細製造所。',
      actionableEntryRoute: '中古iPadのカメラとオープンソースの画像認識AIを組み合わせ、「初期10万円＋月額1.5万円」の格安不良品検知アプリを町工場向けに直販する。',
      estimatedEasyProfit: '月利80万〜200万円（町工場40〜100社との継続ストック契約）'
    },
    financials: [
      { period: '2024通期', revenueJpy: 967288000000, cogsJpy: 164827000000, grossProfitJpy: 802461000000, grossMarginPercent: 83.0, opexJpy: 307491000000, operatingProfitJpy: 494970000000, operatingMarginPercent: 51.2, netIncomeJpy: 357653000000, netMarginPercent: 37.0 },
      { period: '2025通期', revenueJpy: 1059100000000, cogsJpy: 171574000000, grossProfitJpy: 887526000000, grossMarginPercent: 83.8, opexJpy: 337906000000, operatingProfitJpy: 549620000000, operatingMarginPercent: 51.9, netIncomeJpy: 395726000000, netMarginPercent: 37.4 },
      { period: '2026通期', revenueJpy: 1169300000000, cogsJpy: 198781000000, grossProfitJpy: 970519000000, grossMarginPercent: 83.0, opexJpy: 374519000000, operatingProfitJpy: 596000000000, operatingMarginPercent: 51.0, netIncomeJpy: 445200000000, netMarginPercent: 38.1 }
    ],
    tools: [
      { name: '直販技術営業基盤', category: '内製基盤', monthlyCostJpy: 50000000, purpose: '分単位の面談記録・外報管理とデモ機即時発送', replacementDifficulty: 'HIGH' },
      { name: '国内即日配送網', category: '物流網', monthlyCostJpy: 180000000, purpose: '全国当日出荷・翌朝納品体制の維持', replacementDifficulty: 'HIGH' },
      { name: 'ファブレス委託網', category: '生産網', monthlyCostJpy: 16000000000, purpose: '国内優良加工工場への部材調達・組立委託', replacementDifficulty: 'HIGH' }
    ],
    competitors: [
      { name: 'オムロン', scaleLabel: '東証プライム', annualRevenueJpy: 818800000000, operatingMarginPercent: 4.2, moatSummary: '代理店経由販売が主、幅広い制御機器展開', pricingPower: '中（相見積もり対象になりやすい）' },
      { name: 'コグネックス', scaleLabel: 'NASDAQ', annualRevenueJpy: 125000000000, operatingMarginPercent: 12.5, moatSummary: '画像処理アルゴリズム特化', pricingPower: '中高（特定光学検査で優位）' }
    ],
    initialTractionStrategy: '創業初期、リード線付きリレーの壊れやすさに着目し、無接点光電スイッチを開発。代理店を通さず直接工場長に持ち込み、機械を止めない実演で即日現金仕入れを獲得。',
    proSecretInsight: '販管費の約50%（年間1,500億円超）が社員のボーナス原資。営業利益の約10%が信賞必罰で全社員に直接還元されるため、社員全員が経営者視点で利益率の高い案件にのみ時間を配分する。',
    passbookDetails: {
      monthlyGrossJpy: 97400000000,
      paymentFeeJpy: 292000000,
      infraCostJpy: 230000000,
      outsourcingJpy: 16500000000,
      founderTakeHomeJpy: 49600000000,
      taxReserveJpy: 16200000000,
      bankStatementDate: '月間平均営業キャッシュ換算'
    },
    playbook: {
      difficulty: '組織戦',
      setupDays: 90,
      monthlyCustomersFor1MJpy: 1,
      step1: '【キーエンス流直販の個人応用】代理店や仲介サイト（クラウドソーシング等）を使わず、見込み顧客の企業に直接テレアポまたは手紙を送付。',
      step2: '顧客の業務の「不満」「手戻り」を徹底的に聞き出し、競合の半分の時間で納品できる体制（即日対応）を提示。',
      step3: '相見積もりを拒否し、相手の歩留まり向上・コスト削減額の10〜20%を報酬として提示し、定価・高単価で受注。',
      copyPasteScript: '「御社の現在の製造/運用ラインで、月間〇時間のロスが発生していませんか。弊社システムなら導入当日からそのロスをゼロにします。まず無料デモ機を明日お持ちします。」'
    },
    marketWindow: {
      remainingMonths: 36,
      monthlyMoneyFlowJpy: 85000000000,
      saturationLevel: 'ガラ空き（先行者独占中）',
      urgencyReason: '工場の自動化と人手不足はこれから10年深刻化。直販で課題を解決できるプレイヤーは常に定価で指名買いされる。'
    },
    proDossier: {
      monetizationTrick: {
        corePsychologicalTrigger: '「工場の停止恐怖（ダウンタイム・パラノイア）」。工場長は数億円の製造ラインが1秒止まるだけで胃に穴が空くほどの恐怖を感じている。',
        pricingPowerSecret: '代理店を完全排除し、営業マン自らがデモ機を持参して即日実演。「即日出荷でラインを止めない」という安心料として、他社の3倍の定価でも値引きゼロで即決させる。',
        cashflowVelocity: '直接販売による直取引。商社や問屋を挟まないため、回収サイクルが短く売掛金未回収率は0.01%以下。'
      },
      incumbentBlindspot: {
        whyGiantsCantEnter: 'オムロンやパナソニックなどの総合電機大手が代理店網を排除して直販に切り替えようとすると、全国数万社の代理店から一斉ボイコットを受ける構造的ジレンマ。',
        moatAgainstCopycats: '分単位で記録される営業外報データベースと、新製品の7割が「世界初・業界初」という顧客ニーズ先取りファブレス設計。'
      },
      sevenDayBlueprint: {
        day1to2OfferSetup: '【個人応用・餌の仕込み】キーエンス流の「顧客のダウンタイム（停止損失）を即座に救う」提案書をA4用紙1枚で作成。',
        day3to4CashflowPipe: '【集金ライン開通】前金50%・完了時50%の直接請求契約書を作成し、相見積もりを排除した定価販売ルールを確立。',
        day5to6FirstCustomers: '【初期3人強奪】地元の製造所や中小企業5社に直接電話し、「明日デモ機（iPad簡易検査）を持って訪問します」と約束を取り付ける。',
        day7AutomationEngine: '【不労化完成】検出結果をクラウドに保存し、月額1.5万円の保守監視契約（完全ストック収入）に移行させる。'
      }
    },
    first100CustomersStrategy: {
      tacticalChannel: '兵庫県・大阪府の町工場への直接泥臭いデモ機持ち込み',
      exactAction: '創業者の滝崎氏自らが無接点光電スイッチを抱えて工場長に会い、「ラインを止めない実験」をその場で実演。',
      conversionProof: '壊れにくさを目の前で見た工場長が「今すぐここにある現物を置いていってくれ」と定価で即日現金買い取り。'
    },
    earlyFailureLesson: {
      wastedMoneyOrTime: '創業初期の下請け機械製造（累計数千万円の未払いや過酷な価格叩き合い）',
      whatWentWrong: '「下請けとして言われた通りの機械を作る」ビジネスは、親企業から容赦なく値引きを強要され、倒産の危機に瀕した。',
      pivotMoment: '「下請けは絶対に二度とやらない。自前で特許と価格決定権を握り、直販で定価販売できるセンサーに全振りする」と誓い、現在のキーエンスが誕生した。'
    },
    pricingDesign: {
      pricingTiers: '高精度変位センサー 50万円〜300万円（定価・値引き原則禁止）',
      freeTrialHook: '即日デモ機貸出（営業マンが現場に持参し、その場で顧客のワークを使って測定成功を実証）',
      averageOrderValue: '案件平均単価 約250万円（顧客1社あたりの生涯取引額は数千万円〜数十億円）'
    },
  },

  // 2. 巨大企業: エヌビディア
  {
    id: 'nvidia-nvda',
    businessEssence: {
      whatItDoes: '生成AIの学習と超高速推論に必要な計算用GPU半導体および開発基盤ソフトウェアの提供',
      targetCustomer: 'マイクロソフト、グーグル、メタ等の巨大クラウド事業者および世界中のAI開発者',
      valueProposition: '競合チップでは数ヶ月かかる巨大AIモデルの並列計算処理を数日に短縮する圧倒的並列性能',
      monetizationWay: '1基数百万円の計算チップおよび数千万円のサーバーラックの定価現金販売'
    },
    ticker: 'NVDA.US',
    name: 'NVIDIA Corporation',
    japaneseName: 'エヌビディア',
    tagline: 'CUDAソフトエコシステムと先端積層パッケージングでAI計算資源を世界独占',
    scaleTier: 'MEGA_CORP',
    businessModel: 'CHIP_ECOSYSTEM',
    foundedYear: 1993,
    teamSize: 29600,
    weeklyHours: 50,
    headquarters: '米国カリフォルニア州サンタクララ',
    verifiedStatus: 'AUDITED_PUBLIC',
    estimatedValuationJpy: 520000000000000,
    evMultiple: 26.5,
    isForSale: false,
    actionHeadline: '【営業利益率62%】販管費率わずか2.7%。世界の全テック巨人が前払いで買い求める計算インフラ',
    executiveSummary: 'アクセラレーテッド・コンピューティングおよびAI基盤プラットフォーム企業。GPU単体ではなく、20年間無償提供してきたCUDAソフトウェア基盤、NVLink高速通信スイッチ、サーバーラック統合設計により、データセンター市場を事実上寡占。',
    coreMoatDescription: '世界400万人以上のAI研究者がCUDA上でモデルを開発。競合チップに乗り換えるには数百万行のコード書き換えと学習停止リスクが伴うため、チップ製造原価（数千ドル）に対し3万〜4万ドル超の独占価格を維持。',
    primaryMoat: 'NETWORK_EFFECTS',
    moatScore: 99,
    tags: ['巨大独占', 'AI半導体', 'ソフト覇権', '粗利75%', 'B2Bハイテク'],
    initialInvestmentJpy: 20000000,
    financials: [
      { period: '2023通期', revenueJpy: 4046700000000, cogsJpy: 1740000000000, grossProfitJpy: 2306700000000, grossMarginPercent: 56.9, opexJpy: 1670000000000, operatingProfitJpy: 636700000000, operatingMarginPercent: 15.7, netIncomeJpy: 654000000000, netMarginPercent: 16.2 },
      { period: '2024通期', revenueJpy: 9138000000000, cogsJpy: 2494500000000, grossProfitJpy: 6643500000000, grossMarginPercent: 72.7, opexJpy: 1700000000000, operatingProfitJpy: 4943500000000, operatingMarginPercent: 54.1, netIncomeJpy: 4460000000000, netMarginPercent: 48.8 },
      { period: '2025通期', revenueJpy: 19574400000000, cogsJpy: 4895850000000, grossProfitJpy: 14678550000000, grossMarginPercent: 75.0, opexJpy: 2460750000000, operatingProfitJpy: 12217800000000, operatingMarginPercent: 62.4, netIncomeJpy: 10932000000000, netMarginPercent: 55.8 }
    ],
    tools: [
      { name: 'CUDA開発環境', category: '基本基盤', monthlyCostJpy: 1200000000, purpose: '並列計算用コンパイラ・数千種の数理ライブラリ群', replacementDifficulty: 'HIGH' },
      { name: 'TSMC CoWoS委託枠', category: '製造調達', monthlyCostJpy: 35000000000, purpose: '最先端パッケージング生産ラインの独占確保', replacementDifficulty: 'HIGH' },
      { name: 'NVLinkスイッチ網', category: '通信基盤', monthlyCostJpy: 800000000, purpose: 'GPU間を毎秒1.8TBで直結する超高速バス', replacementDifficulty: 'HIGH' }
    ],
    competitors: [
      { name: 'AMD (MI300X)', scaleLabel: 'NASDAQ', annualRevenueJpy: 3850000000000, operatingMarginPercent: 11.2, moatSummary: 'ROCmオープン基盤で追随、ハード性能は肉薄', pricingPower: '中（エヌビディアの半値近い価格設定）' },
      { name: 'Google (TPU v5)', scaleLabel: 'Alphabet', annualRevenueJpy: 12000000000000, operatingMarginPercent: 32.0, moatSummary: '自社クラウド内部完結、外部一般外販なし', pricingPower: '自社消費のみ' }
    ],
    initialTractionStrategy: 'ゲーム用3D描画チップから出発。2006年、利益の出ない並列計算CUDAを全チップに標準搭載し、大学の研究機関に無償配布してAIの萌芽期を20年間耕し続けた。',
    proSecretInsight: '売上19兆円に対し、一般的な販売管理費は売上比わずか2.7%。世界中のクラウド大手が割当（アロケーション）を懇願するため、営業マンが頭を下げる必要が構造上存在しない。'
  },

  // 3. 巨大企業: レーザーテック
  {
    id: 'lasertec-6920',
    businessEssence: {
      whatItDoes: '最先端半導体の原版（フォトマスク）についた微小な傷を光で透視する超精密検査装置の開発',
      targetCustomer: 'TSMC、インテル、サムスン等の世界の最先端半導体受託製造工場',
      valueProposition: '世界で唯一のEUV光線による内部欠陥透視で、数千億円の製造ラインの歩留まり不良を事前撲滅',
      monetizationWay: '1台50億〜80億円の検査装置本体販売＋年次保守点検契約（粗利率70%）'
    },
    ticker: '6920.T',
    name: 'Lasertec Corporation',
    japaneseName: 'レーザーテック株式会社',
    tagline: '最先端半導体向けEUVフォトマスク検査装置で世界シェア100%を完全独占',
    scaleTier: 'MEGA_CORP',
    businessModel: 'SEMICON_EQUIP',
    foundedYear: 1960,
    teamSize: 640,
    weeklyHours: 42,
    headquarters: '神奈川県横浜市港北区',
    verifiedStatus: 'AUDITED_PUBLIC',
    estimatedValuationJpy: 2200000000000,
    evMultiple: 10.3,
    isForSale: false,
    actionHeadline: '【世界シェア100%】代替機が世界に一台も存在しないため、1台数十億円の定価販売を貫徹',
    executiveSummary: '最先端半導体の製造工程に不可欠な極端紫外線（EUV）フォトマスク内部の微小欠陥を検査するアクティニック検査装置（ACTIS）を世界で唯一商用化した開発特化型メーカー。',
    coreMoatDescription: 'EUV光線と同じ波長（13.5nm）を用いて原版の傷を透視する光学すり合わせ技術。ASMLやKLAなどの世界大手すら実用化できず、TSMCやインテルの歩留まり判定が同社機を前提に設計されている。',
    primaryMoat: 'CORNERED_RESOURCE',
    moatScore: 97,
    tags: ['巨大独占', '世界シェア100%', 'ニッチトップ', '高粗利', '装置開発'],
    initialInvestmentJpy: 15000000,
    financials: [
      { period: '2023通期', revenueJpy: 152834000000, cogsJpy: 74888000000, grossProfitJpy: 77946000000, grossMarginPercent: 51.0, opexJpy: 15730000000, operatingProfitJpy: 62216000000, operatingMarginPercent: 40.7, netIncomeJpy: 46166000000, netMarginPercent: 30.2 },
      { period: '2024通期', revenueJpy: 213506000000, cogsJpy: 106026000000, grossProfitJpy: 107479000000, grossMarginPercent: 50.3, opexJpy: 26104000000, operatingProfitJpy: 81375000000, operatingMarginPercent: 38.1, netIncomeJpy: 59076000000, netMarginPercent: 27.7 },
      { period: '2025通期', revenueJpy: 235000000000, cogsJpy: 115150000000, grossProfitJpy: 119850000000, grossMarginPercent: 51.0, opexJpy: 28200000000, operatingProfitJpy: 91650000000, operatingMarginPercent: 39.0, netIncomeJpy: 665000000000, netMarginPercent: 28.3 }
    ],
    tools: [
      { name: '極微細光学すり合わせ設備', category: '精密光学', monthlyCostJpy: 120000000, purpose: 'ナノメートル単位のEUV光路アライメント', replacementDifficulty: 'HIGH' },
      { name: 'クリーンルーム調整セル', category: '自社施設', monthlyCostJpy: 80000000, purpose: '最終検査装置の組上・光軸精密調整', replacementDifficulty: 'HIGH' },
      { name: 'フィールド保守網', category: '技術保守', monthlyCostJpy: 250000000, purpose: '台湾・韓国・米国ファブへの技術員常駐保守', replacementDifficulty: 'HIGH' }
    ],
    competitors: [
      { name: 'KLA Corporation', scaleLabel: 'NASDAQ', annualRevenueJpy: 1550000000000, operatingMarginPercent: 39.5, moatSummary: '半導体全工程の光学検査首位、EUVアクティニック未参入', pricingPower: '高（一般マスク検査では強力）' },
      { name: 'アプライドマテリアルズ', scaleLabel: 'NASDAQ', annualRevenueJpy: 3900000000000, operatingMarginPercent: 29.0, moatSummary: '電子線（EB）検査装置で競合、測定速度で劣後', pricingPower: '中高' }
    ],
    initialTractionStrategy: '創業者がテレビの走査線検査機を開発したのが原点。松下電器などの工場に泥臭く納品しながら「光応用計測」の極限ニッチに特化し、競合が撤退する中でEUV光の開発を継続。',
    proSecretInsight: '装置単価は1台50億〜80億円。世界に競合機が存在しないため、納品から数年間の保守点検契約（粗利率70%超）が自動更新される強力なストック収益エンジンを持つ。'
  },

  // 4. 未上場新興: ストライプ
  {
    id: 'stripe-us',
    businessEssence: {
      whatItDoes: 'Webサイトやアプリに数行のコードを貼るだけで世界中のカード決済を即日可能にする金融インフラ',
      targetCustomer: '個人開発者、スタートアップからアマゾン等のEC・Webサービス運営企業',
      valueProposition: '各国の銀行やカード会社との面倒な個別契約やセキュリティ審査にかかる数ヶ月をゼロにする',
      monetizationWay: '決済金額に対する約2.9% + 30¢の手数料＋定期課金管理ソフトの月額利用料'
    },
    ticker: 'STRIPE.PRIV',
    name: 'Stripe, Inc.',
    japaneseName: 'ストライプ',
    tagline: '7行のコードで世界中の決済と金融SaaSを牛耳るインターネット経済の関所',
    scaleTier: 'SCALE_UP',
    businessModel: 'PAYMENT_INFRA',
    foundedYear: 2010,
    teamSize: 7200,
    weeklyHours: 45,
    headquarters: '米国サンフランシスコ / アイルランド・ダブリン',
    verifiedStatus: 'ESTIMATED_MODEL',
    estimatedValuationJpy: 23850000000000,
    evMultiple: 18.5,
    isForSale: false,
    actionHeadline: '【取扱高285兆円】決済網の上に課金自動化・不正検知の高粗利ソフトを乗せて完全黒字化',
    executiveSummary: '世界百五十カ国以上の通貨で即時決済を可能にする金融インフラ。取扱高は世界全体の総生産の約1.6%に相当する1.4兆ドル（285兆円）を突破。決済だけでなく定期課金管理、税金計算、不正検知などの高粗利ソフトをクロスセル。',
    coreMoatDescription: '数百万社の加盟店の基幹業務（会計、顧客DB、決済）と深く結合。他社への乗り換えには膨大な改修工数と顧客カード情報の移行失敗リスクが伴うため、解約率が極めて低い。',
    primaryMoat: 'SWITCHING_COSTS',
    moatScore: 96,
    tags: ['急成長新興', '決済インフラ', '金融SaaS', '高スイッチング', '黒字化'],
    initialInvestmentJpy: 10000000,
    financials: [
      { period: '2023通期', revenueJpy: 585000000000, cogsJpy: 169650000000, grossProfitJpy: 415350000000, grossMarginPercent: 71.0, opexJpy: 380000000000, operatingProfitJpy: 35350000000, operatingMarginPercent: 6.0, netIncomeJpy: 26500000000, netMarginPercent: 4.5 },
      { period: '2024通期', revenueJpy: 765000000000, cogsJpy: 214200000000, grossProfitJpy: 550800000000, grossMarginPercent: 72.0, opexJpy: 420000000000, operatingProfitJpy: 130800000000, operatingMarginPercent: 17.1, netIncomeJpy: 98100000000, netMarginPercent: 12.8 },
      { period: '2025通期', revenueJpy: 980000000000, cogsJpy: 264600000000, grossProfitJpy: 715400000000, grossMarginPercent: 73.0, opexJpy: 490000000000, operatingProfitJpy: 225400000000, operatingMarginPercent: 23.0, netIncomeJpy: 169000000000, netMarginPercent: 17.2 }
    ],
    tools: [
      { name: 'グローバル銀行決済網', category: '金融基盤', monthlyCostJpy: 450000000, purpose: '各国のカードブランド・現地決済規格との直接接続', replacementDifficulty: 'HIGH' },
      { name: '機械学習不正検知エンジン', category: '内製基盤', monthlyCostJpy: 120000000, purpose: '秒間数万件の決済から不正カード利用をミリ秒で判定', replacementDifficulty: 'HIGH' },
      { name: '開発者技術文書基盤', category: '公開基盤', monthlyCostJpy: 15000000, purpose: 'コピペで即稼働するAPIリファレンスとSDK保守', replacementDifficulty: 'MEDIUM' }
    ],
    competitors: [
      { name: 'Adyen', scaleLabel: '欧州上場', annualRevenueJpy: 260000000000, operatingMarginPercent: 46.0, moatSummary: '超大手エンタープライズ特化の低コスト単一スタック', pricingPower: '高（大量処理で手数料ディスカウント）' },
      { name: 'PayPal / Braintree', scaleLabel: 'NASDAQ', annualRevenueJpy: 4500000000000, operatingMarginPercent: 16.5, moatSummary: '消費者ウォレット認知で優位、開発者体験で劣後', pricingPower: '中' }
    ],
    initialTractionStrategy: '創業者コリソン兄弟がスタートアップのオフィスを直接訪問し、相手のノートPCを借りてその場でコードを7行書いて決済を動かしてみせる「コリソン・インストール」で熱狂を生んだ。',
    proSecretInsight: '決済手数料（2.9% + 30¢）だけでなく、Stripe Billing（定期課金自動化）やStripe Radar（不正防止API）などの粗利率90%を超えるソフトウェア層が利益の大半を牽引している。'
  },

  // 5. 未上場新興: オープンＡＩ
  {
    id: 'openai-us',
    businessEssence: {
      whatItDoes: '文章作成・プログラミング・思考推論を人間に代わってこなす対話型汎用人工知能サービスの提供',
      targetCustomer: '世界中の一般個人（仕事・学習効率化）および業務自動化を進める企業',
      valueProposition: 'リサーチ、メール作成、コード修正にかかる膨大な知的労働時間を90%削減',
      monetizationWay: '月額20ドル（約3,000円）のPlus有料会員サブスク課金＋開発者APIの従量課金'
    },
    ticker: 'OPENAI.PRIV',
    name: 'OpenAI OpCo, LLC',
    japaneseName: 'オープンＡＩ',
    tagline: '一般認知度と巨額計算基盤の先行投資で生成AIの代名詞を獲得したフロンティア覇者',
    scaleTier: 'SCALE_UP',
    businessModel: 'FRONTIER_AI',
    foundedYear: 2015,
    teamSize: 2200,
    weeklyHours: 55,
    headquarters: '米国サンフランシスコ',
    verifiedStatus: 'ESTIMATED_MODEL',
    estimatedValuationJpy: 23500000000000,
    evMultiple: 12.0,
    isForSale: false,
    actionHeadline: '【年間定期売上6兆円規模へ】月額20ドルの個人課金73%と開発者API27%で先行',
    executiveSummary: 'ChatGPTおよびフロンティア基盤知能モデルの開発企業。一般層における第一想起を獲得し、1,000万人以上の有料加入者と数百万のAPI開発者を抱えるが、Azure計算基盤費用と研究開発費により赤字先行。',
    coreMoatDescription: '「AIといえばChatGPT」という世界的なブランド第一想起による無料の顧客獲得ループ。1モデルの事前学習に数千億円を投じる資本規模が他社の追随を許さない防壁となっている。',
    primaryMoat: 'BRANDING',
    moatScore: 92,
    tags: ['急成長新興', '基盤AIモデル', '一般認知独占', '月額サブスク'],
    initialInvestmentJpy: 100000000,
    financials: [
      { period: '2023通期', revenueJpy: 240000000000, cogsJpy: 144000000000, grossProfitJpy: 96000000000, grossMarginPercent: 40.0, opexJpy: 360000000000, operatingProfitJpy: -264000000000, operatingMarginPercent: -110.0, netIncomeJpy: -285000000000, netMarginPercent: -118.8 },
      { period: '2024通期', revenueJpy: 555000000000, cogsJpy: 321900000000, grossProfitJpy: 233100000000, grossMarginPercent: 42.0, opexJpy: 996900000000, operatingProfitJpy: -763800000000, operatingMarginPercent: -137.6, netIncomeJpy: -763500000000, netMarginPercent: -137.6 },
      { period: '2025通期', revenueJpy: 1960500000000, cogsJpy: 1078275000000, grossProfitJpy: 882225000000, grossMarginPercent: 45.0, opexJpy: 3136800000000, operatingProfitJpy: -2254575000000, operatingMarginPercent: -115.0, netIncomeJpy: -5779500000000, netMarginPercent: -294.8 }
    ],
    tools: [
      { name: 'Microsoft Azure GPUクラスタ', category: '計算基盤', monthlyCostJpy: 65000000000, purpose: 'モデル推論および次世代事前学習用計算資源', replacementDifficulty: 'HIGH' },
      { name: 'RLHFアノテーション網', category: '知能調律', monthlyCostJpy: 4500000000, purpose: '人間のフィードバックによる安全性・回答品質の調律', replacementDifficulty: 'HIGH' },
      { name: '分散学習オーケストレーター', category: '内製基盤', monthlyCostJpy: 800000000, purpose: '数万基のGPUノードを同期させ勾配降下法を計算', replacementDifficulty: 'HIGH' }
    ],
    competitors: [
      { name: 'Anthropic (Claude)', scaleLabel: '未上場新興', annualRevenueJpy: 220000000000, operatingMarginPercent: -120.0, moatSummary: 'Claude 3.5のプログラミング性能・推論安全性で肉薄', pricingPower: '中高（開発者から絶賛）' },
      { name: 'Google (Gemini)', scaleLabel: 'Alphabet', annualRevenueJpy: 48000000000000, operatingMarginPercent: 32.0, moatSummary: '自社検索・Android・ワークスペースの流通網で反撃', pricingPower: '高' }
    ],
    initialTractionStrategy: '非営利の研究機関としてトップ研究者を集結。2022年11月、研究用デモとしてChatGPTを無償公開したところ、わずか5日間で100万ユーザーが殺到し歴史上最速で普及。',
    proSecretInsight: '売上37億ドルのうち約73%が月額20ドルのChatGPT Plus会員による定期課金。Googleが広告売上の共食いを恐れて躊躇した隙を突き、無広告サブスクモデルで一気に覇権を握った。'
  },

  // 6. 未上場新興: スケールＡＩ
  {
    id: 'scaleai-us',
    businessEssence: {
      whatItDoes: 'AIモデルが学習するための正確なデータ作成（画像・文章のラベル付け）を専門家組織で受託',
      targetCustomer: '米国防総省、オープンAI、メタ、自動運転開発企業',
      valueProposition: 'AIのハルシネーション（嘘）を防ぐ高品質な正解データを軍事機密レベルで供給',
      monetizationWay: 'データ作成ボリュームおよび機密セキュリティに応じた高額B2B契約'
    },
    ticker: 'SCALE.PRIV',
    name: 'Scale AI, Inc.',
    japaneseName: 'スケールＡＩ',
    tagline: '国防総省契約と世界数万人の専門家網で最高品質の学習データを独占供給',
    scaleTier: 'SCALE_UP',
    businessModel: 'DATA_RLHF',
    foundedYear: 2016,
    teamSize: 1400,
    weeklyHours: 50,
    headquarters: '米国サンフランシスコ',
    verifiedStatus: 'ESTIMATED_MODEL',
    estimatedValuationJpy: 2145000000000,
    evMultiple: 14.3,
    isForSale: false,
    actionHeadline: '【年間売上1,500億円規模へ】米国防総省の5億ドル契約と博士号保持者による特級RLHF',
    executiveSummary: '生成AIモデルおよび自動運転向けの学習データ収集・アノテーション基盤。世界中の専門家（医師、物理学者、上級エンジニア）を組織化し、低品質データを排除した最高峰のRLHFデータをOpenAIやMetaに提供。',
    coreMoatDescription: '米国防総省（DoD）の最高機密施設（SCIF）認証を保持。軍事・国家安全保障に関わるAIデータは格安海外クラウドソーシングに委託できないため、同社が事実上独占。',
    primaryMoat: 'CORNERED_RESOURCE',
    moatScore: 94,
    tags: ['急成長新興', '国防総省契約', 'AIデータ', '人的受託'],
    initialInvestmentJpy: 5000000,
    financials: [
      { period: '2023通期', revenueJpy: 114000000000, cogsJpy: 57000000000, grossProfitJpy: 57000000000, grossMarginPercent: 50.0, opexJpy: 51300000000, operatingProfitJpy: 5700000000, operatingMarginPercent: 5.0, netIncomeJpy: 4200000000, netMarginPercent: 3.7 },
      { period: '2024通期', revenueJpy: 130500000000, cogsJpy: 58725000000, grossProfitJpy: 71775000000, grossMarginPercent: 55.0, opexJpy: 65250000000, operatingProfitJpy: 6525000000, operatingMarginPercent: 5.0, netIncomeJpy: 5200000000, netMarginPercent: 4.0 },
      { period: '2025通期', revenueJpy: 225000000000, cogsJpy: 90000000000, grossProfitJpy: 135000000000, grossMarginPercent: 60.0, opexJpy: 112500000000, operatingProfitJpy: 22500000000, operatingMarginPercent: 10.0, netIncomeJpy: 18000000000, netMarginPercent: 8.0 }
    ],
    tools: [
      { name: 'Remotasks / Outlier運用網', category: '作業員管理', monthlyCostJpy: 3500000000, purpose: '世界数万人の専門家ワーカーへのタスク配分・自動報酬決済', replacementDifficulty: 'HIGH' },
      { name: '軍事規格SCIF機密施設', category: 'セキュリティ', monthlyCostJpy: 150000000, purpose: '米国防総省機密データの物理隔離処理', replacementDifficulty: 'HIGH' }
    ],
    competitors: [
      { name: 'Surge AI', scaleLabel: '未上場', annualRevenueJpy: 32000000000, operatingMarginPercent: 15.0, moatSummary: '自然言語・NLP専門家アノテーション特化', pricingPower: '中高' },
      { name: 'Appen', scaleLabel: '豪州上場', annualRevenueJpy: 42000000000, operatingMarginPercent: -18.0, moatSummary: '従来型低賃金クラウドソーシング、AI品質競争で劣後', pricingPower: '低' }
    ],
    initialTractionStrategy: '創業者アレクサンダー・ワンが19歳でYCに参加。自動運転車用のLiDAR点群データのアノテーションを泥臭くAPI化し、Cruise等の走行データを手作業でラベル付けして契約を勝ち取った。',
    proSecretInsight: '2025年にMetaが49%の株式を143億ドルで取得。主要顧客だったOpenAIやGoogleが反発して一部流出するも、軍事・政府案件の強固な参入障壁で揺るぎない地位を維持。'
  },

  // 7. 未上場新興: パープレキシティ
  {
    id: 'perplexity-us',
    businessEssence: {
      whatItDoes: '広告リンクを踏ませず、知りたい答えを出典付きで直接1発で教えてくれる対話型検索サービス',
      targetCustomer: '検索広告やSEOのゴミ記事にうんざりしているビジネスマン・研究者',
      valueProposition: '従来のグーグル検索で10分かかっていた情報収集を5秒に短縮',
      monetizationWay: '月額20ドルのPro会員サブスクリプション＋法人プラン'
    },
    ticker: 'PERPLEXITY.PRIV',
    name: 'Perplexity AI, Inc.',
    japaneseName: 'パープレキシティ',
    tagline: 'Googleの検索広告モデルを無力化し「即座に回答と引用を提示する」対話型検索の旗手',
    scaleTier: 'SCALE_UP',
    businessModel: 'ANSWER_ENGINE',
    foundedYear: 2022,
    teamSize: 180,
    weeklyHours: 50,
    headquarters: '米国サンフランシスコ',
    verifiedStatus: 'ESTIMATED_MODEL',
    estimatedValuationJpy: 1350000000000,
    evMultiple: 12.0,
    isForSale: false,
    actionHeadline: '【年間定期売上1,100億円】Googleが模倣できない「答え一発返信」によるカウンターポジショニング',
    executiveSummary: '青い広告リンクを踏ませる検索エンジンを不要にする対話型アンサーエンジン。複数のLLMとリアルタイムWeb検索を束ね、正確な出典リンク付きで回答を生成。月額20ドルのProプランと出版社レベニューシェアで急拡大。',
    coreMoatDescription: 'Googleの年間2,000億ドルの検索広告は「ユーザーにリンクをクリックさせること」で成立。Perplexityのように直接回答を返しリンクを踏ませないUIをGoogleが本気で真似すると自社の広告売上が吹き飛ぶ。',
    primaryMoat: 'COUNTER_POSITIONING',
    moatScore: 93,
    tags: ['急成長新興', '対話型検索', '逆張り対抗', '月額サブスク'],
    initialInvestmentJpy: 5000000,
    financials: [
      { period: '2024通期', revenueJpy: 7500000000, cogsJpy: 3375000000, grossProfitJpy: 4125000000, grossMarginPercent: 55.0, opexJpy: 11250000000, operatingProfitJpy: -7125000000, operatingMarginPercent: -95.0, netIncomeJpy: -7125000000, netMarginPercent: -95.0 },
      { period: '2025通期', revenueJpy: 34800000000, cogsJpy: 13920000000, grossProfitJpy: 20880000000, grossMarginPercent: 60.0, opexJpy: 27840000000, operatingProfitJpy: -6960000000, operatingMarginPercent: -20.0, netIncomeJpy: -6960000000, netMarginPercent: -20.0 },
      { period: '2026通期', revenueJpy: 112500000000, cogsJpy: 42750000000, grossProfitJpy: 69750000000, grossMarginPercent: 62.0, opexJpy: 61875000000, operatingProfitJpy: 7875000000, operatingMarginPercent: 7.0, netIncomeJpy: 6500000000, netMarginPercent: 5.8 }
    ],
    tools: [
      { name: '高速リアルタイム検索インデックス', category: 'Webクローラ', monthlyCostJpy: 850000000, purpose: '最新Webページを毎秒インデックスしRAG検索に供給', replacementDifficulty: 'HIGH' },
      { name: '複数LLMオーケストレーション基盤', category: '推論基盤', monthlyCostJpy: 2400000000, purpose: 'Claude/GPT-4o/Sonarモデルのミリ秒並列推論', replacementDifficulty: 'HIGH' }
    ],
    competitors: [
      { name: 'Google (AI Overviews)', scaleLabel: 'Alphabet', annualRevenueJpy: 48000000000000, operatingMarginPercent: 32.0, moatSummary: '既存検索シェア90%、広告減収のジレンマ', pricingPower: '圧倒的' }
    ],
    initialTractionStrategy: 'Twitter上で「@perplexity_ai」とリプライすると、どんな質問にも正確なWeb出典付きで即座に要約を返信するボットを運用し、知的好奇心の高い層の間でバイラル爆発を起こした。',
    proSecretInsight: '出版社への著作権批判を回避するため、サブスク売上の最大80%を引用メディアへ還元する「パブリッシャープログラム」を導入。メディアを敵ではなく味方に引き入れる巧妙な提携戦略を展開。'
  },

  // 8. 中堅ニッチ: マニー
  {
    id: 'mani-7730',
    businessEssence: {
      whatItDoes: '髪の毛より細い手術用縫合針や眼科用極小メスなどの超精密外科手術器具メーカー',
      targetCustomer: '世界120カ国以上の病院執刀医（眼科医・心臓外科医・歯科医）',
      valueProposition: '手術中の器具折損や切れ味低下の恐怖をゼロにする世界一の鋭利さと強度',
      monetizationWay: '医療卸を通じた特注器具の定価販売（新興国自社工場による低原価生産）'
    },
    ticker: '7730.T',
    name: 'MANI, INC.',
    japaneseName: 'マニー株式会社',
    tagline: '500億円以下の極小ニッチに特化し眼科ナイフ世界首位を維持する外科用刃物の名門',
    scaleTier: 'NICHE_LEADER',
    businessModel: 'PRECISION_MED',
    foundedYear: 1956,
    teamSize: 3400,
    weeklyHours: 40,
    headquarters: '栃木県宇都宮市清原工業団地',
    verifiedStatus: 'AUDITED_PUBLIC',
    estimatedValuationJpy: 310000000000,
    evMultiple: 9.4,
    isForSale: false,
    actionHeadline: '【営業利益率30%超】「世界市場500億円以上はやらない」徹底したニッチ寡占と海外低原価生産',
    executiveSummary: '手術用縫合針、眼科用ナイフ、歯科用根管治療機器の超精密医療器具メーカー。海外売上比率約80%。世界一の品質が出せない分野からは即座に撤退する規律と、ベトナム等の自社工場による原価低減で超高収益を維持。',
    coreMoatDescription: '独自開発の硬化ステンレス鋼線材による極細針加工。外科医は手術中の器具折損・切れ味低下を極度に恐れるため、一度信頼を得たマニーの器具を他社製に変えることは構造上あり得ない。',
    primaryMoat: 'PROCESS_POWER',
    moatScore: 94,
    tags: ['中堅ニッチ', '世界シェア首位', 'やらない経営', '粗利63%', '海外生産'],
    initialInvestmentJpy: 5000000,
    financials: [
      { period: '2023通期', revenueJpy: 24716000000, cogsJpy: 9144000000, grossProfitJpy: 15572000000, grossMarginPercent: 63.0, opexJpy: 8303000000, operatingProfitJpy: 7269000000, operatingMarginPercent: 29.4, netIncomeJpy: 5632000000, netMarginPercent: 22.8 },
      { period: '2024通期', revenueJpy: 28513000000, cogsJpy: 10616000000, grossProfitJpy: 17897000000, grossMarginPercent: 62.8, opexJpy: 9505000000, operatingProfitJpy: 8392000000, operatingMarginPercent: 29.4, netIncomeJpy: 6286000000, netMarginPercent: 22.0 },
      { period: '2025通期', revenueJpy: 32900000000, cogsJpy: 12173000000, grossProfitJpy: 20727000000, grossMarginPercent: 63.0, opexJpy: 10989000000, operatingProfitJpy: 9738000000, operatingMarginPercent: 29.6, netIncomeJpy: 7238000000, netMarginPercent: 22.0 }
    ],
    tools: [
      { name: '18-8硬化ステンレス伸線機', category: '独自加工', monthlyCostJpy: 45000000, purpose: '髪の毛より細く曲がりにくい特注ステンレス線の量産', replacementDifficulty: 'HIGH' },
      { name: 'ベトナム低コスト生産拠点', category: '海外工場', monthlyCostJpy: 350000000, purpose: 'ハノイ近郊での顕微鏡下手作業研磨工程', replacementDifficulty: 'HIGH' },
      { name: 'グローバル医療機器承認網', category: '法務認証', monthlyCostJpy: 60000000, purpose: 'FDA・CEマーク等の世界120カ国での薬事許認可維持', replacementDifficulty: 'HIGH' }
    ],
    competitors: [
      { name: 'ジョンソン・エンド・ジョンソン (Ethicon)', scaleLabel: 'NYSE', annualRevenueJpy: 14500000000000, operatingMarginPercent: 27.0, moatSummary: '医療機器の巨人、汎用縫合糸セットで圧倒', pricingPower: '高（病院包括契約）' },
      { name: 'フェザー安全剃刀', scaleLabel: '非上場', annualRevenueJpy: 22000000000, operatingMarginPercent: 18.0, moatSummary: 'メス・替刃で有力、超微細眼科分野でマニーがリード', pricingPower: '中高' }
    ],
    initialTractionStrategy: '1961年、世界で初めてステンレス製手術用縫合針の量産に成功。錆びやすい炭素鋼の針に悩んでいた大学病院の執刀医に直接サンプルを配り、圧倒的な切れ味で指名買いを獲得。',
    proSecretInsight: '社内で年2回「世界一か否か会議」を開催。世界中の競合製品を市場から調達して比較し、世界一でない製品は改良し、勝てなければ市場から撤退する「やらない経営」を徹底。'
  },

  // 9. 中堅ニッチ: 信越化学工業
  {
    id: 'shinetsu-4063',
    businessEssence: {
      whatItDoes: '半導体チップの土台となるシリコンウェハーおよび水道管・建材用塩化ビニル樹脂の製造',
      targetCustomer: '世界の半導体製造大手および北米・欧米のインフラ建設企業',
      valueProposition: '不純物ゼロの究極の素材供給と、好況不況に左右されない安定供給体制',
      monetizationWay: '長期供給契約に基づく素材の大口バルク販売（原料からの垂直統合で原価粉砕）'
    },
    ticker: '4063.T',
    name: 'Shin-Etsu Chemical Co., Ltd.',
    japaneseName: '信越化学工業株式会社',
    tagline: 'シリコンウェハー世界首位と塩ビ樹脂の米一貫生産で販管費率わずか8.7%の化学要塞',
    scaleTier: 'MEGA_CORP',
    businessModel: 'CHEMICAL_MAT',
    foundedYear: 1926,
    teamSize: 25700,
    weeklyHours: 40,
    headquarters: '東京都千代田区大手町',
    verifiedStatus: 'AUDITED_PUBLIC',
    estimatedValuationJpy: 11500000000000,
    evMultiple: 11.2,
    isForSale: false,
    actionHeadline: '【販管費率8.7%】不況期に無借金キャッシュで巨額投資し、好況期に利益を独占する逆張り経営',
    executiveSummary: '半導体用シリコンウェハー世界シェア約30%（首位）および塩化ビニル樹脂世界首位の化学メーカー。米国子会社シンテックによる原料からの完全垂直統合と、驚異的な少数精鋭低コスト経営で世界を圧倒。',
    coreMoatDescription: 'テキサス・ルイジアナでの岩塩採掘からエチレン、塩ビ樹脂まで自社敷地内で一貫生産。アジア・欧州の高コストメーカーを原価で粉砕し、不況期でも黒字を維持してシェアを拡大。',
    primaryMoat: 'SCALE_ECONOMIES',
    moatScore: 95,
    tags: ['巨大独占', '世界首位ウェハー', '垂直統合', '少数精鋭', '逆張り経営'],
    initialInvestmentJpy: 50000000,
    financials: [
      { period: '2023通期', revenueJpy: 2808824000000, cogsJpy: 1618000000000, grossProfitJpy: 1190824000000, grossMarginPercent: 42.4, opexJpy: 192600000000, operatingProfitJpy: 998224000000, operatingMarginPercent: 35.5, netIncomeJpy: 708200000000, netMarginPercent: 25.2 },
      { period: '2024通期', revenueJpy: 2414937000000, cogsJpy: 1503728000000, grossProfitJpy: 911209000000, grossMarginPercent: 37.7, opexJpy: 210171000000, operatingProfitJpy: 701038000000, operatingMarginPercent: 29.0, netIncomeJpy: 520140000000, netMarginPercent: 21.5 },
      { period: '2025通期', revenueJpy: 2650000000000, cogsJpy: 1643000000000, grossProfitJpy: 1007000000000, grossMarginPercent: 38.0, opexJpy: 225250000000, operatingProfitJpy: 781750000000, operatingMarginPercent: 29.5, netIncomeJpy: 580000000000, netMarginPercent: 21.9 }
    ],
    tools: [
      { name: 'シンテック垂直統合プラント', category: '化学設備', monthlyCostJpy: 4500000000, purpose: '岩塩電解から塩ビ樹脂までの一貫製造', replacementDifficulty: 'HIGH' },
      { name: '300mm無欠陥単結晶引上炉', category: '半導体材料', monthlyCostJpy: 3200000000, purpose: '原子レベルで歪みのないシリコンインゴット製造', replacementDifficulty: 'HIGH' },
      { name: '長期供給契約管理システム', category: '業務基盤', monthlyCostJpy: 80000000, purpose: 'TSMCやIntelとの複数年固定価格・数量コミットメント管理', replacementDifficulty: 'MEDIUM' }
    ],
    competitors: [
      { name: 'SUMCO', scaleLabel: '東証プライム', annualRevenueJpy: 438000000000, operatingMarginPercent: 16.5, moatSummary: 'シリコンウェハー世界2位、信越と日本勢で寡占', pricingPower: '中高' },
      { name: 'ウエストレイク・ケミカル', scaleLabel: 'NYSE', annualRevenueJpy: 1900000000000, operatingMarginPercent: 10.2, moatSummary: '北米塩ビ有力、原料統合度でシンテックが優位', pricingPower: '中' }
    ],
    initialTractionStrategy: '戦前、窒素肥料メーカーとして発足。戦後いち早くシリコーン樹脂の工業化に着手し、米国の化学技術を吸収しながら独自の高純度精製技術を磨き上げた。',
    proSecretInsight: '売上2.4兆円に対し販管費率は驚異の8.7%。派手な本社や過剰な中間管理職を一切置かず、手元資金1兆円超の「無借金経営」により不況期に他社が凍結したプラント投資を一気に行う。'
  },

  // 10. 個人少数精鋭: 写真AIスタジオ (Pieter Levels)
  {
    id: 'solo-photoai',
    businessEssence: {
      whatItDoes: 'スマホの自撮り写真を送るだけで、スーツ姿の証明写真や宣材写真をAIで自動生成するWeb道具',
      targetCustomer: '就活生、転職活動者、LinkedInやSNSのアイコンを綺麗にしたい個人',
      valueProposition: '写真館に行って1.5万円払って撮影される時間と気恥ずかしさを完全ゼロにする',
      monetizationWay: '1回2,900円の買い切りパック＋月額4,900円の定期課金クレジット'
    },
    ticker: 'SOLO-PHOTOAI',
    name: 'Photo AI & Nomad List',
    japaneseName: '写真AIスタジオ（ピーター・レベルズ）',
    tagline: '完全1人運営で月商3,800万円、純利益率84%を叩き出すインディー開発者の神話',
    scaleTier: 'SOLO_MICRO',
    businessModel: 'MICRO_SAAS',
    foundedYear: 2022,
    teamSize: 1,
    weeklyHours: 15,
    headquarters: 'オランダ / フルリモート',
    verifiedStatus: 'VERIFIED_STRIPE',
    estimatedValuationJpy: 1520000000,
    evMultiple: 3.8,
    isForSale: true,
    askingPriceJpy: 1600000000,
    actionHeadline: '【完全1人・月利3,200万円】広告費ゼロ。短文投稿網での開発過程全公開で集客を完全自動化',
    executiveSummary: 'ユーザーが自撮り写真をアップロードすると、スタジオ撮影級の高品質なプロフィール写真やモデル写真を生成するWebサービス。創業者が1人でコード、デザイン、運用保守を完結。Stripeの生売上を公開。',
    coreMoatDescription: 'Xでの約50万人のフォロワーに向け、新機能の開発風景や売上グラフを包み隠さず公開する発信スタイル（Build in Public）。広告費ゼロで毎月数千人の新規顧客が流入するためCACがほぼゼロ。',
    primaryMoat: 'BRANDING',
    moatScore: 89,
    tags: ['完全1人', '年商数億', '月利3200万', 'AIツール', '広告費0円', '初期0円'],
    initialInvestmentJpy: 30000,
    financials: [
      { period: '2023通期', revenueJpy: 180000000, cogsJpy: 27000000, grossProfitJpy: 153000000, grossMarginPercent: 85.0, opexJpy: 7200000, operatingProfitJpy: 145800000, operatingMarginPercent: 81.0, netIncomeJpy: 145800000, netMarginPercent: 81.0 },
      { period: '2024通期', revenueJpy: 360000000, cogsJpy: 46800000, grossProfitJpy: 313200000, grossMarginPercent: 87.0, opexJpy: 10800000, operatingProfitJpy: 302400000, operatingMarginPercent: 84.0, netIncomeJpy: 302400000, netMarginPercent: 84.0 },
      { period: '2025通期', revenueJpy: 456000000, cogsJpy: 54720000, grossProfitJpy: 401280000, grossMarginPercent: 88.0, opexJpy: 18240000, operatingProfitJpy: 383040000, operatingMarginPercent: 84.0, netIncomeJpy: 383040000, netMarginPercent: 84.0 }
    ],
    cacJpy: 1200,
    ltvJpy: 14800,
    ltvCacRatio: 12.3,
    monthlyChurnPercent: 6.8,
    tools: [
      { name: '専用GPUクラウド', category: '計算基盤', monthlyCostJpy: 3200000, purpose: '自前Stable Diffusionモデルによる画像生成推論', replacementDifficulty: 'MEDIUM' },
      { name: 'Stripe Billing', category: '決済基盤', monthlyCostJpy: 1200000, purpose: '月額サブスクリプションおよび買い切りクレジット決済', replacementDifficulty: 'LOW' },
      { name: '単一Linuxサーバー', category: 'ホスティング', monthlyCostJpy: 120000, purpose: 'PHP/JavaScriptによる軽量モノリス基盤の運用', replacementDifficulty: 'LOW' }
    ],
    competitors: [
      { name: 'HeadshotPro', scaleLabel: '個人少数', annualRevenueJpy: 540000000, operatingMarginPercent: 78.0, moatSummary: 'B2Bチーム撮影に特化、アフィリエイト網で先行', pricingPower: '中高' },
      { name: 'Aragon AI', scaleLabel: 'スタートアップ', annualRevenueJpy: 400000000, operatingMarginPercent: 45.0, moatSummary: 'VC調達、広告出稿による力技スケール', pricingPower: '中（CAC高騰に直面）' }
    ],
    initialTractionStrategy: 'X上で「自撮り写真をAIで宣材写真にする実験」をツイートし、初期モデルの失敗例と成功例を面白おかしく投稿。1ツイートで数百万インプレッションを獲得し初週で1,000万円を受注。',
    proSecretInsight: 'フレームワークや複雑なDockerを一切使わず、単一のindex.phpファイルに生SQLとJavaScriptを直書きする極限のシンプル構成。サーバー障害が起きても数分で1人で復元できる体制を構築。',
    passbookDetails: {
      monthlyGrossJpy: 38000000,
      paymentFeeJpy: 1140000,
      infraCostJpy: 3200000,
      outsourcingJpy: 0,
      founderTakeHomeJpy: 32400000,
      taxReserveJpy: 1260000,
      bankStatementDate: '直近2026年8月締め'
    },
    playbook: {
      difficulty: '極めて容易',
      setupDays: 3,
      monthlyCustomersFor1MJpy: 68,
      step1: 'Replicate APIまたはFal.aiのアカウントを開設し、画像生成モデル（Flux/SDXL）の推論パイプラインを準備（所要2時間）。',
      step2: '短文投稿サイト（X）やTikTokで「AIで自撮りを証明写真にするビフォーアフター動画」を投稿し、プロフィール欄に決済リンクを設置。',
      step3: 'Stripe Checkoutで1回2,900円（または月額4,900円）の自動課金を設定。購入後5分で写真が自動生成されてメールで納品されるパイプラインを組む。',
      copyPasteScript: '「スタジオ撮影に1.5万円払うのは今日で終わり。スマホの自撮りを3枚送るだけで、LinkedInや履歴書で使える完璧なスーツ写真が3分で完成します。今なら初回10枚パック半額。」'
    },
    marketWindow: {
      remainingMonths: 8,
      monthlyMoneyFlowJpy: 450000000,
      saturationLevel: '拡大中（参入推奨）',
      urgencyReason: '個人のプロフィール写真需要は全世界で年2億件。スタジオ撮影からAI生成への移行が今まさに起きており、今参入した者だけが先行者ブランドを確立できる。'
    }
  },

  // 11. 個人少数精鋭: 仕事用顔写真 (Danny Postma)
  {
    id: 'solo-headshotpro',
    businessEssence: {
      whatItDoes: 'リモートワーク企業の社員向けに、全員のビジネス宣材写真を統一感あるAI写真で揃えるツール',
      targetCustomer: 'フルリモート企業の人事担当者、スタートアップ経営陣',
      valueProposition: '全社員をスタジオに呼ぶ数十万円の撮影費用と日程調整の手間を全廃',
      monetizationWay: '社員1人あたり39ドル（約5,800円）の一括まとめ買い課金'
    },
    ticker: 'SOLO-HEADSHOT',
    name: 'HeadshotPro',
    japaneseName: '仕事用顔写真自動生成（ダニー・ポストマ）',
    tagline: '社員ゼロ・年商5.4億円。売上の30%を24時間以内に還元するアフィリエイト網で無人集客',
    scaleTier: 'SOLO_MICRO',
    businessModel: 'MICRO_SAAS',
    foundedYear: 2023,
    teamSize: 1,
    weeklyHours: 10,
    headquarters: 'オランダ / バリ島',
    verifiedStatus: 'VERIFIED_STRIPE',
    estimatedValuationJpy: 1890000000,
    evMultiple: 3.5,
    isForSale: true,
    askingPriceJpy: 2000000000,
    actionHeadline: '【年商5.4億円・利益率78%】報酬を24時間以内に自動送金する仕組みで世界中の宣伝部隊を独占',
    executiveSummary: 'リモートワーク企業の社員向けに、スタジオに行かずに統一感のある高品質ビジネス顔写真を生成するサービス。完全1人創業で年商5.4億円。売上の30%を紹介者へ即日送金する仕組みで広告費ゼロ。',
    coreMoatDescription: '競合他社がアフィリエイト報酬の支払いに30日〜60日かける中、Stripe Connectで確定後24時間以内に自動送金。世界中のブロガーやインフルエンサーが同社製品を一斉に推奨する構造を確立。',
    primaryMoat: 'COUNTER_POSITIONING',
    moatScore: 91,
    tags: ['完全1人', '年商5.4億', '月利3500万', 'AIツール', '紹介即日還元', '初期0円'],
    initialInvestmentJpy: 50000,
    financials: [
      { period: '2023通期', revenueJpy: 320000000, cogsJpy: 57600000, grossProfitJpy: 262400000, grossMarginPercent: 82.0, opexJpy: 16000000, operatingProfitJpy: 246400000, operatingMarginPercent: 77.0, netIncomeJpy: 246400000, netMarginPercent: 77.0 },
      { period: '2024通期', revenueJpy: 540000000, cogsJpy: 97200000, grossProfitJpy: 442800000, grossMarginPercent: 82.0, opexJpy: 21600000, operatingProfitJpy: 421200000, operatingMarginPercent: 78.0, netIncomeJpy: 421200000, netMarginPercent: 78.0 }
    ],
    cacJpy: 0,
    ltvJpy: 8900,
    ltvCacRatio: 99.0,
    tools: [
      { name: 'Replicate API', category: 'AI推論', monthlyCostJpy: 4500000, purpose: 'Flux / SDXLモデルのサーバーレス推論実行', replacementDifficulty: 'LOW' },
      { name: 'Stripe Connect', category: '送金基盤', monthlyCostJpy: 1800000, purpose: 'アフィリエイト紹介者への24時間即時送金', replacementDifficulty: 'MEDIUM' },
      { name: 'Vercel / Next.js', category: 'フロント', monthlyCostJpy: 80000, purpose: '高速グローバルエッジホスティング', replacementDifficulty: 'LOW' }
    ],
    competitors: [
      { name: 'Photo AI', scaleLabel: '個人1人', annualRevenueJpy: 456000000, operatingMarginPercent: 84.0, moatSummary: 'モデル写真全般に強み、創業者個人の発信力', pricingPower: '同等' }
    ],
    initialTractionStrategy: '「Corporate Headshot」等のキーワードで検索ボリュームを精査し、ドメインパワーの高い中古ドメインを取得して1週間でMVPを公開。SEO経由の自然検索流入を初月から獲得。',
    proSecretInsight: 'B2B法人プラン（1人あたり39ドル〜）を用意し、人事担当者が社員全員の写真を一括生成できるダッシュボードを実装。1回の注文で数十万〜数百万円のまとめ買いが発生する。'
  },

  // 12. 個人少数精鋭: 日刊技術手紙 (Dan Ni)
  {
    id: 'solo-tldr',
    businessEssence: {
      whatItDoes: 'ITやAIの最新ニュースを毎朝5分で読める箇条書きにして配信する無料メールマガジン',
      targetCustomer: '多忙なシリコンバレーのエンジニア、プロダクトマネージャー、経営者700万人',
      valueProposition: 'SNSの膨大な情報に埋もれず、今知るべき最先端技術動向を朝の通勤中に一網打尽',
      monetizationWay: 'メルマガ内の1枠450万円のスポンサー純広告（半年先まで完売）'
    },
    ticker: 'SOLO-TLDR',
    name: 'TLDR Newsletter',
    japaneseName: '日刊技術手紙（ダン・ニー）',
    tagline: '読者700万人・広告枠1日450万円。1人創業で年商15億円を稼ぎ出すメールメディアの怪物',
    scaleTier: 'SCALE_UP',
    businessModel: 'MEDIA_NEWS',
    foundedYear: 2018,
    teamSize: 6,
    weeklyHours: 25,
    headquarters: '米国ニューヨーク',
    verifiedStatus: 'ESTIMATED_MODEL',
    estimatedValuationJpy: 4500000000,
    evMultiple: 3.0,
    isForSale: false,
    actionHeadline: '【年商15億円・純利82%】朝5分の要約メールに巨大テック企業が1枠450万円の純広告を出稿',
    executiveSummary: 'テック、AI、Web開発、暗号資産の最新動向を簡潔な箇条書きで毎朝配信するニュースレター。読者数700万人超。広告枠は半年先まで完売。数名の外注キュレーターと自動配信システムで運営。',
    coreMoatDescription: '多忙なシリコンバレーのエンジニアや経営者の受信トレイ（Inbox）という最も滞在時間の長い聖域を占有。開封率約40%を維持し、B2Bツールのリード獲得に苦しむテック企業が争奪戦を展開。',
    primaryMoat: 'BRANDING',
    moatScore: 93,
    tags: ['1人創業', '年商15億', '高純利82%', 'メディア手紙', '広告枠完売', '初期0円'],
    initialInvestmentJpy: 10000,
    financials: [
      { period: '2023通期', revenueJpy: 950000000, cogsJpy: 47500000, grossProfitJpy: 902500000, grossMarginPercent: 95.0, opexJpy: 142500000, operatingProfitJpy: 760000000, operatingMarginPercent: 80.0, netIncomeJpy: 760000000, netMarginPercent: 80.0 },
      { period: '2024通期', revenueJpy: 1500000000, cogsJpy: 75000000, grossProfitJpy: 1425000000, grossMarginPercent: 95.0, opexJpy: 195000000, operatingProfitJpy: 1230000000, operatingMarginPercent: 82.0, netIncomeJpy: 1230000000, netMarginPercent: 82.0 }
    ],
    tools: [
      { name: 'Amazon SES', category: 'メール配信', monthlyCostJpy: 4500000, purpose: '毎日数百万通のメールを確実に受信箱へ届ける配信インフラ', replacementDifficulty: 'HIGH' },
      { name: 'Custom Ad Booker', category: '内製基盤', monthlyCostJpy: 200000, purpose: 'スポンサー企業による広告枠の自動予約・原稿審査', replacementDifficulty: 'LOW' }
    ],
    competitors: [
      { name: 'Morning Brew', scaleLabel: '買収済メディア', annualRevenueJpy: 7500000000, operatingMarginPercent: 25.0, moatSummary: 'ビジネス一般向け、大規模編集部による高コスト運営', pricingPower: '高' }
    ],
    initialTractionStrategy: 'Redditのプログラミング系板やHacker Newsに、自身が手動でまとめた「今週の重要技術まとめ」を毎日投稿。末尾に「毎朝届くメールはこちら」と添えて初期読者1万人を獲得。',
    proSecretInsight: '広告主（AWS、Datadog、HubSpot等）に対し、クリック数に応じた成果型ではなく「1枠一括買い切り」の定額モデルを徹底。配信前に全額前受金が入るためキャッシュフローが極めて盤石。'
  },

  // 13. 個人少数精鋭: 最新知能手紙 (Rowan Cheung)
  {
    id: 'solo-rundown',
    businessEssence: {
      whatItDoes: '毎朝届くAI最新情報ニュースレターと、実践的なAI活用スクールの運営',
      targetCustomer: 'AIを仕事に導入したいビジネスマンおよび企業のDX研修担当',
      valueProposition: '日々進化するAIツールの使い方をわかりやすく体系的に学べる教育',
      monetizationWay: '無料メルマガの広告枠販売＋バックエンドの有料オンラインスクール月額会費'
    },
    ticker: 'SOLO-RUNDOWN',
    name: 'The Rundown AI',
    japaneseName: '最新知能手紙（ローワン・チャン）',
    tagline: '創刊2年で年商10.5億円。無料ニュースレターから有料AIスクールへの完璧な導線',
    scaleTier: 'SOLO_MICRO',
    businessModel: 'MEDIA_NEWS',
    foundedYear: 2023,
    teamSize: 4,
    weeklyHours: 30,
    headquarters: 'カナダ・トロント',
    verifiedStatus: 'ESTIMATED_MODEL',
    estimatedValuationJpy: 3150000000,
    evMultiple: 3.0,
    isForSale: false,
    actionHeadline: '【年商10.5億円】紹介連鎖（リファラル）で読者70万人を獲得し、高単価スクールで回収',
    executiveSummary: 'AIの最新ニュースを毎朝届けるニュースレターメディア。スポンサー広告収入に加え、バックエンドに企業向けAIリスキリング教育（Rundown University）を併設し、LTVを極限まで最大化。',
    coreMoatDescription: '「友人を1人紹介すると限定AIツール集をプレゼント」という紹介エンジン（Referral Loop）により、広告費ゼロで毎月数万人の読者を獲得し続ける自己増殖システム。',
    primaryMoat: 'NETWORK_EFFECTS',
    moatScore: 88,
    tags: ['少数精鋭', '年商10.5億', 'メディア手紙', '有料スクール', '紹介連鎖', '初期0円'],
    initialInvestmentJpy: 10000,
    financials: [
      { period: '2023通期', revenueJpy: 380000000, cogsJpy: 19000000, grossProfitJpy: 361000000, grossMarginPercent: 95.0, opexJpy: 57000000, operatingProfitJpy: 304000000, operatingMarginPercent: 80.0, netIncomeJpy: 304000000, netMarginPercent: 80.0 },
      { period: '2024通期', revenueJpy: 1050000000, cogsJpy: 52500000, grossProfitJpy: 997500000, grossMarginPercent: 95.0, opexJpy: 157500000, operatingProfitJpy: 840000000, operatingMarginPercent: 80.0, netIncomeJpy: 840000000, netMarginPercent: 80.0 }
    ],
    tools: [
      { name: 'Beehiiv', category: 'レター基盤', monthlyCostJpy: 150000, purpose: '読者分析・紹介プログラム・広告枠マッチング', replacementDifficulty: 'LOW' },
      { name: 'Skool / Circle', category: '教育コミュニティ', monthlyCostJpy: 90000, purpose: '有料会員向けAI実践講義とQ&Aフォーラム', replacementDifficulty: 'LOW' }
    ],
    competitors: [
      { name: 'Superhuman AI', scaleLabel: '個人メディア', annualRevenueJpy: 650000000, operatingMarginPercent: 75.0, moatSummary: '先行AIニュースメディア、同様のスポンサーモデル', pricingPower: '同等' }
    ],
    initialTractionStrategy: 'Twitterで毎日「最新AIツール10選」のスレッドを投稿。ブックマークが数千件つく投稿の直後に「毎朝届く無料レター」の登録リンクをぶら下げて初月に10万人を獲得。',
    proSecretInsight: '広告収入（全体の約40%）だけでなく、企業幹部向けのAI導入研修（1社あたり数百万円）を法人向けに受託することで、メディアの読者を高単価コンサル案件へ転換。'
  },

  // 14. 個人少数精鋭: 多機能手帳 (Easlo)
  {
    id: 'solo-easlo',
    businessEssence: {
      whatItDoes: 'Notion上でタスク・家計簿・習慣・目標を全自動管理できる完成済みデザインテンプレートの販売',
      targetCustomer: '自己管理を効率化したい学生、社会人、フリーランス',
      valueProposition: 'ゼロからNotionを構築する数十時間の挫折を回避し、買った瞬間に理想の管理生活を開始',
      monetizationWay: '1個29〜99ドルの買い切りダウンロード販売（Gumroad決済・原価ゼロ）'
    },
    ticker: 'SOLO-EASLO',
    name: 'Easlo Notion Templates',
    japaneseName: '多機能手帳様式（イースロ）',
    tagline: '完全1人運営で年商1.1億円。仕入れゼロ・在庫ゼロ・純利益率95%の不労所得構造',
    scaleTier: 'SOLO_MICRO',
    businessModel: 'DIGITAL_ASSET',
    foundedYear: 2021,
    teamSize: 1,
    weeklyHours: 5,
    headquarters: 'シンガポール',
    verifiedStatus: 'VERIFIED_STRIPE',
    estimatedValuationJpy: 330000000,
    evMultiple: 3.0,
    isForSale: true,
    askingPriceJpy: 350000000,
    actionHeadline: '【完全1人・年商1.1億円】原価ゼロの電子様式（Notionテンプレート）を決済自動化で量産',
    executiveSummary: '大学生が1人で立ち上げたNotionテンプレート販売事業。プロジェクト管理、家計簿、読書記録などの完成テンプレートを20ドル〜99ドルで販売。決済完了と同時にダウンロードURLが自動送付され、運用工数ゼロ。',
    coreMoatDescription: '初期に作成したテンプレートが検索エンジン（SEO）とTwitter/YouTubeで自動集客し続け、原価ゼロで限界利益100%の現金を生み出し続けるストック型資産。',
    primaryMoat: 'BRANDING',
    moatScore: 85,
    tags: ['完全1人', '年商1.1億', '純利95%', '初期0円', '不労所得', 'デジタル資産'],
    initialInvestmentJpy: 0,
    financials: [
      { period: '2023通期', revenueJpy: 85000000, cogsJpy: 2550000, grossProfitJpy: 82450000, grossMarginPercent: 97.0, opexJpy: 3400000, operatingProfitJpy: 79050000, operatingMarginPercent: 93.0, netIncomeJpy: 79050000, netMarginPercent: 93.0 },
      { period: '2024通期', revenueJpy: 110000000, cogsJpy: 3300000, grossProfitJpy: 106700000, grossMarginPercent: 97.0, opexJpy: 4400000, operatingProfitJpy: 102300000, operatingMarginPercent: 93.0, netIncomeJpy: 102300000, netMarginPercent: 93.0 }
    ],
    tools: [
      { name: 'Gumroad / Lemon Squeezy', category: '電子決済', monthlyCostJpy: 450000, purpose: '全世界通貨対応のデジタル商品即時決済と自動納品', replacementDifficulty: 'LOW' },
      { name: 'Notion Pro', category: '制作環境', monthlyCostJpy: 1500, purpose: 'テンプレート作成・マスター複製管理', replacementDifficulty: 'LOW' }
    ],
    competitors: [
      { name: 'Thomas Frank', scaleLabel: 'YouTuber', annualRevenueJpy: 250000000, operatingMarginPercent: 85.0, moatSummary: 'YouTube登録者300万人からの動画集客', pricingPower: '高' }
    ],
    initialTractionStrategy: 'Notion公式フォーラムやRedditで「便利なテンプレートを無料配布」して信頼とメールアドレスを集め、上位版の「全自動ビジネス管理OS」を99ドルで販売。',
    proSecretInsight: '購入後に「Notionエキスパートコース（199ドル）」を自動アップセルするメールシーケンスを構築。顧客獲得費用ゼロのまま客単価を2倍に引き上げる設計。',
    passbookDetails: {
      monthlyGrossJpy: 9200000,
      paymentFeeJpy: 276000,
      infraCostJpy: 1500,
      outsourcingJpy: 0,
      founderTakeHomeJpy: 8550000,
      taxReserveJpy: 372500,
      bankStatementDate: '直近2026年8月締め'
    },
    playbook: {
      difficulty: '極めて容易',
      setupDays: 2,
      monthlyCustomersFor1MJpy: 170,
      step1: 'Notion無料版で自分が使いやすい「タスク管理・読書記録・家計簿」のシートを作成し、デザインを美しく整える。',
      step2: 'XやPinterestで「Notionの無料テンプレート配布」を行い、数千人のフォロワーと見込み顧客リストを自動獲得。',
      step3: 'GumroadまたはLemon Squeezyで5,900円のフルパックを販売。決済完了と同時に自動で複製URLが送付され、運用工数ゼロで手残り現金が発生。',
      copyPasteScript: '「散らかった生活と仕事が一瞬で整う。世界中のトップエンジニアが使っているNotion全自動管理OS。通常9,800円を先着100名様のみ5,900円で即時ダウンロード可能。」'
    },
    marketWindow: {
      remainingMonths: 14,
      monthlyMoneyFlowJpy: 120000000,
      saturationLevel: 'ガラ空き（先行者独占中）',
      urgencyReason: '個人の生産性向上ツール市場は年率25%で急拡大中。日本語特化の高品質テンプレートは競合がまだ数名しかおらず、今作れば検索上位を独占できる。'
    }
  },

  // 15. 個人少数精鋭: 開発用下地部品 (Marc Lou)
  {
    id: 'solo-shipfast',
    businessEssence: {
      whatItDoes: '認証・決済・メール送信が最初から組み込まれたWebアプリ開発用スターターキットの販売',
      targetCustomer: '個人でWebサービスやSaaSを開発して稼ぎたいエンジニア',
      valueProposition: '退屈な会員登録や決済の組み込みにかかる1ヶ月の開発準備をわずか5分に短縮',
      monetizationWay: '1ライセンス169〜249ドルの買い切り販売（毎月値上げする心理設計）'
    },
    ticker: 'SOLO-SHIPFAST',
    name: 'ShipFast & MicroSaaS Suite',
    japaneseName: '開発用下地部品（マーク・ルー）',
    tagline: '完全1人・年商1.5億円。買い切りボイラープレートから継続課金SaaSへ転換し利益率90%',
    scaleTier: 'SOLO_MICRO',
    businessModel: 'MICRO_SAAS',
    foundedYear: 2023,
    teamSize: 1,
    weeklyHours: 20,
    headquarters: 'フランス / バリ島',
    verifiedStatus: 'VERIFIED_STRIPE',
    estimatedValuationJpy: 450000000,
    evMultiple: 3.0,
    isForSale: true,
    askingPriceJpy: 500000000,
    actionHeadline: '【完全1人・年商1.5億円】認証・決済・メールを組込済みのNext.js雛形を販売し爆益',
    executiveSummary: 'インディー開発者向けに、Stripe決済・Supabase認証・SEO・メール配信が最初から組み込まれたNext.js用ボイラープレート（ShipFast）を169ドル〜で販売。さらにTrustMRR等のSaaSを連続立ち上げ。',
    coreMoatDescription: '「1ヶ月かかるWebアプリの立ち上げ準備が5分で終わる」という圧倒的な開発時間短縮価値。X上での軽快な動画投稿とミーム動画による圧倒的なコミュニティ訴求力。',
    primaryMoat: 'BRANDING',
    moatScore: 87,
    tags: ['完全1人', '年商1.5億', '純利87%', '初期0円', '小型SaaS', '買い切り型'],
    initialInvestmentJpy: 20000,
    financials: [
      { period: '2023通期', revenueJpy: 65000000, cogsJpy: 3250000, grossProfitJpy: 61750000, grossMarginPercent: 95.0, opexJpy: 5200000, operatingProfitJpy: 56550000, operatingMarginPercent: 87.0, netIncomeJpy: 56550000, netMarginPercent: 87.0 },
      { period: '2024通期', revenueJpy: 150000000, cogsJpy: 7500000, grossProfitJpy: 142500000, grossMarginPercent: 95.0, opexJpy: 12000000, operatingProfitJpy: 130500000, operatingMarginPercent: 87.0, netIncomeJpy: 130500000, netMarginPercent: 87.0 }
    ],
    tools: [
      { name: 'GitHub Private Repos', category: 'コード配信', monthlyCostJpy: 20000, purpose: '購入者へのリポジトリ自動招待とコード配信', replacementDifficulty: 'LOW' },
      { name: 'Stripe Checkout', category: '決済基盤', monthlyCostJpy: 450000, purpose: '全世界クレジットカードおよび各種現地決済', replacementDifficulty: 'LOW' }
    ],
    competitors: [
      { name: 'SaaS Pegasus', scaleLabel: '個人1人', annualRevenueJpy: 80000000, operatingMarginPercent: 85.0, moatSummary: 'Python/Django専門のボイラープレート', pricingPower: '同等' }
    ],
    initialTractionStrategy: '毎日「新しいアプリを作って公開する」動画をTikTokとXに投稿。実際に短時間でリリースできることを実証し、その裏で使っているテンプレートを自然に宣伝。',
    proSecretInsight: '「価格は毎月20ドルずつ自動で値上げされる」というカウントダウン式プライシングを導入。購入を迷っているユーザーに「今買わないと損をする」緊急性を心理的に植え付けて即決させる。'
  },

  // 16. 個人少数精鋭: 無人貸倉庫 (Nick Huber)
  {
    id: 'solo-boltstorage',
    businessEssence: {
      whatItDoes: '地方都市の古いトランクルーム（貸倉庫）を買い取り、スマートロックで完全無人化した不動産',
      targetCustomer: '自宅に入り切らない荷物や家具、工具を保管したい地方の住民・自営業者',
      valueProposition: '近所で安く24時間出し入れできる荷物保管場所の提供',
      monetizationWay: '月額1万〜3万円の自動引き落とし賃料（一度預けたら数年解約されないストック）'
    },
    ticker: 'SOLO-BOLT',
    name: 'Bolt Storage & Somewhere.com',
    japaneseName: '無人貸倉庫・人材仲介（ニック・フーバー）',
    tagline: '地方の老朽セルフストレージを無人化遠隔買収し年商45億円・資産150億円を築いた実業家',
    scaleTier: 'SCALE_UP',
    businessModel: 'LOCAL_DX',
    foundedYear: 2018,
    teamSize: 12,
    weeklyHours: 20,
    headquarters: '米国ペンシルベニア州',
    verifiedStatus: 'ESTIMATED_MODEL',
    estimatedValuationJpy: 13500000000,
    evMultiple: 3.0,
    isForSale: false,
    actionHeadline: '【資産150億円・年商45億円】管理人を廃止してスマートロックと海外コールセンターで無人化',
    executiveSummary: '米国の地方都市にあるオーナー高齢化のセルフストレージ（貸倉庫）を安値で買収し、物理的な管理人を解雇。スマートロックによる自動施錠とフィリピンの格安遠隔サポートに置き換えて利益率を倍増させる実業投資。',
    coreMoatDescription: '地方の地味なリアル実業（Sweaty Startups）というITエリートが参入したがらないニッチ市場。一度荷物を入れた利用者は解約が面倒で何年も家賃を払い続ける高LTVストック。',
    primaryMoat: 'SWITCHING_COSTS',
    moatScore: 90,
    tags: ['少数精鋭', '年商45億', '地方実業DX', '非IT不動産', '無人化', '高LTV'],
    initialInvestmentJpy: 5000000,
    financials: [
      { period: '2023通期', revenueJpy: 3200000000, cogsJpy: 960000000, grossProfitJpy: 2240000000, grossMarginPercent: 70.0, opexJpy: 960000000, operatingProfitJpy: 1280000000, operatingMarginPercent: 40.0, netIncomeJpy: 960000000, netMarginPercent: 30.0 },
      { period: '2024通期', revenueJpy: 4500000000, cogsJpy: 1350000000, grossProfitJpy: 3150000000, grossMarginPercent: 70.0, opexJpy: 1260000000, operatingProfitJpy: 1890000000, operatingMarginPercent: 42.0, netIncomeJpy: 1440000000, netMarginPercent: 32.0 }
    ],
    tools: [
      { name: 'スマートロック遠隔解錠網', category: '物理IoT', monthlyCostJpy: 850000, purpose: '契約者への暗証番号自動発行と未払い者の遠隔締め出し', replacementDifficulty: 'MEDIUM' },
      { name: 'フィリピン遠隔サポート拠点', category: '海外外注', monthlyCostJpy: 2400000, purpose: '英語ネイティブによる24時間電話受付・賃料督促', replacementDifficulty: 'HIGH' }
    ],
    competitors: [
      { name: 'Public Storage', scaleLabel: 'NYSE大手', annualRevenueJpy: 650000000000, operatingMarginPercent: 52.0, moatSummary: '超巨大REIT、一等地の大規模施設中心', pricingPower: '圧倒的' }
    ],
    initialTractionStrategy: '地元の不動産ブローカーを使わず、地方の個人経営ストレージのオーナーに直接手紙や電話で「後継者がいないなら私が現金で買います」とアプローチして割安で仕入れ。',
    proSecretInsight: '貸倉庫ビジネスで確立した「フィリピンの優秀な遠隔人材を月給8万円で雇用するノウハウ」を切り出し、Somewhere.comという人材仲介企業を設立。2025年に5,200万ドル（約80億円）で売却。'
  },

  // 17. 個人少数精鋭: 顔出しなし実演物販チーム
  {
    id: 'solo-tiktok-commerce',
    businessEssence: {
      whatItDoes: '便利グッズや掃除用具の手元実演ショート動画を量産し、購入リンクへ誘導する物販アフィリエイト',
      targetCustomer: 'TikTok等のショート動画を日常的に見ている主婦・一人暮らし若年層',
      valueProposition: '商品の使い勝手を15秒の動画で直感的に実演し、買いたい衝動をその場で刺激',
      monetizationWay: '動画経由で商品が売れた際にメーカーから支払われる成果報酬（売上の15〜25%）'
    },
    ticker: 'SOLO-TIKTOK',
    name: 'Faceless Commerce Automation',
    japaneseName: '顔出しなし実演物販（少数精鋭）',
    tagline: 'メーカーから無償サンプルを回収し手元実演動画を毎日30本投下して月商2,200万円',
    scaleTier: 'SOLO_MICRO',
    businessModel: 'COMMERCE_AUTO',
    foundedYear: 2024,
    teamSize: 3,
    weeklyHours: 35,
    headquarters: '東京都港区 / 海外外注',
    verifiedStatus: 'ESTIMATED_MODEL',
    estimatedValuationJpy: 120000000,
    evMultiple: 2.2,
    isForSale: true,
    askingPriceJpy: 130000000,
    actionHeadline: '【月商2,200万円・純利24%】仕入れ在庫リスクゼロ。動画編集をフィリピンへ完全外注',
    executiveSummary: 'ショート動画プラットフォーム（TikTok Shop等）の仕組みを活用し、顔を出さずに商品の手元実演動画（便利グッズ、掃除用具、美容機器）を量産。メーカーからの成果報酬（アフィリエイト）で利益を自動計上。',
    coreMoatDescription: '「どのフック（冒頭2秒の映像）が視聴完了率を跳ね上げるか」をABテストした膨大な動画台本データベース。アルゴリズムの変動を複数アカウント運用で分散。',
    primaryMoat: 'PROCESS_POWER',
    moatScore: 82,
    tags: ['少数精鋭', '月商2200万', '顔出し不要', '仕入れ0円', '動画物販', '外注化'],
    initialInvestmentJpy: 50000,
    financials: [
      { period: '2024通期', revenueJpy: 145000000, cogsJpy: 43500000, grossProfitJpy: 101500000, grossMarginPercent: 70.0, opexJpy: 66700000, operatingProfitJpy: 34800000, operatingMarginPercent: 24.0, netIncomeJpy: 34800000, netMarginPercent: 24.0 },
      { period: '2025通期', revenueJpy: 264000000, cogsJpy: 79200000, grossProfitJpy: 184800000, grossMarginPercent: 70.0, opexJpy: 121440000, operatingProfitJpy: 63360000, operatingMarginPercent: 24.0, netIncomeJpy: 63360000, netMarginPercent: 24.0 }
    ],
    tools: [
      { name: 'CapCut Pro / 自動文字起こし', category: '動画編集', monthlyCostJpy: 12000, purpose: '手元動画の自動字幕入れ・テンプレ適用', replacementDifficulty: 'LOW' },
      { name: '海外外注編集クラウド', category: '人件費', monthlyCostJpy: 450000, purpose: 'フィリピン・ベトナムの編集者3名への委託費', replacementDifficulty: 'MEDIUM' }
    ],
    competitors: [
      { name: '大手インフルエンサー事務所', scaleLabel: '未上場', annualRevenueJpy: 1500000000, operatingMarginPercent: 12.0, moatSummary: '有名タレント依存、高額マネジメント人件費', pricingPower: '中' }
    ],
    initialTractionStrategy: 'Amazonや楽天の売れ筋ランキングから「動画映えする地味な悩み解決グッズ」を抽出。TikTokクリエイターマーケットプレイスでメーカーに無料サンプルを申請し、初月100本投稿。',
    proSecretInsight: '動画が1本バズったら、その商品のメーカーに直接連絡し「限定クーポン発行」と「成果報酬率の引き上げ（通常10%→25%）」を交渉。一気に利益率を跳ね上げる。'
  },

  // 18. 個人少数精鋭: 知能型営業受託
  {
    id: 'solo-clay-aaa',
    businessEssence: {
      whatItDoes: '資金調達したばかりの企業を検知し、AIで相手に合わせた営業メールを自動生成して商談を獲得する代行',
      targetCustomer: '新規顧客の開拓に苦しんでいるB2B企業・ITベンダー',
      valueProposition: 'アポが取れないテレアポ部隊を雇う人件費をゼロにし、質の高い商談だけを成果報酬で獲得',
      monetizationWay: '月額固定運用費30万円＋商談1件獲得ごとに3万〜5万円の成功報酬'
    },
    ticker: 'SOLO-CLAY',
    name: 'Clay-Driven Outbound Agency',
    japaneseName: '知能型営業受託（AI営業代行）',
    tagline: '社員2名で月商800万円・純利益率65%。資金調達直後の企業へパーソナライズ営業を全自動送付',
    scaleTier: 'SOLO_MICRO',
    businessModel: 'MICRO_SAAS',
    foundedYear: 2024,
    teamSize: 2,
    weeklyHours: 25,
    headquarters: '東京都渋谷区',
    verifiedStatus: 'ESTIMATED_MODEL',
    estimatedValuationJpy: 96000000,
    evMultiple: 2.0,
    isForSale: true,
    askingPriceJpy: 100000000,
    actionHeadline: '【月利520万円・利益率65%】調達データベースとLinkedInをAPIで繋ぎ、超個別提案を自動送信',
    executiveSummary: 'B2B企業向けに、新規見込み客（リード）の獲得を完全自動化する受託サービス。データ収集ツール（Clay）と大規模言語モデルを繋ぎ、企業の決算ニュースや採用情報を踏まえた「刺さるコールドメール」を毎日数千通送信。',
    coreMoatDescription: '顧客リストのスクレイピングから文章生成、ドメイン暖気、メール配信までをノーコードで組み上げた完全自動パイプライン。成果報酬型（商談1件獲得で3万〜5万円）のため顧客獲得が容易。',
    primaryMoat: 'PROCESS_POWER',
    moatScore: 84,
    tags: ['少数精鋭', '月商800万', '月利520万', 'AI営業代行', 'B2B受託', '成果報酬'],
    initialInvestmentJpy: 100000,
    financials: [
      { period: '2024通期', revenueJpy: 96000000, cogsJpy: 14400000, grossProfitJpy: 81600000, grossMarginPercent: 85.0, opexJpy: 19200000, operatingProfitJpy: 62400000, operatingMarginPercent: 65.0, netIncomeJpy: 62400000, netMarginPercent: 65.0 }
    ],
    tools: [
      { name: 'Clay.com Enterprise', category: 'データ連携', monthlyCostJpy: 180000, purpose: 'LinkedIn/Crunchbaseからの企業データ取得とAI文面生成', replacementDifficulty: 'HIGH' },
      { name: 'Instantly.ai', category: '配信自動化', monthlyCostJpy: 60000, purpose: '複数ドメインからのメール分散自動送信・到達率維持', replacementDifficulty: 'LOW' }
    ],
    competitors: [
      { name: '従来型テレアポ代行', scaleLabel: '国内中堅', annualRevenueJpy: 800000000, operatingMarginPercent: 15.0, moatSummary: '大量の人員投入、架電数頼み、高離職率', pricingPower: '低' }
    ],
    initialTractionStrategy: '自分自身のシステムを使い、シリーズAを調達したばかりのスタートアップ経営者100人に「調達おめでとうございます。御社の採用職種に合わせた見込み顧客をAIで集めました」とメールし即座に初案件獲得。',
    proSecretInsight: '顧客に月額固定のコンサル料（30万円）＋商談獲得ごとの成功報酬（3万円）を請求。固定費で外注費とツール代を全額賄い、成功報酬が丸ごと純利益として手元に残る二重構造。'
  },

  // 19. 個人少数精鋭: 地方清掃デジタル化
  {
    id: 'solo-local-dx',
    businessEssence: {
      whatItDoes: '戸建ての外壁洗浄や蜂の巣駆除をLINEで写真自動見積もりし、地元の高齢職人に外注するサービス',
      targetCustomer: '家のコケや汚れに悩む地方の戸建て住宅オーナー',
      valueProposition: '相見積もりや電話相談の煩わしさを無くし、スマホで写真を送るだけで10秒で見積確定',
      monetizationWay: '顧客からの施工代金を受金し、45%を下請け職人へ支払い、差額55%を手残り利益として回収'
    },
    ticker: 'SOLO-LOCALDX',
    name: 'Local Service Digital Franchise',
    japaneseName: '地方実業デジタル化（外壁洗浄・害虫駆除）',
    tagline: 'LINE自動見積もりと下請け職人網で月商450万円・純利益率55%を稼ぎ出す無店舗ビジネス',
    scaleTier: 'SOLO_MICRO',
    businessModel: 'LOCAL_DX',
    foundedYear: 2023,
    teamSize: 1,
    weeklyHours: 15,
    headquarters: '静岡県浜松市',
    verifiedStatus: 'ESTIMATED_MODEL',
    estimatedValuationJpy: 54000000,
    evMultiple: 2.0,
    isForSale: true,
    askingPriceJpy: 55000000,
    actionHeadline: '【月商450万円・純利240万円】自ら清掃作業はせず、LINE公式アカウントで集客して地元の職人へ丸投げ',
    executiveSummary: '地方の戸建て住宅向けの外壁高圧洗浄および蜂の巣駆除サービス。自身は道具を持たず、Google広告とLINE自動見積もりで集客し、地元の高齢化している個人職人へ作業を外注（売上の45%をキックバック）。',
    coreMoatDescription: '地方都市では競合の清掃業者がホームページすら持たず電話対応のみという情報の非対称性。スマホで写真を送るだけで即座に見積もりが届くUXで独占。',
    primaryMoat: 'PROCESS_POWER',
    moatScore: 81,
    tags: ['完全1人', '月商450万', '月利240万', '初期0円', '地方実業DX', '非IT職人外注'],
    initialInvestmentJpy: 30000,
    financials: [
      { period: '2024通期', revenueJpy: 54000000, cogsJpy: 16200000, grossProfitJpy: 37800000, grossMarginPercent: 70.0, opexJpy: 8100000, operatingProfitJpy: 29700000, operatingMarginPercent: 55.0, netIncomeJpy: 29700000, netMarginPercent: 55.0 }
    ],
    tools: [
      { name: 'Lステップ (LINE公式)', category: '顧客管理', monthlyCostJpy: 32000, purpose: '写真送付からの画像認識・自動概算見積もり・予約確定', replacementDifficulty: 'MEDIUM' },
      { name: 'Google Local Ads', category: '集客広告', monthlyCostJpy: 350000, purpose: '「外壁掃除 浜松」「蜂駆除」などの地域リスティング', replacementDifficulty: 'LOW' }
    ],
    competitors: [
      { name: 'くらしのマーケット出店者', scaleLabel: '個人事業主', annualRevenueJpy: 12000000, operatingMarginPercent: 40.0, moatSummary: '自ら現場作業、プラットフォーム手数料20%', pricingPower: '低（相見積もり）' }
    ],
    initialTractionStrategy: '1枚5円のチラシを近隣の築15年以上の戸建て住宅に5,000枚ポスティング。「外壁のコケ、写真1枚で即LINE見積もり」のQRコードから初月15件を受注。',
    proSecretInsight: '清掃作業に来た顧客に対し、「シロアリ無料点検」を提案。点検で床下の湿気や白蟻が見つかった場合、提携している大手防除業者へトスアップし、1件あたり15万円の紹介料を獲得。'
  }
];
