/** Legal suffixes are whole tokens; never delete letters such as i/n/c/l from the business name. */
export function normalizeEntityName(value) {
  let name = String(value ?? '').normalize('NFKC').toLowerCase().trim();
  name = name.replace(/^(株式会社|有限会社|合同会社)\s*/, '').replace(/\s*(株式会社|有限会社|合同会社)$/, '');
  let previous;
  do {
    previous = name;
    name = name.replace(/(?:^|[\s,])(?:incorporated|corporation|inc|corp|llc|ltd|limited|co|plc|gmbh)\.?\s*$/i, '').trim();
  } while (name !== previous);
  return name.replace(/[\s\-_・（）().,]/g, '');
}
export function entityDomain(value) {
  const raw = String(value ?? '').trim();
  if (!raw || /\s/.test(raw)) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) return '';
    return url.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  } catch { return ''; }
}
/** Update is explicit and keeps the existing entity ID. Name-only matches need review. */
export function identifyEntity(input, registry, intent = 'create') {
  const id = String(input.id ?? '').trim();
  const domain = entityDomain(input.domain || input.url);
  const byId = id && registry.find((record) => record.id === id);
  if (byId) {
    const oldDomain = entityDomain(byId.domain || byId.url);
    if (oldDomain && domain && oldDomain !== domain) return { status: 'IDENTITY_CONFLICT', matchType: 'ID_DOMAIN_CONFLICT', matchedEntity: byId };
    return { status: intent === 'update' ? 'UPDATE' : 'EXISTS', matchType: 'ENTITY_ID', matchedEntity: byId, targetEntityId: byId.id };
  }
  const matches = domain ? registry.filter((record) => entityDomain(record.domain || record.url) === domain) : [];
  if (matches.length > 1) return { status: 'POSSIBLE_DUPLICATE', matchType: 'AMBIGUOUS_DOMAIN', matchedEntity: matches[0] };
  if (matches.length === 1) {
    const target = matches[0];
    return { status: intent === 'update' && !id ? 'UPDATE' : 'EXISTS', matchType: 'DOMAIN_MATCH', matchedEntity: target, targetEntityId: target.id };
  }
  const name = normalizeEntityName(input.name);
  const byName = name && registry.find((record) => normalizeEntityName(record.name) === name);
  if (byName) return { status: 'POSSIBLE_DUPLICATE', matchType: 'EXACT_NAME', matchedEntity: byName };
  return { status: 'AVAILABLE', matchType: 'NONE' };
}
