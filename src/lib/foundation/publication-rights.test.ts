import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AUTO_PUBLIC_FACT_POLICIES,
  PUBLIC_OBSERVATION_TYPE_POLICIES,
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

  it('allows SEC EDGAR evidence after the pinned upstream policy is approved', () => {
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
    expect(assessment.status).toBe('ALLOWED');
    expect(assessment.allowedEvidenceIds).toEqual(['ev_1234567890abcdef12345678']);
  });

  it('allows explicit SEC policy with provider-root source identity when evidence is inside the reviewed EDGAR path', () => {
    const input = bundle(
      'rights.sec-edgar-public-facts.v1',
      'metadata_only',
      'SUPPORTED',
      'src.sec-edgar',
      'https://www.sec.gov/Archives/edgar/data/1711929/example.htm',
    );
    input.sources[0].provider_name = 'U.S. Securities and Exchange Commission';
    input.sources[0].source_type = 'regulatory_filing';
    input.sources[0].canonical_url = 'https://www.sec.gov/';
    input.evidence[0].source_type = 'regulatory_filing';

    const assessment = assessCommercialPublicProjection(input);
    expect(assessment.status).toBe('ALLOWED');
    expect(assessment.allowedEvidenceIds).toEqual(['ev_1234567890abcdef12345678']);
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

  it('publishes only the approved Starwood/Apollo percentage fields after SEC approval', () => {
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
    expect(projected.assessment.status).toBe('ALLOWED');
    expect(projected.bundle).not.toBeNull();
    const projectedObservations = projected.bundle?.observations as unknown[] | undefined;
    expect(projectedObservations).toHaveLength(1);
    expect(projectedObservations?.[0]).toMatchObject({
      observation_type: 'starwood_apollo.minority_equity_recapitalization.v1',
      public_payload: {
        apollo_equity_interest_percent: 41.5,
        starwood_equity_interest_percent: 58.5,
      },
    });
    expect(JSON.stringify(projected.bundle)).not.toContain('internal_note');
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

  it('projects the verified material transaction facts without exposing unknowns or source prose', async () => {
    const eightKUrl =
      'https://www.sec.gov/Archives/edgar/data/1711929/000119312526332741/ck0001711929-20260803.htm';
    const quarterlyUrl =
      'https://www.sec.gov/Archives/edgar/data/1711929/000119312526351388/ck0001711929-20260813.htm';
    const input = JSON.parse(readFileSync(
      'src/lib/foundation/fixtures/real-starwood-apollo-2026-09-26-research-bundle-v1.json',
      'utf8',
    )) as Record<string, unknown>;
    const inputObservations = input.observations as Record<string, unknown>[];
    const transport = inputObservations.find(
      (row) => row.observation_type === 'transport.typed_record_set_v1',
    );
    const typedRecordSet = transport?.transport_typed_record_set_v1 as Record<string, unknown>;

    const projected = buildCommercialPublicFactProjection(input, typedRecordSet);
    expect(projected.assessment.status).toBe('ALLOWED');
    const projectedObservations = projected.bundle?.observations as unknown[] | undefined;
    expect(projectedObservations).toHaveLength(1);
    expect(projectedObservations?.[0]).toMatchObject({
      observation_id: 'obs_3b978269d9ec6eba82dc1f9b',
      observation_type: 'starwood_apollo.verify_reconcile.material_transaction_terms.v1',
      entity_ids: [
        'ent_org_0e1d9b556075d9fc7f36',
        'ent_org_4a819d424adf6b2a118f',
      ],
      public_payload: {
        apollo_managed_funds_equity_percent: 41.5,
        starwood_sreit_equity_percent: 58.5,
        apollo_investment_usd: 1020000000,
        approximate_property_count: 120,
        call_option_irr_cap_percent_years_5_to_10: 7,
        starwood_retains_asset_management_and_operational_control: true,
        proceeds_intended_to_repay_credit_facilities: true,
      },
      public_display: {
        source_label: 'SEC filing',
        source_urls: [eightKUrl, quarterlyUrl],
      },
    });

    const serialized = JSON.stringify(projected.bundle?.observations);
    expect(serialized).not.toContain('rising_minimum_yield_guarantee');
    expect(serialized).not.toContain('exact_joint_venture_legal_name');
    expect(serialized).not.toContain('exact_apollo_investing_legal_entities');
    expect(serialized).not.toContain('Private source prose');
    expect(serialized).not.toContain('source_prose');
    expect(serialized).not.toContain('currency');
  });

  it('fails closed when the exact typed subject, either target entity, or evidence binding differs', async () => {
    const fixturePath =
      'src/lib/foundation/fixtures/real-starwood-apollo-2026-09-26-research-bundle-v1.json';
    const base = JSON.parse(readFileSync(fixturePath, 'utf8')) as Record<string, unknown>;
    const observations = base.observations as Record<string, unknown>[];
    const transport = observations.find(
      (row) => row.observation_type === 'transport.typed_record_set_v1',
    )!;
    const typedRecordSet = transport.transport_typed_record_set_v1 as Record<string, unknown>;

    const wrongSubject = structuredClone(typedRecordSet);
    wrongSubject.subject_ref = 'case:unrelated';
    expect(buildCommercialPublicFactProjection(base, wrongSubject).bundle).toBeNull();

    const missingEntity = structuredClone(base);
    missingEntity.entities = (missingEntity.entities as Record<string, unknown>[])
      .filter((entity) => entity.entity_id !== 'ent_org_4a819d424adf6b2a118f');
    expect(buildCommercialPublicFactProjection(missingEntity, typedRecordSet).bundle).toBeNull();

    const mismatchedEvidence = structuredClone(base);
    const apollo = (mismatchedEvidence.entities as Record<string, unknown>[])
      .find((entity) => entity.entity_id === 'ent_org_4a819d424adf6b2a118f')!;
    apollo.evidence_ids = ['ev_8ab84a0f3b532a7171d1a6d4'];
    expect(buildCommercialPublicFactProjection(mismatchedEvidence, typedRecordSet).bundle).toBeNull();
    // Repeated IDs cannot masquerade as the complete two-source evidence set.
    apollo.evidence_ids = ['ev_8ab84a0f3b532a7171d1a6d4', 'ev_8ab84a0f3b532a7171d1a6d4'];
    expect(buildCommercialPublicFactProjection(mismatchedEvidence, typedRecordSet).bundle).toBeNull();
    // Compare original evidence before public-rights filtering can erase a mismatch.
    apollo.evidence_ids = [
      'ev_8ab84a0f3b532a7171d1a6d4', 'ev_f841248a66756d400605f3ac', 'ev_unapproved',
    ];
    expect(buildCommercialPublicFactProjection(mismatchedEvidence, typedRecordSet).bundle).toBeNull();

  });

  it('associates only the two contract-named entities, never an unrelated third entity', async () => {
    const input = JSON.parse(readFileSync(
      'src/lib/foundation/fixtures/real-starwood-apollo-2026-09-26-research-bundle-v1.json',
      'utf8',
    )) as Record<string, unknown>;
    const evidenceIds = [
      'ev_8ab84a0f3b532a7171d1a6d4',
      'ev_f841248a66756d400605f3ac',
    ];
    (input.entities as Record<string, unknown>[]).push({
      entity_id: 'ent_org_aaaaaaaaaaaaaaaaaaaa',
      entity_type: 'organization',
      canonical_name: 'Unrelated Organization',
      aliases: [],
      canonical_identifier: null,
      domain: null,
      status: null,
      observed_at: '2026-09-25T22:28:24Z',
      evidence_ids: evidenceIds,
    });
    const transport = (input.observations as Record<string, unknown>[]).find(
      (row) => row.observation_type === 'transport.typed_record_set_v1',
    )!;
    const typedRecordSet = transport.transport_typed_record_set_v1 as Record<string, unknown>;

    const projected = buildCommercialPublicFactProjection(input, typedRecordSet);
    const observation = (projected.bundle?.observations as Record<string, unknown>[])[0];
    expect(observation.entity_ids).toEqual([
      'ent_org_0e1d9b556075d9fc7f36',
      'ent_org_4a819d424adf6b2a118f',
    ]);
    expect(observation.entity_ids).not.toContain('ent_org_aaaaaaaaaaaaaaaaaaaa');
  });

  it('withholds material transaction terms when a required ownership percentage is invalid', () => {
    const input = bundle(
      'rights.sec-edgar-public-facts.v1',
      'metadata_only',
      'SUPPORTED',
      'src.sec-edgar',
      'https://www.sec.gov/Archives/edgar/data/1711929/000119312526332741/ck0001711929-20260803.htm',
    );
    input.sources[0].provider_name = 'U.S. Securities and Exchange Commission';
    input.sources[0].source_type = 'regulatory_filing';
    input.evidence[0].source_type = 'regulatory_filing';
    const observation = input.observations[0] as unknown as Record<string, unknown>;
    observation.observation_type =
      'starwood_apollo.verify_reconcile.material_transaction_terms.v1';
    observation.payload = {
      apollo_equity_percent: 101,
      starwood_equity_percent: 58.5,
      apollo_investment_usd: 1020000000,
    };

    const projected = buildCommercialPublicFactProjection(input);
    expect(projected.bundle?.observations).toEqual([]);
  });

  it('registers the new material transaction contract only for the approved SEC policy', async () => {
    const registry = (await import('../../../data/foundation-public-observation-contracts.json')).default;
    const contract = registry.contracts.find(
      (entry) => entry.observation_type ===
        'starwood_apollo.verify_reconcile.material_transaction_terms.v1',
    );
    expect(contract?.status).toBe('approved');
    expect('allowed_policy_ids' in (contract || {}) ? contract?.allowed_policy_ids : []).toEqual([
      'rights.sec-edgar-public-facts.v1',
    ]);
    expect(contract?.fields).toHaveLength(7);
    expect(contract?.fields.slice(0, 2).every((field) => field.required)).toBe(true);
    expect(PUBLIC_OBSERVATION_TYPE_POLICIES[
      'starwood_apollo.verify_reconcile.material_transaction_terms.v1'
    ]?.entityAssociation).toEqual({
      typedSubjectRef: 'case:starwood-sreit-apollo-affordable-housing-jv-liquidity-recapitalization:2026',
      entities: [
        {
          entityId: 'ent_org_0e1d9b556075d9fc7f36',
          canonicalName: 'Starwood Real Estate Income Trust, Inc.',
        },
        {
          entityId: 'ent_org_4a819d424adf6b2a118f',
          canonicalName: 'Apollo Global Management',
        },
      ],
    });
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

describe('three-tier publication rights (owner decision 2026-09-29)', () => {
  const evidenceId = 'ev_1234567890abcdef12345678';
  type Loose = Record<string, unknown>;

  function tier2Bundle(policyId: string | null, status = 'metadata_only') {
    const input = bundle(policyId, status, 'SUPPORTED', 'src.indiehackers', 'https://www.indiehackers.com/product/example-tool');
    input.sources[0].provider_name = 'Indie Hackers';
    input.sources[0].source_type = 'case_studies';
    input.sources[0].canonical_url = 'https://www.indiehackers.com/';
    input.evidence[0].source_type = 'case_studies';
    (input.evidence[0] as Loose).published_at = '2025-03-01T00:00:00Z';
    return input;
  }

  function officialBundle(domain: string | null, options: { bindEvidence?: boolean; evidenceUrl?: string; policyId?: string | null } = {}) {
    const input = bundle(
      options.policyId === undefined ? 'rights.official-company-website.v1' : options.policyId,
      options.policyId === undefined ? 'metadata_only' : 'pending_review',
      'SUPPORTED',
      'src.official-company-website',
      options.evidenceUrl ?? 'https://www.example-tool.com/pricing',
    );
    input.sources[0].provider_name = 'Example Tool (official site)';
    input.sources[0].source_type = 'official_pricing_page';
    input.sources[0].canonical_url = 'https://www.example-tool.com/';
    input.evidence[0].source_type = 'official_pricing_page';
    (input.entities[0] as Loose).domain = domain;
    if (options.bindEvidence === false) input.entities[0].evidence_ids = [];
    return input;
  }

  it('pins Tier 1 automatic and Tier 2 facts-only policies from the regenerated snapshot', () => {
    expect(AUTO_PUBLIC_FACT_POLICIES.get('rights.e-stat.v1')?.displayTier).toBe('automatic');
    expect(AUTO_PUBLIC_FACT_POLICIES.get('rights.indiehackers.v2')).toMatchObject({
      displayTier: 'facts_only',
      sourceId: 'src.indiehackers',
      hostScope: 'suffix',
      allowedHostSuffixes: ['indiehackers.com'],
    });
    expect(AUTO_PUBLIC_FACT_POLICIES.get('rights.indiehackers.v2')?.attribution).toContain('self-reported');
    expect(AUTO_PUBLIC_FACT_POLICIES.get('rights.official-company-website.v1')).toMatchObject({
      displayTier: 'automatic',
      hostScope: 'entity_domain',
      allowedHostSuffixes: [],
    });
    for (const held of [
      'rights.indiehackers.v1', 'rights.ebizfacts.v1', 'rights.linkedin.v1',
      'rights.paywalled-and-private.v1', 'rights.eurostat.v1', 'rights.techcrunch.v1',
    ]) {
      expect(AUTO_PUBLIC_FACT_POLICIES.has(held)).toBe(false);
    }
  });

  it('admits an explicit Tier 2 policy for facts only and strips source prose from the projected evidence', () => {
    const projected = buildCommercialPublicFactProjection(tier2Bundle('rights.indiehackers.v2'));
    expect(projected.assessment.status).toBe('ALLOWED');
    expect(projected.assessment.attributionRequiredEvidenceIds).toEqual([evidenceId]);
    const evidence = projected.bundle?.evidence as Loose[];
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).not.toHaveProperty('summary');
    expect(evidence[0].public_attribution).toMatchObject({
      display_tier: 'facts_only',
      provider_name: 'Indie Hackers',
      source_url: 'https://www.indiehackers.com/product/example-tool',
      published_at: '2025-03-01T00:00:00Z',
    });
    expect(JSON.stringify(projected.bundle)).not.toContain('source summary not for public projection');
    const warnings = (projected.bundle?.quality as { warnings: string[] }).warnings;
    expect(warnings.some((warning) => warning.includes('facts-only (Tier 2)'))).toBe(true);
  });

  it('leaves Tier 1 evidence untouched by the facts-only projection', () => {
    const projected = buildCommercialPublicFactProjection(bundle('rights.e-stat.v1'));
    expect(projected.assessment.attributionRequiredEvidenceIds).toEqual([]);
    const evidence = projected.bundle?.evidence as Loose[];
    expect(evidence[0]).not.toHaveProperty('public_attribution');
  });

  it('registry-resolves a pending Tier 2 source only from its exact provider identity and host', () => {
    const assessment = assessCommercialPublicProjection(tier2Bundle(null, 'pending_review'));
    expect(assessment.status).toBe('ALLOWED');
    expect(assessment.attributionRequiredEvidenceIds).toEqual([evidenceId]);

    const wrongHost = tier2Bundle(null, 'pending_review');
    wrongHost.evidence[0].source_url = 'https://medium.com/@someone/example-tool';
    expect(assessCommercialPublicProjection(wrongHost).status).toBe('RIGHTS_HELD');

    const wrongProvider = tier2Bundle(null, 'pending_review');
    wrongProvider.sources[0].provider_name = 'Someone else';
    expect(assessCommercialPublicProjection(wrongProvider).status).toBe('RIGHTS_HELD');
  });

  it('keeps the superseded v1 policies and blocked providers RIGHTS_HELD', () => {
    const v1 = assessCommercialPublicProjection(tier2Bundle('rights.indiehackers.v1'));
    expect(v1.status).toBe('RIGHTS_HELD');
    expect(v1.reasons).toContain('policy is not auto-approved for commercial fact display: rights.indiehackers.v1');

    const linkedin = bundle('rights.linkedin.v1', 'metadata_only', 'SUPPORTED', 'src.linkedin', 'https://www.linkedin.com/in/someone');
    expect(assessCommercialPublicProjection(linkedin).status).toBe('RIGHTS_HELD');
    expect(assessCommercialPublicProjection(bundle('rights.paywalled-and-private.v1')).status).toBe('RIGHTS_HELD');
  });

  it('admits official-website evidence only on the domain registered on the entity that binds it', () => {
    const allowed = assessCommercialPublicProjection(officialBundle('example-tool.com'));
    expect(allowed.status).toBe('ALLOWED');
    expect(allowed.attributionRequiredEvidenceIds).toEqual([]);
    expect(assessCommercialPublicProjection(officialBundle('www.example-tool.com')).status).toBe('ALLOWED');

    expect(assessCommercialPublicProjection(officialBundle('other-company.com')).status).toBe('RIGHTS_HELD');
    expect(assessCommercialPublicProjection(officialBundle(null)).status).toBe('RIGHTS_HELD');
    expect(assessCommercialPublicProjection(officialBundle('example-tool.com', { bindEvidence: false })).status).toBe('RIGHTS_HELD');

    const offDomain = assessCommercialPublicProjection(
      officialBundle('example-tool.com', { evidenceUrl: 'https://example-tool.medium.com/pricing' }),
    );
    expect(offDomain.status).toBe('RIGHTS_HELD');
    expect(offDomain.reasons).toContain(
      'official-website evidence is not bound to an entity whose registered domain serves the evidence URL',
    );
  });

  it('never registry-infers the entity-bound official-website policy without an explicit policy id', () => {
    expect(assessCommercialPublicProjection(officialBundle('example-tool.com', { policyId: null })).status).toBe('RIGHTS_HELD');
  });
});
