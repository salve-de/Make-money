import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, relative, resolve } from 'node:path';

import { isPublishableEntity } from '@/lib/company-access/public-entity';
import { FINANCIAL_RECONCILIATIONS, reconcileFinancialEntity } from '@/platform/data/financial-reconciliation';
import type { FinancialEntity } from '@/shared/terminal';
import {
  inspectFinancialEvidenceConsistency,
  normalizeFinancialEntity,
  type FinancialEvidenceDomain,
} from '@/shared/financial-integrity';

type IndexedEntity = FinancialEntity & { reportedMetrics?: unknown };
type FinancialFlag =
  | 'isRevenueUnconfirmed'
  | 'isCogsUnconfirmed'
  | 'isGrossProfitUnconfirmed'
  | 'isGrossMarginUnconfirmed'
  | 'isCostsUnconfirmed'
  | 'isOperatingProfitUnconfirmed'
  | 'isMarginUnconfirmed'
  | 'isNetProfitUnconfirmed';
type EvidenceReferenceKind = 'explicitUnknown' | 'annualRevenue' | 'monthlyRevenue';
type EvidenceReference = {
  kind: EvidenceReferenceKind;
  pointer: string;
  sha256: string;
  evidenceIndex: number;
};
type FlagChanges = { added: FinancialFlag[]; removed: FinancialFlag[] };

const FINANCIAL_FLAGS: FinancialFlag[] = [
  'isRevenueUnconfirmed',
  'isCogsUnconfirmed',
  'isGrossProfitUnconfirmed',
  'isGrossMarginUnconfirmed',
  'isCostsUnconfirmed',
  'isOperatingProfitUnconfirmed',
  'isMarginUnconfirmed',
  'isNetProfitUnconfirmed',
];
const EXPECTED_SOURCE_SHA256 = '5b9ecc23f47150534032b4bc1d8a6651938c0d2a978e55b871c36597b1c1ebd4';
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SOURCE_PATH = resolve(REPOSITORY_ROOT, 'data/entities-index.json');
const DEFAULT_REPORT_PATH = resolve(REPOSITORY_ROOT, 'reports/financial-reconciliation-2026-09-21.json');
const PUBLIC_FINANCIAL_SIGNAL = /月商|年商|売上|利益|revenue|arr|mrr|sales|¥|\$|円|億|万/i;

function newlyAddedFlags(before: FinancialEntity, after: FinancialEntity): FinancialFlag[] {
  return FINANCIAL_FLAGS.filter((field) => !before.pnl[field] && Boolean(after.pnl[field]));
}

