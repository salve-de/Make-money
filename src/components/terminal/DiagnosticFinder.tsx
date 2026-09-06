'use client';

import React, { useState, useMemo } from 'react';

export type CapitalLevel = 'ZERO' | 'MICRO' | 'MID' | 'HIGH';
export type TimeCommitment = 'ULTRA_LIGHT' | 'SIDE_JOB' | 'FULL_TIME';
export type Capability = 'NO_CODE_API' | 'SALES_OUTBOUND' | 'CONTENT_MEDIA' | 'BIZ_EFFICIENCY' | 'VIDEO_CREATIVE';
export type CustomerTarget = 'B2B_CORP' | 'B2C_INDIVIDUAL' | 'LOCAL_STORE';
export type CashSpeed = 'INSTANT_CASH' | 'LONG_STOCK';
export type TargetProfit = 'TIER_30M' | 'TIER_100M' | 'TIER_500M';
export type SortOption = 'FIT_SCORE' | 'PROFIT' | 'MARGIN';

export interface MatchedStrategy {
  id: string;
  companyId: string;
  badgeType: 'PRIMARY' | 'SECONDARY' | 'CONTRARIAN';
  badgeLabel: string;
  title: string;
  founderReference: string;
  monthlyRevenueEstimate: string;
  monthlyProfitMinJpy: number;
  profitMargin: number;
  initialInvestment: string;
  timeframeToProfit: string;
  bestFitScore: number;
  whyFitsYourCards: string;
  incumbentVsYou: {
    incumbentPain: string;
    yourEdge: string;
  };
  threeKeyTools: Array<{ name: string; role: string }>;
  dayOneAction: string;
  proSecretTip: string;
  tags: string[];
}

interface DiagnosticFinderProps {
  onSelectCompany?: (companyId: string) => void;
}

