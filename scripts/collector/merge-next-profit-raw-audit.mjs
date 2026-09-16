import fs from 'node:fs';

const batchPath = 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const oldPath = 'data/incoming/raw_snapshots_new1000_20260916.audit.json';
const nextPath = 'data/incoming/raw_snapshots_next_profit_cases_20260916.audit.json';
const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const oldAudit = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
const nextAudit = JSON.parse(fs.readFileSync(nextPath, 'utf8'));
const oldByUrl = new Map(oldAudit.results.map((item) => [item.requestedUrl, item]));
const nextByUrl = new Map(nextAudit.results.map((item) => [item.requestedUrl, item]));
const results = batch.map((entity) => {
  const requestedUrl = entity.pnl?.sourceDoc || entity.sourceMetadata?.postUrl || entity.url;
  const item = nextByUrl.get(requestedUrl) || oldByUrl.get(requestedUrl);
  if (!item) throw new Error(`Missing raw result for ${entity.name}: ${requestedUrl}`);
  return { ...item, name: entity.name, entityId: entity.id, requestedUrl };
});
if (results.length !== 1000 || new Set(results.map((item) => item.entityId)).size !== 1000) throw new Error('Expected one raw-audit result per entity');
const output = { schemaVersion: 'raw-capture-audit.v1', snapshot: '2026-09-16', input: batchPath, outputDir: 'data/incoming/raw_snapshots_new1000_20260916', requested: results.length, captured: results.filter((item) => item.status === 'CAPTURED').length, failed: results.filter((item) => item.status !== 'CAPTURED').length, results };
fs.writeFileSync(oldPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ requested: output.requested, captured: output.captured, failed: output.failed, newCases: results.filter((item) => nextByUrl.has(item.requestedUrl)).map((item) => item.name) }, null, 2));
