import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const bundlePath = process.env.MM_BUNDLE_FILE ?? 'data/incoming/research-bundle_new1000_final100raw_20260916.json';
const resultPath = process.env.MM_RESULT_FILE ?? 'data/incoming/raw_snapshots_final100_20260916.r2-result.json';
const bucket = 'foundation-raw';
const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
if (!accountId || !accessKeyId || !secretAccessKey) throw new Error('R2 credentials are required through the keychain wrapper');
const client = new S3Client({ region: 'auto', endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey }, maxAttempts: 3 });
const request = JSON.parse(await fs.readFile(bundlePath, 'utf8'));
const rawEvidence = request.raw_evidence;
if (!Array.isArray(rawEvidence) || rawEvidence.length !== 100) throw new Error('Expected exactly 100 raw evidence records');

async function bodyOf(response) {
  if (!response?.Body) throw new Error('R2 response body missing');
  const chunks = [];
  for await (const chunk of response.Body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}
async function readback(key, expected, expectedHash) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = await bodyOf(response);
  const hash = crypto.createHash('sha256').update(body).digest('hex');
  if (body.length !== expected || hash !== expectedHash) throw new Error(`R2 readback mismatch for ${key}`);
  return { bytes: body.length, sha256: hash };
}
async function putCreateOnly(key, body, contentType, metadata) {
  let status = 'CREATED';
  try {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, Metadata: metadata, IfNoneMatch: '*' }));
  } catch (error) {
    const code = error?.name || '';
    const http = error?.$metadata?.httpStatusCode;
    if (code !== 'PreconditionFailed' && http !== 412) throw error;
    status = 'EXISTS_IDENTICAL_OR_READBACK_REQUIRED';
  }
  return { status, readback: await readback(key, body.length, crypto.createHash('sha256').update(body).digest('hex')) };
}

const results = [];
for (const item of rawEvidence) {
  const body = Buffer.from(item.body_base64, 'base64');
  const hash = crypto.createHash('sha256').update(body).digest('hex');
  const date = new Date(item.retrieved_at || request.bundle.retrieved_at);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid retrieved_at for ${item.evidence_id}`);
  const yyyy = String(date.getUTCFullYear()).padStart(4, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const extension = /^[a-z0-9]+$/.test(item.extension) ? item.extension : 'html';
  const prefix = `evidence/${item.source_id}/${yyyy}/${mm}/${dd}/${item.evidence_id}`;
  const payloadKey = `${prefix}/payload.${extension}`;
  const manifestKey = `${prefix}/manifest.json`;
  const contentType = String(item.content_type || 'text/html').split(';')[0];
  const payloadResult = await putCreateOnly(payloadKey, body, contentType, { 'foundation-run-id': String(request.bundle.run_id), 'foundation-schema-version': 'raw-evidence.v1' });
  const manifest = Buffer.from(`${JSON.stringify({ evidence_id: item.evidence_id, source_id: item.source_id, source_url: item.source_url || null, source_title: item.source_title || null, publisher_or_speaker: item.publisher_or_speaker || null, retrieved_at: item.retrieved_at || request.bundle.retrieved_at, rights_status: item.rights_status, rights_policy_id: item.rights_policy_id || null, content_sha256: hash, bytes: body.length, content_type: contentType, run_id: request.bundle.run_id })}\n`, 'utf8');
  const manifestResult = await putCreateOnly(manifestKey, manifest, 'application/json', { 'foundation-run-id': String(request.bundle.run_id), 'foundation-schema-version': 'raw-evidence.v1' });
  results.push({ evidenceId: item.evidence_id, sourceId: item.source_id, payloadKey, manifestKey, payloadStatus: payloadResult.status, manifestStatus: manifestResult.status, payloadBytes: body.length, payloadSha256: hash, payloadReadback: payloadResult.readback, manifestReadback: manifestResult.readback });
}
const result = { schemaVersion: 'raw-r2-ingest-result.v1', bucket, runId: request.bundle.run_id, requested: rawEvidence.length, completed: results.length, createdPayloads: results.filter((x) => x.payloadStatus === 'CREATED').length, existingPayloads: results.filter((x) => x.payloadStatus !== 'CREATED').length, createdManifests: results.filter((x) => x.manifestStatus === 'CREATED').length, existingManifests: results.filter((x) => x.manifestStatus !== 'CREATED').length, readbackVerified: results.filter((x) => x.payloadReadback && x.manifestReadback).length, results };
await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ bucket, requested: result.requested, completed: result.completed, createdPayloads: result.createdPayloads, existingPayloads: result.existingPayloads, createdManifests: result.createdManifests, existingManifests: result.existingManifests, readbackVerified: result.readbackVerified, resultPath }, null, 2));
