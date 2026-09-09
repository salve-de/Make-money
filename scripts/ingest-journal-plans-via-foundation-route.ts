import { readFile, writeFile, access, readdir } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

type JsonObject = Record<string, any>;
const inputDir = resolve(process.argv[2] || 'data/collection/journal_shards_20260909_04d');
const endpoint = process.argv[3] || 'http://127.0.0.1:8790/api/foundation/ingest';
const token = process.env.FOUNDATION_LOCAL_INGEST_TOKEN?.trim();
const maxAttempts = Math.max(1, Math.min(6, Number(process.argv[4] || 6)));
if (!token) throw new Error('FOUNDATION_LOCAL_INGEST_TOKEN is required');
const authToken: string = token;

function sleep(ms: number): Promise<void> { return new Promise((resolveSleep) => setTimeout(resolveSleep, ms)); }
function retryable(status: number): boolean { return [408, 425, 429, 500, 502, 503, 504].includes(status); }
function success(response: JsonObject | null, status: number): boolean {
  return status === 200 && response?.success === true && response?.schema_validation === 'PASS' && response?.readback_verified === response?.counts?.planned;
}
async function exists(path: string): Promise<boolean> { try { await access(path); return true; } catch { return false; } }
async function receiptFiles(basePath: string): Promise<string[]> {
  const baseName = basename(basePath).replace(/\.json$/, '');
  const prefix = baseName.replace(/\.api-receipt$/, '') + '.api-receipt';
  return (await readdir(dirname(basePath))).filter((name) => name.startsWith(prefix) && name.endsWith('.json')).map((name) => resolve(dirname(basePath), name));
}

async function ingestOne(name: string): Promise<JsonObject> {
  const inputPath = resolve(inputDir, name);
  const receiptPath = inputPath.replace(/\.journal-plan\.json$/, '.api-receipt.json');
  for (const existingPath of await receiptFiles(receiptPath)) {
    try {
      const existing = JSON.parse(await readFile(existingPath, 'utf8')) as JsonObject;
      const response = existing.response || existing;
      const status = Number(existing.http_status || 200);
      if (success(response, status)) return { request_file: name, status: 'SKIPPED_EXISTING_SUCCESS', http_status: status };
    } catch { /* retry with the immutable create-only route */ }
  }
  const plan = JSON.parse(await readFile(inputPath, 'utf8')) as JsonObject;
  const body = Buffer.from(JSON.stringify({ write_authorized: true, journal_plan: plan }) + '\n');
  let lastStatus = 0;
  let lastResponse: JsonObject | null = null;
  let lastError: string | null = null;
  let attemptsUsed = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attemptsUsed = attempt;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-foundation-ingest-token': authToken },
        body,
        signal: AbortSignal.timeout(600_000),
      });
      const text = await response.text();
      try { lastResponse = JSON.parse(text) as JsonObject; } catch { lastResponse = { raw_response: text.slice(0, 20_000) }; }
      lastStatus = response.status;
      lastError = null;
      if (success(lastResponse, lastStatus) || !retryable(lastStatus) || attempt === maxAttempts) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt === maxAttempts) break;
    }
    await sleep(Math.min(30_000, 2_000 * 2 ** (attempt - 1)));
  }
  const receipt = { request_file: name, endpoint, http_status: lastStatus, attempts: attemptsUsed, request_bytes: body.byteLength, response: lastResponse, error: lastError, recorded_at: new Date().toISOString() };
  const outputReceiptPath = await exists(receiptPath)
    ? receiptPath.replace(/\.json$/, `.retry-${Date.now()}-${process.pid}.json`)
    : receiptPath;
  await writeFile(outputReceiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return { request_file: name, status: success(lastResponse, lastStatus) ? 'SUCCESS' : 'FAILED', http_status: lastStatus, attempts: attemptsUsed, planned: lastResponse?.counts?.planned || null, readback_verified: lastResponse?.readback_verified || null, error: lastError || lastResponse?.error || null };
}

async function main(): Promise<void> {
  const names = (await (await import('node:fs/promises')).readdir(inputDir)).filter((name) => name.endsWith('.journal-plan.json')).sort();
  for (const name of names) console.log(JSON.stringify(await ingestOne(name)));
  console.log(JSON.stringify({ input_dir: inputDir, total: names.length }));
}
main().catch((error) => { console.error(error instanceof Error ? error.stack || error.message : error); process.exitCode = 1; });
