import fs from 'node:fs';
import crypto from 'node:crypto';

const planPath = process.argv[2];
const outputPath = process.argv[3];
const concurrency = Number(process.env.MM_CONCURRENCY ?? 8);
if (!planPath || !outputPath) throw new Error('Usage: node ingest-foundation-journal-bounded.mjs JOURNAL_PLAN.json RESULT.json');
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) throw new Error('MM_CONCURRENCY must be an integer from 1 to 32');
const { preflightR2Object, putR2ObjectCreateOnly } = await import('../../src/lib/storage/r2.ts');
const prepared = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const entries = Array.isArray(prepared.entries) ? prepared.entries : [];
const planned = prepared.planned_writes?.objects ?? [];
if (!entries.length || entries.length !== planned.length) throw new Error(`Journal plan mismatch: entries=${entries.length}, planned=${planned.length}`);

const items = planned.map((object, index) => {
  const body = `${JSON.stringify(entries[index])}\n`;
  const bytes = Buffer.byteLength(body);
  const sha256 = crypto.createHash('sha256').update(body).digest('hex');
  if (object.bytes !== bytes || object.content_sha256 !== sha256) throw new Error(`Plan body mismatch at index ${index}: ${object.key}`);
  return { index, object, body, bytes, sha256 };
});

async function workers(list, handler) {
  let cursor = 0;
  const results = new Array(list.length);
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= list.length) return;
      results[index] = await handler(list[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
  return results;
}

const preflight = await workers(items, async (item) => {
  const result = await preflightR2Object({ bucket: item.object.bucket, key: item.object.key, body: item.body, contentType: item.object.content_type });
  if (result.status === 'EXISTS_CONFLICT') throw new Error(`R2 object conflict: ${result.bucket}/${result.key}`);
  return { index: item.index, status: result.status, bucket: result.bucket, key: result.key };
});

const writes = await workers(items, async (item) => {
  const result = await putR2ObjectCreateOnly({
    bucket: item.object.bucket,
    key: item.object.key,
    body: item.body,
    contentType: item.object.content_type,
    metadata: {
      'foundation-run-id': String(prepared.planned_writes.run_id).replace(/\.journal$/, ''),
      'foundation-dataset-id': 'ds.foundation.journal.core',
      'foundation-schema-version': 'journal-entry.v1',
    },
  });
  return { index: item.index, status: result.status, bucket: result.bucket, key: result.key, bytes: result.bytes, sha256: result.sha256, readback: result.readback };
});

const output = {
  schemaVersion: 'bounded-foundation-journal-ingest.v1',
  planPath,
  concurrency,
  planned: items.length,
  preflight: { absent: preflight.filter((item) => item.status === 'ABSENT').length, identical: preflight.filter((item) => item.status === 'EXISTS_IDENTICAL').length },
  writes: { created: writes.filter((item) => item.status === 'CREATED').length, identical: writes.filter((item) => item.status === 'EXISTS_IDENTICAL').length, readbackVerified: writes.filter((item) => item.readback.bytes_match && item.readback.sha256_match).length },
  results: writes,
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, planned: output.planned, preflight: output.preflight, writes: output.writes }, null, 2));
