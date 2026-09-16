import fs from 'node:fs';

const batchPath = 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const oldAuditPath = 'data/incoming/raw_snapshots_new1000_20260916.audit.json';
const newAuditPath = 'data/incoming/raw_snapshots_new_cases_20260916.audit.json';
const outputPath = 'data/incoming/raw_snapshots_new1000_20260916.audit.json';
const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const oldAudit = JSON.parse(fs.readFileSync(oldAuditPath, 'utf8'));
const newAudit = JSON.parse(fs.readFileSync(newAuditPath, 'utf8'));
const oldByUrl = new Map(oldAudit.results.map((item) => [item.requestedUrl, item]));
const newByUrl = new Map(newAudit.results.map((item) => [item.requestedUrl, item]));
const results = [];
for (const entity of batch) {
  const sourceUrl = entity.pnl?.sourceDoc || entity.sourceMetadata?.postUrl || entity.url;
  const item = newByUrl.get(sourceUrl) || oldByUrl.get(sourceUrl);
  if (!item) throw new Error(`Missing raw audit for ${entity.name}: ${sourceUrl}`);
  results.push({ ...item, name: entity.name, entityId: entity.id, requestedUrl: sourceUrl });
}
if (results.length !== 1000 || new Set(results.map((item) => item.entityId)).size !== 1000) throw new Error('Merged raw audit is not exactly one-per-entity');
const audit = { schemaVersion: 'raw-capture-audit.v1', snapshot: '2026-09-16', input: batchPath, outputDir: 'data/incoming/raw_snapshots_new1000_20260916', requested: results.length, captured: results.filter((item) => item.status === 'CAPTURED').length, failed: results.filter((item) => item.status !== 'CAPTURED').length, results };
fs.writeFileSync(outputPath, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, requested: audit.requested, captured: audit.captured, failed: audit.failed, newCases: results.filter((item) => newByUrl.has(item.requestedUrl)).map((item) => item.name) }, null, 2));
