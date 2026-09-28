// Resolve only already-approved, commit-pinned source contracts. This does not
// verify claims, grant raw retention, or approve a new publisher.
export function resolveApprovedSource(url, snapshot) {
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
  const matches = (snapshot.records ?? []).filter(({policy:p,source:s,allowed_host_suffixes:hosts,allowed_path_prefixes:paths}) => {
    if (!p || !s || p.status !== 'approved' || p.commercial_use !== 'allowed' ||
        p.public_fact_display !== 'allowed' || s.status !== 'active' ||
        p.source_id !== s.source_id || !s.rights_policy_ids?.includes(p.policy_id) ||
        !/^[a-f0-9]{40}$/.test(p.blob_sha ?? '') || !/^[a-f0-9]{40}$/.test(s.blob_sha ?? '') ||
        s.source_types?.length !== 1) return false;
    return hosts?.some(host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)) &&
      (!paths?.length || paths.some(path => parsed.pathname.startsWith(path)));
  });
  if (!/^[a-f0-9]{40}$/.test(snapshot.source_commit_sha ?? '') || matches.length !== 1) return null;
  return matches[0];
}

export function bindApprovedSources(input, snapshot) {
  const request = structuredClone(input);
  const changes = [];
  for (const evidence of request.bundle.evidence) {
    if (evidence.rights_status !== 'pending_review' || evidence.rights_policy_id) continue;
    const match = resolveApprovedSource(evidence.source_url, snapshot);
    if (!match) continue;
    const {source,policy} = match;
    const existing = request.bundle.sources.find(s => s.source_id === source.source_id);
    if (existing && (existing.rights_policy_id !== policy.policy_id || existing.source_type !== source.source_types[0])) continue;
    if (!existing) request.bundle.sources.push({
      source_id:source.source_id, provider_name:source.provider_name,
      source_type:source.source_types[0], canonical_url:source.provider_url,
      source_strength:'UNRATED', rights_status:'metadata_only', rights_policy_id:policy.policy_id,
      access_notes:'Existing approved public-fact contract matched by host/path. No raw capture authorization inferred.'
    });
    changes.push({evidence_id:evidence.evidence_id,previous_source_id:evidence.source_id,
      source_id:source.source_id,policy_id:policy.policy_id,source_commit_sha:snapshot.source_commit_sha});
    evidence.source_id = source.source_id;
    evidence.source_type = source.source_types[0];
    evidence.rights_policy_id = policy.policy_id;
    evidence.rights_status = 'metadata_only';
  }
  request.write_authorized = false;
  return {request,changes};
}
