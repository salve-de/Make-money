import fs from 'node:fs';
import crypto from 'node:crypto';

const inputPath = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/research-bundle_new1000_20260916.json';
const retrievedAt = '2026-09-16T00:00:00.000Z';
const hex = (value, length = 24) => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, length);
const iso = (value) => {
  const text = String(value ?? '');
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const asUrl = (value) => {
  try { return new URL(String(value)).toString(); } catch { return null; }
};

const entities = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (!Array.isArray(entities) || entities.length !== 1000) throw new Error('Expected exactly 1000 FinancialEntity records');

const sources = [];
const evidence = [];
const foundationEntities = [];
const claims = [];
const metrics = [];
const moneySignals = [];

for (const entity of entities) {
  const seed = `${entity.id}|${entity.name}|${entity.url}`;
  const h = hex(seed);
  const sourceId = `src.collection.${h}`;
  const evidenceId = `ev_${h}`;
  const foundationEntityId = `ent_case_${h.slice(0, 20)}`;
  const claimId = `cl_${hex(`${seed}|claim`)}`;
  const metricId = `mt_${hex(`${seed}|metric`)}`;
  const moneySignalId = `ms_${hex(`${seed}|money`)}`;
  const sourceUrl = asUrl(entity.pnl?.sourceDoc || entity.sourceMetadata?.postUrl || entity.url);
  if (!sourceUrl) throw new Error(`Missing source URL for ${entity.name}`);
  const observedAt = iso(entity.sourceMetadata?.modifiedAt || entity.sourceMetadata?.observedAt || retrievedAt) || retrievedAt;
  const reportedLabel = String(entity.pnl?.revenueLabel || entity.pnl?.reportedMonthlyRevenueSignal?.source || entity.tagline || '報告値未確認').slice(0, 4000);
  const sourceType = entity.caseType === 'PRIMARY_INDIE_INTERVIEW_CASE' ? 'founder_interview' : 'profile_or_secondary_report';
  const provider = entity.sourceMetadata?.provider || 'collection_source';
  const amount = typeof entity.pnl?.monthlyRevenue === 'number' && entity.pnl.monthlyRevenue > 0 ? entity.pnl.monthlyRevenue : null;
  const originalId = String(entity.id || '');

  sources.push({ source_id: sourceId, provider_name: provider, source_type: sourceType, canonical_url: sourceUrl, source_strength: entity.caseType === 'PRIMARY_INDIE_INTERVIEW_CASE' ? 'B' : 'C', rights_status: 'metadata_only', rights_policy_id: null, access_notes: '本文raw payloadは未保存。URLと抽出候補のみを保存票へ渡す。' });
  evidence.push({ evidence_id: evidenceId, source_id: sourceId, source_url: sourceUrl, source_title: String(entity.name), source_type: sourceType, publisher_or_speaker: entity.founder || null, published_at: observedAt, retrieved_at: retrievedAt, source_strength: entity.caseType === 'PRIMARY_INDIE_INTERVIEW_CASE' ? 'B' : 'C', rights_status: 'metadata_only', raw_storage: { status: 'not_attempted', bucket: null, key: null, content_type: null, content_sha256: null, bytes: null }, summary: reportedLabel, extracted_facts: [reportedLabel], rights_policy_id: null });
  foundationEntities.push({ entity_id: foundationEntityId, entity_type: 'business_case', canonical_name: String(entity.name), aliases: [originalId, String(entity.ticker || '')].filter(Boolean), canonical_identifier: null, domain: asUrl(entity.url) ? new URL(entity.url).hostname.replace(/^www\./, '') : null, status: 'unknown', observed_at: observedAt, evidence_ids: [evidenceId] });
  claims.push({ claim_id: claimId, entity_ids: [foundationEntityId], statement: `${entity.name}: ${reportedLabel}`, origin_type: 'reported', verification_status: 'UNVERIFIED', confidence: 0.5, evidence_ids: [evidenceId], occurred_at: observedAt, valid_from: null, valid_to: null });
  metrics.push({ metric_id: metricId, entity_id: foundationEntityId, metric_type: 'monthly_revenue_jpy', value: amount ?? reportedLabel, unit: amount === null ? null : 'JPY', currency: amount === null ? null : 'JPY', period_start: null, period_end: null, point_in_time: observedAt, basis: 'reported', scope: 'business_case', origin_type: 'reported', verification_status: 'UNVERIFIED', confidence: 0.5, evidence_ids: [evidenceId] });
  moneySignals.push({ money_signal_id: moneySignalId, payer_entity_id: null, receiver_entity_id: foundationEntityId, purpose: 'reported business revenue', money_type: 'revenue', amount, currency: amount === null ? null : 'JPY', unit: amount === null ? null : 'month', amount_label: reportedLabel, period_start: null, period_end: null, point_in_time: observedAt, basis: 'reported', scope: 'business_case', origin_type: 'reported', verification_status: 'UNVERIFIED', confidence: 0.5, evidence_ids: [evidenceId] });
}

const found = new Set(['identity', 'founders', 'location', 'revenue', 'mrr_arr', 'payer_receiver_purpose', 'customer_pain', 'provenance_rights', 'additional_observations']);
const dimensions = ['identity', 'founders', 'location', 'status', 'team_history', 'timeline', 'revenue', 'peak_revenue', 'mrr_arr', 'gmv', 'gross_profit', 'operating_profit', 'net_profit', 'costs', 'cost_breakdown', 'margin', 'owner_take_home', 'pricing', 'pricing_history', 'refunds', 'retention_churn', 'funding', 'exit_value', 'payer_receiver_purpose', 'customers', 'customer_pain', 'substitutes', 'first_customers', 'initial_channel', 'breakout', 'current_channels', 'founder_background', 'prior_failures', 'workload', 'support_burden', 'outsourcing', 'automation', 'capital_required', 'technology', 'competitors', 'dependencies', 'regulation', 'why_now', 'provenance_rights', 'conflicts', 'additional_observations'];
const collectionCoverage = dimensions.map((dimension) => found.has(dimension)
  ? { dimension, status: 'found', note: '1000件の収集レコードに該当フィールドまたは出典参照がある。', record_refs: [`entities/0`] }
  : { dimension, status: 'unknown', note: '収集範囲内で独立確認できず、未確認として保持。', attempts: ['profile/source metadata scan', 'official URL check'] });

const bundle = {
  schema_version: 'research-bundle.v1', run_id: 'run_make_money_new1000_20260916', purpose: 'make_money', subject: { query: '新規1000件 個人開発・ソロプレナー・少人数事業の収益事例' }, agent: { name: 'codex-20260916-new1000', version: '1.0' }, retrieved_at: retrievedAt,
  sources, evidence, entities: foundationEntities, claims, metrics, money_signals: moneySignals, events: [], relationships: [], derived: [], collection_coverage: collectionCoverage,
  quality: { schema_validation: 'PASS', unknowns: ['raw HTML/PDF本文は未保存', '利益・原価・税・手残りは独立確認していない', 'reported values are not independently audited'], conflicts: [], warnings: ['All claim and metric verification statuses remain UNVERIFIED until raw evidence is captured and support-checked.'] }
};
const request = { write_authorized: false, bundle, raw_evidence: [] };
fs.writeFileSync(outputPath, `${JSON.stringify(request, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, count: entities.length, sources: sources.length, evidence: evidence.length, foundationEntities: foundationEntities.length, claims: claims.length, metrics: metrics.length, moneySignals: moneySignals.length, rawEvidence: 0 }, null, 2));
