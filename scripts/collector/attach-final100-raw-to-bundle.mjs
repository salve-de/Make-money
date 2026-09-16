import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const bundlePath = process.env.MM_BUNDLE_FILE ?? 'data/incoming/research-bundle_new1000_20260916.json';
const auditPath = process.env.MM_AUDIT_FILE ?? 'data/incoming/raw_snapshots_final100_20260916.audit.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/research-bundle_new1000_final100raw_20260916.json';
const bundleRequest = JSON.parse(await fs.readFile(bundlePath, 'utf8'));
const audit = JSON.parse(await fs.readFile(auditPath, 'utf8'));
const captured = audit.results.filter((item) => item.status === 'CAPTURED');
const sourceByUrl = new Map(bundleRequest.bundle.sources.map((item) => [item.canonical_url, item]));
const evidenceByUrl = new Map(bundleRequest.bundle.evidence.map((item) => [item.source_url, item]));
const rawEvidence = [];
for (const item of captured) {
  const evidence = evidenceByUrl.get(item.requestedUrl);
  const source = sourceByUrl.get(item.requestedUrl);
  if (!evidence || !source) continue;
  const body = await fs.readFile(item.localPath);
  const digest = crypto.createHash('sha256').update(body).digest('hex');
  if (digest !== item.sha256 || body.length !== item.bytes) throw new Error(`Snapshot readback mismatch: ${item.name}`);
  const extension = item.contentType?.includes('json') ? 'json' : 'html';
  source.rights_status = 'allowed_private_raw';
  evidence.rights_status = 'allowed_private_raw';
  evidence.raw_storage = { status: 'captured', bucket: 'foundation-raw', key: `evidence/${evidence.source_id}/20260916/${evidence.evidence_id}/payload.${extension}`, content_type: item.contentType || 'text/html', content_sha256: digest, bytes: body.length };
  rawEvidence.push({ evidence_id: evidence.evidence_id, source_id: evidence.source_id, body_base64: body.toString('base64'), content_type: item.contentType || 'text/html', extension, rights_status: 'allowed_private_raw', retrieved_at: item.fetchedAt, source_url: item.requestedUrl, source_title: evidence.source_title, publisher_or_speaker: evidence.publisher_or_speaker, rights_policy_id: null });
}
const out = { ...bundleRequest, bundle: { ...bundleRequest.bundle, quality: { ...bundleRequest.bundle.quality, unknowns: [...bundleRequest.bundle.quality.unknowns, `raw本文を保存できたのは${rawEvidence.length}/${bundleRequest.bundle.evidence.length}件。`], warnings: ['1000件中、最終100件の出典本文のみraw capture済み。残りはmetadata_only。', '利益・原価・税・手残りは独立確認していない。'] }, }, raw_evidence: rawEvidence };
await fs.writeFile(outputPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ inputBundle: bundlePath, capturedAttached: rawEvidence.length, outputPath }, null, 2));
