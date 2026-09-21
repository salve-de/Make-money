import { expect, it } from 'vitest';
import {
  extractScheduledExplicitFields,
  resolveScheduledEntityName,
} from './scheduled-explicit-fields';

const entityId = 'ent_company_0123456789abcdef0123';
const evidenceId = 'ev_0123456789abcdef01234567';
const context = {
  runId: 'run_q39_test',
  entityId,
  rowIndex: 0,
  observedAt: '2026-09-21T06:00:00Z',
  evidenceIds: [evidenceId],
  confidence: 0.9,
};

it('resolves a normalized name only when the source entity ID matches', () => {
  const row = { source_entity_id: entityId, normalized: { Entity: [{ id: entityId, name: 'Example Company' }] } };
  expect(resolveScheduledEntityName(row)).toEqual({ name: 'Example Company', sourceEntityId: entityId });
  expect(resolveScheduledEntityName({ source_entity_id: entityId, Entity: [{ id: 'ent_company_aaaaaaaaaaaaaaaaaaaa', name: 'Wrong Company' }] })).toBeNull();
  expect(resolveScheduledEntityName({ Entity: [{ name: 'First' }, { name: 'Second' }] })).toBeNull();
});

it('keeps explicit arrays and exact money strings while auditing malformed members', () => {
  const input = {
    source_entity_id: entityId,
    Entity: [{ id: entityId, name: 'Example Company' }],
    Evidence: [evidenceId],
    quality: { verification_status: 'SUPPORTED' },
    Claim: [
      { text: 'The reported fact.', verification: 'UNVERIFIED' },
      null,
    ],
    Metric: [{ type: 'ARR', value: ' 1.2m ', unit: '', currency: 'USD' }],
    MoneySignal: [{
      money_type: 'funding', purpose: 'capital raised', amount: ' USD 3m ', currency: 'USD', unit: '', amount_label: '',
    }],
    Event: [{ type: 'acquisition', state: 'PENDING' }],
    Relationship: [{ type: 'acquired', subject: 'Example Company', object: 'Other Company' }],
    Observation: [{ product_derived: true, text: 'Do not promote this as a typed fact.' }],
    Derived: [{ derived_type: 'hypothesis', text: 'Not promoted here.' }],
  };
  const before = JSON.stringify(input);
  const result = extractScheduledExplicitFields(input, context);
  const again = extractScheduledExplicitFields(input, context);

  expect(result.claims).toHaveLength(1);
  expect(result.claims[0]).toEqual(expect.objectContaining({ verification_status: 'UNVERIFIED' }));
  expect(result.metrics[0]).toEqual(expect.objectContaining({ value: ' 1.2m ', unit: '', currency: 'USD' }));
  expect(result.money_signals[0]).toEqual(expect.objectContaining({
    money_type: 'funding', amount: ' USD 3m ', unit: '', amount_label: '', receiver_entity_id: null,
  }));
  expect(result.events[0]).toEqual(expect.objectContaining({ occurred_at: null }));
  expect(result.relationships).toHaveLength(1);
  expect(result.issues).toEqual(expect.arrayContaining(['Claim[1] is not an object; original row snapshot retained']));
  expect(result).toEqual(again);
  expect(JSON.stringify(input)).toBe(before);
  expect(result).not.toHaveProperty('observations');
  expect(result).not.toHaveProperty('derived');
});

it('holds invalid dates, unknown statuses, outside evidence, and counterparties', () => {
  const otherEvidence = 'ev_aaaaaaaaaaaaaaaaaaaaaaaa';
  const otherEntity = 'ent_company_aaaaaaaaaaaaaaaaaaaa';
  const result = extractScheduledExplicitFields({
    Entity: [{ id: entityId, name: 'Example Company' }],
    Evidence: [evidenceId],
    quality: { verification_status: 'SUPPORTED' },
    Claim: [{
      text: 'Badly dated fact', occurred_at: '2026-02-31T00:00:00Z', evidence_ids: [otherEvidence], verification: 'MAYBE',
    }, { text: 'Mixed evidence references', evidence_ids: [evidenceId, 123] },
    { text: 'Missing evidence IDs', evidence_ids: [evidenceId, {}, null] }, { text: 'Unknown status', verification: 'MAYBE' }],
    MoneySignal: [{ money_type: 'acquisition', purpose: 'purchase', payer_entity_id: otherEntity }],
    Relationship: [{ type: 'acquired', subject: 123, object: 'Other Company' }],
  }, context);

  expect(result.claims).toHaveLength(0);
  expect(result.money_signals).toHaveLength(0);
  expect(result.issues.join('\n')).toContain('Claim[0].occurred_at is not a valid RFC3339 date-time');
  expect(result.issues.join('\n')).toContain('Explicit record evidence does not match');
  expect(result.issues.join('\n')).toContain('counterparty identity is not resolved');
  expect(result.issues.join('\n')).toContain('verification status MAYBE is unknown');
  expect(result.issues.join('\n')).toContain('invalid evidence reference');
  expect(result.issues.join('\n')).toContain('invalid supplied subject');
});
