export type ScaleTier = 
  | 'MEGA_CORP'     // 巨大企業: 売上100億円超、上場・グローバル独占
  | 'SCALE_UP'      // 急成長新興: 売上10億〜100億円、高成長テック
  | 'NICHE_LEADER'  // 中堅隠れニッチ: 売上1億〜10億円、高利益率・特定シェア独占
  | 'SOLO_MICRO';   // 個人少数精鋭: 売上100万〜1億円、1〜3名運営・高純利

export type BusinessModel = 
  | 'B2B_DIRECT'      // 直販・製造
  | 'CHIP_ECOSYSTEM'  // 半導体・エコシステム
  | 'SEMICON_EQUIP'   // 半導体検査装置
  | 'PAYMENT_INFRA'   // 決済インフラ
  | 'FRONTIER_AI'     // 基盤知能モデル
  | 'DATA_RLHF'       // データ基盤・人手評価
  | 'ANSWER_ENGINE'   // 対話型検索
  | 'PRECISION_MED'   // 超精密医療機器
  | 'CHEMICAL_MAT'    // 高機能化学材料
  | 'MICRO_SAAS'      // 継続課金ツール
  | 'MEDIA_NEWS'      // 日刊手紙・メディア
  | 'DIGITAL_ASSET'   // 知識・様式販売
  | 'LOCAL_DX'        // 地方実業無人化
  | 'COMMERCE_AUTO';  // 実演物販・自動化

export type MoatPower = 
  | 'PROCESS_POWER'       // 組織プロセスパワー
  | 'NETWORK_EFFECTS'     // ネットワーク効果
  | 'COUNTER_POSITIONING' // カウンターポジショニング
  | 'SWITCHING_COSTS'     // スイッチングコスト
  | 'BRANDING'            // ブランド力
  | 'CORNERED_RESOURCE'   // 独占資源（特許・独自データ）
  | 'SCALE_ECONOMIES';    // 規模の経済

export interface FinancialPeriodRow {
  period: string;             // 例: '2024通期', '2025通期', '2026通期'
  revenueJpy: number;         // 売上高
  cogsJpy: number;            // 売上原価
  grossProfitJpy: number;     // 粗利益
  grossMarginPercent: number; // 粗利率
  opexJpy: number;            // 販管費
  operatingProfitJpy: number; // 営業利益
  operatingMarginPercent: number; // 営業利益率
  netIncomeJpy: number;       // 当期純利益
  netMarginPercent: number;   // 純利益率
}

export interface ToolAssetItem {
  name: string;
  category: string;
  monthlyCostJpy: number;
  purpose: string;
  replacementDifficulty: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CompetitorComparisonRow {
  name: string;
  scaleLabel: string;
  annualRevenueJpy: number;
  operatingMarginPercent: number;
  moatSummary: string;
  pricingPower: string;
}

export interface CompanyRecord {
  id: string;
  ticker: string;              // 例: 'KEYENCE-6861', 'NVDA-US', 'SOLO-PHOTOAI'
  name: string;
  japaneseName: string;
  tagline: string;
  category?: string;
  scaleTier: ScaleTier;
  businessModel: BusinessModel;
  foundedYear: number;
  teamSize: number;
  weeklyHours: number;
  headquarters: string;
  verifiedStatus: 'AUDITED_PUBLIC' | 'VERIFIED_STRIPE' | 'ESTIMATED_MODEL';
  
  // バリュエーション
  estimatedValuationJpy: number; // 推定企業価値
  evMultiple: number;            // 想定売上またはEBITDA倍率
  isForSale: boolean;            // 売却・出資受付フラグ
  askingPriceJpy?: number;

  // 直感理解用・事業の正体（何屋なのか・誰に何をどう売るか）
  businessEssence: {
    whatItDoes: string;          // 一言でいうと何屋か
    targetCustomer: string;      // 誰向けか（顧客）
    valueProposition: string;    // 何の痛みを解決するか（提供価値）
    monetizationWay: string;     // どうやって金をもらうか（集金方式）
  };

  // ビジュアルアンカー（実物プレビュー）
  logoIcon?: string;             // 企業・サービスのロゴ画像URLまたはSVGパス
  founderAvatarUrl?: string;     // 創業者のポートレート画像URL
  productScreenshotUrl?: string; // 実際のプロダクト画面スクリーンショットURL
  founderName?: string;          // 創業者名（例: 'ジョナサン・ヴィルケ'）
  founderAge?: string;           // 年齢・肩書き（例: '29歳 独学開発者'）

