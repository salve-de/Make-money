import { readFile, writeFile, access, readdir } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

type JsonObject = Record<string, any>;

const inputDir = resolve(process.argv[2] || 'data/collection/shards_20260909_04d');
const endpoint = process.argv[3] || 'http://127.0.0.1:8790/api/foundation/ingest';
const token = process.env.FOUNDATION_LOCAL_INGEST_TOKEN?.trim();
const concurrency = Math.max(1, Math.min(4, Number(process.argv[4] || 3)));
const maxAttempts = Math.max(1, Math.min(6, Number(process.argv[5] || 5)));

if (!token) throw new Error('FOUNDATION_LOCAL_INGEST_TOKEN is required');
const authToken: string = token;

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function isSuccessful(response: JsonObject | null, status: number): boolean {
  return status === 200 && response?.success === true && response?.schema_validation === 'PASS' &&
    response?.readback_verified === response?.counts?.planned;
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function receiptFiles(basePath: string): Promise<string[]> {
  const baseName = basename(basePath).replace(/\.json$/, '');
  const prefix = baseName.replace(/\.api-receipt$/, '') + '.api-receipt';
  return (await readdir(dirname(basePath))).filter((name) => name.startsWith(prefix) && name.endsWith('.json')).map((name) => resolve(dirname(basePath), name));
}

async function ingestOne(requestFile: string): Promise<JsonObject> {
  const requestPath = resolve(inputDir, requestFile);
  const receiptPath = requestPath.replace(/\.request\.json$/, '.api-receipt.json');
  for (const existingPath of await receiptFiles(receiptPath)) {
    try {
      const existing = JSON.parse(await readFile(existingPath, 'utf8')) as JsonObject;
      const existingResponse = existing.response || existing;
      const existingStatus = Number(existing.http_status || 200);
      if (isSuccessful(existingResponse, existingStatus)) {
        return { request_file: requestFile, status: 'SKIPPED_EXISTING_SUCCESS', http_status: existingStatus };
      }
    } catch {
      // An incomplete receipt is not trusted; the create-only route is safe to retry.
    }
  }

  const body = await readFile(requestPath);
  let lastStatus = 0;
  let lastResponse: JsonObject | null = null;
  let lastError: string | null = null;
  let attemptsUsed = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attemptsUsed = attempt;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-foundation-ingest-token': authToken,
        },
        body,
        signal: AbortSignal.timeout(600_000),
      });
      const text = await response.text();
      let parsed: JsonObject | null = null;
      try {
        parsed = JSON.parse(text) as JsonObject;
      } catch {
        parsed = { raw_response: text.slice(0, 20_000) };
      }
      lastStatus = response.status;
      lastResponse = parsed;
      lastError = null;
      if (isSuccessful(parsed, response.status) || !retryableStatus(response.status) || attempt === maxAttempts) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt === maxAttempts) break;
    }
    await sleep(Math.min(30_000, 2_000 * 2 ** (attempt - 1)));
  }

  const receipt = {
    request_file: requestFile,
    endpoint,
    http_status: lastStatus,
    attempts: attemptsUsed,
    request_bytes: body.byteLength,
    response: lastResponse,
    error: lastError,
    recorded_at: new Date().toISOString(),
  };
  const outputReceiptPath = await exists(receiptPath)
    ? receiptPath.replace(/\.json$/, `.retry-${Date.now()}-${process.pid}.json`)
    : receiptPath;
  await writeFile(outputReceiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return {
    request_file: requestFile,
    status: isSuccessful(lastResponse, lastStatus) ? 'SUCCESS' : 'FAILED',
    http_status: lastStatus,
    attempts: attemptsUsed,
    planned: lastResponse?.counts?.planned || null,
    readback_verified: lastResponse?.readback_verified || null,
    error: lastError || lastResponse?.error || null,
  };
}

async function main(): Promise<void> {
  const manifest = JSON.parse(await readFile(resolve(inputDir, 'manifest.json'), 'utf8')) as JsonObject;
  const requestFiles = (manifest.shards as JsonObject[])
    .map((shard) => String(shard.path).split(/[\\/]/).pop() || '')
    .filter((name) => name.endsWith('.request.json'));
  let cursor = 0;
  const results: JsonObject[] = [];
  async function worker(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= requestFiles.length) return;
      const result = await ingestOne(requestFiles[index]);
      results[index] = result;
      console.log(JSON.stringify(result));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, requestFiles.length) }, () => worker()));
  const failed = results.filter((result) => result.status === 'FAILED');
  console.log(JSON.stringify({ input_dir: inputDir, total: results.length, succeeded: results.length - failed.length, failed: failed.length }));
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
