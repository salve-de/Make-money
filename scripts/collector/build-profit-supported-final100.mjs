import fs from 'node:fs';
import crypto from 'node:crypto';

const sourcePath = process.env.MM_SOURCE_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const metricPath = process.env.MM_METRIC_FILE ?? 'data/incoming/raw_metric_support_audit_new1000_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_final100_profit_supported_subset_of_new1000_20260916.json';
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const metric = JSON.parse(fs.readFileSync(metricPath, 'utf8'));
const byId = new Map(metric.results.map((item) => [item.id, item]));
const excluded = /never earned a cent|doing absolutely nothing|sexting|naughty ai|fake news|mlm|catfishing/i;
const candidates = source.filter((entity) => byId.get(entity.id)?.profitMetricSupported === true && !excluded.test(`${entity.name} ${entity.tagline}`));
if (candidates.length < 100) throw new Error(`Expected at least 100 profit-supported candidates, got ${candidates.length}`);
const score = (entity) => {
  const metricResult = byId.get(entity.id);
  const knownScale = entity.scale === 'SOLO' || entity.scale === 'SMALL_TEAM' ? 1 : 0;
  const official = entity.evidenceCards?.some((card) => card.title?.includes('公式サイト')) ? 1 : 0;
  const matched = metricResult?.matchedMetricCount ?? 0;
  const revenue = typeof entity.pnl?.monthlyRevenue === 'number' ? entity.pnl.monthlyRevenue : 0;
  return [knownScale, official, matched, Math.min(revenue, 1_000_000_000)];
};
candidates.sort((left, right) => {
  const a = score(left); const b = score(right);
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return b[i] - a[i];
  return left.name.localeCompare(right.name);
});
const selected = candidates.slice(0, 100);
if (new Set(selected.map((entity) => entity.id)).size !== 100) throw new Error('Duplicate selected IDs');
fs.writeFileSync(outputPath, `${JSON.stringify(selected, null, 2)}\n`, 'utf8');
const receipt = {
  receiptVersion: 'make-money-collection-receipt.v1',
  batchId: 'batch-final100-profit-supported-subset-of-new1000-20260916',
  snapshot: '2026-09-16',
  selection: { input: sourcePath, selectionRule: 'raw本文で明示利益シグナルを支持できる現行1000件から、規模判定・公式カード・支持メトリクス数・報告収益シグナルを優先。', candidateCount: candidates.length },
  artifact: { path: outputPath, sha256: crypto.createHash('sha256').update(fs.readFileSync(outputPath)).digest('hex'), bytes: fs.statSync(outputPath).size, count: selected.length },
  quality: { explicitProfitMetricSupported: selected.filter((entity) => byId.get(entity.id)?.profitMetricSupported === true).length, rawStorageReadbackBound: selected.filter((entity) => entity.sourceMetadata?.rawStorage?.readbackVerified === true).length, allRevenueValuesUnconfirmed: selected.every((entity) => entity.pnl?.isRevenueUnconfirmed === true), allMarginValuesUnconfirmed: selected.every((entity) => entity.pnl?.isMarginUnconfirmed === true) },
  boundaries: { financialValuesIndependentlyAudited: false, centralCatalogEdited: false, edinetFinancialsEdited: false },
};
fs.writeFileSync(`${outputPath}.receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, count: selected.length, candidateCount: candidates.length, scale: selected.reduce((out, entity) => { out[entity.scale] = (out[entity.scale] ?? 0) + 1; return out; }, {}), rawReadback: receipt.quality.rawStorageReadbackBound, explicitProfitMetricSupported: receipt.quality.explicitProfitMetricSupported, receiptPath: `${outputPath}.receipt.json` }, null, 2));