  // 希望の手札フィルター（読者の制約・弱点から逆引き）
  handFilters?: ('SKILL_ZERO' | 'ZERO_CAPITAL' | 'NO_AUDIENCE' | 'PASSIVE' | 'GIANT_CRUMBS' | 'SECOND_MOVER' | 'TIME_MACHINE')[];
  profitTier?: 'SUB_30' | 'MID_100' | 'SUPER_500'; // 月利30万・100万・500万超

  // エグゼクティブサマリー＆結論
  actionHeadline: string;        // マッキンゼー式結論
  executiveSummary: string;
  coreMoatDescription: string;
  primaryMoat: MoatPower;
  moatScore: number;             // 1〜100点

  // 財務諸表（年次推移）
  financials: FinancialPeriodRow[];
  
  // ユニットエコノミクス・KPI
  cacJpy?: number;
  ltvJpy?: number;
  ltvCacRatio?: number;
  monthlyChurnPercent?: number;

  // 使用道具・設備
  tools: ToolAssetItem[];

  // 競合比較
  competitors: CompetitorComparisonRow[];

  // 最初の100人・集客手順
  initialTractionStrategy: string;

  // ユーザーの属性・関心別タグ
  tags: string[];                // 例: ['初期0円', '完全1人', 'AIツール', '広告費0円', '自律収益']
  initialInvestmentJpy: number;  // 初期投資額（0円〜）

  // 3. 成功要因・ビジネスモデルサマリー
  successStory?: {
    headline: string;              // 例: '3時間で検証した入札型サービスが、48時間で2,000万円の売上を達成した構造'
    founderProfile: string;        // ① 誰が（創業者プロフィールと背景）
    marketGlitch: string;          // ② 発見した歪み（業界の矛盾や機会）
    breakthroughMoment: string;    // ③ 突破口（最初の有料顧客を獲得したプロセス）
    actionableSteal: string;       // ④ 再現プロセスの要点（事業モデルの要点）
  };

  // 4. このビジネスを「自社・個人向け」に適応させる具体アレンジレシピ
  personalizedRecipes?: {
    targetAudience: string;        // 例: '開発リソースを持たない事業者向け'
    customConcept: string;         // コンセプトの適応方針
    howToProfit: string;           // 収益化の具体的スキーム
  }[];

  // 成功要因から派生する具体的な新規ビジネスアイデア（即実践可能な横展開）
  derivedBusinessIdeas?: {
    title: string;                 // 例: '地方駅前激戦区の「今週の地域1番店」オークション看板'
    targetNiche: string;           // 例: '地方都市の美容院・脱毛サロン・パーソナルジム'
    executionSummary: string;      // 例: 'LINE公式アカウントとStripe決済だけで、毎週月曜に入札順位を更新して店舗へ案内'
    estimatedMonthlyProfit: string;// 例: '月利30万〜80万円（3〜5店舗からの自動入金）'
  }[];

  // 5. 即時展開可能な収益モデル設計書（直感的な月次収支の内訳）
  trapRecipe?: {
    headline: string;              // 例: '地域店舗の露出ニーズに応え、優先掲載枠で月15万円の安定収益を得るモデル'
    targetPrey: string;            // ① ターゲット顧客層・提供価値
    trapMechanism: string;         // ② 収益発生メカニズム・運用ルール
    pureProfitBreakdown: {         // ③ 月次キャッシュフロー概算
      initialCapital: string;      // 初期資本（例: '0円'）
      monthlyRevenue: string;      // 月間売上（例: '月5万円 × 3店舗 ＝ 15万円'）
      systemCost: string;          // 運用経費（例: '月1,000円以下'）
      netTakeHome: string;         // 実効純利益（例: '月14万9,000円の安定純利益'）
    };
  };

  // 6. 後発参入の勝ち筋レンズ（市場制約や大手不採算領域を突く参入ルート）
  entryStrategy?: {
    lensType: 'GIANT_CRUMBS' | 'SLIDE_NICHE' | 'SECOND_MOVER';
    lensLabel: string;            // 例: '【巨人の足元ニッチ枠】大企業が対応できない小規模拠点を拾う'
    whyIncumbentCantWin: string;  // なぜ既存（巨人/先駆者）はあなたに手を出せないのか
    targetVictimOrNiche: string;  // 参入すべき未開拓客層・特定ニッチ
    actionableEntryRoute: string; // 後発参入における具体的最短ルート
    estimatedEasyProfit: string;  // 手堅く狙える想定月利（例: '月利50万〜150万円'）
  };

