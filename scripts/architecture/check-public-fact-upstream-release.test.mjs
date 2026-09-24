import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { publicFactUpstreamReleaseErrors } from './check-public-fact-upstream-release.mjs';

const credential = { token: 'test-secret-token', source: 'test' };

function response(body, ok = true, status = 200) {
  return { ok, status, async json() { return body; } };
}

test('accepts an empty runtime snapshot only when its source commit is on upstream main', async () => {
  const snapshot = {
    source_repository: 'salve-de/universal-foundation',
    source_commit_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    records: [],
  };
  const errors = await publicFactUpstreamReleaseErrors({
    snapshot,
    credential,
    fetchImpl: async () => response({ status: 'ahead' }),
  });
  assert.deepEqual(errors, []);
});

test('blocks a Public Fact snapshot pinned to an unmerged Draft commit', async () => {
  const snapshot = {
    source_repository: 'salve-de/universal-foundation',
    source_commit_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    records: [],
  };
  const errors = await publicFactUpstreamReleaseErrors({
    snapshot,
    credential,
    fetchImpl: async () => response({ status: 'diverged' }),
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /not confirmed on .* main/);
});

test('checks exact approved fact-type blob identity', async () => {
  const snapshot = {
    source_repository: 'salve-de/universal-foundation',
    source_commit_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    records: [{
      fact_type_id: 'fact.ownership_interest_percent.v1',
      status: 'approved',
      path: 'registry/public-facts/fact.ownership-interest-percent.v1.json',
      blob_sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    }],
  };
  const errors = await publicFactUpstreamReleaseErrors({
    snapshot,
    credential,
    fetchImpl: async (url) => {
      if (String(url).includes('/compare/')) return response({ status: 'identical' });
      return response({ sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' });
    },
  });
  assert.deepEqual(errors, []);
});

test('fails closed for draft or malformed runtime fact-type entries', async () => {
  const snapshot = {
    source_repository: 'salve-de/universal-foundation',
    source_commit_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    records: [{
      fact_type_id: 'fact.ownership_interest_percent.v1',
      status: 'draft',
      path: 'registry/public-facts/fact.ownership-interest-percent.v1.json',
      blob_sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    }],
  };
  const errors = await publicFactUpstreamReleaseErrors({
    snapshot,
    credential,
    fetchImpl: async () => response({ status: 'identical' }),
  });
  assert.ok(errors.some((error) => /non-approved or malformed/.test(error)));
});

test('fails closed before network access when no GitHub authentication is available', async () => {
  let fetched = false;
  const errors = await publicFactUpstreamReleaseErrors({
    snapshot: {
      source_repository: 'salve-de/universal-foundation',
      source_commit_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      records: [],
    },
    environment: {},
    execFileSyncImpl: () => {
      throw new Error('not authenticated');
    },
    fetchImpl: async () => {
      fetched = true;
      return response({}, false, 404);
    },
  });
  assert.equal(fetched, false);
  assert.match(errors[0], /GitHub authentication is required/);
});
