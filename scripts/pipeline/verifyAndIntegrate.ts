/**
 * KIN-KOROKU data collection pipeline - STAGE 3: VERIFY & SYNTHESIS
 *
 * This stage is a promotion gate. It must never manufacture missing facts.
 */

import type { ExtractedDossier } from './extractDossier';
import type { FinancialEntity, SectorCategory } from '../../src/platform/types/terminal';
import { assertCollectionGeneratedPayload } from './collection-semantic-validator';

const ALLOWED_SECTORS = new Set<SectorCategory>([
  'AI_AUTOMATION',
  'NICHE_SAAS',
  'MONOPOLY_MFG',
  'CONTENT_MEDIA',
  'PHYSICAL_ASSET',
  'FINTECH_INFRA',
  'LOCAL_SERVICES',
  'UNKNOWN',
]);

type CollectionMeta = {
  verificationStatus: 'SUPPORTED';
  collectionTier?: 'CANDIDATE' | 'HIGH_SIGNAL';
  sectorEvidence?: {
    value: SectorCategory;
    verificationStatus: 'SUPPORTED';
    sourceUrls: string[];
    note: string;
  };
};

function finiteNumber(value: number | null, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`[COLLECTION REJECTED: MISSING FACT] ${label} is not supportably known; keep it null/UNKNOWN upstream instead of fabricating a number.`);
  }
  return value;
}

function knownText(value: string | null | undefined): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return text && text !== 'UNKNOWN' ? text : 'UNKNOWN';
}

function scaleFromTeamSize(teamSize: number | null): FinancialEntity['scale'] {
  if (teamSize === null || !Number.isFinite(teamSize) || teamSize < 1) return 'UNKNOWN';
  if (teamSize === 1) return 'SOLO';
  if (teamSize <= 10) return 'SMALL_TEAM';
  if (teamSize <= 50) return 'SCALEUP';
  return 'ENTERPRISE';
}

/**
 * Promote a supported ExtractedDossier into FinancialEntity without inventing
 * sector, costs, profit, growth, tools, or operational facts.
 */
