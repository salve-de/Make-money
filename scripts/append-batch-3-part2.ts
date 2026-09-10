import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const part2Entities = [
  // 11. 1440
  {
    id: 'ent_1440_80f77c7820bd7f120771',
    ticker: 'JOIN.1440',
    name: '1440',
    legalEntity: '1440 Media, LLC',
    tagline: '「政治的偏向と怒りの煽り記事に疲弊した」470万人の知性派読者を集め、中立な事実ログの配信だけで年商40億円・純利益率35%超を叩き出す日刊ニュースレターの王者',
    sector: 'INFO_MEDIA',
    scale: 'SMB',
    founder: 'Tim Huelskamp, Andrew Steigerwald, Bobby Lincoln',
    country: 'US',
    url: 'https://join1440.com',
    verifiedBadge: true,
    growthRateYoY: 30.0,
    architecturePattern: '中立中抜きメディア',
    pipelineStack: '自社CMS × Sailthruメール配信 × Meta/TikTok獲得広告 × 直販CPC/CPMネイティブ広告',
    targetPainWallet: 'SNSやテレビニュースの過激な党派対立と怒りの煽り運転で精神を病みたくない知性派ビジネスパーソンの平穏欲求',
    tags: ['ニュースレター', '年商40億', '読者470万人', '利益率35%超', 'ブートストラップ'],
    pnl: {
      monthlyRevenue: 337500000, // 年商約$27M ≒ ¥40.5億円 (月商約¥3.37億円)
      cogs: 33750000, // 原価約10%（メール配信インフラ・サーバー代）
      grossProfit: 303750000,
      grossMargin: 90.0,
      operatingExpenses: {
        serverAndApi: 15000000,
        advertising: 120000000, // 新規読者獲得広告（Meta等）
        subcontracting: 30000000, // 編集記者人件費（15名体制）
        toolsAndSaaS: 12000000,
        other: 8000000,
      },
      operatingProfit: 118750000, // 営業利益率約35% (月商約1.18億円)
      operatingMargin: 35.2,
      estimatedAnnualNetProfit: 1425000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2024〜2026年 取材報道（年商$27M到達・読者数470万人・第三者評価額$101M）',
      sourceDoc: 'Axios / Business Insider / 1440公式開示',
      estimationLogic: '購読者数470万人 × 開封率約50% × 週6日配信 × ネイティブ広告スロット ＝ 年間$27M（約40.5億円 ➔ 月商約3.37億円）',
    },
    evidenceCards: [
      {
        id: 'ev_1440_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】既存メディアの「オピニオン・感情論」を全カットし、中立ファクトの要約で広告を総取りするコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '「5分で世界が分かる中立な事実まとめ」を毎朝メールボックスに届け、大手ブランドの広告費を吸い上げる。',
        details: [
          '【意見（Opinion）の完全排除】: 記者の思想や推測を1文字も入れず、「何が起きたか」の客観的事実と双方の視点だけを3〜5行で要約。',
          '【広告主が喜ぶセーフ環境】: 炎上や政治的スキャンダルがないため、Fortune 500等の大手企業が安心して高単価（CPM $30〜$50）で出稿。',
          '【算術的CAC/LTV裁定取引】: Facebook広告で1人あたり$2〜$3で読者を獲得し、年間の広告閲覧で$6〜$8を回収する数学的増殖ループ。',
        ],
        codeSnippet: '// 中立アグリゲーションニュースレター配管\n1. 100以上の信頼できる一次情報源（ロイター、AP等）から毎朝重要トピックを10件抽出\n2. 感情的な修飾語を全削除し、小学生でもわかる事実要約にリライト\n3. Meta広告で「意見のない純粋な事実を朝5分で」と出稿し、読者を底引き網獲得',
        sourceNote: 'Tim Huelskamp 講演「Building a $27M Bootstrap Newsletter」',
      },
      {
        id: 'ev_1440_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：シカゴの友人70人に手動で送った朝刊メール',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: 'プライベートエクイティ出身のTimが、投資銀行員仲間の「朝忙しくてニュースを読む時間がない」苦痛から開始。',
        details: [
          '2017年、グーグルスプレッドシートにまとめたニュース要約を、友人70人に個人的にメール送信。',
          '転送によって読者が自然増し、1,000人を超えた段階で外部VCを入れず自前資金のみで広告テストを開始。',
          '獲得単価（CPA）と読者生涯価値（LTV）のスプレッドがプラスであることを確認し、利益の全額をMeta広告に投入して急拡大。',
        ],
        sourceNote: 'Axios Media Trends Interview',
      },
      {
        id: 'ev_1440_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：NYTやCNN、Fox Newsが中立になれない理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: '大手テレビ局や新聞は「読者を怒らせてクリックさせる」ことでPVと購読料を稼ぐビジネスモデル。',
        details: [
          'CNNは左派を、Foxは右派を煽ることで熱烈な信者を獲得しているため、中立な事実だけを淡々と書くと既存読者が退屈して解約してしまう。',
          '既存メディアが自縛している「怒りのPV争奪戦」の外側に、サイレントマジョリティである数千万人の「疲弊した知性派」が放置されていた。',
        ],
        sourceNote: 'Polarization in Digital Journalism Economics',
      },
      {
        id: 'ev_1440_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：朝の会議で「昨日のニュースを知らない」と恥をかく恐怖',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '会社の重役やクライアントとの雑談で、世の中の動向に無知だと思われたくないビジネスパーソンの防衛本能。',
        details: [
          '毎朝通勤中や始業前の5分間でメールを開くだけで、「世界の重要事項を網羅している」という安心感が得られる。',
          '開封率50%以上という驚異的な粘着性を誇り、読者の朝のルーティンを人質化。',
        ],
        sourceNote: 'Morning Briefing Habit Loop Study',
      },
    ],
    observationsStream: [
      {
        date: '2024-09',
        author: 'Make-Money アナリスト',
        text: '読者数470万人を突破。ニュースレター単体からポッドキャストや動画ダイジェストへ拡張しつつも、15名の超少数精鋭チームで利益率35%超を維持。',
      },
    ],
    temporal: {
      foundedYear: 2017,
      initialTractionPeriod: '2017〜2019年（友人70人からMeta広告ループによる急拡大期）',
      dataSnapshotPeriod: '2024年通期（公式・第三者評価開示）',
      eraContext: '米大統領選等に伴うメディアの極端な分極化とフェイクニュースへの不信感のピーク',
      viabilityStatus: 'ACTIVE_PLAYBOOK',
      viabilityLabel: '現在も有効',
      currentViabilityAnalysis: 'AI時代において「一次情報の客観的キュレーション」の信頼価値は暴騰しており、極めて高収益なポジションを維持。',
    },
  },

  // 12. 404 Media
  {
    id: 'ent_404media_67f4bdf34107c01d26ad',
    ticker: '404.NEWS',
    name: '404 Media',
    legalEntity: '404 Media LLC',
    tagline: '「VCが支配するデジタルメディアは全員クソだ」と大手Viceから独立した敏腕記者4名が設立し、自前のGhostブログで年商3億円・初年度から完全黒字を叩き出す調査報道ギルド',
    sector: 'INFO_MEDIA',
    scale: 'MICRO_TEAM',
    founder: 'Jason Koebler, Emanuel Maiberg, Joseph Cox, Samantha Cole',
    country: 'US',
    url: 'https://www.404media.co',
    verifiedBadge: true,
    growthRateYoY: 50.0,
    architecturePattern: '独立記者ギルド',
    pipelineStack: 'Ghost CMS × Stripe直結年額課金 × 独自ハッキング・AIスクープ × ポッドキャスト',
    targetPainWallet: '大手メディアの提灯記事やAI生成のゴミ記事に辟易し、本物のディープな裏情報・リークを渇望するテック関係者',
    tags: ['調査報道メディア', '年商3億', 'VC完全排除', '初年度黒字', 'Ghostメディア'],
    pnl: {
      monthlyRevenue: 25000000, // 年商約$2M ≒ ¥3億円 (月商約¥2,500万円)
      cogs: 2000000, // Ghostホスティング・Stripe手数料
      grossProfit: 23000000,
      grossMargin: 92.0,
      operatingExpenses: {
        serverAndApi: 500000,
        advertising: 1000000, // 広告費ほぼゼロ（スクープ拡散）
        subcontracting: 3500000, // ポッドキャスト編集・法務レビュー
        toolsAndSaaS: 1000000,
        other: 2000000,
      },
      operatingProfit: 15000000, // 創業者4人の高額役員報酬＋利益（月間約1,500万円、利益率60%）
      operatingMargin: 60.0,
      estimatedAnnualNetProfit: 180000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2024年メディア取材（ローンチ半年で黒字化・年間売上推定$1.5M〜$2M水準）',
      sourceDoc: 'Nieman Lab / Columbia Journalism Review / 404 Media公式開示',
      estimationLogic: '有料購読者約1.5万〜2万人 × 年額$100（月額$10） ＋ 広告・スポンサー ＝ 年商約$2M（約¥3億円 ➔ 月商約2,500万円）',
    },
    evidenceCards: [
      {
        id: 'ev_404_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】中間管理職とVCを完全排除し、有料会員の年間課金を記者自身で総取りするコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '大手メディアで安月給で書かされていた記者が、自前のスクープ力をそのまま有料サブスクに変える。',
        details: [
          '【大手の崩壊を逆手に取る】: ViceやBuzzFeed等の過剰債務メディアが大量解雇される中、看板記者4人が連名で「読者直結の独立メディア」を旗揚げ。',
          '【独自スクープによる無料拡散】: AIの著作権侵害、ダークウェブ犯罪、企業のデータ漏洩などの特大スクープを無料公開し、Twitter/Redditのトレンドを独占。',
          '【ペイウォールでコア記事を課金】: 深掘り取材や独自インタビューの後半にペイウォールを敷き、年額$100のサブスクへ一気にコンバージョン。',
        ],
        codeSnippet: '// 独立ギルド型サブスクメディア配管\n1. 特定業界で実績のある有名記者やクリエイター3〜5人で合同会社を設立\n2. Ghost等のオープンソースCMSを使って手数料ゼロの自前会員制サイトを構築\n3. 毎週1本の本物の独自スクープを放ち、拡散されたトラフィックを有料年額会員（¥15,000）へ転換',
        sourceNote: 'Jason Koebler 創業インタビュー',
      },
      {
        id: 'ev_404_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：Vice解雇直後の2023年8月、貯金を持ち寄って4人で旗揚げ',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '経営陣の無能さで破産したViceを見限り、4人の記者が退職金と自前資金で即日ドメインを取得。',
        details: [
          '2023年8月、Viceのテクノロジー部門Motherboardのトップ記者4名が立ち上げ。',
          'ローンチ直後から「ポルノサイトのAI生成画像スキャンダル」や「車載センサーデータの警察横流し」等の爆弾スクープを連発。',
          'わずか数ヶ月で数千人の有料会員が集まり、半年で完全黒字化を達成。',
        ],
        sourceNote: 'Columbia Journalism Review "The 404 Media Model"',
      },
      {
        id: 'ev_404_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：大メディアの役員報酬・営業人件費という巨大な寄生虫',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: '大手メディアは「何十人もの役員、営業マン、中間管理職」の給料を払うために常に赤字に陥る。',
        details: [
          '大手パブリッシャーは売上の大半が本社の間接コストに消え、記事を書く現場の記者には雀の涙しか渡らない。',
          '404 Mediaは役員も営業もゼロ。4人の記者が直接書き、直接サイトを管理するため、わずか数千人の有料読者で全員が高給取りになれる。',
        ],
        sourceNote: 'Digital Media Unit Economics Analysis',
      },
      {
        id: 'ev_404_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：エンジニア・法務担当者の「最新の規制・ハッキングの裏を知らないとヤバい」恐怖',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: 'テック企業のセキュリティ担当者や弁護士が、現場のヤバい実態を先回りして把握したい自己防衛財布。',
        details: [
          '一般メディアには絶対に載らない裏口ルートや法規制の穴が詳細にレポートされる。',
          '年額$100は個人のポケットマネー、あるいは会社の経費精算枠で1秒で決済される。',
        ],
        sourceNote: 'B2B Reader Subscription Psychology',
      },
    ],
    observationsStream: [
      {
        date: '2024-11',
        author: 'Make-Money アナリスト',
        text: 'ローンチ1年で持続可能な高収益モデルを確立。VC主導のメディア崩壊時代における「記者個人ギルド」の最高峰の成功例として業界のロールモデルに。',
      },
    ],
    temporal: {
      foundedYear: 2023,
      initialTractionPeriod: '2023年後半（Vice破産直後の旗揚げとAIスクープ連発による即時黒字化）',
      dataSnapshotPeriod: '2024年通期（Nieman Lab取材）',
      eraContext: 'デジタルメディアの大量解雇と、生成AIによるWebのゴミコンテンツ氾濫への反発期',
      viabilityStatus: 'RISING_WAVE',
      viabilityLabel: '急成長トレンド',
      currentViabilityAnalysis: 'AIコンテンツが氾濫すればするほど「本物の足で稼ぐ独自スクープ」のプレミアム価値が暴騰するため、長期的に極めて強固。',
    },
  },

  // 13. Acquired
  {
    id: 'ent_acquired_407492c944d80b69979b',
    ticker: 'ACQR.POD',
    name: 'Acquired',
    legalEntity: 'Acquired Media LLC',
    tagline: '3〜4時間の超長尺で企業の成功と資本の裏帳簿を解剖し、エリート投資家・経営者100万人の耳をジャックして年間広告枠18億円を即日完売させるポッドキャストの頂点',
    sector: 'INFO_MEDIA',
    scale: 'MICRO_TEAM',
    founder: 'Ben Gilbert, David Rosenthal',
    country: 'US',
    url: 'https://www.acquired.fm',
    verifiedBadge: true,
    growthRateYoY: 60.0,
    architecturePattern: '高密度独占メディア',
    pipelineStack: '自前リサーチ（数百時間） × 長尺ポッドキャスト配信 × 年単位長期スポンサー契約（J.P. Morgan, ServiceNow等）',
    targetPainWallet: 'シリコンバレーのエリートビジネスマンやVCの「浅いニュースでは満たされない知的飢餓感」と「ライバルに知識で負けたくない恐怖」',
    tags: ['ビジネスポッドキャスト', '年商18億', '1話100万回再生', '年単位スポンサー完売', '粗利90%'],
    pnl: {
      monthlyRevenue: 150000000, // 2025年広告売上$12M ≒ 年間約18億円 (月商約¥1.5億円)
      cogs: 15000000, // 音声・動画編集・サーバー配信原価（約10%）
      grossProfit: 135000000,
      grossMargin: 90.0,
      operatingExpenses: {
        serverAndApi: 3000000,
        advertising: 5000000, // 広告費ほぼゼロ（口コミとゲスト拡散）
        subcontracting: 15000000, // 専属リサーチ補助・法務
        toolsAndSaaS: 2000000,
        other: 10000000,
      },
      operatingProfit: 100000000, // 創業者2人の手残り純利（月間約1億円、利益率約67%）
      operatingMargin: 66.7,
      estimatedAnnualNetProfit: 1200000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2025〜2026年報道（2025年広告売上$12M・全年間枠即時完売）',
      sourceDoc: 'Wall Street Journal / Bloomberg 2026年取材レポート',
      estimationLogic: 'エピソードあたり100万ダウンロード × プレミアム年間スポンサー枠完売 ＝ 年間$12M（約18億円 ➔ 月商約1.5億円）',
    },
    evidenceCards: [
      {
        id: 'ev_acqr_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】「誰もやらないレベルの狂気のリサーチ」で超長尺化し、スポンサーを年間契約で縛るコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '1本の番組に100時間のリサーチを注ぎ込んで映画のような傑作を作り、1回の広告出稿で数千万円を抜く。',
        details: [
          '【タイパ・要約の逆を行く超長尺】: 世の中がTikTokの15秒動画に流れる中、あえて1エピソード3〜4時間の映画並みの長尺ビジネスドキュメンタリーを制作。',
          '【富裕層・意思決定者層の独占】: 聴取者の大半がVC、上場企業CEO、ヘッジファンド等のトップエリートであるため、広告単価が一般ポッドキャストの10倍に跳ね上がる。',
          '【年間パッケージ販売】: 単発の広告枠は売らず、「年間メインスポンサー（数億円）」としてJ.P. MorganやServiceNow等に独占販売して前金を回収。',
        ],
        codeSnippet: '// プレミアム長尺メディア配管\n1. 誰もが知っている巨大企業（任天堂、LVMH、エルメス、マイクロソフト）の全歴史を100時間かけて徹底解剖\n2. 3〜4時間の音声＋動画ポッドキャストとして月1本だけ極上の品質でドロップ\n3. B2Bメガエンタープライズに「年間独占スポンサー権」を数億円で直販',
        sourceNote: 'Ben Gilbert ＆ David Rosenthal 講演録',
      },
      {
        id: 'ev_acqr_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：シアトルの小部屋でM&Aの反省会からスタート',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '2015年、スタートアップのM&Aディールを「なぜあの買収は成功/失敗したのか？」と採点するマニアックな趣味から開始。',
        details: [
          '最初は数百人のテック関係者しか聴いていなかったが、妥協のない深掘り調査を何年も継続。',
          '「エピソードが長ければ長いほどリスナーのエンゲージメントが上がる」という異常なデータを発見し、どんどん尺を伸ばす逆張りを敢行。',
          'マーク・ザッカーバーグやジェンセン・フアン（NVIDIA）が逆指名で出演するようになり、資本主義の公式ドキュメンタリーへ昇格。',
        ],
        sourceNote: 'WSJ "How Acquired Became the Hottest Podcast in Tech"',
      },
      {
        id: 'ev_acqr_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：大手メディア企業が真似できない制作コスト構造',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: '大手放送局の社員記者は、1本の音声番組に1ヶ月の無給残業リサーチを注ぎ込むことができない。',
        details: [
          'ラジオ局や新聞社は「毎日・毎週の締め切り」に追われており、薄いニュースを大量生産せざるを得ない。',
          'Acquiredは2人の共同創業者が狂気的な情熱で数百冊の本やSECファイリングを読破して喋るため、大企業が組織的に模倣しようとすると数億円の人件費がかかり赤字になる。',
        ],
        sourceNote: 'Long-form Media Production Economics',
      },
      {
        id: 'ev_acqr_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：B2B超大手企業の「エリート層にだけ刺さるブランディング」予算',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '一般大衆向けのTVCMを打っても意味がないB2B巨頭（クラウド、投資銀行、ERP）の巨額宣伝枠。',
        details: [
          'J.P. MorganやSnowflakeなどは、一般人に知られる必要はなく「大企業のCIOやCEO」にだけ届かせたい。',
          'Acquiredのリスナーはまさにその意思決定者そのものであるため、数億円の年間スポンサー料が「安すぎる」と即決される。',
        ],
        sourceNote: 'B2B Enterprise Sponsorship Strategy',
      },
    ],
    observationsStream: [
      {
        date: '2026-01',
        author: 'Make-Money アナリスト',
        text: '2025年売上$12M（約18億円）を達成し、2026年枠も完売。独自VCファンド「Acquired Capital」（$30M規模）を組成し、メディアの引力で投資先のディールフローを独占するメタ・胴元構造を確立。',
      },
    ],
    temporal: {
      foundedYear: 2015,
      initialTractionPeriod: '2015〜2019年（シアトルの地道なM&A分析から長尺スタイルへのピボット）',
      dataSnapshotPeriod: '2025〜2026年（WSJ報道・公式発表）',
      eraContext: 'ショート動画全盛に対するカウンターカルチャーとしての「知的長尺コンテンツ」需要の爆発',
      viabilityStatus: 'MATURED_MOAT',
      viabilityLabel: '先行者堀で堅牢',
      currentViabilityAnalysis: '圧倒的な聴取時間とザッカーバーグ等の超大物ゲストネットワークが強固な堀となっており、競合が追いつくのは事実上不可能。',
    },
  },

  // 14. 2PM
  {
    id: 'ent_2pm_aaeaf4a28582273752d4',
    ticker: 'TWO.PM',
    name: '2PM',
    legalEntity: '2PM, Inc.',
    tagline: '「データとコマースが交差する未来」を冷徹に予測し、小売・ブランド幹部から年額$200〜$1,000のエグゼクティブ会員費を吸い上げるコマースインテリジェンスの関所',
    sector: 'INFO_MEDIA',
    scale: 'SOLO',
    founder: 'Web Smith',
    country: 'US',
    url: 'https://2pml.com',
    verifiedBadge: true,
    growthRateYoY: 20.0,
    architecturePattern: '特化型インテリジェンス',
    pipelineStack: 'Substack/独自会員基盤 × エグゼクティブ向け週3日レポート × ブランド幹部限定コミュニティ',
    targetPainWallet: '小売・D2Cのトレンド変化を見誤って数億円の在庫爆死や広告費溶かしをしたくないブランド役員の防衛本能',
    tags: ['リテールメディア', '年商4.5億', 'エグゼクティブ購読', '会員制インテリジェンス', 'ソロプレナー'],
    pnl: {
      monthlyRevenue: 37500000, // 年商約$3M ≒ ¥4.5億円 (月商約¥3,750万円)
      cogs: 2500000, // メール・サーバー原価
      grossProfit: 35000000,
      grossMargin: 93.3,
      operatingExpenses: {
        serverAndApi: 500000,
        advertising: 2000000,
        subcontracting: 5000000, // リサーチ補助
        toolsAndSaaS: 1000000,
        other: 4000000,
      },
      operatingProfit: 25000000, // Web Smith個人の手残り純利（月間約2,500万円、利益率66%）
      operatingMargin: 66.7,
      estimatedAnnualNetProfit: 300000000,
      financialStatus: 'ESTIMATED',
      dataSnapshotPeriod: '2023〜2024年業界推定（有料会員数約3,000〜4,000名水準）',
      sourceDoc: 'Web Smith公開ポッドキャストおよびDigidayリテール特集',
      estimationLogic: 'エグゼクティブ会員数約3,500人 × 年額平均$500 ＋ 法人一括購読・スポンサー ＝ 年商約$3M（約¥4.5億円 ➔ 月商約3,750万円）',
    },
    evidenceCards: [
      {
        id: 'ev_2pm_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】業界の「最先端のデータと力学」を抽象化し、法人の経費精算枠で高額課金するコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '一般人が読んでも理解できない高度なリテール分析を書き、ブランド幹部の会社の財布から年額数十万円を落とさせる。',
        details: [
          '【個人ではなく会社の経費を狙う】: 年額$200〜$1,000の価格設定は、個人の小遣いでは躊躇するが、法人の「情報調査・研修費」としては領収書1枚で通る絶妙なライン。',
          '【独自用語（Polymathic Media）による権威付け】: 一般のマーケティング用語を使わず、独自のフレームワークで業界を構造化して「これを知らない幹部は時代遅れ」という不安を醸成。',
          '【会員制コミュニティのサロン化】: Nike、Target、Shopifyなどの幹部が会員リストに名を連ねていること自体がステータスとなり、解約不能に。',
        ],
        codeSnippet: '// 高単価エグゼクティブメディア配管\n1. 特定の巨大産業（リテール、ロジスティクス、フィンテック）の交差点を特定\n2. 業界幹部が知るべき生々しいデータと力学を週2〜3回詳細に執筆\n3. 法人一括ライセンス（5名以上で年間$2,500）を用意し、企業の経費枠で自動引き落とし',
        sourceNote: 'Web Smith 創業インタビュー',
      },
      {
        id: 'ev_2pm_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：Mizzen+Main共同創業者時代の知見をTwitterで連投',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '高級シャツブランドMizzen+Mainの初期マーケティングを指揮した経験から、D2Cの生々しい真実をXで暴露。',
        details: [
          '2015年、自らの実践知を「2PM」というニュースレターとして週2回発信開始。',
          '「Facebook広告のCAC上昇」「ShopifyとAmazonの覇権争い」などの構造変化を数年早く予言。',
          'リテール界の有力者たちが次々と購読し、口コミだけで世界トップクラスの業界特化メディアへ成長。',
        ],
        sourceNote: 'Digiday "How 2PM Became Essential Reading for Retail Execs"',
      },
      {
        id: 'ev_2pm_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：WWDやForbesが書けない生々しい内幕',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: '大手ファッション誌は「ブランドからの広告出稿」に縛られており、ブランドのビジネスモデルの欠陥を書けない。',
        details: [
          '大手メディアは広告主である巨大ブランドに忖度し、耳触りの良いプレスリリースばかりを垂れ流す。',
          '2PMは読者直結の課金モデルであるため、特定ブランドの経営失敗や過剰広告の自爆構造を容赦なくレントゲン撮影できる。',
        ],
        sourceNote: 'Independent Niche Media Economics',
      },
      {
        id: 'ev_2pm_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：取締役会で「次のトレンドを把握していない」と叱責される役員の恐怖',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: '競合ブランドの戦略や新しい流通チャネルの台頭を見落とし、経営会議で恥をかきたくない幹部の保身。',
        details: [
          '2PMを読むことで、経営陣は「自社の戦略は時代に即しているか」を即座に点検できる。',
          '年額数百ドルは、数億円の投資判断の保険料として極めて安価に知覚される。',
        ],
        sourceNote: 'Executive Information Insurance Motives',
      },
    ],
    observationsStream: [
      {
        date: '2024-04',
        author: 'Make-Money アナリスト',
        text: 'ソロプレナー型インテリジェンスの金字塔。専属アナリスト数名を抱えつつも極限の身軽さを維持し、営業利益率65%超を毎年継続。',
      },
    ],
    temporal: {
      foundedYear: 2015,
      initialTractionPeriod: '2015〜2017年（Twitterでの鋭利なD2C考察による業界幹部の獲得）',
      dataSnapshotPeriod: '2024年（業界推計）',
      eraContext: 'D2Cブームの狂乱と、その後のCAC高騰によるビジネスモデル崩壊の過渡期',
      viabilityStatus: 'ACTIVE_PLAYBOOK',
      viabilityLabel: '現在も有効',
      currentViabilityAnalysis: 'リテールメディアやコマースの複雑化が進む中、高度な産業インテリジェンスへの法人課金需要は極めて堅牢。',
    },
  },

  // 15. Thomas Frank
  {
    id: 'ent_case06_0a749a6a8e447ce7a85d',
    ticker: 'THMS.FRNK',
    name: 'Thomas Frank',
    legalEntity: 'Thomas Frank / College Info Geek LLC',
    tagline: '290万人の登録者を誇るメインYouTubeを捨ててNotion解説に全振りし、単価$99のテンプレートとAPI教材で月商1,800万円・粗利95%を稼ぎ出すデジタル職人の頂点',
    sector: 'INFO_MEDIA',
    scale: 'SOLO',
    founder: 'Thomas Frank',
    country: 'US',
    url: 'https://thomasjfrank.com',
    verifiedBadge: true,
    growthRateYoY: 25.0,
    architecturePattern: '公式寄生デジタル職人',
    pipelineStack: 'Thomas Frank Explains（YouTube特化チャンネル） × Notion公式認定 × Gumroad/Lemon Squeezy決済 × Fly.io自作API',
    targetPainWallet: 'Notionを使いこなせずタスク管理が破綻して毎日自己嫌悪に陥る知的生産者 ＆ 自作する時間の惜しい多忙なフリーランス',
    tags: ['Notionテンプレート', '月商1800万', '粗利95%', 'YouTube特化', 'デジタル商品直販'],
    pnl: {
      monthlyRevenue: 18000000, // 月商約$120,000 ≒ ¥1,800万円 (年商約2.2億円)
      cogs: 900000, // 決済手数料（Lemon Squeezy / Stripe 約5%）
      grossProfit: 17100000,
      grossMargin: 95.0,
      operatingExpenses: {
        serverAndApi: 300000, // Fly.ioサーバー代・API費用
        advertising: 0, // 広告費完全ゼロ（すべて自前YouTube経由）
        subcontracting: 2500000, // 専属動画編集者・アシスタント
        toolsAndSaaS: 300000,
        other: 500000,
      },
      operatingProfit: 13500000, // Thomas個人の手残り純利（月間約1,350万円、利益率75%）
      operatingMargin: 75.0,
      estimatedAnnualNetProfit: 162000000,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: '2024年本人公開開示（Notion事業単体で月商$100k+安定、累計売上$2.5M突破）',
      sourceDoc: 'Thomas Frank公式ポッドキャスト・YouTube動画・Business Insider取材',
      estimationLogic: 'フラッグシップテンプレ『Ultimate Brain』（$99〜$129）月間1,000本販売 ＋ 自動化コース ＝ 月商約$120,000（約¥1,800万円）',
    },
    evidenceCards: [
      {
        id: 'ev_tf_loot_blueprint',
        type: 'LOOT_BLUEPRINT',
        title: '【略奪転用】巨大プラットフォームの「使いにくさ」を埋める完成品を作り、広告費ゼロで売り抜くコード',
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: '「白紙すぎて何から始めればいいか分からない」Notion難民に、1クリックで複製できる完全体システムを$99で売る。',
        details: [
          '【特化YouTubeチャンネルの開設】: 290万人の一般学生向けチャンネルから独立し、Notionチュートリアルだけに特化した『Thomas Frank Explains』を開設。SEO検索を総取り。',
          '【無料チュートリアルで圧倒的価値提供】: 2時間の完全マニュアル動画を無料で公開し、「動画を見ながら自分で組むか、99ドルで今すぐ完成版を手に入れるか」の究極の二者択一を迫る。',
          '【自作APIツール（Fly.io）による差別化】: 単なる見た目のテンプレートではなく、Notion APIを使ってGoogleカレンダーと双方向同期する独自ツールを開発し競合を無力化。',
        ],
        codeSnippet: '// プラットフォーム寄生型デジタルプロダクト配管\n1. 急成長しているノーコード/SaaS（Notion, Airtable, Webflow）の「初期設定の難しさ」を特定\n2. 初心者が即戦力で使えるオールインワンの完成型ワークスペースを構築\n3. YouTubeで「世界で一番わかりやすい解説動画」を投稿し、概要欄から自社テンプレへ直結',
        sourceNote: 'Thomas Frank "How I Make $100,000/Month Selling Notion Templates"',
      },
      {
        id: 'ev_tf_crime',
        type: 'THE_CRIME',
        title: '初期ゲリラ戦の客観ログ：290万登録者のプライドを捨てた特化ピボット',
        badge: '初動突破事実ログ',
        evidenceStatus: 'VERIFIED',
        punchline: '何年もかけて育てた巨大チャンネルが頭打ちになった際、Notionという単一ツールに命運を賭けて全振り。',
        details: [
          '元々は『College Info Geek』として大学生向けの勉強法を発信していたが、視聴者の年齢とともに成長が停滞。',
          'Notionに熱中し、自前で構築したGTD（Getting Things Done）タスク管理システムを公開したところ反響が爆発。',
          '初年度（2022年）だけでNotionテンプレ売上100万ドル（約1.5億円）を突破。',
        ],
        sourceNote: 'Business Insider "How a YouTuber Made $1 Million in a Year"',
      },
      {
        id: 'ev_tf_incumbent',
        type: 'INCUMBENT_DILEMMA',
        title: '大手の自爆構造：Notion公式が完璧なテンプレートを提供できない理由',
        badge: '大手の自爆構造',
        evidenceStatus: 'VERIFIED',
        punchline: 'Notion公式は「自由な白紙のキャンバス」であることが最大の売りであり、特定ワークフローを押し付けられない。',
        details: [
          '公式が特定の複雑なタスク管理手法を公式仕様にしてしまうと、「シンプルにメモを取りたいユーザー」が離脱してしまう。',
          'そのため公式は極めて簡素な基本サンプルしか出せず、プロ仕様の高度なテンプレート市場がサードパーティに丸ごと開放されていた。',
        ],
        sourceNote: 'Software Ecosystem Economics Analysis',
      },
      {
        id: 'ev_tf_pain',
        type: 'PAIN_WALLET',
        title: '人質にした痛みの財布：「自分の生産性システムを組むのに何十時間も溶かしたくない」知的労働者の時間節約',
        badge: 'サバンナOSの急所',
        evidenceStatus: 'VERIFIED',
        punchline: 'Notionの構築に週末の10時間を費やして挫折したビジネスマンの極度の徒労感。',
        details: [
          '時給5,000円〜1万円以上の知的労働者にとって、$99（約1.5万円）で数十時間の構築作業と試行錯誤をショートカットできる取引は「実質無料」に等しい。',
          '「プロが作った最強のシステムを導入した」というドーパミンにより、購入後即座に高い満足度が得られる。',
        ],
        sourceNote: 'Digital Tool Investment Psychology',
      },
    ],
    observationsStream: [
      {
        date: '2024-07',
        author: 'Make-Money アナリスト',
        text: 'テンプレート単体から、自作APIを用いた「Notion to Calendar双方向同期」などのマイクロSaaS型ツール群へ進化。デジタル商品の一回課金とSaaSの月額課金をハイブリッド化。',
      },
    ],
    temporal: {
      foundedYear: 2021,
      initialTractionPeriod: '2021〜2022年（特化YouTubeチャンネル開設とUltimate Brainローンチ）',
      dataSnapshotPeriod: '2024年（本人ポッドキャスト・公式取材）',
      eraContext: 'Notionの世界的メガヒットと、クリエイターによるデジタルグッズ販売（Gumroad）の成熟期',
      viabilityStatus: 'ACTIVE_PLAYBOOK',
      viabilityLabel: '現在も有効',
      currentViabilityAnalysis: 'Notionの機能アップデート（ボタン機能、AI、数式2.0）に合わせてテンプレートを最速アップデートすることで、後発の追随を寄せ付けない独占的地位を維持。',
    },
  },
];

console.log('Part 2 count:', part2Entities.length);

// batch-data-3.ts の末尾に part2Entities をマージ
const filePath = resolve(process.cwd(), 'scripts/batch-data-3.ts');
let content = readFileSync(filePath, 'utf8');

// 末尾の `];` を削除して part2Entities を挿入
content = content.trim().replace(/\];$/, '');
const part2Code = part2Entities.map(e => JSON.stringify(e, null, 2)).join(',\n\n');

content = `${content},\n\n${part2Code}\n];\n`;
writeFileSync(filePath, content, 'utf8');
console.log('Successfully merged part 2 into batch-data-3.ts');
