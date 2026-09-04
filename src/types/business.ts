export type BusinessModel = 
  | '継続課金型ツール' 
  | '特化型通販' 
  | '定期手紙' 
  | '有料集会所' 
  | '業務自動化受託' 
  | '知識・様式販売' 
  | '顔出しなし動画広告';

export type TargetMarket = '法人向け' | '個人向け' | '地域実店舗向け';

export type AcquisitionChannel = 
  | '短文投稿網' 
  | '短尺動画網' 
  | '検索自動集客' 
  | '口コミ紹介' 
  | '個別連絡' 
  | '有料広告';

export type SkillRequired = 
  | '完全ノーコード' 
  | '人工知能の指示のみ' 
  | '基本開発' 
  | '個別営業' 
  | '発信力';

export type AutomationLevel = '完全不労型' | '半自動型' | 'プレイヤー実稼働型';

export interface ToolItem {
  name: string;
  category: string;
  purpose: string;
  monthlyCostJpy: number;
  officialUrl: string;
  affiliateUrl?: string;
}

export interface FinancialBreakdown {
  grossRevenue: number;
  serverAndApiCost: number;
  advertisingCost: number;
  outsourcingCost: number;
  netProfit: number;
  profitMarginPercent: number;
}

export interface BusinessItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  founderName: string;
  founderAvatar: string;
  founderBio: string;
  monthlyRevenueJpy: number;
  monthlyProfitJpy: number;
  profitMarginPercent: number;
  initialInvestmentJpy: number;
  monthsToProfitability: number;
  teamSize: number;
  weeklyHoursSpent: number;
  businessModel: BusinessModel;
  targetMarket: TargetMarket;
  primaryAcquisitionChannel: AcquisitionChannel;
  skillRequired: SkillRequired;
  automationLevel: AutomationLevel;
  isVerified: boolean;
  isForSale: boolean;
  askingPriceJpy?: number;
  summary: string;
  financialBreakdown: FinancialBreakdown;
  tools: ToolItem[];
  first100UsersStrategy: string;
  reproducibilityPlaybook: {
    step: number;
    title: string;
    description: string;
  }[];
  proSecretInsight: string;
  featured: boolean;
  publishedAt: string;
}

export interface FilterState {
  keyword: string;
  businessModel: string;
  revenueRange: string;
  investmentRange: string;
  automationLevel: string;
  skillRequired: string;
  sortBy: 'revenueDesc' | 'profitMarginDesc' | 'investmentAsc' | 'recent';
}
