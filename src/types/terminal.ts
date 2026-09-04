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

  // ビジュアルアンカー（文字疲れ解消・実物プレビュー）
  logoIcon?: string;             // 企業・サービスのロゴ画像URLまたはSVGパス
  founderAvatarUrl?: string;     // 創業者の生々しい顔写真・ポートレートURL
  productScreenshotUrl?: string; // 実際に巨額を稼いだサービス・ツールの生画面スクショURL
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

  // ユーザーの好み・欲望別タグ
  tags: string[];                // 例: ['初期0円', '完全1人', 'AIツール', '広告費0円', '不労所得']
  initialInvestmentJpy: number;  // 初期投資額（0円〜）

  // 3. 痛快サクセスストーリー（長文を読ませない30秒四幕構造）
  successStory?: {
    headline: string;              // 例: '3時間で作ったネタ投票サイトが、起業家の見栄を煽り48時間で2,000万円を強奪した手口'
    founderProfile: string;        // ① 誰が（創業者プロフィールと元の境遇）
    marketGlitch: string;          // ② 発見した歪み（業界の矛盾や盲点）
    breakthroughMoment: string;    // ③ 泥臭い突破口（最初の1円・100人を集めた生々しい瞬間）
    actionableSteal: string;       // ④ 今夜から真似するなら（完コピ・カンニングの要点）
  };

  // 4. このビジネスを「自分用」にして稼ぐ具体アレンジレシピ
  personalizedRecipes?: {
    targetAudience: string;        // 例: 'プログラミングや難しい作業ができないあなた用'
    customConcept: string;         // どう自分用にするか
    howToProfit: string;           // 具体的にどう儲けるか
  }[];

  // 盗むべきエッセンスから派生する具体的な新規ビジネスアイデア（即実践可能な横展開）
  derivedBusinessIdeas?: {
    title: string;                 // 例: '地方駅前激戦区の「今週の地域1番店」オークション看板'
    targetNiche: string;           // 例: '地方都市の美容院・脱毛サロン・パーソナルジム'
    executionSummary: string;      // 例: 'LINE公式アカウントとStripe決済だけで、毎週月曜に入札順位を更新して店舗へ案内'
    estimatedMonthlyProfit: string;// 例: '月利30万〜80万円（3〜5店舗からの自動入金）'
  }[];

  // 5. 即日仕掛けられる罠（カラクリ）のレシピ（難しい会計用語ゼロの直感算盤）
  trapRecipe?: {
    headline: string;              // 例: '地方店舗の見栄と嫉妬心を煽り、入札金で月15万円を丸儲けする罠'
    targetPrey: string;            // ① 誰の何の欲を釣るか（獲物と撒き餌）
    trapMechanism: string;         // ② 即日仕掛ける罠（仕掛けのルール）
    pureProfitBreakdown: {         // ③ 超明快な手残り（難しい計算ゼロ）
      initialCapital: string;      // かかる元手（例: '0円'）
      monthlyRevenue: string;      // 相手から入る金（例: '月5万円 × 3店舗 ＝ 15万円'）
      systemCost: string;          // かかる経費（例: '月1,000円以下'）
      netTakeHome: string;         // あなたの純手残り（例: '月14万9,000円の丸儲け'）
    };
  };

  // 6. 後発個人の勝ち筋レンズ（「デカすぎて無理」「先駆者がいて無理」を粉砕する参入ルート）
  entryStrategy?: {
    lensType: 'GIANT_CRUMBS' | 'SLIDE_NICHE' | 'SECOND_MOVER';
    lensLabel: string;            // 例: '【巨人の食べこぼし枠】大企業が相手にしない零細現場を拾う'
    whyIncumbentCantWin: string;  // なぜ既存（巨人/先駆者）はあなたに手を出せないのか
    targetVictimOrNiche: string;  // あなたが狙うべき未開拓客層・隙間
    actionableEntryRoute: string; // 後発のあなたが入る具体的な最短ルート
    estimatedEasyProfit: string;  // 個人が手堅く狙える月利（例: '月利50万〜150万円'）
  };

  // 7. 特別会員限定：ビジネスモデル完全解剖調査書
  proDossier?: {
    monetizationTrick: {
      corePsychologicalTrigger: string; // どの感情（見栄、嫉妬、恐怖、逃避）を突いているか
      pricingPowerSecret: string;       // なぜ値引き要求を100%封殺できるのか
      cashflowVelocity: string;         // キャッシュフロー即日化の仕掛け
    };
    incumbentBlindspot: {
      whyGiantsCantEnter: string;       // なぜ大企業や競合は指をくわえて見ているだけなのか
      moatAgainstCopycats: string;      // 後発の個人が真似しても潰されない安全地帯の正体
    };
    sevenDayBlueprint: {
      day1to2OfferSetup: string;        // 1〜2日目: 餌の仕込み（無料ノーコードとオファー構築）
      day3to4CashflowPipe: string;      // 3〜4日目: 集金ラインの開通（決済と受発注の自動連動）
      day5to6FirstCustomers: string;    // 5〜6日目: 最初の3人の顧客強奪（コールドスタート手順）
      day7AutomationEngine: string;     // 7日目: 不労化の完成（自動化配線図）
    };
  };

  // 8. 競合調査に基づく世界水準の3大決定打
  // ① 最初の100人を集めた「泥臭い初期集客の突破口」
  first100CustomersStrategy?: {
    tacticalChannel: string;   // 突破チャネル（例: 'Redditの特定サブレディット' / '地元の店10軒直接訪問'）
    exactAction: string;       // 初動アクション（例: '広告費ゼロで、課題を抱えた起業家50人に個別にDM送信'）
    conversionProof: string;   // 初動の成約実績（例: '初日に12人が課金、3日で100人突破'）
  };

  // ② 初期にやらかした「致命的失敗とドブ捨て金の実録」
  earlyFailureLesson?: {
    wastedMoneyOrTime: string; // ドブに捨てたお金・時間（例: '広告費45万円と無駄な開発3ヶ月'）
    whatWentWrong: string;     // やらかした失敗（例: '機能を盛り込みすぎて誰にも使われず大爆死'）
    pivotMoment: string;       // そこからどう急旋回して黒字化したか
  };

  // ③ 具体的な「料金設定とプライシング設計」
  pricingDesign?: {
    pricingTiers: string;      // 具体的な料金体系（例: '月額2,980円 / 年額29,800円'）
    freeTrialHook: string;     // 有料移行の仕掛け（例: '7日間無料、クレカ事前登録必須で自動課金'）
    averageOrderValue: string; // 客単価（例: '平均4,500円（LTV 18,000円）'）
  };

  // 1. 生々しい通帳レントゲン（他人の財布の覗き見）
  passbookDetails?: {
    monthlyGrossJpy: number;       // 月間総入金
    paymentFeeJpy: number;         // 決済手数料 (Stripe等)
    infraCostJpy: number;          // サーバー・道具費
    outsourcingJpy: number;        // 外注・委託費
    founderTakeHomeJpy: number;    // 創業者個人の口座着金手取り（生現金）
    taxReserveJpy: number;         // 法人税・所得税引当
    bankStatementDate: string;     // 直近通帳締日
  };

  // 2. パクれる完全再現カンニングペーパー（俺でもできる全能感）
  playbook?: {
    difficulty: '極めて容易' | '普通' | '要特訓' | '組織戦';
    setupDays: number;             // 立ち上げ所要日数 (例: 3日)
    monthlyCustomersFor1MJpy: number; // 月利100万円に必要な顧客数
    step1: string;                 // ステップ1: 道具の準備
    step2: string;                 // ステップ2: コピペ集客
    step3: string;                 // ステップ3: 自動集金と納品
    copyPasteScript: string;       // 実際の送信DM・プロンプト・LP見出し原文
  };

  // 3. 取り残される恐怖（FOMO）と市場の賞味期限
  marketWindow?: {
    remainingMonths: number;       // 先行者利益の残余期間（月数）
    monthlyMoneyFlowJpy: number;   // この領域に毎月流入している推定総マネー
    saturationLevel: 'ガラ空き（先行者独占中）' | '拡大中（参入推奨）' | '成熟（差別化必須）';
    urgencyReason: string;         // なぜ今すぐ真似すべきなのかの焦燥理由
  };

  // 特別会員限定の裏技・非公開インサイト
  proSecretInsight: string;
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
