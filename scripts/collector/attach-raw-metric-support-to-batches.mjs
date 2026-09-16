import fs from 'node:fs';

const metricPath = process.env.MM_METRIC_FILE ?? 'data/incoming/raw_metric_support_audit_new1000_20260916.json';
const batchPaths = (process.env.MM_BATCH_FILES ?? [
  'data/incoming/batch_new_1000_final_primary_mubs_20260916.json',
  'data/incoming/batch_final100_subset_of_new1000_20260916.json',
].join(',')).split(',').filter(Boolean);
const metricAudit = JSON.parse(fs.readFileSync(metricPath, 'utf8'));
const byId = new Map(metricAudit.results.map((item) => [item.id, item]));
const summaries = [];
for (const batchPath of batchPaths) {
  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  let attached = 0;
  for (const entity of batch) {
    const result = byId.get(entity.id);
    if (!result) continue;
    entity.sourceMetadata = {
      ...entity.sourceMetadata,
      rawMetricSupportAudit: {
        status: result.status,
        matchedMetricCount: result.matchedMetricCount ?? 0,
        metricCount: result.metricCount ?? 0,
        explicitProfitMetricSupported: result.profitMetricSupported === true,
        rawSha256: result.rawSha256 ?? null,
      },
    };
    attached += 1;
  }
  fs.writeFileSync(batchPath, `${JSON.stringify(batch, null, 2)}\n`, 'utf8');
  summaries.push({ batchPath, count: batch.length, attached });
}
console.log(JSON.stringify({ metricPath, summaries, auditCounts: { rawCaptured: metricAudit.rawCaptured, noRawCapture: metricAudit.noRawCapture, anyMetricSupported: metricAudit.anyMetricSupported, explicitProfitMetricSupported: metricAudit.explicitProfitMetricSupported } }, null, 2));
