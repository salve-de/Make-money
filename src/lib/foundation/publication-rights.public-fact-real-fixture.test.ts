import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APPROVED_PUBLIC_FACT_TYPE_POLICIES } from './public-fact';
import { buildCommercialPublicFactProjection } from './publication-rights';
import { typedRecordSetFromCanonicalBundle } from './make-money-view';

type JsonObject = Record<string, unknown>;

describe('real 2026-09-25 Starwood VERIFY PublicFact projection', () => {
  it('projects the new verified ownership facts through the pinned fact-type and SEC rights snapshots', () => {
    const typed = JSON.parse(readFileSync(
      'src/lib/foundation/fixtures/real-starwood-apollo-sec-verify-typed-record-set-v1.json',
      'utf8',
    )) as JsonObject;

    const provenance = typed.provenance as JsonObject;
    const bundle: JsonObject = {
      schema_version: 'research-bundle.v1',
      run_id: 'run_handoff_starwood_verify_public_fact_test',
      purpose: typed.purpose,
      subject: typed.subject,
      agent: provenance.agent,
      retrieved_at: provenance.retrieved_at,
      sources: typed.sources,
      evidence: typed.evidence,
      entities: typed.entities,
      claims: [],
      metrics: [],
      money_signals: [],
      events: [],
      relationships: [],
      observations: [],
      derived: [],
      quality: {
        unknowns: [],
        conflicts: [],
        warnings: [],
        schema_validation: 'PASS',
      },
    };

    expect(APPROVED_PUBLIC_FACT_TYPE_POLICIES.has(
      'fact.ownership_interest_percent.v1',
    )).toBe(true);

    const projected = buildCommercialPublicFactProjection(bundle, typed);
    expect(projected.assessment.status).toBe('ALLOWED');
    expect(projected.assessment.allowedEvidenceIds).toEqual([
      'ev_7ae5d69d366464c6d71875e3',
      'ev_7cce2783f40d59a93ec718ff',
    ]);
    expect(projected.bundle).not.toBeNull();

    const observations = projected.bundle?.observations as JsonObject[];
    expect(observations).toHaveLength(2);
    expect(observations.every((row) => row.observation_type === 'public_fact.v1')).toBe(true);
    expect(observations.every((row) => row.observed_at === '2026-09-25T04:42:00Z')).toBe(true);

    const values = observations
      .map((row) => ((row.public_payload as JsonObject).value as JsonObject).value)
      .sort((left, right) => Number(left) - Number(right));
    expect(values).toEqual([41.5, 58.5]);

    const payloads = observations.map((row) => row.public_payload as JsonObject);
    expect(payloads).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fact_type_id: 'fact.ownership_interest_percent.v1',
        target_entity_id: 'ent_org_4a819d424adf6b2a118f',
        value: { kind: 'percentage', value: 41.5 },
      }),
      expect.objectContaining({
        fact_type_id: 'fact.ownership_interest_percent.v1',
        target_entity_id: 'ent_org_0e1d9b556075d9fc7f36',
        value: { kind: 'percentage', value: 58.5 },
      }),
    ]));

    const serialized = JSON.stringify(observations);
    expect(serialized).not.toContain('starwood_apollo.verify_reconcile.core_transaction_and_return_terms.v1');
    expect(serialized).not.toContain('typed-record-set.v1 transport envelope');
    expect(serialized).not.toContain('exact_apollo_investing_entities');


  it('extracts and projects the exact mapper-v4 candidate from automation-research', () => {
    const candidate = JSON.parse(readFileSync(
      'src/lib/foundation/fixtures/real-starwood-apollo-sec-mapper-v4-candidate.json',
      'utf8',
    )) as JsonObject;

    expect(candidate.run_id).toBe('run_handoff_c9e926361e9472f5085323dc727be7ff');
    const candidateObservations = candidate.observations as JsonObject[];
    expect(candidateObservations.some(
      (row) => row.observation_id === 'obs_62caf68d0af2a7f659bf0b5a',
    )).toBe(true);

    const extracted = typedRecordSetFromCanonicalBundle(candidate) as JsonObject;
    expect(extracted.source_run_id).toBe('run_verify_canary_starwood_20260925044005');
    expect(extracted.subject_ref).toBe(
      'case:starwood-sreit-apollo-affordable-housing-jv-liquidity-recapitalization:2026',
    );

    const projected = buildCommercialPublicFactProjection(candidate, extracted);
    expect(projected.assessment.status).toBe('ALLOWED');
    expect(projected.bundle?.run_id).toBe('run_handoff_c9e926361e9472f5085323dc727be7ff');

    const observations = projected.bundle?.observations as JsonObject[];
    expect(observations).toHaveLength(2);
    const values = observations
      .map((row) => ((row.public_payload as JsonObject).value as JsonObject).value)
      .sort((left, right) => Number(left) - Number(right));
    expect(values).toEqual([41.5, 58.5]);

    const evidenceIds = observations
      .flatMap((row) => (row.evidence_ids as string[]) || [])
      .filter((value, index, values) => values.indexOf(value) === index)
      .sort();
    expect(evidenceIds).toEqual([
      'ev_7ae5d69d366464c6d71875e3',
      'ev_7cce2783f40d59a93ec718ff',
    ]);

    const sourceUrls = observations
      .flatMap((row) => ((row.public_display as JsonObject).source_urls as string[]) || [])
      .filter((value, index, values) => values.indexOf(value) === index)
      .sort();
    expect(sourceUrls).toEqual([
      'https://www.sec.gov/Archives/edgar/data/1711929/000119312526332741/ck0001711929-20260803.htm',
      'https://www.sec.gov/Archives/edgar/data/1711929/000119312526332795/ck0001711929-20260804.htm',
    ]);
  });
  });
});
