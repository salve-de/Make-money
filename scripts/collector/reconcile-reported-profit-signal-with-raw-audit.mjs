import fs from 'node:fs';

const metricPath = process.env.MM_METRIC_FILE ?? 'data/incoming/raw_metric_support_audit_new1000_20260916.json';
const batchPaths = (process.env.MM_BATCH_FILES ?? [
  'data/incoming/batch_new_1000_final_primary_mubs_20260916.json',
  'data/incoming/batch_final100_subset_of_new1000_20260916.json',
].join(',')).split(',').filter(Boolean);
const metricAudit = JSON.parse(fs.readFileSync(metricPath, 'utf8'));
const byId = new Map(metricAudit.results.map((result) => [result.id, result]));
const changed = [];

for (const batchPath of batchPaths) {
  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  let removedSignals = 0;
  let reclassifiedMetrics = 0;
  const next = batch.map((entity) => {
    const audit = byId.get(entity.id);
    if (!audit || audit.profitMetricSupported === true) return entity;
    const copy = structuredClone(entity);
    if (copy.pnl?.reportedProfitSignal) {
      delete copy.pnl.reportedProfitSignal;
      removedSignals += 1;
    }
    if (Array.isArray(copy.reportedMetrics)) {
      copy.reportedMetrics = copy.reportedMetrics.map((metric) => {
        if (metric.source !== 'article' || !/PROFIT|MARGIN|利益/i.test(String(metric.unit))) return metric;
        reclassifiedMetrics += 1;
        return {
          ...metric,
          originalUnit: metric.unit,
          unit: 'REPORTED_MONEY_SIGNAL',
          classificationNote: 'Raw本文監査で対象事業の明示的な利益への結び付きを確認できないため、中立の金額シグナルとして保持。',
        };
      });
    }
    copy.unknownsNotes = [...new Set([...(copy.unknownsNotes ?? []), '利益ラベル付き抽出値はRaw本文監査で対象事業への明示結合を確認できず、利益値として扱わない。'])];
    return copy;
  });
  fs.writeFileSync(batchPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  changed.push({ batchPath, count: next.length, removedSignals, reclassifiedMetrics });
}

console.log(JSON.stringify({ metricPath, auditExplicitProfitSupported: metricAudit.explicitProfitMetricSupported, changed }, null, 2));
