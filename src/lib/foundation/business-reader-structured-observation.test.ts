import { describe, expect, it } from 'vitest';
import { buildFoundationBusinessCaseForEntity } from './business-reader';

describe('structured Foundation observations', () => {
  it('preserves arbitrary typed observation payloads for serving views and API consumers', () => {
    const entityId = 'ent_organization_1234567890abcdef1234';
    const detail = buildFoundationBusinessCaseForEntity({
      schema_version: 'research-bundle.v1',
      run_id: 'run_structured_observation',
      retrieved_at: '2026-09-24T13:30:00Z',
      entities: [{
        entity_id: entityId,
        entity_type: 'organization',
        canonical_name: 'Structured Demo',
        aliases: [],
        canonical_identifier: null,
        domain: 'example.com',
        status: 'active',
        observed_at: '2026-09-24T13:29:00Z',
        evidence_ids: ['ev_1234567890abcdef12345678'],
      }],
      claims: [],
      metrics: [],
      money_signals: [],
      events: [],
      relationships: [],
      observations: [{
        observation_id: 'obs_1234567890abcdef12345678',
        observation_type: 'business_model.revenue_signal',
        entity_ids: [entityId],
        origin_type: 'reported',
        verification_status: 'SUPPORTED',
        observed_at: '2026-09-24T13:29:00Z',
        collection_channel: 'web',
        observer: 'DISCOVERY',
        evidence_ids: ['ev_1234567890abcdef12345678'],
        payload_schema_ref: 'urn:test:structured:v1',
        text: 'Revenue signal',
        payload: {
          amount: 123000000,
          currency: 'USD',
          nested: {
            arbitrary_future_field: true,
          },
        },
      }],
      derived: [],
    }, {
      id: entityId,
      name: 'Structured Demo',
      entityType: 'organization',
      aliases: [],
      canonicalIdentifier: null,
      domain: 'example.com',
      status: 'active',
      observedAt: '2026-09-24T13:29:00Z',
      evidenceIds: ['ev_1234567890abcdef12345678'],
    });

    expect(detail.observations).toHaveLength(1);
    expect(detail.observations[0]).toMatchObject({
      kind: 'business_model.revenue_signal',
      observer: 'DISCOVERY',
      payloadSchemaRef: 'urn:test:structured:v1',
      payload: {
        amount: 123000000,
        currency: 'USD',
        nested: {
          arbitrary_future_field: true,
        },
      },
    });
  });
});
