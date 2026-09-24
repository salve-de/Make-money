import { describe, expect, it } from 'vitest';
import {
  assessCommercialPublicProjection,
  buildCommercialPublicFactProjection,
} from './publication-rights';

function bundle(
  policyId: string | null,
  status = 'metadata_only',
  verification = 'SUPPORTED',
  sourceId = 'src.e-stat',
  sourceUrl = 'https://www.e-stat.go.jp/',
) {
  return {
    schema_version: 'research-bundle.v1',
    run_id: 'run_test',
    purpose: 'make_money',
    subject: { query: 'Test' },
    agent: { name: 'test' },
    retrieved_at: '2026-09-24T00:00:00Z',
    sources: [{
      source_id: sourceId,
      provider_name: 'e-Stat',
      source_type: 'official_statistics',
      canonical_url: sourceUrl,
      source_strength: 'S',
      rights_status: status,
      rights_policy_id: policyId,
    }],
    evidence: [{
      evidence_id: 'ev_1234567890abcdef12345678',
      source_id: sourceId,
      source_url: sourceUrl,
      source_title: 'Official stats',
      source_type: 'official_statistics',
      publisher_or_speaker: 'e-Stat',
      published_at: null,
      retrieved_at: '2026-09-24T00:00:00Z',
      source_strength: 'S',
      rights_status: status,
      rights_policy_id: policyId,
      raw_storage: { status: 'metadata_only' },
      summary: 'source summary not for public projection',
    }],
    entities: [{
      entity_id: 'ent_organization_1234567890abcdef1234',
      entity_type: 'organization',
      canonical_name: 'Test Co',
      aliases: [],
      canonical_identifier: null,
      domain: null,
      status: null,
      observed_at: '2026-09-24T00:00:00Z',
      evidence_ids: ['ev_1234567890abcdef12345678'],
    }],
    claims: [{
      claim_id: 'clm_1234567890abcdef12345678',
      entity_ids: ['ent_organization_1234567890abcdef1234'],
      statement: 'A factual statement.',
      origin_type: 'reported',
      verification_status: verification,
      confidence: 1,
      occurred_at: null,
      evidence_ids: ['ev_1234567890abcdef12345678'],
    }],
    metrics: [],
    money_signals: [],
    events: [],
    relationships: [],
    observations: [{
      observation_id: 'obs_1234567890abcdef12345678',
      observation_type: 'business_model.revenue_signal',
      text: 'Free-form source-derived narrative must not enter public fact projection.',
      origin_type: 'reported',
      verification_status: 'SUPPORTED',
      observed_at: '2026-09-24T00:00:00Z',
      collection_channel: 'web',
      observer: 'DISCOVERY',
      payload_schema_ref: 'urn:test:private-schema',
      evidence_ids: ['ev_1234567890abcdef12345678'],
      payload: {
        summary: 'Free-form source-derived narrative must not enter public fact projection.',
        amount: 123000000,
        currency: 'USD',
        internal_note: 'must-not-leak',
        structured: {
          customer_count: 42,
          narrative: 'must-not-leak-either',
        },
      },
    }],
    derived: [],
    quality: { unknowns: [], conflicts: [], warnings: [], schema_validation: 'PASS' },
  };
}