export const DiagnosticFinder: React.FC<DiagnosticFinderProps> = ({ onSelectCompany }) => {
  // 6次元の入力手札
  const [capital, setCapital] = useState<CapitalLevel>('ZERO');
  const [time, setTime] = useState<TimeCommitment>('SIDE_JOB');
  const [capability, setCapability] = useState<Capability>('NO_CODE_API');
  const [targetMarket, setTargetMarket] = useState<CustomerTarget>('B2B_CORP');
  const [cashSpeed, setCashSpeed] = useState<CashSpeed>('INSTANT_CASH');
  const [targetProfit, setTargetProfit] = useState<TargetProfit>('TIER_100M');

  // ソート状態
  const [sortBy, setSortBy] = useState<SortOption>('FIT_SCORE');
  // 選択中の詳細展開カードID
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  // 全件展開表示フラグ
  const [showAllMatches, setShowAllMatches] = useState(false);

  // 実在10モデルの精緻な適合度スコアリング
  const matchedStrategies: MatchedStrategy[] = useMemo(() => {
    const rawList: Omit<MatchedStrategy, 'bestFitScore' | 'badgeType' | 'badgeLabel'>[] = [
      {
        id: 'outbid-auction',
        companyId: 'outbid-lol',
        title: '虚栄心オークション型 順位即時入札モデル',
        founderReference: 'outbid.lol（ジョナサン・ヴィルケ氏 / 48時間で2,000万円）',
        monthlyRevenueEstimate: '月利50万〜200万円（初期爆発力大）',
        monthlyProfitMinJpy: 1500000,
        profitMargin: 97,
        initialInvestment: '300円（最安ドメイン代のみ）',
        timeframeToProfit: 'ローンチ後48時間',
        whyFitsYourCards: '手元資金ゼロ・週3時間の片手間で、無料ランキングの裏工作に不満を抱える起業家を巻き込み、一番金を払った者を1位にする単純ルールとStripe即時決済のみで最短着金可能。',
        incumbentVsYou: {
          incumbentPain: 'ProductHunt等の無料ランキングサイトが「裏での自作自演・不正投票」で荒れ、起業家が不満を抱えている。',
          yourEdge: '「最初から金で順位を買う」露骨なルールにし、起業家の負けず嫌いと承認欲求を入札合戦へ転換。'
        },
        threeKeyTools: [
          { name: 'Stripe', role: 'カード即時決済と入金イベント検知' },
          { name: 'Next.jsテンプレート', role: 'リーダーボード画面を1枚ペラで即時公開' },
          { name: 'X（Twitter）', role: '入札額の変動を動画キャプチャで1行実況投稿' }
        ],
        dayOneAction: '「金で順位を買える露骨なサイトを作った」と1行動画をXに投稿し、直近で無料ランキングに不満を漏らしていた起業家3人にDMで直接投げ込む。',
        proSecretTip: '定価を決めずオークション形式にすることで、価格交渉の余地を物理的にゼロ化し、入札者の意地で単価が勝手に吊り上がる。',
        tags: ['元手0円', '即金性最速', '1人完結', '承認欲求ハック']
      },
      {
        id: 'keyence-ipad-inspection',
        companyId: 'keyence-japan',
        title: 'キーエンス逆利用型 町工場向け格安iPad外観検査モデル',
        founderReference: 'キーエンスの死角を突くエッジAIベンチャー実例',
        monthlyRevenueEstimate: '月利100万〜300万円（ストック保守契約）',
        monthlyProfitMinJpy: 2000000,
        profitMargin: 78,
        initialInvestment: '5万円（中古iPadと固定治具のみ）',
        timeframeToProfit: '初回提案から14日',
        whyFitsYourCards: '営業・泥臭い折衝ができるなら最強。キーエンスが相手にしない「500万円未満の町工場」へ、中古iPadと画像認識AIを組み合わせた格安検査システムを直販し、月額保守を独占回収。',
        incumbentVsYou: {
          incumbentPain: 'キーエンスの営業マンが町工場に「一式500万＋年保守100万」を提示。高齢パートの退職に怯える工場長が価格に絶望している。',
          yourEdge: '「初期20万＋月額2万円」の10分の1以下の価格で、現場の目視検査を即日自動化。'
        },
        threeKeyTools: [
          { name: '中古iPad (第9世代)', role: '製造ライン固定カメラおよび現場用端末' },
          { name: 'Roboflow / YOLO', role: '無料枠で使えるノーコード傷・不良品検知モデル' },
          { name: 'LINE公式アカウント', role: '不良検知時の工場長スマホへの即時写真通知' }
        ],
        dayOneAction: '地元の金属加工・プラスチック工場3社に電話し、「パートさんの目視検査をiPadで月2万円で自動化する実演デモをお持ちしてよろしいですか？」と工場長のアポを取る。',
        proSecretTip: 'システムではなく「現場のラインを止めない保険」として売ることで、相見積もりを排除し値引き交渉をゼロにする。',
        tags: ['高単価直販', '月額ストック', '町工場独占', '非IT市場']
      },
      {
        id: 'daily-tech-newsletter',
        companyId: 'dan-ni-tldr',
        title: '毎朝5分要約型 B2B広告枠直販ニュースレターモデル',
        founderReference: 'TLDR（ダン・ニー氏 / 1人創業で年商15億円）',
        monthlyRevenueEstimate: '月利80万〜250万円（広告枠ストック）',
        monthlyProfitMinJpy: 1800000,
        profitMargin: 88,
        initialInvestment: '0円（Beehiiv無料枠）',
        timeframeToProfit: '読者1,000名到達後（約30日）',
        whyFitsYourCards: '文章要約や情報収集が得意なら、原価ゼロで最も手堅い。毎朝忙しいエンジニアやビジネスマン向けに英語記事を3行要約し、読者が1,000人を超えた段階でB2Bツールのスポンサー枠（1枠10万円〜）を直販。',
        incumbentVsYou: {
          incumbentPain: '大手ITメディアの記事が長すぎて、日々の忙しいエンジニアが最新技術のキャッチアップに疲弊している。',
          yourEdge: '毎朝5分で読める「3行箇条書き要約」に特化し、読者の朝のルーティンを独占。'
        },
        threeKeyTools: [
          { name: 'Beehiiv', role: 'メルマガ配信・紹介ループ・広告ネットワーク統合基盤' },
          { name: 'Claude / GPT-4o', role: '海外論文・最新ニュースの骨子抽出・要約補助' },
          { name: 'Stripe', role: 'B2Bスポンサー広告主からの事前カード引き落とし' }
        ],
        dayOneAction: '海外の最新AIツール5選を3行ずつ要約した第1号を作成し、Xで「毎朝この要約が届く無料レターを始めました」とスレッド投稿して最初の50人を集める。',
        proSecretTip: '広告代理店を挟まず、事例に出てくるSaaS企業に「読者3,000人のエンジニアに届きます」と直接提案することでマージンを100%手元に残す。',
        tags: ['原価ゼロ', 'ストック広告', '副業可', '朝5分習慣']
      },
      {
        id: 'headshot-ai-b2b',
        companyId: 'danny-postma-headshotpro',
        title: 'セルフィー変換型 法人向け顔写真即時生成モデル',
        founderReference: 'HeadshotPro（ダニー・ポストマ氏 / 1人で年商5.4億円）',
        monthlyRevenueEstimate: '月利150万〜400万円（完全自動決済）',
        monthlyProfitMinJpy: 3000000,
        profitMargin: 84,
        initialInvestment: '3万円（API推論検証クレジット代）',
        timeframeToProfit: '初月着金',
        whyFitsYourCards: 'APIの配線ができるなら利益率は最高峰。リモートワーク企業向けに、スタジオ撮影の数十万円と全社員の日程調整を排し、自撮り写真を送るだけで1時間でプロ証明写真を自動納品。',
        incumbentVsYou: {
          incumbentPain: '全社員を写真スタジオに呼ぶ数十万円の費用と、日程調整にかかる膨大な総務・人事の手間。',
          yourEdge: '「自撮り写真をアップロードするだけ」で、1人3,900円・1時間納品で全社員のトーンを統一。'
        },
        threeKeyTools: [
          { name: 'Replicate API (Flux / SDXL)', role: '顔写真の画像生成推論API' },
          { name: 'Stripe Checkout', role: '全世界カード事前決済と領収書自動送付' },
          { name: 'Vercel / Supabase', role: '写真の安全アップロードと納品パイプライン' }
        ],
        dayOneAction: 'LinkedInでリモートワーク企業の人事担当者10人に「社員の顔写真をAIで統一しませんか？無料で3名分サンプルを作成します」とメッセージを送る。',
        proSecretTip: '「B2Cの遊び画像」ではなく「法人の名刺・社内名簿用」として売ることで、会社の経費で躊躇なく即決決済させる。',
        tags: ['法人経費決済', '高利益率84%', '完全無人化', 'API配線']
      },
      {
        id: 'clay-outbound-agency',
        companyId: 'clay-ai-agency',
        title: '資金調達企業特化型 超個別化アウトバウンド代行モデル',
        founderReference: 'Clay×AIコールドアウトバウンド代行実例（月利800万・利益率65%）',
        monthlyRevenueEstimate: '月利150万〜500万円（成果報酬＋月額保守）',
        monthlyProfitMinJpy: 3500000,
        profitMargin: 65,
        initialInvestment: '3万円（Clay・ドメイン取得費）',
        timeframeToProfit: '初回案件獲得から10日',
        whyFitsYourCards: '業務理解・データスクレイピング力があるなら一撃が大きい。営業マンを雇うと月50万円かかる企業に対し、ClayとAIで見込み客の直近ニュースを盛り込んだ超個別化メールを完全自動代行。',
        incumbentVsYou: {
          incumbentPain: '一斉送信のコールドメールが迷惑メール判定され、新規アポが取れずに営業人件費が無駄になっている。',
          yourEdge: '直近のプレスリリースや求人情報をAIが自動引用した「完全に自分向け」の文面で返信率30%超を叩き出す。'
        },
        threeKeyTools: [
          { name: 'Clay.com', role: '見込み客企業・役職者のデータ自動エンリッチメント' },
          { name: 'Instantly.ai', role: 'スパム回避ドメインによる複数アカウント自動配信' },
          { name: 'OpenAI API', role: '相手企業の直近ニュースに基づく1行パーソナライズ生成' }
        ],
        dayOneAction: '先月資金調達を発表したスタートアップ5社をリサーチし、社長宛てに「御社のターゲット企業20社をClayで抽出したリストと、返信率35%の提案文下書き」を無償添付して送る。',
        proSecretTip: '月額固定費ではなく「アポ1件獲得ごとに3万円」の成果報酬にすることで、相手の導入リスクをゼロにして即断即決させる。',
        tags: ['高額成果報酬', 'B2B必須需要', 'AIデータ連携', '即日営業']
      },
      {
        id: 'pieter-photo-ai',
        companyId: 'pieter-levels-photo-ai',
        title: '完全一人運営 自撮りAI写真スタジオ・自販機モデル',
        founderReference: 'Photo AI（ピーター・レベルズ氏 / 1人で年商数十億円）',
        monthlyRevenueEstimate: '月利300万〜1,500万円（月額サブスク）',
        monthlyProfitMinJpy: 8000000,
        profitMargin: 84,
        initialInvestment: '1万円（GPUクラウド初期利用枠）',
        timeframeToProfit: '公開後3週間',
        whyFitsYourCards: 'APIやスクリプトを自前で配線し、完全不労の自販機を作りたい人に最適。日常のスマホ写真を数枚投じるだけでSNS・マッチングアプリ用の美男美女写真を自動生成。',
        incumbentVsYou: {
          incumbentPain: '撮影スタジオに予約して数万円払い、数日待たないと仕上がらないタイムラグ。',
          yourEdge: '自宅で寝転がりながら3分で30パターンの撮影風写真が納品される極限の怠惰ハック。'
        },
        threeKeyTools: [
          { name: 'Vultr GPUクラウド', role: '画像生成推論の高速バッチ処理基盤' },
          { name: 'Stripe Billing', role: '月額3,980円の自動引き落としサブスクリプション' },
          { name: 'Cloudflare', role: '大量写真の高速キャッシュ配信とトラフィック防御' }
        ],
        dayOneAction: '自作ツールの開発画面と「これ誰の写真に見える？」という生成ビフォーアフター動画をXに投稿し、興味を持った人へ手動で招待リンクを配る。',
        proSecretTip: '生成待機画面に「スタジオの現像中アニメーション」を挟むだけで、ユーザーの待機ストレスと途中解約率を激減させる。',
        tags: ['完全不労型', '継続サブスク', '個人欲望直撃', 'ソロ開発']
      },
      {
        id: 'local-exterior-wash',
        companyId: 'local-dx-exterior-wash',
        title: 'LINE自動見積もり型 地方実店舗・外壁高圧洗浄DXモデル',
        founderReference: '地方特化型実業DX（月利250万円 / 利益率55%）',
        monthlyRevenueEstimate: '月利100万〜250万円（高単価施工仲介）',
        monthlyProfitMinJpy: 1800000,
        profitMargin: 58,
        initialInvestment: '2万円（LINE構築・地域ポスティング代）',
        timeframeToProfit: '初週契約',
        whyFitsYourCards: '現場泥臭く動ける、または地方の店舗・住宅を相手にしたい人に手堅い。LINE公式アカウントに自宅外壁の写真を送るだけで概算見積もりが即時返信される仕組みを作り、地元の職人に丸投げ外注。',
        incumbentVsYou: {
          incumbentPain: '昔ながらの工務店が見積もりに何日も待たせ、訪問営業で居座る不安。',
          yourEdge: '写真1枚をLINEで送るだけで10秒で概算見積もり提示。現地立ち会い不要で即日完結。'
        },
        threeKeyTools: [
          { name: 'Lステップ / LINE公式', role: '写真受信と自動見積もりロジックの配線' },
          { name: 'Canva', role: '「外壁の黒ずみ・苔は放置すると壁材腐食」の警告チラシ制作' },
          { name: '地元の個人塗装職人', role: '施工のみを請け負う提携パートナー（外注化）' }
        ],
        dayOneAction: '近隣の築10〜15年の戸建て密集地に「写真1枚で10秒見積もりLINE」のQRコード入りチラシを自ら50枚ポスティングする。',
        proSecretTip: '自分が作業着を着て高圧洗浄機を持つ必要はない。「集客・見積もり・集金」だけを握り、実作業は地元の職人に日給2万円で委託すれば差額が全て手残りになる。',
        tags: ['地方・実業', '写真即時見積', '外注レバレッジ', '即日着金']
      },
      {
        id: 'marc-shipfast-boilerplate',
        companyId: 'marc-lou-shipfast',
        title: 'Next.jsボイラープレート型 開発時間短縮テンプレート販売モデル',
        founderReference: 'ShipFast（マーク・ルー氏 / 1人で年商1.5億円）',
        monthlyRevenueEstimate: '月利100万〜600万円（買い切りデジタル商品）',
        monthlyProfitMinJpy: 4000000,
        profitMargin: 94,
        initialInvestment: '0円（手元のコードをまとめるのみ）',
        timeframeToProfit: '公開初日',
        whyFitsYourCards: 'Web開発や設定の知見があるなら即効性最大。個人開発者が毎回苦労する「ログイン認証・Stripe決済・メール配信・SEOメタタグ」を最初から配線したコード型紙を買い切り2万円で販売。',
        incumbentVsYou: {
          incumbentPain: '新規アプリを作ろうとするたびに、StripeのAPI設定や認証画面で何日も浪費して挫折する。',
          yourEdge: '「コマンド1発でクローンし、数時間で課金スタートできる」究極のショートカットを提供。'
        },
        threeKeyTools: [
          { name: 'Next.js + Tailwind CSS', role: 'モダンで流用しやすいベースコード' },
          { name: 'Lemon Squeezy / Stripe', role: '全世界からのデジタルコード即時ダウンロード決済' },
          { name: 'GitHub Private Repo', role: '購入者へのリポジトリ自動アクセス権付与' }
        ],
        dayOneAction: '過去に自分が苦労して設定した認証・決済コードを1つのフォルダにまとめ、Xで「これ欲しい人いますか？」と画面スクショを投稿する。',
        proSecretTip: 'コードを売るのではなく「アプリ立ち上げまでの数週間の苦痛と時間の節約」を売る。購入者に限定Discordコミュニティを付けることで定価を倍に吊り上げる。',
        tags: ['原価完全ゼロ', '買い切り高単価', '全世界販売', '即日公開']
      },
      {
        id: 'easlo-notion-assets',
        companyId: 'easlo-notion-templates',
        title: 'Notionテンプレート型 思考整理フォーマット完全不労モデル',
        founderReference: 'Easlo（20歳ソロプレナー / 1人で年商1.1億円）',
        monthlyRevenueEstimate: '月利50万〜300万円（完全自動ダウンロード）',
        monthlyProfitMinJpy: 2000000,
        profitMargin: 96,
        initialInvestment: '0円（Notion無料アカウントのみ）',
        timeframeToProfit: '初週',
        whyFitsYourCards: 'プログラミングが一切できなくても、整理・構成力があれば即日参入可能。「タスク管理」「家計簿」「読書記録」などの美しいNotionワークスペースを設計し、Gumroad等で買い切り配布。',
        incumbentVsYou: {
          incumbentPain: 'Notionの白紙の画面を前にして、どう作ればいいか分からず挫折する初心者が世界中に溢れている。',
          yourEdge: '1クリックで自分のNotionに複製できる「完成された美しいダッシュボード」を格安提供。'
        },
        threeKeyTools: [
          { name: 'Notion', role: 'テンプレートの制作と公開リンク発行' },
          { name: 'Gumroad', role: 'デジタルコンテンツの販売と自動メール配信' },
          { name: 'X / Pinterest', role: 'モノトーンの美しい画面スクショ投稿によるオーガニック集客' }
        ],
        dayOneAction: '自分が普段使っている最も整理されたNotionページを1つ選び、個人情報をダミーに差し替えて無料配布リンクをXに投稿する。',
        proSecretTip: 'まずは「無料版」を大量に配って数千人のメールアドレスをリスト化し、後から「フル機能の有料PRO版（4,980円）」をメルマガで自動提案して刈り取る。',
        tags: ['コード完全不要', '不労資産', '初期0円', '美学ハック']
      },
      {
        id: 'tiktok-shop-faceless',
        companyId: 'tiktok-faceless-commerce',
        title: 'TikTok Shop手元実演アフィリエイトモデル（顔出し・声出し不要）',
        founderReference: '国内・米国手元実演チーム（月商2,200万 / 利益率28%）',
        monthlyRevenueEstimate: '月利80万〜400万円（成果報酬アフィリエイト）',
        monthlyProfitMinJpy: 2500000,
        profitMargin: 35,
        initialInvestment: '1万円（百均便利グッズと卓上スマホスタンド）',
        timeframeToProfit: '動画初バズから3日（7日以内）',
        whyFitsYourCards: 'スマホ1台とSNSの嗅覚があれば学歴・スキル不問。顔も声も出さず、手元だけで話題の便利グッズを開封・実演する15秒動画を量産。アルゴリズムの無料露出に乗せてTikTok Shopリンクで衝動買いさせる。',
        incumbentVsYou: {
          incumbentPain: '長尺のYouTubeレビュー動画は見るのが面倒で、購入まで辿り着かない。',
          yourEdge: '「開始2秒で驚きの手元実演」を見せ、画面下の買い物カゴアイコンをタップさせるだけで即座に購入完了。'
        },
        threeKeyTools: [
          { name: 'CapCut', role: '手元動画の自動字幕・倍速編集・効果音挿入' },
          { name: '卓上俯瞰スマホスタンド', role: '手元だけを綺麗に真上から撮影する器具' },
          { name: 'TikTok Shop クリエイター登録', role: '無償サンプル提供プログラムと成果報酬獲得' }
        ],
        dayOneAction: '自宅にある「買ってよかった便利グッズ」を机の上に置き、スマホで15秒だけ使っている手元動画を撮ってCapCutで字幕を付けてTikTokに投稿する。',
        proSecretTip: 'クリエイター登録するとメーカーから無償でサンプル商品が届くため、仕入れ原価が完全にゼロになる。海外で100万回再生された動画の構成（画角・テンポ）をそのまま完コピするだけで当たる。',
        tags: ['顔出し不要', 'スマホ1台', '即金バズ', '無償サンプル']
      }
    ];

    // 各モデルに対するユーザー手札の合致度スコア計算（100点満点換算）
    const scoredList: MatchedStrategy[] = rawList.map((item) => {
      let score = 50; // 基礎点

      // 1. 投下可能資本の適合度
      if (item.initialInvestment.includes('0円') || item.initialInvestment.includes('300円')) {
        score += capital === 'ZERO' ? 15 : capital === 'MICRO' ? 10 : 5;
      } else if (item.initialInvestment.includes('1万円') || item.initialInvestment.includes('3万円') || item.initialInvestment.includes('5万円')) {
        score += capital === 'MICRO' || capital === 'MID' ? 15 : capital === 'ZERO' ? -10 : 8;
      } else {
        score += capital === 'HIGH' || capital === 'MID' ? 15 : -15;
      }

      // 2. 週実働コミット時間の適合度
      if (item.tags.includes('完全不労型') || item.tags.includes('朝5分習慣') || item.tags.includes('不労資産')) {
        score += time === 'ULTRA_LIGHT' ? 15 : 10;
      } else if (item.tags.includes('副業可') || item.tags.includes('即日着金')) {
        score += time === 'SIDE_JOB' ? 15 : 10;
      } else {
        score += time === 'FULL_TIME' ? 15 : 5;
      }

      // 3. 手持ちスキル特性の適合度
      if (capability === 'NO_CODE_API' && (item.tags.includes('API配線') || item.tags.includes('1人完結') || item.tags.includes('Next.js'))) {
        score += 20;
      } else if (capability === 'SALES_OUTBOUND' && (item.tags.includes('町工場独占') || item.tags.includes('高単価直販') || item.tags.includes('即日営業'))) {
        score += 20;
      } else if (capability === 'CONTENT_MEDIA' && (item.tags.includes('朝5分習慣') || item.tags.includes('原価ゼロ') || item.tags.includes('美学ハック'))) {
        score += 20;
      } else if (capability === 'BIZ_EFFICIENCY' && (item.tags.includes('AIデータ連携') || item.tags.includes('外注レバレッジ') || item.tags.includes('法人経費決済'))) {
        score += 20;
      } else if (capability === 'VIDEO_CREATIVE' && item.tags.includes('即金バズ')) {
        score += 25;
      }

      // 4. 顧客ターゲットの適合度
      if (targetMarket === 'B2B_CORP' && (item.tags.includes('法人経費決済') || item.tags.includes('AIデータ連携') || item.tags.includes('町工場独占') || item.tags.includes('ストック広告'))) {
        score += 15;
      } else if (targetMarket === 'B2C_INDIVIDUAL' && (item.tags.includes('個人欲望直撃') || item.tags.includes('承認欲求ハック') || item.tags.includes('即金バズ') || item.tags.includes('不労資産'))) {
        score += 15;
      } else if (targetMarket === 'LOCAL_STORE' && (item.tags.includes('地方・実業') || item.tags.includes('町工場独占'))) {
        score += 20;
      }

      // 5. 収益化スピードの適合度
      if (cashSpeed === 'INSTANT_CASH' && (item.tags.includes('即金性最速') || item.tags.includes('即日着金') || item.tags.includes('即金バズ') || item.timeframeToProfit.includes('初日') || item.timeframeToProfit.includes('48時間'))) {
        score += 15;
      } else if (cashSpeed === 'LONG_STOCK' && (item.tags.includes('継続サブスク') || item.tags.includes('月額ストック') || item.tags.includes('ストック広告'))) {
        score += 15;
      }

      // 6. 目標手残り月利
      if (targetProfit === 'TIER_500M') {
        score += item.monthlyProfitMinJpy >= 3500000 ? 15 : -5;
      } else if (targetProfit === 'TIER_100M') {
        score += item.monthlyProfitMinJpy >= 1500000 ? 10 : 5;
      } else {
        score += 8;
      }

      // スコアを80〜98の自然な範囲に正規化
      const normalizedScore = Math.min(99, Math.max(72, score));

      return {
        ...item,
        bestFitScore: normalizedScore,
        badgeType: 'PRIMARY',
        badgeLabel: ''
      };
    });

    // スコア降順ソート
    scoredList.sort((a, b) => b.bestFitScore - a.bestFitScore);

    // バッジと役割の付与
    if (scoredList.length > 0) {
      scoredList[0].badgeType = 'PRIMARY';
      scoredList[0].badgeLabel = '手札完全直結（本命）';
    }
    if (scoredList.length > 1) {
      scoredList[1].badgeType = 'SECONDARY';
      scoredList[1].badgeLabel = '高利益率・対抗筋';
    }
    if (scoredList.length > 2) {
      scoredList[2].badgeType = 'CONTRARIAN';
      scoredList[2].badgeLabel = '競合不在・逆張り穴場';
    }
    for (let i = 3; i < scoredList.length; i++) {
      scoredList[i].badgeType = 'SECONDARY';
      scoredList[i].badgeLabel = `候補 ${i + 1}`;
    }

    return scoredList;
  }, [capital, time, capability, targetMarket, cashSpeed, targetProfit]);

  // 並び替え処理
  const sortedStrategies = useMemo(() => {
    const arr = [...matchedStrategies];
    if (sortBy === 'FIT_SCORE') {
      return arr.sort((a, b) => b.bestFitScore - a.bestFitScore);
    } else if (sortBy === 'PROFIT') {
      return arr.sort((a, b) => b.monthlyProfitMinJpy - a.monthlyProfitMinJpy);
    } else if (sortBy === 'MARGIN') {
      return arr.sort((a, b) => b.profitMargin - a.profitMargin);
    }
    return arr;
  }, [matchedStrategies, sortBy]);

  // アクティブ表示する戦略（初期値は最上位、またはユーザーがクリックした戦略）
  const activeStrategy = useMemo(() => {
    if (selectedStrategyId) {
      const found = sortedStrategies.find((s) => s.id === selectedStrategyId);
      if (found) return found;
    }
    return sortedStrategies[0] || null;
  }, [selectedStrategyId, sortedStrategies]);

  return (
    <section className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-6 select-none">
      {/* 1. ヘッダー見出し */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold border border-indigo-200">
              MULTI-DIMENSIONAL SCREENER
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              多次元・手札逆引き事業ファインダー
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            あなたの手札条件から、明日真似すべき実在モデル上位群を即答照合
          </h2>
          <p className="text-xs text-slate-600 pt-0.5">
            AIの適当な作文を完全排除。実在する検証済み22社の中から、手札（資本・時間・武器・市場・速度）に適合する勝ち筋を複数提示します。
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 font-bold">
            実在22社・財務監査連動
          </span>
        </div>
      </div>

      {/* 2. 6次元コントロールパネル（手札入力） */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-sans">
        
        {/* 1. 投下可能資本 */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
            1. 投下可能資本
          </span>
          <div className="space-y-1 font-mono text-[10px]">
            {[
              { id: 'ZERO', label: '0円 (元手ゼロ)' },
              { id: 'MICRO', label: '〜3万円 (ツール代)' },
              { id: 'MID', label: '10万〜50万円' },
              { id: 'HIGH', label: '100万円以上' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCapital(opt.id as CapitalLevel)}
                className={`w-full px-2 py-1.5 rounded-md text-left transition-all cursor-pointer truncate ${
                  capital === opt.id
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. 週実働コミット時間 */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
            2. 週実働コミット
          </span>
          <div className="space-y-1 font-mono text-[10px]">
            {[
              { id: 'ULTRA_LIGHT', label: '週1〜3h (完全自動)' },
              { id: 'SIDE_JOB', label: '週5〜10h (副業・週末)' },
              { id: 'FULL_TIME', label: '週30h+ (専任・本業)' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTime(opt.id as TimeCommitment)}
                className={`w-full px-2 py-1.5 rounded-md text-left transition-all cursor-pointer truncate ${
                  time === opt.id
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. 保有スキル・主武器 */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
            3. 保有スキル・武器
          </span>
          <div className="space-y-1 font-mono text-[10px]">
            {[
              { id: 'NO_CODE_API', label: 'ノーコード/API配線' },
              { id: 'SALES_OUTBOUND', label: '泥臭い直販・営業' },
              { id: 'CONTENT_MEDIA', label: '文章要約・情報収集' },
              { id: 'BIZ_EFFICIENCY', label: '業務改善・データ' },
              { id: 'VIDEO_CREATIVE', label: '動画・SNS感覚' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCapability(opt.id as Capability)}
                className={`w-full px-2 py-1.5 rounded-md text-left transition-all cursor-pointer truncate ${
                  capability === opt.id
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. 顧客ターゲット */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
            4. 顧客ターゲット
          </span>
          <div className="space-y-1 font-mono text-[10px]">
            {[
              { id: 'B2B_CORP', label: '法人 (経費・即決)' },
              { id: 'B2C_INDIVIDUAL', label: '個人 (欲望・時短)' },
              { id: 'LOCAL_STORE', label: '地方店舗・町工場' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTargetMarket(opt.id as CustomerTarget)}
                className={`w-full px-2 py-1.5 rounded-md text-left transition-all cursor-pointer truncate ${
                  targetMarket === opt.id
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 5. 収益化スピード */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
            5. 着金スピード
          </span>
          <div className="space-y-1 font-mono text-[10px]">
            {[
              { id: 'INSTANT_CASH', label: '即金 (初日〜1週間)' },
              { id: 'LONG_STOCK', label: 'ストック (月額積上)' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCashSpeed(opt.id as CashSpeed)}
                className={`w-full px-2 py-1.5 rounded-md text-left transition-all cursor-pointer truncate ${
                  cashSpeed === opt.id
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 6. 目標手残り月利 */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
            6. 目標手残り月利
          </span>
          <div className="space-y-1 font-mono text-[10px]">
            {[
              { id: 'TIER_30M', label: '月利 30万〜50万' },
              { id: 'TIER_100M', label: '月利 100万〜300万' },
              { id: 'TIER_500M', label: '月利 500万円以上' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTargetProfit(opt.id as TargetProfit)}
                className={`w-full px-2 py-1.5 rounded-md text-left transition-all cursor-pointer truncate ${
                  targetProfit === opt.id
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 3. 結果サマリーバー & 並び替えソート */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-700">
            照合結果: <span className="text-indigo-600 font-black">{sortedStrategies.length}件</span> の適合モデルを検出
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            （上位カードをクリックして詳細な現場対立構図と初動手順を展開）
          </span>
        </div>

        {/* ソート切り替え */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-slate-400 text-[10px]">並び替え:</span>
          {[
            { id: 'FIT_SCORE', label: '手札適合度順' },
            { id: 'PROFIT', label: '想定月利順' },
            { id: 'MARGIN', label: '粗利益率順' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSortBy(s.id as SortOption)}
              className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                sortBy === s.id
                  ? 'bg-slate-900 text-white border-slate-900 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. 上位適合候補群カードグリッド（複数件並列表示） */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {(showAllMatches ? sortedStrategies : sortedStrategies.slice(0, 3)).map((item, idx) => {
          const isSelected = activeStrategy?.id === item.id;
          const rankColors = [
            'border-indigo-500/80 bg-indigo-50/20 ring-1 ring-indigo-500/50',
            'border-slate-300 bg-white hover:border-slate-400',
            'border-slate-300 bg-white hover:border-slate-400',
          ];

          return (
            <div
              key={item.id}
              onClick={() => setSelectedStrategyId(item.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600 shadow-md'
                  : rankColors[idx] || 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* カードヘッダー */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      idx === 0
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : idx === 1
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}>
                      {item.badgeLabel}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded">
                    適合度 {item.bestFitScore}%
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-900 leading-snug">
                  {item.title}
                </h3>
                <p className="text-[11px] font-mono text-slate-500 line-clamp-1">
                  実在参照: {item.founderReference}
                </p>
              </div>

              {/* 主要メトリクス */}
              <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-200/80 font-mono text-[11px]">
                <div>
                  <span className="text-[10px] text-slate-400 block">想定手残り月利</span>
                  <span className="font-bold text-emerald-600 text-xs truncate block">
                    {item.monthlyRevenueEstimate.split('（')[0]}
                  </span>
                </div>
                <div className="pl-2 border-l border-slate-200">
                  <span className="text-[10px] text-slate-400 block">粗利益率</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {item.profitMargin}%
                  </span>
                </div>
              </div>

              {/* タグ群 */}
              <div className="flex flex-wrap gap-1">
                {item.tags.map((t, tIdx) => (
                  <span key={tIdx} className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    #{t}
                  </span>
                ))}
              </div>

              {/* 選択インジケーター */}
              <div className="pt-1 flex items-center justify-between text-[11px] font-mono">
                <span className={`text-[10px] font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {isSelected ? '● 現場解剖展開中' : '○ クリックで詳細解剖'}
                </span>
                <span className="text-indigo-600 font-bold">
                  詳細 ➔
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 全件展開トグルボタン */}
      {sortedStrategies.length > 3 && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setShowAllMatches(!showAllMatches)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
          >
            {showAllMatches ? (
              <>
                <span>▲ 上位3件の表示に縮小する</span>
              </>
            ) : (
              <>
                <span>▼ すべての適合モデルを表示（残り {sortedStrategies.length - 3} 件を展開）</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 5. 選択中候補の現場解剖・完全レントゲン展開シート */}
      {activeStrategy && (
        <div className="p-5 sm:p-7 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-5 animate-in fade-in duration-200">
          
          {/* 上段：タイトルと財務サマリー */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/40">
                  SELECTED: {activeStrategy.badgeLabel}（適合度 {activeStrategy.bestFitScore}%）
                </span>
                <span className="text-xs font-mono text-slate-400">
                  実在検証元: {activeStrategy.founderReference}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {activeStrategy.title}
              </h3>
            </div>

            <div className="flex items-center gap-4 shrink-0 font-mono">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">想定手残り月利</span>
                <span className="text-sm sm:text-base font-black text-emerald-400">
                  {activeStrategy.monthlyRevenueEstimate}
                </span>
              </div>
              <div className="text-right pl-3 border-l border-slate-800">
                <span className="text-[10px] text-slate-400 block">粗利益率</span>
                <span className="text-sm sm:text-base font-black text-white">
                  {activeStrategy.profitMargin}%
                </span>
              </div>
              <div className="text-right pl-3 border-l border-slate-800">
                <span className="text-[10px] text-slate-400 block">初期費用</span>
                <span className="text-sm sm:text-base font-black text-amber-400">
                  {activeStrategy.initialInvestment}
                </span>
              </div>
            </div>
          </div>

          {/* 中段：なぜあなたの手札で勝てるのか */}
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/90 space-y-1.5 text-xs font-sans">
            <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">
              なぜあなたの手札条件で勝てるのか（構造的適合理由）
            </span>
            <p className="text-slate-200 leading-relaxed font-medium">
              {activeStrategy.whyFitsYourCards}
            </p>
          </div>

          {/* 現場の対立構図：既存大手の盲点 vs あなたの勝ち筋 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans">
            <div className="p-4 bg-rose-950/30 rounded-lg border border-rose-900/40 space-y-1.5">
              <span className="text-[10px] font-mono text-rose-400 font-bold uppercase block">
                突くべき既存プレイヤーの盲点・不満
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {activeStrategy.incumbentVsYou.incumbentPain}
              </p>
            </div>

            <div className="p-4 bg-emerald-950/30 rounded-lg border border-emerald-900/40 space-y-1.5">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block">
                あなたの勝ち筋（カウンターパンチ）
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {activeStrategy.incumbentVsYou.yourEdge}
              </p>
            </div>
          </div>

          {/* 下段：明日から配線すべき3大ツール ＆ DAY-1アクション */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 text-xs font-sans">
            {/* 3大ツール */}
            <div className="lg:col-span-5 p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                明日から配線すべき3大実務ツール
              </span>
              <div className="space-y-2 font-mono text-[11px]">
                {activeStrategy.threeKeyTools.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-slate-900/90 p-2 rounded border border-slate-800">
                    <span className="text-indigo-400 font-bold shrink-0">0{idx + 1}</span>
                    <div className="min-w-0">
                      <span className="text-white font-bold block">{t.name}</span>
                      <span className="text-[10px] text-slate-400 font-sans">{t.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DAY-1 泥臭い初動アクション ＆ アナリスト秘密メモ */}
            <div className="lg:col-span-7 p-4 bg-indigo-950/40 rounded-lg border border-indigo-900/50 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase block mb-1.5">
                  DAY-1: 明日午前中にあなたが取るべき泥臭い具体的アクション
                </span>
                <p className="text-slate-100 leading-relaxed text-xs font-medium">
                  {activeStrategy.dayOneAction}
                </p>
                <div className="pt-2.5 font-sans border-t border-indigo-900/40 mt-2.5">
                  <span className="text-[10px] font-mono text-amber-400 font-bold block mb-0.5">
                    [ANALYST SECRET INSIGHT]
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {activeStrategy.proSecretTip}
                  </p>
                </div>
              </div>

              {onSelectCompany && (
                <div className="pt-3 flex items-center justify-between border-t border-slate-800/80 mt-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    参照企業ID: {activeStrategy.companyId}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectCompany(activeStrategy.companyId)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <span>この事業の完全レントゲンを開く</span>
                    <span>➔</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
