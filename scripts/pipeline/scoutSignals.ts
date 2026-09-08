/**
 * KIN-KOROKU データ収集パイプライン - STAGE 1: SCOUT
 * 世界中のノイズ・一次情報から「売上急増・少人数高収益・市場の歪み」のシグナルを収集する。
 * 
 * 準拠: PROJECT_CHARTER.md (Ⅱ. データ収集パイプライン)
 * 準拠: docs/DATA_COLLECTION_CONTRACT.md (1. 収集と信頼度を分離する)
 */

export interface RawSignalLead {
  id: string;
  sourcePlatform: 'REDDIT' | 'PRODUCT_HUNT' | 'X_TWITTER' | 'INDIE_HACKERS' | 'SEC_EDGAR' | 'DIRECT_DISCLOSURE';
  sourceUrl: string;
  authorOrHandle: string;
  capturedAt: string;
  rawText: string;
  extractedKeywords: string[];
  initialSignals: {
    claimedRevenue?: string;
    claimedProfitOrMargin?: string;
    teamSize?: number;
    businessModel?: string;
    glitchOrLoophole?: string;
  };
}

/**
 * サンプルシードシグナル（Scoutが検知した一次情報の典型例）
 */
export const SAMPLE_SCOUT_SIGNALS: RawSignalLead[] = [
  {
    id: 'sig_reddit_001',
    sourcePlatform: 'REDDIT',
    sourceUrl: 'https://reddit.com/r/SaaS/comments/sample_headshot',
    authorOrHandle: 'u/DannyPostma',
    capturedAt: '2023-11-15T12:00:00Z',
    rawText: `Launched an AI headshot tool for remote teams. Reached $250k MRR in 6 months with 1 employee. 
    Key was programmatic SEO for 'ai business photo' keywords and offering team bundles directly to HR managers using corporate cards. 
    Used Replicate + Dreambooth under the hood. Cost per generation is around $3, charging $39.`,
    extractedKeywords: ['AI Headshot', 'B2B', 'Programmatic SEO', 'Replicate', 'Corporate Card'],
    initialSignals: {
      claimedRevenue: '$250,000 / month',
      claimedProfitOrMargin: '70% gross margin',
      teamSize: 1,
      businessModel: 'B2B AI Photos',
      glitchOrLoophole: 'Companies have corporate card expense allowances that bypass individual purchase friction',
    },
  },
  {
    id: 'sig_x_002',
    sourcePlatform: 'X_TWITTER',
    sourceUrl: 'https://x.com/levelsio/status/sample_photoai',
    authorOrHandle: '@levelsio',
    capturedAt: '2023-08-20T08:30:00Z',
    rawText: `Photo AI just hit $110k MRR. 100% solo bootstrap. 0 employees, just me, PHP, SQLite, and GPU servers on Hetzner + Replicate. 
    People said native app is needed, but Apple rejected my app 3 times. So I went 100% PWA on web. Zero app store tax, instant deploys.`,
    extractedKeywords: ['Photo AI', 'Solo', 'PHP', 'PWA', 'Hetzner', 'Replicate', 'App Store Bypass'],
    initialSignals: {
      claimedRevenue: '$110,000 / month',
      claimedProfitOrMargin: '85% profit margin',
      teamSize: 1,
      businessModel: 'B2C AI Photo Generator',
      glitchOrLoophole: 'Bypass App Store 30% tax and strict review delays by shipping PWA on Safari directly',
    },
  },
  {
    id: 'sig_indie_003',
    sourcePlatform: 'INDIE_HACKERS',
    sourceUrl: 'https://indiehackers.com/post/sample_easlo',
    authorOrHandle: 'Easlo',
    capturedAt: '2022-12-10T15:45:00Z',
    rawText: `Making $40,000/mo selling Notion templates at age 20. 
    Initial traction came entirely from posting 3 Notion tips daily on Twitter and giving free templates in replies. 
    Then monetized with bundles on Gumroad. $0 cost of goods, 99% profit margin.`,
    extractedKeywords: ['Notion', 'Digital Products', 'Gumroad', 'Twitter Funnel', 'Zero COGS'],
    initialSignals: {
      claimedRevenue: '$40,000 / month',
      claimedProfitOrMargin: '99% margin',
      teamSize: 1,
      businessModel: 'Template Downloads',
      glitchOrLoophole: 'Monetizing free software confusion by packaging complete turnkey workflows',
    },
  },
];

/**
 * Scout実行エントリポイント
 * 将来の自動クローラー（Reddit API, X API, Firecrawl, SerpApi）との接続窓口
 */
export async function runScoutStage(sourceFilter?: string): Promise<RawSignalLead[]> {
  console.log('[STAGE 1: SCOUT] シグナル探索エンジン起動...');
  console.log(`[STAGE 1: SCOUT] ソースフィルター: ${sourceFilter || 'ALL'}`);
  
  const results = sourceFilter 
    ? SAMPLE_SCOUT_SIGNALS.filter(s => s.sourcePlatform === sourceFilter)
    : SAMPLE_SCOUT_SIGNALS;
    
  console.log(`[STAGE 1: SCOUT] 検知された有望シグナル: ${results.length}件`);
  return results;
}
