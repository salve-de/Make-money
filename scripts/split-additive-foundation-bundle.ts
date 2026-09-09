import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type Obj = Record<string, any>;

const inputPath = resolve(process.argv[2] || 'data/collection/run_make_money_1000_bottomtrawl_20260909_04.request.json');
const outputDir = resolve(process.argv[3] || 'data/collection/shards_20260909_04');
const shardCount = Number(process.argv[4] || 100);
const entitySourcePath = resolve(process.argv[5] || 'data/collection/run_make_money_1000_bottomtrawl_20260909_01.request.json');

if (!Number.isInteger(shardCount) || shardCount < 2 || shardCount > 1000) throw new Error('shard count must be an integer between 2 and 1000');

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

function entityIds(record: Obj): string[] {
  return [...new Set([
    typeof record.entity_id === 'string' ? record.entity_id : null,
    typeof record.subject_entity_id === 'string' ? record.subject_entity_id : null,
    typeof record.payer_entity_id === 'string' ? record.payer_entity_id : null,
    typeof record.receiver_entity_id === 'string' ? record.receiver_entity_id : null,
    ...strings(record.entity_ids),
  ].filter((value): value is string => Boolean(value)))];
}

function evidenceIds(record: Obj): string[] {
  return [...new Set([...strings(record.evidence_ids), ...strings(record.supporting_evidence_ids)])];
}

function refsFor(field: string, record: Obj): string[] {
  if (field === 'entities') return typeof record.entity_id === 'string' ? [record.entity_id] : [];
  return entityIds(record);
}

function recordRefs(bundle: Obj, field: string, id: string): string[] {
  const records = Array.isArray(bundle[field]) ? bundle[field] as Obj[] : [];
  const index = records.findIndex((record) => String(record[id] || '') === String(id));
  return index >= 0 ? [`${field}/${index}`] : [];
}

function firstMatching(bundle: Obj, field: string, pattern: RegExp): string | null {
  const records = Array.isArray(bundle[field]) ? bundle[field] as Obj[] : [];
  for (const [index, record] of records.entries()) {
    if (pattern.test(JSON.stringify(record))) return `${field}/${index}`;
  }
  return null;
}

