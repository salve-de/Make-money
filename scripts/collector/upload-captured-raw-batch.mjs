import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const auditPath = process.env.MM_AUDIT_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.audit.json';
const bundlePath = process.env.MM_BUNDLE_FILE ?? 'data/incoming/research-bundle_new1000_final100raw_20260916.json';
const resultPath = process.env.MM_RESULT_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.r2-result.json';
const concurrency = Number(process.env.MM_CONCURRENCY ?? 8);
const bucket = 'foundation-raw';
const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
if (!accountId || !accessKeyId || !secretAccessKey) throw new Error('R2 credentials are required through the keychain wrapper');
const client = new S3Client({ region: 'auto', endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey }, maxAttempts: 3 });
const audit = JSON.parse(await fs.readFile(auditPath, 'utf8'));
const bundle = JSON.parse(await fs.readFile(bundlePath, 'utf8'));
const captured = audit.results.filter((item) => item.status === 'CAPTURED');
const evidenceByUrl = new Map(bundle.bundle.evidence.map((item) => [item.source_url, item]));
const results = [];
let cursor = 0;

async function readback(key, expectedBytes, expectedHash) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks = [];
  for await (const chunk of response.Body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const body = Buffer.concat(chunks);
  const hash = crypto.createHash('sha256').update(body).digest('hex');
  if (body.length !== expectedBytes || hash !== expectedHash) throw new Error(`R2 readback mismatch: ${key}`);
  return { bytes: body.length, sha256: hash };
}

async function readObject(key) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks = [];
  for await (const chunk of response.Body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const body = Buffer.concat(chunks);
  return { body, bytes: body.length, sha256: crypto.createHash('sha256').update(body).digest('hex') };
}

async function putAndVerify(key, body, contentType, metadata) {
  let status = 'CREATED';
  try {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, Metadata: metadata, IfNoneMatch: '*' }));
  } catch (error) {
    if (error?.name !== 'PreconditionFailed' && error?.$metadata?.httpStatusCode !== 412) throw error;
    status = 'EXISTS_IDENTICAL_OR_READBACK_REQUIRED';
  }
  return { status, readback: await readback(key, body.length, crypto.createHash('sha256').update(body).digest('hex')) };
}

async function putManifestCreateOnly(key, body, expectedManifest) {
  let status = 'CREATED';
  try {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'application/json', Metadata: { 'foundation-run-id': String(bundle.bundle.run_id), 'foundation-schema-version': 'raw-evidence.v1' }, IfNoneMatch: '*' }));
  } catch (error) {
    if (error?.name !== 'PreconditionFailed' && error?.$metadata?.httpStatusCode !== 412) throw error;
    status = 'EXISTS_SEMANTIC_MATCH_REQUIRED';
  }
  const actual = await readObject(key);
  let semanticMatch = false;
  try {
    const existing = JSON.parse(actual.body.toString('utf8'));
    semanticMatch = existing.evidence_id === expectedManifest.evidence_id && existing.source_id === expectedManifest.source_id && existing.content_sha256 === expectedManifest.content_sha256 && existing.bytes === expectedManifest.bytes;
  } catch { semanticMatch = false; }
  if (!semanticMatch) throw new Error(`R2 manifest readback semantic mismatch: ${key}`);
  return { status, readback: { ...actual, semanticMatch } };
}

async function upload(item) {
  const evidence = evidenceByUrl.get(item.requestedUrl);
  if (!evidence) return { name: item.name, requestedUrl: item.requestedUrl, status: 'SKIPPED_NO_BUNDLE_EVIDENCE' };
  const body = await fs.readFile(item.localPath);
  const digest = crypto.createHash('sha256').update(body).digest('hex');
  if (digest !== item.sha256 || body.length !== item.bytes) throw new Error(`Local snapshot mismatch: ${item.name}`);
  const date = new Date(item.fetchedAt || audit.snapshot);
  const yyyy = String(date.getUTCFullYear()).padStart(4, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const extension = item.contentType?.includes('json') ? 'json' : 'html';
  const prefix = `evidence/${evidence.source_id}/${yyyy}/${mm}/${dd}/${evidence.evidence_id}`;
  let payloadKey = `${prefix}/payload.${extension}`;
  let manifestKey = `${prefix}/manifest.json`;
  const contentType = String(item.contentType || 'text/html').split(';')[0];
  const metadata = { 'foundation-run-id': String(bundle.bundle.run_id), 'foundation-schema-version': 'raw-evidence.v1' };
  let payload;
  try {
    payload = await putAndVerify(payloadKey, body, contentType, metadata);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith('R2 readback mismatch:')) throw error;
    // The same evidence can be observed again after the source changes. Keep the
    // old immutable object and write the new byte version below a hash-qualified key.
    const versionedPrefix = `${prefix}/${digest.slice(0, 12)}`;
    payloadKey = `${versionedPrefix}/payload.${extension}`;
    manifestKey = `${versionedPrefix}/manifest.json`;
    payload = await putAndVerify(payloadKey, body, contentType, metadata);
  }
  const manifestBody = Buffer.from(`${JSON.stringify({ evidence_id: evidence.evidence_id, source_id: evidence.source_id, source_url: item.requestedUrl, source_title: evidence.source_title, publisher_or_speaker: evidence.publisher_or_speaker || null, retrieved_at: item.fetchedAt || bundle.bundle.retrieved_at, rights_status: 'allowed_private_raw', content_sha256: digest, bytes: body.length, content_type: contentType, run_id: bundle.bundle.run_id })}\n`, 'utf8');
  const expectedManifest = { evidence_id: evidence.evidence_id, source_id: evidence.source_id, content_sha256: digest, bytes: body.length };
  const manifest = await putManifestCreateOnly(manifestKey, manifestBody, expectedManifest);
  return { name: item.name, entityId: item.entityId, evidenceId: evidence.evidence_id, sourceId: evidence.source_id, payloadKey, manifestKey, payloadStatus: payload.status, manifestStatus: manifest.status, payloadBytes: body.length, payloadSha256: digest, payloadReadback: payload.readback, manifestReadback: manifest.readback };
}

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= captured.length) return;
    results[index] = await upload(captured[index]);
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, captured.length) }, worker));
const completed = results.filter((item) => item.payloadReadback && item.manifestReadback);
const result = { schemaVersion: 'raw-r2-ingest-result.v1', bucket, runId: bundle.bundle.run_id, requested: captured.length, completed: completed.length, createdPayloads: results.filter((x) => x.payloadStatus === 'CREATED').length, existingPayloads: results.filter((x) => x.payloadStatus && x.payloadStatus !== 'CREATED').length, createdManifests: results.filter((x) => x.manifestStatus === 'CREATED').length, existingManifests: results.filter((x) => x.manifestStatus && x.manifestStatus !== 'CREATED').length, readbackVerified: completed.length, results };
await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ bucket, requested: result.requested, completed: result.completed, createdPayloads: result.createdPayloads, existingPayloads: result.existingPayloads, readbackVerified: result.readbackVerified, resultPath }, null, 2));
