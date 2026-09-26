#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const TARGET_RUN = 'run_handoff_c9e926361e9472f5085323dc727be7ff';
const TARGET_BLOB = 'c808a3352de85880f31c3ff647e394127d0aca10';
const TARGET_PATH = 'staging/r2-queue/candidates/v2/649614315bd75857b6421d3139eafd1f2d0d6fd4/starwood-sreit-apollo-affordable-housing-jv-liquidity-recapitalization-2026-coverage-repair-r2-queue-mapper-v4.json';
const OBSERVED_AT = '2026-09-25T04:42:00Z';
const SOURCE_RUN = 'run_verify_canary_starwood_20260925044005';
const PERSIST = '/tmp/make-money-c9e-local-e2e';
const MAKE_MONEY_ORIGIN = process.env.FOUNDATION_LOCAL_E2E_ORIGIN || 'http://127.0.0.1:3211';
const PUBLISHER_ORIGIN = process.env.FOUNDATION_LOCAL_PUBLISHER_ORIGIN || 'http://127.0.0.1:3212';
const CANDIDATE_PREFIX = 'staging/r2-queue/candidates/v2/';
const ROTATION_INTERVAL_MS = 5 * 60 * 1000;
const BASE_TIME_MS = Date.parse('2026-09-26T00:00:00Z');
const CRON = '50 23,5,11 * * *';
const CANONICAL_KEY =
  'datasets/ds.business.research-bundles.derived/v1/2026/09/25/' +
  TARGET_RUN + '.json';
const R2_OBJECT = 'foundation-lake-local-e2e/' + CANONICAL_KEY;

const entities = [
  {
    id: 'ent_org_4a819d424adf6b2a118f',
    percent: 41.5,
  },
  {
    id: 'ent_org_0e1d9b556075d9fc7f36',
    percent: 58.5,
  },
];

const forbiddenPublicStrings = [
  'rights.sec-edgar-public-facts.v1',
  'transport_typed_record_set_v1',
  'transport_typed_observation_v1',
  'exact_apollo_investing_entities',
  'exact_joint_venture_legal_name',
  'exact_jv_legal_name',
];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function githubJson(path) {
  const response = await fetch('https://api.github.com' + path, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'make-money-c9e-local-proof',
      'x-github-api-version': '2022-11-28',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function discoverNormalScheduledTime() {
  const branch = await githubJson(
    '/repos/salve-de/universal-foundation/branches/automation-research',
  );
  const treeSha = branch?.commit?.commit?.tree?.sha;
  assert.match(treeSha || '', /^[a-f0-9]{40}$/);

  const tree = await githubJson(
    `/repos/salve-de/universal-foundation/git/trees/${treeSha}?recursive=1`,
  );
  assert.equal(tree.truncated, false, 'candidate tree must not be truncated');

  const files = (tree.tree || [])
    .filter((item) =>
      item?.type === 'blob' &&
      typeof item.path === 'string' &&
      item.path.startsWith(CANDIDATE_PREFIX) &&
      item.path.endsWith('.json') &&
      typeof item.sha === 'string'
    )
    .map((item) => ({ path: item.path, sha: item.sha }))
    .sort((left, right) => right.path.localeCompare(left.path));

  const targetIndex = files.findIndex((file) => file.sha === TARGET_BLOB);
  assert.ok(targetIndex >= 0, 'exact c9e candidate blob must exist in the public queue');

  const baseCycle = Math.floor(BASE_TIME_MS / ROTATION_INTERVAL_MS);
  const delta =
    (targetIndex - (baseCycle % files.length) + files.length) % files.length;
  const scheduledTime = (baseCycle + delta) * ROTATION_INTERVAL_MS;
  const selectedIndex =
    Math.floor(scheduledTime / ROTATION_INTERVAL_MS) % files.length;

  assert.equal(selectedIndex, targetIndex);
  assert.equal(files[selectedIndex].sha, TARGET_BLOB);
  assert.equal(files[selectedIndex].path, TARGET_PATH, 'c9e candidate path/blob pairing changed');

  return {
    sourceCommitSha: branch.commit.sha,
    treeSha,
    candidateCount: files.length,
    targetIndex,
    targetPath: files[targetIndex].path,
    scheduledTime,
    scheduledIso: new Date(scheduledTime).toISOString(),
  };
}

async function assertSelectionStable(expected) {
  const current = await discoverNormalScheduledTime();
  assert.equal(current.sourceCommitSha, expected.sourceCommitSha, 'automation-research moved during proof');
  assert.equal(current.treeSha, expected.treeSha, 'candidate tree changed during proof');
  assert.equal(current.candidateCount, expected.candidateCount, 'candidate count changed during proof');
  assert.equal(current.targetIndex, expected.targetIndex, 'c9e candidate rotation index changed during proof');
  assert.equal(current.targetPath, expected.targetPath, 'c9e candidate path changed during proof');
}

function localR2Get(outputPath, allowMissing = false) {
  rmSync(outputPath, { force: true });
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'wrangler',
      'r2',
      'object',
      'get',
      R2_OBJECT,
      '--local',
      '--persist-to',
      PERSIST,
      '--file',
      outputPath,
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    if (allowMissing) return null;
    throw new Error(
      ['local R2 read failed', result.stdout, result.stderr].filter(Boolean).join('\n'),
    );
  }

  const bytes = readFileSync(outputPath);
  return {
    bytes,
    hash: sha256(bytes),
    json: JSON.parse(bytes.toString('utf8')),
  };
}

async function triggerScheduled(scheduledTime) {
  const url = new URL('/cdn-cgi/local/scheduled', PUBLISHER_ORIGIN);
  url.searchParams.set('cron', CRON);
  url.searchParams.set('time', String(scheduledTime));
  url.searchParams.set('format', 'json');
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`scheduled trigger ${response.status}: ${text}`);
  }
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (body && typeof body === 'object' && 'outcome' in body) {
    assert.equal(body.outcome, 'ok', `scheduled handler outcome was not ok: ${text}`);
  }
  return { status: response.status, body, url: String(url) };
}