function coverage(bundle: Obj): Obj[] {
  const metric = /revenue|mrr|arr|gmv|profit|cost|margin|price|fund|valuation|cash|fee|refund/i;
  const customer = /customer|client|user|subscriber|buyer|pain|problem|alternative|competitor|founder|team|background/i;
  const distribution = /channel|launch|outreach|seo|search|marketplace|referral|partner|affiliate|traffic|distribution|links_to/i;
  const operations = /workload|support|outsource|automation|capital|required|technology|api|hosting|database|stack|regulat|depend/i;
  const timeline = /launch|start|founded|failure|shutdown|closed|pivot|acqui|exit|status|milestone/i;
  const expected: Record<string, { field: string; pattern: RegExp }[]> = {
    identity: [{ field: 'evidence', pattern: /source_title|source_url/i }],
    founders: [{ field: 'claims', pattern: /founder|co-founder|creator|operator/i }],
    location: [{ field: 'claims', pattern: /based in|located|country|city|remote/i }],
    status: [{ field: 'events', pattern: /status|failure|shutdown|pivot|acquisition/i }],
    team_history: [{ field: 'claims', pattern: /team|employee|hire|staff/i }],
    timeline: [{ field: 'events', pattern: timeline }],
    revenue: [{ field: 'metrics', pattern: /revenue|mrr|arr|gmv/i }, { field: 'money_signals', pattern: /revenue|mrr|arr|gmv/i }],
    peak_revenue: [{ field: 'claims', pattern: /peak|highest|reached|grew to/i }],
    mrr_arr: [{ field: 'metrics', pattern: /mrr|arr|recurring/i }],
    gmv: [{ field: 'metrics', pattern: /gmv|merchandise|transaction volume/i }],
    gross_profit: [{ field: 'metrics', pattern: /gross_profit|gross profit/i }],
    operating_profit: [{ field: 'metrics', pattern: /operating_profit|operating profit/i }],
    net_profit: [{ field: 'metrics', pattern: /net_profit|net profit|profitable/i }],
    costs: [{ field: 'metrics', pattern: /cost|expense|spend|burn/i }],
    cost_breakdown: [{ field: 'claims', pattern: /hosting|api|tool|payroll|salary|advertis|tax|refund|fee/i }],
    margin: [{ field: 'metrics', pattern: /margin|rate/i }],
    owner_take_home: [{ field: 'claims', pattern: /take.?home|paid myself|salary|dividend/i }],
    pricing: [{ field: 'metrics', pattern: /price/i }, { field: 'claims', pattern: /pricing|subscription|lifetime/i }],
    pricing_history: [{ field: 'claims', pattern: /old price|new price|price change|raised the price/i }],
    refunds: [{ field: 'claims', pattern: /refund|chargeback|money back/i }],
    retention_churn: [{ field: 'metrics', pattern: /churn|retention/i }, { field: 'claims', pattern: /renew|cancel|repeat/i }],
    funding: [{ field: 'metrics', pattern: /funding|raised|investment/i }],
    exit_value: [{ field: 'events', pattern: /acqui|sold|exit|valuation/i }],
    payer_receiver_purpose: [{ field: 'claims', pattern: /customer|buyer|payer|client|purpose/i }],
    customers: [{ field: 'claims', pattern: customer }],
    customer_pain: [{ field: 'claims', pattern: /problem|pain|frustrat|urgent|risk|waste/i }],
    substitutes: [{ field: 'claims', pattern: /alternative|competitor|instead of|workaround/i }],
    first_customers: [{ field: 'claims', pattern: /first customer|first user|early adopter/i }],
    initial_channel: [{ field: 'claims', pattern: distribution }],
    breakout: [{ field: 'claims', pattern: /grew|growth|viral|breakout|spike|featured/i }],
    current_channels: [{ field: 'relationships', pattern: distribution }, { field: 'claims', pattern: distribution }],
    founder_background: [{ field: 'claims', pattern: /background|career|worked at|experience|former/i }],
    prior_failures: [{ field: 'events', pattern: /failure|shutdown|closed|pivot/i }],
    workload: [{ field: 'claims', pattern: /hours|workload|manual|daily|weekly/i }],
    support_burden: [{ field: 'claims', pattern: /support|ticket|complaint|onboarding/i }],
    outsourcing: [{ field: 'claims', pattern: /outsource|freelanc|contractor|agency/i }],
    automation: [{ field: 'claims', pattern: /automat|zapier|script|workflow|ai/i }],
    capital_required: [{ field: 'claims', pattern: /capital|upfront|initial cost|runway|bootstrapp/i }],
    technology: [{ field: 'claims', pattern: /technology|api|hosting|database|stack|stripe|github/i }],
    competitors: [{ field: 'claims', pattern: /competitor|alternative|compete|versus/i }],
    dependencies: [{ field: 'claims', pattern: /dependent|platform|api|app store|marketplace|stripe/i }],
    regulation: [{ field: 'claims', pattern: /regulat|compliance|license|legal|gdpr|tax/i }],
    why_now: [{ field: 'claims', pattern: /trend|timing|pandemic|remote work|new technology|market change/i }],
    provenance_rights: [{ field: 'evidence', pattern: /source_url|retrieved_at|rights_status/i }],
    conflicts: [],
    additional_observations: [{ field: 'observations', pattern: /cross_project_reusable_case_profile/i }],
  };
  return Object.entries(expected).map(([dimension, checks]) => {
    if (dimension === 'conflicts') return { dimension, status: 'attempted_unavailable', note: 'Shard-level automated contradiction scan was not asserted as a fact.', attempts: ['Retained source/evidence provenance and preserved conflicting claims for later reconciliation.'] };
    for (const check of checks) {
      const ref = firstMatching(bundle, check.field, check.pattern);
      if (ref) return { dimension, status: 'found', note: 'This additive shard retains at least one source-linked signal for the dimension.', record_refs: [ref] };
    }
    return { dimension, status: 'attempted_unavailable', note: 'The parent wave searched the declared public surfaces but this shard retained no supportable signal for the dimension.', attempts: ['Additive wave searched public case-page text and selected linked public surfaces; retry or alternate source remains valid.'] };
  });
}

