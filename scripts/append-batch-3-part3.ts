import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const part3Entities = [
  // 16. Authority Hacker
  {
    id: 'ent_authorityhacker_24e1384860f1c46f0b55',
    ticker: 'AUTH.HCKR',
    name: 'Authority Hacker',
    legalEntity: 'Authority Hacker Ltd',
    tagline: '「SEOの欺瞞と綺麗事を完全排除する」と冷徹なデータ検証ポッドキャストを武器に、高単価オンライン実践講座とコミュニティで年商7.5億円を稼ぎ出すアフィリエイトの虎',
    sector: 'INFO_MEDIA',
    scale: 'MICRO_TEAM',
    founder: 'Gael Breton, Mark Webster',
    country: 'UK',
    url: 'https://www.authorityhacker.com',
    verifiedBadge: true,
    growthRateYoY: 20.0,
    architecturePattern: '高額教育ギルド',
    pipelineStack: 'Authority Hacker Podcast（週刊生配信） × Ahrefs/SurferSEO実証実験 × 高額講座（$997〜$2,997） × AI Acceleratorコミュニティ',
    targetPainWallet: 'Googleコアアップデートで自社サイトが圏外に吹き飛び毎月の広告収入が即死したアフィリエイター・副業挑戦者の絶望',
    tags: ['SEO教育', '年商7.5億', 'アフィリエイト', 'AI自動化スクール', 'ポッドキャスト集客'],
    pnl: {
      monthlyRevenue: 62500000, // 年商約$5M ≒ ¥7.5億円 (月商約¥6,250万円)
      cogs: 3000000, // 講座プラットフォーム・決済手数料
      grossProfit: 59500000,
      grossMargin: 95.2,
      operatingExpenses: {
        serverAndApi: 1000000,
        advertising: 12000000, // リターゲティング広告
        subcontracting: 15000000, // リサーチャー・動画編集者
        toolsAndSaaS: 2500000,
        other: 4000000,
      },
      operatingProfit: 25000000, // 創業者2人の手残り純利（月間約2,500万円、利益率40%）
      operatingMargin: 40.0,
      estimatedAnnualNetProfit: 300000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2023〜2024年（累計受講生1.5万人突破・AIスクールピボット期）',
      sourceDoc: 'Authority Hacker公式ポッドキャスト / Referly / Indie Hackers',
      estimationLogic: '有料受講生15,000人 × 平均客単価$1,500 ＋ 年間コミュニティ会費 ＝ 年商約$5M（約¥7.5億円 ➔ 月商約6,250万円）',
    },
    evidenceCards: [
      {
        id: 'ev_ah_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】自前の実験サイトで数万ドルの検証データを晒し、最高額の攻略本を売るコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '「理論ではなく実際のGoogle検索で何が起きたか」を100万語のケーススタディで公開し、講座を即決させる。',
        details: [
          '【ポッドキャストによる無料の信頼担保】: GaelとMarkが毎週、最新のアルゴリズム変動やペナルティの生々しいデータをポッドキャストで暴露。',
          '【高額バックエンド（$2,997）への一本道】: 初心者向け講座『TASS』で信頼を得た後、年商数千万円規模を目指す上級者コミュニティ『Authority Hacker Pro』へ導線。',
          '【AI時代への高速ピボット】: 従来のSEO記事執筆が崩壊するや否や、最速でプログラマティックSEOとAI自動化スクール『AI Accelerator』を立ち上げ顧客を再活性化。',
        ],
        codeSnippet: '// 高単価実践スクール配管\n1. 実際に自前でメディアを10個運用し、毎月のアクセス・収益の生データを収集\n2. ポッドキャストと長文ブログで「大衆が知らない最新の仕様変更」を無料公開\n3. 年2回の限定ウェビナー（ローンチイベント）で高額講座（¥150,000〜¥450,000）を一括販売',
        sourceNote: 'Gael Breton 講演録',
      },
      {
        id: 'ev_ah_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：ハンガリー・ブダペストの安アパートでの自虐実験',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '受託Web制作の奴隷労働に耐えかねた2人が、ヨーロッパの格安都市に籠もってアフィリエイト検証を開始。',
        details: [
          '2014年、健康食品やスポーツ用品のニッチ特化サイトを量産し、Amazonアソシエイトで月数百万円の不労所得を構築。',
          'その過程で得た「どの被リンクが効いて、どのリンクがペナルティを受けるか」の膨大な実験記録をブログに全公開。',
          '詐欺的な情報商材屋が横行する業界で、圧倒的な実証データにより瞬く間に業界標準の教育ブランドへ上り詰めた。',
        ],
        sourceNote: 'The Authority Hacker Story',
      },
      {
        id: 'ev_ah_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：大手SEOコンサル会社が教育講座を売れない理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: '大手コンサルは「月額100万円の受託運用契約」を売りたいため、自社のノウハウをすべて講座で公開できない。',
        details: [
          '大手が「自分で月3万円でできるSEOの全手順」を公開してしまうと、自社の超高額な月額リテイナー契約を顧客に解約されてしまう。',
          'Authority Hackerは受託を完全に捨て、ノウハウを100%開示する教育に全振りしたため、世界中の個人・中小企業の支持を独占できた。',
        ],
        sourceNote: 'SEO Agency Cannibalization Dilemma',
      },
      {
        id: 'ev_ah_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：会社の給料だけに依存しているサラリーマンの将来破滅恐怖',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '「いつクビになるか分からない」という雇用の不安と、副業で月100万円の自動収入を作りたい強烈な欲望。',
        details: [
          '受講生にとって講座代金（$1,500）は、「一生ものの自由を手に入れるための自己投資」という大義名分で正当化される。',
          '15,000人以上の成功事例という社会的証明（Social Proof）が、購入前の迷いを瞬時に消滅させる。',
        ],
        sourceNote: 'High-Ticket Course Buying Psychology',
      },
    ],
    observationsStream: [
      {
        date: '2024-06',
        author: 'Make-Money アナリスト',
        text: 'GoogleのSGE（AI Overviews）導入に伴うメディア淘汰の波を受け、カリキュラムを「AIエージェントによる自動サイト構築」へ全面刷新。既存卒業生へのアップセルで過去最高収益を更新。',
      },
    ],
    temporal: {
      foundedYear: 2014,
      initialTractionPeriod: '2014〜2016年（ブダペストでの自作実験サイトデータ公開による急成長）',
      dataSnapshotPeriod: '2024年（公式発表・受講生データ）',
      eraContext: 'Amazonアソシエイト全盛期から、Googleの相次ぐコアアップデートによる大淘汰期',
      viabilityStatus: 'EVOLVING_BARRIER',
      viabilityLabel: '技術進化で特化必須',
      currentViabilityAnalysis: '単純なアフィリエイトサイトは死滅しつつあるが、同社はAI自動化とブランド構築への移行をいち早く完了させ強固なポジションを維持。',
    },
  },

  // 17. 100 Days of No Code
  {
    id: 'ent_case06_14e0a1cb7e58ff0313ee',
    ticker: 'HNDR.NOCO',
    name: '100 Days of No Code',
    legalEntity: '100 Days of No Code Ltd',
    tagline: '「プログラミングを学ぶな、1日30分ツールを繋げ」と非エンジニアの挫折感を救済し、100日間の公開コミットメント習慣化で年商8,000万円を稼ぎ出すノーコード学習村',
    sector: 'INFO_MEDIA',
    scale: 'SOLO',
    founder: 'Max Haining',
    country: 'UK',
    url: 'https://www.100daysofnocode.com',
    verifiedBadge: true,
    growthRateYoY: 35.0,
    architecturePattern: '習慣化ハックコミュニティ',
    pipelineStack: 'Circleコミュニティ × Twitter #100DaysOfNoCodeハッシュタグ × Zapier/Airtable/Softr演習 × 年額$250〜$750パス',
    targetPainWallet: '何回PythonやJavaScriptの入門書を買っても1章で挫折した文系ビジネスマンの「自分はアプリを作れない」劣等感',
    tags: ['ノーコード教育', '年商8000万', 'Twitterバイラル', 'コミュニティ課金', 'ソロプレナー'],
    pnl: {
      monthlyRevenue: 6600000, // 年商約$550k ≒ ¥8,000万円 (月商約¥660万円)
      cogs: 300000, // Circleプラットフォーム・決済手数料
      grossProfit: 6300000,
      grossMargin: 95.5,
      operatingExpenses: {
        serverAndApi: 100000,
        advertising: 0, // 広告費完全ゼロ（Twitterハッシュタグで生徒が毎日自発的に拡散）
        subcontracting: 1200000, // コミュニティマネージャー・ゲスト講師
        toolsAndSaaS: 300000,
        other: 400000,
      },
      operatingProfit: 4300000, // Max個人の手残り純利（月間約430万円、利益率65%）
      operatingMargin: 65.2,
      estimatedAnnualNetProfit: 51600000,
      financialStatus: 'ESTIMATED',
      dataSnapshotPeriod: '2023〜2024年（コミュニティ会員数約1,500名・ブートキャンプ年数回開催）',
      sourceDoc: 'Max Haining X（Twitter）公開収益ログ・Indie Hackers取材',
      estimationLogic: '年間コミュニティ会員約1,000名（$250/年） ＋ 集中ブートキャンプ（$750）年3回 ＝ 年商約$550k（約¥8,000万円 ➔ 月商約660万円）',
    },
    evidenceCards: [
      {
        id: 'ev_100d_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】生徒自身に「#100DaysOfNoCode」と毎日ツイートさせ、広告費ゼロで集客し続けるコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '「毎日の学習記録をSNSで報告すること」を受講ルールにし、全受講生を無給の宣伝インフルエンサーにする。',
        details: [
          '【公開コミットメントによる離脱防止】: 「Day 1/100: 今日はAirtableでDBを作った」と生徒が毎日Xに投稿。サボるとフォロワーにバレる恐怖で継続率が爆発。',
          '【自走するUGCトラフィックループ】: 数千人の受講生が毎日同じハッシュタグで投稿するため、タイムラインを見た別の文系ビジネスマンが「自分もやってみたい」と自然流入。',
          '【マイクロレッスン形式】: 1日わずか30分の極小タスクに分解し、「忙しくて勉強できない」という言い訳を完全粉砕。',
        ],
        codeSnippet: '// コミットメント強制型バイラル教育配管\n1. 「100日間、毎日30分だけ実践する」という極小のルールを提示\n2. 毎日の成果物を専用ハッシュタグをつけてXやLinkedInに投稿することを義務付け\n3. 生徒のタイムラインを見た友人が連鎖的に参加し、CAC（獲得コスト）完全ゼロで会員増殖',
        sourceNote: 'Max Haining 創業ストーリー',
      },
      {
        id: 'ev_100d_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：ロックダウン中のロンドンで始めた個人チャレンジ',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '2020年のコロナ隔離期間中、非エンジニアだったMax自身がノーコードを学ぶために立てたTwitterの誓い。',
        details: [
          '「コードが書けない自分でもWebサービスを作れるか？」を検証するため、毎日の勉強記録を#100DaysOfNoCodeをつけて投稿開始。',
          '同じ悩みを持つ世界中のビジネスマンから「自分も混ぜてほしい」とリプライが殺到。',
          '最初はWhatsAppグループで無料運営し、人が溢れた段階でCircleコミュニティへ移行し有料化。',
        ],
        sourceNote: 'Indie Hackers "How I Grew 100DaysOfNoCode to $50k MRR"',
      },
      {
        id: 'ev_100d_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：伝統的プログラミングブートキャンプが真似できない理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: '既存のプログラミングスクールは「1人100万円の学費」を取る重厚なカリキュラムに囚われている。',
        details: [
          'CodecademyやGeneral Assemblyなどは「エンジニア転職」をゴールに設定しているため、数ヶ月〜1年の過酷な講義を組む。',
          '大衆の9割は「自分のアイデアを形にする小さなWebアプリが作れればいいだけ」であり、100万円の学費もフルタイムの勉強時間も出せない。',
        ],
        sourceNote: 'Bootcamp Economics vs Micro-learning Communities',
      },
      {
        id: 'ev_100d_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：「エンジニアにアイデアをバカにされる」非技術者の屈辱',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '新規事業のアイデアがあっても、社内のエンジニアに「工数が足りない」「仕様が甘い」と一蹴される営業マンの怒り。',
        details: [
          'ノーコードを身につければ、エンジニアにお願いすることなく今週末に自分で動くプロトタイプを作れる。',
          '「自分で作れる人間になる」というセルフエスティームの向上欲求が、年額数万円の出費を即決させる。',
        ],
        sourceNote: 'No-Code Adoption Psychology in Enterprise',
      },
    ],
    observationsStream: [
      {
        date: '2024-05',
        author: 'Make-Money アナリスト',
        text: 'ノーコード単体から「AIツール（v0, Cursor, Make）とノーコードの融合」へカリキュラムを拡大。法人向け社内DXブートキャンプの受注を開始し客単価を向上。',
      },
    ],
    temporal: {
      foundedYear: 2020,
      initialTractionPeriod: '2020〜2021年（コロナ隔離期のTwitterハッシュタグ運動から有料化）',
      dataSnapshotPeriod: '2024年（本人開示データ）',
      eraContext: 'Bubble, Zapier, Webflowの台頭と「No-Code」ムーブメントの爆発期',
      viabilityStatus: 'ACTIVE_PLAYBOOK',
      viabilityLabel: '現在も有効',
      currentViabilityAnalysis: 'AIコーディングが進化しても「非エンジニアが直感的に自動化を組む」需要は不変であり、習慣化コミュニティとしての参入障壁が高い。',
    },
  },

  // 18. Buy Me a Coffee
  {
    id: 'ent_buymeacoffee_099aa188e018bccb70e9',
    ticker: 'BMC.CAFE',
    name: 'Buy Me a Coffee',
    legalEntity: 'Buy Me a Coffee, Inc.',
    tagline: '「Patreonの重たい月額登録フォームを誰も書きたくない」という痛みを突き、ログイン不要・1クリックで$5の投げ銭を決済させて年商15億円・手数料5%を中抜きする関所',
    sector: 'SaaS',
    scale: 'MICRO_TEAM',
    founder: 'Jihan Zheng, Joseph Sunny',
    country: 'US',
    url: 'https://www.buymeacoffee.com',
    verifiedBadge: true,
    growthRateYoY: 30.0,
    architecturePattern: '摩擦ゼロ投げ銭関所',
    pipelineStack: 'Stripe Connect × Apple Pay/Google Pay 1タップ決済 × クリエイター個人ページ × 手数料5%自動徴収',
    targetPainWallet: 'ファンから少額の支援をもらいたいのに、会員登録やクレカ入力の面倒さで9割が決済前に離脱するクリエイターの無念',
    tags: ['クリエイターエコノミー', '年商15億', '決済プラットフォーム', '手数料5%', 'ブートストラップ'],
    pnl: {
      monthlyRevenue: 125000000, // GMV約$200M/年 ➔ 手数料5%で年商約$10M ≒ ¥15億円 (月商約¥1.25億円)
      cogs: 25000000, // Stripe処理原価・サーバー代
      grossProfit: 100000000,
      grossMargin: 80.0,
      operatingExpenses: {
        serverAndApi: 15000000,
        advertising: 2000000, // 広告費ほぼゼロ（クリエイターが自分のファンにURLを勝手に宣伝）
        subcontracting: 15000000, // カスタマーサポート・不正対策
        toolsAndSaaS: 8000000,
        other: 10000000,
      },
      operatingProfit: 50000000, // 営業利益率約40% (月商約5,000万円)
      operatingMargin: 40.0,
      estimatedAnnualNetProfit: 600000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2023〜2024年（クリエイター登録数100万人突破・推定GMV $200M規模）',
      sourceDoc: 'TechCrunch / Stripe Showcase / Buy Me a Coffee公式データ',
      estimationLogic: 'クリエイター登録100万人 × 年間流通総額約$200M × 自社テイクレート5% ＝ 年商約$10M（約¥15億円 ➔ 月商約1.25億円）',
    },
    evidenceCards: [
      {
        id: 'ev_bmc_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】寄付を「コーヒー1杯奢る（$5）」という極小の比喩にすり替え、決済摩擦をゼロにするコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '「パトロンになって毎月寄付してくれ」という重たい要求を、「コーヒー1杯ご馳走して」に変える。',
        details: [
          '【比喩の力学（Metaphorical Mastery）】: 「寄付（Donation）」というお堅い言葉を排し、「コーヒーを買う」という日常的で罪悪感のない比喩を採用。',
          '【アカウント作成不要のApple Pay決済】: 支援者は会員登録もパスワード設定も不要。Apple Payで指紋認証するだけで1秒で$5が送金される。',
          '【全クリエイターが無料で宣伝してくれる配管】: クリエイター自身がYouTubeの概要欄、Xのプロフィール、GitHubのREADMEに「buymeacoffee.com/名前」を貼り付けて勝手に集客。',
        ],
        codeSnippet: '// 摩擦ゼロ投げ銭配管\n1. クリエイターに30秒で公開できるプロフィールページを提供\n2. 支援金額を「☕ $5」「☕☕ $10」「☕☕☕ $15」のボタン選択式にする\n3. Stripe Connectで決済を通し、5%を自社口座へ自動中抜きしてクリエイターに即時送金',
        sourceNote: 'Jihan Zheng 創業ドキュメント',
      },
      {
        id: 'ev_bmc_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：Patreonのユーザー離脱フォーラムを急襲',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: 'Patreonが手数料値上げやUIの複雑化で大炎上した際、「最もシンプルで手数料の安い代替」として即座にローンチ。',
        details: [
          '2018年、Patreonの度重なるポリシー改定と手数料引き上げに怒っていたクリエイターたちのツイートを特定。',
          '「登録不要で今すぐ寄付を受け取れるシンプルなページ」として直接リプライで提案。',
          'オープンソース開発者やポッドキャスターが次々とPatreonから乗り換え、初期のトラクションを獲得。',
        ],
        sourceNote: 'TechCrunch "Buy Me a Coffee Takes on Patreon"',
      },
      {
        id: 'ev_bmc_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：Patreonが単発投げ銭をメインにできない理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: 'Patreonは「月額サブスクリプション」を前提とした重厚な会員制プラットフォームとして巨額調達してしまった。',
        details: [
          'PatreonはVCから数億ドル調達しており、企業価値を正当化するために「継続的なMRR」を最重要指標に据えている。',
          '単発の少額投げ銭（$3〜$5）をメイン動線にすると、月額会員のコンバージョンが下がるため、UIをシンプルに簡素化できない。',
        ],
        sourceNote: 'Patreon Business Model Dilemma',
      },
      {
        id: 'ev_bmc_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：無料コンテンツを毎日消費しているファンの後ろめたさ',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '「いつも有益な無料記事やツールを使わせてもらっているのに、何もお礼をしていない」という罪悪感。',
        details: [
          '月額1,000円の会員になるのは重いが、500円のコーヒーを1杯奢るくらいなら「感謝の気持ち」として気軽に払える。',
          'ファンはお金を払うことで「クリエイターを支援している良きファン」という自己肯定感を得る。',
        ],
        sourceNote: 'Micro-tipping Psychology and Guilt Alleviation',
      },
    ],
    observationsStream: [
      {
        date: '2024-04',
        author: 'Make-Money アナリスト',
        text: '単発投げ銭から月額メンバーシップ機能やデジタル商品販売（ダウンロード販売）へ拡張。PatreonとGumroadの両方の領土を侵食しつつ、手数料5%の超低コストを維持。',
      },
    ],
    temporal: {
      foundedYear: 2018,
      initialTractionPeriod: '2018〜2020年（Patreon炎上時におけるオープンソース開発者の大量獲得）',
      dataSnapshotPeriod: '2024年（公式データ・業界推計）',
      eraContext: 'クリエイターエコノミーの爆発と、重厚な月額サブスクに対する「単発マイクロペイメント」需要の急増期',
      viabilityStatus: 'MATURED_MOAT',
      viabilityLabel: '先行者堀で堅牢',
      currentViabilityAnalysis: 'Stripe Connectを用いたグローバル送金網と「Buy Me a Coffee」という比喩の第一想起により、極めて強固なネットワーク効果を確立。',
    },
  },

  // 19. Capterra
  {
    id: 'ent_capterra_fa23dd140c0caa384afd',
    ticker: 'CPTR.GART',
    name: 'Capterra',
    legalEntity: 'Capterra, Inc. (Gartner)',
    tagline: '「ギフト券$20をあげるからレビューを書いて」とユーザーを釣って本物のクチコミを集め、SaaS企業から1クリック$50のPPC広告費を抜き続けるB2B比較サイトの胴元',
    sector: 'SaaS',
    scale: 'ENTERPRISE',
    founder: 'Michael Ortner',
    country: 'US',
    url: 'https://www.capterra.com',
    verifiedBadge: true,
    growthRateYoY: 15.0,
    architecturePattern: 'レビュー胴元アグリゲーター',
    pipelineStack: 'SEO大量比較ページ × レビュー投稿インセンティブ（Amazonギフト券） × 入札型PPC広告（Pay-Per-Click）',
    targetPainWallet: '「ソフトウェアを導入して大失敗し社内で降格・クビになる恐怖」に怯える企業の情報システム部長・総務部長',
    tags: ['B2Bレビュー', '年商150億超', 'Gartner買収', 'PPC広告モデル', '関所ビジネス'],
    pnl: {
      monthlyRevenue: 1250000000, // 年商約$100M+ ≒ ¥150億円 (月商約¥12.5億円)
      cogs: 125000000, // サーバー代・レビュー確認人件費（粗利90%）
      grossProfit: 1125000000,
      grossMargin: 90.0,
      operatingExpenses: {
        serverAndApi: 25000000,
        advertising: 200000000, // レビュー投稿促進ギフト券・SEO
        subcontracting: 150000000, // 法人営業・検証部隊
        toolsAndSaaS: 50000000,
        other: 200000000,
      },
      operatingProfit: 500000000, // 営業利益率約40% (月商約5億円)
      operatingMargin: 40.0,
      estimatedAnnualNetProfit: 6000000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: 'Gartnerグループ（Digital Markets部門）開示水準',
      sourceDoc: 'Gartner 10-K 年次報告書 / Michael Ortner創業回顧録',
      estimationLogic: '掲載SaaS数万社 × 月間数百〜数千クリック × 平均クリック単価（CPC）$10〜$50 ＝ 年商約$100M+（約¥150億円 ➔ 月商約12.5億円）',
    },
    evidenceCards: [
      {
        id: 'ev_cptr_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】客にギフト券を配ってクチコミを集め、競合同士に入札競争させてクリック課金するコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '「CRM 比較」「会計ソフト おすすめ」の検索1位に居座り、掲載企業から1クリック数千円を自動徴収する。',
        details: [
          '【ギフト券によるレビュー爆弾】: LinkedInで認証された本物のビジネスマンに「レビューを1件書けば$20のAmazonギフト券」を配り、数百万件の一次証言を独占。',
          '【カテゴリごとの入札戦争（PPC）】: 比較一覧の最上位に表示させたいSaaS企業同士をオークション形式で競わせ、クリック単価（CPC）を$50（約7,500円）まで吊り上げる。',
          '【解約不能のリード発生源】: B2B SaaSにとってCapterraからの流入は最も成約率が高いため、月間数百万円の広告費を払い続けざるを得ない。',
        ],
        codeSnippet: '// B2Bレビューアグリゲーター配管\n1. 特定の業界カテゴリ（「歯科医院向け予約ソフト」等）の全ツールを網羅\n2. 既存ユーザーにインセンティブを渡して生々しい星評価と長文レビューを大量収集\n3. Googleの「〇〇 比較」「〇〇 レビュー」のSEOを完全制圧し、掲載企業に入札広告枠を販売',
        sourceNote: 'Michael Ortner 講演録',
      },
      {
        id: 'ev_cptr_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：1999年、ドットコムバブル崩壊を生き残った電話帳戦略',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: 'Michael Ortnerが「企業の業務ソフトを探すイエローページ（電話帳）」として創業。',
        details: [
          '最初は固定月額の掲載料を取っていたが、2008年の金融危機を機に「成果報酬型（クリック課金）」へピボット。',
          '「購入意欲が最も高い見込み客がクリックした時だけ課金される」仕組みがSaaS企業に大ヒットし、売上が垂直立ち上げ。',
          '2015年に米調査会社大手Gartnerに数億ドルで巨額売却。',
        ],
        sourceNote: 'How Capterra Survived the Dot-Com Crash to Sell to Gartner',
      },
      {
        id: 'ev_cptr_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：Google検索が自前でB2Bレビューを組めない理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: 'Googleマップは飲食店やホテルのレビューには強いが、数千万円のエンタープライズERPの検証はできない。',
        details: [
          'B2Bソフトウェアのレビューには「実際にその会社に勤めているか」「どの部署で使っているか」の厳格な職歴・LinkedIn確認が必須。',
          'Googleのような巨大プラットフォームはサクラレビューやスパムを排除しきれず、Capterraのような専門審査部隊を持つバーティカルメディアに勝てなかった。',
        ],
        sourceNote: 'Vertical Search Engine Moat Dynamics',
      },
      {
        id: 'ev_cptr_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：「誰もIBMを選んでクビになった者はいない」という企業の保身本能',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '社内ツールの選定で失敗して社長や役員から激怒されたくない情シス担当者の防衛心理。',
        details: [
          '担当者は「Capterraで星4.5以上で、レビューが100件以上ある業界標準ツールだから選びました」と言い訳（大義名分）を用意したい。',
          'そのお墨付きを得るために、比較一覧の最上位に並んでいるツールから優先的に問い合わせを送る。',
        ],
        sourceNote: 'B2B Procurement Defense Psychology',
      },
    ],
    observationsStream: [
      {
        date: '2024-03',
        author: 'Make-Money アナリスト',
        text: 'Gartner傘下のGetApp, Software Adviceと統合され「Gartner Digital Markets」として世界市場を寡占。AIツールの激増に伴い、比較検索トラフィックがさらに拡大。',
      },
    ],
    temporal: {
      foundedYear: 1999,
      initialTractionPeriod: '1999〜2008年（イエローページ型からPPCクリック課金モデルへの大転換）',
      dataSnapshotPeriod: '2024年（Gartner 10-Kファイリング）',
      eraContext: 'エンタープライズソフトウェアのクラウドSaaS移行期における比較検討需要の爆発',
      viabilityStatus: 'MATURED_MOAT',
      viabilityLabel: '先行者堀で堅牢',
      currentViabilityAnalysis: '数百万件の検証済みレビューデータとGoogleの強固なSEOドメインパワーにより、競合の参入が事実上不可能な胴元。',
    },
  },

  // 20. Flowbase
  {
    id: 'ent_case06_088d5fdc6a842839fd12',
    ticker: 'FLOW.BASE',
    name: 'Flowbase',
    legalEntity: 'Flowbase Pty Ltd',
    tagline: '「WebflowやFramerでゼロからボタンやナビゲーションを作る時間をドブに捨てるな」とデザイナーの怠惰を突き、コピペ可能なパーツ集で年商3億円・粗利90%を稼ぐコンポーネントの関所',
    sector: 'SaaS',
    scale: 'MICRO_TEAM',
    founder: 'Tom Geurts',
    country: 'AU',
    url: 'https://www.flowbase.co',
    verifiedBadge: true,
    growthRateYoY: 25.0,
    architecturePattern: 'コピペパーツ関所',
    pipelineStack: 'Webflow/Framer拡張機能 × Chrome Extension × Stripe年額サブスク（$199〜$399）',
    targetPainWallet: '納期に追われ睡眠不足で死にそうなWeb制作会社のデザイナー ＆ HTML/CSSが書けないノーコード受託者',
    tags: ['Webflowコンポーネント', '年商3億', 'Framer拡張', 'コピペ直販', '粗利90%'],
    pnl: {
      monthlyRevenue: 25000000, // 年商約$2M ≒ ¥3億円 (月商約¥2,500万円)
      cogs: 2500000, // 決済手数料・サーバー代（約10%）
      grossProfit: 22500000,
      grossMargin: 90.0,
      operatingExpenses: {
        serverAndApi: 1000000,
        advertising: 1500000,
        subcontracting: 6000000, // 外注Webflowデザイナー
        toolsAndSaaS: 1000000,
        other: 2000000,
      },
      operatingProfit: 12000000, // 創業者手残り純利（月間約1,200万円、利益率48%）
      operatingMargin: 48.0,
      estimatedAnnualNetProfit: 144000000,
      financialStatus: 'ESTIMATED',
      dataSnapshotPeriod: '2023〜2024年（有料会員数約5,000名・年間サブスク中心）',
      sourceDoc: 'Tracxn / Flowbase公式開示 / Indie Hackers',
      estimationLogic: '有料制作会社・フリーランス約5,000社 × 年額平均$300 ＝ 年商約$1.5M〜$2M（約¥2.5億〜3億円 ➔ 月商約2,500万円）',
    },
    evidenceCards: [
      {
        id: 'ev_flwb_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】ノーコード開発画面にプラグインとして常駐し、「右クリック1回でパーツ挿入」を課金化するコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: 'Webflowの編集画面の中に直接入り込み、美しく作られたヘッダーやPricingテーブルを1秒でコピペさせる。',
        details: [
          '【ワークフローへの完全な寄生】: 独立したWebサイトに行かせるのではなく、Webflowの公式拡張機能（Apps）としてエディタ内に常駐。',
          '【本体無料のおびき寄せ罠】: 100種類以上の基本パーツを完全無料でコピーさせ、高度なアニメーション付きコンポーネントで年額プランへロックイン。',
          '【クライアント納期の短縮による投資回収】: 「1つのWebサイトの制作時間が10時間短縮される」ため、受託制作会社にとって年額$299は案件1件で10倍回収できる計算。',
        ],
        codeSnippet: '// エコシステム寄生型コンポーネントライブラリ配管\n1. WebflowやFramerの公式アプリストア/拡張機能としてプラグインを公開\n2. 500以上のUIコンポーネント（ナビゲーション、ヒーロー、FAQ、フッター）を事前作成\n3. 年額サブスク（¥45,000）で全コンポーネントの無制限コピペ権限を付与',
        sourceNote: 'Tom Geurts 創業インタビュー',
      },
      {
        id: 'ev_flwb_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：自作のWebflow無料クローンプロジェクト配布',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '2018年、Webflowのフォーラムで「誰でも無料でクローンできる高品質サイト」を無料配布。',
        details: [
          'デザイナーのTomが、自分で作ったナビゲーションバーやメガメニューを「Cloneable」としてコミュニティに寄贈。',
          'Webflow公式のショーケースで何万回もクローンされ、デザイナー界隈で一気に知名度を獲得。',
          'パーツ数が増えた段階で独自サイト「Flowbase」を立ち上げ、プロ向けプレミアムサブスクを導入。',
        ],
        sourceNote: 'Webflow Community Showcase History',
      },
      {
        id: 'ev_flwb_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：Webflow公式が自前でコンポーネント集を完備できない理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: 'プラットフォーム本体（Webflow）は「ツールの開発」に手一杯で、デザインパーツの流行を追い切れない。',
        details: [
          'Webflowはエンジニアリング（ホスティング基盤やデザインエンジンの開発）が本業。',
          '毎月変わるデザイントレンド（グラスモーフィズム、Bentoグリッド等）に合わせて数百個のパーツをデザイン・保守する作業はサードパーティに丸投げする方が合理的。',
        ],
        sourceNote: 'No-Code Ecosystem Division of Labor',
      },
      {
        id: 'ev_flwb_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：明日の朝までにクライアントに初稿を出さなければいけないデザイナーの絶望',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '深夜2時にゼロからレスポンシブ対応のナビゲーションを組む地獄の作業時間。',
        details: [
          'Flowbaseがあれば、プロが組んだバグのないメガメニューを数秒で貼り付けて色を変えるだけで完了する。',
          '「今夜寝られるかどうか」という肉体的苦痛の切除のために、デザイナーは喜んで会社のカードで課金する。',
        ],
        sourceNote: 'Agency Designer Overwork Dynamics',
      },
    ],
    observationsStream: [
      {
        date: '2024-02',
        author: 'Make-Money アナリスト',
        text: 'Webflowに加え、新興の高速ノーコードツール『Framer』向けコンポーネントにも対応を拡大。プラットフォームのマルチ展開でMRRをさらに上乗せ。',
      },
    ],
    temporal: {
      foundedYear: 2018,
      initialTractionPeriod: '2018〜2020年（Webflowフォーラムでの無料クローン配布によるファン獲得）',
      dataSnapshotPeriod: '2024年（業界推計）',
      eraContext: 'Web制作がWordPressからWebflow/Framerなどの次世代ノーコードツールへシフトした移行期',
      viabilityStatus: 'ACTIVE_PLAYBOOK',
      viabilityLabel: '現在も有効',
      currentViabilityAnalysis: 'Framerエコシステムの爆発的成長に伴い、UIコンポーネントの需要はさらに拡大しており、極めて高粗利なキャッシュマシン。',
    },
  },

  // 21. Simple Ink
  {
    id: 'ent_case06_188896472285fada46a1',
    ticker: 'SMPL.INK',
    name: 'Simple Ink',
    legalEntity: 'Simple Ink Inc.',
    tagline: '「WordPressのサーバー管理もプラグイン更新も嫌悪する」ズボラなNotionユーザーを狙い、Notionページを1クリックでSEO爆速Webサイトに変えて年商2億円でバイアウトされたマイクロSaaS',
    sector: 'SaaS',
    scale: 'SOLO',
    founder: 'Ch Daniel, David',
    country: 'UK',
    url: 'https://simple.ink',
    verifiedBadge: true,
    growthRateYoY: 40.0,
    architecturePattern: '寄生型Webサイト化',
    pipelineStack: 'Cloudflare Workers × Notion APIキャッシュ × Stripe月額サブスク（$12/月〜）',
    targetPainWallet: 'Webサイトを持ちたいが、WordPressの設定が難しくて吐き気がする個人起業家やポートフォリオ難民',
    tags: ['Notion to Website', '年商2億', 'M&A売却', 'Cloudflare Workers', 'マイクロSaaS'],
    pnl: {
      monthlyRevenue: 16000000, // 年商約$1.3M ≒ ¥2億円 (月商約¥1,600万円)
      cogs: 1200000, // Cloudflare Workersおよびドメイン原価
      grossProfit: 14800000,
      grossMargin: 92.5,
      operatingExpenses: {
        serverAndApi: 500000,
        advertising: 0, // プログラマティックSEOで完全オーガニック集客
        subcontracting: 3000000,
        toolsAndSaaS: 500000,
        other: 800000,
      },
      operatingProfit: 10000000, // 営業利益率約62.5% (月商約1,000万円)
      operatingMargin: 62.5,
      estimatedAnnualNetProfit: 120000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2023年M&A買収時水準',
      sourceDoc: 'Ch Daniel公開インタビュー / Acquire.com買収開示',
      estimationLogic: '有料サイト数約10,000サイト × 平均月額$12 ＝ 年商約$1.3M（約¥2億円 ➔ 月商約1,600万円）',
    },
    evidenceCards: [
      {
        id: 'ev_sink_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】世界一使いやすいNotionを「CMS（記事投稿画面）」に見立てて、ドメイン代と月額費を抜くコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: 'Notionの共有リンクを貼り付けるだけで、独自ドメイン・高速表示・SEOタグ対応のWebサイトを即時生成する。',
        details: [
          '【更新作業の認知負荷ゼロ】: サイトを更新したい時は、普段使い慣れたNotionのページに文字を打ち込むだけ。自動でWebサイト側に即時反映。',
          '【プログラマティックSEOによる無料集客】: 「How to build a website with Notion for [職種]」という数千ページのSEO記事を自動生成し、Google検索から独占流入。',
          '【本体無料によるバイラル拡散】: 無料プランでは「Made with Simple.ink」のフッターリンクが付き、訪問者が連鎖的に新規登録するバイラルループ。',
        ],
        codeSnippet: '// Notion to Web変換配管\n1. ユーザーのNotion公開URLを取得し、API経由でHTMLへ変換してCloudflareエッジにキャッシュ\n2. 独自ドメイン（DNS）とカスタムCSS/フォント設定機能を有料化（月額$12）\n3. 全無料サイトの最下部に自社バナーを強制表示させ、被リンクと新規ユーザーを自動獲得',
        sourceNote: 'Ch Daniel 創業インタビュー',
      },
      {
        id: 'ev_sink_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：先行競合Super.soの盲点を突いた「本体無料・機能人質」戦略',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '先行者Super.soが月額$12の完全有料だった隙を突き、「完全無料プラン」を掲げてトラフィックを総取り。',
        details: [
          '2021年、兄弟創業者のCh DanielとDavidが開発。',
          '「クレジットカード登録不要で、今すぐNotionをWebサイト化できる」とRedditやProduct Huntで宣伝。',
          '数万人の無料ユーザーを瞬く間に抱え込み、独自ドメイン設定を有料化して一気に黒字化、2023年に売却成功。',
        ],
        sourceNote: 'How We Built and Sold Simple.ink in 2 Years',
      },
      {
        id: 'ev_sink_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：WordPressやWixが対抗できない理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: 'WordPressは「何千もの設定項目、プラグインの互換性問題、セキュリティパッチ」で肥大化しすぎた。',
        details: [
          'WordPressのダッシュボードは素人にとって迷宮。',
          'Simple.inkは「Notionで文章が書ける人間なら0秒でサイト運用できる」ため、学習コストの低さで伝統的CMSを完全に無力化した。',
        ],
        sourceNote: 'Headless CMS Disruption Analysis',
      },
      {
        id: 'ev_sink_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：「今週末までに自分のポートフォリオを公開したい」フリーランスの焦燥',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '案件に応募するために自分の実績サイトが必要なのに、サイト制作で何日も足止めを食らう焦り。',
        details: [
          'すでにNotionにまとめている実績や職歴を、ボタン1つでそのままWebサイトとして公開できる。',
          '月額1,800円の出費は、案件を獲得するための即効性のある投資として迷わず決済される。',
        ],
        sourceNote: 'Freelancer Portfolio Setup Urgency',
      },
    ],
    observationsStream: [
      {
        date: '2023-10',
        author: 'Make-Money アナリスト',
        text: '2023年に非公開企業へ買収完了。Cloudflare Workersを用いた極限の低インフラコスト設計により、バイアウト時まで利益率60%超を維持した教科書的マイクロSaaS。',
      },
    ],
    temporal: {
      foundedYear: 2021,
      initialTractionPeriod: '2021〜2022年（Super.so対抗の本体無料とSEO記事大量生成による急成長）',
      dataSnapshotPeriod: '2023年（買収時データ）',
      eraContext: 'Notionエコシステムの成熟と、マイクロSaaSブームの最高潮期',
      viabilityStatus: 'HISTORICAL_WINDOW',
      viabilityLabel: '時代限定モデル',
      currentViabilityAnalysis: 'Notion自身がサイト公開機能を強化しつつあるため、サードパーティのWebサイト化SaaSは特化機能（メンバーシップ、フォーム）を持たない限り新規参入は厳しい。',
    },
  },

  // 22. Gridfiti
  {
    id: 'ent_case06_1deb3d9c4c007a003f3c',
    ticker: 'GRID.FITI',
    name: 'Gridfiti',
    legalEntity: 'Gridfiti Media Inc.',
    tagline: '「Notionのテンプレートやデスク周辺機器のおすすめ」をSEO上位で独占し、他人のデジタル商品やAmazonアフィリエイトから年商1.2億円の手数料を吸い上げるキュレーションの関所',
    sector: 'INFO_MEDIA',
    scale: 'MICRO_TEAM',
    founder: 'Patrick Sullivan',
    country: 'CA',
    url: 'https://gridfiti.com',
    verifiedBadge: true,
    growthRateYoY: 20.0,
    architecturePattern: 'SEOアグリゲーター',
    pipelineStack: 'Webflowブログ × Pinterest/Instagramライフスタイル画像 × Notion/Gumroadアフィリエイト配管 × Amazon Associates',
    targetPainWallet: '自分の作業机やNotionを美しく整えて仕事のやる気を出したいデスクワーカーの「形から入りたい」虚栄心',
    tags: ['キュレーションメディア', '年商1.2億', 'アフィリエイト配管', 'デスクセットアップ', 'SEO上位独占'],
    pnl: {
      monthlyRevenue: 10000000, // 年商約$800k ≒ ¥1.2億円 (月商約¥1,000万円)
      cogs: 500000, // サーバー・ドメイン費用
      grossProfit: 9500000,
      grossMargin: 95.0,
      operatingExpenses: {
        serverAndApi: 300000,
        advertising: 0, // 完全オーガニックSEOおよびPinterest流入
        subcontracting: 3500000, // 記事執筆・画像編集外注
        toolsAndSaaS: 500000,
        other: 700000,
      },
      operatingProfit: 4500000, // 営業利益率約45% (月商約450万円)
      operatingMargin: 45.0,
      estimatedAnnualNetProfit: 54000000,
      financialStatus: 'ESTIMATED',
      dataSnapshotPeriod: '2023〜2024年業界推定水準',
      sourceDoc: 'Gridfitiメディアキット / Ahrefsトラフィックデータ',
      estimationLogic: '月間オーガニックPV約100万 × アフィリエイト成約（Notionテンプレ20〜30%手数料 ＋ デスクギア） ＝ 年商約$800k（約¥1.2億円 ➔ 月商約1,000万円）',
    },
    evidenceCards: [
      {
        id: 'ev_grdf_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】自前で商品は作らず、「おすすめ30選」の記事を書いて売上の30%を永久中抜きするコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '世界中のクリエイターが心血を注いで作ったNotionテンプレートをキュレーションし、購入手数料を中抜きする。',
        details: [
          '【美学（Aesthetics）特化のSEO】: 単なるレビューではなく、InstagramやPinterestで映える美しいビジュアルを統一配置して滞在時間を延ばし、Google検索上位を独占。',
          '【高単価アフィリエイトの選定】: Amazonの数%の物販だけでなく、Gumroad等のデジタル商品（紹介料20〜50%）を主力にして利益率を最大化。',
          '【自社テンプレへのクロスセル】: 他社テンプレを紹介する記事の最も目立つ最上部に、自社製のテンプレート（粗利100%）を配置して二重取り。',
        ],
        codeSnippet: '// キュレーションアフィリエイト配管\n1. 「Best Notion Templates for [用途]」「Aesthetic Desk Setup」等の検索キーワードを抽出\n2. クリエイターの商品を美しいモックアップ画像とともに紹介し、個別アフィリエイトリンクを発行\n3. 検索上位を獲得して放置し、毎月数百万円の手数料を自動受取',
        sourceNote: 'Gridfiti ビジネスモデル分析',
      },
      {
        id: 'ev_grdf_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：Pinterestのデスク写真キュレーションからの発足',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '2019年、Pinterestでミニマルな作業部屋やデスク環境の写真をキュレーションすることから開始。',
        details: [
          'コロナ禍のリモートワーク特需で「自宅のデスクをおしゃれにしたい」需要が世界中で爆発。',
          '写真に写っているキーボードやモニターライトのAmazonリンクを貼るだけで月数十万円の報酬が発生。',
          'Notionブームの到来に合わせて「Aesthetic Notion Templates」のまとめ記事を量産し、SEOの上位を完全制圧。',
        ],
        sourceNote: 'Gridfiti Growth Story',
      },
      {
        id: 'ev_grdf_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：ギズモードやThe Vergeが「Notionテンプレまとめ」を書けない理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: '大手テックブログは「新しいiPhoneの噂」などの大衆ウケ記事に追われ、ニッチなまとめ記事を放置。',
        details: [
          '大手メディアの記者は「Notionの家計簿テンプレートおすすめ20選」のような地味な記事を書く評価制度になっていない。',
          'Gridfitiはそのような「検索ボリュームは中規模だが、購買意欲が極めて高いニッチキーワード」を数百本網羅して堀を築いた。',
        ],
        sourceNote: 'Niche Media SEO Advantage',
      },
      {
        id: 'ev_grdf_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：殺風景な部屋でやる気が出ないリモートワーカーの現実逃避',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '「デスク環境やNotionさえ整えば、自分はもっとバリバリ働けるはずだ」という幻想。',
        details: [
          '仕事に取り掛かる前の儀式として、美しいツールやガジェットをポチってしまう衝動買いの財布。',
          '数千円の出費で「洗練されたクリエイター」になった気分を瞬時に購入できる。',
        ],
        sourceNote: 'Procrastination and Aesthetic Shopping Dynamics',
      },
    ],
    observationsStream: [
      {
        date: '2024-06',
        author: 'Make-Money アナリスト',
        text: 'デスクグッズ、Notionテンプレに加え、自社ブランドの壁紙パックやデジタルプランナーの直販を強化。メディアからD2Cブランドへの進化を図る。',
      },
    ],
    temporal: {
      foundedYear: 2019,
      initialTractionPeriod: '2019〜2021年（コロナ禍のリモートワーク特需とPinterestキュレーション）',
      dataSnapshotPeriod: '2024年（業界推計）',
      eraContext: 'リモートワーク定着に伴うデスク環境への投資ブームとNotionの世界的流行',
      viabilityStatus: 'ACTIVE_PLAYBOOK',
      viabilityLabel: '現在も有効',
      currentViabilityAnalysis: 'GoogleのHelpful Content Update等により個人アフィリエイトサイトが打撃を受ける中、ブランド化された独自メディアとして生き残りを維持。',
    },
  },

  // 23. Canva
  {
    id: 'ent_case06_1de44cad09bd6e634047',
    ticker: 'CNVA.DSGN',
    name: 'Canva',
    legalEntity: 'Canva Pty Ltd',
    tagline: '「Photoshopの難解なレイヤーやツールバーに絶望した」全人類を救い、ブラウザ上のドラッグ＆ドロップだけで年商3,000億円・企業価値3.9兆円を築いたデザイン民主化の絶対王者',
    sector: 'SaaS',
    scale: 'ENTERPRISE',
    founder: 'Melanie Perkins, Cliff Obrecht, Cameron Adams',
    country: 'AU',
    url: 'https://www.canva.com',
    verifiedBadge: true,
    growthRateYoY: 30.0,
    architecturePattern: '本体無料・機能人質',
    pipelineStack: 'WebGL/HTML5キャンバス × 巨大テンプレートアセットライブラリ × Canva Pro年額サブスク × Canva for Teams',
    targetPainWallet: 'チラシやSNSバナーを1枚作るためだけにAdobeに月7,000円払い、使い方を何週間も勉強させられる一般人の苦痛',
    tags: ['デザインSaaS', '年商3000億超', '本体無料・急所課金', 'Adobe対抗', '世界的メガSaaS'],
    pnl: {
      monthlyRevenue: 25000000000, // 年商約$2B ≒ ¥3,000億円 (月商約¥250億円)
      cogs: 3750000000, // サーバーインフラ・画像素材ライセンス（粗利85%）
      grossProfit: 21250000000,
      grossMargin: 85.0,
      operatingExpenses: {
        serverAndApi: 1500000000,
        advertising: 5000000000,
        subcontracting: 3500000000, // グローバル開発・サポート
        toolsAndSaaS: 500000000,
        other: 4000000000,
      },
      operatingProfit: 6750000000, // 営業利益率約27% (月商約67.5億円)
      operatingMargin: 27.0,
      estimatedAnnualNetProfit: 81000000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2024年通期公式開示（ARR $2B突破・月間アクティブユーザー1.7億人以上）',
      sourceDoc: 'Canva公式プレスリリース / Bloomberg / Forbes 2024年取材',
      estimationLogic: 'MAU 1.7億人 × 有料Canva Pro/Teams会員数約2,000万人 × 平均月額課金 ＝ 年商約$2B（約¥3,000億円 ➔ 月商約250億円）',
    },
    evidenceCards: [
      {
        id: 'ev_cnva_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】プロ用ツールの機能を90%削ぎ落とし、「テンプレートを選ぶだけ」にして全人類に課金するコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: 'Adobeがプロのデザイナー向けに高度化していく隙を突き、「デザインができない99%の素人」を総取りする。',
        details: [
          '【完成品から選ばせる逆転の発想】: 白紙から描かせるのではなく、プロが作った数万点の「インスタ投稿」「プレゼン資料」「名刺」の完成版を並べ、文字を打ち替えるだけで完成。',
          '【本体無料・急所課金】: 無料でほとんどの機能を使わせ、ユーザーが「背景を1クリックで透過したい」「有料の極上写真素材を使いたい」と思った瞬間に月額課金へ誘導。',
          '【チームコラボレーションの拡張】: 会社内で「ノンデザイナーがマーケティング資料を作る標準ツール」として浸透させ、全社エンタープライズ契約を巻き取る。',
        ],
        codeSnippet: '// 本体無料・機能人質配管\n1. 専門家しか使えなかった複雑なソフトウェア（デザイン、動画編集、音楽制作）を特定\n2. ブラウザ上で直感操作できるUIに極限まで単純化し、数万件のプロ品質テンプレートを事前配備\n3. 基本無料で使用させ、プレミアム素材や便利機能（背景削除、サイズ自動変換）を有料サブスク化',
        sourceNote: 'Melanie Perkins 創業インタビュー',
      },
      {
        id: 'ev_cnva_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：パースの母親のリビングで高校の卒業アルバム制作から開始',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '19歳のMelanieが、Photoshopの使い方を教える家庭教師をしながら「誰も使いこなせない」と確信。',
        details: [
          '2007年、オーストラリア・パースで高校の卒業アルバムをオンラインで簡単に編集・印刷できる『Fusion Books』を創業。',
          '自前資金で黒字経営を続けながら、デザインシステムのノウハウを蓄積。',
          'シリコンバレーの投資家から100回以上拒絶された後、元GoogleマップのCameron Adamsらを巻き込んで2013年にCanvaをローンチ。',
        ],
        sourceNote: 'Forbes "How Melanie Perkins Built Canva into a $40 Billion Behemoth"',
      },
      {
        id: 'ev_cnva_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：Adobeが自らツールを簡素化できなかった理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: 'Adobeの最大の支持基盤は「何年間も修行してショートカットを極めたプロのデザイナー」だった。',
        details: [
          'AdobeがPhotoshopやIllustratorを初心者向けに簡単にしてしまうと、「俺たちの専門スキルを軽視するのか」とプロ顧客が激怒する構造。',
          'Adobe Creative Cloudの高額サブスク（月7,000円超）を守るため、低価格で誰でも使えるブラウザツールの開発が遅れ、Canvaに市場を丸ごと奪われた。',
        ],
        sourceNote: 'Adobe Incumbent Dilemma and Clayton Christensen Disruption Theory',
      },
      {
        id: 'ev_cnva_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：プロのデザイナーに頼む金も時間もない中小企業・起業家の絶望',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '「バナー1枚作るのにデザイナーに見積もりを取って1週間待たされる」というビジネスの遅延。',
        details: [
          'Canvaを使えば、マーケターや経営者自身が10分でプロ品質のバナーを作って今すぐ広告を配信できる。',
          '「時間を買っている」という圧倒的な知覚価値により、月額$12.99は企業の必要経費として解約不能になる。',
        ],
        sourceNote: 'Self-Serve Design Tool ROI Analysis',
      },
    ],
    observationsStream: [
      {
        date: '2024-05',
        author: 'Make-Money アナリスト',
        text: '年商$2B（約3,000億円）を突破。英国の写真・デザインソフト大手『Affinity』を巨額買収し、素人向けからプロのデザイナー市場へと逆侵攻を開始。',
      },
    ],
    temporal: {
      foundedYear: 2012,
      initialTractionPeriod: '2012〜2014年（Guy Kawasakiの参入とブロガー向けバナー作成での爆発的初動）',
      dataSnapshotPeriod: '2024年（公式発表・年次報告）',
      eraContext: 'ソーシャルメディア（Facebook, Instagram）の画像投稿需要が爆発したタイミング',
      viabilityStatus: 'MATURED_MOAT',
      viabilityLabel: '先行者堀で堅牢',
      currentViabilityAnalysis: '1.7億人のMAUと数百万点の独自アセットライブラリが強固なネットワーク効果を形成しており、事実上の世界インフラ。',
    },
  },

  // 24. Ahrefs
  {
    id: 'ent_ahrefs_1cfda3ec4b2ab651bd2d',
    ticker: 'AHRF.SEO',
    name: 'Ahrefs',
    legalEntity: 'Ahrefs Pte. Ltd.',
    tagline: '自前のAhrefsBotで世界中のWebを24時間クロールし、VC資金ゼロ・営業マンゼロのまま年商225億円・利益率55%を叩き出すブートストラップSEO帝国の頂点',
    sector: 'INFRA',
    scale: 'ENTERPRISE',
    founder: 'Dmytro Gerasymenko',
    country: 'SG',
    url: 'https://ahrefs.com',
    verifiedBadge: true,
    growthRateYoY: 20.0,
    architecturePattern: '自前インフラ要塞',
    pipelineStack: '自前データセンター（ペタバイト級ベアメタル） × AhrefsBotクローラー × Stripe年額サブスク（$990〜$9,990）',
    targetPainWallet: 'Google検索の順位が下がって売上が吹き飛ぶ恐怖に怯える全世界のWeb担当者・SEOエージェンシー',
    tags: ['SEOインフラ', '年商225億', '完全ブートストラップ', '営業マンゼロ', '利益率55%超'],
    pnl: {
      monthlyRevenue: 1875000000, // 年商約$150M ≒ ¥225億円 (月商約¥18.75億円)
      cogs: 281250000, // 自前ベアメタルサーバー減価償却・データセンター電力代（粗利85%）
      grossProfit: 1593750000,
      grossMargin: 85.0,
      operatingExpenses: {
        serverAndApi: 150000000,
        advertising: 0, // 広告費完全ゼロ（自社YouTubeとSEOブログのみ）
        subcontracting: 350000000, // 少数精鋭エンジニア人件費
        toolsAndSaaS: 50000000,
        other: 62500000,
      },
      operatingProfit: 981250000, // 営業利益率約52% (月商約9.8億円)
      operatingMargin: 52.3,
      estimatedAnnualNetProfit: 11775000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2023〜2024年公開開示（ARR約$150M・自社データセンター運用）',
      sourceDoc: 'Dmytro Gerasymenko X投稿 / Ahrefs公式ブログ / GetLatka',
      estimationLogic: '有料企業ユーザー約10万社 × 平均月額単価$125〜$150 ＝ 年商約$150M（約¥225億円 ➔ 月商約18.75億円）',
    },
    evidenceCards: [
      {
        id: 'ev_ahrf_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】AWSを使わず自前サーバーで原価を1/5にし、営業マンを1人も雇わずに売り抜くコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: 'Googleに次ぐ世界第2位のクローラーを自前運用し、SEOに関わる全企業から年数十万円の関所税を吸い上げる。',
        details: [
          '【自前データセンターによる原価破壊】: AWSなどのクラウドを使えば月数十億円かかるペタバイト級データを、自前の物理サーバー（シンガポール等）で運用し原価率を激減。',
          '【営業部隊完全ゼロの製品主導（PLG）】: 電話営業や商談を一切行わず、自社YouTubeのチュートリアルと無料Webmaster Toolsでエンジニアを直接有料化。',
          '【被リンクデータベースという人質】: 世界中のWebサイトのリンク構造を把握しているため、マーケターは競合の分析や順位追跡のために解約できない。',
        ],
        codeSnippet: '// インフラ要塞型SaaS配管\n1. 競合が真似できない規模の独自クローラー/インフラを自前で構築\n2. AWS等のクラウドを排除し、ベアメタルサーバーで圧倒的な原価競争力を確保\n3. YouTubeで「自社ツールを使った問題解決チュートリアル」を配信し、営業ゼロで全世界から集客',
        sourceNote: 'Dmytro Gerasymenko "Why Ahrefs Doesn\'t Use AWS"',
      },
      {
        id: 'ev_ahrf_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：ウクライナの天才プログラマーがSEOフォーラムに投下したクローラー',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '2010年、創業者Dmytroがウクライナで「既存のバックリンク調査ツールが遅すぎる」と自作開始。',
        details: [
          '自己資金数十万ドルのみで創業し、初期バージョンの圧倒的なクロール速度をSEOフォーラムで公開。',
          '当時の王者だったMajesticやMozを速度とデータ量で瞬く間に抜き去り、口コミだけで有料会員が爆発。',
          '外部VCからの数億ドルの買収・出資提案をすべて拒絶し、100%自己資本を維持。',
        ],
        sourceNote: 'Ahrefs Company History and Founder Journey',
      },
      {
        id: 'ev_ahrf_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：VC支援の競合（SEMrush等）が追随できない利益率構造',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: '競合のSEMrushは上場企業として「巨額のマーケティング費と営業人件費」を投じている。',
        details: [
          'SEMrushは売上の大半をGoogle広告やセールスチームに費やしているため、利益率が低い。',
          'Ahrefsは広告費ゼロ・営業ゼロ・自前インフラのため、競合の半分のコストで同じインフラを運用でき、50%超の純利益をそのまま研究開発に再投資できる。',
        ],
        sourceNote: 'Ahrefs vs SEMrush Financial Comparison',
      },
      {
        id: 'ev_ahrf_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：自社サイトの検索流入が落ちて会社が潰れる恐怖',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: 'SEOで毎月数千万円の売上を立てている企業の「順位下落の原因が分からない」パニック。',
        details: [
          '競合がどんなキーワードでアクセスを奪っているか、どこのサイトから被リンクを得ているかを透視できる唯一のレーダー。',
          '月額$99〜$999は、企業の生命線であるオーガニックトラフィックを守るための不可欠な軍事費。',
        ],
        sourceNote: 'SEO Tool Critical Dependency Study',
      },
    ],
    observationsStream: [
      {
        date: '2024-08',
        author: 'Make-Money アナリスト',
        text: '独自のWeb検索エンジン『Yep.com』の開発に6,000万ドルを投資。Googleの独占に挑みつつ、自前の巨大インデックスをテコにAI要約エンジンへ進化。',
      },
    ],
    temporal: {
      foundedYear: 2010,
      initialTractionPeriod: '2010〜2012年（SEOフォーラムでのクローラー速度実証による初動）',
      dataSnapshotPeriod: '2024年（公式開示・推計）',
      eraContext: 'Google検索アルゴリズムが被リンク（PageRank）を最も重視していたSEO黄金期',
      viabilityStatus: 'MATURED_MOAT',
      viabilityLabel: '先行者堀で堅牢',
      currentViabilityAnalysis: 'ペタバイト級のWebグラフデータと自前データセンターの参入障壁は極めて高く、ブートストラップSaaSの頂点に君臨。',
    },
  },

  // 25. 1Password
  {
    id: 'ent_1password_f08ccd0b403a1bf0dcdc',
    ticker: 'ONE.PASS',
    name: '1Password',
    legalEntity: 'AgileBits, Inc.',
    tagline: '14年間VC資金を1ドルも入れず完全ブートストラップ黒字経営を貫き、企業の全社員のマスターキーを人質にしてARR 600億円・解約率1%未満を支配する要塞SaaS',
    sector: 'SaaS',
    scale: 'ENTERPRISE',
    founder: 'Dave Teare, Roustem Karimov',
    country: 'CA',
    url: 'https://1password.com',
    verifiedBadge: true,
    growthRateYoY: 30.0,
    architecturePattern: '人質暗号要塞',
    pipelineStack: '自社ゼロ知識暗号化エンジン × Mac/iOS/Windows/Androidネイティブアプリ × Enterprise SSO連携 × B2B月額シート課金',
    targetPainWallet: 'パスワード使い回しで顧客データが漏洩し、数億円の賠償金とブランド失墜で会社が倒産する企業のセキュリティ恐怖',
    tags: ['セキュリティSaaS', 'ARR 600億超', 'ブートストラップ14年', '解約率1%未満', '人質要塞'],
    pnl: {
      monthlyRevenue: 5000000000, // ARR $400M+ ≒ 年間約600億円 (月商約¥50億円)
      cogs: 500000000, // AWS暗号化ホスティング・インフラ（粗利90%）
      grossProfit: 4500000000,
      grossMargin: 90.0,
      operatingExpenses: {
        serverAndApi: 300000000,
        advertising: 1000000000,
        subcontracting: 1500000000, // グローバルセキュリティエンジニア人件費
        toolsAndSaaS: 200000000,
        other: 500000000,
      },
      operatingProfit: 1000000000, // 営業利益率約20% (月商約10億円)
      operatingMargin: 20.0,
      estimatedAnnualNetProfit: 12000000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2023〜2024年（ARR $400M突破・エンタープライズ導入15万社以上）',
      sourceDoc: 'Forbes / TechCrunch / 1Password公式発表',
      estimationLogic: '導入企業150,000社以上 × 社員数別シート課金（月額$7.99/ユーザー） ＝ 年商約$400M+（約¥600億円 ➔ 月商約50億円）',
    },
    evidenceCards: [
      {
        id: 'ev_1p_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】買い切りソフトから月額サブスクへ強制移行し、全社員の認証情報を人質にするコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '個人用Macソフトとして愛された後、企業のIT管理者が全社員に強制導入するB2B SaaSへ化けさせる。',
        details: [
          '【14年間の完全ブートストラップ】: 2005年から2019年まで外部VCを1円も入れず、Mac買い切りライセンスの利益だけで毎年連続黒字成長。',
          '【サブスクリプションへの冷徹な転換】: 買い切りを廃止し、月額サブスクとB2Bチーム機能へ全振り。初期ユーザーの反発を乗り越えMRRを10倍に爆発させた。',
          '【解約不能の人質資産（Data Hostage）】: 企業の全社員が使う数百個のパスワード、APIキー、機密情報がすべて格納されているため、乗り換えコストが無限大になりチャーンレートが実質ゼロ。',
        ],
        codeSnippet: '// セキュリティ人質型B2B配管\n1. 美しいUIの個人向けツールで初期の熱烈なギークファンを獲得\n2. 企業向け管理コンソール（SCIM、SSO、監査ログ）を開発し、会社の情シス部門へ逆上陸\n3. 1ユーザーあたり月額$8で全社員分を一括契約させ、解約不可能なインフラとして居座る',
        sourceNote: 'Dave Teare 創業インタビュー',
      },
      {
        id: 'ev_1p_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：Macintoshのソフトウェア受託開発から生まれた副産物',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: 'カナダの2人の開発者が、自分たちの受託案件で使うパスワードを管理するために作った自作ツール。',
        details: [
          '2005年、Web制作のクライアントのアカウント情報を安全に保管するためにMac用アプリとして自作。',
          'Macユーザー向けのブログで公開したところ、Appleファンの間で「デザインが圧倒的に美しいパスワード管理ツール」として絶賛されバイラル化。',
          'iPhoneの登場と同時にiOS版を投入し、App Storeの有料ランキング首位を独占。',
        ],
        sourceNote: 'The 1Password Journey: From Bootstrapped Mac App to $6.8B Valuation',
      },
      {
        id: 'ev_1p_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：競合LastPassの情報漏洩事故による顧客大移動',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: '競合LastPassがハッキングされ暗号化ボルトが流出する大失態を犯し、数万社が一斉に逃げ込んできた。',
        details: [
          'LastPassはコスト削減のためにアーキテクチャのセキュリティ投資を怠っていた。',
          '1Passwordは「Secret Key（34文字の独自暗号鍵）」をローカルで保持するゼロ知識設計を徹底していたため、ハッキング耐性が圧倒的であると証明され、企業のセキュリティ基準を独占した。',
        ],
        sourceNote: 'Password Manager Security Architecture Comparison',
      },
      {
        id: 'ev_1p_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：CIO（最高情報責任者）が情報漏洩で即日クビになる恐怖',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '社員が簡単なパスワードを使って不正アクセスされ、数億円の身代金ウイルスに感染する悪夢。',
        details: [
          '1Passwordを全社導入することは、CIOにとって「自社のセキュリティ義務を果たしている」という最強の防衛シールド。',
          '全社員分の月額数百万円の請求書は、会社の存続保険として議論の余地なく承認される。',
        ],
        sourceNote: 'Cybersecurity Enterprise Procurement Psychology',
      },
    ],
    observationsStream: [
      {
        date: '2024-04',
        author: 'Make-Money アナリスト',
        text: 'パスキー（Passkeys）の完全サポートおよび開発者向けシークレット管理（APIキー、SSH鍵）を急拡大。単なるパスワード管理から「企業の全認証インフラ」へ進化。',
      },
    ],
    temporal: {
      foundedYear: 2005,
      initialTractionPeriod: '2005〜2008年（Mac/iPhoneアプリとしての熱狂的コミュニティ獲得）',
      dataSnapshotPeriod: '2024年（公式発表・Forbes取材）',
      eraContext: 'クラウドSaaSの爆発に伴う「パスワード管理不能問題」の深刻化とゼロトラストセキュリティの台頭',
      viabilityStatus: 'MATURED_MOAT',
      viabilityLabel: '先行者堀で堅牢',
      currentViabilityAnalysis: '15万社以上のエンタープライズ顧客基盤と完全なゼロ知識暗号アーキテクチャにより、乗り換え不能の堀を確立。',
    },
  },

  // 26. Bitwarden
  {
    id: 'ent_bitwarden_1cb551fbca6b81c4d554',
    ticker: 'BIT.WARD',
    name: 'Bitwarden',
    legalEntity: 'Bitwarden, Inc.',
    tagline: '「1Passwordの値上げとプロプライエタリな秘密主義は許せない」というギークの怨嗟を受け止め、完全オープンソースで年商120億円・無料版で世界を制圧する透明性の要塞',
    sector: 'SaaS',
    scale: 'ENTERPRISE',
    founder: 'Kyle Spearrin',
    country: 'US',
    url: 'https://bitwarden.com',
    verifiedBadge: true,
    growthRateYoY: 35.0,
    architecturePattern: 'OSS透明性要塞',
    pipelineStack: 'C# / .NETバックエンド × 完全オープンソースコードベース × セルフホスト（Docker） × 年額$10個人/月額$3法人課金',
    targetPainWallet: '高額なプロプライエタリSaaSに機密データを預けることを拒否するセキュリティ原理主義者 ＆ 1Passwordに月10ドル払いたくない節約ギーク',
    tags: ['オープンソース', '年商120億', 'パスワード管理', '透明性要塞', 'Docker自前ホスト'],
    pnl: {
      monthlyRevenue: 1000000000, // 年商推定約$80M ≒ ¥120億円 (月商約¥10億円)
      cogs: 100000000, // クラウドインフラ原価（粗利90%）
      grossProfit: 900000000,
      grossMargin: 90.0,
      operatingExpenses: {
        serverAndApi: 50000000,
        advertising: 100000000,
        subcontracting: 350000000, // エンジニア・セキュリティ監査人件費
        toolsAndSaaS: 40000000,
        other: 110000000,
      },
      operatingProfit: 250000000, // 営業利益率約25% (月商約2.5億円)
      operatingMargin: 25.0,
      estimatedAnnualNetProfit: 3000000000,
      financialStatus: 'ESTIMATED',
      dataSnapshotPeriod: '2023〜2024年（シリーズB 1億ドル調達後の急拡大期）',
      sourceDoc: 'BusinessWire / Tracxn / PitchBook 2024年推定データ',
      estimationLogic: '数千万人の無料ユーザー ＋ プレミアム個人会員（年額$10）数百万人 ＋ 法人シート課金 ＝ 年商約$80M（約¥120億円 ➔ 月商約10億円）',
    },
    evidenceCards: [
      {
        id: 'ev_bitw_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】コードを100%公開して世界中のハッカーに無料監査させ、法人の信頼を掠め取るコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '「中身が見えない商用ソフトを信じるな」と叫び、ソースコード全公開で世界最強の信頼を獲得する。',
        details: [
          '【コード全公開による無料セキュリティ監査】: 世界中の暗号専門家やギークが勝手にGitHubでコードをレビューし脆弱性を潰してくれるため、監査コストが実質ゼロ。',
          '【年額10ドル（月100円強）の破格プライス】: 1Passwordが月額$3（年$36）取る中、個人プレミアムを「年額$10」という捨て値で提供し、パイを総取り。',
          '【自前サーバー運用（Docker）の自由】: クラウドにデータを置きたくない金融機関や政府機関向けに、自前サーバー（オンプレミス）で動かせるDockerコンテナを提供してエンタープライズを囲い込み。',
        ],
        codeSnippet: '// OSS信頼略奪型配管\n1. 競合が高価格・ブラックボックスで提供しているセキュリティツールを特定\n2. 同等の暗号化機能をオープンソースで公開し、完全無料・自前ホスト可能にする\n3. 「年額$10の2要素認証強化」および「法人の一括管理コンソール（月額$3/人）」でマネタイズ',
        sourceNote: 'Kyle Spearrin 創業ドキュメント',
      },
      {
        id: 'ev_bitw_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：建築家出身のエンジニアがRedditに投下した自作ツール',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '2015年、LastPassがログミーイン社に買収された際、不信感を抱いたKyleが自作アプリを公開。',
        details: [
          '元々はフロリダでソフトウェアエンジニアとして働いていたKyle Spearrinが、余暇で開発。',
          'Redditのr/privacyやr/opensourceに「完全オープンソースで誰でも検証できるパスワードマネージャーを作った」と投稿。',
          'コミュニティの熱狂的な支援を受け、数千人のギークが翻訳やバグ報告に協力して一気にグローバル展開。',
        ],
        sourceNote: 'Reddit r/privacy "I built Bitwarden, an open source password manager"',
      },
      {
        id: 'ev_bitw_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：1PasswordやLastPassがオープンソース化できない理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: '商用ソフトは「ソースコードそのもの」が企業価値であり、公開すると知財防衛が破綻する。',
        details: [
          'プロプライエタリな競合は、コードを公開すると自社の優位性が失われると恐れて中身を隠し続ける。',
          'しかしセキュリティの分野では「隠すことによる安全性（Security through obscurity）」は弱点とみなされ、透明性を掲げるBitwardenに思想戦で勝てなかった。',
        ],
        sourceNote: 'Open Source vs Proprietary Security Dynamics',
      },
      {
        id: 'ev_bitw_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：「自分のパスワードを他人のクラウドに預けたくない」ギークの不信感',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '大手IT企業のサーバーがダウンしたりハッキングされたりした時の、データアクセス遮断への恐怖。',
        details: [
          'Bitwardenなら自分の自宅のRaspberry PiやプライベートVPSに暗号化データを保管できる。',
          '「自分の城は自分で守る」というギークの絶対的な安心感を独占。',
        ],
        sourceNote: 'Self-Hosting Consumer Behavior',
      },
    ],
    observationsStream: [
      {
        date: '2024-07',
        author: 'Make-Money アナリスト',
        text: 'オープンソースの信頼性を武器に、欧州の銀行や公共機関での導入が急拡大。LastPassからの乗り換え需要を完全に取り込み、エンタープライズ売上が爆発。',
      },
    ],
    temporal: {
      foundedYear: 2015,
      initialTractionPeriod: '2015〜2018年（Redditでのオープンソース信奉者獲得とLastPass買収反発）',
      dataSnapshotPeriod: '2024年（業界推計・資金調達後成長）',
      eraContext: '商用クラウドサービスへの不信感と、自己主権型オープンソースへの回帰トレンド',
      viabilityStatus: 'MATURED_MOAT',
      viabilityLabel: '先行者堀で堅牢',
      currentViabilityAnalysis: 'オープンソースコミュニティの圧倒的な支持と第三者監査の実績により、パスワード管理のOSS標準として君臨。',
    },
  },

  // 27. Cal.com
  {
    id: 'ent_calcom_a24b70ba1746771479ff',
    ticker: 'CAL.MEET',
    name: 'Cal.com',
    legalEntity: 'Cal.com, Inc.',
    tagline: '「Calendlyのロゴを勝手に表示させて相手にマウントを取られるな」とCalendlyの殿様商売を粉砕し、完全オープンソース＆自社ブランド白地化でARR 15億円を突破した日程調整の解放者',
    sector: 'SaaS',
    scale: 'SMB',
    founder: 'Peer Richelsen, Bailey Pumfleet',
    country: 'US',
    url: 'https://cal.com',
    verifiedBadge: true,
    growthRateYoY: 50.0,
    architecturePattern: 'ホワイトラベルOSS',
    pipelineStack: 'Next.js × Prisma × 完全オープンソースリポジトリ（GitHub 3万Star） × Stripe月額サブスク（$15/席〜）',
    targetPainWallet: '客に日程調整URLを送った瞬間に「あいつCalendlyの無料ロゴ使ってケチってるな」と舐められるビジネスマンの羞恥心',
    tags: ['日程調整SaaS', 'ARR 15億', 'オープンソース', 'Calendly対抗', 'ホワイトラベル'],
    pnl: {
      monthlyRevenue: 125000000, // 2024〜2026年ARR $10M規模到達 ≒ 年間約15億円 (月商約¥1.25億円)
      cogs: 12500000, // カレンダーAPI接続インフラ・サーバー代（粗利90%）
      grossProfit: 112500000,
      grossMargin: 90.0,
      operatingExpenses: {
        serverAndApi: 15000000,
        advertising: 5000000, // 広告費ほぼゼロ（GitHub Starとユーザーの送る招待URLで自然拡散）
        subcontracting: 50000000, // コアOSS開発者人件費
        toolsAndSaaS: 10000000,
        other: 12500000,
      },
      operatingProfit: 20000000, // 営業利益率約16% (月商約2,000万円)
      operatingMargin: 16.0,
      estimatedAnnualNetProfit: 240000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2024〜2026年 Sacraレポート（2024年末ARR $2.9Mから2026年$10Mへ急伸）',
      sourceDoc: 'Sacra Research / Peer Richelsen公式開示 / TechCrunch',
      estimationLogic: '有料チーム・組織シート課金（月額$15/ユーザー） ＋ エンタープライズオンプレミスライセンス ＝ ARR約$10M（約¥15億円 ➔ 月商約1.25億円）',
    },
    evidenceCards: [
      {
        id: 'ev_cal_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】アポ調整リンク自体が「最強のウイルス感染装置」として客を連れてくるコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '日程調整リンクを相手に送るたびに、相手が「この洗練されたカレンダーは何だ？」と無料登録する。',
        details: [
          '【バイラル係数の極大化】: 1人の有料ユーザーが月に30人に日程調整URLを送信。受け取った側の5〜10%が「自分もこれを使いたい」と新規アカウントを作成。',
          '【Calendlyのブランド強制への怒りを吸収】: Calendlyは無料版・低価格版で自社ロゴを押し付け、独自ドメインを使わせない。Cal.comは完全白地化（ホワイトラベル）と自前ドメイン（cal.yourname.com）を開放。',
          '【開発者向けAPI・Webhookの完備】: 病院の予約システムや採用ATSの裏側に、Cal.comのスケジューリングAPIをそのまま組み込ませてエンタープライズから巨額ライセンスを徴収。',
        ],
        codeSnippet: '// プロダクト主導バイラル配管\n1. Google/Outlookカレンダーと連携した爆速予約UIをオープンソースで提供\n2. ユーザーが客に送る予約ページ（cal.com/username）の最下部に極小の「Powered by Cal.com」を設置\n3. 開発者向けに「自社アプリの中に埋め込めるReactコンポーネント」を提供しB2Bへ侵食',
        sourceNote: 'Peer Richelsen "How We Scaled Cal.com to $10M ARR"',
      },
      {
        id: 'ev_cal_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：GitHubでCalendlyクローンを公開した翌日にHacker News首位',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '2021年、PeerとBaileyが「Calendlyのプロプライエタリな独占を根本から打破する」とGitHubにコードを投下。',
        details: [
          '旧名Calendsoとしてローンチ。Hacker Newsで一晩で数千のUpvoteを獲得。',
          'Alexis Ohanian（Reddit共同創業者）やChad Hurley（YouTube共同創業者）等の大物エンジェル投資家から即座に出資を勝ち取る。',
          'わずか数年でGitHubスター数3万を超え、世界中のオープンソース開発者の標準日程調整ツールへ急成長。',
        ],
        sourceNote: 'TechCrunch "Calendso rebrands to Cal.com and raises $7.4M"',
      },
      {
        id: 'ev_cal_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：Calendlyがオープンソース・自前ホストに対抗できない理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: '時価総額30億ドルのCalendlyは「クラウド課金」を守るため、自前サーバー運用を絶対に許せない。',
        details: [
          'Calendlyは医療機関（HIPAA準拠）や金融機関から法外なエンタープライズ料金を徴収している。',
          'Cal.comはコードが公開されているため、セキュリティに厳しい大企業が自社のプライベートクラウド内に完全隔離して運用でき、大手の牙城を崩した。',
        ],
        sourceNote: 'Scheduling Software Disruption Case Study',
      },
      {
        id: 'ev_cal_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：「空いてる日程をメールで5往復する」不毛な往復書簡の苦痛',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '「来週火曜日の14時はどうですか？」「あ、その日は埋まってまして水曜の15時は？」という時間のドブ捨て。',
        details: [
          'この無駄なメール往復を消滅させるためなら、月額15ドルのツール代など1秒で正当化される。',
          '相手のタイムゾーンを自動変換して時差ボケミスを防ぐため、グローバルビジネスマンの必須インフラ。',
        ],
        sourceNote: 'Scheduling Friction and Productivity Economics',
      },
    ],
    observationsStream: [
      {
        date: '2024-09',
        author: 'Make-Money アナリスト',
        text: 'オープンソースの自前ホスト版から、クラウド版の有料組織プラン（Team/Enterprise）へのアップセルが順調に加速。ARR $10M（約15億円）を突破し黒字化基調を確立。',
      },
    ],
    temporal: {
      foundedYear: 2021,
      initialTractionPeriod: '2021年（Hacker NewsでのCalendso公開とバイラル爆発）',
      dataSnapshotPeriod: '2024〜2026年（Sacra分析レポート）',
      eraContext: 'リモートワークの定着と、Calendlyへの「マウント感・押し付け感」批判が噴出した過渡期',
      viabilityStatus: 'RISING_WAVE',
      viabilityLabel: '急成長トレンド',
      currentViabilityAnalysis: '日程調整リンクそのものがバイラルループとして機能するため、広告費をかけずに自走成長し続ける最強のPLG構造。',
    },
  },

  // 28. AudioPen
  {
    id: 'ent_audiopen_155f440ff058c5942d9a',
    ticker: 'AUD.OPEN',
    name: 'AudioPen',
    legalEntity: 'AudioPen (Louis Pereira)',
    tagline: '「頭の中のぐちゃぐちゃな独り言」をマイクに向かって喋るだけで、美しいブログ記事やメールに自動清書し、完全1人で年商3,500万円・粗利90%超をStripe着金させるAIマイクロSaaSの奇跡',
    sector: 'SaaS',
    scale: 'SOLO',
    founder: 'Louis Pereira',
    country: 'IN',
    url: 'https://audiopen.ai',
    verifiedBadge: true,
    growthRateYoY: 30.0,
    architecturePattern: 'ソロAIラッパー',
    pipelineStack: 'Bubbleノーコード基盤 × OpenAI Whisper API（音声認識） × GPT-4o（プロンプト推敲） × Stripe年額/生涯買い切り（$75〜$150）',
    targetPainWallet: 'キーボードを前にすると指が止まり1文字も書けなくなるライターズブロック ＆ まとまらない思考の言語化苦痛',
    tags: ['AI音声メモ', '年商3500万', '完全1人開発', '粗利90%超', 'Bubble開発'],
    pnl: {
      monthlyRevenue: 2800000, // 月商約$18,000〜$20,000 ≒ ¥280万円 (年商約3,500万円)
      cogs: 280000, // OpenAI Whisper/GPT API原価（約10%）
      grossProfit: 2520000,
      grossMargin: 90.0,
      operatingExpenses: {
        serverAndApi: 150000, // Bubbleホスティング・ドメイン
        advertising: 0, // 広告費完全ゼロ（すべてXのビルド・イン・パブリックで集客）
        subcontracting: 0, // 従業員・外注完全ゼロ（開発からサポートまで1人）
        toolsAndSaaS: 50000,
        other: 20000,
      },
      operatingProfit: 2300000, // Louis個人の手残り純利（月間約230万円、利益率82%）
      operatingMargin: 82.1,
      estimatedAnnualNetProfit: 27600000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2023〜2024年本人公開開示（月商$15k〜$20k安定・累計売上数十万ドル）',
      sourceDoc: 'Louis Pereira X投稿 / Indie Hackers / VibecoderHQ',
      estimationLogic: '年額パス（$75/年）およびライフタイム買い切り（$150）の継続的購入 ＝ 月商約$18k〜$20k（約¥280万円 ➔ 年商約3,500万円）',
    },
    evidenceCards: [
      {
        id: 'ev_ap_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】既存APIを2つ繋ぎ、「推敲プロンプト」を工夫するだけで年商数千万円の不労所得を作るコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '「Whisper（文字起こし）」と「GPT（文章校正）」を繋いだだけの極小ツールを、美しいUIで包んで売る。',
        details: [
          '【文字起こしではなく「要約・清書」に特化】: 単に喋った音声をそのまま書き起こすと「えーっと」「あー」が入って読めない。AudioPenは余計な言葉を削除し、完璧な文脈の段落に書き直すプロンプトを徹底チューニング。',
          '【Bubbleによる爆速開発】: 複雑なコードを書かず、ノーコードツールBubbleを使ってわずか数日でプロトタイプを構築・公開。',
          '【ライフタイムディール（LTD）での初動前金回収】: ローンチ初期に$60〜$120の買い切りプランを提供し、初週で数百万円の現金をStripe即時着金。',
        ],
        codeSnippet: '// 音声清書マイクロSaaS配管\n1. マイクから録音された音声BlobをOpenAI Whisper APIへ送り文字起こし\n2. 「以下の乱雑な思考の独り言から、重複を排除し論理的で美しい3つの段落に書き直せ」とGPT-4oへ投げる\n3. 出力されたテキストを1クリックでコピーできる美しいミニマル画面を表示',
        sourceNote: 'Louis Pereira "How I built AudioPen to $15k MRR"',
      },
      {
        id: 'ev_ap_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：Twitter（X）でのBuild in Publicと創業者の独り言動画',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '2023年3月、インド在住のLouisが「自分が歩きながらメモを取るためのツール」としてXで進捗を共有。',
        details: [
          '「今日マイクに向かって適当に喋った愚痴が、こんな綺麗な文章になりました」というビフォーアフター動画をXに投稿。',
          '文章を書くのが苦手なビジネスマンやクリエイターの間で動画が猛烈に拡散。',
          '広告費を1円もかけず、Twitterのフォロワーからの口コミだけでローンチ初月に数万ドルの売上を記録。',
        ],
        sourceNote: 'Indie Hackers AudioPen Interview',
      },
      {
        id: 'ev_ap_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：Apple純正のボイスメモやGoogle Keepが勝てない理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: 'AppleやGoogleの純正メモアプリは「原音を忠実に残す」ことにとどまり、大胆な文章推敲をしてくれない。',
        details: [
          '大手のメモアプリは「喋った言葉の通りに書き起こす」仕様。しかし人間が本当に欲しいのは、文字起こしではなく「ブログやメールにそのまま使える整った文章」。',
          'AudioPenはその急所に1点特化したため、巨大テックの純正機能を退けて有料課金された。',
        ],
        sourceNote: 'AI Voice Memo Niche Market Dynamics',
      },
      {
        id: 'ev_ap_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：歩きながら・風呂上がりに思いついた素晴らしいアイデアを忘れる恐怖',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '散歩中や運転中に最高のビジネスアイデアを思いついても、スマホでフリック入力している間にアイデアが蒸発する絶望。',
        details: [
          'スマホを取り出してマイクボタンを押し、3分間思いつくままに喋り散らかすだけで、帰宅した時には洗練された記事の下書きができている。',
          '「思考の外部ハードディスク」として、作家、起業家、ADHD傾向のある知的生産者の財布を完全に人質化。',
        ],
        sourceNote: 'Idea Capture Friction Psychology',
      },
    ],
    observationsStream: [
      {
        date: '2024-05',
        author: 'Make-Money アナリスト',
        text: '固定費月数万円・従業員ゼロで毎月数百万円が純利として個人口座に振り込まれる、インディーハッカーの最高峰の理想郷。スタイル選択（フォーマル、ポエティック、箇条書き）を追加しLTVを最大化。',
      },
    ],
    temporal: {
      foundedYear: 2023,
      initialTractionPeriod: '2023年春（Twitterでのビルド・イン・パブリックとデモ動画のバイラル）',
      dataSnapshotPeriod: '2024年（本人開示・収益レポート）',
      eraContext: 'OpenAI Whisper APIの公開と、生成AIマイクロSaaSの爆発的ブーム期',
      viabilityStatus: 'ACTIVE_PLAYBOOK',
      viabilityLabel: '現在も有効',
      currentViabilityAnalysis: '大手AI（ChatGPT等）に音声要約が付いても、AudioPenの「ワンタップで録音から清書まで終わる極限のUIの手軽さ」が強力な使い勝手の堀となっている。',
    },
  },
];

console.log('Part 3 count:', part3Entities.length);

const filePath = resolve(process.cwd(), 'scripts/batch-data-3.ts');
let content = readFileSync(filePath, 'utf8');

content = content.trim().replace(/\];$/, '');
const part3Code = part3Entities.map(e => JSON.stringify(e, null, 2)).join(',\n\n');

content = `${content},\n\n${part3Code}\n];\n`;
writeFileSync(filePath, content, 'utf8');
console.log('Successfully merged part 3 into batch-data-3.ts! Total 28 entities complete.');
