#!/usr/bin/env node
/**
 * Universal Foundation の登録簿から、Make-Money が実行時に読む commit 固定スナップショットを生成する。
 *
 *   data/foundation-public-rights-snapshot.json   (make-money-public-rights-snapshot.v1)
 *   data/foundation-public-fact-types.json        (make-money-public-fact-types-snapshot.v1)
 *
 * 使い方:
 *   node scripts/foundation/build-foundation-snapshots.mjs --uf <universal-foundation の checkout> [--commit <sha|ref>] [--check]
 *
 * 規則（2026-09-29 三層モデル。docs/RIGHTS_THREE_TIER_SPEC.md）:
 *   - Tier 1 `automatic`  : policy.status=approved かつ commercial_use=allowed かつ public_fact_display=allowed、source.status=active。
 *   - Tier 2 `facts_only` : policy.status=restricted かつ public_fact_display=restricted、commercial_use と public_display が
 *                           allowed/restricted、attribution 規則あり、source.status が active/gated。事実のみ・出典表示必須。
 *   - それ以外（blocked / metadata_only / pending_review / expired、public_fact_display=blocked 等）は載せない＝実行時は RIGHTS_HELD。
 *   - blob_sha は `git rev-parse <commit>:<path>`（内容アドレス）。push 後に GitHub API が返す sha と一致する。
 *   - ホスト範囲は登録簿 provider_url のホスト（www. を除く）を既定とし、複数ホストの提供者はこのファイルの HOST_MAP で明示する。
 *     公式サイト policy は entity_domain スコープ（束の entity.domain に束縛）で、固定ホストを持たない。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const REPOSITORY = 'salve-de/universal-foundation';
const RIGHTS_OUT = path.join(process.cwd(), 'data/foundation-public-rights-snapshot.json');
const FACTS_OUT = path.join(process.cwd(), 'data/foundation-public-fact-types.json');

/** 複数ホストを持つ提供者の明示リスト（登録簿 notes の "Hosts:" と一致させる）。 */
const HOST_MAP = {
  'src.app-stores': ['apps.apple.com', 'play.google.com'],
  'src.press-release-wires': ['prnewswire.com', 'globenewswire.com', 'businesswire.com', 'prtimes.jp'],
  'src.ebizfacts': ['ebizfacts.com', 'ebizfacts.beehiiv.com'],
  'src.x-twitter': ['x.com', 'twitter.com'],
  'src.youtube': ['youtube.com', 'youtu.be'],
  'src.hacker-news': ['news.ycombinator.com'],
  'src.wikipedia': ['wikipedia.org'],
  'src.bls-api': ['bls.gov'],
  'src.e-stat': ['e-stat.go.jp'],
  'src.sec-edgar': ['sec.gov'],
};
/** パス限定（SEC は EDGAR アーカイブ配下だけを公開事実の対象にする）。 */
const PATH_MAP = { 'src.sec-edgar': ['/Archives/edgar/'] };
/** 固定ホストを持たず、束の entity.domain に束縛される policy の source。 */
const ENTITY_BOUND_SOURCES = new Set(['src.official-company-website']);

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const ufPath = opt('uf');
const commitRef = opt('commit', 'HEAD');
const checkOnly = args.includes('--check');
if (!ufPath) {
  console.error('usage: node scripts/foundation/build-foundation-snapshots.mjs --uf <path> [--commit <sha|ref>] [--check]');
  process.exit(64);
}

const git = (...a) => execFileSync('git', ['-C', ufPath, ...a], { encoding: 'utf8' }).trim();
const commit = git('rev-parse', `${commitRef}^{commit}`);
const listJson = (dir) => git('ls-tree', '-r', '--name-only', commit, dir).split('\n').filter((f) => f.endsWith('.json'));
const readAt = (file) => JSON.parse(git('show', `${commit}:${file}`));
const blobSha = (file) => git('rev-parse', `${commit}:${file}`);
const hostOf = (url) => new URL(url).hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');

export function classifyPolicyTier(policy, source) {
  const d = policy?.decisions || {};
  if (!source || policy?.source_id !== source.source_id || !Array.isArray(source.rights_policy_ids) || !source.rights_policy_ids.includes(policy.policy_id)) return null;
  if (policy.status === 'approved' && d.commercial_use === 'allowed' && d.public_fact_display === 'allowed' && source.status === 'active') return 'automatic';
  if (
    policy.status === 'restricted' && d.public_fact_display === 'restricted' &&
    ['allowed', 'restricted'].includes(d.commercial_use) && ['allowed', 'restricted'].includes(d.public_display) &&
    typeof d.attribution === 'string' && d.attribution.trim().length > 0 &&
    (source.status === 'active' || source.status === 'gated')
  ) return 'facts_only';
  return null;
}

const sources = new Map();
for (const file of listJson('registry/sources')) {
  const source = readAt(file);
  if (source.schema_version !== 'source-registry.v1') continue;
  sources.set(source.source_id, { ...source, path: file, blob_sha: blobSha(file) });
}

