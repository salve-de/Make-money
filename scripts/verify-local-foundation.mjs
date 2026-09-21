import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Read-only acceptance: saved receipt IDs must reach the local list AND detail. */
export async function verifyLocalFoundation(baseUrl, entityIds, request = fetch) {
  const base = new URL(baseUrl);
  if (base.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
    || base.username || base.password) throw new Error('A loopback HTTP origin is required');
  const expected = new Set(entityIds);
  if (!expected.size || expected.size > 20_000
    || [...expected].some(id => typeof id !== 'string' || !/^ent_[a-zA-Z0-9_.-]+$/.test(id))) {
    throw new Error('Expected non-empty valid receipt entity_ids');
  }
  async function read(params) {
    const url = new URL('/api/businesses', base);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await request(url, { signal: AbortSignal.timeout(60_000), redirect: 'error' });
    if (!response.ok) throw new Error(`Local API HTTP ${response.status}`);
    const body = await response.json();
    if (body.source !== 'foundation_lake') throw new Error('Local API did not read Foundation R2');
    return body;
  }
  const missing = new Set(expected);
  const cursors = new Set();
  let cursor;
  let pages = 0;
  while (missing.size) {
    if (pages >= 100) throw new Error('List page budget exhausted');
    const page = await read({ limit: '100', foundationOnly: 'true', ...(cursor ? { cursor } : {}) });
    if (!Array.isArray(page.data)) throw new Error('Invalid list response');
    for (const row of page.data) missing.delete(row?.id);
    pages++;
    if (!page.hasMore || !missing.size) break;
    if (typeof page.nextCursor !== 'string' || !page.nextCursor || cursors.has(page.nextCursor)) {
      throw new Error('List cursor did not advance');
    }
    cursor = page.nextCursor;
    cursors.add(cursor);
  }
  if (missing.size) throw new Error(`${missing.size} receipt IDs missing from local list`);
  const ids = [...expected];
  const failed = [];
  let next = 0;
  let verified = 0;
  await Promise.all(Array.from({ length: Math.min(2, ids.length) }, async () => {
    while (next < ids.length) {
      const id = ids[next++];
      try {
        const detail = await read({ entity_id: id });
        if (!detail.data || detail.data.id !== id) throw new Error('Detail identity mismatch');
        verified++;
      } catch {
        // Provider bodies, private observations and credentials are never logged.
        failed.push(id);
      }
    }
  }));
  return { checkedAt: new Date().toISOString(), origin: base.origin,
    expected: ids.length, listPages: pages, detailsVerified: verified,
    failedEntityIds: failed, passed: failed.length === 0 };
}

async function main() {
  try {
    const [base, ...paths] = process.argv.slice(2);
    if (!base || !paths.length) throw new Error('Usage: node scripts/verify-local-foundation.mjs http://localhost:3000 <receipt.json> [...]');
    const ids = paths.flatMap(path => {
      const receipt = JSON.parse(readFileSync(path, 'utf8'));
      if (!Array.isArray(receipt.entity_ids)) throw new Error('Receipt entity_ids missing');
      return receipt.entity_ids;
    });
    const report = await verifyLocalFoundation(base, ids);
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
  } catch {
    console.error('Local Foundation acceptance failed; verify receipt inputs and local API. No response bodies logged.');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();
