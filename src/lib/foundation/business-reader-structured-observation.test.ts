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
      sources: [{
        source_id: 'src.test.official',
        provider_name: 'Structured Demo',
        source_type: 'official_release',
        canonical_url: 'https://example.com/report',
        source_strength: 'A',
        rights_status: 'metadata_only',
        rights_policy_id: 'rights.test.v1',
      }],
      evidence: [{
        evidence_id: 'ev_1234567890abcdef12345678',
        source_id: 'src.test.official',
        source_url: 'https://example.com/report',
        source_title: 'Structured Demo report',
        source_type: 'official_release',
        publisher_or_speaker: 'Structured Demo',
        published_at: '2026-09-24T13:00:00Z',
        retrieved_at: '2026-09-24T13:29:00Z',
        source_strength: 'A',
        rights_status: 'metadata_only',
        rights_policy_id: 'rights.test.v1',
        summary: 'Official structured evidence.',
        extracted_facts: ['Revenue was reported.'],
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
      quality: {
        unknowns: ['margin remains unknown'],
        conflicts: ['revenue timing differs across disclosures'],
        warnings: ['verify next filing'],
        schema_validation: 'PASS',
      },
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
    expect(detail.sources).toEqual([expect.objectContaining({
      id: 'src.test.official',
      providerName: 'Structured Demo',
      rightsPolicyId: 'rights.test.v1',
    })]);
    expect(detail.evidence).toEqual([expect.objectContaining({
      id: 'ev_1234567890abcdef12345678',
      sourceId: 'src.test.official',
      summary: 'Official structured evidence.',
      extractedFacts: ['Revenue was reported.'],
    })]);
    expect(detail.quality).toEqual({
      unknowns: ['margin remains unknown'],
      conflicts: ['revenue timing differs across disclosures'],
      warnings: ['verify next filing'],
      schemaValidation: 'PASS',
    });
  });
});
