import fs from 'node:fs';

const currentPath = process.env.MM_CURRENT_AUDIT_FILE ?? 'data/incoming/final100_linked_source_audit_20260916.json';
const previousPath = process.env.MM_PREVIOUS_AUDIT_FILE ?? 'data/incoming/primary_linked_window_source_audit_20260916.json';
const batchPath = process.env.MM_BATCH_FILE ?? 'data/incoming/batch_final100_subset_of_new1000_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/primary_linked_window_source_audit_merged_20260916.json';
const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
const previous = JSON.parse(fs.readFileSync(previousPath, 'utf8'));
const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const finalIds = new Set(batch.map((entity) => entity.id));
const key = (item) => `${item.entityId}|${item.url}`;
const merged = new Map();
for (const item of previous.results ?? []) if (finalIds.has(item.entityId)) merged.set(key(item), item);
for (const item of current.results ?? []) if (finalIds.has(item.entityId)) {
  const old = merged.get(key(item));
  merged.set(key(item), old ? { ...old, ...item, directWindowSupport: old.directWindowSupport || item.directWindowSupport, profitWindowSupport: old.profitWindowSupport || item.profitWindowSupport, entityMetricMatch: old.entityMetricMatch || item.entityMetricMatch, context: old.context || item.context, sourceStrength: old.sourceStrength === 'linked_external_source_observed' ? old.sourceStrength : item.sourceStrength } : item);
}
const results = [...merged.values()];
const report = {
  schemaVersion: 'primary-linked-window-source-audit.v2',
  inputs: [previousPath, currentPath],
  target: batchPath,
  requested: 'final100 linked-source audit merged with prior temporal-profit audit',
  rightsNote: '外部ページはメタデータ監査のみ。権利確認なしにraw証拠・財務値へ昇格していない。',
  entityCount: batch.length,
  candidateCount: results.length,
  fetched: results.filter((item) => item.status === 'FETCHED_METADATA_ONLY').length,
  directWindowSupport: results.filter((item) => item.directWindowSupport).length,
  profitWindowSupport: results.filter((item) => item.profitWindowSupport).length,
  entityMetricMatch: results.filter((item) => item.entityMetricMatch).length,
  results,
};
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, entityCount: report.entityCount, candidateCount: report.candidateCount, fetched: report.fetched, directWindowSupport: report.directWindowSupport, profitWindowSupport: report.profitWindowSupport, entityMetricMatch: report.entityMetricMatch }, null, 2));
