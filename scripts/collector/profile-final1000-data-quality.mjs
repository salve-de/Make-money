import fs from 'node:fs';
import crypto from 'node:crypto';

const inputPath = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const finalPath = process.env.MM_FINAL_FILE ?? 'data/incoming/batch_final100_subset_of_new1000_20260916.json';
const ledgerPath = process.env.MM_LEDGER_FILE ?? 'data/CLAIMED_TARGETS.txt';
const temporalAuditPath = process.env.MM_TEMPORAL_AUDIT_FILE ?? 'data/incoming/temporal_success_window_audit_new1000_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/final1000_data_quality_profile_20260916.json';
const entities = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const final = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
const ledger = new Set(fs.readFileSync(ledgerPath, 'utf8').split(/\r?\n/).map((line) => line.replace(/\s*\[CLAIMED:.*$/, '').trim()).filter(Boolean));
const temporalAudit = fs.existsSync(temporalAuditPath) ? JSON.parse(fs.readFileSync(temporalAuditPath, 'utf8')) : null;
const required = ['id', 'ticker', 'name', 'tagline', 'sector', 'scale', 'founder', 'country', 'url', 'pnl', 'evidenceCards', 'operations', 'strategy', 'temporal', 'essence', 'lootBlueprint', 'observations', 'observationsStream'];
const allowedScale = new Set(['SOLO', 'SMALL_TEAM', 'SCALEUP', 'ENTERPRISE', 'UNKNOWN']);
const allowedStatus = new Set(['VERIFIED', 'REPORTED', 'ESTIMATED', 'POST_MORTEM', 'UNAVAILABLE']);
const forbidden = ['サバンナOS', '略奪転用方程式', 'カニバリズム障壁', '身も蓋もない真実', '特異物証', '地雷検死', '検死開示', 'ホスティング関所', '決済関所'];
const nullish = (value) => value === null || value === undefined || value === '';
const numberFields = ['monthlyRevenue', 'cogs', 'grossProfit', 'grossMargin'];
const findings = [];
const add = (id, severity, failed, evidence, risk, remediation) => findings.push({ id, severity, failed, evidence, risk, remediation });
const count = (items, predicate) => items.filter(predicate).length;
const duplicateCount = (items, key) => items.length - new Set(items.map((item) => String(item[key] ?? ''))).size;
const urlInvalid = count(entities, (entity) => entity.url !== null && entity.url !== undefined && (() => { try { new URL(entity.url); return false; } catch { return true; } })());
const requiredMissing = Object.fromEntries(required.map((key) => [key, count(entities, (entity) => entity[key] === undefined)]));
const idInvalid = count(entities, (entity) => !/^ent_[A-Za-z0-9._-]+$/.test(String(entity.id ?? '')));
const tickerInvalid = count(entities, (entity) => typeof entity.ticker !== 'string' || !entity.ticker.trim());
const countryInvalid = count(entities, (entity) => !/^(?:[A-Z]{2}|GLOBAL)$/.test(String(entity.country ?? '')));
const scaleInvalid = count(entities, (entity) => !allowedScale.has(entity.scale));
const statusInvalid = count(entities, (entity) => !allowedStatus.has(entity.pnl?.financialStatus));
const negativePnl = count(entities, (entity) => numberFields.some((field) => typeof entity.pnl?.[field] === 'number' && entity.pnl[field] < 0));
const arithmeticMismatch = count(entities, (entity) => {
  const p = entity.pnl ?? {};
  return [p.monthlyRevenue, p.cogs, p.grossProfit].every((value) => typeof value === 'number') && p.grossProfit !== p.monthlyRevenue - p.cogs;
});
const marginMismatch = count(entities, (entity) => {
  const p = entity.pnl ?? {};
  return p.monthlyRevenue > 0 && typeof p.grossProfit === 'number' && typeof p.grossMargin === 'number' && Math.abs(p.grossMargin - (p.grossProfit / p.monthlyRevenue) * 100) > 0.01;
});
const financialFlagsMissing = count(entities, (entity) => entity.pnl?.isRevenueUnconfirmed !== true || entity.pnl?.isMarginUnconfirmed !== true);
const noCards = count(entities, (entity) => !Array.isArray(entity.evidenceCards) || entity.evidenceCards.length === 0);
const noObservations = count(entities, (entity) => !Array.isArray(entity.observations) || !Array.isArray(entity.observationsStream));
const forbiddenHits = forbidden.filter((word) => entities.some((entity) => JSON.stringify(entity).includes(word)));
const claimMissing = count(entities, (entity) => !ledger.has(entity.name));
const rawReadback = count(entities, (entity) => entity.sourceMetadata?.rawStorage?.readbackVerified === true);
const metricAudit = count(entities, (entity) => entity.sourceMetadata?.rawMetricSupportAudit?.explicitProfitMetricSupported === true);
const finalNotSubset = count(final, (entity) => !entities.some((candidate) => candidate.id === entity.id));
const scaleCounts = entities.reduce((out, entity) => { out[entity.scale] = (out[entity.scale] ?? 0) + 1; return out; }, {});
const statusCounts = entities.reduce((out, entity) => { out[entity.pnl?.financialStatus] = (out[entity.pnl?.financialStatus] ?? 0) + 1; return out; }, {});
const sentinelCounts = { foundedYearZero: count(entities, (entity) => entity.temporal?.foundedYear === 0), monthlyRevenueZero: count(entities, (entity) => entity.pnl?.monthlyRevenue === 0), urlNull: count(entities, (entity) => nullish(entity.url)), founderUnknown: count(entities, (entity) => String(entity.founder).includes('UNKNOWN')) };
if (requiredMissing.id || requiredMissing.pnl || requiredMissing.evidenceCards) add('required-fields', 'CRITICAL', 'required fields missing', requiredMissing, 'Consumers may crash or silently omit records.', 'Reject only missing structural fields; preserve domain unknowns explicitly.');
if (duplicateCount(entities, 'id') || duplicateCount(entities, 'name') || duplicateCount(entities, 'ticker')) add('entity-keys', 'CRITICAL', 'duplicate entity keys', { ids: duplicateCount(entities, 'id'), names: duplicateCount(entities, 'name'), tickers: duplicateCount(entities, 'ticker') }, 'Joins and detail routing can address the wrong case.', 'Keep normalized key uniqueness as a hard gate.');
if (arithmeticMismatch || marginMismatch) add('pnl-arithmetic', 'HIGH', 'P&L arithmetic mismatch', { arithmeticMismatch, marginMismatch }, 'Displayed revenue/profit figures become numerically inconsistent.', 'Keep unknown numeric values flagged and verify every populated arithmetic field.');
if (financialFlagsMissing) add('financial-unknown-flags', 'HIGH', 'unconfirmed financial flags missing', { financialFlagsMissing }, 'Unknown revenue or margin can be mistaken for verified profit.', 'Require both unconfirmed flags whenever the amount is not independently verified.');
if (forbiddenHits.length) add('forbidden-text', 'HIGH', 'forbidden internal jargon present', forbiddenHits, 'Internal labels leak into user-facing intelligence.', 'Remove from generated entity text and keep only in internal documentation.');
if (claimMissing) add('claim-lock', 'HIGH', 'claim lock missing', { claimMissing }, 'A duplicate or concurrent collection can enter the batch.', 'Require exact ledger registration before collection.');
if (rawReadback < entities.length) add('raw-coverage', 'MEDIUM', 'raw Readback incomplete', { rawReadback, requested: entities.length }, 'One or more source claims cannot be re-read from immutable raw evidence.', 'Retain metadata-only state for failures and retry only with a new observed source.');
if (scaleCounts.UNKNOWN) add('scale-missingness', 'MEDIUM', 'team scale unknown', scaleCounts, 'The requested individual/solo/small-team segmentation is not fully supported.', 'Upgrade only when raw text explicitly states team size; otherwise retain UNKNOWN.');
if (metricAudit < entities.length) add('profit-support-coverage', 'HIGH', 'explicit profit support incomplete', { explicitProfitMetricSupported: metricAudit, requested: entities.length }, 'Revenue reports must not be presented as verified profit.', 'Keep profit fields unconfirmed and prioritize independent profit evidence.');
if (temporalAudit && temporalAudit.profitWindowMention < entities.length) add('current-window-profit-coverage', 'HIGH', '2024-2026 profit period not established for all records', { profitWindowMention: temporalAudit.profitWindowMention, performanceWindowMention: temporalAudit.performanceWindowMention, requested: entities.length }, 'A 2026 page update is not evidence that the business made profit in the requested period.', 'Retain the article-period signal separately and verify the remaining cases from first-party records or founder disclosures.');
const report = {
  schemaVersion: 'final1000-data-quality-profile.v1',
  generatedAt: new Date().toISOString(),
  grain: 'one FinancialEntity per business case; final artifact is a 100-row subset',
  inputs: { inputPath, finalPath, ledgerPath, temporalAuditPath, inputSha256: crypto.createHash('sha256').update(fs.readFileSync(inputPath)).digest('hex'), finalSha256: crypto.createHash('sha256').update(fs.readFileSync(finalPath)).digest('hex') },
  profile: { rowCount: entities.length, finalRowCount: final.length, requiredMissing, scaleCounts, statusCounts, sentinelCounts, rawReadback, explicitProfitMetricSupported: metricAudit, temporalSuccessWindow: temporalAudit ? { performanceWindowMention: temporalAudit.performanceWindowMention, profitWindowMention: temporalAudit.profitWindowMention, revenueWindowMention: temporalAudit.revenueWindowMention } : null, finalNotSubset, urlInvalid, idInvalid, tickerInvalid, countryInvalid, scaleInvalid, statusInvalid, negativePnl, arithmeticMismatch, marginMismatch, financialFlagsMissing, noCards, noObservations, claimMissing, forbiddenHits },
  findings,
  qualityDecision: findings.some((finding) => finding.severity === 'CRITICAL' || finding.severity === 'HIGH') ? 'USE_WITH_GUARDS' : 'USE',
  openQuestions: ['Independent profit and margin verification is not complete for the batch.', 'Scale UNKNOWN remains for records without explicit raw team-size evidence.', ...(temporalAudit && temporalAudit.profitWindowMention < entities.length ? [`記事本体で2024-2026年と利益語が近接するのは${temporalAudit.profitWindowMention}/${entities.length}件。`] : []), ...(rawReadback < entities.length ? [`Raw本文未取得: ${entities.length - rawReadback}件。`] : [])],
};
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, qualityDecision: report.qualityDecision, rowCount: report.profile.rowCount, finalRowCount: report.profile.finalRowCount, findingCount: findings.length, rawReadback, explicitProfitMetricSupported: metricAudit, scaleCounts }, null, 2));
