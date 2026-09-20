#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const strict = !process.argv.includes('--allow-unverified');
const checks = [];

function add(id, status, evidence, severity = 'info') {
  checks.push({ id, status, severity, evidence });
}

async function read(relativePath) {
  return readFile(resolve(root, relativePath), 'utf8');
}

async function exists(relativePath) {
  try {
    await read(relativePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const requiredDocs = [
    'docs/architecture/STORAGE.md',
    'docs/architecture/R2_100_YEAR_OPERATIONS.md',
    'docs/architecture/R2_100_YEAR_CANARY_EVIDENCE_2026-09-19.md',
    'docs/architecture/R2_100_YEAR_RESTORE_EVIDENCE_2026-09-19.md',
    'docs/architecture/R2_100_YEAR_INPUT_INVENTORY_2026-09-19.md',
    'docs/FOUNDATION_JOURNAL_HANDOFF.md',
    'scripts/r2-restore-check.ts',
    'scripts/r2-create-only-canary.ts',
  ];
  for (const file of requiredDocs) {
    add(`doc:${file}`, await exists(file) ? 'PASS' : 'FAIL', await exists(file) ? 'present' : 'missing', 'error');
  }
  const restore = await read('scripts/r2-restore-check.ts');
  add('restore:hash-and-bytes-required', restore.includes('missing a valid SHA-256') && restore.includes('missing a valid byte count') ? 'PASS' : 'FAIL', 'restore requires receipt SHA-256 and byte count before GET/write', 'error');
  add('restore:foundation-boundary', restore.includes('FOUNDATION_BUCKETS') && restore.includes('Restore is limited to Foundation buckets') ? 'PASS' : 'FAIL', 'restore rejects universal and non-Foundation buckets', 'error');
  const canary = await read('scripts/r2-create-only-canary.ts');
  add('canary:create-only-contract', canary.includes('R2ObjectConflictError') && canary.includes("EXISTS_IDENTICAL") && canary.includes('readback.sha256_match') ? 'PASS' : 'FAIL', 'live canary script covers create, idempotent retry, conflict stop, and readback', 'error');
  const inputInventory = await read('docs/architecture/R2_100_YEAR_INPUT_INVENTORY_2026-09-19.md');
  add('input:bulk-source', inputInventory.includes('6,689') && inputInventory.includes('一括PUTは未実施') ? 'NOT_VERIFIED' : 'FAIL', 'no authoritative 6,689-object manifest is available; bulk PUT remains gated', 'error');

  const wrangler = JSON.parse(await read('wrangler.jsonc'));
  const expected = new Map([
    ['FOUNDATION_R2_RAW', 'foundation-raw'],
    ['FOUNDATION_R2_LAKE', 'foundation-lake'],
    ['FOUNDATION_R2_RESTRICTED', 'foundation-restricted'],
    ['FOUNDATION_R2_PUBLIC', 'foundation-public'],
  ]);
  const buckets = Array.isArray(wrangler.r2_buckets) ? wrangler.r2_buckets : [];
  for (const [binding, bucket] of expected) {
    const found = buckets.find((item) => item?.binding === binding && item?.bucket_name === bucket);
    add(`binding:${binding}`, found ? 'PASS' : 'FAIL', found ? `${binding} -> ${bucket}` : 'missing or mismatched', 'error');
  }
  const universalTargets = buckets.filter((item) => item?.bucket_name === 'universal');
  add('boundary:no-universal-binding', universalTargets.length === 0 ? 'PASS' : 'FAIL', universalTargets.length === 0 ? 'universal is not a Worker target' : 'universal is configured as a target', 'error');

  const r2 = await read('src/lib/storage/r2.ts');
  add('write:create-only', r2.includes("IfNoneMatch: '*'") && r2.includes("etagDoesNotMatch: '*'") ? 'PASS' : 'FAIL', 'conditional create-only write guard', 'error');
  add('write:readback-hash', r2.includes('R2ReadbackVerificationError') && r2.includes('sha256_match') ? 'PASS' : 'FAIL', 'post-write byte/hash readback', 'error');
  add('write:conflict-stop', r2.includes('EXISTS_CONFLICT') && r2.includes('R2ObjectConflictError') ? 'PASS' : 'FAIL', 'different bytes at the same key stop the run', 'error');
  add('write:no-delete-copy-client', !/new (DeleteObject|CopyObject)Command/.test(r2) ? 'PASS' : 'FAIL', 'storage client has no delete/copy mutation path', 'error');

  const ingest = await read('src/lib/foundation/ingest.ts');
  add('ingest:forbidden-operations', ingest.includes("'DeleteObject'") && ingest.includes("'LegacyUniversalMutation'") ? 'PASS' : 'FAIL', 'planned-writes forbidden operation contract', 'error');
  add('ingest:zero-destructive-counts', ingest.includes('copy_object: 0') && ingest.includes('delete_object: 0') && ingest.includes('overwrite: 0') ? 'PASS' : 'FAIL', 'receipt mutation counters', 'error');
  const simpleIngest = await read('scripts/foundation-simple-ingest.ts');
  const hasCasWriter = simpleIngest.includes('blobs/sha256/');
  const hasEvidenceWriter = ingest.includes('evidence/${evidence.source_id}') || ingest.includes('evidence/');
  add('path:raw-contract', hasCasWriter && hasEvidenceWriter ? 'PASS' : 'NOT_VERIFIED', hasCasWriter && hasEvidenceWriter ? 'Normal research uses evidence-addressed Raw; the standalone artifact helper uses CAS' : hasCasWriter ? 'CAS Raw writer found, but evidence-addressed research writer is missing' : 'CAS Raw writer not found', 'error');

  const wrapper = await read('scripts/with-r2-keychain-secrets.mjs');
  add('secrets:keychain-wrapper', wrapper.includes('security') && wrapper.includes('CLOUDFLARE_R2_SECRET_ACCESS_KEY') && wrapper.includes('stdio: \'inherit\'') ? 'PASS' : 'FAIL', 'credentials are injected from Keychain without printing values', 'error');

  const oldAudit = await read('scripts/audit-r2-integrity.ts');
  add('audit:no-false-pass', !oldAudit.includes('100% PASS') && !oldAudit.includes('Under free tier') ? 'PASS' : 'FAIL', 'legacy audit must not claim unverified success or free-tier safety', 'error');

  const foundationRepo = process.env.FOUNDATION_REPO?.trim();
  let foundationRepoContract = false;
  if (foundationRepo) {
    try {
      await readFile(resolve(foundationRepo, 'registry/storage/r2-layout.v1.json'), 'utf8');
      foundationRepoContract = true;
    } catch {
      foundationRepoContract = false;
    }
  }
  add('runtime:foundation-repo', foundationRepoContract ? 'PASS' : 'NOT_VERIFIED', foundationRepoContract ? 'FOUNDATION_REPO points to a checkout with the storage registry' : foundationRepo ? 'FOUNDATION_REPO is set but the storage registry was not found' : 'FOUNDATION_REPO is not set', 'error');
  const credentialEnv = ['CLOUDFLARE_R2_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY'];
  const missingCredentials = credentialEnv.filter((key) => !process.env[key]?.trim());
  add('runtime:r2-credentials', missingCredentials.length === 0 ? 'PASS' : 'NOT_VERIFIED', missingCredentials.length === 0 ? 'R2 S3 credentials are present for this process' : `missing ${missingCredentials.join(', ')}`, 'error');

  add('external:bucket-lock', 'NOT_VERIFIED', 'Bucket Lock rules require Cloudflare control-plane inspection; this audit never treats absence of evidence as PASS', 'error');
  add('external:data-access-logs', 'NOT_VERIFIED', 'Data Access Logs require Cloudflare control-plane inspection', 'error');
  add('external:backup-restore', 'NOT_VERIFIED', 'A real restore drill and hash comparison are required', 'error');
  add('external:cost', 'NOT_VERIFIED', 'Account-wide billing and bucket attribution require current Cloudflare usage evidence', 'error');

  const counts = checks.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  const report = {
    schema_version: 'r2-100-year-audit.v1',
    observed_at: new Date().toISOString(),
    verdict: checks.some((item) => item.status === 'FAIL')
      ? 'FAIL'
      : checks.some((item) => item.status === 'NOT_VERIFIED')
        ? 'NOT_VERIFIED'
        : 'PASS',
    counts,
    checks,
  };
  console.log(JSON.stringify(report, null, 2));
  if (strict && report.verdict !== 'PASS') process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
