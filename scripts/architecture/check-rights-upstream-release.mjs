import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SNAPSHOT_PATH = path.join(process.cwd(), 'data/foundation-public-rights-snapshot.json');

export function acceptedUpstreamCompareStatus(status) {
  return status === 'ahead' || status === 'identical';
}

export function resolveGitHubToken(options = {}) {
  const environment = options.environment || process.env;
  const envToken = environment.GITHUB_TOKEN?.trim() || environment.GH_TOKEN?.trim();
  if (envToken) return { token: envToken, source: environment.GITHUB_TOKEN?.trim() ? 'GITHUB_TOKEN' : 'GH_TOKEN' };

  const execFile = options.execFileSyncImpl || execFileSync;
  try {
    const token = String(execFile(
      'gh',
      ['auth', 'token', '--hostname', 'github.com'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        env: environment,
      },
    ) || '').trim();
    return token ? { token, source: 'gh_auth' } : null;
  } catch {
    return null;
  }
}

function decodeGitHubFile(body, label) {
  if (!body || body.encoding !== 'base64' || typeof body.content !== 'string') {
    throw new Error(`${label} is not a base64 GitHub file`);
  }
  return JSON.parse(
    Buffer.from(body.content.replace(/\s/g, ''), 'base64').toString('utf8')
  );
}

function compareSnapshotPolicyMetadata(snapshotPolicy, upstreamPolicy) {
  const errors = [];
  const expected = {
    reviewed_at: upstreamPolicy?.reviewed_at,
    public_display: upstreamPolicy?.decisions?.public_display,
    redistribution: upstreamPolicy?.decisions?.redistribution,
    public_excerpt_display: upstreamPolicy?.decisions?.public_excerpt_display,
    public_media_display: upstreamPolicy?.decisions?.public_media_display,
    attribution: upstreamPolicy?.decisions?.attribution,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (snapshotPolicy?.[field] !== value) {
      errors.push(`policy public-rights metadata mismatch: ${snapshotPolicy?.path || 'unknown'} field=${field}`);
    }
  }
  return errors;
}

function compareSnapshotSourceMetadata(snapshotSource, upstreamSource) {
  const errors = [];
  const scalarFields = ['source_id', 'provider_name', 'provider_url', 'status'];
  for (const field of scalarFields) {
    if (snapshotSource?.[field] !== upstreamSource?.[field]) {
      errors.push(`source metadata mismatch: ${snapshotSource?.path || 'unknown'} field=${field}`);
    }
  }
  for (const field of ['source_types', 'rights_policy_ids']) {
    const left = Array.isArray(snapshotSource?.[field]) ? [...snapshotSource[field]].sort() : [];
    const right = Array.isArray(upstreamSource?.[field]) ? [...upstreamSource[field]].sort() : [];
    if (JSON.stringify(left) !== JSON.stringify(right)) {
      errors.push(`source metadata mismatch: ${snapshotSource?.path || 'unknown'} field=${field}`);
    }
  }
  return errors;
}

export async function rightsUpstreamReleaseErrors(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const snapshot = options.snapshot || JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
  const branch = options.branch || 'main';
  const errors = [];
  if (!snapshot?.source_repository || !/^[a-f0-9]{40}$/.test(snapshot?.source_commit_sha || '')) {
    return ['public rights snapshot must contain source_repository and a 40-char source_commit_sha'];
  }
  if (typeof fetchImpl !== 'function') return ['fetch is unavailable for upstream rights release verification'];

  const [owner, name] = snapshot.source_repository.split('/');
  if (!owner || !name) return ['public rights snapshot source_repository is invalid'];

  const credential = options.credential || resolveGitHubToken({
    environment: options.environment,
    execFileSyncImpl: options.execFileSyncImpl,
  });
  if (!credential?.token) {
    return [
      'GitHub authentication is required to verify the private upstream rights repository; set GITHUB_TOKEN/GH_TOKEN or authenticate gh CLI with "gh auth login"',
    ];
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${credential.token}`,
  };

  const compareUrl = `https://api.github.com/repos/${owner}/${name}/compare/${snapshot.source_commit_sha}...${encodeURIComponent(branch)}`;
  let compare;
  try {
    const response = await fetchImpl(compareUrl, { headers });
    if (!response.ok) {
      return [
        `cannot verify rights snapshot against upstream ${branch}: HTTP ${response.status} (authenticated via ${credential.source || 'provided credential'})`,
      ];
    }
    compare = await response.json();
  } catch (error) {
    return [
      `cannot verify rights snapshot against upstream ${branch}: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }

  if (!acceptedUpstreamCompareStatus(compare?.status)) {
    errors.push(
      `rights snapshot commit ${snapshot.source_commit_sha} is not confirmed on ${snapshot.source_repository} ${branch} (compare status: ${compare?.status || 'unknown'})`,
    );
    return errors;
  }

  for (const record of snapshot.records || []) {
    for (const [kind, entry] of [['policy', record?.policy], ['source', record?.source]]) {
      if (!entry?.path || !/^[a-f0-9]{40}$/.test(entry?.blob_sha || '')) {
        errors.push('rights snapshot record is missing a path or blob_sha');
        continue;
      }
      const url = `https://api.github.com/repos/${owner}/${name}/contents/${entry.path.split('/').map(encodeURIComponent).join('/')}?ref=${snapshot.source_commit_sha}`;
      try {
        const response = await fetchImpl(url, { headers });
        if (!response.ok) {
          errors.push(`cannot verify upstream rights blob ${entry.path}: HTTP ${response.status}`);
          continue;
        }
        const body = await response.json();
        if (body?.sha !== entry.blob_sha) {
          errors.push(`upstream rights blob mismatch for ${entry.path}`);
          continue;
        }

        let upstream;
        try {
          upstream = decodeGitHubFile(body, entry.path);
        } catch (error) {
          errors.push(`cannot decode upstream rights blob ${entry.path}: ${error instanceof Error ? error.message : String(error)}`);
          continue;
        }

        if (kind === 'policy') {
          errors.push(...compareSnapshotPolicyMetadata(entry, upstream));
        } else {
          errors.push(...compareSnapshotSourceMetadata(entry, upstream));
        }
      } catch (error) {
        errors.push(`cannot verify upstream rights blob ${entry.path}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return errors;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const errors = await rightsUpstreamReleaseErrors();
  if (errors.length) {
    console.error(['Rights upstream release gate failed:', ...errors].join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Rights upstream release gate passed.');
  }
}
