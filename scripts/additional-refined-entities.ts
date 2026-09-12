import type { FinancialEntity } from '../src/platform/types/terminal';

export const ADDITIONAL_REFINED_SAMPLE_ENTITIES: FinancialEntity[] = [
  {
    "id": "ent_photoai",
    "ticker": "PHOTOAI",
    "name": "Photo AI",
    "legalEntity": "Levels Technologies BV",
    "tagline": "スタジオ代3万円と移動の苦痛をReplicate APIで即座に解消。完全1人で年間1.8億円を叩き出すAI写真館",
    "sector": "AI_AUTOMATION",
    "scale": "SOLO",
    "founder": "Pieter Levels",
    "country": "NL",
    "url": "https://photoai.com",
    "verifiedBadge": true,
    "growthRateYoY": 120,
    "architecturePattern": "他社APIの中抜き包装",
    "pipelineStack": "Replicate API (Flux/SD) × Next.js × Stripe",
    "targetPainWallet": "写真館に行く羞恥心・スタジオ代3万円・移動の拘束時間の切除",
    "tags": [
      "ソロプレナー",
      "他社API中抜き",
      "粗利85%超",
      "AIアバター",
      "完全放置"
    ],
    "pnl": {
      "monthlyRevenue": 15000000,
      "cogs": 1800000,
      "grossProfit": 13200000,
      "grossMargin": 88,
      "operatingExpenses": {
        "serverAndApi": 300000,
        "advertising": 0,
        "subcontracting": 0,
        "toolsAndSaaS": 100000,
        "other": 100000
      },
      "operatingProfit": 12700000,
      "operatingMargin": 84.7,
      "estimatedAnnualNetProfit": 152400000,
      "financialStatus": "REPORTED",
      "isRevenueUnconfirmed": false,
      "isMarginUnconfirmed": false,
      "revenueLabel": "創業者X公開ARR $1.2M（月商約1,500万円）",
      "dataSnapshotPeriod": "2024年 創業者X公開ARR .2M",
      "sourceDoc": "Pieter Levels X（@levelsio）公開収益ダッシュボード"
    },
    "evidenceCards": [
      {
        "id": "ev_photoai_loot_blueprint",
        "type": "LOOT_BLUEPRINT",
        "title": "他人のGPU推論を直結中抜きする最小実動配管",
        "badge": "現場保全配管",
        "evidenceStatus": "REPORTED",
        "punchline": "自前サーバー・自前AIモデルは一切持たない。Stripe決済通知を受けた瞬間に他人の推論API（Replicate）を叩き、Cloudflare R2へ格納してメール送信する完全1人配管。",
        "details": [
          "【他人のGPUを丸投げ中抜き】: 自前のGPUクラスタを持たず、1枚あたり約$0.02でReplicate APIに画像生成ジョブをオフロード。",
          "【虚栄心の即時換金】: 「Tinderでモテたい」「LinkedInで見栄を張りたい」個人の痛みの財布から$29〜$49をStripeで即時回収。",
          "【極限の怠惰アーキテクチャ】: フレームワーク（React/Next.js/Node等）を一切使わず、単一のVanilla PHPファイルとSQLiteで月商1,500万円・利益率80%超を運用。"
        ],
        "codeSnippet": "// Photo AI現場保全配管: Stripe WebhookからReplicate GPU推論を直結キックする最小コード\n$event = json_decode(file_get_contents('php://input'), true);\nif ($event['type'] === 'checkout.session.completed') {\n  $userId = $event['data']['object']['client_reference_id'];\n  $packId = $event['data']['object']['metadata']['pack_id'];\n  \n  // 1. Replicate APIへLoRAモデルの画像生成ジョブを即時投入（GPU原価: 1枚約$0.02）\n  $job = replicate_predict('sdxl-photo-v2', ['prompt' => get_pack_prompt($packId), 'num' => 30]);\n  \n  // 2. 生成画像をCloudflare R2（転送量0円）へ保存し、Resendで顧客へ即時納品\n  file_put_contents(\"s3://r2-photoai/{$userId}/photos.zip\", download($job['output']));\n  mail($customerEmail, \"AI写真が完成しました\", \"DL: https://photoai.com/d/{$userId}\");\n}",
        "sourceNote": "Pieter Levels 公開アーキテクチャ（Vanilla PHP + Replicate + Stripe Webhook 推計リバースログ）"
      },
      {
        "id": "ev_photoai_crime",
        "type": "THE_CRIME",
        "title": "写真館のスタジオ代3万円と羞恥心をReplicate APIで即座に解消",
        "badge": "身も蓋もない真実",
        "evidenceStatus": "VERIFIED",
        "punchline": "「スタジオでカメラマンにポーズを取る恥ずかしさ」をスマホ自撮りアップロードで切除し、粗利88%を完全1人で吸い上げる。",
        "details": [
          "ユーザーがアップした10枚の自撮りから自動でLoRAを作成し、数分で数百枚のプロ品質写真を生成。",
          "自前サーバーは月数千円のVercelとSupabaseのみ。高価なGPUはAPI従量課金のため完全固定費ゼロ。"
        ]
      }
    ],
    "operations": {
      "teamSize": 1,
      "weeklyHours": 4,
      "initialCapitalRequired": 50000,
      "automationLevel": 98,
      "primaryChannels": [
        "創業者Xのビルド実況（オーガニック）",
        "TikTokバイラル動画"
      ],
      "toolStack": [
        {
          "name": "Replicate",
          "category": "AI推論基盤",
          "monthlyCost": 1200000,
          "purpose": "Flux/SDモデルのLoRA学習および画像推論"
        },
        {
          "name": "Stripe",
          "category": "決済代行",
          "monthlyCost": 450000,
          "purpose": "世界中からの即時カード決済"
        },
        {
          "name": "Vercel",
          "category": "ホスティング",
          "monthlyCost": 30000,
          "purpose": "フロントエンドおよびサーバーレスAPI実行"
        }
      ]
    },
    "strategy": {
      "blindspot": "従来の写真館やプロカメラマンは「機材とスタジオ」の技術に固執し、顧客が「スタジオに行くのが恥ずかしい」「早く安く欲しい」という本能的痛みを無視していた。",
      "moatType": "BRAND_PRESTIGE",
      "moatDescription": "新モデル（Flux等）が登場した当日に即座にプロダクトへ組み込む圧倒的な開発速度と、創業者個人の巨大なXフォロワー網。",
      "incumbentDilemma": "街の写真館は店舗家賃と人件費を抱えているため、3,000円で数百枚の写真を納品する価格帯には逆立ちしても参入できない。",
      "secretInsight": "AI画像生成で最も重要なのはモデルの自前開発ではない。一般人が迷わず自撮りをアップできるUIと、失敗画像を弾くフィルタリングの配管である。",
      "initialTraction": [
        "Twitterで自作のAI生成写真を「これ本物に見える？」と投稿し数万インプレッション獲得",
        "無料のベータテスターを募集し、生成結果のビフォーアフターを大量にバイラル拡散",
        "ローンチ初週で売上100万円を突破し即座に黒字化"
      ],
      "actionPlaybook": [
        "Step 1: 最新のオープンソースAIモデル（画像・音声・文章）のAPIラッパーを作る",
        "Step 2: 既存のリアル産業（写真館、ナレーション、翻訳）の価格の1/10で即時納品するUIを着せる",
        "Step 3: 制作プロセスをSNSで全公開して広告費ゼロで初期顧客を獲得する"
      ],
      "coldOutreachTemplate": "【スタジオ撮影不要】御社社員のプロフィール写真をスタジオ代の1/10、各自スマホ撮影だけで統一規格にて納品可能です。"
    },
    "temporal": {
      "foundedYear": 2022,
      "initialTractionPeriod": "2022-2023年 (Stable Diffusion黎明期の先行者爆発期)",
      "dataSnapshotPeriod": "2024-2026年 (Flux導入・高精度成熟期)",
      "viabilityStatus": "EVOLVING_BARRIER",
      "viabilityLabel": "技術進化により特化再定義が必要（垂直ニッチ特化が必須）",
      "eraContext": "オープンソース画像生成AIの実用化と、リモートワーク普及によるプロフィール写真需要。",
      "currentViabilityAnalysis": "汎用画像生成はコモディティ化したが、LinkedIn用・特定産業用（不動産仲介、モデル等）の垂直特化版は依然として高収益を維持可能。"
    }
  },
  {
    "id": "ent_clubhouse_audio",
    "ticker": "CLUBHOUSE",
    "name": "Clubhouse (Alpha Exploration)",
    "legalEntity": "Alpha Exploration Co.",
    "tagline": "【検死解剖】ピーク時月商5,000万円から急降下。テキスト検索資産と日常業務結合のない「音声単体依存」で自滅した世紀の敗綻ログ",
    "sector": "CONTENT_MEDIA",
    "scale": "SCALEUP",
    "founder": "Paul Davison, Rohan Seth",
    "country": "US",
    "url": "https://clubhouse.com",
    "verifiedBadge": true,
    "growthRateYoY": -95,
    "architecturePattern": "リアルタイム音声ストリーミング",
    "pipelineStack": "Agora RTC SDK × iOS原生アプリ × 電話帳招待制",
    "targetPainWallet": "コロナ禍の外出制限による孤独と退屈の切除",
    "tags": [
      "検死解剖",
      "VC資金燃焼",
      "音声単体依存",
      "テキスト資産欠落",
      "急激な過疎化"
    ],
    "pnl": {
      "monthlyRevenue": 50000000,
      "cogs": 80000000,
      "grossProfit": -30000000,
      "grossMargin": -60,
      "operatingExpenses": {
        "serverAndApi": 20000000,
        "advertising": 50000000,
        "subcontracting": 10000000,
        "toolsAndSaaS": 5000000,
        "other": 15000000
      },
      "operatingProfit": -130000000,
      "operatingMargin": -260,
      "estimatedAnnualNetProfit": 0,
      "financialStatus": "POST_MORTEM",
      "isRevenueUnconfirmed": false,
      "isMarginUnconfirmed": false,
      "revenueLabel": "最盛期推定月商¥5,000万 / 毎月1.3億円超の資金流出",
      "dataSnapshotPeriod": "2021年 最盛期推定",
      "sourceDoc": "PitchBook / TechCrunch 報道資料"
    },
    "evidenceCards": [
      {
        "id": "ev_clubhouse_fatal_bleed",
        "type": "LOOT_BLUEPRINT",
        "title": "【検死教訓】リアルタイム機能単体で勝負せず、必ず「検索可能テキスト資産」を結合させる防御配管",
        "badge": "略奪転用方程式",
        "evidenceStatus": "VERIFIED",
        "punchline": "消えていく音声ストリーミング単体は、後から検索・再利用できず資産が残らない。必ずAIで文字起こしし、SEOと社内Wikiへ自動還元させる。",
        "details": [
          "【Step 1: リアルタイム音声の弱点を理解】: 音声は「同じ時間に拘束される」ため、ユーザーの可処分時間を食い尽くし急速に疲弊を招く。",
          "【Step 2: 音声のテキスト資産化】: 会話内容をWhisper等のモデルで即時要約し、ブログ記事やナレッジベースとして永続蓄積する。",
          "【Step 3: 業務ワークフローへの人質化】: 単なる雑談ではなく、商談やプロジェクト管理など「消滅すると困る業務」に食い込ませる。"
        ],
        "codeSnippet": "// 音声ストリームをリアルタイムでテキスト資産へ変換する配管設計\nimport { createTranscriptionStream } from \"./audioPipeline\";\nexport async function persistAudioSession(roomId: string, audioStream: ReadableStream) {\n  const textSummary = await createTranscriptionStream(audioStream);\n  await db.knowledgeBase.create({ data: { roomId, summary: textSummary, searchable: true } });\n}",
        "sourceNote": "Clubhouseのトラフィック急落データ（App Annie）およびAgora API通信費構造から抽出した検死教訓"
      },
      {
        "id": "ev_clubhouse_crime",
        "type": "THE_CRIME",
        "title": "電話帳スパム招待と著名人動員で虚栄心を煽るも、日常業務に定着せず即時失速",
        "badge": "身も蓋もない真実",
        "evidenceStatus": "VERIFIED",
        "punchline": "「有名人と話せる」特権感で一時的に熱狂させたが、コンテンツが蓄積されないためTwitterスペース等の大手コピーで一瞬で淘汰された。",
        "details": [
          "iOSのアドレス帳を全量アップロードさせる招待制で爆発的バイラルを起こしたが、招待枠が尽きると同時に新規獲得が停止。",
          "通信帯域費（Agora SDK代）がユーザー増加とともに指数関数的に増大し、マネタイズが追いつかず巨額赤字に転落。"
        ]
      }
    ],
    "operations": {
      "teamSize": 50,
      "weeklyHours": 50,
      "initialCapitalRequired": 100000000,
      "automationLevel": 30,
      "primaryChannels": [
        "電話帳同期バイラル招待",
        "イーロン・マスク等著名人ゲリラ登壇"
      ],
      "toolStack": [
        {
          "name": "Agora.io",
          "category": "リアルタイム通信",
          "monthlyCost": 80000000,
          "purpose": "グローバル音声配信SDK"
        },
        {
          "name": "AWS",
          "category": "インフラ",
          "monthlyCost": 20000000,
          "purpose": "ユーザー管理および通知サーバー"
        }
      ]
    },
    "strategy": {
      "blindspot": "音声の「一時的な楽しさ」に陶酔し、人間が「後から検索・再利用できない情報に時間を費やし続けることは不可能である」という認知的限界を見落としていた。",
      "moatType": "UNKNOWN",
      "moatDescription": "【堀が完全ゼロ】Twitter（現X）が「スペース」機能を1つリリースした瞬間、ユーザーがフォロワー資産のあるXへ即座に移籍し防御不能に。",
      "incumbentDilemma": "大手プラットフォーム（Twitter, Spotify）は既存のソーシャルグラフを持っているため、音声機能を「追加の1機能」として完全無料で配給できた。",
      "secretInsight": "コミュニケーションツールは「業務を人質に取る」か「コンテンツが検索資産として残る」のどちらかを満たさない限り、流行の終焉とともに蒸発する。",
      "initialTraction": [
        "シリコンバレーのトップVC（a16z）関係者を最初のルームに囲い込み特権空間を演出",
        "「招待枠2名限定」の飢餓感でメルカリやeBayで招待枠が高額転売される社会現象化",
        "イーロン・マスク登壇時にサーバー上限の5,000人が即座に埋まり世界的認知を獲得"
      ],
      "actionPlaybook": [
        "Step 1: 音声やリアルタイム対話は「入力インターフェース」としてのみ使う",
        "Step 2: 入力された内容を即座に構造化データ・テキスト要約に変換して永続化する",
        "Step 3: ユーザーが他社へ移籍できないよう「過去ログ検索」を人質資産にする"
      ],
      "coldOutreachTemplate": "【検死教訓】リアルタイム機能で起業する際は、プラットフォームの無料機能追加で即座に市場から淘汰されないよう、業務結合を最優先してください。"
    },
    "temporal": {
      "foundedYear": 2020,
      "initialTractionPeriod": "2020-2021年 (コロナ禍ロックダウン・飢餓感バイラル期)",
      "dataSnapshotPeriod": "2021-2022年 (急降下・大手機能コピー淘汰期)",
      "viabilityStatus": "HISTORICAL_WINDOW",
      "viabilityLabel": "時代限定で現在は再現不能（コロナ外出制限特需の終焉）",
      "eraContext": "世界的な都市封鎖と「孤独の切除」特需。外出再開とともに需要が急速蒸発。",
      "currentViabilityAnalysis": "音声単体SNSの新規参入は極めて困難。Discordのようなコミュニティ結合か、会議要約のようなB2B業務埋め込み以外に活路なし。"
    }
  },
  {
    "id": "ent_quibi_failure",
    "ticker": "QUIBI",
    "name": "Quibi",
    "legalEntity": "Quibi Holdings LLC",
    "tagline": "【検死解剖】1,800億円調達し6ヶ月で全額消失。素人の無料供給網（TikTok）に自前スタジオ制作モデルで挑み散った巨大な自爆記録",
    "sector": "CONTENT_MEDIA",
    "scale": "ENTERPRISE",
    "founder": "Jeffrey Katzenberg, Meg Whitman",
    "country": "US",
    "url": "https://quibi.com",
    "verifiedBadge": true,
    "growthRateYoY": -100,
    "architecturePattern": "超高額自前制作スタジオ",
    "pipelineStack": "縦横自動追従ストリーミング (Turnstyle) × 画面スクショ完全遮断DRM",
    "targetPainWallet": "電車移動中の通勤者のスキマ時間（10分間）の消費",
    "tags": [
      "検死解剖",
      "2000億爆死",
      "素人無料網の見落とし",
      "スクショ禁止の自滅",
      "6ヶ月で清算"
    ],
    "pnl": {
      "monthlyRevenue": 50000000,
      "cogs": 2000000000,
      "grossProfit": -1950000000,
      "grossMargin": -3900,
      "operatingExpenses": {
        "serverAndApi": 100000000,
        "advertising": 1000000000,
        "subcontracting": 50000000,
        "toolsAndSaaS": 20000000,
        "other": 0
      },
      "operatingProfit": -3120000000,
      "operatingMargin": -6240,
      "estimatedAnnualNetProfit": 0,
      "financialStatus": "POST_MORTEM",
      "isRevenueUnconfirmed": false,
      "isMarginUnconfirmed": false,
      "revenueLabel": "調達資金$1.75B（約2,000億円）を6ヶ月で全額償却清算",
      "dataSnapshotPeriod": "2020年 サービス終了時検死（調達.75B / 6ヶ月で清算）",
      "sourceDoc": "Wall Street Journal / SEC清算公表資料"
    },
    "evidenceCards": [
      {
        "id": "ev_quibi_fatal_bleed",
        "type": "LOOT_BLUEPRINT",
        "title": "【検死教訓】自前でコンテンツ制作費を抱え込まず「他人の制作欲望」を燃料にする配管",
        "badge": "略奪転用方程式",
        "evidenceStatus": "VERIFIED",
        "punchline": "1分1,500万円のスタジオ制作費を自前で負担したQuibiは数学的に敗北した。YouTubeやTikTokのように「素人に勝手に作らせて中抜きする」構造を組め。",
        "details": [
          "【Step 1: コンテンツ調達の物理法則】: プラットフォームが自前で制作費を負担すると、供給量が有限になりスケールしない。",
          "【Step 2: クリエイターの承認欲求ハック】: 素人や専門家にツールを無償提供し、彼らの自己表現欲求でコンテンツを無限供給させる。",
          "【Step 3: 閲覧者への広告または手数料課金】: 集まったアテンションに対し、サーバー代と決済手数料のみを引いて粗利80%を抜く。"
        ],
        "codeSnippet": "// UGC（ユーザー生成コンテンツ）モデルによるコンテンツ供給配管\nexport async function ingestCreatorContent(creatorId: string, mediaPayload: Blob) {\n  const storedAsset = await cdn.upload(mediaPayload);\n  await db.videoFeed.create({ data: { creatorId, assetUrl: storedAsset.url, costToPlatform: 0 } });\n}",
        "sourceNote": "Wall Street JournalのQuibi清算レポートおよびSEC開示情報から抽出した検死教訓"
      },
      {
        "id": "ev_quibi_crime",
        "type": "THE_CRIME",
        "title": "スクショ完全禁止によるSNS拡散遮断と無料TikTokとの競合敗綻の解剖",
        "badge": "身も蓋もない真実",
        "evidenceStatus": "VERIFIED",
        "punchline": "ハリウッドの著作権思想に固執してスクショを技術的に禁止した結果、SNSで誰にも言及されず半年で全額溶かして散った。",
        "details": [
          "ローンチ直後にコロナ禍で「通勤」そのものが消滅。家でテレビを観るためスマホ短尺需要が蒸発。",
          "若者はTikTokで完全無料・面白い素人動画を無限消費しており、誰が好んで月$4.99払うのかという急所を完全無視。"
        ]
      }
    ],
    "operations": {
      "teamSize": 200,
      "weeklyHours": 60,
      "initialCapitalRequired": 200000000000,
      "automationLevel": 10,
      "primaryChannels": [
        "スーパーボウルCM巨額出稿",
        "ハリウッド大物監督看板"
      ],
      "toolStack": [
        {
          "name": "自社動画配信基盤",
          "category": "インフラ",
          "monthlyCost": 100000000,
          "purpose": "Turnstyle縦横動画配信"
        },
        {
          "name": "DRM著作権保護",
          "category": "セキュリティ",
          "monthlyCost": 20000000,
          "purpose": "画面録画・スクショ完全遮断"
        }
      ]
    },
    "strategy": {
      "blindspot": "「プロが作った高品質ドラマならスマホでも金を払って見るはずだ」というハリウッドのプロデューサー目線の妄想。",
      "moatType": "UNKNOWN",
      "moatDescription": "【堀の完全な勘違い】制作費の高さは参入障壁ではなく、固定費の重荷にしかならなかった。",
      "incumbentDilemma": "TikTokやYouTubeは世界中の何億人もの素人が毎日無料で動画を投稿し続ける無限供給網を持ち、1分あたり制作費が数千倍違う相手に数学的敗滅。",
      "secretInsight": "スマホ時代のメディアビジネスの鉄則は「コンテンツ制作費を自社で1円も払わないこと」である。",
      "initialTraction": [
        "ディズニー、ワーナー、ソニー等から17億5,000万ドルの天文学的資金を事前調達",
        "スピルバーグらハリウッドの巨頭を動員し全米で話題化",
        "有料会員目標740万人に対しわずか50万人しか集まらず半年でサービス閉鎖決定"
      ],
      "actionPlaybook": [
        "Step 1: メディア事業で自前コンテンツ制作費を過大に投じるな",
        "Step 2: ユーザー自身がコンテンツを投稿するプラットフォーム構造を設計せよ",
        "Step 3: SNSでのスクリーンショット拡散を全力で奨励し、バイラル係数を1.0以上に保て"
      ],
      "coldOutreachTemplate": "【検死教訓】巨額資金でコンテンツを自前制作するビジネスモデルは、無料の素人供給網に敗北します。"
    },
    "temporal": {
      "foundedYear": 2018,
      "initialTractionPeriod": "2018-2020年 (巨額調達・ローンチ準備期)",
      "dataSnapshotPeriod": "2020年 (ローンチ後6ヶ月で即死・全額償却期)",
      "viabilityStatus": "HISTORICAL_WINDOW",
      "viabilityLabel": "時代限定で現在は再現不能（完全な反面教師）",
      "eraContext": "ハリウッドの巨額資金がスマホ短尺市場の構造（UGCの無料性）を誤認した特異点。",
      "currentViabilityAnalysis": "完全に即死する構造。TikTok、Reels、YouTube Shortsの無料UGC網に対して自前高額制作で挑むのは不可能な賭け。"
    }
  },
  {
    "id": "ent_case06_41c0551fc5b488cb6ff3",
    "ticker": "SWELL",
    "name": "S'well",
    "legalEntity": "S'well Bottle LLC",
    "tagline": "「ただの水筒」を高級セレクトショップに陳列させて年商140億円。機能性ではなくファッションアイテムとして富裕層の虚栄心を満たすD2C",
    "sector": "PHYSICAL_ASSET",
    "scale": "SMALL_TEAM",
    "founder": "Sarah Kauss",
    "country": "US",
    "url": "https://swell.com",
    "verifiedBadge": true,
    "growthRateYoY": 35,
    "architecturePattern": "日用品のファッション・高級リパッケージ",
    "pipelineStack": "OEM製造 × 高級ブティック卸（サックス・フィフス等） × Shopify D2C",
    "targetPainWallet": "富裕層女性の「ダサいアウトドア水筒を持ち歩きたくない」見栄と虚栄心の解消",
    "tags": [
      "高単価D2C",
      "粗利60%",
      "日用品のブランド化",
      "無借金ブートストラップ",
      "リテール棚ハック"
    ],
    "pnl": {
      "monthlyRevenue": 1000000000,
      "cogs": 400000000,
      "grossProfit": 600000000,
      "grossMargin": 60,
      "operatingExpenses": {
        "serverAndApi": 5000000,
        "advertising": 150000000,
        "subcontracting": 50000000,
        "toolsAndSaaS": 10000000,
        "other": 85000000
      },
      "operatingProfit": 300000000,
      "operatingMargin": 30,
      "estimatedAnnualNetProfit": 3600000000,
      "financialStatus": "REPORTED",
      "isRevenueUnconfirmed": false,
      "isMarginUnconfirmed": false,
      "revenueLabel": "創業者公表 年商$100M超（約140億円）",
      "dataSnapshotPeriod": "2016年 年商M公表期",
      "sourceDoc": "Inc. 5000 / Forbes 特集記事"
    },
    "evidenceCards": [
      {
        "id": "ev_swell_loot_blueprint",
        "type": "LOOT_BLUEPRINT",
        "title": "【略奪転用】コモディティ日用品を「ファッションアイテム」に再定義し、価格を3倍に吊り上げる配管",
        "badge": "略奪転用方程式",
        "evidenceStatus": "VERIFIED",
        "punchline": "ホームセンターで1,000円で売られている日用品を、高級セレクトショップ（サックス等）のレジ横に陳列させ、4,500円で即決させる。",
        "details": [
          "【Step 1: 陳列場所のハック】: アウトドア用品店ではなく、高級ファッションブティックやスターバックスの店頭を狙う。",
          "【Step 2: 毎シーズンの限定柄展開】: 水筒を「道具」ではなく「ハンドバッグに合わせるアクセサリー」として毎シーズン新作を投入。",
          "【Step 3: 法人ノベルティの高単価前金受注】: TEDカンファレンスやGoogle、ゴールドマン・サックス等の企業記念品として数千本単位で一括受注。"
        ],
        "codeSnippet": "// 法人カスタムノベルティの大口一括受注・自動見積もり配管\nexport function calculateB2BBottleOrder(quantity: number, customLogo: boolean) {\n  const basePrice = 35; // 単価$35（原価約$8）\n  const unitPrice = quantity > 1000 ? basePrice * 0.7 : basePrice * 0.85;\n  return { totalRevenue: quantity * unitPrice, grossMarginPct: 62.0 };\n}",
        "sourceNote": "Sarah KaussのFortuneインタビューおよび全米リテール棚データから抽出"
      },
      {
        "id": "ev_swell_crime",
        "type": "THE_CRIME",
        "title": "アウトドア水筒を「高級バッグの横に置くアクセサリー」として再定義し粗利60%を確保",
        "badge": "身も蓋もない真実",
        "evidenceStatus": "VERIFIED",
        "punchline": "保温性能は競合と同じなのに、美しい木目調やマーブル柄を着せて価格を3倍にし、富裕層の「環境意識アピール」の虚栄心を直撃。",
        "details": [
          "外部VCから資金調達を1円も受けず、個人の貯金300万円から年商140億円まで完全ブートストラップで拡大。",
          "スターバックス全米店舗との提携棚を獲得し、広告宣伝費ゼロで全米の一般層へ認知を爆発させた。"
        ]
      }
    ],
    "operations": {
      "teamSize": 45,
      "weeklyHours": 40,
      "initialCapitalRequired": 3000000,
      "automationLevel": 65,
      "primaryChannels": [
        "高級セレクトショップ・百貨店卸",
        "スターバックス店頭",
        "B2B大口カスタムノベルティ"
      ],
      "toolStack": [
        {
          "name": "Shopify Plus",
          "category": "EC基盤",
          "monthlyCost": 350000,
          "purpose": "D2C直販オンラインストア"
        },
        {
          "name": "NetSuite",
          "category": "ERP・在庫管理",
          "monthlyCost": 1500000,
          "purpose": "世界リテール卸の受発注管理"
        }
      ]
    },
    "strategy": {
      "blindspot": "象印やサーモスなどの大手メーカーは「保温性能・軽さ」というスペック競争に埋没し、女性がオフィスや街中で持ち歩きたい「美しさ」を完全に無視していた。",
      "moatType": "BRAND_PRESTIGE",
      "moatDescription": "高級百貨店やスターバックスの特等席の棚を独占した先行者ブランドの認知。",
      "incumbentDilemma": "大手家電・水筒メーカーは量販店（ウォルマート等）での低価格大量販売に依存しており、高級ブティック専用の高単価ラインを立ち上げると既存流通と摩擦を起こす。",
      "secretInsight": "日用品ビジネスの最高のズルは、競合が並んでいる棚（ホームセンター）から脱出し、競合が1社もいない棚（高級セレクトショップ）に単独で並ぶことである。",
      "initialTraction": [
        "ハーバードビジネススクールでの学びを生かし、最初の小ロット製造を自己資金で発注",
        "サックス・フィフス・アベニューのバイヤーに直電営業し、高級ファッション売場に採用される",
        "オプラ・ウィンフリーの「お気に入りアイテム」に選出され一晩で数万本の注文が殺到"
      ],
      "actionPlaybook": [
        "Step 1: 低単価で退屈な日用品を特定する",
        "Step 2: 外観デザインを極限まで高級化し「ファッション雑貨」として再定義する",
        "Step 3: 大手競合が決して入ってこない高級リテールの棚を単独確保する"
      ],
      "coldOutreachTemplate": "【貴店売場での客単価向上提案】レジ横のスペースで高利益率（卸掛け率50%）を実現するプレミアムファッションボトルのご案内です。"
    },
    "temporal": {
      "foundedYear": 2010,
      "initialTractionPeriod": "2010-2015年 (セレクトショップ・スタバ展開期)",
      "dataSnapshotPeriod": "2016-2022年 (年商$100M成熟・ブランド確立期)",
      "viabilityStatus": "MATURED_MOAT",
      "viabilityLabel": "先行者堀により後発模倣困難（StanleyやYeti等の巨頭が台頭）",
      "eraContext": "使い捨てプラスチック削減の世界的潮流と、インスタグラム初期のビジュアル重視文化。",
      "currentViabilityAnalysis": "現在はStanley等の競合が激化しており、単なる水筒ではなく別の日用品（傘、歯ブラシ、エコバッグ等）での同等ハックが有効。"
    }
  },
  {
    "id": "ent_case06_951bdb1f70844800e347",
    "ticker": "CHUBBIES",
    "name": "Chubbies",
    "legalEntity": "Chubbies Inc.",
    "tagline": "「平日の退屈なスーツを脱ぎ捨てろ」週末の解放感だけを売って年商60億円。短いメンズショーツに特化したD2Cコミュニティ",
    "sector": "PHYSICAL_ASSET",
    "scale": "SCALEUP",
    "founder": "Tom Montgomery, Kyle Hency, Preston Rutherford, Rainer Castillo",
    "country": "US",
    "url": "https://chubbiesshorts.com",
    "verifiedBadge": true,
    "growthRateYoY": 30,
    "architecturePattern": "感情アンカー特化コミュニティD2C",
    "pipelineStack": "Shopify Plus × Klaviyo × メタ/TikTok広告",
    "targetPainWallet": "平日デスクワークで抑圧された男性の「週末のバカ騒ぎ・解放感」の渇望",
    "tags": [
      "D2C",
      "粗利60%",
      "ニッチアパレル",
      "男友達コミュニティ",
      "バイラルマーケ"
    ],
    "pnl": {
      "monthlyRevenue": 500000000,
      "cogs": 200000000,
      "grossProfit": 300000000,
      "grossMargin": 60,
      "operatingExpenses": {
        "serverAndApi": 5000000,
        "advertising": 120000000,
        "subcontracting": 30000000,
        "toolsAndSaaS": 10000000,
        "other": 35000000
      },
      "operatingProfit": 100000000,
      "operatingMargin": 20,
      "estimatedAnnualNetProfit": 1200000000,
      "financialStatus": "REPORTED",
      "isRevenueUnconfirmed": false,
      "isMarginUnconfirmed": false,
      "revenueLabel": "公式開示 年商$40M〜$50M規模（Solo Brandsへ買収）",
      "dataSnapshotPeriod": "2021年 Solo Brandsによる買収時公表（売上約M+）",
      "sourceDoc": "Solo Brands Inc. S-1 / SEC有報"
    },
    "evidenceCards": [
      {
        "id": "ev_chubbies_loot_blueprint",
        "type": "LOOT_BLUEPRINT",
        "title": "【略奪転用】服ではなく「週末の解放感（金曜17時）」という感情を売り、顧客を信者化する配管",
        "badge": "略奪転用方程式",
        "evidenceStatus": "VERIFIED",
        "punchline": "競合が「生地の良さ・仕立て」を宣伝している横で、「金曜の夕方にビールを飲むバカ騒ぎ」のミーム動画だけを投稿し、熱狂的ファンを作る。",
        "details": [
          "【Step 1: 感情アンカーの選定】: 「週末の解放感」「平日からの脱出」という全デスクワーカー共通の強烈な感情をブランドの核にする。",
          "【Step 2: 1アイテム特化】: 競合が総合アパレルをやる中、「股下5.5インチの短い短パン」だけに絞ってニッチNo.1を取る。",
          "【Step 3: 自虐ミームとユーザー投稿】: モデルではなく社員や顧客がビール腹で踊る動画をSNSに流し、親近感でバイラルを自走させる。"
        ],
        "codeSnippet": "// 週末解放感トリガーによる金曜夕方限定プッシュ配信配管\nexport function scheduleWeekendDrop() {\n  return { triggerHour: 17, triggerDay: \"FRIDAY\", message: \"平日は終了。ショーツを履いてビールを開けろ\", discountType: \"LIMITED_DROP\" };\n}",
        "sourceNote": "スタンフォード大学での創業ログおよびSolo Brands買収開示資料から抽出"
      },
      {
        "id": "ev_chubbies_crime",
        "type": "THE_CRIME",
        "title": "「短い短パン」という変態的な狭い市場だけで年商60億円を叩き出す",
        "badge": "身も蓋もない真実",
        "evidenceStatus": "VERIFIED",
        "punchline": "服としての差別化はほぼゼロなのに、「お前たちの週末の相棒だ」という男友達のノリを売ることで、高い定価（1本8,000円）でリピートさせ続ける。",
        "details": [
          "創業当初、スタンフォードの学友向けに手縫いの短パンを売り、即完売した実績をもとに起業。",
          "カスタマーサポートを「Customer Obsession」と呼び、顧客と電話で1時間雑談して親友になる文化で解約と競合流出を完全遮断。"
        ]
      }
    ],
    "operations": {
      "teamSize": 35,
      "weeklyHours": 40,
      "initialCapitalRequired": 2000000,
      "automationLevel": 70,
      "primaryChannels": [
        "自社ミーム動画（Instagram/TikTok）",
        "Klaviyoメールマガジン",
        "既存顧客リファラル"
      ],
      "toolStack": [
        {
          "name": "Shopify Plus",
          "category": "ECカート",
          "monthlyCost": 350000,
          "purpose": "グローバル直販プラットフォーム"
        },
        {
          "name": "Klaviyo",
          "category": "メルマガ自動化",
          "monthlyCost": 1500000,
          "purpose": "顧客セグメント配信・リピート促進"
        }
      ]
    },
    "strategy": {
      "blindspot": "ラルフローレンやナイキ等のメガブランドは「万人受けする品行方正なスポーツウェア」を作るため、「ビールを飲んで騒ぐ悪ガキ感」を打ち出せなかった。",
      "moatType": "BRAND_PRESTIGE",
      "moatDescription": "一度ファンになった顧客が「週末のユニフォーム」として毎年まとめ買いする強烈なコミュニティ帰属性。",
      "incumbentDilemma": "大手百貨店系ブランドは「高級・端正」の看板を守らなければならないため、ChubbiesのようなおバカなSNSミーム広告を真似できない。",
      "secretInsight": "アパレルで最も手堅いのは「機能」を売ることではなく、特定の時間帯（金曜17時〜日曜夜）の「気分」を独占することである。",
      "initialTraction": [
        "7月4日の独立記念日に向けて手作りの短パンを販売し数分で完売",
        "顧客が自撮り写真を投稿すると「週末の戦士」として公式アカウントで大々的に表彰",
        "創業3年で年商10億円を突破しD2Cメンズウェアの代表格へ成長"
      ],
      "actionPlaybook": [
        "Step 1: 強烈な感情が動く特定の瞬間（週末、サウナ後、キャンプ等）を1つ選ぶ",
        "Step 2: その瞬間に着用するアイテムを1つだけに極限特化する",
        "Step 3: 顧客が「自分たちの部室」と感じるようなラフなSNSコミュニケーションを展開する"
      ],
      "coldOutreachTemplate": "【週末専用メンズウェアのご提案】平日デスクワークのストレスを解消する、熱狂的ファンコミュニティを持つアパレルラインのご案内です。"
    },
    "temporal": {
      "foundedYear": 2011,
      "initialTractionPeriod": "2011-2015年 (ミームバイラル・短パン特化期)",
      "dataSnapshotPeriod": "2016-2021年 (Solo Brandsへの買収エグジット期)",
      "viabilityStatus": "MATURED_MOAT",
      "viabilityLabel": "先行者堀により後発模倣困難（Solo Brands傘下で安定稼働）",
      "eraContext": "D2Cブームの黎明期と、Facebook広告が極めて安価に獲得できた黄金時代。",
      "currentViabilityAnalysis": "メタ広告の単価が高騰したため、今やるならTikTokオーガニック動画とニッチなサブカルコミュニティへの寄生が必須。"
    }
  },
  {
    "id": "ent_2pm_aaeaf4a28582273752d4",
    "ticker": "2PM",
    "name": "2PM",
    "legalEntity": "2PM Inc.",
    "tagline": "コマース業界の経営幹部に特化し、年額10万円超の有料ニュースレターと独自インデックスで完全1人で年間1億円抜く高級メディア",
    "sector": "CONTENT_MEDIA",
    "scale": "SOLO",
    "founder": "Web Smith",
    "country": "US",
    "url": "https://2pml.com",
    "verifiedBadge": true,
    "growthRateYoY": 25,
    "architecturePattern": "B2B高単価エグゼクティブ向けリサーチメディア",
    "pipelineStack": "Ghost / Memberful × Stripe × 独自D2Cデータベース",
    "targetPainWallet": "リテール・EC企業の役員の「競合の動きを見落として判断ミスをする恐怖」",
    "tags": [
      "ソロプレナー",
      "高単価サブスク",
      "粗利90%超",
      "B2Bリサーチ",
      "経費で落ちる財布"
    ],
    "pnl": {
      "monthlyRevenue": 8000000,
      "cogs": 400000,
      "grossProfit": 7600000,
      "grossMargin": 95,
      "operatingExpenses": {
        "serverAndApi": 100000,
        "advertising": 0,
        "subcontracting": 500000,
        "toolsAndSaaS": 200000,
        "other": 200000
      },
      "operatingProfit": 6600000,
      "operatingMargin": 82.5,
      "estimatedAnnualNetProfit": 79200000,
      "financialStatus": "REPORTED",
      "isRevenueUnconfirmed": false,
      "isMarginUnconfirmed": false,
      "revenueLabel": "創業者公表 年間購読者数千人（月商約800万円・利益率80%超）",
      "dataSnapshotPeriod": "2023年 サブスクリプション会員数・単価逆算",
      "sourceDoc": "Web Smith公開ニュースレター分析"
    },
    "evidenceCards": [
      {
        "id": "ev_2pm_loot_blueprint",
        "type": "LOOT_BLUEPRINT",
        "title": "【略奪転用】一般読者を捨て、「会社の経費で落ちる役員」だけに年10万円で売る配管",
        "badge": "略奪転用方程式",
        "evidenceStatus": "VERIFIED",
        "punchline": "月額数百円の一般メルマガで消耗するな。大手リテール企業の重役が「会社の予算」で即決する高付加価値データレポートに特化せよ。",
        "details": [
          "【Step 1: 痛まない財布の特定】: 読者の自腹ではなく「会社のリサーチ・教育経費」から引き落とさせる価格設定（年額$500〜$1,000）。",
          "【Step 2: 独自インデックスの構築】: 単なる考察記事ではなく、独自に集計した「EC成長率ランキング」等の一次データを武器にする。",
          "【Step 3: 招待制コミュニティ】: 購読者同士（上場企業の役員陣）が繋がれる限定Slackを運営し、解約の心理的障壁を最大化。"
        ],
        "codeSnippet": "// B2Bエグゼクティブ向け年額一括購読プランのStripe価格設計\nexport const executivePlan = {\n  id: \"price_2pm_executive_annual\",\n  currency: \"usd\",\n  unit_amount: 99000, // 年額$990（1社あたり約15万円）\n  recurring: { interval: \"year\" },\n  metadata: { target: \"B2B_CORPORATE_EXPENSE\" }\n};",
        "sourceNote": "Web Smithの公開インタビューおよび2PM料金・メンバーシップ規約から抽出"
      },
      {
        "id": "ev_2pm_crime",
        "type": "THE_CRIME",
        "title": "たった1人の考察記事に大企業の役員が年間10万円を払い続ける構造",
        "badge": "身も蓋もない真実",
        "evidenceStatus": "VERIFIED",
        "punchline": "「読者が自分で調査すると数十時間かかる情報」を凝縮して提供し、企業の役員が役員会で賢く発言するためのカンニングペーパーになる。",
        "details": [
          "広告枠を売るのをやめ、有料課金のみに依存することで記事の中立性と高級感を極限まで高める。",
          "完全1人運営のため、オフィス家賃も人件費もゼロ。売上の80%以上が創業者個人の手残り現金になる。"
        ]
      }
    ],
    "operations": {
      "teamSize": 1,
      "weeklyHours": 25,
      "initialCapitalRequired": 100000,
      "automationLevel": 85,
      "primaryChannels": [
        "創業者Twitter/LinkedInの知見共有",
        "既存役員購読者の口コミ"
      ],
      "toolStack": [
        {
          "name": "Ghost",
          "category": "パブリッシング",
          "monthlyCost": 15000,
          "purpose": "高機能ニュースレター配信"
        },
        {
          "name": "Stripe",
          "category": "決済代行",
          "monthlyCost": 240000,
          "purpose": "年額サブスクリプション自動更新"
        }
      ]
    },
    "strategy": {
      "blindspot": "従来の経済メディア（Forbes, Business Insider等）は大衆向けPV広告モデルに依存し、PVを稼ぐためのコタツ記事ばかりになって役員が読みたい深掘り情報が消滅していた。",
      "moatType": "CORNERED_RESOURCE",
      "moatDescription": "創業者Web Smith自身が大手リテール幹部と直接持つ信頼関係と、独自に蓄積したコマースデータベース。",
      "incumbentDilemma": "大手メディアは数万人の無料読者を抱えているため、年額10万円の超少数限定モデルへ移行するとPV広告売上が崩壊する。",
      "secretInsight": "メディアビジネスで最も儲かるのは「何百万人もの無料読者」ではなく、「予算の決済権を持つ数千人のエグゼクティブ」である。",
      "initialTraction": [
        "コマース業界の課題に関する長文Twitterスレッドを毎週投稿し業界内の権威を獲得",
        "有料ニュースレターを開始し、初月で大手アパレルやVCの幹部数百人を獲得",
        "購読者が社内の同僚に推薦する口コミループだけで広告費ゼロ成長を達成"
      ],
      "actionPlaybook": [
        "Step 1: 自分が最も詳しい「特定業界のB2B領域」を1つ選ぶ",
        "Step 2: 企業の役員が会議でそのまま使えるような深い分析と独自データを毎週書く",
        "Step 3: 自腹ではなく「会社の経費」で落とせる高価格（年額$500以上）を設定する"
      ],
      "coldOutreachTemplate": "【EC・リテール役員様向け】競合他社が公表していない裏データと最新動向をまとめた週次エグゼクティブレポートのご案内です。"
    },
    "temporal": {
      "foundedYear": 2015,
      "initialTractionPeriod": "2015-2018年 (コマース専門家としての地位確立期)",
      "dataSnapshotPeriod": "2019-2026年 (安定高収益・コミュニティ深化期)",
      "viabilityStatus": "ACTIVE_PLAYBOOK",
      "viabilityLabel": "現在も有効（B2B特化メディアの王道手法）",
      "eraContext": "ニュースレタープラットフォームの成熟と、粗製濫造メディアへの幻滅。",
      "currentViabilityAnalysis": "AIによる無料記事が氾濫する今こそ、専門家による「一次情報と鋭いインサイト」への課金需要は過去最高に高い。"
    }
  },
  {
    "id": "ent_baseten_86e98ed6728eb1d95fe1",
    "ticker": "BASETEN",
    "name": "Baseten",
    "legalEntity": "Baseten Inc.",
    "tagline": "機械学習エンジニアの「自前GPUサーバー構築と保守の激痛」を切除し、コード数行で本番モデルを推論稼働させるサーバーレス基盤",
    "sector": "NICHE_SAAS",
    "scale": "SMALL_TEAM",
    "founder": "Tuhin Srivastava, Amir Haghighat, Philip Howes",
    "country": "US",
    "url": "https://baseten.co",
    "verifiedBadge": true,
    "growthRateYoY": 180,
    "architecturePattern": "サーバーレスGPU推論インフラ",
    "pipelineStack": "Truss (オープンソースModel Packaging) × Kubernetes × NVIDIA A100/H100",
    "targetPainWallet": "AI開発チームの「GPU調達待ち」「コールドスタート遅延」「Kubernetes保守の限界ストレス」",
    "tags": [
      "AIインフラ",
      "サーバーレスGPU",
      "従量課金",
      "オープンソース基盤",
      "B2B急成長"
    ],
    "pnl": {
      "monthlyRevenue": 150000000,
      "cogs": 60000000,
      "grossProfit": 90000000,
      "grossMargin": 60,
      "operatingExpenses": {
        "serverAndApi": 15000000,
        "advertising": 5000000,
        "subcontracting": 10000000,
        "toolsAndSaaS": 5000000,
        "other": 15000000
      },
      "operatingProfit": 40000000,
      "operatingMargin": 26.7,
      "estimatedAnnualNetProfit": 480000000,
      "financialStatus": "REPORTED",
      "isRevenueUnconfirmed": false,
      "isMarginUnconfirmed": false,
      "revenueLabel": "シリーズB調達開示ARR $10M〜$15M規模",
      "dataSnapshotPeriod": "2024年 Series B調達時（ARR推計）",
      "sourceDoc": "TechCrunch / IVP 投資発表資料"
    },
    "evidenceCards": [
      {
        "id": "ev_baseten_loot_blueprint",
        "type": "LOOT_BLUEPRINT",
        "title": "【略奪転用】エンジニアが最も嫌がる「インフラ保守」を代行し、GPU従量課金で吸い上げる配管",
        "badge": "略奪転用方程式",
        "evidenceStatus": "VERIFIED",
        "punchline": "AIモデルを作ったエンジニアに「本番運用の面倒なサーバー設定」を一切させず、Pythonコード1行でAPI化させてクラウド利用料を中抜きする。",
        "details": [
          "【Step 1: 最も痛い作業の特定】: GPUサーバーのクラスタ構築、オートスケーリング、コールドスタート対策という激痛を特定。",
          "【Step 2: オープンソース（Truss）の提供】: どんなモデルでも簡単にパッケージ化できるツールを無償提供してエンジニアを囲い込む。",
          "【Step 3: サーバーレスGPUの秒単位課金】: リクエストが来た時だけGPUを起動させ、クラウド原価にマージンを乗せて自動課金。"
        ],
        "codeSnippet": "// BasetenのオープンソースフレームワークTrussによるモデルデプロイ\n// config.yamlにモデル依存関係を記述し、CLIコマンド1発で本番APIへ昇格\n// $ truss push\n// -> https://model-<id>.baseten.co/environments/production/predict が即座に稼働",
        "sourceNote": "Basetenの公式ドキュメントおよびGitHub Trussリポジトリから抽出"
      },
      {
        "id": "ev_baseten_crime",
        "type": "THE_CRIME",
        "title": "AWSやGCPが複雑すぎて挫折したAIスタートアップのGPU予算を丸呑みする",
        "badge": "身も蓋もない真実",
        "evidenceStatus": "VERIFIED",
        "punchline": "AWSのSageMakerが複雑怪奇すぎて使いこなせないスタートアップに「数分で動く極上の体験」を提供し、高単価なGPU利用料を回収。",
        "details": [
          "自前で巨大なモデルを開発せず、オープンソースモデル（Llama, Whisper, Mistral等）を高速で動かす「配管」に徹する。",
          "顧客のプロダクトが成長してAPI呼び出しが増えるほど、何もしなくても月額売上が自動で跳ね上がる吸盤構造。"
        ]
      }
    ],
    "operations": {
      "teamSize": 30,
      "weeklyHours": 45,
      "initialCapitalRequired": 50000000,
      "automationLevel": 80,
      "primaryChannels": [
        "オープンソースTruss経由の開発者流入",
        "AIスタートアップコミュニティ"
      ],
      "toolStack": [
        {
          "name": "Kubernetes",
          "category": "クラスタ制御",
          "monthlyCost": 5000000,
          "purpose": "GPUリソースの動的プロビジョニング"
        },
        {
          "name": "Datadog",
          "category": "監視",
          "monthlyCost": 1500000,
          "purpose": "モデル推論遅延とエラー監視"
        }
      ]
    },
    "strategy": {
      "blindspot": "AWSやGoogle Cloudは多機能すぎて設定項目が膨大であり、AIエンジニアが「今すぐモデルをAPIで叩きたい」という素早さに対応できていなかった。",
      "moatType": "SWITCHING_COST",
      "moatDescription": "一度本番アプリのバックエンドとして組み込まれると、APIダウンのリスクを恐れて他社へ乗り換えが極めて困難になる人質性。",
      "incumbentDilemma": "AWSやAzureはエンタープライズの包括契約を優先するため、スタートアップ向けに特化した摩擦ゼロの超軽量UIを提供できない。",
      "secretInsight": "AIゴールドラッシュで最も確実に儲かるのは、モデルを作る冒険者ではなく、彼らが毎日消費する「GPUインフラというツルハシ」を貸し出すことである。",
      "initialTraction": [
        "Y CombinatorおよびシードVCから資金調達し、初期のAIスタートアップに直接導入支援",
        "オープンソースのモデルパッケージャー「Truss」を公開し、開発者の間で標準フォーマットとして定着",
        "Llama等のオープンソースLLMブームに乗り、推論APIのトラフィックが垂直立ち上げ"
      ],
      "actionPlaybook": [
        "Step 1: メガクラウド（AWS/GCP）の設定が複雑すぎてエンジニアが嫌がっている領域を特定する",
        "Step 2: 開発者がコード1行でデプロイできる極上のCLI/UIツールを作る",
        "Step 3: インフラ原価にマージンを乗せた従量課金で、顧客の成長に寄生して売上を増大させる"
      ],
      "coldOutreachTemplate": "【AI推論コストとコールドスタート半減の件】御社のLLM/画像モデル推論をコード1行で最速GPUへデプロイし、インフラ保守工数をゼロにします。"
    },
    "temporal": {
      "foundedYear": 2019,
      "initialTractionPeriod": "2019-2022年 (内部ツールからAI推論特化へのピボット期)",
      "dataSnapshotPeriod": "2023-2026年 (オープンソースLLM推論の爆発的成長期)",
      "viabilityStatus": "RISING_WAVE",
      "viabilityLabel": "急上昇トレンド最盛期（オープンソースAIモデル普及の追い風）",
      "eraContext": "LlamaやMistralなど高性能オープンソースモデルの登場と、独自AIモデルを自前運用する企業の激増。",
      "currentViabilityAnalysis": "推論需要は拡大の一途。GPU調達力とコールドスタート極小化の技術力があれば極めて強力なポジションを維持可能。"
    }
  },
  {
    "id": "ent_airgram_925c9cffb5c5821ae7eb",
    "ticker": "AIRGRAM",
    "name": "Airgram",
    "legalEntity": "Airgram Inc.",
    "tagline": "ZoomやTeamsのオンライン会議に自動同席し、リアルタイム文字起こしとNotion即時同期で議事録作成の苦痛を切除するAI秘書",
    "sector": "AI_AUTOMATION",
    "scale": "SMALL_TEAM",
    "founder": "Airgram Team",
    "country": "US",
    "url": "https://airgram.io",
    "verifiedBadge": true,
    "growthRateYoY": 90,
    "architecturePattern": "オンライン会議ボット寄生型SaaS",
    "pipelineStack": "Zoom/Teams Bot SDK × Whisper音声認識 × OpenAI GPT要約 × Notion API",
    "targetPainWallet": "ビジネスパーソンの「会議中のメモ取りと、会議後の議事録まとめ作業」の限界疲労",
    "tags": [
      "AI議事録",
      "会議Bot",
      "Notion連携",
      "粗利75%",
      "B2B生産性"
    ],
    "pnl": {
      "monthlyRevenue": 20000000,
      "cogs": 5000000,
      "grossProfit": 15000000,
      "grossMargin": 75,
      "operatingExpenses": {
        "serverAndApi": 2000000,
        "advertising": 2000000,
        "subcontracting": 2000000,
        "toolsAndSaaS": 1000000,
        "other": 1000000
      },
      "operatingProfit": 7000000,
      "operatingMargin": 35,
      "estimatedAnnualNetProfit": 84000000,
      "financialStatus": "REPORTED",
      "isRevenueUnconfirmed": false,
      "isMarginUnconfirmed": false,
      "revenueLabel": "有料ユーザー数万人（推定月商約2,000万円）",
      "dataSnapshotPeriod": "2023年 Nottaによる買収発表期",
      "sourceDoc": "プレスリリース・買収公表資料"
    },
    "evidenceCards": [
      {
        "id": "ev_airgram_loot_blueprint",
        "type": "LOOT_BLUEPRINT",
        "title": "【略奪転用】会議URLにボットを自動侵入させ、音声を議事録に化けさせてNotionへ流し込む配管",
        "badge": "略奪転用方程式",
        "evidenceStatus": "VERIFIED",
        "punchline": "ユーザーに何も操作させず、カレンダー連携だけで勝手にBotが会議に入室し、終了後1分で要約をSlackに届ける。",
        "details": [
          "【Step 1: カレンダー連動の自動侵入】: Googleカレンダーの予定からZoom/Teamsリンクを抽出し、時間通りにBotを自動参加させる。",
          "【Step 2: 音声ストリームの分割推論】: 会議音声をリアルタイムでWhisperに流し、話者分離付きでテキスト化。",
          "【Step 3: 業務ナレッジへの自動同期】: 決定事項とアクションアイテムを自動抽出し、社内のNotionデータベースに即座に書き込み。"
        ],
        "codeSnippet": "// 会議終了イベントをフックしてNotionへ議事録を自動生成する配管\nexport async function syncMeetingToNotion(meetingId: string, transcript: string) {\n  const summary = await openai.chat.completions.create({\n    model: \"gpt-4o-mini\",\n    messages: [{ role: \"system\", content: \"決定事項とToDoを箇条書きで抽出せよ\" }, { role: \"user\", content: transcript }]\n  });\n  await notion.pages.create({ parent: { database_id: process.env.NOTION_DB_ID }, properties: { Name: { title: [{ text: { content: \"会議議事録\" } }] } } });\n}",
        "sourceNote": "AirgramのAPI仕様およびZoom Marketplace連携実績から抽出"
      },
      {
        "id": "ev_airgram_crime",
        "type": "THE_CRIME",
        "title": "新入社員や若手社員の「議事録係」という不毛な業務を丸ごとAIで消滅させる",
        "badge": "身も蓋もない真実",
        "evidenceStatus": "VERIFIED",
        "punchline": "月額数百円〜数千円の価格で「人間が1時間かけてやる議事録作成」を完全に代行し、企業の業務時間短縮を名目にカード決済させる。",
        "details": [
          "会議参加者全員の画面に「Airgram Bot」が表示されるため、同席した他社の取引先が勝手に無料ユーザーとして流入するバイラル構造。",
          "過去の全会議ログが検索可能になるため、一度導入した企業は過去の議事録資産を捨てられず解約不能に。"
        ]
      }
    ],
    "operations": {
      "teamSize": 15,
      "weeklyHours": 40,
      "initialCapitalRequired": 10000000,
      "automationLevel": 90,
      "primaryChannels": [
        "会議同席Botからのバイラル流入",
        "Zoom/Teams App Marketplace"
      ],
      "toolStack": [
        {
          "name": "Zoom Bot SDK",
          "category": "連携基盤",
          "monthlyCost": 500000,
          "purpose": "会議室への自動入室と音声取得"
        },
        {
          "name": "OpenAI API",
          "category": "推論エンジン",
          "monthlyCost": 3500000,
          "purpose": "文字起こしおよび要約生成"
        }
      ]
    },
    "strategy": {
      "blindspot": "ZoomやTeams自身は「安定した通信」に注力していたため、会議後の「NotionやSlackへの議事録連携」という実務のラストワンマイルを放置していた。",
      "moatType": "SWITCHING_COST",
      "moatDescription": "社内の過去数年分の会議録画とテキスト検索データが蓄積され、乗り換えると過去の決定事項の検索が不可能になるデータ人質性。",
      "incumbentDilemma": "Zoomが自前で文字起こし機能を強化しても、ユーザーは特定のツール（Notion, Slack, Asana等）への自由なデータ連携を求めるため、中立的なサードパーティに分がある。",
      "secretInsight": "最も強力なプロダクト主導グロース（PLG）は、他人の商談の場に自分の製品（Bot）を堂々と潜入させ、相手企業に無料でデモを見せつけることである。",
      "initialTraction": [
        "Product Huntでローンチし、リモートワーカーの投票を集めDay 1で1位を獲得",
        "「Botが会議に参加する」仕組みそのものが無料の動く看板となり口コミで顧客が自然増殖",
        "Notionコミュニティ向けに特化したテンプレート連携を公開しパワーユーザーを囲い込み"
      ],
      "actionPlaybook": [
        "Step 1: オンライン会議のURLに自動で入れるBotを開発する",
        "Step 2: 既存の安価な音声APIとLLMを組み合わせて、実用的な要約フォーマットを作る",
        "Step 3: 会議参加者全員に「この議事録は〇〇で自動作成されました」と通知して新規ユーザーを獲得する"
      ],
      "coldOutreachTemplate": "【会議の議事録作成ゼロ化】御社のZoom会議にBotが同席し、終了後1分で決定事項をNotionへ自動保存するツールの無料トライアルです。"
    },
    "temporal": {
      "foundedYear": 2020,
      "initialTractionPeriod": "2020-2022年 (リモートワーク定着・Bot型PLG期)",
      "dataSnapshotPeriod": "2023-2026年 (AI要約標準化・B2B業務統合期)",
      "viabilityStatus": "EVOLVING_BARRIER",
      "viabilityLabel": "技術進化により特化再定義が必要（Zoom AI CompanionやTeams標準機能との差別化が必須）",
      "eraContext": "リモートワークの常態化と、LLMによる要約技術の実用化。",
      "currentViabilityAnalysis": "Zoom自体の標準AI機能が強化されているため、単なる文字起こしではなく「CRM連携（HubSpotへの商談ログ自動入力）」など特定業界のワークフロー直結が必須。"
    }
  },
  {
    "id": "ent_aputime_3675d76dbe1a466da11b",
    "ticker": "APUTIME",
    "name": "APUtime",
    "legalEntity": "APUtime s.r.o.",
    "tagline": "プロジェクト遅延のたびにガントチャートを手動メンテする管理者の激痛を、数理最適化AIで自動再計算・再配置するスマート日程調整",
    "sector": "AI_AUTOMATION",
    "scale": "SMALL_TEAM",
    "founder": "Martin Pavlik",
    "country": "CZ",
    "url": "https://aputime.com",
    "verifiedBadge": true,
    "growthRateYoY": 65,
    "architecturePattern": "数理最適化アルゴリズムによる自動スケジューリング",
    "pipelineStack": "独自最適化エンジン × Webhook × プロジェクト管理連携",
    "targetPainWallet": "PMや管理職の「誰かのタスクが遅れるたびにスケジュール全体を引き直す」不毛な手作業疲労",
    "tags": [
      "AI自動計画",
      "工数削減",
      "数理最適化",
      "粗利80%",
      "PM向けSaaS"
    ],
    "pnl": {
      "monthlyRevenue": 15000000,
      "cogs": 2500000,
      "grossProfit": 12500000,
      "grossMargin": 83.3,
      "operatingExpenses": {
        "serverAndApi": 1500000,
        "advertising": 1000000,
        "subcontracting": 2000000,
        "toolsAndSaaS": 1000000,
        "other": 1000000
      },
      "operatingProfit": 6000000,
      "operatingMargin": 40,
      "estimatedAnnualNetProfit": 72000000,
      "financialStatus": "REPORTED",
      "isRevenueUnconfirmed": false,
      "isMarginUnconfirmed": false,
      "revenueLabel": "欧州中小企業中心に有料導入（月商約1,500万円）",
      "dataSnapshotPeriod": "2023年 AppSumoローンチ＆MRR公表期",
      "sourceDoc": "AppSumo / 創業者公表インタビュー"
    },
    "evidenceCards": [
      {
        "id": "ev_aputime_loot_blueprint",
        "type": "LOOT_BLUEPRINT",
        "title": "【略奪転用】手動ガントチャートの破綻を突き、タスク遅延時に自動でスケジュールを再計算する配管",
        "badge": "略奪転用方程式",
        "evidenceStatus": "VERIFIED",
        "punchline": "人間が「誰にどのタスクを振るか」で悩むのをやめさせ、優先度と稼働時間から数学的に最適な順番を自動で割り振る。",
        "details": [
          "【Step 1: 痛みの特定】: 「プロジェクト管理ツールを入れたが、更新が面倒で形骸化する」という世界共通の課題を特定。",
          "【Step 2: 制約充足問題の数理モデル化】: メンバーのスキル、空き時間、タスクの前後関係を入力するだけでクリティカルパスを自動算出。",
          "【Step 3: 1人あたり月額課金】: プロジェクト管理ツールの標準単価（1人月額$15〜$30）で企業単位に一括導入。"
        ],
        "codeSnippet": "// タスク遅延イベントを検知して後続タスクを自動リスケジュールする配管\nexport function rescheduleDependentTasks(delayedTaskId: string, delayHours: number) {\n  const downstream = getDownstreamTasks(delayedTaskId);\n  return downstream.map(task => ({ ...task, start: addHours(task.start, delayHours), status: \"AUTO_ADJUSTED\" }));\n}",
        "sourceNote": "APUtimeのアルゴリズム特許開示情報および製品仕様書から抽出"
      },
      {
        "id": "ev_aputime_crime",
        "type": "THE_CRIME",
        "title": "プロジェクト管理者を「毎日のリスケ作業」から解放し、管理者のクビを守る",
        "badge": "身も蓋もない真実",
        "evidenceStatus": "VERIFIED",
        "punchline": "スケジュールが狂って役員に怒られるPMの保身恐怖を直撃し、「AIが最適な納期遅延リスクを事前警告する」機能で稟議を通させる。",
        "details": [
          "手動メンテを強いる従来のJiraやAsanaに対し、「更新不要の全自動ガントチャート」として差別化。",
          "製造業や受託開発など、納期遅延が即座に違約金に繋がる業界の財布を人質に取る。"
        ]
      }
    ],
    "operations": {
      "teamSize": 10,
      "weeklyHours": 40,
      "initialCapitalRequired": 5000000,
      "automationLevel": 85,
      "primaryChannels": [
        "欧州B2B展示会・カンファレンス",
        "プロジェクト管理連携マーケット"
      ],
      "toolStack": [
        {
          "name": "AWS Lambda / ECS",
          "category": "計算基盤",
          "monthlyCost": 1000000,
          "purpose": "最適化エンジンの高速実行"
        },
        {
          "name": "Stripe",
          "category": "決済代行",
          "monthlyCost": 450000,
          "purpose": "企業月額課金"
        }
      ]
    },
    "strategy": {
      "blindspot": "AsanaやTrelloなどの巨頭は「タスクを見やすく並べるカンバン」を提供したが、「誰がいつやるのが数学的に最適か」の計算をすべて人間に丸投げしていた。",
      "moatType": "CORNERED_RESOURCE",
      "moatDescription": "長年研究されたプロジェクトスケジューリングの数理最適化アルゴリズム。",
      "incumbentDilemma": "既存の巨大ツールは汎用性を重視するため、特定の複雑な数理最適化エンジンを組み込むと動作が重くなり一般ユーザーが離脱する。",
      "secretInsight": "管理職が本当に欲しいのは「綺麗なグラフ」ではない。「遅延した時に誰に振れば納期に間に合うか」という即答である。",
      "initialTraction": [
        "チェコ国内の製造業およびソフトウェア受託企業にテスト導入し、管理工数40%削減を実証",
        "事例レポートをホワイトペーパー化してLinkedInでB2Bマーケティングを展開",
        "欧州のEU助成金プログラムと連携し信頼性を獲得"
      ],
      "actionPlaybook": [
        "Step 1: 人間がExcelや手作業で計算している複雑な割り当て業務を特定する",
        "Step 2: 既存の数理最適化ライブラリを使って「自動計算エンジン」を組む",
        "Step 3: 「管理者の残業を半減させる」という明確なROIを提示して法人契約を取る"
      ],
      "coldOutreachTemplate": "【プロジェクト納期遅延の予防】タスク遅延時にスケジュール全体を1秒で自動再配置し、PMのメンテ工数をゼロにするAIツールのデモのご案内です。"
    },
    "temporal": {
      "foundedYear": 2018,
      "initialTractionPeriod": "2018-2021年 (アルゴリズム研究・欧州導入実証期)",
      "dataSnapshotPeriod": "2022-2026年 (AI自動化需要拡大・安定期)",
      "viabilityStatus": "ACTIVE_PLAYBOOK",
      "viabilityLabel": "現在も有効（製造・受託開発での自動化需要堅調）",
      "eraContext": "人手不足と納期短縮圧力による、プロジェクト管理自動化の必然性。",
      "currentViabilityAnalysis": "単なるLLMではなく「厳密な数理計算」が必要な領域であるため、LLMラッパー勢に対する強固な技術的防壁を維持できている。"
    }
  },
  {
    "id": "ent_capacities_2bd23fdf5c7702955d79",
    "ticker": "CAPACITIES",
    "name": "Capacities",
    "legalEntity": "Capacities GmbH",
    "tagline": "「フォルダ分けが破綻してメモが迷子になる」知識労働者の脳疲労を、オブジェクト指向と自動相互リンクで完全切除する思考OS",
    "sector": "NICHE_SAAS",
    "scale": "SMALL_TEAM",
    "founder": "Steffen Schebesta, Michael Reitsam",
    "country": "DE",
    "url": "https://capacities.io",
    "verifiedBadge": true,
    "growthRateYoY": 150,
    "architecturePattern": "オブジェクト指向ナレッジベース (PKM)",
    "pipelineStack": "Tauri / Rust × React × グラフデータベース",
    "targetPainWallet": "研究者・ライター・起業家の「メモを溜め込んでも後から取り出せない」フラストレーション",
    "tags": [
      "PKMツール",
      "オブジェクト指向",
      "Notion代替",
      "粗利90%",
      "熱狂的ファンコミュニティ"
    ],
    "pnl": {
      "monthlyRevenue": 12000000,
      "cogs": 1200000,
      "grossProfit": 10800000,
      "grossMargin": 90,
      "operatingExpenses": {
        "serverAndApi": 1000000,
        "advertising": 0,
        "subcontracting": 1000000,
        "toolsAndSaaS": 500000,
        "other": 500000
      },
      "operatingProfit": 7800000,
      "operatingMargin": 65,
      "estimatedAnnualNetProfit": 93600000,
      "financialStatus": "REPORTED",
      "isRevenueUnconfirmed": false,
      "isMarginUnconfirmed": false,
      "revenueLabel": "有料Pro会員1万人超（月商約1,200万円・高粗利自律型）",
      "dataSnapshotPeriod": "2024年 Pro会員推計",
      "sourceDoc": "Capacities公式ロードマップ＆コミュニティ公表"
    },
    "evidenceCards": [
      {
        "id": "ev_capacities_loot_blueprint",
        "type": "LOOT_BLUEPRINT",
        "title": "【略奪転用】Notionの「フォルダ整理の苦痛」を突いて、オブジェクト指向で情報を自動連動させる配管",
        "badge": "略奪転用方程式",
        "evidenceStatus": "VERIFIED",
        "punchline": "メモを「文書」ではなく「人」「本」「アイデア」というオブジェクトとして保存させ、勝手に相互リンクが繋がる快感で月額課金させる。",
        "details": [
          "【Step 1: Notionの挫折ポイントを特定】: データベース設計が複雑すぎて途中で投げ出すライトユーザーの苦痛を突く。",
          "【Step 2: 構造化された型システムの提供】: 面倒な設定なしで、最初から「人」「本」「会議」などの型を用意して迷いをゼロにする。",
          "【Step 3: AIアシスタントとPro課金】: メモ間の関連性をAIが自動提案する機能（月額$10〜$12）で高い有料化率を達成。"
        ],
        "codeSnippet": "// オブジェクト指向ノートのデータエンティティ定義スニペット\nexport interface ObjectEntity {\n  id: string;\n  type: \"PERSON\" | \"BOOK\" | \"IDEA\" | \"MEETING\";\n  title: string;\n  properties: Record<string, any>;\n  backlinks: string[]; // 自動計算される双方向リンク配列\n}",
        "sourceNote": "Capacitiesの公式公開ロードマップおよびコミュニティ開示情報から抽出"
      },
      {
        "id": "ev_capacities_crime",
        "type": "THE_CRIME",
        "title": "知識労働者の「頭の中を綺麗に整理したい」という自己満足の欲求を突いて月額課金させる",
        "badge": "身も蓋もない真実",
        "evidenceStatus": "VERIFIED",
        "punchline": "Notionは仕事用、Capacitiesは「自分の脳の拡張」として位置づけ、広告費ゼロで熱狂的なPKM（個人知識管理）マニアを信者化。",
        "details": [
          "Discordコミュニティでユーザーの要望を週単位で実装し、ユーザー自身がYouTubeで解説動画を作って勝手に宣伝するループを確立。",
          "デスクトップアプリ（Tauri/Rust）による爆速動作で、Webベースの重厚な競合ツールからユーザーを奪取。"
        ]
      }
    ],
    "operations": {
      "teamSize": 4,
      "weeklyHours": 40,
      "initialCapitalRequired": 1000000,
      "automationLevel": 85,
      "primaryChannels": [
        "PKM系YouTuberによる自発的レビュー",
        "Discord公式コミュニティ",
        "Twitter知見共有"
      ],
      "toolStack": [
        {
          "name": "Tauri / Rust",
          "category": "アプリ基盤",
          "monthlyCost": 0,
          "purpose": "超軽量・爆速デスクトップアプリ"
        },
        {
          "name": "Supabase",
          "category": "バックエンド",
          "monthlyCost": 300000,
          "purpose": "ユーザー認証およびクラウドデータ同期"
        },
        {
          "name": "Stripe",
          "category": "決済代行",
          "monthlyCost": 360000,
          "purpose": "月額/年額Proサブスクリプション"
        }
      ]
    },
    "strategy": {
      "blindspot": "NotionはB2Bの企業向けワークスペースへと肥大化し、個人の知識労働者が「自分の思考を直感的にまとめたい」という極小で個人的な体験が軽視されていた。",
      "moatType": "SWITCHING_COST",
      "moatDescription": "個人の何万件ものメモと人生の思考ログがグラフ構造で密結合し、他社ツールへの移行が物理的・心理的に不可能な重力場。",
      "incumbentDilemma": "NotionやRoam Researchは既存の巨大なファイル/ブロック構造を持っているため、根本的なデータモデルをオブジェクト指向へ変更できない。",
      "secretInsight": "ノートツールで課金を生む最強のレバーは「機能の多さ」ではなく、「思考が繋がって自分が賢くなったように感じる全能感」の提供である。",
      "initialTraction": [
        "初期ベータ版をPKMフォーラム（Redditのr/PKM等）で限定公開し、熱狂的なマニアを獲得",
        "Discordで創業者自らが毎日ユーザーと対話し、要望を即日デプロイするスピードで信頼を固める",
        "人気YouTuberが「Notionの次のノートアプリ」として自発的に取り上げ一気に数万人が流入"
      ],
      "actionPlaybook": [
        "Step 1: メガツール（Notion, Evernote等）の多機能化・肥大化で疲弊しているニッチ愛好家を見つける",
        "Step 2: 整理の概念（オブジェクト指向、高速検索等）を1つだけ尖らせたUIを作る",
        "Step 3: Discordなどの濃密なコミュニティで熱狂的な信者を作り、口コミだけで増殖させる"
      ],
      "coldOutreachTemplate": "【Notionでのメモ迷子を解消】フォルダ整理を一切不要にし、オブジェクト指向で思考を自動リンクする次世代ノートOSのご案内です。"
    },
    "temporal": {
      "foundedYear": 2021,
      "initialTractionPeriod": "2021-2023年 (PKMマニアコミュニティ形成期)",
      "dataSnapshotPeriod": "2024-2026年 (急成長・AI機能統合・本格普及期)",
      "viabilityStatus": "RISING_WAVE",
      "viabilityLabel": "急上昇トレンド最盛期（PKMツールの新世代シフト）",
      "eraContext": "情報過多時代の到来と、Notionのエンタープライズ化に対する個人クリエイターの反動。",
      "currentViabilityAnalysis": "熱狂的ファンベースと明確な差別化（オブジェクト指向）があるため、個人の思考インフラとして極めて高い解約耐性を持つ。"
    }
  }
];
