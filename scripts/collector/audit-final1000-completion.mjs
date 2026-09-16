import fs from 'node:fs';
import crypto from 'node:crypto';

const read = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const allPath = process.env.MM_ALL_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const finalPath = process.env.MM_FINAL_FILE ?? 'data/incoming/batch_final100_subset_of_new1000_20260916.json';
const receiptPath = `${finalPath}.receipt.json`;
const bundlePath = process.env.MM_BUNDLE_FILE ?? 'data/incoming/research-bundle_new1000_r2captured999_20260916.json';
const r2Path = process.env.MM_R2_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.r2-result.json';
const metricPath = process.env.MM_METRIC_FILE ?? 'data/incoming/raw_metric_support_audit_new1000_20260916.json';
const ledgerPath = process.env.MM_LEDGER_FILE ?? 'data/CLAIMED_TARGETS.txt';
const centralPath = process.env.MM_CENTRAL_FILE ?? 'data/entities-index.json';
const journalPath = process.env.MM_JOURNAL_FILE ?? 'data/incoming/foundation_journal_bounded_result_20260916.json';
const temporalPath = process.env.MM_TEMPORAL_AUDIT_FILE ?? 'data/incoming/temporal_success_window_audit_new1000_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/final1000_completion_audit_20260916.json';

const all = read(allPath);
const final = read(finalPath);
const receipt = read(receiptPath);
const bundle = read(bundlePath);
const r2 = read(r2Path);
const metric = read(metricPath);
const central = read(centralPath);
const journal = fs.existsSync(journalPath) ? read(journalPath) : null;
const temporal = fs.existsSync(temporalPath) ? read(temporalPath) : null;
const ledger = new Set(fs.readFileSync(ledgerPath, 'utf8').split(/\r?\n/).map((line) => line.replace(/\s*\[CLAIMED:.*$/, '').trim()).filter(Boolean));
const required = ['id', 'ticker', 'name', 'tagline', 'sector', 'scale', 'founder', 'country', 'url', 'pnl', 'evidenceCards', 'operations', 'strategy', 'temporal', 'essence', 'lootBlueprint', 'observations', 'observationsStream'];
const forbidden = ['サバンナOS', '略奪転用方程式', 'カニバリズム障壁', '身も蓋もない真実', '特異物証', '地雷検死', '検死開示', 'ホスティング関所', '決済関所'];
const normalize = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const text = (value) => JSON.stringify(value);
const duplicateCount = (items, key) => {
  const counts = new Map();
  for (const item of items) counts.set(normalize(item[key]), (counts.get(normalize(item[key])) ?? 0) + 1);
  return [...counts.values()].filter((count) => count > 1).length;
};
const centralIds = new Set(central.map((item) => normalize(item.id)));
const centralNames = new Set(central.map((item) => normalize(item.name)));
const centralTickers = new Set(central.map((item) => normalize(item.ticker)));
const claimMissing = (items) => items.filter((item) => !ledger.has(item.name)).map((item) => item.name);
const requiredMissing = (items) => items.filter((item) => required.some((key) => item[key] === undefined)).length;
const forbiddenHits = (items) => forbidden.filter((word) => items.some((item) => text(item).includes(word)));
const collisions = (items) => items.filter((item) => centralIds.has(normalize(item.id)) || centralNames.has(normalize(item.name)) || centralTickers.has(normalize(item.ticker))).length;
const statusCounts = (items, getter) => items.reduce((counts, item) => {
  const value = getter(item);
  counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}, {});
const rawBound = all.filter((item) => item.sourceMetadata?.rawStorage?.readbackVerified === true && item.sourceMetadata?.rawContentSha256).length;
const allIds = new Set(all.map((item) => item.id));
const artifactSha256 = crypto.createHash('sha256').update(fs.readFileSync(finalPath)).digest('hex');
const result = {
  schemaVersion: 'make-money-collection-completion-audit.v1',
  auditedAt: new Date().toISOString(),
  inputs: { allPath, finalPath, receiptPath, bundlePath, r2Path, metricPath, ledgerPath, centralPath, journalPath, temporalPath },
  requested: { allEntities: 1000, finalEntities: 100 },
  evidence: {
    all: {
      count: all.length,
      requiredFieldsMissing: requiredMissing(all),
      duplicateIds: duplicateCount(all, 'id'),
      duplicateNames: duplicateCount(all, 'name'),
      duplicateTickers: duplicateCount(all, 'ticker'),
      forbiddenJargon: forbiddenHits(all),
      centralCatalogCollisions: collisions(all),
      claimLockMissingNames: claimMissing(all),
      scale: statusCounts(all, (item) => item.scale),
      financialStatus: statusCounts(all, (item) => item.pnl?.financialStatus),
      revenueUnconfirmed: all.filter((item) => item.pnl?.isRevenueUnconfirmed === true).length,
      marginUnconfirmed: all.filter((item) => item.pnl?.isMarginUnconfirmed === true).length,
      rawStorageReadbackBound: rawBound,
    },
    final: {
      count: final.length,
      requiredFieldsMissing: requiredMissing(final),
      duplicateIds: duplicateCount(final, 'id'),
      duplicateNames: duplicateCount(final, 'name'),
      duplicateTickers: duplicateCount(final, 'ticker'),
      forbiddenJargon: forbiddenHits(final),
      centralCatalogCollisions: collisions(final),
      claimLockMissingNames: claimMissing(final),
      isSubsetOfAll1000: final.every((item) => allIds.has(item.id)),
      artifactSha256,
      receiptSha256: receipt.artifact?.sha256 ?? null,
      scale: statusCounts(final, (item) => item.scale),
      financialStatus: statusCounts(final, (item) => item.pnl?.financialStatus),
      rawStorageReadbackBound: final.filter((item) => item.sourceMetadata?.rawStorage?.readbackVerified === true).length,
    },
    foundationBundle: {
      writeAuthorized: bundle.write_authorized,
      entities: bundle.bundle?.entities?.length ?? 0,
      evidence: bundle.bundle?.evidence?.length ?? 0,
      rawEvidenceBodies: bundle.raw_evidence?.length ?? 0,
    },
    r2: {
      requested: r2.requested,
      completed: r2.completed,
      readbackVerified: r2.readbackVerified,
    },
    foundationJournal: journal ? {
      resultPath: journalPath,
      planned: journal.planned ?? 0,
      preflightAbsent: journal.preflight?.absent ?? 0,
      preflightIdentical: journal.preflight?.identical ?? 0,
      created: journal.writes?.created ?? 0,
      writeIdentical: journal.writes?.identical ?? 0,
      readbackVerified: journal.writes?.readbackVerified ?? 0,
    } : null,
    rawMetricSupport: {
      count: metric.count,
      rawCaptured: metric.rawCaptured,
      noRawCapture: metric.noRawCapture,
      anyMetricSupported: metric.anyMetricSupported,
      explicitProfitMetricSupported: metric.explicitProfitMetricSupported,
    },
    temporalSuccessWindow: temporal ? {
      requestedWindow: temporal.requestedWindow,
      rawCaptured: temporal.rawCaptured,
      performanceWindowMention: temporal.performanceWindowMention,
      profitWindowMention: temporal.profitWindowMention,
      revenueWindowMention: temporal.revenueWindowMention,
    } : null,
  },
  boundaries: {
    independentProfitAuditCompleted: false,
    allRevenueValuesIndependentlyVerified: false,
    allMarginValuesIndependentlyVerified: false,
    canonicalFoundationJournalWriteCompleted: journal?.writes?.readbackVerified === journal?.planned,
    centralCatalogEdited: false,
    edinetFinancialsEdited: false,
    knownRawCaptureGap: metric.noRawCapture > 0 ? `Raw本文未取得: ${metric.noRawCapture}件。` : null,
    requestedWindowProfitEvidenceComplete: temporal?.profitWindowMention === all.length,
  },
};
result.acceptance = {
  exactAllCount: result.evidence.all.count === 1000,
  exactFinalCount: result.evidence.final.count === 100,
  finalIsSubset: result.evidence.final.isSubsetOfAll1000,
  schemaAndIdentityClean: result.evidence.all.requiredFieldsMissing === 0 && result.evidence.all.duplicateIds === 0 && result.evidence.all.duplicateNames === 0 && result.evidence.all.duplicateTickers === 0 && result.evidence.all.forbiddenJargon.length === 0 && result.evidence.all.centralCatalogCollisions === 0,
  claimLockComplete: result.evidence.all.claimLockMissingNames.length === 0,
  r2ReadbackCompleteForCapturedSources: result.evidence.r2.requested === result.evidence.r2.completed && result.evidence.r2.completed === result.evidence.r2.readbackVerified,
  canonicalJournalReadbackComplete: result.evidence.foundationJournal?.planned > 0 && result.evidence.foundationJournal.readbackVerified === result.evidence.foundationJournal.planned,
  fullRequestedScopeProven: false,
};
result.overall = result.acceptance.exactAllCount && result.acceptance.exactFinalCount && result.acceptance.finalIsSubset && result.acceptance.schemaAndIdentityClean && result.acceptance.claimLockComplete && result.acceptance.r2ReadbackCompleteForCapturedSources && result.boundaries.independentProfitAuditCompleted && result.boundaries.canonicalFoundationJournalWriteCompleted;
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, overall: result.overall, acceptance: result.acceptance, knownGap: result.boundaries.knownRawCaptureGap }, null, 2));
