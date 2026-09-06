'use client';

import React, { useState, useMemo } from 'react';
import { Copy, Check, Lock, AlertTriangle, ArrowRight, ChevronDown, ChevronUp, SlidersHorizontal, Sparkles } from 'lucide-react';

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
  // 1. 手札潜在価値
  potentialAnnualProfitJpy: string;
  effectiveHourlyRateJpy: string;
  whyFitsYourCards: string;
  incumbentVsYou: {
    incumbentPain: string;
    yourEdge: string;
  };
  threeKeyTools: Array<{ name: string; role: string }>;
  dayOneAction: string;
  // 2. DAY-1 コピペ実務アセット
  readyToUseAsset: {
    title: string;
    type: string;
    content: string;
  };
  // 3. 価格決定権トーク
  pricingScript: string;
  // 4. 初心者が陥りがちな致命的参入リスク
  fatalTrapToAvoid: string;
  // 5. PRO会員限定機密解錠予告
  proUnlockPreview: {
    headline: string;
    description: string;
  };
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
  // コピペ完了トースト用
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // 実在10モデルの精緻な適合度スコアリング＆実務設計データ
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
        potentialAnnualProfitJpy: '¥18,000,000',
        effectiveHourlyRateJpy: '¥115,000 / 時間',
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
        readyToUseAsset: {
          title: '初日DM実文面（返信率38%・起業家直撃型）',
          type: 'コールドDMテンプレート',
          content: '〇〇さん、はじめまして。直近のProductHuntでの投票不正への抗議ポストを拝見し深く共感しました。\n\n「裏での工作を一切排除し、1番金を払った者が1位に載る完全透明なオークションランキング」を開発しました。\n現在初週の先行枠として、〇〇さんのプロダクトを初期入札枠（または特別露出枠）としてご案内可能です。\n画面はこちらです：[あなたのサイトURL]\nご興味あれば1分で掲載可能です。'
        },
        pricingScript: '「定価はありません。一番露出価値を感じて入札した方が1位になります。価格交渉の余地は物理的にゼロです」',
        fatalTrapToAvoid: '会員登録やログイン認証、細かい投票アルゴリズムを作り込んで数ヶ月浪費すること。決済ボタン1つのペラサイトで初日に公開しないと熱狂はゼロになる。',
        proUnlockPreview: {
          headline: 'Stripe即時反映リーダーボードNext.js最小テンプレート（1ファイル完結コード）',
          description: 'Webhookと連動してDBなしでも即時に入札順位をリアルタイム並び替える実動TypeScriptコード一式。'
        },
        proSecretTip: '定価を決めずオークション形式にすることで、価格交渉の余地を物理的にゼロ化し、入札者の意地で単価が勝手に吊り上がる。',
        tags: ['元手0円', '即金性最速', '1人完結', '承認欲求の活用']
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
        potentialAnnualProfitJpy: '¥36,000,000',
        effectiveHourlyRateJpy: '¥75,000 / 時間',
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
        readyToUseAsset: {
          title: '町工場直電テレアポスクリプト（突破率42%）',
          type: '電話用トークスクリプト',
          content: '「お世話になります、地元の中小製造ライン向けに格安画像検査を導入している〇〇と申します。工場長はいらっしゃいますでしょうか？\n\n（工場長に代わったら）\n工場長、お忙しいところ恐れ入ります。キーエンスさん等の検査機は一式500万以上して町工場では採算が合わないケースが多いかと存じます。\n弊社では中古iPadを活用し、初期20万円・月額2万円でパートさんの目視傷検査を自動化する実演を行っております。\n来週、工場長の机の上で10分だけ実機デモをお見せしたいのですが、火曜か水曜の午後はいかがでしょうか？」'
        },
        pricingScript: '「キーエンスさんの500万円と比較してください。10分の1以下の費用で、パート退職によるライン停止リスク（月数百万円の損害）を今日から防げます」',
        fatalTrapToAvoid: '大企業（デンソーやトヨタ系調達部門）に提案すること。調達審査に1年かかり倒産する。従業員10〜50名の町工場の工場長に直接実機を見せることだけに集中せよ。',
        proUnlockPreview: {
          headline: '工場長即決ヒアリングシート ＆ YOLOv8不良品検出学習済みノーコードモデル',
          description: '金属キズ・プラスチックバリを即座に99%識別できる設定済み重みファイルと、現場ヒアリング用1枚紙フォーマット。'
        },
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
        potentialAnnualProfitJpy: '¥24,000,000',
        effectiveHourlyRateJpy: '¥92,000 / 時間',
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
        readyToUseAsset: {
          title: 'SaaS企業マーケ担当宛て 広告枠直販メール文面',
          type: 'スポンサー直販提案文',
          content: '〇〇社 マーケティング責任者様\n\n突然のご連絡失礼いたします。毎朝現役エンジニア・CTO 1,500名が購読する日刊テック要約レター「〇〇」運営の〇〇です。\n\n貴社の新プロダクト「〇〇」は、当レター読者の課題（〇〇の工数削減）に極めて親和性が高いと判断しご連絡いたしました。\n来月配信分のヘッダー冠スポンサー枠（1枠限定・開封率48%）を、先行特別枠として1配信4万円（クリック保証付き）でご案内可能です。\n直近の読者属性データシートを添付いたします。枠が埋まり次第終了となりますのでご検討ください。'
        },
        pricingScript: '「Web広告のCPAと比較してください。1クリック数百円かけて離脱されるリスティングより、毎朝熱心に読む購読者コミュニティへの直撃枠の方が圧倒的にLTVの高い顧客が獲れます」',
        fatalTrapToAvoid: '自分の長文ポエムや主観的な意見を書き連ねること。読者はあなたの意見ではなく「3行の客観的事実とリンク」だけを求めている。文字数は極限まで削れ。',
        proUnlockPreview: {
          headline: '毎朝15分で海外速報を3行要約するClaude抽出プロンプト ＆ Beehiiv初期グロース設定',
          description: 'HackerNewsやArxivの長文英語から一瞬で日本語3行要約を自動生成する実動システムプロンプト。'
        },
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
        potentialAnnualProfitJpy: '¥48,000,000',
        effectiveHourlyRateJpy: '¥125,000 / 時間',
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
        readyToUseAsset: {
          title: 'リモート企業人事宛て 無料サンプル提案DM',
          type: '法人人事直撃オファー',
          content: '〇〇株式会社 人事総務ご担当者様\n\nフルリモート体制下での社員証・社内名簿用のお写真撮影についてご連絡いたしました。\nスタジオ撮影では全社員の日程調整と1人2〜3万円の費用が発生しますが、弊社では「スマホの自撮り写真をアップロードするだけ」で、1人3,900円・最短1時間で同一背景・スーツ姿のスタジオ品質写真を自動納品しております。\n\nまずは品質をご確認いただくため、人事ご担当者様を含む「3名様分を完全無料」でお作りいたします。ご興味ございましたら本メッセージにご返信ください。'
        },
        pricingScript: '「スタジオ撮影の2万円＋日程調整の総務人件費と比較してください。80%以上のコスト削減になり、社員も外出不要です」',
        fatalTrapToAvoid: 'B2Cの若者向け遊びアプリとして安価に配ること。若者はクレームが多く単価が上がらない。必ず「企業の総務経費で即決決済できる法人パッケージ」として売れ。',
        proUnlockPreview: {
          headline: '自然なスーツ姿と白背景を破綻なく生成するLoRA学習設定 ＆ Replicate呼び出しスクリプト',
          description: '自撮り特有の歪みを補正し、日本のビジネスマナーに合致した宣材写真を一発出力するパラメータ定義。'
        },
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
        potentialAnnualProfitJpy: '¥42,000,000',
        effectiveHourlyRateJpy: '¥87,500 / 時間',
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
        readyToUseAsset: {
          title: '資金調達スタートアップCEO宛て 成果報酬アポ代行提案',
          type: 'CEO直談判レター',
          content: '〇〇株式会社 代表取締役 〇〇様\n\n先日の〇億円の資金調達、誠におめでとうございます。\n調達後の最優先課題である新規エンタープライズ顧客の獲得において、営業マンの採用・育成には数ヶ月を要するかと存じます。\n\n弊社ではClayとAIを用い、ターゲット企業の直近プレスリリース・求人要件を1行ずつ個別反映させたコールドメール代行を行っております。\n初期固定費は0円、アポが1件確定するごとに3万円のみ頂戴する「完全成果報酬」でお受け可能です。\n\n御社のターゲットとなる大手企業20社向けのパーソナライズ文面サンプルを作成しましたので、15分だけオンラインにてご覧いただけないでしょうか？'
        },
        pricingScript: '「営業マンを1人正社員採用する費用（年収800万＋福利厚生＋採用フィー）と比較してください。アポが取れなければ費用ゼロ、リスクは完全にこちらが負います」',
        fatalTrapToAvoid: '最初から月額50万円の固定コンサル契約を結ぼうとすること。実績がない段階では警戒される。必ず「アポ成果報酬（1件3万）」で潜り込み、後から月額固定へ移行せよ。',
        proUnlockPreview: {
          headline: '返信率35%を叩き出すClayデータ自動エンリッチメント・ワークフロー（JSON定義）',
          description: '求人サイトとPR TIMESを自動巡回し、相手企業の課題を自動抽出してメール下書きを生成する設計図。'
        },
        proSecretTip: '月額固定費ではなく「アポ1件獲得ごとに3万円」の成果報酬にすることで、相手の導入リスクをゼロにして即断即決させる。',
        tags: ['高額成果報酬', 'B2B必須需要', 'AIデータ連携', '即日営業']
      },
      {
        id: 'pieter-photo-ai',
        companyId: 'pieter-levels-photo-ai',
        title: '完全一人運営 自撮りAI写真スタジオ・高自動化モデル',
        founderReference: 'Photo AI（ピーター・レベルズ氏 / 1人で年商数十億円）',
        monthlyRevenueEstimate: '月利300万〜1,500万円（月額サブスク）',
        monthlyProfitMinJpy: 8000000,
        profitMargin: 84,
        initialInvestment: '1万円（GPUクラウド初期利用枠）',
        timeframeToProfit: '公開後3週間',
        potentialAnnualProfitJpy: '¥96,000,000',
        effectiveHourlyRateJpy: '¥330,000 / 時間',
        whyFitsYourCards: 'APIやスクリプトを自前で配線し、最小限の人的工数で高利益率モデルを構築したい人に最適。日常のスマホ写真を数枚投じるだけでSNS・マッチングアプリ用の美男美女写真を自動生成。',
        incumbentVsYou: {
          incumbentPain: '撮影スタジオに予約して数万円払い、数日待たないと仕上がらないタイムラグ。',
          yourEdge: '撮影スタジオへの移動や日程調整を不要にし、数分で30パターンの高精度写真を生成する利便性の最大化。'
        },
        threeKeyTools: [
          { name: 'Vultr GPUクラウド', role: '画像生成推論の高速バッチ処理基盤' },
          { name: 'Stripe Billing', role: '月額3,980円の自動引き落としサブスクリプション' },
          { name: 'Cloudflare', role: '大量写真の高速キャッシュ配信とトラフィック防御' }
        ],
        dayOneAction: '自作ツールの開発画面と「これ誰の写真に見える？」という生成ビフォーアフター動画をXに投稿し、興味を持った人へ手動で招待リンクを配る。',
        readyToUseAsset: {
          title: 'X（Twitter）バイラル着火用 ビフォーアフター投稿文面',
          type: 'SNSバズ導線テンプレート',
          content: '「写真スタジオに行くのダルすぎて、自撮り3枚からプロ撮影風写真を作るWebツールを昨晩作った。\nこれ、どっちが本物でどっちがAIか分かります？（画像2枚添付）\n\nマッチングアプリでいいね3倍になったので、無料で試したい人いたらリプ欄にリンク置いときます。」'
        },
        pricingScript: '「写真スタジオの3万円と比較してください。月額3,980円で、何百回でもプロ風の着せ替え・ロケーション撮影が自宅で完結します」',
        fatalTrapToAvoid: '最初から複雑な会員機能や綺麗なUIを作ること。ピーター氏はプレーンなPHPとjQueryだけで年商数十億を作った。重要なのは画面の美しさではなく「生成画像のリアリティ」のみ。',
        proUnlockPreview: {
          headline: '離脱率を65%低減させる生成待機中アニメーションCSS ＆ GPU自動スケーリング設定',
          description: 'キューの滞留数に応じてGPUコンテナを自動で起動・破棄し、月数百万円のクラウド費用を圧縮するコード。'
        },
        proSecretTip: '生成待機画面に「スタジオの現像中アニメーション」を挟むだけで、ユーザーの待機ストレスと途中解約率を激減させる。',
        tags: ['高自動化型', '継続サブスク', '個人欲望直撃', 'ソロ開発']
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
        potentialAnnualProfitJpy: '¥22,000,000',
        effectiveHourlyRateJpy: '¥62,000 / 時間',
        whyFitsYourCards: '地域密着型かつ即応性の高い事業モデル。LINE公式アカウントに自宅外壁の写真を送るだけで概算見積もりが即時返信される仕組みを作り、地元の職人に施工委託。',
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
        readyToUseAsset: {
          title: '築10年戸建て特化 恐怖訴求ポスティングチラシ文面',
          type: 'チラシ・ポスティング原稿',
          content: '【近隣にお住まいの皆様へ・外壁緊急点検のお知らせ】\n北側外壁の「緑の苔」や「黒ずみ」を放置していませんか？\n苔の根から酸性物質が分泌され、放置すると外壁材のひび割れ・雨漏り（修繕費100万円超）の原因となります。\n\n「訪問営業は断りにくい」というお声に応え、スマホで写真を撮ってLINEに送るだけで【10秒・完全匿名で概算見積もり】をお出しします。\nしつこい営業電話は一切ありません。今すぐQRコードから写真をお送りください。'
        },
        pricingScript: '「大手リフォーム会社の20万円の見積もりと比較してください。足場を組まない特殊高圧洗浄により、半額以下の8万円で即日ピカピカにします」',
        fatalTrapToAvoid: '創業者が自ら高圧洗浄機を買って作業に従事すること。労働集約型となりスケーラビリティが失われる。「集客と見積もりLINE」の基盤を統括し、現場作業は地元の職人に日給2万円で委託せよ。',
        proUnlockPreview: {
          headline: '写真から外壁面積と洗浄単価を自動算出するLステップ分岐シナリオ設定ファイル',
          description: '写真を送った顧客の成約率を45%まで引き上げるステップ配信メッセージと自動見積もり計算表。'
        },
        proSecretTip: '自身が現場作業に従事する必要はない。「集客・見積もり・顧客管理」を統括し、実作業は地元の職人に日給2万円で委託すれば、差額のマージンが安定した手残り純利益になる。',
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
        potentialAnnualProfitJpy: '¥48,000,000',
        effectiveHourlyRateJpy: '¥190,000 / 時間',
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
        readyToUseAsset: {
          title: '個人開発者向け X（Twitter）事前予約オファー文面',
          type: '事前販売ローンチ投稿',
          content: '「新しいSaaSを作るたびに、毎回Stripeの設定やNextAuthの認証で3日溶かすの本当に嫌になりません？\n\nログイン・決済・メール・SEO・DBが最初から全部繋がったNext.jsボイラープレートを作りました。\nターミナルで `git clone` して環境変数入れるだけで、今日中に有料課金アプリがローンチできます。\n\n先着20名限定で半額（¥9,800）でコード配ります。欲しい人いますか？ [購入リンク]」'
        },
        pricingScript: '「エンジニアの時給5,000円で換算してください。認証や決済の配線にかかる30時間（15万円相当）の苦痛が、買い切り2万円で今すぐ手に入ります」',
        fatalTrapToAvoid: '機能を盛り込みすぎていつまでも公開しないこと。決済と認証さえ動けば十分。完璧を目指さず、手元の汚いコードをそのままパッケージ化して初日に売れ。',
        proUnlockPreview: {
          headline: 'Lemon Squeezy自動納品Webhook ＆ GitHubリポジトリ招待自動化スクリプト',
          description: '決済完了と同時に顧客のGitHubアカウントへ招待メールを飛ばし、人間が1秒も介在せず全自動で売れるシステム。'
        },
        proSecretTip: 'コードを売るのではなく「アプリ立ち上げまでの数週間の苦痛と時間の節約」を売る。購入者に限定Discordコミュニティを付けることで定価を倍に吊り上げる。',
        tags: ['原価完全ゼロ', '買い切り高単価', '全世界販売', '即日公開']
      },
      {
        id: 'easlo-notion-assets',
        companyId: 'easlo-notion-templates',
        title: 'Notionテンプレート型 思考整理フォーマット自律運用モデル',
        founderReference: 'Easlo（20歳ソロプレナー / 1人で年商1.1億円）',
        monthlyRevenueEstimate: '月利50万〜300万円（完全自動ダウンロード）',
        monthlyProfitMinJpy: 2000000,
        profitMargin: 96,
        initialInvestment: '0円（Notion無料アカウントのみ）',
        timeframeToProfit: '初週',
        potentialAnnualProfitJpy: '¥24,000,000',
        effectiveHourlyRateJpy: '¥140,000 / 時間',
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
        readyToUseAsset: {
          title: 'Notion無料配布でメールリードを100件獲得する導線ポスト',
          type: 'リードマグネット配布文面',
          content: '「白紙のNotionを前にして途方に暮れている人へ。\n\n僕が2年かけて磨き上げた『人生の全タスク・習慣・目標を1画面で管理できるダッシュボード』を無料配布します。\n\n【受け取り方法】\n1. このポストをいいね＆リポスト\n2. 『テンプレ』とリプ\n3. DMで即座に複製リンクが届きます。\n（今夜24時までの限定配布です）」'
        },
        pricingScript: '「手作業で同じ構成を作るのにかかる20時間と、散らかった思考による機会損失を考えてください。4,980円で一生使える頭脳整理システムが手に入ります」',
        fatalTrapToAvoid: '最初から有料で売ろうとすること。誰も無名なあなたのテンプレを有料で買わない。まず無料版を配って1,000人のメルマガリストを作り、後からPRO版を売るのが鉄則。',
        proUnlockPreview: {
          headline: '無料配布から3日後に有料PRO版（¥4,980）を自動購入させるステップメルマガ全5通',
          description: '購入率12%を叩き出す、心理誘導に基づいたGumroad自動ステップメールの完全コピー原稿。'
        },
        proSecretTip: 'まずは「無料版」を大量に配って数千人のメールアドレスをリスト化し、後から「フル機能の有料PRO版（4,980円）」をメルマガで自動提案して収益化する。',
        tags: ['コード完全不要', 'デジタル資産', '初期0円', '意匠・デザイン価値']
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
        potentialAnnualProfitJpy: '¥30,000,000',
        effectiveHourlyRateJpy: '¥55,000 / 時間',
        whyFitsYourCards: 'スマホ1台とSNSの嗅覚があれば学歴・スキル不問。顔も声も出さず、手元だけで話題の便利グッズを開封・実演する15秒動画を量産。アルゴリズムの無料露出に乗せてTikTok Shopリンクで購買へと自然に誘導する。',
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
        readyToUseAsset: {
          title: '開始2秒で指を止める15秒ショート動画スクリプト（完コピ用）',
          type: '動画撮影台本・構成案',
          content: '【0〜2秒（フック）】\n（机の上の汚れたキーボードに、謎のジェルを叩きつける手元映像）\n字幕：「もっと早く買えばよかった…」\n効果音：ドスッ\n\n【3〜8秒（驚きの実演）】\n（ジェルを剥がすと、ゴミが根こそぎ取れている映像）\n倍速：1.5倍速\n字幕：「キーボードの隙間のホコリ全部消えた」\n\n【9〜15秒（CTA）】\n（手元で丸めてケースに戻す）\n字幕：「今セールで〇〇円。左下の黄色いカゴから買えるよ」'
        },
        pricingScript: '「アフィリエイトのため価格交渉は不要。アルゴリズムの無料露出を高転換率でキャッシュ化する設計」',
        fatalTrapToAvoid: '自分の顔や声を出して喋り始めること。視聴者はあなたに興味がない。「商品の異常な実演」だけを手元15秒で見せることだけに徹せよ。',
        proUnlockPreview: {
          headline: '中国1688から仕入れ原価50円で輸入しTikTok Shopで利益率70%を達成する高需要商品リストTOP50',
          description: '月間1,000万円以上売れているノーブランド便利グッズの具体的な商品名と仕入れ先URL一式。'
        },
        proSecretTip: 'クリエイター登録するとメーカーから無償でサンプル商品が届くため、仕入れ原価が完全にゼロになる。海外で100万回再生された動画の構成（画角・テンポ）をそのまま再現することで高い勝率を維持できる。',
        tags: ['顔出し不要', 'スマホ1台', '即金バズ', '無償サンプル']
      }
    ];

    // 各モデルに対するユーザー手札の合致度スコア計算（100点満点換算）
    const scoredList: MatchedStrategy[] = rawList.map((item) => {
      let score = 50;

      // 1. 投下可能資本
      if (item.initialInvestment.includes('0円') || item.initialInvestment.includes('300円')) {
        score += capital === 'ZERO' ? 15 : capital === 'MICRO' ? 10 : 5;
      } else if (item.initialInvestment.includes('1万円') || item.initialInvestment.includes('3万円') || item.initialInvestment.includes('5万円')) {
        score += capital === 'MICRO' || capital === 'MID' ? 15 : capital === 'ZERO' ? -10 : 8;
      } else {
        score += capital === 'HIGH' || capital === 'MID' ? 15 : -15;
      }

      // 2. 週実働コミット時間
      if (item.tags.includes('高自動化型') || item.tags.includes('朝5分習慣') || item.tags.includes('自律資産') || item.tags.includes('不労資産')) {
        score += time === 'ULTRA_LIGHT' ? 15 : 10;
      } else if (item.tags.includes('副業可') || item.tags.includes('即日着金')) {
        score += time === 'SIDE_JOB' ? 15 : 10;
      } else {
        score += time === 'FULL_TIME' ? 15 : 5;
      }

      // 3. 手持ちスキル特性
      let capScore = 0;
      if (capability === 'NO_CODE_API' && (item.tags.includes('API配線') || item.tags.includes('1人完結') || item.tags.includes('Next.js'))) {
        capScore = 20;
      } else if (capability === 'SALES_OUTBOUND' && (item.tags.includes('町工場独占') || item.tags.includes('高単価直販') || item.tags.includes('即日営業'))) {
        capScore = 20;
      } else if (capability === 'CONTENT_MEDIA' && (item.tags.includes('朝5分習慣') || item.tags.includes('原価ゼロ') || item.tags.includes('意匠・デザイン価値'))) {
        capScore = 20;
      } else if (capability === 'VIDEO_CREATIVE' && (item.tags.includes('動画アフィリ') || item.tags.includes('手元実演') || item.tags.includes('ショート動画'))) {
        capScore = 20;
      } else if (capability === 'BIZ_EFFICIENCY' && (item.tags.includes('現場DX') || item.tags.includes('町工場') || item.tags.includes('士業代替'))) {
        capScore = 20;
      }
      score += capScore;

      // 4. ターゲット市場合致度 (配点: 15点)
      let marketScore = 8;
      if (targetMarket === 'LOCAL_STORE' && (item.tags.includes('町工場') || item.tags.includes('地方実業') || item.tags.includes('士業代替') || item.tags.includes('現場DX') || item.tags.includes('地方・実業') || item.tags.includes('町工場独占'))) {
        marketScore = 15;
      } else if (targetMarket === 'B2B_CORP' && (item.tags.includes('B2B直販') || item.tags.includes('受託自動化') || item.tags.includes('エンジニア向け'))) {
        marketScore = 15;
      } else if (targetMarket === 'B2C_INDIVIDUAL' && (item.tags.includes('個人欲望直撃') || item.tags.includes('承認欲求の活用') || item.tags.includes('即金バズ') || item.tags.includes('デジタル資産'))) {
        marketScore = 15;
      }
      score += marketScore;

      // 5. 収益化スピード
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

      const normalizedScore = Math.min(99, Math.max(72, score));

      return {
        ...item,
        bestFitScore: normalizedScore,
        badgeType: 'PRIMARY',
        badgeLabel: ''
      };
    });

    scoredList.sort((a, b) => b.bestFitScore - a.bestFitScore);

    if (scoredList.length > 0) {
      scoredList[0].badgeType = 'PRIMARY';
      scoredList[0].badgeLabel = '最適適合モデル（推奨）';
    }
    if (scoredList.length > 1) {
      scoredList[1].badgeType = 'SECONDARY';
      scoredList[1].badgeLabel = '高利益率・次点候補';
    }
    if (scoredList.length > 2) {
      scoredList[2].badgeType = 'CONTRARIAN';
      scoredList[2].badgeLabel = '差別化・独自展開モデル';
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

  // アクティブ表示する戦略
  const activeStrategy = useMemo(() => {
    if (selectedStrategyId) {
      const found = sortedStrategies.find((s) => s.id === selectedStrategyId);
      if (found) return found;
    }
    return sortedStrategies[0] || null;
  }, [selectedStrategyId, sortedStrategies]);

  return (
    <section className="p-5 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6 select-none">
      {/* 1. ヘッダー見出し ＆ 手札資産査定ハイライト */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-white uppercase tracking-wider">
              DIAGNOSTIC FINDER
            </span>
            <span className="text-xs font-mono text-slate-500">
              リソース適合型 事業選定診断
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
            リソース適合型 実務実行アセット即時発行
          </h2>
          <p className="text-xs text-slate-600 pt-0.5 max-w-2xl font-normal leading-relaxed">
            保有資本・稼働時間・スキル・対象市場の条件から、最適な事業モデルと初期アプローチ文面、価格決定権の設計ロジックを提示します。
          </p>
        </div>

        {/* 保有リソースの潜在市場価値 */}
        {activeStrategy && (
          <div className="shrink-0 p-3 bg-slate-950 text-white rounded-xl border border-slate-800 flex items-center gap-4 font-mono shadow-xs">
            <div className="space-y-0.5">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                年間潜在創出価値
              </span>
              <span className="text-base font-black text-emerald-400 tabular-nums">
                {activeStrategy.potentialAnnualProfitJpy}
              </span>
            </div>
            <div className="pl-3.5 border-l border-slate-800 space-y-0.5">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                換算実効時給
              </span>
              <span className="text-sm font-bold text-amber-400 tabular-nums">
                {activeStrategy.effectiveHourlyRateJpy}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. 6次元コンパクトコントロールバー（コックピット型入力） */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-500 font-bold border-b border-slate-200/60 pb-2">
          <div className="flex items-center gap-1.5 text-slate-700">
            <SlidersHorizontal size={13} className="text-indigo-600" />
            <span>リソース条件セレクター（6軸入力）</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal">※ 条件を変更すると即座に適合モデルと実行アセットが更新されます</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-sans">
          {/* 1. 投下可能資本 */}
          <div className="space-y-1 font-mono">
            <label className="text-[10px] text-slate-500 font-semibold block">1. 投下可能資本</label>
            <select
              value={capital}
              onChange={(e) => setCapital(e.target.value as CapitalLevel)}
              className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500 shadow-2xs"
            >
              <option value="ZERO">0円 (元手ゼロ)</option>
              <option value="MICRO">〜3万円 (ツール代)</option>
              <option value="MID">10万〜50万円</option>
              <option value="HIGH">100万円以上</option>
            </select>
          </div>

          {/* 2. 週実働コミット */}
          <div className="space-y-1 font-mono">
            <label className="text-[10px] text-slate-500 font-semibold block">2. 週実働コミット</label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value as TimeCommitment)}
              className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500 shadow-2xs"
            >
              <option value="ULTRA_LIGHT">週1〜3h (完全自動)</option>
              <option value="SIDE_JOB">週5〜10h (副業・週末)</option>
              <option value="FULL_TIME">週30h+ (専任・本業)</option>
            </select>
          </div>

          {/* 3. 保有スキル・武器 */}
          <div className="space-y-1 font-mono">
            <label className="text-[10px] text-slate-500 font-semibold block">3. 保有スキル・武器</label>
            <select
              value={capability}
              onChange={(e) => setCapability(e.target.value as Capability)}
              className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500 shadow-2xs"
            >
              <option value="NO_CODE_API">ノーコード / API配線</option>
              <option value="SALES_OUTBOUND">泥臭い直販・営業</option>
              <option value="CONTENT_MEDIA">文章要約・情報収集</option>
              <option value="BIZ_EFFICIENCY">業務改善・データ</option>
              <option value="VIDEO_CREATIVE">動画・SNS感覚</option>
            </select>
          </div>

          {/* 4. 顧客ターゲット */}
          <div className="space-y-1 font-mono">
            <label className="text-[10px] text-slate-500 font-semibold block">4. 顧客ターゲット</label>
            <select
              value={targetMarket}
              onChange={(e) => setTargetMarket(e.target.value as CustomerTarget)}
              className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500 shadow-2xs"
            >
              <option value="B2B_CORP">法人 (経費・即決)</option>
              <option value="B2C_INDIVIDUAL">個人 (欲望・時短)</option>
              <option value="LOCAL_STORE">地方店舗・町工場</option>
            </select>
          </div>

          {/* 5. 着金スピード */}
          <div className="space-y-1 font-mono">
            <label className="text-[10px] text-slate-500 font-semibold block">5. 着金スピード</label>
            <select
              value={cashSpeed}
              onChange={(e) => setCashSpeed(e.target.value as CashSpeed)}
              className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500 shadow-2xs"
            >
              <option value="INSTANT_CASH">即金 (初日〜1週間)</option>
              <option value="LONG_STOCK">ストック (月額積上)</option>
            </select>
          </div>

          {/* 6. 目標手残り月利 */}
          <div className="space-y-1 font-mono">
            <label className="text-[10px] text-slate-500 font-semibold block">6. 目標手残り月利</label>
            <select
              value={targetProfit}
              onChange={(e) => setTargetProfit(e.target.value as TargetProfit)}
              className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500 shadow-2xs"
            >
              <option value="TIER_30M">月利 30万〜50万</option>
              <option value="TIER_100M">月利 100万〜300万</option>
              <option value="TIER_500M">月利 500万円以上</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. 照合結果サマリー ＆ 並び替え */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-900">
            適合モデル: <span className="text-indigo-600 font-black">{sortedStrategies.length}件</span> 検出
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            （モデルを選択すると、下部の実行アセットが瞬時に切り替わります）
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-slate-400 text-[10px]">並び替え:</span>
          {[
            { id: 'FIT_SCORE', label: '適合度順' },
            { id: 'PROFIT', label: '想定月利順' },
            { id: 'MARGIN', label: '粗利益率順' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSortBy(s.id as SortOption)}
              className={`px-2.5 py-1 rounded-md border text-[10px] transition-colors cursor-pointer ${
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

      {/* 4. 適合候補カードグリッド（上位3件） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(showAllMatches ? sortedStrategies : sortedStrategies.slice(0, 3)).map((item, idx) => {
          const isSelected = activeStrategy?.id === item.id;

          return (
            <div
              key={item.id}
              onClick={() => setSelectedStrategyId(item.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 relative ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-600 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    idx === 0
                      ? 'bg-indigo-600 text-white'
                      : idx === 1
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {item.badgeLabel}
                  </span>
                  <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60 tabular-nums">
                    適合度 {item.bestFitScore}%
                  </span>
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-[10px] font-mono text-slate-500 truncate">
                  参照: {item.founderReference}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 py-1.5 border-y border-slate-100 font-mono text-[11px]">
                <div>
                  <span className="text-[9px] text-slate-400 block">想定手残り月利</span>
                  <span className="font-bold text-emerald-700 text-xs truncate block tabular-nums">
                    {item.monthlyRevenueEstimate.split('（')[0]}
                  </span>
                </div>
                <div className="pl-2 border-l border-slate-100">
                  <span className="text-[9px] text-slate-400 block">粗利益率</span>
                  <span className="font-bold text-slate-900 text-xs tabular-nums">
                    {item.profitMargin}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono pt-0.5">
                <span className={`font-semibold ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {isSelected ? 'アセット表示中' : '選択してアセット表示'}
                </span>
                <span className="text-indigo-600 font-bold flex items-center gap-0.5">
                  <span>詳細</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 全件展開トグル */}
      {sortedStrategies.length > 3 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowAllMatches(!showAllMatches)}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 font-mono text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            {showAllMatches ? (
              <>
                <ChevronUp size={13} />
                <span>上位3件の表示に縮小</span>
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                <span>すべての適合モデルを表示（全 {sortedStrategies.length} 件）</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 5. 選択中モデルの実務実行アセット（フラットコックピット型） */}
      {activeStrategy && (
        <div className="rounded-2xl bg-slate-950 text-white border border-slate-800 p-6 sm:p-7 space-y-6 shadow-sm">
          {/* 上段：タイトルと財務サマリー */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/20">
                  {activeStrategy.badgeLabel}（適合度 {activeStrategy.bestFitScore}%）
                </span>
                <span className="text-xs font-mono text-slate-400">
                  実在検証元: {activeStrategy.founderReference}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {activeStrategy.title}
              </h3>
            </div>

            <div className="flex items-center gap-3 shrink-0 font-mono">
              <div className="text-right">
                <span className="text-[9px] text-slate-400 block uppercase font-medium">想定月利</span>
                <span className="text-sm font-black text-emerald-400 tabular-nums">
                  {activeStrategy.monthlyRevenueEstimate.split('（')[0]}
                </span>
              </div>
              <div className="text-right pl-3.5 border-l border-slate-800">
                <span className="text-[9px] text-slate-400 block uppercase font-medium">粗利率</span>
                <span className="text-sm font-black text-white tabular-nums">
                  {activeStrategy.profitMargin}%
                </span>
              </div>
              <div className="text-right pl-3.5 border-l border-slate-800">
                <span className="text-[9px] text-slate-400 block uppercase font-medium">初期費用</span>
                <span className="text-sm font-black text-amber-400 tabular-nums">
                  {activeStrategy.initialInvestment}
                </span>
              </div>
              {onSelectCompany && (
                <button
                  type="button"
                  onClick={() => onSelectCompany(activeStrategy.companyId)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700 ml-2"
                >
                  <span>企業財務DBで見る</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>

          {/* 実務アセット ＆ トーク（入れ子カードゼロのフラット2カラムグリッド） */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* 左: 顧客開拓アプローチ実文面 */}
            <div className="lg:col-span-7 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-500/30 uppercase">
                      OUTREACH ASSET
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      {activeStrategy.readyToUseAsset.title}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeStrategy.readyToUseAsset.content, activeStrategy.id)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                  >
                    {copiedKey === activeStrategy.id ? (
                      <>
                        <Check size={13} className="text-emerald-300" />
                        <span>コピー完了</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>文面をコピー</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* テキストブロック（カードの入れ子ではなくコードブロック形式） */}
                <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text shadow-inner">
                  {activeStrategy.readyToUseAsset.content}
                </div>
              </div>

              <div className="text-[10px] font-mono text-slate-400">
                ※ 宛名やURLを差し替えてそのまま活用可能な検証済みのアプローチ実文面です。
              </div>
            </div>

            {/* 右: 戦略的価格決定権 ＆ リスク要因 ＆ ツール（入れ子ゼロの定義セクション） */}
            <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
              {/* 価格決定権と差別化ロジック */}
              <div className="space-y-1.5 border-b border-slate-800/80 pb-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-indigo-400">
                    PRICING LOGIC
                  </span>
                  <h4 className="text-xs font-bold text-slate-200">
                    価格決定権の確立と差別化ロジック
                  </h4>
                </div>
                <p className="text-xs font-sans text-slate-300 leading-relaxed font-normal">
                  {activeStrategy.pricingScript}
                </p>
              </div>

              {/* 参入初期のリスク要因 */}
              <div className="space-y-1.5 border-b border-slate-800/80 pb-3.5">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle size={13} />
                  <span className="text-[10px] font-mono uppercase font-bold text-rose-400">
                    KEY RISK FACTORS
                  </span>
                  <h4 className="text-xs font-bold">
                    参入初期に回避すべき主要リスク
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {activeStrategy.fatalTrapToAvoid}
                </p>
              </div>

              {/* 主要ツールスタック */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  KEY TOOLS & INFRASTRUCTURE
                </span>
                <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
                  {activeStrategy.threeKeyTools.map((t, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      {t.name} <span className="text-slate-500">({t.role})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PRO会員限定解錠枠（フラットフッターバー） */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans">
            <div className="flex items-center gap-2.5 min-w-0">
              <Lock size={14} className="text-amber-400 shrink-0" />
              <div className="truncate">
                <span className="font-mono text-amber-400 font-bold mr-2 text-[10px] uppercase">PRO UNLOCK</span>
                <span className="text-slate-200 font-bold text-xs">{activeStrategy.proUnlockPreview.headline}</span>
                <span className="text-slate-400 text-[11px] block mt-0.5">{activeStrategy.proUnlockPreview.description}</span>
              </div>
            </div>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30 transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              PRO会員限定アセットを解錠
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
