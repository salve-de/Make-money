import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const finalPath = process.env.MM_FINAL_FILE ?? 'data/incoming/batch_final100_subset_of_new1000_20260916.json';
const allAuditPath = process.env.MM_ALL_AUDIT_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.audit.json';
const oldAuditPath = process.env.MM_OLD_FINAL_AUDIT_FILE ?? 'data/incoming/raw_snapshots_final100_20260916.audit.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/raw_snapshots_final100_20260916.audit.json';
const finalDir = process.env.MM_FINAL_DIR ?? 'data/incoming/raw_snapshots_final100_20260916';
const final = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
const allAudit = JSON.parse(fs.readFileSync(allAuditPath, 'utf8'));
const oldAudit = JSON.parse(fs.readFileSync(oldAuditPath, 'utf8'));
const allById = new Map((allAudit.results ?? []).map((item) => [item.entityId, item]));
const oldById = new Map((oldAudit.results ?? []).map((item) => [item.entityId, item]));
fs.mkdirSync(finalDir, { recursive: true });
const results = [];
for (const entity of final) {
  const current = allById.get(entity.id);
  if (!current) throw new Error(`No current raw audit for final entity: ${entity.name}`);
  const old = oldById.get(entity.id);
  if (current.localPath && current.localPath.startsWith('/tmp/')) {
    const body = fs.readFileSync(current.localPath);
    const hash = crypto.createHash('sha256').update(body).digest('hex');
    const extension = current.contentType?.includes('json') ? 'json' : 'html';
    const destination = path.join(finalDir, `${hash}.${extension}`);
    if (!fs.existsSync(destination)) fs.writeFileSync(destination, body, { flag: 'wx' });
    current.localPath = destination;
  } else if (old?.localPath && fs.existsSync(old.localPath)) {
    current.localPath = old.localPath;
  }
  results.push(current);
}
const output = { schemaVersion: 'raw-capture-audit.v1', snapshot: '2026-09-16', input: finalPath, outputDir: finalDir, requested: results.length, captured: results.filter((item) => item.status === 'CAPTURED').length, failed: results.filter((item) => item.status !== 'CAPTURED').length, results };
if (output.requested !== 100 || output.captured !== 100 || output.failed !== 0) throw new Error(`Final raw audit mismatch: ${JSON.stringify({ requested: output.requested, captured: output.captured, failed: output.failed })}`);
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, requested: output.requested, captured: output.captured, failed: output.failed }, null, 2));
