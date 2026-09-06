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
  isBookmarked?: boolean;
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