export function verifyAndIntegrate(dossier: ExtractedDossier): FinancialEntity {
  console.log(`[STAGE 3: VERIFY & SYNTHESIS] validating: ${dossier.entity.name}...`);

  if (dossier.evidenceVerification.verificationStatus !== 'SUPPORTED') {
    throw new Error(
      `[COLLECTION REJECTED: UNVERIFIED DOSSIER] ${dossier.entity.name} remains CANDIDATE/UNVERIFIED; do not synthesize a publishable entity.`,
    );
  }

  if (!dossier.evidenceVerification.sourceUrl?.trim()) {
    throw new Error(
      `[COLLECTION REJECTED: MISSING SOURCE] ${dossier.entity.name} has no source URL for supported promotion.`,
    );
  }

  if (dossier.evidenceVerification.reliabilityRating === 'ESTIMATED') {
    throw new Error(
      `[COLLECTION REJECTED: ESTIMATE WITHOUT METHOD] ${dossier.entity.name} carries ESTIMATED values but ExtractedDossier has no inputs/formula/assumptions contract. Keep it upstream until methodology is explicit.`,
    );
  }

  const monthlyRevenue = finiteNumber(dossier.moneyFlow.monthlyRevenueJpy, 'moneyFlow.monthlyRevenueJpy');
  const grossMargin = finiteNumber(dossier.moneyFlow.grossMarginPercent, 'moneyFlow.grossMarginPercent');
  const operatingProfit = finiteNumber(dossier.moneyFlow.operatingProfitJpy, 'moneyFlow.operatingProfitJpy');

  if (monthlyRevenue < 0) throw new Error('[COLLECTION REJECTED] monthly revenue cannot be negative.');
  if (grossMargin < 0 || grossMargin > 100) throw new Error('[COLLECTION REJECTED] gross margin must be 0..100.');

  const grossProfit = Math.round(monthlyRevenue * (grossMargin / 100));
  const cogs = monthlyRevenue - grossProfit;
  const residualOperatingExpenses = grossProfit - operatingProfit;
  if (residualOperatingExpenses < 0) {
    throw new Error(
      `[COLLECTION REJECTED: ARITHMETIC] ${dossier.entity.name} operatingProfit exceeds grossProfit; source values are internally inconsistent.`,
    );
  }

  const sectorCandidate = ALLOWED_SECTORS.has(dossier.entity.sector as SectorCategory)
    ? dossier.entity.sector as SectorCategory
    : 'UNKNOWN';
  const sector = sectorCandidate || 'UNKNOWN';

  const teamSize = dossier.entity.teamSize;
  const weeklyHours = dossier.operations.weeklyHours;
  const automationLevel = dossier.operations.automationLevelPercent;
  const sourceUrl = dossier.evidenceVerification.sourceUrl;
  const sourceStatus = dossier.evidenceVerification.reliabilityRating === 'OBSERVED' ? 'REPORTED' : 'REPORTED';
  const capturedAt = dossier.evidenceVerification.capturedAt || new Date().toISOString();

  const evidenceCardId = `ev_${dossier.leadId.replace(/[^a-zA-Z0-9_-]/g, '_')}_source`;

  const baseEntity: FinancialEntity = {
    id: `ent_generated_${dossier.leadId}`,
    ticker: dossier.entity.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'UNKNOWN',
    name: dossier.entity.name,
    tagline: knownText(dossier.exposureAudit.guerrillaTraction) !== 'UNKNOWN'
      ? knownText(dossier.exposureAudit.guerrillaTraction)
      : `${dossier.entity.name}: supported source captured; business details remain partially unknown.`,
    sector,
    scale: scaleFromTeamSize(teamSize),
    founder: knownText(dossier.entity.founder),
    country: knownText(dossier.entity.country),
    url: dossier.entity.url || sourceUrl,
    verifiedBadge: true,
    growthRateYoY: 0,
    isGrowthUnconfirmed: true,
    architecturePattern: knownText(dossier.moneyFlow.pricingModel),
    pipelineStack: dossier.operations.toolStack.length
      ? dossier.operations.toolStack.map((tool) => tool.name).join(' × ')
      : 'UNKNOWN',
    targetPainWallet: knownText(dossier.moneyFlow.payer),
    tags: ['検証済み収集'],
    pnl: {
      monthlyRevenue,
      cogs,
      grossProfit,
      grossMargin,
      operatingExpenses: {
        serverAndApi: 0,
        advertising: 0,
        subcontracting: 0,
        toolsAndSaaS: 0,
        other: residualOperatingExpenses,
      },
      operatingProfit,
      operatingMargin: monthlyRevenue > 0
        ? Number(((operatingProfit / monthlyRevenue) * 100).toFixed(2))
        : 0,
      estimatedAnnualNetProfit: 0,
      isNetProfitUnconfirmed: true,
      isCostsUnconfirmed: true,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: `observed_at=${capturedAt}`,
      sourceDoc: sourceUrl,
    },
    operations: {
      teamSize: teamSize ?? 0,
      isTeamSizeUnconfirmed: teamSize === null,
      weeklyHours: weeklyHours ?? 0,
      isWeeklyHoursUnconfirmed: weeklyHours === null,
      initialCapitalRequired: 0,
      isCapitalUnconfirmed: true,
      automationLevel: automationLevel ?? 0,
      isAutomationUnconfirmed: automationLevel === null,
      primaryChannels: [],
      toolStack: dossier.operations.toolStack.map((tool) => ({
        name: tool.name,
        category: tool.category,
        monthlyCost: tool.monthlyCostJpy,
        purpose: 'source-extracted tool relationship',
      })),
    },
    strategy: {
      blindspot: knownText(dossier.exposureAudit.platformGlitch),
      moatType: 'UNKNOWN',
      moatDescription: 'UNKNOWN',
      initialTraction: knownText(dossier.exposureAudit.guerrillaTraction) === 'UNKNOWN'
        ? []
        : [dossier.exposureAudit.guerrillaTraction],
      actionPlaybook: [],
    },
    evidenceCards: [
      {
        id: evidenceCardId,
        type: 'SMOKING_GUN',
        title: `${dossier.entity.name} source evidence`,
        badge: '収集元',
        evidenceStatus: sourceStatus,
        punchline: knownText(dossier.exposureAudit.guerrillaTraction),
        details: [
          `sourcePlatform: ${knownText(dossier.evidenceVerification.sourcePlatform)}`,
          `verificationStatus: ${dossier.evidenceVerification.verificationStatus}`,
          `capturedAt: ${capturedAt}`,
        ],
        sourceNote: sourceUrl,
      },
    ],
    observationsStream: [
      {
        id: evidenceCardId,
        category: 'TECH_VERIFICATION',
        categoryLabel: '収集元と確認状態',
        text: `Supported source retained for ${dossier.entity.name}; unknown fields were not filled by inference.`,
        originType: 'reported',
        verificationStatus: 'SUPPORTED',
        sourceUrl,
        observedAt: capturedAt,
      },
    ],
    unknownsNotes: [
      'Annual net profit is unknown; no monthly-to-annual or operating-profit-to-net-profit conversion was performed.',
      'Operating expense component split is unknown; only the arithmetic residual is retained in compatibility field other.',
      ...(sector === 'UNKNOWN' ? ['Sector classification is UNKNOWN because no explicit supported classification was retained.'] : []),
    ],
    publishability: 'PARTIAL',
  };

  const entity = baseEntity as FinancialEntity & CollectionMeta;
  entity.verificationStatus = 'SUPPORTED';
  if (dossier.collectionTier) entity.collectionTier = dossier.collectionTier;
  if (sector !== 'UNKNOWN') {
    entity.sectorEvidence = {
      value: sector,
      verificationStatus: 'SUPPORTED',
      sourceUrls: [sourceUrl],
      note: 'Sector value is preserved only from this supported extracted dossier; no default AI classification was applied.',
    };
  }

  assertCollectionGeneratedPayload(entity, {
    requireSectorEvidence: true,
    label: `verifyAndIntegrate:${dossier.leadId}`,
  });

  console.log(`[STAGE 3: VERIFY & SYNTHESIS] promotion passed: ${entity.id} (${entity.name})`);
  return entity;
}