  // 7. 特別会員限定：ビジネスモデル詳細分析調査書
  proDossier?: {
    monetizationTrick: {
      corePsychologicalTrigger: string; // どの需要・インセンティブを突いているか
      pricingPowerSecret: string;       // なぜ価格決定権を維持できるのか
      cashflowVelocity: string;         // キャッシュフロー即日化の仕掛け
    };
    incumbentBlindspot: {
      whyGiantsCantEnter: string;       // なぜ大企業や既存プレイヤーが参入しづらいのか
      moatAgainstCopycats: string;      // 後発参入者に対する構造的防御の正体
    };
    sevenDayBlueprint: {
      day1to2OfferSetup: string;        // 1〜2日目: オファー構築と最小限の検証環境整備
      day3to4CashflowPipe: string;      // 3〜4日目: 決済と受発注パイプラインの開通
      day5to6FirstCustomers: string;    // 5〜6日目: 初期3社の顧客開拓（コールドスタート手順）
      day7AutomationEngine: string;     // 7日目: プロセス自動化の完成
    };
  };

  // 8. 競合調査に基づく世界水準の3大決定打
  // ① 最初の100人を集めた「初期集客の突破口」
  first100CustomersStrategy?: {
    tacticalChannel: string;   // 突破チャネル（例: 'Redditの特定サブレディット' / '地元の店10軒直接訪問'）
    exactAction: string;       // 初動アクション（例: '広告費ゼロで、課題を抱えた起業家50人に個別にDM送信'）
    conversionProof: string;   // 初動の成約実績（例: '初日に12人が課金、3日で100人突破'）
  };

  // ② 初期に経験した「主要リスクと試行錯誤の実録」
  earlyFailureLesson?: {
    wastedMoneyOrTime: string; // 検証に費やした資金・期間（例: '広告費45万円と開発3ヶ月'）
    whatWentWrong: string;     // 初期に直面した失敗要因（例: '過剰開発による需要不一致'）
    pivotMoment: string;       // そこからどう急旋回して黒字化したか
  };

  // ③ 具体的な「料金設定とプライシング設計」
  pricingDesign?: {
    pricingTiers: string;      // 具体的な料金体系（例: '月額2,980円 / 年額29,800円'）
    freeTrialHook: string;     // 有料移行の仕掛け（例: '7日間無料、クレカ事前登録必須で自動課金'）
    averageOrderValue: string; // 客単価（例: '平均4,500円（LTV 18,000円）'）
  };

  // 1. 実入金データ・実効キャッシュフロー
  passbookDetails?: {
    monthlyGrossJpy: number;       // 月間総入金
    paymentFeeJpy: number;         // 決済手数料 (Stripe等)
    infraCostJpy: number;          // サーバー・道具費
    outsourcingJpy: number;        // 外注・委託費
    founderTakeHomeJpy: number;    // 創業者個人の実効手取り純利
    taxReserveJpy: number;         // 法人税・所得税引当
    bankStatementDate: string;     // 直近締日
  };

  // 2. 実証済み実務プレイブック
  playbook?: {
    difficulty: '極めて容易' | '普通' | '要特訓' | '組織戦';
    setupDays: number;             // 立ち上げ所要日数 (例: 3日)
    monthlyCustomersFor1MJpy: number; // 月利100万円に必要な顧客数
    step1: string;                 // ステップ1: 道具の準備
    step2: string;                 // ステップ2: 初期開拓
    step3: string;                 // ステップ3: 自動集金と納品
    copyPasteScript: string;       // 実際の送信DM・プロンプト・LP見出し原文
  };

  // 3. 先行者優位の機会期間
  marketWindow?: {
    remainingMonths: number;       // 先行者利益の残余期間（月数）
    monthlyMoneyFlowJpy: number;   // この領域に毎月流入している推定総マネー
    saturationLevel: 'ガラ空き（先行者独占中）' | '拡大中（参入推奨）' | '成熟（差別化必須）';
    urgencyReason: string;         // なぜ今着手すべきかの市場要因
  };

  // 特別会員限定の非公開インサイト
  proSecretInsight: string;

