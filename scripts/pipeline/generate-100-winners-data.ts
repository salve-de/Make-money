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

  // 業態特性に応じた動的チャネル・ツールスタック・略奪チェックリストの配分
  const isOffline = def.sector === 'PHYSICAL_ASSET' || def.sector === 'LOCAL_SERVICES' || def.sector === 'MONOPOLY_MFG';
  const isContent = def.sector === 'CONTENT_MEDIA';
  const isFintech = def.sector === 'FINTECH_INFRA';

  // 1. ToolStack（オフラインにStripeを突っ込むバグの完全撲滅）
  const resolvedToolStack = def.toolStack || (
    isOffline
      ? [
          { name: 'POS & 店舗・流通基幹EDI', category: '店舗・物流オペレーション', monthlyCost: Math.round(toolsAndSaaS * 0.6) },
          { name: '自社サプライチェーン管理', category: '受発注・在庫管理', monthlyCost: Math.round(toolsAndSaaS * 0.4) }
        ]
      : isContent
      ? [
          { name: 'ESP / ニュースレター配信基盤', category: '配信配管', monthlyCost: Math.round(toolsAndSaaS * 0.6) },
          { name: 'Stripe Billing', category: '決済関所', monthlyCost: Math.round(monthlyRevenue * 0.03) }
        ]
      : isFintech
      ? [
          { name: 'BaaS / 銀行コアAPI・清算網', category: '金融インフラ', monthlyCost: Math.round(toolsAndSaaS * 0.7) },
          { name: 'AML / 本人確認KYC基盤', category: 'コンプライアンス関所', monthlyCost: Math.round(toolsAndSaaS * 0.3) }
        ]
      : [
          { name: 'Stripe Billing', category: '決済関所', monthlyCost: Math.round(monthlyRevenue * 0.03) },
          { name: 'Cloud Infrastructure', category: 'ホスティング', monthlyCost: serverAndApi }
        ]
  );

  // 2. ExecutionChecklist（業態に即した略奪ステップ）
  const resolvedChecklist = def.executionChecklist || (
    isOffline
      ? [
          '既存流通（問屋・小売）が中抜きしている多重マージンの無駄を特定する',
          '工場（OEM）または遊休不動産を直結し、圧倒的低原価のプロトタイプを仕込む',
          '自社直販・現金回収を徹底し、広告費ゼロで熱狂的ファン口コミにより拡大する'
        ]
      : isContent
      ? [
          '既存ニュース・媒体の退屈さ・長文の苦痛を突き、1分で読める短尺フォーマットを作る',
          '無料ニュースレターやSNSで熱狂的な読者プールを囲い込む',
          '単価数百万円のスポンサー直販枠または有料限定コミュニティを開設して現金を抜く'
        ]
      : isFintech
      ? [
          '伝統的銀行・金融機関が貪っている不当な為替・送金・月額手数料の盲点を特定する',
          '既存API（Stripe, BaaS, Plaid）の上に極上のUXラッパーを被せる',
          'トランザクション手数料またはデポジット金利スプレッドから初日から現金を抜く'
        ]
      : [
          '対象領域の既存巨大ツールの過剰機能と価格高騰に対する怨嗟を特定する',
          '急所となる単一機能に特化した超軽量MVPを最小工数で構築する',
          '前金年払いプランまたは即時決済APIを直結し、初動から広告費ゼロで回収する'
        ]
  );

  // 3. PrimaryChannels（初動ゲリラ戦のコピペではなく主集客エンジンを個別配分）
  const resolvedPrimaryChannels = def.primaryChannels || [
    `【主集客】${def.architecturePattern.split('×')[0] || def.name}`,
    `【バイラル配管】${def.initialTraction[0] || 'ファン口コミ'}`,
    `【リピート関所】${def.tollGateSetup}`
  ];

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
      primaryChannels: resolvedPrimaryChannels,
      toolStack: resolvedToolStack
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
      executionChecklist: resolvedChecklist
    },
    observations: def.observations
  };
}
