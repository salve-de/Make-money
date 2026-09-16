import fs from 'node:fs';
import { findExplicitProfitEvidence, strip } from './profit-evidence-rules.mjs';

const batchPath = process.env.MM_BATCH_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const capturePath = process.env.MM_CAPTURE_AUDIT_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.audit.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/profit_evidence_quality_audit_new1000_20260916.json';
const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const captureAudit = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
const captures = new Map(captureAudit.results.map((item) => [item.entityId, item]));
const rows = [];
for (const entity of batch) {
  const capture = captures.get(entity.id);
  const metrics = [];
  if (capture?.localPath && fs.existsSync(capture.localPath)) {
    const body = strip(fs.readFileSync(capture.localPath, 'utf8'));
    for (const metric of entity.reportedMetrics ?? []) {
      if (!/PROFIT|MARGIN|利益|TAKE.?HOME|NET.?INCOME/i.test(String(metric.unit))) continue;
      const best = findExplicitProfitEvidence(body, metric);
      if (best) metrics.push(best);
    }
  }
  rows.push({ id: entity.id, name: entity.name, scale: entity.scale, rawCaptured: Boolean(capture?.localPath), highConfidenceProfitEvidence: metrics.length > 0, profitEvidence: metrics });
}
const report = {
  schemaVersion: 'profit-evidence-quality-audit.v1',
  input: batchPath,
  captureAudit: capturePath,
  count: rows.length,
  rawCaptured: rows.filter((row) => row.rawCaptured).length,
  highConfidenceProfitEvidence: rows.filter((row) => row.highConfidenceProfitEvidence).length,
  rows,
};
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, count: report.count, rawCaptured: report.rawCaptured, highConfidenceProfitEvidence: report.highConfidenceProfitEvidence, scale: rows.filter((row) => row.highConfidenceProfitEvidence).reduce((out, row) => { out[row.scale] = (out[row.scale] ?? 0) + 1; return out; }, {}) }, null, 2));
