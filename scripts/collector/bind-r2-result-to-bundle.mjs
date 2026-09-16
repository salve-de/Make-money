import fs from 'node:fs';

const inputPath = process.env.MM_INPUT_FILE ?? 'data/incoming/research-bundle_new1000_final100raw_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/research-bundle_new1000_r2captured999_20260916.json';
const result = JSON.parse(fs.readFileSync(process.env.MM_R2_RESULT_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.r2-result.json', 'utf8'));
const audit = JSON.parse(fs.readFileSync(process.env.MM_AUDIT_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.audit.json', 'utf8'));
const request = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const byEvidence = new Map(result.results.map((item) => [item.evidenceId, item]));
const byEntity = new Map(audit.results.map((item) => [item.entityId, item]));
let bound = 0;
for (const evidence of request.bundle.evidence) {
  const r2 = byEvidence.get(evidence.evidence_id);
  if (!r2 || !r2.payloadReadback || !r2.manifestReadback) continue;
  const auditItem = byEntity.get(r2.entityId);
  const contentType = String(auditItem?.contentType || 'text/html').split(';')[0];
  evidence.rights_status = 'allowed_private_raw';
  evidence.raw_storage = { status: 'captured', bucket: 'foundation-raw', key: r2.payloadKey, content_type: contentType, content_sha256: r2.payloadSha256, bytes: r2.payloadBytes };
  bound += 1;
}
for (const source of request.bundle.sources) {
  if (request.bundle.evidence.some((evidence) => evidence.source_id === source.source_id && evidence.raw_storage?.status === 'captured')) source.rights_status = 'allowed_private_raw';
}
request.bundle.quality = { ...request.bundle.quality, warnings: [`R2 raw payload/manifest Readback検証済み: ${bound}/${request.bundle.evidence.length}件。`, bound < request.bundle.evidence.length ? `未取得本文: ${request.bundle.evidence.length - bound}件。metadata_onlyとして保持。` : '全件のraw本文をCreate-Only保存し、payload/manifestをreadback検証済み。', '利益・原価・税・手残りは独立確認していない。'] };
fs.writeFileSync(outputPath, `${JSON.stringify(request, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ inputPath, outputPath, evidenceBound: bound, r2ReadbackVerified: result.readbackVerified, notCaptured: request.bundle.evidence.length - bound }, null, 2));
