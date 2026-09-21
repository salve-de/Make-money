import { describe, expect, it } from 'vitest';
import { sha256Sync } from '@/shared/sha256';
import {
  buildFoundationBusinessCaseForEntity,
  type FoundationEntitySummary,
} from './business-reader';
import { adaptFoundationDetailToFinancialEntity } from './foundation-adapter';

const runId = 'run_r2queue_20260921T060537Z_q39';
const observedAt = '2026-09-21T06:05:37Z';

function storedId(name: string): string {
  return `ent_company_${sha256Sync(`${runId}|entity|${name}`).slice(0, 20)}`;
}

function sourceId(index: number): string {
  return `ent_company_${sha256Sync(`q39-source-${index}`).slice(0, 20)}`;
}

function evidenceId(index: number): string {
  return `ev_${sha256Sync(`q39-evidence-${index}`).slice(0, 24)}`;
}

function rowFor(index: number, name: string, verification = 'SUPPORTED'): Record<string, unknown> {
  const sourceEntityId = sourceId(index);
  const evidence = evidenceId(index);
  return {
    source_entity_id: sourceEntityId,
    subject_or_entity_id: sourceEntityId,
    Entity: [{ id: sourceEntityId, name }],
    Evidence: [{ id: evidence }],
    quality: { verification_status: verification },
    Claim: [{ text: `${name} has a recorded operating fact.`, origin: 'reported', verification }],
    Metric: [{ type: 'MRR', value: 1200 + index, currency: 'USD', verification }],
    MoneySignal: index < 20
      ? [{ type: 'funding', purpose: 'seed financing', amount: 100000 + index, verification }]
      : [],
    Event: [{ type: 'launch', state: '2026-09-01', verification }],
    Relationship: index === 0
      ? [{ type: 'acquired', subject: name, object: 'Named counterparty', verification }]
      : index < 15
        ? [{ type: 'acquired', subject: 'Composite case subject is not resolved', object: 'Named counterparty', verification }]
        : [],
    Observation: [{ product_derived: false, text: `${name} observation` }],
  };
}

function bundleFor(count = 25, verification = 'SUPPORTED'): Record<string, unknown> {
  const rows = Array.from({ length: count }, (_, index) => {
    const name = `Q39 business ${String(index + 1).padStart(2, '0')}`;
    return rowFor(index, name, verification);
  });
  return {
    schema_version: 'research-bundle.v1',
    run_id: runId,
    retrieved_at: observedAt,
    entities: rows.map((row) => {
      const entity = row.Entity as Array<Record<string, unknown>>;
      const sourceEntityId = String(row.source_entity_id);
      const name = String(entity[0]?.name);
      return {
        entity_id: storedId(sourceEntityId),
        entity_type: 'company',
        canonical_name: sourceEntityId,
        aliases: [],
        canonical_identifier: null,
        domain: null,
        status: 'observed',
        observed_at: observedAt,
        evidence_ids: [String((row.Evidence as Array<Record<string, unknown>>)[0]?.id)],
        // Keep the source name in a separate field only for the test fixture.
        source_name: name,
      };
    }),
    evidence: rows.map((row) => ({
      evidence_id: String((row.Evidence as Array<Record<string, unknown>>)[0]?.id),
    })),
    claims: [],
    metrics: [],
    money_signals: [],
    events: [],
    relationships: [],
    observations: rows.map((row) => ({
      origin_type: 'observed',
      verification_status: 'SUPPORTED',
      observed_at: observedAt,
      collection_channel: 'scheduled-test',
      text: `scheduled_r2_queue_row=${JSON.stringify(row)}`,
      evidence_ids: [String((row.Evidence as Array<Record<string, unknown>>)[0]?.id)],
    })),
    derived: [],
  };
}

function summaryFor(bundle: Record<string, unknown>, index: number): FoundationEntitySummary {
  const entities = bundle.entities as Array<Record<string, unknown>>;
  const entity = entities[index]!;
  return {
    id: String(entity.entity_id),
    name: String(entity.canonical_name),
    entityType: 'company',
    aliases: [],
    canonicalIdentifier: null,
    domain: null,
    status: 'observed',
    observedAt,
    evidenceIds: entity.evidence_ids as string[],
  };
}

