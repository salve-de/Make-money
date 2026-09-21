#!/usr/bin/env node

import { R2ObjectConflictError, putR2ObjectCreateOnly } from '../src/lib/storage/r2';

const bucket = 'foundation-lake';
const key = 'ops/100-year-canary/create-only-v1.json';
const body = JSON.stringify({
  schema_version: 'r2-create-only-canary.v1',
  purpose: 'prove-create-only-readback-and-conflict-stop',
  version: 1,
});

async function main(): Promise<void> {
  const first = await putR2ObjectCreateOnly({
    bucket,
    key,
    body,
    contentType: 'application/json; charset=utf-8',
  });
  const retry = await putR2ObjectCreateOnly({
    bucket,
    key,
    body,
    contentType: 'application/json; charset=utf-8',
  });

  let conflict = 'FAIL';
  try {
    await putR2ObjectCreateOnly({
      bucket,
      key,
      body: `${body}\nconflict-attempt`,
      contentType: 'application/json; charset=utf-8',
    });
  } catch (error) {
    if (error instanceof R2ObjectConflictError) conflict = 'PASS';
    else throw error;
  }

  if (first.readback.bytes_match !== true || first.readback.sha256_match !== true) {
    throw new Error('Initial canary readback did not verify');
  }
  if (retry.status !== 'EXISTS_IDENTICAL' || conflict !== 'PASS') {
    throw new Error(`Create-only contract failed: retry=${retry.status}, conflict=${conflict}`);
  }

  console.log(JSON.stringify({
    status: 'PASS',
    bucket,
    key,
    first_status: first.status,
    retry_status: retry.status,
    conflict_attempt: conflict,
    initial_readback: first.readback,
    retry_readback: retry.readback,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
