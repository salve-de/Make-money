import { getHistoricalFxRate } from '../../src/shared/currency-fx';
import type { FinancialEntity } from '../../src/platform/types/terminal';

export interface RawWinnerDef {
  id: string;
  ticker: string;
  name: string;
  legalEntity?: string;
  tagline: string;
  sector: 'AI_AUTOMATION' | 'NICHE_SAAS' | 'MONOPOLY_MFG' | 'CONTENT_MEDIA' | 'PHYSICAL_ASSET' | 'FINTECH_INFRA' | 'LOCAL_SERVICES';
  scale: 'SOLO' | 'SMALL_TEAM' | 'SCALEUP' | 'ENTERPRISE';
  founder: string;
  country: string;
  url: string;
  growthRateYoY: number;
  architecturePattern: string;
  pipelineStack: string;
  targetPainWallet: string;
  tags: string[];
  
  // 財務元データ（外貨または円）
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY';
  annualRevenueRaw: number; // 年商（元通貨実数）
  grossMarginPct: number;   // 粗利率 %
  operatingMarginPct: number; // 営業利益率 %
  snapshotYear: number;
  revenueSourceNote: string;
  teamSize: number;
  
  // 手口・戦略
  blindspot: string;
  moatType: 'COUNTER_POSITIONING' | 'SWITCHING_COST' | 'NETWORK_EFFECT' | 'CORNERED_RESOURCE' | 'SCALE_ECONOMIES' | 'BRAND_PRESTIGE' | 'PROCESS_POWER' | 'UNKNOWN';
  moatDescription: string;
  initialTraction: string[];
  actionPlaybook: string[];
  
  // 略奪転用方程式 (LOOT_BLUEPRINT)
  targetPrey: string;
  structuralFlaw: string;
  stealthEntry: string;
  tollGateSetup: string;
  
  // 裏帳簿観察ログ
  observations: string[];
}

export function buildFinancialEntityFromDef(def: RawWinnerDef): FinancialEntity {
  const fx = getHistoricalFxRate(def.currency, def.snapshotYear);
  const annualRevJpy = Math.round(def.annualRevenueRaw * fx.rate);
  const monthlyRevenue = Math.round(annualRevJpy / 12);
  
  const grossProfit = Math.round(monthlyRevenue * (def.grossMarginPct / 100));
  const cogs = monthlyRevenue - grossProfit;
  const grossMargin = Math.round((grossProfit / monthlyRevenue) * 1000) / 10;
  
  const operatingProfit = Math.round(monthlyRevenue * (def.operatingMarginPct / 100));
  const operatingMargin = Math.round((operatingProfit / monthlyRevenue) * 1000) / 10;
  
  const totalOpex = grossProfit - operatingProfit;
  
  // 合理的推計内訳（Opex分解）
  const serverAndApi = Math.round(totalOpex * 0.2);
  const advertising = Math.round(totalOpex * 0.15);
  const toolsAndSaaS = Math.round(totalOpex * 0.15);
  const subcontracting = 0;
  const other = totalOpex - (serverAndApi + advertising + toolsAndSaaS + subcontracting);
  
  const estimatedAnnualNetProfit = Math.round(operatingProfit * 12 * 0.75);

  const fxNote = def.currency === 'JPY' ? '' : ` (${fx.formula})`;

  return {
    id: def.id,
    ticker: def.ticker,
    name: def.name,
    legalEntity: def.legalEntity || `${def.name} Inc.`,
    tagline: def.tagline,
    sector: def.sector,
    scale: def.scale,
    founder: def.founder,
    country: def.country,
    url: def.url,
    verifiedBadge: true,
    growthRateYoY: def.growthRateYoY,
    architecturePattern: def.architecturePattern,
    pipelineStack: def.pipelineStack,
    targetPainWallet: def.targetPainWallet,
    tags: def.tags,
    pnl: {
      monthlyRevenue,
      cogs,
      grossProfit,
      grossMargin,
      operatingExpenses: {
        serverAndApi,
        advertising,
        subcontracting,
        toolsAndSaaS,
        other
      },
      operatingProfit,
      operatingMargin,
      estimatedAnnualNetProfit,
      financialStatus: 'REPORTED',
      isRevenueUnconfirmed: false,
      isMarginUnconfirmed: false,
      revenueLabel: `${def.revenueSourceNote}${fxNote}`,
      dataSnapshotPeriod: `${def.snapshotYear}年観測データ`,
      sourceDoc: def.revenueSourceNote
    },
    operations: {
      teamSize: def.teamSize,
      weeklyHours: def.teamSize === 1 ? 20 : 40,
      initialCapitalRequired: def.teamSize === 1 ? 50000 : 1000000,
      automationLevel: def.teamSize === 1 ? 95 : 75,
      primaryChannels: def.initialTraction.slice(0, 3),
      toolStack: [
        { name: 'Stripe Billing', category: '決済関所', monthlyCost: Math.round(monthlyRevenue * 0.03) },
        { name: 'Cloud Infrastructure', category: 'ホスティング', monthlyCost: serverAndApi }
      ]
    },
    strategy: {
      blindspot: def.blindspot,
      moatType: def.moatType,
      moatDescription: def.moatDescription,
      initialTraction: def.initialTraction,
      actionPlaybook: def.actionPlaybook
    },
    lootBlueprint: {
      targetPrey: def.targetPrey,
      structuralFlaw: def.structuralFlaw,
      stealthEntry: def.stealthEntry,
      tollGateSetup: def.tollGateSetup,
      reproducibilityScore: 85,
      moatDurabilityScore: 80,
      capitalEfficiencyScore: 92,
      executionChecklist: [
        '対象領域の既存高額ツールの不満・痛みを特定する',
        '単一機能に特化したMVPを最小コストで構築する',
        '前金課金または決済手数料関所を直結して初日から現金を回収する'
      ]
    },
    observations: def.observations
  };
}
