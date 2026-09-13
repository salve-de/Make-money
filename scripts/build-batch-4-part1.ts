import { writeFileSync } from 'fs';
import { resolve } from 'path';

const part1Entities = [
  // 1. Browse AI
  {
    id: 'ent_browseai_2ef74239e36bbf81739f',
    ticker: 'BRWS.AI',
    name: 'Browse AI',
    legalEntity: 'Browse AI Inc.',
    tagline: '「コードを1行も書かずにクリックするだけ」で任意のWebサイトをAPI化し、競合価格や求人データを自動監視してARR 6.8億円・完全黒字を叩き出すスクレイピングSaaS',
    sector: 'SaaS',
    scale: 'SMB',
    founder: 'Arham Islam',
    country: 'CA',
    url: 'https://browse.ai',
    verifiedBadge: true,
    growthRateYoY: 50.0,
    architecturePattern: 'ノーコードAPI化',
    pipelineStack: 'Chrome Extension（画面録画式ロボット学習） × ヘッドレスブラウザ分散インフラ × Stripe月額サブスク（$48〜$280/月）',
    targetPainWallet: 'スクレイピングコードの保守に疲れ果てた開発者 ＆ 競合サイトの価格変更や在庫切れを人力でF5連打監視しているEC担当者',
    tags: ['Webスクレイピング', 'ARR 6.8億', 'ノーコードAPI', '完全黒字', 'ブラウザ自動化'],
    pnl: {
      monthlyRevenue: 56000000, // ARR約$4.5M ≒ ¥6.8億円 (月商約¥5,600万円)
      cogs: 8400000, // ヘッドレスブラウザ・プロキシIP・AWSインフラ（粗利85%）
      grossProfit: 47600000,
      grossMargin: 85.0,
      operatingExpenses: {
        serverAndApi: 6000000,
        advertising: 8000000,
        subcontracting: 15000000, // エンジニア・サポート人件費
        toolsAndSaaS: 3000000,
        other: 5600000,
      },
      operatingProfit: 10000000, // 営業利益率約18% (月商約1,000万円)
      operatingMargin: 17.9,
      estimatedAnnualNetProfit: 120000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2024〜2025年報道（ARR $4.5M突破・黒字成長中）',
      sourceDoc: 'Caplight / GetLatka / Vancouver Tech Journal取材',
      estimationLogic: '有料契約企業数約4,000社 × 平均月額$100 ＝ 年商約$4.5M（約¥6.8億円 ➔ 月商約5,600万円）',
    },
    evidenceCards: [
      {
        id: 'ev_brw_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】ブラウザ拡張でクリックさせるだけでボットを自動生成し、従量課金するコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: 'PythonのBeautifulSoupやPuppeteerの難解なコードを「画面クリック」に置き換えて課金する。',
        details: [
          '【録画式ボット作成】: Chrome拡張を開いて「このテーブルを抽出」とクリックするだけで、AIが自動でセレクタを認識し定期監視ロボットを生成。',
          '【CAPTCHAとIPブロックの自動迂回】: 個人開発者が最も苦しむCloudflareやCAPTCHAのブロックを、裏側の住宅用プロキシ網で完全自動すり抜け。',
          '【クレジット消費モデル】: 抽出したデータ行数や実行回数に応じてクレジットを消費させ、データ量の多い企業顧客から高額プランを徴収。',
        ],
        codeSnippet: '// ノーコードスクレイピング配管\n1. Chrome拡張でユーザーのブラウザ操作（クリック、スクロール、ページ遷移）をイベント記録\n2. セレクタがサイト改修で壊れた場合、AIが周辺のDOM構造から対象要素を自動修復（Self-healing）\n3. 抽出結果をWebhook経由でGoogleスプレッドシートやAirtableへリアルタイム同期',
        sourceNote: 'Arham Islam 創業インタビュー',
      },
      {
        id: 'ev_brw_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：Product Hunt年間最優秀プロダクト受賞と自作デモ動画',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '2021年、2分で不動産サイトからデータを抜くデモ動画を公開し、非エンジニアの心を鷲掴み。',
        details: [
          '「プログラミング知識ゼロで、2分で任意のサイトからデータを抽出できる」という衝撃的な動画をProduct Huntに投稿。',
          'Product of the Day 1位を獲得し、初月で数万人のサインアップを獲得。',
          'Indie Hackersコミュニティの著名投資家Arvid Kahlらからエンジェル出資を受け黒字急成長。',
        ],
        sourceNote: 'Product Hunt Golden Kitty Awards History',
      },
      {
        id: 'ev_brw_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：Octoparse等の既存ツールが「難解なWindowsソフト」に甘んじていた死角',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: '古いスクレイピングツールは重たいWindows専用ソフトのインストールを要求し、Macユーザーを無視していた。',
        details: [
          '既存ツールはXPathや正規表現の知識を要求する玄人向け仕様。',
          'Browse AIは「ブラウザ拡張機能だけで完結する直感性」と「クラウド自動実行」に特化し、マーケターやリサーチャーの新規需要を独占。',
        ],
        sourceNote: 'Web Scraping SaaS Market Analysis',
      },
      {
        id: 'ev_brw_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：サイト構造が変わるたびにスクレイピングコードが落ちるエンジニアの怒り',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '自前で組んだPythonスクリプトが、相手のHTMLクラス名変更で毎週エラー停止する無限の保守地獄。',
        details: [
          'Browse AIの「自己修復AIセレクタ」を使えば、サイトがデザイン変更しても自動で追従してデータを抽出し続ける。',
          '社内エンジニアの貴重な工数を守るため、月額数十ドルの支払いは「安すぎる外注費」として即決される。',
        ],
        sourceNote: 'Developer Maintenance Burden Economics',
      },
    ],
    observationsStream: [
      {
        date: '2024-05',
        author: 'Make-Money アナリスト',
        text: '自己修復セレクタとGoogle Sheets連携の強化により、解約率を低減。エンタープライズ向けの専用プロキシ・大量抽出プランを新設しARPUを引き上げ。',
      },
    ],
    temporal: {
      foundedYear: 2021,
      initialTractionPeriod: '2021年（Product Huntローンチとバイラルデモ動画による初動突破）',
      dataSnapshotPeriod: '2024年（Caplight / Latka推計）',
      eraContext: 'ノーコードブームと、データドリブンマーケティングのための競合監視需要の重なり',
      viabilityStatus: 'ACTIVE_PLAYBOOK',
      viabilityLabel: '現在も有効',
      currentViabilityAnalysis: 'Webサイト側のスクレイピング対策（Cloudflare Turnstile等）が高度化する中、プロキシ網と自動迂回技術を抱えるインフラとしての価値が向上。',
    },
  },

  // 2. Byword
  {
    id: 'ent_byword_ec4f3e53cbe79851187f',
    ticker: 'BYWD.SEO',
    name: 'Byword',
    legalEntity: 'Byword AI Ltd',
    tagline: '「1,000個のキーワードCSVを投げるだけ」で数万文字の高品質SEO記事を自動生成しWordPressへ即時流し込み、1年でARR 1.5億円を突破したプログラマティックSEOの急先鋒',
    sector: 'SaaS',
    scale: 'SOLO',
    founder: 'Mack Grenfell',
    country: 'UK',
    url: 'https://byword.ai',
    verifiedBadge: true,
    growthRateYoY: 100.0,
    architecturePattern: '大量SEO自動化',
    pipelineStack: 'Next.js × OpenAI GPT-4o API × WordPress/Webflow自動投稿API × 従量クレジット課金（$99〜$1,999）',
    targetPainWallet: 'ライターに1文字5円払って月10本の記事を待つ遅さに絶望したSEOエージェンシーやアフィリエイター',
    tags: ['AI SEO', 'ARR 1.5億超', 'プログラマティックSEO', '完全1人開発', 'WordPress自動連携'],
    pnl: {
      monthlyRevenue: 12500000, // ARR約$1M+ ≒ ¥1.5億円 (月商約¥1,250万円)
      cogs: 2500000, // OpenAI API推論原価（約20%）
      grossProfit: 10000000,
      grossMargin: 80.0,
      operatingExpenses: {
        serverAndApi: 500000,
        advertising: 1000000,
        subcontracting: 1000000,
        toolsAndSaaS: 500000,
        other: 500000,
      },
      operatingProfit: 6500000, // Mack個人の手残り純利（月間約650万円、利益率52%）
      operatingMargin: 52.0,
      estimatedAnnualNetProfit: 78000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2023〜2024年公開開示（創業1年で7桁ドルARR達成）',
      sourceDoc: 'Mack Grenfell公式ブログ・X投稿 / AI Tools Forest',
      estimationLogic: 'SEOエージェンシー・企業約500社 × 月間クレジット消費（$200〜$1,000） ＝ 年商約$1M+（約¥1.5億円 ➔ 月商約1,250万円）',
    },
    evidenceCards: [
      {
        id: 'ev_bywd_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】キーワードの一覧をCSVでアップロードさせ、1クリックでWordPressに1,000記事下書きするコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '1記事ずつChatGPTにプロンプトを打つ面倒を全廃し、ボタン1つでWebサイトを記事で埋め尽くす。',
        details: [
          '【プログラマティックSEOの自動化】: キーワードリストをCSVで投げると、AIが見出し構成、内部リンク、アイキャッチ画像生成まで一貫処理。',
          '【CMS直結パブリッシング】: WordPress、Webflow、Ghost、ShopifyのAPIと直結し、生成された記事が自動で下書きまたは即時公開される。',
          '【AI特有の不自然な文章の排除】: 単なるChatGPTの生出力ではなく、独自のアンチAIディテクション・リライトパイプラインを通して自然な日本語/英語を担保。',
        ],
        codeSnippet: '// 大量SEO生成配管\n1. ユーザーがターゲットキーワードのCSV（例: 「渋谷 カフェ Wi-Fi」「新宿 カフェ Wi-Fi」等）を投入\n2. GPT-4oへ長文構造化プロンプトを投げ、H2/H3タグとFAQ構造化マークアップ付きHTMLを生成\n3. WordPress REST APIを叩いてアイキャッチ画像とともに一括投稿',
        sourceNote: 'Mack Grenfell "Building Byword to $1M ARR in 12 Months"',
      },
      {
        id: 'ev_bywd_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：自作ツールで数百サイトのアクセスを急上昇させた検証スクショ',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '元SEOコンサルタントのMackが、自前のドメインで数千記事を投下しGoogle Search ConsoleのグラフをXで公開。',
        details: [
          '「0PVから3ヶ月で月間100万インプレッションを達成した」というSearch Consoleの急上昇スクリーンショットをX（Twitter）に連投。',
          'SEO業界関係者が「何を使って記事を書いているのか？」と群がり、Bywordの非公開ベータ版に殺到。',
          '月額制ではなく「100記事で$99」などの買い切りクレジットモデルを採用し、初期の決済障壁を破壊して即座にARR 100万ドルへ到達。',
        ],
        sourceNote: 'Mack Grenfell X Case Study Threads',
      },
      {
        id: 'ev_bywd_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：JasperやCopy.aiが「大量一括生成」を前面に出せなかった理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: 'Jasperなどは「マーケターのアシスタント」という上品なブランディングに縛られていた。',
        details: [
          'Jasperは「Googleのペナルティを恐れる大手企業のブランド毀損」を警戒し、1記事ずつ人間が確認して手直しするUIを推奨していた。',
          'Bywordは「手直しなど不要、1,000記事を力技でインデックスさせてアクセスを総取りする」という現場の強欲に直撃してニッチを制覇。',
        ],
        sourceNote: 'AI Copywriting Market Divergence',
      },
      {
        id: 'ev_bywd_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：競合にキーワードを先回りして取られることへのSEO担当者の恐怖',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '手動で1本ずつ書いていたら、全部のキーワードを競合に網羅されてしまう焦燥感。',
        details: [
          '今夜のうちに1,000本の記事をインデックスさせ、検索結果の1ページ目を自社ドメインで埋め尽くしたいという欲望。',
          '月数十万円のツール代は、外注ライター数十人分の人件費（数百万円）と比較されて「圧倒的に格安」と判断される。',
        ],
        sourceNote: 'Programmatic SEO Speed Economics',
      },
    ],
    observationsStream: [
      {
        date: '2024-04',
        author: 'Make-Money アナリスト',
        text: 'GoogleのHelpful Content Updateに対応し、単なるAI長文から「自社独自データの注入機能（Custom Knowledge）」を実装。品質を高めつつ高速大量生成の優位性を維持。',
      },
    ],
    temporal: {
      foundedYear: 2023,
      initialTractionPeriod: '2023年（XでのプログラマティックSEO検証ログ公開とクレジット販売）',
      dataSnapshotPeriod: '2024年（公式開示データ）',
      eraContext: 'ChatGPT登場直後の「大量コンテンツによるSEOハック」の過渡期',
      viabilityStatus: 'EVOLVING_BARRIER',
      viabilityLabel: '技術進化で特化必須',
      currentViabilityAnalysis: 'GoogleのAIコンテンツ対策が厳格化する中、独自ファクトデータの注入やプログラマティックなニッチ展開への適応が必須。',
    },
  },

  // 3. Bardeen
  {
    id: 'ent_bardeen_ad88fb838c3e0dc78757',
    ticker: 'BARD.AUTO',
    name: 'Bardeen',
    legalEntity: 'Bardeen, Inc.',
    tagline: '「Zapierのサーバー間連携では取れない画面上のデータ」をブラウザ拡張からワンクリックでNotionやSheetsへ流し込み、年商15億円を築くクライアントサイド自動化AI',
    sector: 'SaaS',
    scale: 'SMB',
    founder: 'Pascal Weinberger, Allen Cheng',
    country: 'US',
    url: 'https://www.bardeen.ai',
    verifiedBadge: true,
    growthRateYoY: 45.0,
    architecturePattern: 'ブラウザ内自動化',
    pipelineStack: 'Chrome Extension（ローカル実行） × ブラウザ内スクレイピング × Notion/Airtable/HubSpot API連携 × 月額サブスク（$15〜$50/月）',
    targetPainWallet: 'LinkedInやZoomの画面を見ながら、顧客情報を1件ずつ手動でコピペしてCRMに入力している営業マンの指の腱鞘炎',
    tags: ['ブラウザ自動化', '年商15億', 'Zapier代替', 'ローカル実行', 'ワークフローAI'],
    pnl: {
      monthlyRevenue: 125000000, // 年商約$10M ≒ ¥15億円 (月商約¥1.25億円)
      cogs: 18750000, // AI推論APIおよびインフラ原価（粗利85%）
      grossProfit: 106250000,
      grossMargin: 85.0,
      operatingExpenses: {
        serverAndApi: 15000000,
        advertising: 25000000,
        subcontracting: 45000000, // エンジニア人件費
        toolsAndSaaS: 6000000,
        other: 10250000,
      },
      operatingProfit: 5000000, // 営業利益率約4% (月商約500万円)
      operatingMargin: 4.0,
      estimatedAnnualNetProfit: 60000000,
      financialStatus: 'ESTIMATED',
      dataSnapshotPeriod: '2023〜2024年（シリーズA調達後の急速なB2B営業展開期）',
      sourceDoc: 'TechCrunch / Sacra / Bardeen公式発表',
      estimationLogic: '有料B2Bユーザー数約25,000人 × 平均月額単価$35 ＝ 年商約$10M（約¥15億円 ➔ 月商約1.25億円）',
    },
    evidenceCards: [
      {
        id: 'ev_bard_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】ブラウザの「右クリックメニュー」に自動化を潜り込ませ、作業中の画面から客を奪うコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '「今見ているLinkedInのプロフィールをNotionに保存」を1クリックで実行させ、Zapierのサーバー課金を回避する。',
        details: [
          '【ローカル実行によるコスト破壊】: クラウドサーバーを介さずユーザー自身のブラウザ上でJSを実行するため、インフラ原価がほぼゼロ。',
          '【自然言語プロンプトによる自動化作成】: 「このページの企業名とメールアドレスをスプレッドシートに追加して」と打つだけで、AIがワークフローを即時生成。',
          '【営業・リクルーターの定常業務ジャック】: 候補者リスト作成や競合リサーチという毎日のルーティンに埋め込まれ、解約不能に。',
        ],
        codeSnippet: '// クライアントサイド自動化配管\n1. Chrome拡張が現在開いているWebページのDOMツリーをパース\n2. ユーザーが指定した項目（名前、役職、会社名）を抽出し、Notion API経由でデータベースへ直接PUT\n3. 処理完了のトースト通知を画面右下に表示し、認知負荷ゼロで作業完了',
        sourceNote: 'Pascal Weinberger 創業ドキュメント',
      },
      {
        id: 'ev_bard_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：Product Hunt年間最優秀プロダクト受賞と無料テンプレートの嵐',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '2021年、「Zapierより10倍速いブラウザ自動化」を掲げてProduct Huntにローンチ。',
        details: [
          '数百種類の既製自動化テンプレート（「ワンクリックでZoomの参加者リストをNotionへ」等）をすべて無料で配布。',
          'Product of the Yearを受賞し、初期数万人の営業マンや採用担当者を獲得。',
          'Tiger GlobalやFirstMark等の名門VCから即座に出資を勝ち取り、AI機能を統合して急拡大。',
        ],
        sourceNote: 'TechCrunch "Bardeen raises $15.3M for its AI-powered workflow automation"',
      },
      {
        id: 'ev_bard_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：ZapierやMakeがブラウザ内自動化に手を出せない理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: 'Zapierは「API同士を繋ぐクラウドサーバー」として構築されており、ログイン後のブラウザ画面を触れない。',
        details: [
          'Zapierは公開APIがないWebサイトや、ログインが必要な社内イントラネットのデータを抽出できない。',
          'Bardeenは「ユーザー自身のブラウザ」として動作するため、APIが存在しないサイトでも人間の代わりに画面を読み取ることができ、競合の死角を突いた。',
        ],
        sourceNote: 'Client-Side vs Server-Side Automation Moat',
      },
      {
        id: 'ev_bard_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：毎日2時間コピペ作業をして残業する営業マンの疲労',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '「1件コピペするのに30秒、100件で1時間」という死ぬほど退屈な手作業の苦痛。',
        details: [
          'Bardeenを使えば、100件のリード情報が3秒でスプレッドシートに流し込まれる。',
          '「早く帰宅して家族と過ごしたい」という人間の根源的な怠惰と疲労の切除のために、喜んで月額課金される。',
        ],
        sourceNote: 'Sales Automation Behavioral Economics',
      },
    ],
    observationsStream: [
      {
        date: '2024-03',
        author: 'Make-Money アナリスト',
        text: '自然言語で指示するだけでWebブラウジングしてデータを集めてくる「AIエージェント機能」をリリース。単なるスクレイピングから自律型リサーチツールへ昇格。',
      },
    ],
    temporal: {
      foundedYear: 2020,
      initialTractionPeriod: '2021年（Product Hunt Golden Kitty受賞と無料テンプレ配布）',
      dataSnapshotPeriod: '2024年（企業開示・業界レポート）',
      eraContext: 'リモート営業の定着と、ブラウザ完結型SaaSの利用急増期',
      viabilityStatus: 'ACTIVE_PLAYBOOK',
      viabilityLabel: '現在も有効',
      currentViabilityAnalysis: 'ブラウザのCookieやログインセッションを利用したクライアントサイド自動化の利便性は極めて高く、AIエージェント化でさらに強固。',
    },
  },

  // 4. Captions
  {
    id: 'ent_captions_3d96412fefcce5b8ac16',
    ticker: 'CAPT.VID',
    name: 'Captions',
    legalEntity: 'Captions, Inc.',
    tagline: '「スマホに向かって喋るだけで映画並みの字幕とアイタクトを自動生成」し、TikTok・Reelsクリエイターから年商60億円・企業価値5億ドルを吸い上げるAI動画編集の魔術師',
    sector: 'SaaS',
    scale: 'ENTERPRISE',
    founder: 'Gaurav Misra, Dwight Churchill',
    country: 'US',
    url: 'https://www.captions.ai',
    verifiedBadge: true,
    growthRateYoY: 80.0,
    architecturePattern: '特化AIスタジオ',
    pipelineStack: 'iOSネイティブAIレンダリング × 自社Whisper/音声認識エンジン × 目線自動補正（Eye Contact AI） × 月額サブスク（$10〜$30/月）',
    targetPainWallet: '何時間もかけてPremiere Proでテロップを手打ちし、カメラ目線が外れて素人くさい動画になるクリエイターの劣等感',
    tags: ['AI動画編集', '年商60億', '自動字幕', '目線補正', 'TikTok特化'],
    pnl: {
      monthlyRevenue: 500000000, // 年商約$40M ≒ ¥60億円 (月商約¥5億円)
      cogs: 75000000, // GPUクラウド推論・動画レンダリング原価（粗利85%）
      grossProfit: 425000000,
      grossMargin: 85.0,
      operatingExpenses: {
        serverAndApi: 50000000,
        advertising: 150000000, // TikTok/Instagram獲得広告
        subcontracting: 120000000, // AIビジョンエンジニア人件費
        toolsAndSaaS: 20000000,
        other: 35000000,
      },
      operatingProfit: 50000000, // 営業利益率約10% (月商約5,000万円)
      operatingMargin: 10.0,
      estimatedAnnualNetProfit: 600000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2024年シリーズC調達時報道（ARR約$40M水準・評価額$500M）',
      sourceDoc: 'TechCrunch / Forbes / Bloomberg 2024年取材',
      estimationLogic: '有料モバイルサブスク会員約200万人 × 月額平均$20 ＝ 年商約$40M（約¥60億円 ➔ 月商約5億円）',
    },
    evidenceCards: [
      {
        id: 'ev_capt_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】動画編集の手間を99%削り、「目線がカメラに吸い付く」魔法で即時課金させるコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '原稿をカンペで読みながら喋っても、AIが瞳を正面に自動補正し、言葉に合わせて文字が弾む字幕をつける。',
        details: [
          '【Eye Contact AIによる奇跡】: 台本を見下ろしながら喋った動画でも、AIが視線をレンズの中心に固定補正し、自信満々なプロのプレゼンターに見せる。',
          '【Alex Hormozi風字幕の自動化】: 話している単語ごとに色が変わり、絵文字が飛び出すバイラル字幕を音声認識から0秒で自動生成。',
          '【スタジオ音質の自動ノイズ除去】: 自宅のうるさいエアコンや車の騒音をワンタップで消滅させ、数万円のマイクで録音したようなプロ音質に変換。',
        ],
        codeSnippet: '// モバイル特化AI動画生成配管\n1. スマホで撮影された前面カメラ動画をローカルで音声認識しタイムスタンプ付き字幕を生成\n2. フェイシャルランドマークを追跡し、瞳のテクスチャをカメラレンズ方向にリアルタイムワープ補正\n3. 出力時にTikTok/Reels推奨の縦型9:16でワンクリック書き出し',
        sourceNote: 'Gaurav Misra 創業インタビュー',
      },
      {
        id: 'ev_capt_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：元Instagram社員が「トーク系動画」の急増に全賭け',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '2021年、元ゴールドマン・サックス＆Instagramのエンジニアが、TikTokで喋り動画が急増している現象に着目。',
        details: [
          '「人は音声をオフにして動画を見ている」という事実に着目し、単なる字幕アプリとしてApp Storeにローンチ。',
          'クリエイターが「Captionsで作った」とTikTokに動画を投稿するたびに、画面の字幕スタイル自体が宣伝となりバイラル拡散。',
          'Kleiner PerkinsやIndex Venturesから次々と資金調達し、動画クリエイター必携の神アプリへ上り詰めた。',
        ],
        sourceNote: 'TechCrunch "Captions raises $60M Series C for AI-powered video editing"',
      },
      {
        id: 'ev_capt_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：Adobe PremiereやCapCutが対抗できない開発スピード',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: 'PremiereはPC専用の重厚なソフトであり、CapCutは汎用的な切り抜き・エフェクトに手一杯。',
        details: [
          'Captionsは「カメラに向かって喋るトーキングヘッド動画」だけに1点集中。',
          '目線補正、リップシンク（多言語吹き替え）、AIツイン（自分のアバター）といった最先端の生成AI機能を毎週のようにモバイルアプリへ投下し、大手を置き去りにした。',
        ],
        sourceNote: 'Short-Form Video Editing Competitive Moat',
      },
      {
        id: 'ev_capt_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：カメラの前で噛んだり目線が泳いだりする「素人のダサさ」への羞恥心',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: 'SNSで発信したいが、自分の喋り方や表情に自信がなく動画を投稿できない初心者の劣等感。',
        details: [
          'Captionsを使えば、噛んだ部分や無音の間（ま）が自動でカットされ、目線も外れず、文字通り完璧なスピーカーに変身できる。',
          '「自分を魅力的に見せるための魔法の鏡」として、月額数十ドルの支払いは自己投資として即決される。',
        ],
        sourceNote: 'Creator Vanity and AI Enhancement Psychology',
      },
    ],
    observationsStream: [
      {
        date: '2024-07',
        author: 'Make-Money アナリスト',
        text: '自分の顔と声で別の言語を流暢に喋る「AI多言語リップシンク」機能をリリース。世界中のクリエイターが英語圏へ越境発信するための関所としてポジションを強化。',
      },
    ],
    temporal: {
      foundedYear: 2021,
      initialTractionPeriod: '2021〜2022年（TikTokのトーキング動画ブームとバイラル字幕スタイルによる急成長）',
      dataSnapshotPeriod: '2024年（シリーズC調達・公式発表）',
      eraContext: '縦型ショート動画（TikTok, YouTube Shorts, Reels）の爆発的普及期',
      viabilityStatus: 'RISING_WAVE',
      viabilityLabel: '急成長トレンド',
      currentViabilityAnalysis: '最先端の生成AIモデル（目線、音声、リップシンク）をスマホ上で軽快に動かすレンダリング技術の堀が極めて深い。',
    },
  },

  // 5. Beautiful.ai
  {
    id: 'ent_beautifulai_2b5b59f986ad4956b7c9',
    ticker: 'BTFL.AI',
    name: 'Beautiful.ai',
    legalEntity: 'Beautiful.ai, Inc.',
    tagline: '「パワポでテキストを入れるたびにレイアウトが崩れて深夜残業する」苦痛を数学的に防ぎ、スライド自動整形だけで年商45億円を稼ぎ出すプレゼンSaaSの先駆者',
    sector: 'SaaS',
    scale: 'ENTERPRISE',
    founder: 'Mitch Grasso',
    country: 'US',
    url: 'https://www.beautiful.ai',
    verifiedBadge: true,
    growthRateYoY: 30.0,
    architecturePattern: '制約駆動デザイン',
    pipelineStack: 'スマートスライドレイアウトエンジン（特許取得） × チーム共有テンプレート × Stripe年額サブスク（$144〜$480/年）',
    targetPainWallet: '明日の朝の役員プレゼン資料のフォントサイズや図形の配置合わせで深夜3時まで消耗するビジネスマンの怒り',
    tags: ['プレゼンSaaS', '年商45億', 'レイアウト自動化', 'デザイン制約', 'B2Bサブスク'],
    pnl: {
      monthlyRevenue: 375000000, // 年商約$30M ≒ ¥45億円 (月商約¥3.75億円)
      cogs: 37500000, // AWSインフラ・レンダリング原価（粗利90%）
      grossProfit: 337500000,
      grossMargin: 90.0,
      operatingExpenses: {
        serverAndApi: 35000000,
        advertising: 120000000,
        subcontracting: 90000000, // 開発・UIデザイナー人件費
        toolsAndSaaS: 15000000,
        other: 27500000,
      },
      operatingProfit: 50000000, // 営業利益率約13% (月商約5,000万円)
      operatingMargin: 13.3,
      estimatedAnnualNetProfit: 600000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2023〜2024年（有料ユーザー100万人突破・Teamプラン拡大期）',
      sourceDoc: 'Forbes / PitchBook / Beautiful.ai公式発表',
      estimationLogic: '有料会員数約25万人 × 平均年額単価$150 ＝ 年商約$30M（約¥45億円 ➔ 月商約3.75億円）',
    },
    evidenceCards: [
      {
        id: 'ev_btfl_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】自由な編集をあえて「禁止」し、文字量に合わせてスライドを自動変形させるコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: 'PowerPointの「どこにでも図形を置ける自由」こそが素人を苦しめている元凶だと定義し、配置を自動制御する。',
        details: [
          '【スマートスライドの物理法則】: 項目を1つ追加すると、他のブロックが自動で縮小し、余白とフォントサイズが黄金比率で再計算される。',
          '【ダサいスライドを作れない制約】: ユーザーがどんなに素人でも、デザインの崩壊した酷いスライドを作ることがシステム的に不可能な設計。',
          '【企業全体のデザイン統一】: 会社ロゴやブランドカラーを管理者が固定し、社員全員が統一された美しいプレゼン資料を爆速作成。',
        ],
        codeSnippet: '// 制約駆動型レイアウト配管\n1. スライド要素を自由座標（Absolute）ではなく、自動計算グリッド（Flexbox/Grid）で拘束\n2. テキスト量やアイテム数（3個➔4個）の変更を検知し、アニメーションを伴って自動リサイズ\n3. 「Designer Cloud」によりブランドガイドラインに違反する色やフォントの選択を完全ロック',
        sourceNote: 'Mitch Grasso 創業インタビュー',
      },
      {
        id: 'ev_btfl_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：シリアルアントレプレナーの「パワポ嫌悪」からの逆張り',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '過去にオンライン動画編集SlideRocketを成功させたMitchが、「プレゼンソフトの最大のバグは自由度」と看破。',
        details: [
          '2016年に創業。自由なキャンバスを廃止し、あらかじめ数学的に整列された「Smart Templates」を数十個用意。',
          '「PowerPointで3時間かかる作業が3分で終わる」比較動画をSNSで広告配信し、激務に追われるコンサルタントやマーケターを獲得。',
          '口コミで急速に社内に広がるボトムアップ型（PLG）で急拡大。',
        ],
        sourceNote: 'How Beautiful.ai Automated Presentation Design',
      },
      {
        id: 'ev_btfl_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：Microsoft PowerPointが自動レイアウトを強制できない理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: 'パワポは30年間の遺産があり、1ピクセル単位の自由配置を前提とした数億個の既存ファイルがある。',
        details: [
          'Microsoftが急に「要素を自動で整列させて自由配置を禁止」したら、世界中の企業の既存テンプレートがすべて崩壊する。',
          'そのためパワポはレガシーな自由配置を捨てられず、Beautiful.aiの「何もしなくても美しい」新世代体験に対抗できなかった。',
        ],
        sourceNote: 'Legacy Software Inertia and Disruption',
      },
      {
        id: 'ev_btfl_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：クライアントや上司の前で「素人くさい資料」を出して舐められる恐怖',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '中身の提案は良いのに、スライドの見た目が不格好なせいで商談を落としたくないビジネスマンのプライド。',
        details: [
          'Beautiful.aiで作るだけで、デザイン会社に数十万円で発注したような洗練されたスライドに見える。',
          '自分の有能さを演出するための防衛費として、年額144ドルのサブスクは喜んで決済される。',
        ],
        sourceNote: 'Corporate Status Signaling in Presentations',
      },
    ],
    observationsStream: [
      {
        date: '2024-02',
        author: 'Make-Money アナリスト',
        text: '自然言語プロンプトからスライド全体（構成・テキスト・図解）を一瞬で出力する「DesignerBot AI」を統合。Gammaなどの新興競合と真っ向勝負を展開しつつ、B2Bチーム課金を堅守。',
      },
    ],
    temporal: {
      foundedYear: 2016,
      initialTractionPeriod: '2017〜2019年（コンサルタントの口コミとスマートスライドデモによる初動）',
      dataSnapshotPeriod: '2024年（公式発表・業界推計）',
      eraContext: 'リモートワーク下での非同期プレゼンテーション（PDF共有）の重要性急増期',
      viabilityStatus: 'MATURED_MOAT',
      viabilityLabel: '先行者堀で堅牢',
      currentViabilityAnalysis: '特許取得済みのレイアウトエンジンと長年蓄積された企業テンプレート資産により、安定したキャッシュフローを維持。',
    },
  },
];

console.log('Writing batch-data-4.ts with first 5 entities...');
writeFileSync(
  resolve(process.cwd(), 'scripts/batch-data-4.ts'),
  `import { FinancialEntity } from '../src/platform/types/terminal';\n\nexport const BATCH_ENTITIES_4: FinancialEntity[] = ${JSON.stringify(
    part1Entities,
    null,
    2
  )};\n`,
  'utf8'
);