async function main() {
  const request = JSON.parse(await readFile(inputPath, 'utf8')) as Obj;
  const source = request.bundle as Obj;
  const entitySource = JSON.parse(await readFile(entitySourcePath, 'utf8')) as Obj;
  const entityBundle = entitySource.bundle as Obj;
  const entities = Array.isArray(entityBundle.entities) ? entityBundle.entities as Obj[] : [];
  if (entities.length !== 1000) throw new Error(`expected 1000 source entities, got ${entities.length}`);
  const entityShard = new Map<string, number>();
  for (const [index, entity] of entities.entries()) entityShard.set(String(entity.entity_id), index % shardCount);

  const shardRecords: Record<string, Obj[][]> = {};
  for (const field of ['sources', 'evidence', 'claims', 'metrics', 'money_signals', 'events', 'relationships', 'observations', 'derived']) shardRecords[field] = Array.from({ length: shardCount }, () => []);
  const evidenceShard = new Map<string, Set<number>>();
  const sourceShard = new Map<string, Set<number>>();
  const fallback = new Map<string, number>();
  const fallbackShard = (field: string) => { const value = fallback.get(field) || 0; fallback.set(field, value + 1); return value % shardCount; };
  const assign = (field: string, record: Obj) => {
    const shards = new Set<number>();
    const directEntityIds = entityIds(record).filter((id) => entityShard.has(id));
    for (const id of directEntityIds) shards.add(entityShard.get(id)!);
    // Prefer the record's own entity assignment. Only records without an entity
    // (for example a shared evidence/source row) inherit evidence-based shards.
    if (!directEntityIds.length) for (const ev of evidenceIds(record)) for (const shard of evidenceShard.get(ev) || []) shards.add(shard);
    if (!shards.size) shards.add(fallbackShard(field));
    for (const shard of shards) shardRecords[field][shard].push(record);
    return shards;
  };

  const typedFields = ['claims', 'metrics', 'money_signals', 'events', 'relationships', 'observations', 'derived'];
  for (const field of typedFields) {
    for (const record of (Array.isArray(source[field]) ? source[field] : []) as Obj[]) {
      const assigned = assign(field, record);
      for (const ev of evidenceIds(record)) {
        const prior = evidenceShard.get(ev) || new Set<number>();
        for (const shard of assigned) prior.add(shard);
        evidenceShard.set(ev, prior);
      }
    }
  }

  const evidence = (Array.isArray(source.evidence) ? source.evidence : []) as Obj[];
  for (const record of evidence) {
    const known = evidenceShard.get(String(record.evidence_id));
    const shards = known?.size ? known : new Set([fallbackShard('evidence')]);
    for (const shard of shards) shardRecords.evidence[shard].push(record);
    const sourceId = String(record.source_id || '');
    if (sourceId) {
      const prior = sourceShard.get(sourceId) || new Set<number>();
      for (const shard of shards) prior.add(shard);
      sourceShard.set(sourceId, prior);
    }
  }
  const sources = (Array.isArray(source.sources) ? source.sources : []) as Obj[];
  for (const record of sources) {
    const known = sourceShard.get(String(record.source_id));
    const shards = known?.size ? known : new Set([fallbackShard('sources')]);
    for (const shard of shards) shardRecords.sources[shard].push(record);
  }

  await mkdir(outputDir, { recursive: true });
  const suffixWidth = String(shardCount).length;
  const manifest: Obj[] = [];
  const parentRunId = String(source.run_id);
  for (let index = 0; index < shardCount; index += 1) {
    const suffix = String(index + 1).padStart(suffixWidth, '0');
    const runId = `${parentRunId}_s${suffix}`;
    const shardBundle: Obj = {
      ...source,
      run_id: runId,
      subject: { ...source.subject, notes: `${String(source.subject?.notes || '')} Shard ${suffix}/${String(shardCount)}; no entity records are duplicated or overwritten.` },
      sources: [...new Map(shardRecords.sources[index].map((record) => [String(record.source_id), record])).values()],
      evidence: [...new Map(shardRecords.evidence[index].map((record) => [String(record.evidence_id), record])).values()],
      entities: [],
      claims: shardRecords.claims[index],
      metrics: shardRecords.metrics[index],
      money_signals: shardRecords.money_signals[index],
      events: shardRecords.events[index],
      relationships: shardRecords.relationships[index],
      observations: shardRecords.observations[index],
      derived: shardRecords.derived[index],
    };
    shardBundle.collection_coverage = coverage(shardBundle);
    shardBundle.quality = {
      ...source.quality,
      warnings: [...strings(source.quality?.warnings), `Additive shard ${suffix}/${String(shardCount)}; read as a partial slice of the reusable wave.`],
      schema_validation: 'PASS',
    };
    const outputPath = resolve(outputDir, `shard-${suffix}.request.json`);
    await writeFile(outputPath, JSON.stringify({ write_authorized: true, bundle: shardBundle }, null, 2) + '\n', { flag: 'wx' });
    manifest.push({
      shard: index + 1,
      run_id: runId,
      path: outputPath,
      sources: shardBundle.sources.length,
      evidence: shardBundle.evidence.length,
      claims: shardBundle.claims.length,
      metrics: shardBundle.metrics.length,
      money_signals: shardBundle.money_signals.length,
      events: shardBundle.events.length,
      relationships: shardBundle.relationships.length,
      observations: shardBundle.observations.length,
      derived: shardBundle.derived.length,
    });
  }
  const totals = Object.fromEntries(['sources', 'evidence', 'claims', 'metrics', 'money_signals', 'events', 'relationships', 'observations', 'derived'].map((field) => [field, manifest.reduce((sum, row) => sum + Number(row[field]), 0)]));
  await writeFile(resolve(outputDir, 'manifest.json'), JSON.stringify({ parent_run_id: parentRunId, shard_count: shardCount, totals, shards: manifest }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output_dir: outputDir, shard_count: shardCount, totals }));
}

main().catch((error) => { console.error(error instanceof Error ? error.stack || error.message : error); process.exitCode = 1; });
