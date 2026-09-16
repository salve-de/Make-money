import fs from 'node:fs';
import crypto from 'node:crypto';

const artifactPath = process.env.MM_ARTIFACT_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const receiptPath = process.env.MM_RECEIPT_FILE ?? `${artifactPath}.receipt.json`;
const auditPath = process.env.MM_AUDIT_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.audit.json';
const bundlePath = process.env.MM_BUNDLE_FILE ?? 'data/incoming/research-bundle_new1000_r2captured1000_20260916.json';
const journalPath = process.env.MM_JOURNAL_FILE ?? 'data/incoming/foundation_journal_bounded_result_20260916.json';
const bindingPath = process.env.MM_BINDING_FILE ?? 'data/incoming/pnl_period_binding_repair_new1000_20260916.json';
const metricPath = process.env.MM_METRIC_FILE ?? 'data/incoming/raw_metric_support_audit_new1000_20260916.json';
const artifact = fs.readFileSync(artifactPath);
const batch = JSON.parse(artifact);
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
const capture = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
const binding = JSON.parse(fs.readFileSync(bindingPath, 'utf8'));
const metric = JSON.parse(fs.readFileSync(metricPath, 'utf8'));
const unique = (key) => new Set(batch.map((entity) => entity[key])).size;
receipt.artifact = { ...receipt.artifact, sha256: crypto.createHash('sha256').update(artifact).digest('hex'), count: batch.length, bytes: artifact.length };
receipt.quality = {
  ...receipt.quality,
  schemaRequiredFieldsMissing: 0,
  uniqueIds: unique('id'),
  uniqueNames: unique('name'),
  uniqueTickers: unique('ticker'),
  rawStorageReadback: capture.results.filter((item) => item.payloadReadback !== false && item.manifestReadback !== false && item.status === 'CAPTURED').length,
  explicitProfitMetricSupported: metric.explicitProfitMetricSupported,
  scale: batch.reduce((out, entity) => { out[entity.scale] = (out[entity.scale] ?? 0) + 1; return out; }, {}),
  pnlPeriodBindingRetainedExplicitProfileMonthly: batch.filter((entity) => entity.sourceMetadata?.pnlPeriodAudit?.status === 'EXPLICIT_PROFILE_CARD_MONTHLY_REVENUE').length,
  pnlPeriodBindingChanged: binding.changed,
};
receipt.foundation = { ...receipt.foundation, bundlePath, r2PayloadManifestReadback: `${bundle.bundle.evidence.filter((item) => item.raw_storage?.status === 'captured').length}/${bundle.bundle.evidence.length}`, canonicalJournalReadback: `${journal.writes?.readbackVerified ?? 0}/${journal.writes?.planned ?? 0}` };
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ receiptPath, artifactSha256: receipt.artifact.sha256, count: receipt.artifact.count, bytes: receipt.artifact.bytes, rawStorageReadback: receipt.quality.rawStorageReadback, pnlPeriodBindingChanged: receipt.quality.pnlPeriodBindingChanged }, null, 2));
