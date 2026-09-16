import fs from 'node:fs/promises';
import { findExplicitProfitEvidence, strip, variants } from './profit-evidence-rules.mjs';

const batchPath = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const auditPath = process.env.MM_AUDIT_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.audit.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/raw_metric_support_audit_new1000_20260916.json';
const batch = JSON.parse(await fs.readFile(batchPath, 'utf8'));
const captureAudit = JSON.parse(await fs.readFile(auditPath, 'utf8'));
const capturedByEntity = new Map(captureAudit.results.filter((item) => item.status === 'CAPTURED').map((item) => [item.entityId, item]));
const results = [];
for (const entity of batch) {
  const capture = capturedByEntity.get(entity.id);
  if (!capture) { results.push({ id: entity.id, name: entity.name, status: 'NO_RAW_CAPTURE', matchedMetrics: [], profitMetricSupported: false }); continue; }
  const body = strip(await fs.readFile(capture.localPath, 'utf8'));
  const metrics = Array.isArray(entity.reportedMetrics) ? entity.reportedMetrics : [];
  const matched = metrics.filter((metric) => variants(metric).some((variant) => body.includes(variant.replace(/\\\$/g, '$')))).map((metric) => ({ original: metric.original, unit: metric.unit, source: metric.source }));
  const profitMatched = metrics.some((metric) => findExplicitProfitEvidence(body, metric));
  results.push({ id: entity.id, name: entity.name, status: 'RAW_CAPTURED', rawSha256: capture.sha256, matchedMetrics: matched, matchedMetricCount: matched.length, metricCount: metrics.length, profitMetricSupported: profitMatched });
}
const audit = { schemaVersion: 'raw-metric-support-audit.v1', input: batchPath, captureAudit: auditPath, count: results.length, rawCaptured: results.filter((x) => x.status === 'RAW_CAPTURED').length, noRawCapture: results.filter((x) => x.status !== 'RAW_CAPTURED').length, anyMetricSupported: results.filter((x) => x.matchedMetricCount > 0).length, explicitProfitMetricSupported: results.filter((x) => x.profitMetricSupported).length, results };
await fs.writeFile(outputPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, count: audit.count, rawCaptured: audit.rawCaptured, noRawCapture: audit.noRawCapture, anyMetricSupported: audit.anyMetricSupported, explicitProfitMetricSupported: audit.explicitProfitMetricSupported }, null, 2));