describe('commercial publication rights gate', () => {
  it('uses a commit-pinned Universal Foundation rights/source snapshot', async () => {
    const snapshot = (await import('../../../data/foundation-public-rights-snapshot.json')).default;
    expect(snapshot.source_repository).toBe('salve-de/universal-foundation');
    expect(snapshot.source_commit_sha).toMatch(/^[a-f0-9]{40}$/);
    expect(snapshot.records.length).toBeGreaterThan(0);
    for (const record of snapshot.records) {
      expect(record.policy.source_id).toBe(record.source.source_id);
      expect(record.source.rights_policy_ids).toContain(record.policy.policy_id);
      expect(record.policy.blob_sha).toMatch(/^[a-f0-9]{40}$/);
      expect(record.source.blob_sha).toMatch(/^[a-f0-9]{40}$/);
    }
  });

  it('holds an unknown source when no approved registry identity can resolve it', () => {
    const input = bundle(null, 'pending_review', 'SUPPORTED', 'src.test.primary', 'https://example.com/report');
    const assessment = assessCommercialPublicProjection(input);
    expect(assessment.status).toBe('RIGHTS_HELD');
    expect(assessment.allowedEvidenceIds).toEqual([]);
    expect(assessment.reasons).toContain(
      'evidence source has no uniquely resolved approved rights policy',
    );
  });

  it('resolves null pending_review rights only from an exact approved registry source identity', () => {
    const input = bundle(null, 'pending_review', 'SUPPORTED', 'src.local.estat.dataset');
    const assessment = assessCommercialPublicProjection(input);
    expect(assessment.status).toBe('ALLOWED');
    expect(assessment.allowedEvidenceIds).toEqual(['ev_1234567890abcdef12345678']);

    const projected = buildCommercialPublicFactProjection(input);
    expect(projected.bundle).not.toBeNull();
    expect(projected.bundle?.claims).toHaveLength(1);
  });

  it('never registry-resolves a blocked source/evidence', () => {
    const assessment = assessCommercialPublicProjection(
      bundle(null, 'blocked', 'SUPPORTED', 'src.local.estat.dataset'),
    );
    expect(assessment.status).toBe('RIGHTS_HELD');
    expect(assessment.allowedEvidenceIds).toEqual([]);
    expect(assessment.reasons).toContain('rights_status is blocked');
  });

  it('keeps explicit approved facts eligible across private-raw capture statuses', () => {
    for (const status of ['allowed_private_raw', 'restricted_private_raw']) {
      const input = bundle('rights.e-stat.v1', status);
      const assessment = assessCommercialPublicProjection(input);
      expect(assessment.status).toBe('ALLOWED');
      expect(assessment.allowedEvidenceIds).toEqual(['ev_1234567890abcdef12345678']);
    }
  });

  it('fails closed when the same source_id appears more than once', () => {
    const input = bundle(null, 'pending_review', 'SUPPORTED', 'src.local.estat.dataset');
    input.sources.push({
      ...input.sources[0],
      provider_name: 'Conflicting duplicate',
      canonical_url: 'https://example.com/not-estat',
      rights_status: 'blocked',
    });
    const assessment = assessCommercialPublicProjection(input);
    expect(assessment.status).toBe('RIGHTS_HELD');
    expect(assessment.allowedEvidenceIds).toEqual([]);
  });

  it('does not resolve by official host alone when provider identity is different', () => {
    const input = bundle(null, 'pending_review', 'SUPPORTED', 'src.local.estat.dataset');
    input.sources[0].provider_name = 'Unreviewed mirror';
    const assessment = assessCommercialPublicProjection(input);
    expect(assessment.status).toBe('RIGHTS_HELD');
    expect(assessment.allowedEvidenceIds).toEqual([]);
  });

  it('does not resolve a source type outside the approved registry contract', () => {
    const input = bundle(null, 'pending_review', 'SUPPORTED', 'src.local.estat.dataset');
    input.sources[0].source_type = 'secondary_reporting';
    input.evidence[0].source_type = 'secondary_reporting';
    const assessment = assessCommercialPublicProjection(input);
    expect(assessment.status).toBe('RIGHTS_HELD');
    expect(assessment.allowedEvidenceIds).toEqual([]);
  });

  it('keeps SEC EDGAR evidence held while the upstream rights policy is still pending review', () => {
    const input = bundle(
      null,
      'pending_review',
      'SUPPORTED',
      'src.sec.starwood_fixture',
      'https://www.sec.gov/Archives/edgar/data/1711929/example.htm',
    );
    input.sources[0].provider_name = 'U.S. Securities and Exchange Commission';
    input.sources[0].source_type = 'regulatory_filing';
    input.evidence[0].source_type = 'regulatory_filing';

    const assessment = assessCommercialPublicProjection(input);
    expect(assessment.status).toBe('RIGHTS_HELD');
    expect(assessment.allowedEvidenceIds).toEqual([]);
  });

  it('does not registry-resolve a SEC URL outside the reviewed EDGAR archive path', () => {
    const input = bundle(
      null,
      'pending_review',
      'SUPPORTED',
      'src.sec.non_edgar',
      'https://www.sec.gov/newsroom/press-releases/example',
    );
    input.sources[0].provider_name = 'U.S. Securities and Exchange Commission';
    input.sources[0].source_type = 'regulatory_filing';
    input.evidence[0].source_type = 'regulatory_filing';

    const assessment = assessCommercialPublicProjection(input);
    expect(assessment.status).toBe('RIGHTS_HELD');
    expect(assessment.allowedEvidenceIds).toEqual([]);
  });

  it('keeps the Starwood/Apollo Observation private until its SEC policy is formally approved', () => {
    const input = bundle(
      null,
      'pending_review',
      'SUPPORTED',
      'src.sec.starwood_fixture',
      'https://www.sec.gov/Archives/edgar/data/1711929/example.htm',
    );
    input.sources[0].provider_name = 'U.S. Securities and Exchange Commission';
    input.sources[0].source_type = 'regulatory_filing';
    input.evidence[0].source_type = 'regulatory_filing';
    const observation = input.observations[0] as unknown as Record<string, unknown>;
    observation.observation_type =
      'starwood_apollo.minority_equity_recapitalization.v1';
    observation.payload = {
      apollo_investment: { equity_interest_percent: 41.5 },
      starwood_position: { equity_interest_percent: 58.5 },
    };

    const projected = buildCommercialPublicFactProjection(input);
    expect(projected.bundle).toBeNull();
    expect(projected.assessment.status).toBe('RIGHTS_HELD');
  });

  it('records the Starwood display contract as SEC-policy-bound and percentage-only', async () => {
    const registry = (await import('../../../data/foundation-public-observation-contracts.json')).default;
    const starwood = registry.contracts.find(
      (contract) => contract.observation_type ===
        'starwood_apollo.minority_equity_recapitalization.v1',
    );
    expect(starwood?.status).toBe('approved');
    expect('allowed_policy_ids' in (starwood || {}) ? starwood?.allowed_policy_ids : []).toEqual([
      'rights.sec-edgar-public-facts.v1',
    ]);
    expect(starwood?.fields).toEqual([
      {
        source_path: ['apollo_investment', 'equity_interest_percent'],
        public_path: ['apollo_equity_interest_percent'],
        kind: 'percentage',
        required: true,
      },
      {
        source_path: ['starwood_position', 'equity_interest_percent'],
        public_path: ['starwood_equity_interest_percent'],
        kind: 'percentage',
        required: true,
      },
    ]);
    expect('display' in (starwood || {}) ? starwood?.display?.facts : []).toEqual([
      {
        public_path: ['apollo_equity_interest_percent'],
        label: 'Apollo-managed funds / affiliates',
        suffix: '%',
      },
      {
        public_path: ['starwood_equity_interest_percent'],
        label: 'Starwood SREIT',
        suffix: '%',
      },
    ]);
  });

  it('uses a data-driven approved Observation contract registry', async () => {
    const registry = (await import('../../../data/foundation-public-observation-contracts.json')).default;
    expect(registry.schema_version).toBe('make-money-public-observation-contracts.v1');
    const revenue = registry.contracts.find(
      (contract) => contract.observation_type === 'business_model.revenue_signal',
    );
    expect(revenue?.status).toBe('approved');
    expect(revenue?.fields).toEqual([
      { source_path: ['amount'], kind: 'finite_number', required: true },
      { source_path: ['currency'], kind: 'currency_code', required: true },
    ]);
  });

  it('admits an approved Observation only as an explicit fact-only public DTO', () => {
    const projected = buildCommercialPublicFactProjection(bundle('rights.e-stat.v1'));
    expect(projected.assessment.status).toBe('ALLOWED');
    expect(projected.bundle).not.toBeNull();
    expect(projected.bundle?.claims).toHaveLength(1);
    expect(projected.bundle?.observations).toEqual([{
      observation_id: 'obs_1234567890abcdef12345678',
      observation_type: 'business_model.revenue_signal',
      origin_type: 'reported',
      verification_status: 'SUPPORTED',
      observed_at: '2026-09-24T00:00:00Z',
      evidence_ids: ['ev_1234567890abcdef12345678'],
      text: 'business_model.revenue_signal · amount=123000000 · currency=USD',
      public_payload: {
        amount: 123000000,
        currency: 'USD',
      },
    }]);

    const serialized = JSON.stringify(projected.bundle?.observations);
    expect(serialized).not.toContain('Free-form source-derived narrative');
    expect(serialized).not.toContain('must-not-leak');
    expect(serialized).not.toContain('DISCOVERY');
    expect(serialized).not.toContain('urn:test:private-schema');
    expect(serialized).not.toContain('"payload"');
    expect(serialized).not.toContain('customer_count');
  });

  it('fails closed for an unknown numeric field even with approved Evidence', () => {
    const input = bundle('rights.e-stat.v1');
    const observation = input.observations[0] as unknown as Record<string, unknown>;
    observation.payload = {
      account_number: 123456789012,
      currency: 'USD',
    };

    const projected = buildCommercialPublicFactProjection(input);
    expect(projected.bundle).not.toBeNull();
    expect(projected.bundle?.observations).toEqual([]);

    const serialized = JSON.stringify(projected.bundle?.observations);
    expect(serialized).not.toContain('account_number');
    expect(serialized).not.toContain('123456789012');
  });

  it('fails closed for unknown boolean and string fields on a registered Observation type', () => {
    const input = bundle('rights.e-stat.v1');
    const observation = input.observations[0] as unknown as Record<string, unknown>;
    observation.payload = {
      amount: 123,
      currency: 'USD',
      is_private_customer: true,
      customer_name: 'Secret Customer',
    };

    const projected = buildCommercialPublicFactProjection(input);
    expect(projected.bundle).not.toBeNull();
    const observations = projected.bundle?.observations as Array<Record<string, unknown>>;
    expect(observations).toHaveLength(1);
    expect(observations[0].public_payload).toEqual({
      amount: 123,
      currency: 'USD',
    });

    const serialized = JSON.stringify(projected.bundle?.observations);
    expect(serialized).not.toContain('is_private_customer');
    expect(serialized).not.toContain('customer_name');
    expect(serialized).not.toContain('Secret Customer');
  });

  it('drops a revenue Observation with a non-currency code even when amount is present', () => {
    const input = bundle('rights.e-stat.v1');
    const observation = input.observations[0] as unknown as Record<string, unknown>;
    observation.payload = {
      amount: 123000000,
      currency: '123456789012',
    };

    const projected = buildCommercialPublicFactProjection(input);
    expect(projected.bundle).not.toBeNull();
    expect(projected.bundle?.observations).toEqual([]);

    const serialized = JSON.stringify(projected.bundle?.observations);
    expect(serialized).not.toContain('123456789012');
  });

  it('drops an Observation when only unknown fields remain after type projection', () => {
    const input = bundle('rights.e-stat.v1');
    const observation = input.observations[0] as unknown as Record<string, unknown>;
    observation.payload = {
      account_number: 123456789012,
    };

    const projected = buildCommercialPublicFactProjection(input);
    expect(projected.bundle).not.toBeNull();
    expect(projected.bundle?.observations).toEqual([]);
  });

  it('fails closed for an unregistered Observation type', () => {
    const input = bundle('rights.e-stat.v1');
    const observation = input.observations[0] as unknown as Record<string, unknown>;
    observation.observation_type = 'business_model.future_unknown';
    observation.payload = {
      amount: 999,
      currency: 'USD',
    };

    const projected = buildCommercialPublicFactProjection(input);
    expect(projected.bundle).not.toBeNull();
    expect(projected.bundle?.observations).toEqual([]);
  });

  it('allows an approved structured Observation to be the only surviving public fact', () => {
    const input = bundle('rights.e-stat.v1');
    input.claims = [];
    const projected = buildCommercialPublicFactProjection(input);
    expect(projected.bundle).not.toBeNull();
    expect(projected.bundle?.claims).toEqual([]);
    expect(projected.bundle?.observations).toHaveLength(1);
  });

  it('drops an UNVERIFIED Observation even when the source policy is approved', () => {
    const input = bundle('rights.e-stat.v1');
    input.observations[0].verification_status = 'UNVERIFIED';
    const projected = buildCommercialPublicFactProjection(input);
    expect(projected.bundle).not.toBeNull();
    expect(projected.bundle?.observations).toEqual([]);
  });

  it('holds a conflicting explicit policy/source identity instead of falling back to registry inference', () => {
    const projected = buildCommercialPublicFactProjection(
      bundle('rights.e-stat.v1', 'metadata_only', 'SUPPORTED', 'src.not-e-stat'),
    );
    expect(projected.bundle).toBeNull();
    expect(projected.assessment.status).toBe('RIGHTS_HELD');
    expect(projected.assessment.allowedEvidenceIds).toEqual([]);
  });

  it('holds an approved policy when the source URL is outside its registered host scope', () => {
    const projected = buildCommercialPublicFactProjection(
      bundle('rights.e-stat.v1', 'metadata_only', 'SUPPORTED', 'src.e-stat', 'https://example.com/fake'),
    );
    expect(projected.bundle).toBeNull();
    expect(projected.assessment.status).toBe('RIGHTS_HELD');
  });

  it('does not auto-admit a conditional/restricted provider policy', () => {
    const projected = buildCommercialPublicFactProjection(bundle('rights.eurostat.v1'));
    expect(projected.bundle).toBeNull();
    expect(projected.assessment.status).toBe('RIGHTS_HELD');
  });

  it('allows a rights-cleared record-only enrichment bundle to reach the projector', () => {
    const input = bundle('rights.e-stat.v1');
    input.entities = [];
    const projected = buildCommercialPublicFactProjection(input);
    expect(projected.bundle).not.toBeNull();
    expect(projected.bundle?.entities).toEqual([]);
    expect(projected.bundle?.claims).toHaveLength(1);
  });

  it('requires at least one SUPPORTED public fact even when source rights are approved', () => {
    const input = bundle('rights.e-stat.v1', 'metadata_only', 'UNVERIFIED');
    input.observations[0].verification_status = 'UNVERIFIED';
    const projected = buildCommercialPublicFactProjection(input);
    expect(projected.bundle).toBeNull();
    expect(projected.assessment.reasons).toContain(
      'no SUPPORTED fact record remains after commercial-rights filtering',
    );
  });
});
