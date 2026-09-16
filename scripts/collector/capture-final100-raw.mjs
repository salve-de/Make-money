import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const inputPath = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_final100_subset_of_new1000_20260916.json';
const outputDir = process.env.MM_OUTPUT_DIR ?? 'data/incoming/raw_snapshots_final100_20260916';
const auditPath = process.env.MM_AUDIT_FILE ?? 'data/incoming/raw_snapshots_final100_20260916.audit.json';
const expectedCount = Number(process.env.MM_EXPECTED_COUNT ?? 100);
const concurrency = Number(process.env.MM_CONCURRENCY ?? 5);
const timeoutMs = Number(process.env.MM_TIMEOUT_MS ?? 15000);
const maxBytes = Number(process.env.MM_MAX_BYTES ?? 8 * 1024 * 1024);
const userAgent = 'Make-Money-research-capture/2026-09-16';

const entities = JSON.parse(await fs.readFile(inputPath, 'utf8'));
if (!Array.isArray(entities) || entities.length !== expectedCount) throw new Error(`Expected exactly ${expectedCount} entities`);
await fs.mkdir(outputDir, { recursive: true });

const urls = [...new Map(entities.map((entity) => [entity.pnl?.sourceDoc || entity.sourceMetadata?.postUrl || entity.url, entity])).entries()];
const results = [];
let cursor = 0;

async function capture([url, entity]) {
  const hash = crypto.createHash('sha256').update(String(url)).digest('hex');
  const record = { name: entity.name, entityId: entity.id, requestedUrl: url, fetchedAt: new Date().toISOString(), status: 'FAILED', httpStatus: null, finalUrl: null, contentType: null, bytes: 0, sha256: null, localPath: null, error: null };
  if (!url) { record.error = 'missing source URL'; return record; }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'user-agent': userAgent, accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.1' } });
    record.httpStatus = response.status;
    record.finalUrl = response.url;
    record.contentType = response.headers.get('content-type');
    const body = Buffer.from(await response.arrayBuffer());
    record.bytes = body.length;
    if (!response.ok) { record.error = `HTTP ${response.status}`; return record; }
    if (body.length > maxBytes) { record.error = `body exceeds ${maxBytes} bytes`; return record; }
    record.sha256 = crypto.createHash('sha256').update(body).digest('hex');
    const ext = /json/i.test(record.contentType || '') ? 'json' : 'html';
    const localPath = path.join(outputDir, `${hash}.${ext}`);
    await fs.writeFile(localPath, body, { flag: 'wx' }).catch(async (error) => {
      if (error?.code !== 'EEXIST') throw error;
      const existing = await fs.readFile(localPath);
      const existingHash = crypto.createHash('sha256').update(existing).digest('hex');
      if (existingHash !== record.sha256) throw new Error('existing snapshot hash conflict');
    });
    record.localPath = localPath;
    record.status = 'CAPTURED';
  } catch (error) {
    record.error = error instanceof Error ? error.message : 'fetch failed';
  } finally {
    clearTimeout(timer);
  }
  return record;
}

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= urls.length) return;
    results[index] = await capture(urls[index]);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
results.sort((a, b) => a.name.localeCompare(b.name));
const audit = { schemaVersion: 'raw-capture-audit.v1', snapshot: '2026-09-16', input: inputPath, outputDir, requested: urls.length, captured: results.filter((x) => x.status === 'CAPTURED').length, failed: results.filter((x) => x.status !== 'CAPTURED').length, results };
await fs.writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ inputCount: entities.length, uniqueSourceUrls: urls.length, captured: audit.captured, failed: audit.failed, auditPath }, null, 2));
