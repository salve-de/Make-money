import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  acceptedUpstreamCompareStatus,
  resolveGitHubToken,
} from './check-rights-upstream-release.mjs';

const SNAPSHOT_PATH = path.join(process.cwd(), 'data/foundation-public-fact-types.json');

export async function publicFactUpstreamReleaseErrors(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const snapshot = options.snapshot || JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
  const branch = options.branch || 'main';
  if (!snapshot?.source_repository || !/^[a-f0-9]{40}$/.test(snapshot?.source_commit_sha || '')) {
    return ['public fact type snapshot must contain source_repository and a 40-char source_commit_sha'];
  }
  if (typeof fetchImpl !== 'function') return ['fetch is unavailable for upstream public fact verification'];

  const [owner, name] = snapshot.source_repository.split('/');
  if (!owner || !name) return ['public fact type snapshot source_repository is invalid'];

  const credential = options.credential || resolveGitHubToken({
    environment: options.environment,
    execFileSyncImpl: options.execFileSyncImpl,
  });
  if (!credential?.token) {
    return [
      'GitHub authentication is required to verify the private upstream public fact registry; set GITHUB_TOKEN/GH_TOKEN or authenticate gh CLI with "gh auth login"',
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
        `cannot verify public fact snapshot against upstream ${branch}: HTTP ${response.status} (authenticated via ${credential.source || 'provided credential'})`,
      ];
    }
    compare = await response.json();
  } catch (error) {
    return [
      `cannot verify public fact snapshot against upstream ${branch}: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
  if (!acceptedUpstreamCompareStatus(compare?.status)) {
    return [
      `public fact snapshot commit ${snapshot.source_commit_sha} is not confirmed on ${snapshot.source_repository} ${branch} (compare status: ${compare?.status || 'unknown'})`,
    ];
  }

  const errors = [];
  for (const record of snapshot.records || []) {
    if (
      record?.status !== 'approved' ||
      typeof record?.fact_type_id !== 'string' ||
      typeof record?.path !== 'string' ||
      !/^[a-f0-9]{40}$/.test(record?.blob_sha || '')
    ) {
      errors.push('public fact type snapshot contains a non-approved or malformed runtime record');
      continue;
    }
    const url = `https://api.github.com/repos/${owner}/${name}/contents/${record.path.split('/').map(encodeURIComponent).join('/')}?ref=${snapshot.source_commit_sha}`;
    try {
      const response = await fetchImpl(url, { headers });
      if (!response.ok) {
        errors.push(`cannot verify upstream public fact type ${record.path}: HTTP ${response.status}`);
        continue;
      }
      const body = await response.json();
      if (body?.sha !== record.blob_sha) {
        errors.push(`upstream public fact type blob mismatch for ${record.path}`);
      }
    } catch (error) {
      errors.push(`cannot verify upstream public fact type ${record.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return errors;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const errors = await publicFactUpstreamReleaseErrors();
  if (errors.length) {
    console.error(['Public Fact upstream release gate failed:', ...errors].join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Public Fact upstream release gate passed.');
  }
}
