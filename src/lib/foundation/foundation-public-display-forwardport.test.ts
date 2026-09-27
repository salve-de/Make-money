import { describe, expect, it } from 'vitest';
import {
  buildFoundationBusinessCaseForEntity,
  type FoundationEntitySummary,
} from './business-reader';
import { adaptFoundationDetailToFinancialEntity } from './foundation-adapter';

const entityId = 'ent_organization_1234567890abcdef1234';
const evidenceId = 'ev_1234567890abcdef12345678';

const baseSummary: FoundationEntitySummary = {
  id: entityId,
  name: 'Apollo Global Management',
  entityType: 'organization',
  aliases: ['Apollo'],
  canonicalIdentifier: null,
  domain: null,
  status: 'active',
  observedAt: '2026-09-25T04:42:00Z',
  evidenceIds: [evidenceId],
};

describe('reviewed Foundation public display forward-port', () => {
  it('preserves reviewed facts and sources through reader and adapter without exposing raw payload', () => {
    const detail = buildFoundationBusinessCaseForEntity({
      schema_version: 'research-bundle.v1',
      run_id: 'run_public_display_forwardport',
      retrieved_at: '2026-09-25T04:42:00Z',
      entities: [{
        entity_id: entityId,
        entity_type: 'organization',
        canonical_name: 'Apollo Global Management',
        aliases: ['Apollo'],
        canonical_identifier: null,
        domain: null,
        status: 'active',
        observed_at: '2026-09-25T04:42:00Z',
        evidence_ids: [evidenceId],
      }],
      claims: [],
      metrics: [],
      money_signals: [],
      events: [],
      relationships: [],
      observations: [{
        observation_id: 'obs_1234567890abcdef12345678',
        observation_type: 'public_fact.v1',
        entity_ids: [entityId],
        origin_type: 'reported',
        verification_status: 'SUPPORTED',
        observed_at: '2026-09-25T04:42:00Z',
        evidence_ids: [evidenceId],
        text: 'Ownership interest',
        payload: {
          private_only: 'must-not-cross-reader',
        },
        observer: 'VERIFY_RECONCILE',
        payload_schema_ref: 'urn:internal',
        public_display: {
          title: 'Ownership interest',
          subject: 'Joint venture',
          facts: [
            { label: 'Apollo-managed funds / affiliates', value: 41.5, suffix: '%' },
            { label: 'Starwood SREIT', value: 58.5, suffix: '%' },
          ],
          source_label: 'SEC filing',
          source_urls: [
            'https://www.sec.gov/Archives/edgar/data/1711929/000119312526332741/ck0001711929-20260803.htm',
            'https://www.sec.gov/Archives/edgar/data/1711929/000119312526332795/ck0001711929-20260804.htm',
          ],
        },
      }],
      derived: [],
    }, baseSummary);

    const observation = detail.observations[0];
    expect(observation.kind).toBe('public_fact.v1');
    expect(observation.publicDisplay).toMatchObject({
      title: 'Ownership interest',
      facts: [
        { label: 'Apollo-managed funds / affiliates', value: 41.5, suffix: '%' },
        { label: 'Starwood SREIT', value: 58.5, suffix: '%' },
      ],
      sourceLabel: 'SEC filing',
    });
    expect(observation.publicDisplay?.sourceUrls).toHaveLength(2);
    expect(observation).not.toHaveProperty('payload');
    expect(observation).not.toHaveProperty('observer');
    expect(observation).not.toHaveProperty('payloadSchemaRef');

    const adapted = adaptFoundationDetailToFinancialEntity(detail);
    const projected = adapted.observationsStream?.find(
      (item) => item.id === 'obs_1234567890abcdef12345678',
    );
    expect(projected?.observationType).toBe('public_fact.v1');
    expect(projected?.publicDisplay?.facts.map((fact) => fact.value)).toEqual([41.5, 58.5]);
    expect(projected?.publicDisplay?.sourceUrls).toHaveLength(2);
  });

  it('drops malformed or non-https display metadata fail-closed', () => {
    const detail = buildFoundationBusinessCaseForEntity({
      schema_version: 'research-bundle.v1',
      run_id: 'run_bad_public_display',
      retrieved_at: '2026-09-25T04:42:00Z',
      entities: [],
      claims: [],
      metrics: [],
      money_signals: [],
      events: [],
      relationships: [],
      observations: [{
        observation_id: 'obs_badbadbadbadbadbadbadbad',
        observation_type: 'public_fact.v1',
        entity_ids: [entityId],
        origin_type: 'reported',
        verification_status: 'SUPPORTED',
        observed_at: '2026-09-25T04:42:00Z',
        evidence_ids: [evidenceId],
        text: 'Ownership interest',
        public_display: {
          title: 'Ownership interest',
          subject: 'Joint venture',
          facts: [{ label: 'Apollo-managed funds / affiliates', value: 41.5, suffix: '%' }],
          source_label: 'Source',
          source_urls: ['http://example.com/not-allowed'],
        },
      }],
      derived: [],
    }, baseSummary);

    expect(detail.observations[0].publicDisplay).toBeUndefined();
  });
});
