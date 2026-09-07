export type BusinessScale = 'SOLO' | 'SMALL_TEAM' | 'SCALEUP' | 'ENTERPRISE';

export type SectorCategory = 
  | 'AI_AUTOMATION'
  | 'NICHE_SAAS'
  | 'MONOPOLY_MFG'
  | 'CONTENT_MEDIA'
  | 'PHYSICAL_ASSET'
  | 'FINTECH_INFRA'
  | 'LOCAL_SERVICES';

export type MoatType = 
  | 'COUNTER_POSITIONING'
  | 'SWITCHING_COST'
  | 'NETWORK_EFFECT'
  | 'CORNERED_RESOURCE'
  | 'SCALE_ECONOMIES'
  | 'BRAND_PRESTIGE'
  | 'PROCESS_POWER';

export interface ProfitAndLossStatement {
  monthlyRevenue: number; // 単位: 円
  cogs: number; // 売上原価
  grossProfit: number; // 粗利益
  grossMargin: number; // 粗利率 %
  operatingExpenses: {
    serverAndApi: number;
    advertising: number;
    subcontracting: number;
    toolsAndSaaS: number;
    other: number;
  };
  operatingProfit: number; // 営業利益
  operatingMargin: number; // 営業利益率 %
  estimatedAnnualNetProfit: number; // 推定年間純利益
}

export interface ToolStackItem {
  name: string;
  category: string;
  monthlyCost: number;
  purpose?: string;
  replacementDifficulty?: 'LOW' | 'MEDIUM' | 'HIGH';
  url?: string;
}

export interface OperatingFramework {
  teamSize: number; // 人数 (1 = 完全1人)
  weeklyHours: number; // 週稼働時間
  initialCapitalRequired: number; // 初期投下資本 (0 = 0円)
  automationLevel: number; // 1-100%
  primaryChannels: string[]; // 集客経路
  toolStack: ToolStackItem[];
}

export interface PricingDossier {
  model: string; // 課金方式
  pricePoint: string; // 価格帯・客単価
  psychologicalTrigger: string; // なぜ金を払うのかの本能トリガー
  estimatedLtvJpy?: number; // 想定LTV
  churnRate?: string; // 解約率
}

export interface AcquisitionDossier {
  cacJpy: number; // 顧客獲得コスト (0円等)
  primaryFunnel: string; // 集客〜成約ファネル
  tactics: string[]; // 具体的ハック
}

export interface BusinessEssence {
  whatItDoes: string; // 一言でいうと何屋か
  targetCustomer: string; // 誰の財布を狙うか
  painRelief: string; // 切除する苦痛・恐怖
}

export interface MetaArchitectureDossier {
  // 1. 大手の構造的ジレンマ (なぜ大企業は真似できないのか)
  incumbentDilemma: {
    cannibalizationBarrier: string; // 既存事業・リレーションとの共食い恐怖
    scaleMismatchReason: string; // 規模が小さすぎて大手の稟議に通らない理由
    decisionSpeedAdvantage: string; // 意思決定・現場実行スピードの非対称性
  };
  // 2. 価格決定権とアンカリング (なぜ客が値切らずに喜んで払うか)
  pricingPower: {
    anchorComparison: string; // 比較対象のすり替え (例: 「写真館の3万円」と比較させる)
    lossAversionTrigger: string; // 損失回避の急所 (例: 「ライン停止の数千万円損害」)
    budgetCategory: string; // どの予算枠を狙っているか (例: 「個人の見栄」「法人の経費精算枠」)
  };
  // 3. 不可逆スイッチングコスト (なぜ客は解約できないのか)
  lockInMechanism: {
    dataHostage: string; // データ蓄積による移行不能化
    workflowIntegration: string; // 業務ルーティン・神経回路への埋め込み
    switchingFriction: string; // 他社へ乗り換えた際の痛みの実態
  };
  // 4. 資本効率とキャッシュ幾何学 (なぜ借金なしで現金が残り続けるのか)
  capitalEfficiency: {
    cashConversionCycle: string; // 前払い集金と後払い仕入れのキャッシュサイクル
    incrementalMargin: string; // 限界利益率の高さ (固定費回収後の利益直下)
    workingCapitalStrategy: string; // 外部調達・借金不要の自己増殖メカニズム
  };
}

export interface StrategicDossier {
  blindspot: string; // 突いた業界の盲点・不条理
  moatType: MoatType;
  moatDescription: string; // 参入障壁の正体
  incumbentDilemma?: string; // 大手が手を出せない構造的理由
  secretInsight?: string; // 現場の裏ハック・非公開インサイト
  initialTraction: string[]; // 最初の100人を獲得した泥臭い手順
  actionPlaybook: string[]; // 再現・実行のためのステップ
  coldOutreachTemplate?: string; // コールドDM実文
}

export interface FinancialEntity {
  id: string;
  ticker: string; // 例: "KEYENCE", "STRIPE", "PHOTOAI"
  name: string;
  legalEntity?: string;
  tagline: string;
  sector: SectorCategory;
  scale: BusinessScale;
  founder: string;
  country: string;
  url: string;
  verifiedBadge: boolean;
  pnl: ProfitAndLossStatement;
  operations: OperatingFramework;
  strategy: StrategicDossier;
  growthRateYoY: number; // 前年比成長率 %
  pricing?: PricingDossier;
  acquisition?: AcquisitionDossier;
  essence?: BusinessEssence;
  meta?: MetaArchitectureDossier;
  isBookmarked?: boolean;

  // 資本主義の裏帳簿：知的興奮・探索3大トリガー
  architecturePattern: string; // 構造の型（例: "直販要塞・相見積もり殺し", "APIラッパー・自撮り特化", "水門寄生・決済通行税", "テンプレ販売・無料逆手"）
  pipelineStack: string; // 現場の配管・主要ツール（例: "Replicate API × Hetzner × Stripe", "Clay × Make × OpenAI"）
  targetPainWallet: string; // 人質にした財布・痛み（例: "個人の見栄（写真館スタジオの羞恥心回避）", "工場長の保身（ライン停止恐怖）"）
}

export type GridFilterOption = 
  | 'ALL'
  | 'SOLO'
  | 'HIGH_MARGIN'
  | 'ZERO_CAPITAL'
  | 'MONOPOLY'
  | 'AI_NATIVE'
  | 'BOOKMARKED';

export type WorkspaceMode = 'LEDGER' | 'DEEP_DIVE';

export type IntelligenceTopicId = 
  | 'solo_empire'
  | 'direct_monopoly'
  | 'b2b_outbound'
  | 'media_cashflow';

export interface IntelligenceDossier {
  id: IntelligenceTopicId;
  title: string;
  badge: string;
  publishedDate: string;
  readTime: string;
  punchline: string;
  macroArbitrage: string; // 市場の構造的歪み・大手の死角
  costStructureTeardown: {
    title: string;
    description: string;
    breakdownItems: { label: string; percentage: number; amountNote: string }[];
  };
  operationalPlaybook: string[]; // 参入・実行の急所ステップ
  targetEntityIds: string[]; // 本特集の対象企業IDリスト
}