async function fetchDetail(entityId) {
  const url = new URL('/api/businesses', MAKE_MONEY_ORIGIN);
  url.searchParams.set('foundationOnly', 'true');
  url.searchParams.set('entity_id', entityId);
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`detail ${entityId} ${response.status}: ${text.slice(0, 1000)}`);
  }
  return JSON.parse(text);
}

function publicFactFingerprint(payload) {
  const observations = Array.isArray(payload?.data?.observations)
    ? payload.data.observations
    : [];
  const publicFacts = observations.filter((observation) => observation?.kind === 'public_fact.v1');
  assert.ok(publicFacts.length > 0, 'public_fact.v1 must reach the API');
  const ids = publicFacts.map((observation) => observation.id);
  assert.equal(new Set(ids).size, ids.length, 'public_fact.v1 IDs must be unique');
  return {
    count: publicFacts.length,
    ids: [...ids].sort(),
    serialized: JSON.stringify(publicFacts),
  };
}

function assertPublicSafe(payload, expectedPercent) {
  assert.equal(payload?.source, 'foundation_lake');
  const serialized = JSON.stringify(payload);
  assert.ok(serialized.includes(String(expectedPercent)));
  assert.ok(serialized.includes('U.S. Securities and Exchange Commission'));
  assert.ok(serialized.includes('https://www.sec.gov/Archives/edgar/data/1711929/'));
  assert.ok(serialized.includes('"commercialUse":"allowed"'));
  assert.ok(serialized.includes('"publicFactDisplay":"allowed"'));
  assert.ok(serialized.includes('"projectionMode":"fact_only"'));
  assert.ok(serialized.includes('"sourceContentPublicDisplay":"restricted"'));
  assert.ok(serialized.includes('"sourceContentRedistribution":"restricted"'));
  assert.ok(serialized.includes('"publicExcerptDisplay":"restricted"'));
  assert.ok(serialized.includes('"publicMediaDisplay":"blocked"'));
  for (const forbidden of forbiddenPublicStrings) {
    assert.equal(
      serialized.includes(forbidden),
      false,
      `public API leaked private field: ${forbidden}`,
    );
  }
}

