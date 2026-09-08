'use client';

import React, { useState, useMemo } from 'react';
import { Copy, Check, Lock, AlertTriangle, ArrowRight, SlidersHorizontal, Sparkles, CheckCircle2 } from 'lucide-react';

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
  potentialAnnualProfitJpy: string;
  effectiveHourlyRateJpy: string;
  whyFitsYourCards: string;
  incumbentVsYou: {
    incumbentPain: string;
    yourEdge: string;
  };
  threeKeyTools: Array<{ name: string; role: string }>;
  dayOneAction: string;
  readyToUseAsset: {
    title: string;
    type: string;
    content: string;
  };
  pricingScript: string;
  fatalTrapToAvoid: string;
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
  // セレクター折りたたみトグル
  const [isSelectorOpen, setIsSelectorOpen] = useState(true);
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
          incumbentPain: '無料投票サイト（Product Hunt等）の談合・自作自演に嫌気がさした起業家が、確実な露出枠を求めている。',
          yourEdge: '「最高額入札者が即座に1位になる」という完全透明ルールで、起業家の意地とプライドを入札合戦へ昇華。'
        },
        threeKeyTools: [
          { name: 'Next.js / Tailwind', role: '3時間で実装可能な超軽量フロントエンド' },
          { name: 'Stripe Checkout', role: '入札時のカード即時決済・ウェブフック連携' },
          { name: 'Supabase', role: '入札履歴・ランキングのリアルタイム同期' }
        ],
        dayOneAction: 'Xのインディー開発者コミュニティで「一番金を払った奴のプロダクトをトップに固定する実験サイト作った」とツイートする。',
        readyToUseAsset: {
          title: 'ローンチ即日バイラル告知ポスト文面',
          type: 'X（Twitter）告知テンプレート',
          content: '【実験】一番金を払った人が1位になるランキングサイトを作りました。\n\n裏での根回しや自作自演投票は一切なし。\nルールは1つ：現在の1位より1ドル多くStripeで払えば、その瞬間からあなたが1位です。\n現在の1位：〇〇（入札額：$150）\n\nあなたのプロダクトを今すぐ世界一目立たせる 👉 [URL]'
        },
        pricingScript: '「価格は市場が決めます。1位の露出効果に価値を感じる競合がいる限り、入札額は自動的に吊り上がります」',
        fatalTrapToAvoid: '複雑な多機能ポータルを作ろうとすること。機能が増えるほど開発が遅れ、ネタとしての鮮度とバイラル性が死ぬ。3時間で作れる単一機能に絞れ。',
        proUnlockPreview: {
          headline: '48時間で2,000万円を生んだ「Stripe Webhook即時反映スクリプト」＆ 最短ローンチチェックリスト',
          description: '入札発生からランキングDB更新、Xへの自動通知botまでを1枚のコードにまとめた実動実装アセット。'
        },
        proSecretTip: '初期入札が止まった時は、自分が所有する別プロダクトで少額入札を入れ、意図的に「抜かれた起業家の対抗心」を煽る。',
        tags: ['即金性最速', '1人完結', '初期0円', 'API配線', '承認欲求の活用']
      },
      {
        id: 'ipad-factory-inspection',
        companyId: 'keyence-challenger-edge',
        title: '中古iPad格安AI外観検査システム',
        founderReference: '地方町工場特化AI外観検査（キーエンス対抗・月利150万）',
        monthlyRevenueEstimate: '月利100万〜250万円（初期導入＋月額保守）',
        monthlyProfitMinJpy: 1500000,
        profitMargin: 82,
        initialInvestment: '3万円（中古iPad端末代）',
        timeframeToProfit: '初回提案から14日',
        potentialAnnualProfitJpy: '¥18,000,000',
        effectiveHourlyRateJpy: '¥65,000 / 時間',
        whyFitsYourCards: '地方町工場の高齢化と人手不足に直結。キーエンスの見積もり500万円に絶望した工場長に対し、中古iPad＋Teachable Machineで初期20万＋月1.5万保守を即決導入。',
        incumbentVsYou: {
          incumbentPain: 'キーエンス等の検査装置は一式500万〜1,000万円し、中小町工場では投資回収の目処が立たない。',
          yourEdge: '中古iPadのカメラとクラウド画像判定AIを組み合わせ、10分の1以下の費用で「不良品の見逃し」をゼロ化。'
        },
        threeKeyTools: [
          { name: '中古iPad (第8世代以降)', role: '製造ライン設置用の高精細カメラ兼端末' },
          { name: 'Teachable Machine / Roboflow', role: 'ノーコードでのキズ・バリ画像判定モデル学習' },
          { name: 'LINE Notify', role: '不良品検知時の現場責任者への即時画像アラート' }
        ],
        dayOneAction: '地元の工業団地のプレス・金属加工会社5社に電話し、「キーエンスさんの半額以下でできるiPad検査の実機デモ」を申し込む。',
        readyToUseAsset: {
          title: '町工場向け 初期デモ獲得コールドコール台本',
          type: '電話アプローチスクリプト',
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
          content: '〇〇株式会社 代表取締役 〇〇様\n\nシリーズAラウンドの資金調達完了、誠におめでとうございます。事業拡大に伴うエンタープライズ顧客の開拓スピードが目下の最重要課題かと推察いたします。\n\n弊社では最新のAI自動リサーチを活用し、御社ターゲット企業の上場子会社・DX担当役員に特化した「超個別化アウトバウンド」を完全成果報酬型（商談獲得1件あたり〇万円）で受託しております。\n\n御社の競合事例と、実際にアポイントが獲得できた初回アプローチ文面サンプルを作成いたしました。15分だけオンラインで画面共有させていただけないでしょうか？'
        },
        pricingScript: '「営業代行会社に月60万円の固定費を払うリスクをゼロにできます。実際に決まった商談数に対してのみお支払いください」',
        fatalTrapToAvoid: '固定費契約を最初から強要すること。スタートアップは固定費を嫌う。最初は「商談1件3万円の完全成果報酬」で入り、返信率を実証した後に月額保守50万円へ移行させよ。',
        proUnlockPreview: {
          headline: '返信率32%を叩き出したClayワークフローテンプレート ＆ アポ獲得自動化JSON',
          description: 'PR TIMESの調達速報から企業URLを抽出し、役員名とパーソナライズ文章を10秒で生成する設定シート。'
        },
        proSecretTip: '商談獲得後のクロージング支援まで巻き込み、顧客の年間契約金額の10%を追加レベニューシェアとして獲得する。',
        tags: ['成果報酬型', '法人B2B', 'データ連携', '高単価']
      },
      {
        id: 'notion-template-minimal',
        companyId: 'solo-easlo',
        title: '思考整理フォーマット自律運用モデル（デジタル資産）',
        founderReference: 'Easlo（20歳ソロプレナー / 1人で年商1.1億円）',
        monthlyRevenueEstimate: '月利50万〜300万円（不労所得ストック）',
        monthlyProfitMinJpy: 2000000,
        profitMargin: 96,
        initialInvestment: '0円（Notion無料枠＋Gumroad）',
        timeframeToProfit: '初月着金',
        potentialAnnualProfitJpy: '¥26,000,000',
        effectiveHourlyRateJpy: '¥145,000 / 時間',
        whyFitsYourCards: 'プログラミング不要で今夜から作れる。原価は完全にゼロ。世界中のNotionユーザー向けに、デザイン性を極限まで高めたミニマルなタスク管理テンプレートをGumroadで直販。',
        incumbentVsYou: {
          incumbentPain: '多機能すぎて使いこなせない複雑な管理ツールに挫折したユーザーが、美しい1枚の整理板を求めている。',
          yourEdge: 'モノトーンの美しいUIと、迷わせない導線設計。買ったら1クリックで複製完了。'
        },
        threeKeyTools: [
          { name: 'Notion', role: 'テンプレート本体の構築基盤（複製リンク配布）' },
          { name: 'Gumroad / Lemon Squeezy', role: '決済・アフィリエイト・領収書自動化' },
          { name: 'X / Pinterest', role: '製品スクリーンショットによるオーガニック拡散' }
        ],
        dayOneAction: '自分が毎日使っているタスク管理Notionをモノトーンに整形し、短いGIF動画を添えてXで「無料配布します」と投稿する。',
        readyToUseAsset: {
          title: 'Notionテンプレート無料配布→有料アップセル導線文面',
          type: 'SNSバイラル配布スクリプト',
          content: '【無料配布】タスクに追われるのをやめるための、ミニマルNotionダッシュボードを作りました。\n\n・今日の最重要タスク3つだけを表示\n・無駄な通知・余計な機能を完全排除\n・モノトーンで集中力が途切れない\n\nリプ欄のリンクから1クリックで複製できます（無料）。\n※より詳細な「年商1億プロジェクト管理版（有料）」も同梱しています。'
        },
        pricingScript: '「一度買えば一生使えるデジタル資産です。月額サブスクのSaaSに毎年数万円払い続ける必要はありません」',
        fatalTrapToAvoid: 'カラフルで派手な装飾を施すこと。高単価で買うビジネスマンは「モノトーンの引き締まったプロ用デザイン」を好む。色数を削れ。',
        proUnlockPreview: {
          headline: '年商1億Easloが採用しているGumroadアップセルファネル設定 ＆ モノトーンUIデザイン規律',
          description: '無料版をダウンロードした読者の30%を有料パッケージへ誘導する自動ステップメール文章。'
        },
        proSecretTip: 'Notion系インフルエンサーに「50%のアフィリエイト報酬」を提示し、他人のフォロワー網を使って無課金集客する。',
        tags: ['原価ゼロ', 'ノーコード', '不労所得', '意匠・デザイン価値']
      },
      {
        id: 'shipfast-boilerplate',
        companyId: 'solo-shipfast',
        title: 'Next.jsボイラープレート型 開発時間短縮テンプレート販売モデル',
        founderReference: 'ShipFast（マーク・ルー氏 / 1人で年商1.5億円）',
        monthlyRevenueEstimate: '月利100万〜600万円（Stripe直結）',
        monthlyProfitMinJpy: 3000000,
        profitMargin: 94,
        initialInvestment: '1万円（ドメイン＋初期ホスティング）',
        timeframeToProfit: 'ローンチ初月',
        potentialAnnualProfitJpy: '¥45,000,000',
        effectiveHourlyRateJpy: '¥180,000 / 時間',
        whyFitsYourCards: 'Next.jsの開発経験があるなら最短。認証・Stripe決済・メール配信・SEOメタタグがあらかじめ設定されたスターターキットを販売し、開発者の「最初の1週間の面倒な作業」を丸ごと買い取る。',
        incumbentVsYou: {
          incumbentPain: '個人開発者が新しいアプリを作るたびに、認証や決済の配線に数週間を消費してモチベーションが尽きる。',
          yourEdge: '「git cloneして数時間で課金開始できる」フルスタックのコードベースを買い切り提供。'
        },
        threeKeyTools: [
          { name: 'Next.js (App Router)', role: '高速でSEOに強いフルスタック基盤' },
          { name: 'Stripe Webhooks', role: 'サブスク・買い切り決済の自動ハンドリング' },
          { name: 'Tailwind CSS / DaisyUI', role: '即座に美しく立ち上がるUIコンポーネント' }
        ],
        dayOneAction: '自分が過去に作った認証・決済済みのリポジトリから不要なコードを削ぎ落とし、「ボイラープレート初版」としてGitHubにプライベート作成する。',
        readyToUseAsset: {
          title: '開発者向け「ローンチまでの時間節約」ランディングページ見出し',
          type: 'LPキャッチコピー',
          content: '「また認証とStripe決済の設定で土日を潰すのですか？」\n\nShipFastは、Next.jsアプリを数時間で立ち上げ、最初の売上を上げるための開発ボイラープレートです。\n\n・Stripe決済設定済み\n・Supabase / NextAuth認証済み\n・Mailgunメール配信設定済み\n・SEO構造化データ設定済み\n\n面倒な下準備をスキップして、本質的なプロダクト開発だけに集中してください。'
        },
        pricingScript: '「あなたの時給を計算してください。週末20時間をこの設定に費やすなら、$199のボイラープレートを買った方が圧倒的に安上がりです」',
        fatalTrapToAvoid: '完璧なコードを書こうとしてリリースを遅らせること。初期は最低限の動く認証と決済だけで十分。機能追加は買い手の要望を聞きながらアップデートせよ。',
        proUnlockPreview: {
          headline: 'マーク・ルー氏が公開した「初月4,000万円を叩き出したStripeコンバージョン特化LP構造」',
          description: '購入ボタンの配置、カウントダウンタイマー、社会的証明（購入通知ポップアップ）の実装コード。'
        },
        proSecretTip: 'Twitterで開発過程を毎日数字つきで実況（Build in Public）し、エンジニアからの信頼と認知を広告費ゼロで獲得する。',
        tags: ['Next.js', '高粗利94%', '開発者向け', '買い切り高単価']
      }
    ];

    // ユーザーの手札条件に基づく多次元スコアリング計算
    const scoredList = rawList.map((item) => {
      let score = 50;

      if (capital === 'ZERO' && item.initialInvestment.includes('0円')) {
        score += 20;
      } else if (capital === 'MICRO' && (item.initialInvestment.includes('3万') || item.initialInvestment.includes('1万'))) {
        score += 20;
      } else if (capital === 'MID' || capital === 'HIGH') {
        score += 15;
      }

      if (time === 'ULTRA_LIGHT' && item.tags.includes('完全無人化')) {
        score += 20;
      } else if (time === 'SIDE_JOB' && (item.tags.includes('副業可') || item.tags.includes('1人完結'))) {
        score += 20;
      } else if (time === 'FULL_TIME') {
        score += 15;
      }

      let capScore = 0;
      if (capability === 'NO_CODE_API' && (item.tags.includes('API配線') || item.tags.includes('1人完結') || item.tags.includes('Next.js'))) {
        capScore = 20;
      } else if (capability === 'SALES_OUTBOUND' && (item.tags.includes('町工場独占') || item.tags.includes('高単価直販'))) {
        capScore = 20;
      } else if (capability === 'CONTENT_MEDIA' && (item.tags.includes('朝5分習慣') || item.tags.includes('原価ゼロ'))) {
        capScore = 20;
      } else if (capability === 'VIDEO_CREATIVE' && item.tags.includes('動画アフィリ')) {
        capScore = 20;
      } else if (capability === 'BIZ_EFFICIENCY' && (item.tags.includes('現場DX') || item.tags.includes('町工場'))) {
        capScore = 20;
      }
      score += capScore;

      let marketScore = 8;
      if (targetMarket === 'LOCAL_STORE' && (item.tags.includes('町工場') || item.tags.includes('現場DX') || item.tags.includes('町工場独占'))) {
        marketScore = 15;
      } else if (targetMarket === 'B2B_CORP' && (item.tags.includes('B2B直販') || item.tags.includes('法人B2B') || item.tags.includes('エンジニア向け'))) {
        marketScore = 15;
      } else if (targetMarket === 'B2C_INDIVIDUAL' && (item.tags.includes('承認欲求の活用') || item.tags.includes('デジタル資産'))) {
        marketScore = 15;
      }
      score += marketScore;

      if (cashSpeed === 'INSTANT_CASH' && (item.tags.includes('即金性最速') || item.timeframeToProfit.includes('初日') || item.timeframeToProfit.includes('48時間'))) {
        score += 15;
      } else if (cashSpeed === 'LONG_STOCK' && (item.tags.includes('月額ストック') || item.tags.includes('ストック広告'))) {
        score += 15;
      }

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
        badgeType: 'PRIMARY' as 'PRIMARY' | 'SECONDARY' | 'CONTRARIAN',
        badgeLabel: ''
      };
    });

    scoredList.sort((a, b) => b.bestFitScore - a.bestFitScore);

    if (scoredList.length > 0) {
      scoredList[0].badgeType = 'PRIMARY';
      scoredList[0].badgeLabel = '最適適合（推奨）';
    }
    if (scoredList.length > 1) {
      scoredList[1].badgeType = 'SECONDARY';
      scoredList[1].badgeLabel = '高利益率・次点';
    }
    if (scoredList.length > 2) {
      scoredList[2].badgeType = 'CONTRARIAN';
      scoredList[2].badgeLabel = '独自展開モデル';
    }
    for (let i = 3; i < scoredList.length; i++) {
      scoredList[i].badgeType = 'SECONDARY';
      scoredList[i].badgeLabel = `候補 ${i + 1}`;
    }

    return scoredList;
  }, [capital, time, capability, targetMarket, cashSpeed, targetProfit]);

  // 並び替え
  const sortedStrategies = useMemo(() => {
    const arr = [...matchedStrategies];
    if (sortBy === 'FIT_SCORE') return arr.sort((a, b) => b.bestFitScore - a.bestFitScore);
    if (sortBy === 'PROFIT') return arr.sort((a, b) => b.monthlyProfitMinJpy - a.monthlyProfitMinJpy);
    if (sortBy === 'MARGIN') return arr.sort((a, b) => b.profitMargin - a.profitMargin);
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
    <div className="flex-1 flex overflow-hidden w-full h-full font-sans text-zinc-100 select-none bg-[#0B0E14]">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 【左ペイン】6軸スクリーナー ＆ 適合モデル順位表 (幅340px〜380px) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="w-84 lg:w-96 border-r border-white/[0.08] bg-[#0D1117] flex flex-col shrink-0 overflow-hidden">
        
        {/* 上部固定：条件セレクター */}
        <div className="p-3 bg-[#0D1117] border-b border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
              <SlidersHorizontal size={11} className="text-zinc-500" />
              <span>RESOURCE SCREENER (6軸)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
              className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
            >
              {isSelectorOpen ? '条件を縮小 ▲' : '条件を展開 ▼'}
            </button>
          </div>

          {/* セレクター本体 */}
          {isSelectorOpen && (
            <div className="space-y-2 pt-1 border-t border-white/[0.08] text-[11px] font-mono">
              {/* 1. 資本 */}
              <div className="space-y-1">
                <span className="text-[9px] text-zinc-400 font-semibold uppercase block">1. 投下資本</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { id: 'ZERO', label: '0円' },
                    { id: 'MICRO', label: '〜3万' },
                    { id: 'MID', label: '10〜50万' },
                    { id: 'HIGH', label: '100万〜' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setCapital(opt.id as CapitalLevel)}
                      className={`h-5.5 px-2 text-[10px] rounded transition-colors cursor-pointer ${
                        capital === opt.id
                          ? 'bg-white/[0.14] text-white font-bold border border-white/[0.25]'
                          : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] border border-white/[0.06]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 稼働 */}
              <div className="space-y-1">
                <span className="text-[9px] text-zinc-400 font-semibold uppercase block">2. 週稼働コミット</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { id: 'ULTRA_LIGHT', label: '週1〜3h' },
                    { id: 'SIDE_JOB', label: '週5〜10h' },
                    { id: 'FULL_TIME', label: '週30h+' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setTime(opt.id as TimeCommitment)}
                      className={`h-5.5 px-2 text-[10px] rounded transition-colors cursor-pointer ${
                        time === opt.id
                          ? 'bg-white/[0.14] text-white font-bold border border-white/[0.25]'
                          : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] border border-white/[0.06]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. スキル */}
              <div className="space-y-1">
                <span className="text-[9px] text-zinc-400 font-semibold uppercase block">3. 保有スキル</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { id: 'NO_CODE_API', label: 'ノーコード/API' },
                    { id: 'SALES_OUTBOUND', label: '直販・営業' },
                    { id: 'CONTENT_MEDIA', label: '文章要約' },
                    { id: 'BIZ_EFFICIENCY', label: '業務改善' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setCapability(opt.id as Capability)}
                      className={`h-5.5 px-2 text-[10px] rounded transition-colors cursor-pointer ${
                        capability === opt.id
                          ? 'bg-white/[0.14] text-white font-bold border border-white/[0.25]'
                          : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] border border-white/[0.06]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. ターゲット */}
              <div className="space-y-1">
                <span className="text-[9px] text-zinc-400 font-semibold uppercase block">4. ターゲット市場</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { id: 'B2B_CORP', label: '法人(経費)' },
                    { id: 'B2C_INDIVIDUAL', label: '個人(欲望)' },
                    { id: 'LOCAL_STORE', label: '地方・町工場' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setTargetMarket(opt.id as CustomerTarget)}
                      className={`h-5.5 px-2 text-[10px] rounded transition-colors cursor-pointer ${
                        targetMarket === opt.id
                          ? 'bg-white/[0.14] text-white font-bold border border-white/[0.25]'
                          : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] border border-white/[0.06]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. 速度 & 6. 月利目標 */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-400 font-semibold uppercase block">5. 着金速度</span>
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'INSTANT_CASH', label: '即金' },
                      { id: 'LONG_STOCK', label: 'ストック' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setCashSpeed(opt.id as CashSpeed)}
                        className={`h-5.5 px-1.5 text-[10px] rounded transition-colors cursor-pointer ${
                          cashSpeed === opt.id
                            ? 'bg-white/[0.14] text-white font-bold border border-white/[0.25]'
                            : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] border border-white/[0.06]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-400 font-semibold uppercase block">6. 目標月利</span>
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'TIER_100M', label: '100万〜' },
                      { id: 'TIER_500M', label: '500万〜' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setTargetProfit(opt.id as TargetProfit)}
                        className={`h-5.5 px-1.5 text-[10px] rounded transition-colors cursor-pointer ${
                          targetProfit === opt.id
                            ? 'bg-white/[0.14] text-white font-bold border border-white/[0.25]'
                            : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] border border-white/[0.06]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ソート＆検出件数バー */}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span>適合: <strong className="text-zinc-100 tabular-nums">{sortedStrategies.length}件</strong></span>
            <div className="flex items-center gap-1">
              {[
                { id: 'FIT_SCORE', label: '適合度' },
                { id: 'PROFIT', label: '月利' },
                { id: 'MARGIN', label: '利益率' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSortBy(s.id as SortOption)}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    sortBy === s.id
                      ? 'bg-white/[0.14] text-white font-bold border border-white/[0.2]'
                      : 'bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* リストカラムヘッダー */}
        <div className="px-3 py-1.5 bg-[#090C10] border-b border-white/[0.08] flex items-center justify-between text-[10px] text-zinc-400 font-mono font-medium">
          <span>適合モデル / スコア</span>
          <span>想定月利</span>
        </div>

        {/* 適合モデル順位リスト */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] text-xs">
          {sortedStrategies.map((item, idx) => {
            const isSelected = activeStrategy?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedStrategyId(item.id)}
                className={`px-3 py-2.5 cursor-pointer transition-colors border-l-2 flex items-center justify-between gap-2.5 ${
                  isSelected
                    ? 'bg-white/[0.08] border-emerald-500 text-white font-medium'
                    : 'hover:bg-white/[0.03] border-transparent text-zinc-300'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-4 h-4 rounded-sm flex items-center justify-center font-mono text-[9px] font-bold ${
                      idx === 0 
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' 
                        : 'bg-white/[0.06] text-zinc-400 border border-white/[0.08]'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold truncate text-zinc-100">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="font-bold text-zinc-200 tabular-nums">
                      適合 {item.bestFitScore}%
                    </span>
                    <span className="text-zinc-600">|</span>
                    <span className="text-zinc-400">
                      粗利 {item.profitMargin}%
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right font-mono">
                  <span className="text-[10px] font-bold text-emerald-400 tabular-nums px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/60 whitespace-nowrap block">
                    {item.monthlyRevenueEstimate.split('（')[0]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 【右ペイン】選択モデルの完全実務実行ドシエ (flex-1 可変)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 h-full overflow-y-auto bg-[#0B0E14] p-6 sm:p-8 space-y-6">
        {activeStrategy ? (
          <div className="space-y-6 max-w-5xl">
            {/* 上段ヘッダー：タイトルと財務サマリー */}
            <div className="p-5 bg-[#0F131C] border border-white/[0.08] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.1] text-zinc-200 border border-white/[0.15] font-bold uppercase tracking-wider">
                    EXECUTION DOSSIER
                  </span>
                  <span className="text-zinc-400">
                    適合度 {activeStrategy.bestFitScore}% • {activeStrategy.founderReference}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {activeStrategy.title}
                </h2>
              </div>

              <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                <div className="text-right">
                  <span className="text-[9px] text-zinc-400 block uppercase font-semibold">想定月利</span>
                  <span className="text-sm font-bold text-emerald-400 tabular-nums">
                    {activeStrategy.monthlyRevenueEstimate.split('（')[0]}
                  </span>
                </div>
                <div className="text-right pl-3 border-l border-white/[0.08]">
                  <span className="text-[9px] text-zinc-400 block uppercase font-semibold">粗利率</span>
                  <span className="text-sm font-bold text-zinc-100 tabular-nums">
                    {activeStrategy.profitMargin}%
                  </span>
                </div>
                <div className="text-right pl-3 border-l border-white/[0.08]">
                  <span className="text-[9px] text-zinc-400 block uppercase font-semibold">初期資本</span>
                  <span className="text-sm font-bold text-zinc-100 tabular-nums">
                    {activeStrategy.initialInvestment}
                  </span>
                </div>
                {onSelectCompany && (
                  <button
                    type="button"
                    onClick={() => onSelectCompany(activeStrategy.companyId)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-mono text-xs font-semibold rounded border border-white/[0.1] transition-colors flex items-center gap-1.5 cursor-pointer ml-2"
                  >
                    <span>企業財務DB</span>
                    <ArrowRight size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* 実務アセット ＆ トーク（2カラム構造） */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08] text-xs">
              {/* 左: 顧客開拓アプローチ実文面 */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-300 font-mono text-[10px] font-bold border border-white/[0.08]">
                      OUTREACH ASSET
                    </span>
                    <h3 className="text-xs font-bold text-zinc-100">
                      {activeStrategy.readyToUseAsset.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeStrategy.readyToUseAsset.content, activeStrategy.id)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-mono text-[11px] font-semibold rounded border border-white/[0.1] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedKey === activeStrategy.id ? (
                      <>
                        <Check size={11} className="text-emerald-400" />
                        <span>コピー完了</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>文面をコピー</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* コードブロック形式のテキストエリア */}
                <div className="p-3.5 bg-[#090C10] border border-white/[0.08] rounded font-mono text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed select-text">
                  {activeStrategy.readyToUseAsset.content}
                </div>
              </div>

              {/* 右: 戦略的価格決定権 ＆ リスク要因 ＆ ツール */}
              <div className="lg:col-span-5 pt-5 lg:pt-0 lg:pl-6 space-y-4">
                {/* 価格決定権ロジック */}
                <div className="space-y-1 border-b border-white/[0.08] pb-3">
                  <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 block">
                    PRICING LOGIC
                  </span>
                  <p className="text-xs font-sans text-zinc-300 leading-relaxed">
                    {activeStrategy.pricingScript}
                  </p>
                </div>

                {/* 参入初期のリスク要因 */}
                <div className="space-y-1 border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <AlertTriangle size={12} />
                    <span className="text-[10px] font-mono uppercase">KEY RISK FACTORS</span>
                  </div>
                  <p className="text-xs font-sans text-zinc-300 leading-relaxed">
                    {activeStrategy.fatalTrapToAvoid}
                  </p>
                </div>

                {/* 主要ツールスタック */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold block">
                    KEY TOOLS & INFRASTRUCTURE
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
                    {activeStrategy.threeKeyTools.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white/[0.04] text-zinc-300 rounded border border-white/[0.08]">
                        {t.name} <span className="text-zinc-400">({t.role})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* PRO会員限定解錠枠 */}
            <div className="p-4 bg-[#0F131C] border border-amber-500/30 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <Lock size={13} className="text-amber-400 shrink-0" />
                <div className="truncate">
                  <span className="font-mono text-amber-400 font-bold mr-2 text-[10px] uppercase">PRO UNLOCK</span>
                  <span className="text-zinc-100 font-bold text-xs">{activeStrategy.proUnlockPreview.headline}</span>
                  <span className="text-zinc-400 text-[11px] block mt-0.5">{activeStrategy.proUnlockPreview.description}</span>
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-xs font-semibold rounded border border-amber-500/30 transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
              >
                PRO会員限定アセットを解錠
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-400 text-xs font-mono">
            左ペインから適合モデルを選択してください
          </div>
        )}
      </div>
    </div>
  );
};