  // ─────────────────────────────────────────────────────────────
  // 9大事業構造・財務分析項目
  // ─────────────────────────────────────────────────────────────
  // 7. 実働の正体（週稼働時間と業務の完全棚卸し）
  founderWorkload?: {
    weeklyHours: number;
    founderTasks: string[];             // 本人がやること（意思決定・コア業務）
    automatedOrDelegatedTasks: string[];// 委託・システム自動化した業務
    liberationSummary: string;          // 労働からの解放度サマリー
  };

  // 3. 価格決定力と高付加価値の源泉（高単価維持のロジック）
  pricingSecret?: {
    anchorComparison: string;           // 顧客知覚価値の比較アンカー
    defenseReason: string;              // 他社が安売りしても価格競争に巻き込まれない防衛理由
    priceTagExample: string;            // 価格設定の実例（例: '月額3万円 / 年額30万円'）
  };

  // 5. 主要顧客獲得チャネル（持続的リード獲得基盤）
  trafficFaucet?: {
    primaryChannel: string;             // 主力チャネル名
    channelBreakdown: { channel: string; percentage: number }[]; // 流入比率
    faucetMechanism: string;            // 高効率な顧客獲得メカニズム（バイラルループ・紹介基盤等）
  };

  // 6. スイッチングコストと解約抑止構造
  switchingCostTrap?: {
    hostageData: string;                // 移行障壁となる中核蓄積データ・業務フロー
    abandonmentPain: string;            // 解約・他社乗り換えに伴う移行コストとリスク
  };

  // 8. 構造的参入優位性と再現性の監査
  unfairAdvantageAudit?: {
    codingSkillRequired: boolean;       // プログラミング能力が必須か
    capitalRequirementLevel: 'ゼロ（0円）' | '極小（5万円以下）' | '中程度（100万円〜）';
    preExistingAudienceOrNetwork: boolean; // 事前の知名度・コネ・リストがあったか
    auditVerdict: string;               // 凡人が真似できるか否かの白黒判定
  };

  // 9. 事業の換金性（M&A売却マルチプルと出口査定額）
  exitValuation?: {
    estimatedMultiple: string;          // 推定売却倍率（例: 'ARRの3.5〜4.5倍'）
    targetBuyer: string;                // 想定される買い手候補
    estimatedValuationAmount: string;   // 推定買収査定額（例: '約1億8,000万円'）
  };
}

export type WorkStyleFilter = 'ALL' | 'REMOTE_SOLO' | 'SMALL_TEAM' | 'LOCAL_REAL' | 'SALES_HIGH' | 'AUTOMATED_PASSIVE' | 'ENTERPRISE';
export type AmbitionScaleFilter = 'ALL' | 'POCKET_10K' | 'INDEPENDENT_1M' | 'SOLO_RICH_10M' | 'MID_CORP_100M' | 'WORLD_MEGA';
export type MarginFilter = 'ALL' | 'MARGIN_30' | 'MARGIN_50' | 'MARGIN_80';
export type CapitalFilter = 'ALL' | 'ZERO' | 'UNDER_50K' | 'UNDER_500K' | 'OVER_1M' | 'FOR_SALE';
export type BusinessModelFilter = 'ALL' | 'SAAS' | 'MEDIA_NEWS' | 'DIGITAL_ASSET' | 'AGENCY_B2B' | 'LOCAL_DX' | 'COMMERCE' | 'DEEPTECH_MFG';
export type MoatFilter = 'ALL' | 'PROCESS_POWER' | 'NETWORK_EFFECTS' | 'COUNTER_POSITIONING' | 'SWITCHING_COSTS' | 'BRANDING' | 'CORNERED_RESOURCE' | 'SCALE_ECONOMIES';
export type AcquisitionFilter = 'ALL' | 'X_TWITTER' | 'DIRECT_OUTREACH' | 'SEO_ORGANIC' | 'AFFILIATE_LOOP' | 'ZERO_AD_SPEND';

export interface TerminalFilterState {
  keyword: string;
  desireCategory: string;
  workStyle: WorkStyleFilter;
  ambitionScale: AmbitionScaleFilter;
  margin: MarginFilter;
  capital: CapitalFilter;
  businessModelCategory: BusinessModelFilter;
  moat: MoatFilter;
  acquisitionChannel: AcquisitionFilter;
  sortBy: 'revenueDesc' | 'marginDesc' | 'valuationDesc' | 'growth';
}