function assertCanonicalPrivate(canonical) {
  assert.equal(canonical.json.run_id, TARGET_RUN);
  assert.equal(canonical.json.retrieved_at, OBSERVED_AT);
  const text = canonical.bytes.toString('utf8');
  assert.ok(text.includes(SOURCE_RUN));
  assert.ok(text.includes('rights.sec-edgar-public-facts.v1'));
  assert.ok(text.includes('transport_typed_record_set_v1'));
  assert.ok(text.includes('exact_apollo_investing_entities'));
  assert.ok(text.includes('exact_jv_legal_name'));
  assert.ok(text.includes('41.5'));
  assert.ok(text.includes('58.5'));
  assert.ok(text.includes('https://www.sec.gov/Archives/edgar/data/1711929/'));
}

async function waitForPublicApi(timeoutMs = 60_000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const result = [];
      for (const target of entities) {
        const payload = await fetchDetail(target.id);
        assertPublicSafe(payload, target.percent);
        result.push({
          ...target,
          payload,
          fingerprint: publicFactFingerprint(payload),
        });
      }
      return result;
    } catch (error) {
      lastError = error;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    }
  }
  throw lastError || new Error('public API did not become ready');
}

async function waitForCanonical(outputPath, timeoutMs = 60_000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = localR2Get(outputPath, false);
      assertCanonicalPrivate(value);
      return value;
    } catch (error) {
      lastError = error;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    }
  }
  throw lastError || new Error('canonical local R2 object did not become ready');
}

async function main() {
  const preexisting = localR2Get('/tmp/c9e-preexisting.json', true);
  assert.equal(
    preexisting,
    null,
    'c9e canonical already exists. Stop local workers, run pnpm foundation:local-e2e:reset, restart both workers, then rerun this proof.',
  );

  const selection = await discoverNormalScheduledTime();
  const firstTrigger = await triggerScheduled(selection.scheduledTime);
  const firstCanonical = await waitForCanonical('/tmp/c9e-canonical-first.json');
  const firstApi = await waitForPublicApi();
  await assertSelectionStable(selection);

  const secondTrigger = await triggerScheduled(selection.scheduledTime);
  const secondCanonical = await waitForCanonical('/tmp/c9e-canonical-second.json');
  const secondApi = await waitForPublicApi();
  await assertSelectionStable(selection);

  assert.equal(
    secondCanonical.hash,
    firstCanonical.hash,
    'canonical bytes changed after replaying the same scheduled event',
  );
  assert.equal(
    secondCanonical.bytes.equals(firstCanonical.bytes),
    true,
    'canonical object was overwritten after replay',
  );

  for (let index = 0; index < firstApi.length; index += 1) {
    assert.deepEqual(
      secondApi[index].fingerprint.ids,
      firstApi[index].fingerprint.ids,
      'public_fact observation IDs changed after replay',
    );
    assert.equal(
      secondApi[index].fingerprint.count,
      firstApi[index].fingerprint.count,
      'public_fact count changed after replay',
    );
    assert.equal(
      secondApi[index].fingerprint.serialized,
      firstApi[index].fingerprint.serialized,
      'public_fact payload changed after replay',
    );
  }

  console.log(JSON.stringify({
    status: 'PASS_C9E_LOCAL_E2E_API_R2_IDEMPOTENCY',
    exact_candidate: {
      run_id: TARGET_RUN,
      candidate_blob_sha: TARGET_BLOB,
      observed_at: OBSERVED_AT,
      source_run_id: SOURCE_RUN,
      source_commit_sha: selection.sourceCommitSha,
      tree_sha: selection.treeSha,
      candidate_count: selection.candidateCount,
      target_index_zero_based: selection.targetIndex,
      target_path: selection.targetPath,
    },
    scheduled_event: {
      cron: CRON,
      scheduled_time_ms: selection.scheduledTime,
      scheduled_time_iso: selection.scheduledIso,
      first_trigger: firstTrigger,
      second_trigger: secondTrigger,
    },
    canonical: {
      key: CANONICAL_KEY,
      sha256_first: firstCanonical.hash,
      sha256_second: secondCanonical.hash,
      bytes: firstCanonical.bytes.byteLength,
      unchanged_after_replay: true,
    },
    api: firstApi.map((item, index) => ({
      entity_id: item.id,
      expected_percent: item.percent,
      public_fact_count_first: item.fingerprint.count,
      public_fact_count_second: secondApi[index].fingerprint.count,
      public_fact_ids: item.fingerprint.ids,
      unchanged_after_replay: true,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
