import { describe, expect, it } from 'vitest';
import { buildFoundationBusinessCaseForEntity } from './business-reader';

const entityId = 'ent_organization_1234567890abcdef1234';
const evidenceId = 'ev_1234567890abcdef12345678';

function baseBundle(observation: Record<string, unknown>) {
  return {
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
      evidence_ids: [evidenceId],
    }],
    claims: [],
    metrics: [],
    money_signals: [],
    events: [],
    relationships: [],
    observations: [observation],
    derived: [],
  };
}

const baseSummary = {
  id: entityId,
  name: 'Structured Demo',
  entityType: 'organization',
  aliases: [],
  canonicalIdentifier: null,
  domain: 'example.com',
  status: 'active',
  observedAt: '2026-09-24T13:29:00Z',
  evidenceIds: [evidenceId],
};

describe('structured Foundation observations', () => {
  it('does not read raw payload or internal observer/schema metadata', () => {
    const detail = buildFoundationBusinessCaseForEntity(baseBundle({
      observation_id: 'obs_1234567890abcdef12345678',
      observation_type: 'business_model.revenue_signal',
      entity_ids: [entityId],
      origin_type: 'reported',
      verification_status: 'SUPPORTED',
      observed_at: '2026-09-24T13:29:00Z',
      collection_channel: 'web',
      observer: 'DISCOVERY',
      evidence_ids: [evidenceId],
      payload_schema_ref: 'urn:test:raw:v1',
      text: 'Revenue signal',
      payload: {
        raw_secret: 'must-not-cross-public-reader',
      },
    }), baseSummary);

    expect(detail.observations).toHaveLength(1);
    expect(detail.observations[0]).toMatchObject({
      kind: 'business_model.revenue_signal',
      text: 'Revenue signal',
      evidenceIds: [evidenceId],
    });
    expect(detail.observations[0]).not.toHaveProperty('publicPayload');
    expect(detail.observations[0]).not.toHaveProperty('payload');
    expect(detail.observations[0]).not.toHaveProperty('observer');
    expect(detail.observations[0]).not.toHaveProperty('payloadSchemaRef');
  });

  it('reads only validated explicit public_display metadata', () => {
    const detail = buildFoundationBusinessCaseForEntity(baseBundle({
      observation_id: 'obs_displaydisplaydisplay12',
      observation_type: 'business_model.revenue_signal',
      entity_ids: [entityId],
      origin_type: 'reported',
      verification_status: 'SUPPORTED',
      observed_at: '2026-09-24T13:29:00Z',
      evidence_ids: [evidenceId],
      text: 'Reviewed fact',
      public_payload: { amount: 10, currency: 'USD' },
      public_display: {
        title: 'Reviewed fact',
        subject: 'Reviewed subject',
        facts: [{ label: 'Amount', value: 10 }],
        source_label: 'Official source',
        source_urls: ['https://example.com/source'],
      },
    }), baseSummary);

    expect(detail.observations[0].publicDisplay).toEqual({
      title: 'Reviewed fact',
      subject: 'Reviewed subject',
      facts: [{ label: 'Amount', value: 10 }],
      sourceLabel: 'Official source',
      sourceUrls: ['https://example.com/source'],
    });
  });

  it('reads only an explicit bounded public_payload', () => {
    const detail = buildFoundationBusinessCaseForEntity(baseBundle({
      observation_id: 'obs_abcdefabcdefabcdefabcdef',
      observation_type: 'business_model.revenue_signal',
      entity_ids: [entityId],
      origin_type: 'reported',
      verification_status: 'SUPPORTED',
      observed_at: '2026-09-24T13:29:00Z',
      collection_channel: 'web',
      observer: 'DISCOVERY',
      evidence_ids: [evidenceId],
      payload_schema_ref: 'urn:test:raw:v1',
      text: 'Revenue signal',
      payload: { raw_secret: 'must-not-cross-public-reader' },
      public_payload: {
        amount: 123000000,
        currency: 'USD',
        nested: { public_fact: true },
      },
    }), baseSummary);

    expect(detail.observations[0]).toMatchObject({
      kind: 'business_model.revenue_signal',
      publicPayload: {
        amount: 123000000,
        currency: 'USD',
        nested: { public_fact: true },
      },
    });
    expect(detail.observations[0]).not.toHaveProperty('payload');
    expect(detail.observations[0]).not.toHaveProperty('observer');
    expect(detail.observations[0]).not.toHaveProperty('payloadSchemaRef');
  });
});

describe('public_display attribution (Tier 2 facts-only sources, 2026-09-29)', () => {
  function withAttribution(attribution: unknown) {
    return buildFoundationBusinessCaseForEntity(baseBundle({
      observation_id: 'obs_attributionattribution1',
      observation_type: 'public_fact.v1',
      entity_id: entityId,
      origin_type: 'reported',
      verification_status: 'SUPPORTED',
      observed_at: '2025-03-01T00:00:00Z',
      evidence_ids: [evidenceId],
      text: 'Self-reported figure',
      public_payload: { fact_type_id: 'fact.self_reported_business_metric.v1', value: { kind: 'money', amount: 12000, currency: 'USD' } },
      public_display: {
        title: 'Self-reported figure',
        subject: 'Company',
        facts: [{ label: 'Self-reported by Structured Demo', value: 12000, suffix: 'USD' }],
        source_label: 'Indie Hackers',
        source_urls: ['https://www.indiehackers.com/product/example-tool'],
        attribution,
      },
    }), baseSummary);
  }

  it('keeps a validated attribution block on the reader-side display', () => {
    const detail = withAttribution({
      display_tier: 'facts_only',
      provider_name: 'Indie Hackers',
      published_at: '2025-03-01T00:00:00Z',
      retrieved_at: null,
      rule: 'Provider name + canonical URL + publication date.',
      self_reported: true,
    });
    expect(detail.observations[0].publicDisplay).toMatchObject({
      sourceLabel: 'Indie Hackers',
      attribution: {
        displayTier: 'facts_only',
        providerName: 'Indie Hackers',
        publishedAt: '2025-03-01T00:00:00Z',
        rule: 'Provider name + canonical URL + publication date.',
        selfReported: true,
      },
    });
    expect(detail.observations[0].publicDisplay?.attribution).not.toHaveProperty('retrievedAt');
  });

  it('fails closed when the attribution block is malformed', () => {
    expect(withAttribution({ display_tier: 'facts_only' }).observations[0]).not.toHaveProperty('publicDisplay');
    expect(withAttribution({ display_tier: 'public', provider_name: 'X' }).observations[0]).not.toHaveProperty('publicDisplay');
    expect(withAttribution({ display_tier: 'facts_only', provider_name: 'X', published_at: 'yesterday' }).observations[0]).not.toHaveProperty('publicDisplay');
    expect(withAttribution('Indie Hackers').observations[0]).not.toHaveProperty('publicDisplay');
  });
});
