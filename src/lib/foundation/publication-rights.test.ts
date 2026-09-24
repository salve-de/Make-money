import { describe, expect, it } from 'vitest';
import {
  assessCommercialPublicProjection,
  buildCommercialPublicFactProjection,
} from './publication-rights';

function bundle(policyId: string | null, status = 'metadata_only', verification = 'SUPPORTED') {
  return {
    schema_version: 'research-bundle.v1',
    run_id: 'run_test',
    purpose: 'make_money',
    subject: { query: 'Test' },
    agent: { name: 'test' },
    retrieved_at: '2026-09-24T00:00:00Z',
    sources: [{
      source_id: 'src.e-stat',
      provider_name: 'e-Stat',
      source_type: 'official_statistics',
      canonical_url: 'https://www.e-stat.go.jp/',
      source_strength: 'S',
      rights_status: status,
      rights_policy_id: policyId,
    }],
    evidence: [{
      evidence_id: 'ev_1234567890abcdef12345678',
      source_id: 'src.e-stat',
      source_url: 'https://www.e-stat.go.jp/',
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
      text: 'Free-form source-derived narrative must not enter public fact projection.',
      origin_type: 'reported',
      verification_status: 'SUPPORTED',
      evidence_ids: ['ev_1234567890abcdef12345678'],
    }],
    derived: [],
    quality: { unknowns: [], conflicts: [], warnings: [], schema_validation: 'PASS' },
  };
}

describe('commercial publication rights gate', () => {
  it('holds evidence with no registered public rights policy', () => {
    const assessment = assessCommercialPublicProjection(bundle(null));
    expect(assessment.status).toBe('RIGHTS_HELD');
    expect(assessment.reasons).toContain('evidence lacks rights_policy_id');
  });

  it('admits supported factual records for an auto-approved policy and drops free-form observations', () => {
    const projected = buildCommercialPublicFactProjection(bundle('rights.e-stat.v1'));
    expect(projected.assessment.status).toBe('ALLOWED');
    expect(projected.bundle).not.toBeNull();
    expect(projected.bundle?.claims).toHaveLength(1);
    expect(projected.bundle?.observations).toEqual([]);
  });

  it('does not auto-admit a conditional/restricted provider policy', () => {
    const projected = buildCommercialPublicFactProjection(bundle('rights.eurostat.v1'));
    expect(projected.bundle).toBeNull();
    expect(projected.assessment.status).toBe('RIGHTS_HELD');
  });

  it('requires SUPPORTED facts even when source rights are approved', () => {
    const projected = buildCommercialPublicFactProjection(
      bundle('rights.e-stat.v1', 'metadata_only', 'UNVERIFIED'),
    );
    expect(projected.bundle).toBeNull();
    expect(projected.assessment.reasons).toContain(
      'no SUPPORTED fact record remains after commercial-rights filtering',
    );
  });
});
