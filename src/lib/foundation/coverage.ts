/** Collection completeness is separate from permission to retain partial knowledge. */
export const DIMENSIONS = [
  'identity', 'founders', 'location', 'status', 'team_history', 'timeline',
  'revenue', 'peak_revenue', 'mrr_arr', 'gmv', 'gross_profit', 'operating_profit',
  'net_profit', 'costs', 'cost_breakdown', 'margin', 'owner_take_home', 'pricing',
  'pricing_history', 'refunds', 'retention_churn', 'funding', 'exit_value',
  'payer_receiver_purpose', 'customers', 'customer_pain', 'substitutes',
  'first_customers', 'initial_channel', 'breakout', 'current_channels',
  'founder_background', 'prior_failures', 'workload', 'support_burden',
  'outsourcing', 'automation', 'capital_required', 'technology',
  'competitors', 'dependencies', 'regulation', 'why_now',
  'provenance_rights', 'conflicts', 'additional_observations',
] as const;

export function assessCoverage(bundle: Record<string, unknown>) {
  const entries = bundle.collection_coverage;
  if (!Array.isArray(entries)) throw new Error('collection_coverage required; use one row per DIMENSIONS entry');
  const allowed = new Set(['found', 'attempted_unavailable', 'not_attempted', 'not_applicable', 'unknown']);
  const seen = new Set<string>();
  const pending: string[] = [];
  for (const row of entries) {
    if (!row || typeof row.dimension !== 'string' || seen.has(row.dimension) || !allowed.has(row.status)) {
      throw new Error('Invalid or duplicate collection coverage row');
    }
    seen.add(row.dimension);
    if (typeof row.note !== 'string' || !row.note.trim()) throw new Error(`${row.dimension}: note required`);
    if (row.status === 'not_attempted') pending.push(row.dimension);
    if (['attempted_unavailable', 'unknown'].includes(row.status) &&
        (!Array.isArray(row.attempts) || !row.attempts.length || row.attempts.some((x: unknown) => typeof x !== 'string' || !x.trim()))) {
      throw new Error(`${row.dimension}: record actual search attempts, not a fabricated empty value`);
    }
    if (row.status === 'found') {
      if (!Array.isArray(row.record_refs) || !row.record_refs.length) throw new Error(`${row.dimension}: record_refs required`);
      for (const ref of row.record_refs) {
        const match = /^(entities|claims|metrics|money_signals|events|relationships|derived|observations|sources|evidence)\/(\d+)$/.exec(ref);
        if (!match || !Array.isArray(bundle[match[1]]) || !(bundle[match[1]] as unknown[])[Number(match[2])]) {
          throw new Error(`${row.dimension}: dangling record reference ${ref}`);
        }
      }
    }
  }
  for (const dimension of DIMENSIONS) if (!seen.has(dimension)) throw new Error(`Missing coverage dimension: ${dimension}`);
  if (!Array.isArray(bundle.money_signals)) throw new Error('money_signals array required for business collection');
  const records = ['entities', 'claims', 'metrics', 'money_signals', 'events', 'relationships', 'observations'];
  if (!records.some(field => Array.isArray(bundle[field]) && (bundle[field] as unknown[]).length)) throw new Error('Empty research is not a collection result');
  return { status: pending.length ? 'PARTIAL' : 'ALL_DIMENSIONS_ATTEMPTED', pending,
    note: 'Attempted coverage does not mean every fact is known or independently verified.' };
}
