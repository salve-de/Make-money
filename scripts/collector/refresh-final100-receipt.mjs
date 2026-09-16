import fs from 'node:fs';
import crypto from 'node:crypto';

const artifactPath = process.env.MM_ARTIFACT ?? 'data/incoming/batch_final100_subset_of_new1000_20260916.json';
const receiptPath = `${artifactPath}.receipt.json`;
const r2Path = process.env.MM_R2_RESULT_FILE ?? 'data/incoming/raw_snapshots_final100_20260916.r2-result.json';
const artifact = fs.readFileSync(artifactPath);
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
const r2 = JSON.parse(fs.readFileSync(r2Path, 'utf8'));
receipt.artifact = { ...receipt.artifact, sha256: crypto.createHash('sha256').update(artifact).digest('hex'), bytes: artifact.length, count: JSON.parse(artifact).length };
receipt.boundaries = { ...receipt.boundaries, r2RawEvidenceUploaded: r2.completed === r2.requested && r2.readbackVerified === r2.requested, r2RawEvidenceCount: r2.readbackVerified, independentProfitAuditCompleted: false };
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ receiptPath, artifactSha256: receipt.artifact.sha256, r2RawEvidenceCount: receipt.boundaries.r2RawEvidenceCount }, null, 2));
