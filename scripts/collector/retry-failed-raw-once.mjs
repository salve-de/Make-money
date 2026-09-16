import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const auditPath = process.env.MM_AUDIT_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.audit.json';
const batchPath = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const outputDir = process.env.MM_OUTPUT_DIR ?? 'data/incoming/raw_snapshots_new1000_20260916';
const concurrency = Number(process.env.MM_CONCURRENCY ?? 4);
const timeoutMs = Number(process.env.MM_TIMEOUT_MS ?? 30000);
const audit = JSON.parse(await fs.readFile(auditPath, 'utf8'));
const batch = JSON.parse(await fs.readFile(batchPath, 'utf8'));
const byUrl = new Map(batch.map((entity) => [entity.pnl?.sourceDoc || entity.sourceMetadata?.postUrl || entity.url, entity]));
const failed = audit.results.filter((item) => item.status !== 'CAPTURED');
const results = [];
let cursor = 0;
await fs.mkdir(outputDir, { recursive: true });

async function retry(item) {
  const entity = byUrl.get(item.requestedUrl);
  const record = { ...item, fetchedAt: new Date().toISOString(), status: 'FAILED', httpStatus: null, finalUrl: null, contentType: null, bytes: 0, sha256: null, localPath: null, error: null };
  if (!entity) { record.error = 'entity not found in input batch'; return record; }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(item.requestedUrl, { redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'Make-Money-research-capture/2026-09-16', accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.1' } });
    record.httpStatus = response.status; record.finalUrl = response.url; record.contentType = response.headers.get('content-type');
    const body = Buffer.from(await response.arrayBuffer()); record.bytes = body.length;
    if (!response.ok) { record.error = `HTTP ${response.status}`; return record; }
    record.sha256 = crypto.createHash('sha256').update(body).digest('hex');
    const urlHash = crypto.createHash('sha256').update(String(item.requestedUrl)).digest('hex');
    const ext = /json/i.test(record.contentType || '') ? 'json' : 'html';
    const localPath = path.join(outputDir, `${urlHash}.${ext}`);
    await fs.writeFile(localPath, body, { flag: 'wx' }).catch(async (error) => {
      if (error?.code !== 'EEXIST') throw error;
      const existing = await fs.readFile(localPath); const existingHash = crypto.createHash('sha256').update(existing).digest('hex');
      if (existingHash !== record.sha256) throw new Error('existing snapshot hash conflict');
    });
    record.localPath = localPath; record.status = 'CAPTURED';
  } catch (error) { record.error = error instanceof Error ? error.message : 'fetch failed'; }
  finally { clearTimeout(timer); }
  return record;
}
async function worker() { while (true) { const index = cursor++; if (index >= failed.length) return; results[index] = await retry(failed[index]); } }
await Promise.all(Array.from({ length: Math.min(concurrency, failed.length) }, worker));
const updates = new Map(results.map((item) => [item.requestedUrl, item]));
audit.results = audit.results.map((item) => updates.get(item.requestedUrl) || item);
audit.captured = audit.results.filter((item) => item.status === 'CAPTURED').length;
audit.failed = audit.results.length - audit.captured;
await fs.writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ attempted: failed.length, retriedCaptured: results.filter((item) => item.status === 'CAPTURED').length, capturedTotal: audit.captured, failedTotal: audit.failed, auditPath }, null, 2));
