/** Intake is permissive; DEEP completion requires a separately reviewable source inventory. */
type Row = Record<string, unknown>;
const object = (x: unknown): x is Row => !!x && typeof x === 'object' && !Array.isArray(x);
const nonempty = (x: unknown): x is string => typeof x === 'string' && !!x.trim();
const rows = (x: unknown): Row[] => Array.isArray(x) ? x.filter(object) : [];

function pointer(root: unknown, path: unknown): unknown {
  if (!nonempty(path) || !path.startsWith('/')) return undefined;
  return path.slice(1).split('/').reduce<unknown>((value, key) => {
    key = key.replace(/~1/g, '/').replace(/~0/g, '~');
    return value && typeof value === 'object' && Object.hasOwn(value, key)
      ? (value as Row)[key] : undefined;
  }, root);
}

export function reconcileCollection(bundle: Row, required: readonly string[], sourceResearchFields: readonly string[] = []) {
  const gaps: string[] = [];
  const audits = rows(bundle.observations).filter(x => x.kind === 'collection_audit.v1' || x.kind === 'collection_audit.v2');
  if (audits.length !== 1) {
    return { status: 'REVIEW_REQUIRED' as const, gaps: ['Exactly one collection_audit.v1 or collection_audit.v2 inventory required for DEEP reconciliation'] };
  }
  const audit = audits[0];
  if (audit.kind === 'collection_audit.v2' && audit.collection_tier !== 'DEEP_RECONCILED') {
    gaps.push('collection_audit.v2 must declare collection_tier=DEEP_RECONCILED');
  }
  if (!nonempty(audit.scope)) gaps.push('Declared research scope missing');
  if (!nonempty(audit.reviewer)) gaps.push('Second-pass reviewer missing');

  const resolveRefs = (row: Row, label: string) => {
    const refs = row.record_refs;
    if (!Array.isArray(refs) || !refs.length) { gaps.push(label + ': no retained record'); return; }
    for (const ref of refs) {
      if (!nonempty(ref) || !/^(entities|claims|metrics|money_signals|events|relationships|derived|observations)\/\d+$/.test(ref)) {
        gaps.push(label + ': invalid reference'); continue;
      }
      const record = pointer(bundle, '/' + ref);
      if (!record || record === audit) gaps.push(label + ': dangling/self reference');
      if (ref.startsWith('entities/') && /^(requirement:|source-research:)/.test(label) && !/identity|name|domain|founder|[.:]id$|[.:]url$/.test(label)) {
        gaps.push(label + ': identity-only reference');
      }
    }
  };

  const checkRequirements = (items: unknown, expected: readonly string[], prefix: string) => {
    const records = rows(items), seen = new Set<string>();
    for (const row of records) {
      if (!nonempty(row.id) || seen.has(row.id)) { gaps.push(prefix + ': invalid/duplicate id'); continue; }
      seen.add(row.id);
      if (row.status === 'captured') resolveRefs(row, prefix + row.id);
      else if (row.status === 'unavailable') {
        if (!nonempty(row.reason) || !Array.isArray(row.attempts) || !row.attempts.length || !row.attempts.every(nonempty)) {
          gaps.push(prefix + row.id + ': unavailable without search log');
        }
      } else if (row.status === 'not_applicable') {
        if (!nonempty(row.reason)) gaps.push(prefix + row.id + ': no exclusion reason');
      } else gaps.push(prefix + row.id + ': uncollected');
    }
    for (const id of expected) if (!seen.has(id)) gaps.push(prefix + id + ': missing requirement');
  };

  checkRequirements(audit.requirements, required, 'requirement:');

  // A product output interface may contain derived/presentation fields. Only an
  // explicit sourceResearchFields contract may add factual DEEP requirements.
  if (sourceResearchFields.length) {
    checkRequirements(
      audit.kind === 'collection_audit.v2' ? audit.source_research_fields : audit.product_fields,
      sourceResearchFields,
      'source-research:'
    );
  }

  const evidence = rows(bundle.evidence), reviews = rows(audit.sources);
  const seenSources = new Set<string>();
  for (const source of reviews) {
    if (!nonempty(source.evidence_id) || seenSources.has(source.evidence_id) || !evidence.some(x => x.evidence_id === source.evidence_id)) {
      gaps.push('Invalid/duplicate source review'); continue;
    }
    seenSources.add(source.evidence_id);
    if (source.status !== 'reviewed' || !nonempty(source.reviewed_at) || !Array.isArray(source.sections) || !source.sections.length || !source.sections.every(nonempty)) {
      gaps.push(source.evidence_id + ': source not fully inventoried');
    }
    const inventory = rows(source.inventory), seen = new Set<string>();
    if (!inventory.length && !nonempty(source.no_relevant_information_reason)) gaps.push(source.evidence_id + ': empty extraction');
    for (const item of inventory) {
      const label = source.evidence_id + '/' + item.id;
      if (!nonempty(item.id) || seen.has(item.id)) gaps.push(label + ': invalid/duplicate item');
      else seen.add(item.id);
      if (!nonempty(item.statement)) gaps.push(label + ': missing observation');
      if (item.status === 'excluded') {
        if (!nonempty(item.reason) || !['unrelated', 'rights_restricted', 'duplicate'].includes(String(item.exclusion_type))) {
          gaps.push(label + ': unexplained exclusion');
        }
        if (item.exclusion_type === 'duplicate') resolveRefs(item, label);
        continue;
      }
      if (item.status !== 'captured') { gaps.push(label + ': discovered but uncollected'); continue; }
      resolveRefs(item, label);
      const checks = rows(item.checks);
      if (!checks.length) gaps.push(label + ': no exact value/text checks');
      for (const check of checks) {
        const value = pointer(bundle, check.pointer);
        const refs = Array.isArray(item.record_refs) ? item.record_refs : [];
        if (!nonempty(check.pointer) || !refs.some(ref => nonempty(ref) && check.pointer !== '/' + ref && String(check.pointer).startsWith('/' + ref + '/'))) {
          gaps.push(label + ': check outside retained record');
        }
        if (value === undefined || !Object.hasOwn(check, 'equals') || JSON.stringify(value) !== JSON.stringify(check.equals)) {
          gaps.push(label + ': retained value differs from inventory');
        }
      }
    }
  }
  for (const ev of evidence) if (!seenSources.has(String(ev.evidence_id))) gaps.push(String(ev.evidence_id) + ': no source review');
  if (!Array.isArray(audit.search_log) || !audit.search_log.length) gaps.push('Search/source-discovery log missing');
  if (!Array.isArray(audit.remaining_leads) || audit.remaining_leads.length) gaps.push('Unresolved research leads remain');
  return { status: gaps.length ? 'REVIEW_REQUIRED' as const : 'RECONCILED_WITHIN_SCOPE' as const, gaps };
}
