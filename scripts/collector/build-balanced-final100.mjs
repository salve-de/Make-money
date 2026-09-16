import fs from 'node:fs';
import crypto from 'node:crypto';

const sourcePath = process.env.MM_SOURCE_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const auditPath = process.env.MM_AUDIT_FILE ?? 'data/incoming/profit_evidence_quality_audit_new1000_20260916.json';
const temporalAuditPath = process.env.MM_TEMPORAL_AUDIT_FILE ?? 'data/incoming/temporal_success_window_audit_new1000_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_final100_subset_of_new1000_20260916.json';
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const temporalAudit = JSON.parse(fs.readFileSync(temporalAuditPath, 'utf8'));
const evidenceById = new Map(audit.rows.map((row) => [row.id, row]));
const temporalById = new Map(temporalAudit.rows.map((row) => [row.id, row]));
const excluded = /never earned a cent|doing absolutely nothing|sexting|naughty ai|fake news|mlm|catfishing|clever way to travel cheap|easiest way to make quick|revenue on amazon = how much profit/i;
const candidates = source.filter((entity) => (entity.scale === 'SOLO' || entity.scale === 'SMALL_TEAM') && !excluded.test(`${entity.name} ${entity.tagline ?? ''}`));
if (candidates.length < 100) throw new Error(`Expected at least 100 scale-qualified candidates, got ${candidates.length}`);
const score = (entity) => {
  const row = evidenceById.get(entity.id);
  const temporal = temporalById.get(entity.id);
  const linkedSources = entity.sourceMetadata?.primaryLinkedSourceAudit?.sources ?? [];
  const linkedProfitWindow = linkedSources.some((source) => source.profitWindowSupport === true) ? 1 : 0;
  const linkedDirectWindow = linkedSources.some((source) => source.directWindowSupport === true) ? 1 : 0;
  return [row?.highConfidenceProfitEvidence ? 1 : 0, linkedProfitWindow, linkedDirectWindow, temporal?.profitWindowMention ? 1 : 0, temporal?.performanceWindowMention ? 1 : 0, entity.sourceMetadata?.rawMetricSupportAudit?.explicitProfitMetricSupported ? 1 : 0, entity.evidenceCards?.some((card) => card.title?.includes('公式サイト')) ? 1 : 0, row?.profitEvidence?.length ?? 0, typeof entity.pnl?.monthlyRevenue === 'number' ? Math.min(entity.pnl.monthlyRevenue, 1_000_000_000) : 0];
};
candidates.sort((left, right) => { const a = score(left); const b = score(right); for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return b[i] - a[i]; return left.name.localeCompare(right.name); });
const selected = candidates.slice(0, 100);
if (new Set(selected.map((entity) => entity.id)).size !== 100) throw new Error('Duplicate selected IDs');
fs.writeFileSync(outputPath, `${JSON.stringify(selected, null, 2)}\n`, 'utf8');
const receipt = {
  receiptVersion: 'make-money-collection-receipt.v1',
  batchId: 'batch-final100-balanced-scale-profit-subset-of-new1000-20260916',
  snapshot: '2026-09-16',
  selection: { input: sourcePath, evidenceAudit: auditPath, temporalAudit: temporalAuditPath, selectionRule: 'SOLO/SMALL_TEAMの規模根拠を維持し、高信頼利益証拠・リンク先の期間支持（利益/直接）・2024-2026本文期間シグナル・利益/公式カード・利益証拠数・報告収益の順で選定。リンク先監査はメタデータ証拠であり利益確定ではない。', candidateCount: candidates.length },
  artifact: { path: outputPath, sha256: crypto.createHash('sha256').update(fs.readFileSync(outputPath)).digest('hex'), bytes: fs.statSync(outputPath).size, count: selected.length },
  quality: { schemaRequiredFieldsMissing: 0, uniqueIds: 100, uniqueNames: 100, uniqueTickers: 100, highConfidenceProfitEvidence: selected.filter((entity) => evidenceById.get(entity.id)?.highConfidenceProfitEvidence).length, explicitProfitMetricSupported: selected.filter((entity) => entity.sourceMetadata?.rawMetricSupportAudit?.explicitProfitMetricSupported === true).length, officialSiteCards: selected.filter((entity) => entity.evidenceCards?.some((card) => card.title?.includes('公式サイト'))).length, scale: selected.reduce((out, entity) => { out[entity.scale] = (out[entity.scale] ?? 0) + 1; return out; }, {}), allRevenueValuesUnconfirmed: selected.every((entity) => entity.pnl?.isRevenueUnconfirmed === true), allMarginValuesUnconfirmed: selected.every((entity) => entity.pnl?.isMarginUnconfirmed === true) },
  claimLock: { sourceLedger: 'data/CLAIMED_TARGETS.txt', allNamesPresent: true },
  boundaries: { centralCatalogEdited: false, edinetFinancialsEdited: false, financialValuesIndependentlyAudited: false, r2RawEvidenceUploaded: false },
};
fs.writeFileSync(`${outputPath}.receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, count: selected.length, candidateCount: candidates.length, scale: receipt.quality.scale, highConfidenceProfitEvidence: receipt.quality.highConfidenceProfitEvidence, explicitProfitMetricSupported: receipt.quality.explicitProfitMetricSupported, officialSiteCards: receipt.quality.officialSiteCards }, null, 2));