const rightsRecords = [];
const skipped = [];
for (const file of listJson('registry/rights')) {
  const policy = readAt(file);
  if (policy.schema_version !== 'rights-policy.v1') continue;
  const source = sources.get(policy.source_id);
  const tier = classifyPolicyTier(policy, source);
  if (!tier) { skipped.push(`${policy.policy_id} (${policy.status}/${policy.decisions?.public_fact_display ?? '-'})`); continue; }
  const entityBound = ENTITY_BOUND_SOURCES.has(source.source_id);
  const hosts = entityBound ? [] : (HOST_MAP[source.source_id] ?? [hostOf(source.provider_url)]);
  if (!entityBound && !hosts.includes(hostOf(source.provider_url)) && !hosts.some((h) => hostOf(source.provider_url).endsWith(`.${h}`))) {
    throw new Error(`HOST_MAP for ${source.source_id} must include the provider_url host ${hostOf(source.provider_url)}`);
  }
  const d = policy.decisions;
  rightsRecords.push({
    policy: {
      policy_id: policy.policy_id,
      source_id: policy.source_id,
      status: policy.status,
      commercial_use: d.commercial_use,
      public_display: d.public_display,
      public_fact_display: d.public_fact_display,
      public_excerpt_display: d.public_excerpt_display,
      public_media_display: d.public_media_display,
      attribution: d.attribution,
      display_tier: tier,
      reviewed_at: policy.reviewed_at,
      path: file,
      blob_sha: blobSha(file),
    },
    source: {
      source_id: source.source_id,
      status: source.status,
      provider_url: source.provider_url,
      rights_policy_ids: [...source.rights_policy_ids],
      path: source.path,
      blob_sha: source.blob_sha,
      provider_name: source.provider_name,
      source_types: [...source.source_types],
    },
    host_scope: entityBound ? 'entity_domain' : 'suffix',
    allowed_host_suffixes: hosts,
    ...(PATH_MAP[source.source_id] ? { allowed_path_prefixes: [...PATH_MAP[source.source_id]] } : {}),
  });
}
rightsRecords.sort((a, b) => a.policy.policy_id.localeCompare(b.policy.policy_id));

const factRecords = [];
for (const file of listJson('registry/public-facts')) {
  const fact = readAt(file);
  if (fact.schema_version !== 'public-fact-type.v1' || fact.status !== 'approved') continue;
  factRecords.push({
    fact_type_id: fact.fact_type_id,
    status: fact.status,
    value_kind: fact.value_kind,
    allowed_scope_types: [...fact.allowed_scope_types],
    allowed_actor_relations: [...fact.allowed_actor_relations],
    display: {
      title: fact.display.title,
      relation_labels: { ...fact.display.relation_labels },
      suffix: fact.display.suffix ?? null,
    },
    ...(fact.notes ? { notes: fact.notes } : {}),
    path: file,
    blob_sha: blobSha(file),
  });
}
factRecords.sort((a, b) => a.fact_type_id.localeCompare(b.fact_type_id));

const generatedAt = new Date().toISOString();
const rightsSnapshot = {
  schema_version: 'make-money-public-rights-snapshot.v1',
  source_repository: REPOSITORY,
  source_commit_sha: commit,
  generated_at: generatedAt,
  notes: 'Tier 1 (display_tier=automatic) and Tier 2 (display_tier=facts_only) source policies pinned from Universal Foundation. Tier 2 admits independently worded facts only, with provider name, canonical URL and date shown; never prose, excerpts, screenshots or media. Policies absent from this file are RIGHTS_HELD at runtime.',
  records: rightsRecords,
};
const factSnapshot = {
  schema_version: 'make-money-public-fact-types-snapshot.v1',
  source_repository: REPOSITORY,
  source_commit_sha: commit,
  generated_at: generatedAt,
  notes: 'Runtime-approved Public Fact types pinned from Universal Foundation. Fact-type approval does not grant publication rights; evidence remains subject to the independent rights snapshot and publication gate.',
  records: factRecords,
};

const stripGenerated = (value) => JSON.stringify({ ...value, generated_at: null }, null, 2);
if (checkOnly) {
  const drift = [];
  for (const [file, next] of [[RIGHTS_OUT, rightsSnapshot], [FACTS_OUT, factSnapshot]]) {
    const current = JSON.parse(readFileSync(file, 'utf8'));
    if (stripGenerated(current) !== stripGenerated(next)) drift.push(path.relative(process.cwd(), file));
  }
  if (drift.length) { console.error(`snapshot drift against ${REPOSITORY}@${commit}: ${drift.join(', ')}`); process.exit(1); }
  console.log(`snapshots match ${REPOSITORY}@${commit}`);
} else {
  writeFileSync(RIGHTS_OUT, `${JSON.stringify(rightsSnapshot, null, 2)}\n`);
  writeFileSync(FACTS_OUT, `${JSON.stringify(factSnapshot, null, 2)}\n`);
  console.log(JSON.stringify({
    commit,
    rights: { automatic: rightsRecords.filter((r) => r.policy.display_tier === 'automatic').length, facts_only: rightsRecords.filter((r) => r.policy.display_tier === 'facts_only').length, skipped },
    fact_types: factRecords.map((r) => r.fact_type_id),
  }, null, 2));
}
