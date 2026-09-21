#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { readR2Object } from '../src/lib/storage/r2';

type ReceiptObject = {
  bucket?: unknown;
  key?: unknown;
  sha256?: unknown;
  content_sha256?: unknown;
  bytes?: unknown;
};

const FOUNDATION_BUCKETS = new Set([
  'foundation-raw',
  'foundation-lake',
  'foundation-public',
  'foundation-restricted',
]);

function usage(): never {
  throw new Error('Usage: r2-restore-check.ts RECEIPT.json RESTORE_DIR');
}

function objectList(value: unknown): ReceiptObject[] {
  if (!value || typeof value !== 'object') return [];
  const candidate = value as {
    objects?: unknown;
    result?: { objects?: unknown };
    planned_writes?: { objects?: unknown };
    raw_storage?: { bucket?: unknown; key?: unknown };
    sha256?: unknown;
    byte_length?: unknown;
  };
  const lists = [candidate.objects, candidate.result?.objects, candidate.planned_writes?.objects];
  for (const list of lists) {
    if (Array.isArray(list)) return list.filter((item): item is ReceiptObject => Boolean(item && typeof item === 'object'));
  }
  if (candidate.raw_storage && typeof candidate.raw_storage === 'object') {
    return [{
      bucket: candidate.raw_storage.bucket,
      key: candidate.raw_storage.key,
      sha256: candidate.sha256,
      bytes: candidate.byte_length,
    }];
  }
  return [];
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function safeOutputPath(root: string, bucket: string, key: string): string {
  if (!bucket || !key || bucket === 'universal' || isAbsolute(key)) {
    throw new Error(`Unsafe restore target: ${bucket}/${key}`);
  }
  const output = resolve(root, bucket, key);
  const base = resolve(root);
  const rel = relative(base, output);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Restore path escapes output directory: ${bucket}/${key}`);
  }
  return output;
}

async function main(): Promise<void> {
  const [receiptPath, restoreDir] = process.argv.slice(2);
  if (!receiptPath || !restoreDir) usage();

  const receipt = JSON.parse(await readFile(resolve(receiptPath), 'utf8')) as unknown;
  const objects = objectList(receipt);
  if (objects.length === 0) throw new Error('Receipt contains no restorable objects');

  const unique = new Map<string, ReceiptObject>();
  for (const object of objects) {
    const bucket = typeof object.bucket === 'string' ? object.bucket.trim() : '';
    const key = typeof object.key === 'string' ? object.key.trim() : '';
    if (!bucket || !key) throw new Error('Receipt object is missing bucket or key');
    if (!FOUNDATION_BUCKETS.has(bucket)) {
      throw new Error(`Restore is limited to Foundation buckets: ${bucket}`);
    }
    const objectId = `${bucket}\n${key}`;
    if (unique.has(objectId)) throw new Error(`Receipt contains a duplicate object: ${bucket}/${key}`);
    unique.set(objectId, object);
  }

  const outputRoot = resolve(restoreDir);
  await mkdir(outputRoot, { recursive: true });
  const restored: Array<Record<string, unknown>> = [];

  for (const object of unique.values()) {
    const bucket = String(object.bucket);
    const key = String(object.key);
    const expectedSha = typeof object.sha256 === 'string'
      ? object.sha256
      : typeof object.content_sha256 === 'string'
        ? object.content_sha256
        : null;
    const expectedBytes = typeof object.bytes === 'number' ? object.bytes : null;
    if (!expectedSha || !/^[a-f0-9]{64}$/.test(expectedSha)) {
      throw new Error(`Receipt object is missing a valid SHA-256: ${bucket}/${key}`);
    }
    if (expectedBytes === null || !Number.isSafeInteger(expectedBytes) || expectedBytes < 0) {
      throw new Error(`Receipt object is missing a valid byte count: ${bucket}/${key}`);
    }
    const remote = await readR2Object(bucket, key);
    if (!remote) throw new Error(`R2 object not found during restore: ${bucket}/${key}`);
    const actualSha = sha256(remote.body);
    const bytesMatch = expectedBytes === null || expectedBytes === remote.body.byteLength;
    const shaMatch = expectedSha === null || expectedSha === actualSha;
    if (!bytesMatch || !shaMatch) {
      throw new Error(`Restore verification failed for ${bucket}/${key}: bytes=${bytesMatch}, sha256=${shaMatch}`);
    }

    const outputPath = safeOutputPath(outputRoot, bucket, key);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, remote.body, { flag: 'wx' });
    restored.push({ bucket, key, bytes: remote.body.byteLength, sha256: actualSha });
  }

  const report = {
    schema_version: 'r2-restore-report.v1',
    restored_at: new Date().toISOString(),
    source_receipt: resolve(receiptPath),
    restore_root: outputRoot,
    object_count: restored.length,
    objects: restored,
  };
  await writeFile(join(outputRoot, 'restore-report.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ status: 'PASS', object_count: restored.length, restore_root: outputRoot }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
