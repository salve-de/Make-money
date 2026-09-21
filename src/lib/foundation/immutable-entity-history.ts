type Entity = Record<string, unknown>;

/** Immutable entity seeds may retain old links, never different business facts. */
export function assertEvidenceOnlyEntityHistory(existing: Entity, incoming: Entity): void {
  if (typeof existing.entity_id !== 'string' || existing.entity_id !== incoming.entity_id) {
    throw new Error('Entity history identity mismatch');
  }
  const keys = new Set([...Object.keys(existing), ...Object.keys(incoming)]);
  for (const key of keys) {
    if (key !== 'evidence_ids' && JSON.stringify(existing[key]) !== JSON.stringify(incoming[key])) {
      throw new Error(`Entity history changes protected field: ${key}`);
    }
  }
  for (const links of [existing.evidence_ids, incoming.evidence_ids]) {
    if (!Array.isArray(links) || links.length === 0 || links.some(id => typeof id !== 'string' || !id.startsWith('ev_'))) {
      throw new Error('Entity history requires explicit evidence IDs');
    }
  }
}
