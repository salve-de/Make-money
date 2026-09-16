import fs from 'node:fs';

const batchPaths = (process.env.MM_BATCH_FILES || [
  'data/incoming/batch_new_1000_final_primary_mubs_20260916.json',
  'data/incoming/batch_final100_subset_of_new1000_20260916.json',
].join(',')).split(',').filter(Boolean);
const bundle = JSON.parse(fs.readFileSync(process.env.MM_BUNDLE_FILE ?? 'data/incoming/research-bundle_new1000_final100raw_20260916.json', 'utf8'));
const r2 = JSON.parse(fs.readFileSync(process.env.MM_R2_RESULT_FILE ?? 'data/incoming/raw_snapshots_final100_20260916.r2-result.json', 'utf8'));
const rawAudit = JSON.parse(fs.readFileSync(process.env.MM_RAW_AUDIT_FILE ?? 'data/incoming/raw_snapshots_final100_20260916.audit.json', 'utf8'));
const evidenceByUrl = new Map(bundle.bundle.evidence.map((evidence) => [evidence.source_url, evidence]));
const auditByUrl = new Map(rawAudit.results.map((item) => [item.requestedUrl, item]));
const r2ByEvidence = new Map(r2.results.map((item) => [item.evidenceId, item]));
const r2ByEntityId = new Map(r2.results.map((item) => [item.entityId, item]));
let updated = 0;
for (const batchPath of batchPaths) {
  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  for (const entity of batch) {
    const sourceUrl = entity.pnl?.sourceDoc || entity.sourceMetadata?.postUrl || entity.url;
    const evidence = evidenceByUrl.get(sourceUrl);
    const captured = auditByUrl.get(sourceUrl);
    const r2Result = r2ByEntityId.get(entity.id) || (evidence ? r2ByEvidence.get(evidence.evidence_id) : null);
    if (!captured || !r2Result || !r2Result.payloadReadback || !r2Result.manifestReadback) continue;
    entity.sourceMetadata = { ...entity.sourceMetadata, rawContentSha256: r2Result.payloadSha256, rawStorage: { bucket: 'foundation-raw', payloadKey: r2Result.payloadKey, manifestKey: r2Result.manifestKey, bytes: r2Result.payloadBytes, readbackVerified: true } };
    updated += 1;
  }
  fs.writeFileSync(batchPath, `${JSON.stringify(batch, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify({ batchFiles: batchPaths, updated, r2ReadbackVerified: r2.readbackVerified }, null, 2));