describe('scheduled R2 consumer read-through (synthetic fixtures)', () => {
  it('projects synthetic 25-row names while preserving stored IDs and explicit fields', () => {
    const bundle = bundleFor();
    const details = Array.from({ length: 25 }, (_, index) =>
      buildFoundationBusinessCaseForEntity(bundle, summaryFor(bundle, index))
    );

    expect(details).toHaveLength(25);
    expect(details.map((detail) => detail.name)).toEqual(
      Array.from({ length: 25 }, (_, index) => `Q39 business ${String(index + 1).padStart(2, '0')}`)
    );
    expect(details.every((detail, index) => detail.id === summaryFor(bundle, index).id)).toBe(true);
    expect(details.every((detail) => detail.claims.length === 1 && detail.metrics.length === 1 && detail.events.length === 1)).toBe(true);
    expect(details[0]?.relationships).toHaveLength(1);
    expect(details[1]?.relationships).toHaveLength(0);
    expect(details[1]?.issues?.some((issue) => issue.includes('Relationship'))).toBe(true);
    expect(details[0]?.observations.some((observation) => observation.text.startsWith('scheduled_r2_queue_row='))).toBe(true);
  });

  it('does not inherit wrapper SUPPORTED into inner unverified facts', () => {
    const bundle = bundleFor(1, 'UNVERIFIED');
    const detail = buildFoundationBusinessCaseForEntity(bundle, summaryFor(bundle, 0));

    expect(detail.observations[0]?.verificationStatus).toBe('SUPPORTED');
    expect(detail.claims[0]?.verificationStatus).toBe('UNVERIFIED');
    expect(detail.metrics[0]?.verificationStatus).toBe('UNVERIFIED');
  });

  it('keeps financing as a money signal and does not project it as revenue', () => {
    const bundle = bundleFor(1);
    const observation = (bundle.observations as Array<Record<string, unknown>>)[0]!;
    const row = JSON.parse(String(observation.text).slice('scheduled_r2_queue_row='.length)) as Record<string, unknown>;
    row.Metric = [];
    observation.text = `scheduled_r2_queue_row=${JSON.stringify(row)}`;
    const detail = buildFoundationBusinessCaseForEntity(bundle, summaryFor(bundle, 0));
    const adapted = adaptFoundationDetailToFinancialEntity(detail);

    expect(detail.moneySignals[0]?.moneyType).toBe('funding');
    expect(detail.moneySignals[0]?.payerEntityId).toBeNull();
    expect(detail.moneySignals[0]?.receiverEntityId).toBeNull();
    expect(adapted.pnl.monthlyRevenue).toBe(0);
    expect(adapted.pnl.isRevenueUnconfirmed).toBe(true);
  });

  it('uses the future canonical-name ID formula without changing the stored ID', () => {
    const name = 'Future structured business';
    const source = sourceId(0);
    const evidence = evidenceId(0);
    const row = rowFor(0, name);
    const bundle = bundleFor(0);
    bundle.entities = [{
      entity_id: storedId(name), entity_type: 'company', canonical_name: name, aliases: [],
      canonical_identifier: null, domain: null, status: 'observed', observed_at: observedAt,
      evidence_ids: [evidence],
    }];
    bundle.evidence = [{ evidence_id: evidence }];
    bundle.observations = [{
      text: `scheduled_r2_queue_row=${JSON.stringify({ ...row, source_entity_id: source, subject_or_entity_id: source })}`,
      origin_type: 'observed', verification_status: 'SUPPORTED', observed_at: observedAt,
      evidence_ids: [evidence],
    }];
    const detail = buildFoundationBusinessCaseForEntity(bundle, summaryFor(bundle, 0));

    expect(detail.id).toBe(storedId(name));
    expect(detail.name).toBe(name);
    expect(detail.claims).toHaveLength(1);
  });

  it('holds typed fields and records an issue when stored canonical attribution fails', () => {
    const bundle = bundleFor(1);
    const entity = (bundle.entities as Array<Record<string, unknown>>)[0]!;
    entity.canonical_name = 'unrelated canonical name';
    const detail = buildFoundationBusinessCaseForEntity(bundle, summaryFor(bundle, 0));

    expect(detail.name).toBe(summaryFor(bundle, 0).name);
    expect(detail.claims).toHaveLength(0);
    expect(detail.observations.some((observation) => observation.text.startsWith('scheduled_r2_queue_row='))).toBe(true);
    expect(detail.issues?.some((issue) => issue.includes('attribution'))).toBe(true);
  });

  it('rejects malformed or oversized snapshot JSON while keeping the detail usable', () => {
    const bundle = bundleFor(1);
    bundle.observations = [
      { text: 'scheduled_r2_queue_row={not-json}', verification_status: 'SUPPORTED', evidence_ids: [] },
      { text: `scheduled_r2_queue_row=${'x'.repeat(256 * 1024 + 1)}`, verification_status: 'SUPPORTED', evidence_ids: [] },
    ];
    const detail = buildFoundationBusinessCaseForEntity(bundle, summaryFor(bundle, 0));

    expect(detail.claims).toHaveLength(0);
    expect(detail.issues?.some((issue) => issue.includes('invalid JSON'))).toBe(true);
    expect(detail.issues?.some((issue) => issue.includes('exceeds'))).toBe(true);
  });
});
