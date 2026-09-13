import { ingestVerifiedEntities } from './real-ingest-pipeline';
import { sha256Hex } from '../../src/lib/storage/r2';
import type { FinancialEntity } from '../../src/platform/types/terminal';

async function main() {
  console.log('Fetching authentic external raw artifact from https://screen.studio ...');
  const res = await fetch('https://screen.studio', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch authentic bytes from https://screen.studio: HTTP ${res.status}`);
  }
  const rawHtml = await res.text();
  console.log(`  ✓ Fetched authentic website bytes: ${Buffer.byteLength(rawHtml)} bytes`);

  // Extract authentic metadata from raw HTML - NO hardcoded fallbacks, UNKNOWN if missing
  const titleMatch = rawHtml.match(/<title[^>]*>(.*?)<\/title>/i);
  const extractedTitle = titleMatch ? titleMatch[1].trim() : 'UNKNOWN';

  const authorMatch = rawHtml.match(/<meta[^>]*name=["']author["'][^>]*content=["'](.*?)["']/i);
  const extractedAuthor = authorMatch ? authorMatch[1].trim() : 'UNKNOWN';

  const descMatch = rawHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i);
  const extractedDesc = descMatch ? descMatch[1].trim() : 'UNKNOWN';

  // Compute authentic Raw SHA-256 CAS Evidence ID
  const rawSha = await sha256Hex(rawHtml);
  const evidenceId = `ev_raw_${rawSha.slice(0, 16)}`;

  const screenStudioEntity: FinancialEntity = {
    id: 'ent_screen_studio',
    ticker: 'SCRNSTD',
    name: 'Screen Studio',
    legalEntity: 'UNKNOWN',
    tagline: extractedTitle,
    sector: 'NICHE_SAAS',
    scale: 'UNKNOWN',
    founder: extractedAuthor,
    country: 'GLOBAL',
    url: 'https://screen.studio',
    verifiedBadge: false,
    pnl: {
      monthlyRevenue: 0,
      cogs: 0,
      grossProfit: 0,
      grossMargin: 0,
      operatingExpenses: {
        serverAndApi: 0,
        advertising: 0,
        subcontracting: 0,
        toolsAndSaaS: 0,
        other: 0
      },
      operatingProfit: 0,
      operatingMargin: 0,
      estimatedAnnualNetProfit: 0,
      financialStatus: 'UNAVAILABLE',
      isRevenueUnconfirmed: true,
      isOperatingProfitUnconfirmed: true,
      isMarginUnconfirmed: true,
      isGrossProfitUnconfirmed: true,
      revenueLabel: '公式Web公開財務未確認（ライセンス販売モデル）',
      dataSnapshotPeriod: '2026年 公式Web原本観測',
      sourceDoc: 'https://screen.studio 公式Web原本'
    },
    evidenceCards: [
      {
        id: evidenceId,
        type: 'ASYMMETRIC_LEVERAGE',
        title: extractedTitle,
        badge: '公式Web原本',
        evidenceStatus: 'VERIFIED',
        punchline: extractedDesc,
        details: [
          '公式Webサイト（https://screen.studio）のHTML原本から直接抽出した客観的製品仕様。',
          `創業者・著者メタデータ: ${extractedAuthor}`,
          `原本SHA-256 CASダイジェスト: ${rawSha}`
        ],
        sourceNote: 'https://screen.studio 公式サイト原本（SHA-256 CAS検証済み）',
        evidenceLocator: {
          type: 'html',
          cssSelector: 'meta[name="author"], title, meta[name="description"]'
        }
      }
    ],
    strategy: {
      blindspot: '未調査（詳細深掘り待ち）',
      moatType: 'UNKNOWN',
      moatDescription: '一次情報原本収集済み・詳細深掘り調査待ち',
      initialTraction: [],
      actionPlaybook: []
    },
    observations: [
      extractedDesc
    ],
    observationsStream: [
      {
        id: 'obs_screenstudio_01',
        text: extractedDesc,
        sourceUrl: 'https://screen.studio',
        observedAt: new Date().toISOString().slice(0, 10)
      }
    ],
    lootBlueprint: {
      targetPrey: '未確認',
      structuralFlaw: '未確認',
      stealthEntry: '未確認',
      tollGateSetup: '未確認',
      reproducibilityScore: 0,
      moatDurabilityScore: 0,
      capitalEfficiencyScore: 0,
      executionChecklist: [
        '1. 公式Web原本の解析完了（SHA-256 CAS保全済み）'
      ]
    },
    operations: {
      teamSize: 0,
      isTeamSizeUnconfirmed: true,
      weeklyHours: 0,
      isWeeklyHoursUnconfirmed: true,
      initialCapitalRequired: 0,
      isCapitalUnconfirmed: true,
      automationLevel: 0,
      isAutomationUnconfirmed: true,
      primaryChannels: [],
      toolStack: []
    },
    opportunityJudgment: {
      verdict: 'MONITOR',
      verdictLabel: '未判定',
      oneLineReason: extractedDesc,
      demandDelta: '未確認',
      competitionDelta: '未確認',
      entryRequirements: {
        capital: '未確認',
        technicalDifficulty: 'UNKNOWN',
        platformRisk: 'UNKNOWN'
      }
    },
    growthRateYoY: 0,
    isGrowthUnconfirmed: true,
    architecturePattern: '未確認',
    pipelineStack: '未確認',
    targetPainWallet: '未確認',
    tags: ['macOS', '録画', 'SaaS', 'Screen Studio'],
    publishability: 'PARTIAL'
  };

  console.log('Ingesting Screen Studio into pipeline with Authentic Raw Artifact...');
  await ingestVerifiedEntities([
    {
      entity: screenStudioEntity,
      rawArtifacts: [
        {
          filename: 'screen_studio_official_landing.html',
          contentType: 'text/html; charset=utf-8',
          content: rawHtml,
          sourceUrl: 'https://screen.studio'
        }
      ]
    }
  ], 'screen-studio-sample-proof');
  console.log('Screen Studio ingested successfully!');
}

main().catch(err => {
  console.error('Ingest failed:', err);
  process.exit(1);
});

