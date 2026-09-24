import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  acceptedUpstreamCompareStatus,
  resolveGitHubToken,
  rightsUpstreamReleaseErrors,
} from './check-rights-upstream-release.mjs';

const snapshot = {
  source_repository: 'salve-de/universal-foundation',
  source_commit_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  records: [{
    policy: { path: 'registry/rights/policy.test.json', blob_sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    source: { path: 'registry/sources/source.test.json', blob_sha: 'cccccccccccccccccccccccccccccccccccccccc' },
  }],
};

function response(body, ok = true, status = 200) {
  return { ok, status, async json() { return body; } };
}

const credential = { token: 'test-secret-token', source: 'test' };

test('accepts only an upstream main commit that is identical or an ancestor of main', () => {
  assert.equal(acceptedUpstreamCompareStatus('identical'), true);
  assert.equal(acceptedUpstreamCompareStatus('ahead'), true);
  assert.equal(acceptedUpstreamCompareStatus('behind'), false);
  assert.equal(acceptedUpstreamCompareStatus('diverged'), false);
});

test('prefers GITHUB_TOKEN, then GH_TOKEN, without invoking gh', () => {
  let executions = 0;
  const github = resolveGitHubToken({
    environment: { GITHUB_TOKEN: ' github-token ', GH_TOKEN: 'gh-token' },
    execFileSyncImpl: () => {
      executions += 1;
      throw new Error('must not run');
    },
  });
  assert.deepEqual(github, { token: 'github-token', source: 'GITHUB_TOKEN' });

  const gh = resolveGitHubToken({
    environment: { GH_TOKEN: ' gh-token ' },
    execFileSyncImpl: () => {
      executions += 1;
      throw new Error('must not run');
    },
  });
  assert.deepEqual(gh, { token: 'gh-token', source: 'GH_TOKEN' });
  assert.equal(executions, 0);
});

test('falls back to existing gh CLI authentication without logging or reformatting the token', () => {
  let call = null;
  const resolved = resolveGitHubToken({
    environment: {},
    execFileSyncImpl: (command, args, options) => {
      call = { command, args, options };
      return 'gh-keyring-token\n';
    },
  });

  assert.deepEqual(resolved, { token: 'gh-keyring-token', source: 'gh_auth' });
  assert.equal(call.command, 'gh');
  assert.deepEqual(call.args, ['auth', 'token', '--hostname', 'github.com']);
  assert.deepEqual(call.options.stdio, ['ignore', 'pipe', 'ignore']);
});

test('fails closed with a clear message when no environment or gh authentication is available', async () => {
  let fetched = false;
  const errors = await rightsUpstreamReleaseErrors({
    snapshot,
    environment: {},
    execFileSyncImpl: () => {
      throw new Error('gh unavailable or unauthenticated');
    },
    fetchImpl: async () => {
      fetched = true;
      return response({}, false, 404);
    },
  });

  assert.equal(fetched, false);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /GitHub authentication is required/);
  assert.match(errors[0], /GITHUB_TOKEN\/GH_TOKEN/);
  assert.match(errors[0], /gh auth login/);
});

test('never includes the resolved token in an upstream HTTP failure', async () => {
  const secret = 'super-secret-never-log-this';
  const errors = await rightsUpstreamReleaseErrors({
    snapshot,
    credential: { token: secret, source: 'GH_TOKEN' },
    fetchImpl: async () => response({}, false, 404),
  });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /HTTP 404/);
  assert.match(errors[0], /authenticated via GH_TOKEN/);
  assert.equal(errors[0].includes(secret), false);
});

test('blocks a draft/side-branch rights snapshot commit', async () => {
  const errors = await rightsUpstreamReleaseErrors({
    snapshot,
    credential,
    fetchImpl: async () => response({ status: 'diverged' }),
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /not confirmed on .* main/);
});

test('checks exact upstream registry blob identities after commit ancestry passes', async () => {
  const calls = [];
  const errors = await rightsUpstreamReleaseErrors({
    snapshot,
    credential,
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), authorization: options?.headers?.Authorization });
      if (String(url).includes('/compare/')) return response({ status: 'ahead' });
      if (String(url).includes('policy.test.json')) return response({ sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' });
      if (String(url).includes('source.test.json')) return response({ sha: 'cccccccccccccccccccccccccccccccccccccccc' });
      return response({}, false, 404);
    },
  });
  assert.deepEqual(errors, []);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.authorization === 'Bearer test-secret-token'));
});

test('fails closed on registry blob mismatch', async () => {
  const errors = await rightsUpstreamReleaseErrors({
    snapshot,
    credential,
    fetchImpl: async (url) => {
      if (String(url).includes('/compare/')) return response({ status: 'identical' });
      return response({ sha: 'dddddddddddddddddddddddddddddddddddddddd' });
    },
  });
  assert.ok(errors.some((error) => /blob mismatch/.test(error)));
});