function changedFlags(before: FinancialEntity, after: FinancialEntity): FlagChanges {
  return {
    added: FINANCIAL_FLAGS.filter((field) => !before.pnl[field] && Boolean(after.pnl[field])),
    removed: FINANCIAL_FLAGS.filter((field) => Boolean(before.pnl[field]) && !after.pnl[field]),
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hashJson(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function reportedMetricText(metric: Record<string, unknown>): string {
  return [metric.original, metric.context]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .trim();
}

function evidenceReferences(
  entity: IndexedEntity,
  sourceIndex: number,
  consistency: ReturnType<typeof inspectFinancialEvidenceConsistency>,
  evidence: string[],
): EvidenceReference[] {
  const targets: Array<{ kind: EvidenceReferenceKind; excerpt: string }> = [
    ...consistency.explicitUnknownEvidence.map((excerpt) => ({ kind: 'explicitUnknown' as const, excerpt })),
    ...consistency.annualRevenueEvidence.map((excerpt) => ({ kind: 'annualRevenue' as const, excerpt })),
    ...consistency.monthlyRevenueEvidence.map((excerpt) => ({ kind: 'monthlyRevenue' as const, excerpt })),
  ];
  const evidenceIndexes = new Map(evidence.map((excerpt, index) => [excerpt, index]));
  const references: EvidenceReference[] = [];
  const seen = new Set<string>();
  const addReference = (
    target: { kind: EvidenceReferenceKind; excerpt: string },
    pointer: string,
    sourceValue: string,
    sourceHash = sha256(sourceValue),
  ): void => {
    if (!target.excerpt || !sourceValue.includes(target.excerpt)) return;
    const key = `${target.kind}|${pointer}|${target.excerpt}`;
    if (seen.has(key)) return;
    seen.add(key);
    const evidenceIndex = evidenceIndexes.get(target.excerpt);
    if (evidenceIndex === undefined) return;
    references.push({ kind: target.kind, pointer, sha256: sourceHash, evidenceIndex });
  };

  (entity.observations ?? []).forEach((text, observationIndex) => {
    for (const target of targets) {
      addReference(target, `#/${sourceIndex}/observations/${observationIndex}`, text);
    }
  });

  (entity.observationsStream ?? []).forEach((observation, observationIndex) => {
    const text = observation.text || '';
    for (const target of targets) {
      addReference(target, `#/${sourceIndex}/observationsStream/${observationIndex}/text`, text);
    }
  });

  const metrics = Array.isArray(entity.reportedMetrics)
    ? entity.reportedMetrics.filter((metric): metric is Record<string, unknown> => Boolean(metric && typeof metric === 'object'))
    : [];
  metrics.forEach((metric, metricIndex) => {
    const text = reportedMetricText(metric);
    for (const target of targets) {
      addReference(target, `#/${sourceIndex}/reportedMetrics/${metricIndex}`, text, hashJson(metric));
    }
  });

  return references;
}

function publicationExclusionReasons(entity: FinancialEntity): string[] {
  if (entity.publishability !== 'PUBLISHABLE') {
    return [`PUBLISHABILITY_${entity.publishability || 'UNSET'}`];
  }

  const hasCardEvidence = Array.isArray(entity.evidenceCards) && entity.evidenceCards.some(
    (card) => Boolean(card && (card.evidenceLocator || card.sourceClass || card.sourceNote)),
  );
  const hasStreamEvidence = Array.isArray(entity.observationsStream) && entity.observationsStream.some(
    (observation) => Boolean(observation && (observation.evidenceLocator || observation.sourceUrl || observation.sourceClass)),
  );
  if (!hasCardEvidence && !hasStreamEvidence) return ['NO_CASE_LEVEL_EVIDENCE_LOCATOR'];

  const claimsRevenue = Boolean(
    entity.pnl.monthlyRevenue !== null &&
    entity.pnl.monthlyRevenue !== undefined &&
    entity.pnl.monthlyRevenue > 0 &&
    !entity.pnl.isRevenueUnconfirmed,
  );
  if (!claimsRevenue) return ['UNEXPECTED_GATE_FAILURE_WITHOUT_REVENUE_CLAIM'];

  const isReportedOrEstimated = entity.pnl.financialStatus === 'REPORTED' ||
    entity.pnl.financialStatus === 'ESTIMATED' ||
    entity.pnl.financialStatus === 'POST_MORTEM';
  const hasBindings = Array.isArray(entity.claimBindings) && entity.claimBindings.length > 0;
  if (!isReportedOrEstimated || hasBindings) {
    return hasBindings
      ? ['CLAIM_EVIDENCE_BINDING_VALIDATION_FAILED']
      : ['FINANCIAL_CLAIM_BINDING_REQUIRED'];
  }

  const allEvidenceText = [
    ...(entity.evidenceCards || []).map((card) => `${card.punchline || ''} ${(card.details || []).join(' ')} ${card.sourceNote || ''}`),
    ...(entity.observationsStream || []).map((observation) => observation.text || ''),
  ].join(' ');
  return PUBLIC_FINANCIAL_SIGNAL.test(allEvidenceText)
    ? ['UNEXPECTED_GATE_FAILURE_WITH_FINANCIAL_SIGNAL']
    : ['NO_BINDING_FINANCIAL_SIGNAL'];
}

function countReasons(records: Array<{ reasons: string[] }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of records) {
    for (const reason of record.reasons) counts[reason] = (counts[reason] ?? 0) + 1;
  }
  return counts;
}

function numericPnl(entity: FinancialEntity) {
  return {
    monthlyRevenue: entity.pnl.monthlyRevenue,
    cogs: entity.pnl.cogs,
    grossProfit: entity.pnl.grossProfit,
    operatingProfit: entity.pnl.operatingProfit,
    operatingMargin: entity.pnl.operatingMargin,
    estimatedAnnualNetProfit: entity.pnl.estimatedAnnualNetProfit,
  };
}

function domainCounts(findings: Array<{ domains: FinancialEvidenceDomain[] }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const finding of findings) {
    for (const domain of finding.domains) counts[domain] = (counts[domain] ?? 0) + 1;
  }
  return counts;
}

export interface FinancialReconciliationAuditReport {
  schemaVersion: 'financial-reconciliation-audit.v2';
  format: {
    representation: 'compact-findings';
    rawEntityCopies: false;
    evidenceRetained: true;
    evidenceReferences: 'json-pointer+sha256';
  };
  source: {
    path: string;
    sha256: string;
    expectedSha256: string;
    sha256MatchesExpected: boolean;
    recordCount: number;
  };
  scope: {
    readOnlyProjection: true;
    originalNumbersPreserved: true;
    annualMonthlyConversionPerformed: false;
    reCollectionPerformed: false;
    excluded: string[];
  };
  classification: {
    evidenceCandidates: number;
    explicitUnknownCandidates: number;
    revenuePeriodConflictCandidates: number;
    evidenceCandidatesWithNewFlags: number;
    projectedRecordsWithNewFlags: number;
    otherProjectionRecordsWithNewFlags: number;
    legacyReconciliationDefinitions: number;
    legacyAuditedRecords: number;
    legacyDefinitionsMissingFromSource: string[];
    domainCounts: Record<string, number>;
  };
  publication: {
    beforePublishable: number;
    afterPublishable: number;
    delta: number;
    newlyHiddenIds: string[];
    newlyPublishedIds: string[];
    gateChanged: false;
  };
  exclusions: {
    beforeCount: number;
    afterCount: number;
    sameExcludedIds: boolean;
    reasonCounts: Record<string, number>;
    records: Array<{
      id: string;
      name: string;
      publishability?: string;
      reasons: string[];
    }>;
  };
  consumerObservations: Array<{
    scope: 'handoff-only';
    file: string;
    lines: string;
    observation: string;
    example: string;
    treatment: string;
  }>;
  legacyReconciliationRecords: Array<{ id: string; name: string }>;
  findings: Array<{
    id: string;
    name: string;
    domains: FinancialEvidenceDomain[];
    revenuePeriodConflict: boolean;
    reasons: string[];
    evidence: string[];
    evidenceReferences: EvidenceReference[];
    flagChanges: FlagChanges;
    numericFieldsPreserved: true;
    numericPnlBeforeSha256: string;
    numericPnlAfterSha256: string;
    conversionPerformed: false;
  }>;
}

export async function buildFinancialReconciliationAudit(sourcePath = DEFAULT_SOURCE_PATH): Promise<FinancialReconciliationAuditReport> {
  const sourceText = await readFile(sourcePath, 'utf8');
  const sourceHash = createHash('sha256').update(sourceText).digest('hex');
  const parsed: unknown = JSON.parse(sourceText);
  if (!Array.isArray(parsed)) throw new Error('entities-index.json must be an array');

  const sourceEntities = parsed as IndexedEntity[];
  const projectedEntities = sourceEntities.map((entity) => normalizeFinancialEntity(reconcileFinancialEntity(entity)));
  const candidates = sourceEntities.map((entity, index) => {
    const consistency = inspectFinancialEvidenceConsistency(entity);
    return { entity, projected: projectedEntities[index], consistency, sourceIndex: index };
  }).filter(({ consistency }) => consistency.explicitUnknownDomains.length > 0 || consistency.revenuePeriodConflict);

  const beforePublished = sourceEntities.filter((entity) => isPublishableEntity(entity)).map((entity) => entity.id);
  const afterPublished = projectedEntities.filter((entity) => isPublishableEntity(entity)).map((entity) => entity.id);
  const beforePublishedSet = new Set(beforePublished);
  const afterPublishedSet = new Set(afterPublished);
  const newlyHiddenIds = beforePublished.filter((id) => !afterPublishedSet.has(id));
  const newlyPublishedIds = afterPublished.filter((id) => !beforePublishedSet.has(id));
  const beforeExcludedRecords = sourceEntities
    .filter((entity) => !isPublishableEntity(entity))
    .map((entity) => ({
      id: entity.id,
      name: entity.name,
      publishability: entity.publishability,
      reasons: publicationExclusionReasons(entity),
    }));
  const afterExcludedIds = new Set(projectedEntities.filter((entity) => !isPublishableEntity(entity)).map((entity) => entity.id));
  const sameExcludedIds = beforeExcludedRecords.every((record) => afterExcludedIds.has(record.id)) &&
    afterExcludedIds.size === beforeExcludedRecords.length;

  const findings = candidates.map(({ entity, projected, consistency, sourceIndex }) => {
    const addedFlags = newlyAddedFlags(entity, projected);
    const reasons = consistency.reasons.length > 0 ? [...consistency.reasons] : ['既存根拠を保持し、未確認フラグのみread-time投影。'];
    if (addedFlags.length === 0) reasons.push('既存の未確認フラグが既に立っているため、表示状態を維持。');
    const evidence = [...new Set([
      ...consistency.explicitUnknownEvidence,
      ...consistency.annualRevenueEvidence,
      ...consistency.monthlyRevenueEvidence,
    ])];
    return {
      id: entity.id,
      name: entity.name,
      domains: consistency.explicitUnknownDomains,
      revenuePeriodConflict: consistency.revenuePeriodConflict,
      reasons,
      evidence,
      evidenceReferences: evidenceReferences(entity, sourceIndex, consistency, evidence),
      flagChanges: changedFlags(entity, projected),
      numericFieldsPreserved: true as const,
      numericPnlBeforeSha256: hashJson(numericPnl(entity)),
      numericPnlAfterSha256: hashJson(numericPnl(projected)),
      conversionPerformed: false as const,
    };
  });

  const legacyReconciliationRecords = sourceEntities
    .filter((entity) => Object.prototype.hasOwnProperty.call(FINANCIAL_RECONCILIATIONS, entity.name))
    .map((entity) => ({ id: entity.id, name: entity.name }));
  const legacyDefinitionsMissingFromSource = Object.keys(FINANCIAL_RECONCILIATIONS)
    .filter((name) => !sourceEntities.some((entity) => entity.name === name));
  const recordsWithNewFlags = sourceEntities.filter((entity, index) => newlyAddedFlags(entity, projectedEntities[index]).length > 0).length;
  const candidateIds = new Set(candidates.map(({ entity }) => entity.id));
  const evidenceCandidatesWithNewFlags = candidates.filter(({ entity, projected }) => newlyAddedFlags(entity, projected).length > 0).length;

  return {
    schemaVersion: 'financial-reconciliation-audit.v2',
    format: {
      representation: 'compact-findings',
      rawEntityCopies: false,
      evidenceRetained: true,
      evidenceReferences: 'json-pointer+sha256',
    },
    source: {
      path: sourcePath.startsWith(`${REPOSITORY_ROOT}/`) ? relative(REPOSITORY_ROOT, sourcePath) : sourcePath,
      sha256: sourceHash,
      expectedSha256: EXPECTED_SOURCE_SHA256,
      sha256MatchesExpected: sourceHash === EXPECTED_SOURCE_SHA256,
      recordCount: sourceEntities.length,
    },
    scope: {
      readOnlyProjection: true,
      originalNumbersPreserved: true,
      annualMonthlyConversionPerformed: false,
      reCollectionPerformed: false,
      excluded: ['2050', 'v0', 'push', 'deploy', 'R2 write', 'new cron', 'catalog/API/hooks/grid edits'],
    },
    classification: {
      evidenceCandidates: candidates.length,
      explicitUnknownCandidates: candidates.filter(({ consistency }) => consistency.explicitUnknownDomains.length > 0).length,
      revenuePeriodConflictCandidates: candidates.filter(({ consistency }) => consistency.revenuePeriodConflict).length,
      evidenceCandidatesWithNewFlags,
      projectedRecordsWithNewFlags: recordsWithNewFlags,
      otherProjectionRecordsWithNewFlags: sourceEntities.filter((entity, index) => !candidateIds.has(entity.id) && newlyAddedFlags(entity, projectedEntities[index]).length > 0).length,
      legacyReconciliationDefinitions: Object.keys(FINANCIAL_RECONCILIATIONS).length,
      legacyAuditedRecords: legacyReconciliationRecords.length,
      legacyDefinitionsMissingFromSource,
      domainCounts: domainCounts(candidates.map(({ consistency }) => ({ domains: consistency.explicitUnknownDomains }))),
    },
    publication: {
      beforePublishable: beforePublished.length,
      afterPublishable: afterPublished.length,
      delta: afterPublished.length - beforePublished.length,
      newlyHiddenIds,
      newlyPublishedIds,
      gateChanged: false,
    },
    exclusions: {
      beforeCount: beforeExcludedRecords.length,
      afterCount: afterExcludedIds.size,
      sameExcludedIds,
      reasonCounts: countReasons(beforeExcludedRecords),
      records: beforeExcludedRecords,
    },
    consumerObservations: [{
      scope: 'handoff-only',
      file: 'src/lib/foundation/foundation-adapter.ts',
      lines: '175-202, 467-478',
      observation: 'parseRevenueToMonthlyJpyの数値入力分岐はunitを乗算せず、adaptFoundationDetailToFinancialEntityはMoneySignalのamountを数値のまま渡す。q40という文字列は現ローカルentities-indexには見当たらず、consumer契約の引き継ぎ観測として扱う。',
      example: 'q40: MoneySignal amount=49.6, currency=USD, unit=million',
      treatment: '別ownerのhelper/parser/worker作業へ正確に引き継ぐ。今回の財務棚卸しtaskでは編集・補正・確定化をしない。',
    }],
    legacyReconciliationRecords,
    findings,
  };
}

async function main(): Promise<void> {
  const report = await buildFinancialReconciliationAudit();
  const writeReport = process.argv.includes('--write-report');
  if (writeReport) {
    await mkdir(dirname(DEFAULT_REPORT_PATH), { recursive: true });
    await writeFile(DEFAULT_REPORT_PATH, `${JSON.stringify(report)}\n`, 'utf8');
  }
  console.log(JSON.stringify({
    source: report.source,
    classification: report.classification,
    publication: report.publication,
    reportPath: writeReport ? DEFAULT_REPORT_PATH : undefined,
  }, null, 2));
}

const invokedAsMain = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedAsMain) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
