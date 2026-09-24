import { describe, expect, it } from 'vitest';
import {
  APPROVED_PUBLIC_FACT_TYPE_POLICIES,
  projectTypedPublicFacts,
  type PublicFactTypePolicy,
} from './public-fact';

const evidenceId = 'ev_1234567890abcdef12345678';
const entityId = 'ent_org_4a819d424adf6b2a118f';
const starwoodEntityId = 'ent_org_0e1d9b556075d9fc7f36';
const policy: PublicFactTypePolicy = {
  factTypeId: 'fact.ownership_interest_percent.v1',
  valueKind: 'percentage',
  allowedScopeTypes: ['joint_venture'],
  allowedActorRelations: ['direct_entity', 'managed_funds_or_affiliates'],
  title: 'Ownership interest',
  relationLabels: {
    direct_entity: 'Direct interest — {target_entity}',
    managed_funds_or_affiliates: 'Funds / affiliates managed by {related_entity}',
  },
  suffix: '%',
};

function typedFact(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: 'typed-record-set.v1',
    subject_ref: 'case:starwood-apollo',
    extensions: {
      'public_facts.v1': {
        schema_version: 'public-fact-output.v1',
        producer_lane: 'VERIFY_RECONCILE',
        facts: [{
          schema_version: 'public-fact.v1',
          fact_id: 'pf_1234567890abcdef12345678',
          fact_type_id: 'fact.ownership_interest_percent.v1',
          subject_ref: 'case:starwood-apollo',
          target_entity_id: entityId,
          context: {
            scope_type: 'joint_venture',
            scope_ref: 'case:starwood-apollo',
            actor_relation: 'managed_funds_or_affiliates',
            related_entity_id: entityId,
          },
          value: { kind: 'percentage', value: 41.5 },
          origin_type: 'reported',
          verification_status: 'SUPPORTED',
          observed_at: '2026-09-23T18:05:00Z',
          evidence_ids: [evidenceId],
          ...overrides,
        }],
      },
    },
  };
}

function project(
  typedRecordSet: unknown,
  options: {
    allowed?: string[];
    policies?: ReadonlyMap<string, PublicFactTypePolicy>;
    entities?: Array<Record<string, unknown>>;
    sourceUrl?: string;
  } = {},
) {
  return projectTypedPublicFacts({
    typedRecordSet,
    allowedEvidenceIds: new Set(options.allowed ?? [evidenceId]),
    sourceUrlByEvidenceId: new Map([
      [evidenceId, options.sourceUrl ?? 'https://www.sec.gov/Archives/edgar/data/1711929/example.htm'],
    ]),
    publicEntities: options.entities ?? [{
      entity_id: entityId,
      canonical_name: 'Apollo Global Management',
    }],
    policies: options.policies ?? new Map([[policy.factTypeId, policy]]),
  });
}

describe('Public Fact v1 consumer projection', () => {
  it('keeps the runtime fact-type registry empty until an upstream approved type is pinned', () => {
    expect(APPROVED_PUBLIC_FACT_TYPE_POLICIES.size).toBe(0);
  });

  it('projects an evidence-cleared verified ownership fact into a bounded public Observation DTO', () => {
    const rows = project(typedFact());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      observation_type: 'public_fact.v1',
      entity_id: entityId,
      verification_status: 'SUPPORTED',
      evidence_ids: [evidenceId],
      public_payload: {
        fact_type_id: 'fact.ownership_interest_percent.v1',
        subject_ref: 'case:starwood-apollo',
        target_entity_id: entityId,
        context: {
          scope_type: 'joint_venture',
          actor_relation: 'managed_funds_or_affiliates',
          related_entity_id: entityId,
        },
        value: { kind: 'percentage', value: 41.5 },
      },
      public_display: {
        title: 'Ownership interest',
        subject: 'Joint venture',
        facts: [{
          label: 'Funds / affiliates managed by Apollo Global Management',
          value: 41.5,
          suffix: '%',
        }],
        source_label: 'Source',
        source_urls: ['https://www.sec.gov/Archives/edgar/data/1711929/example.htm'],
      },
    });

    const serialized = JSON.stringify(rows[0]);
    expect(serialized).not.toContain('raw');
    expect(serialized).not.toContain('quote');
    expect(serialized).not.toContain('summary');
  });

  it('fails closed for an unknown fact type', () => {
    expect(project(typedFact(), { policies: new Map() })).toEqual([]);
  });

  it('fails closed when any evidence is not rights-cleared', () => {
    expect(project(typedFact(), { allowed: [] })).toEqual([]);
  });

  it('supports record-only enrichment when target/related identity comes from an existing public view', () => {
    const rows = project(typedFact(), {
      entities: [{
        entity_id: entityId,
        canonical_name: 'Apollo Global Management',
      }],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].entity_id).toBe(entityId);
  });

  it('fails closed when the target entity has no rights-cleared or already-public identity', () => {
    expect(project(typedFact(), { entities: [] })).toEqual([]);
  });

  it('fails closed when a non-null related entity is not publicly identifiable', () => {
    const fact = typedFact({
      target_entity_id: starwoodEntityId,
      context: {
        scope_type: 'joint_venture',
        scope_ref: 'case:starwood-apollo',
        actor_relation: 'managed_funds_or_affiliates',
        related_entity_id: entityId,
      },
    });
    expect(project(fact, {
      entities: [{
        entity_id: starwoodEntityId,
        canonical_name: 'Starwood SREIT',
      }],
    })).toEqual([]);
  });

  it('allows related_entity_id=null when the reviewed relation renders from target identity only', () => {
    const fact = typedFact({
      target_entity_id: starwoodEntityId,
      context: {
        scope_type: 'joint_venture',
        scope_ref: 'case:starwood-apollo',
        actor_relation: 'direct_entity',
        related_entity_id: null,
      },
      value: { kind: 'percentage', value: 58.5 },
    });
    const rows = project(fact, {
      entities: [{
        entity_id: starwoodEntityId,
        canonical_name: 'Starwood SREIT',
      }],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      entity_id: starwoodEntityId,
      public_payload: {
        target_entity_id: starwoodEntityId,
        context: {
          actor_relation: 'direct_entity',
          related_entity_id: null,
        },
      },
      public_display: {
        facts: [{
          label: 'Direct interest — Starwood SREIT',
          value: 58.5,
          suffix: '%',
        }],
      },
    });
  });

  it('rejects related_entity_id=null when the reviewed relation template requires a related entity', () => {
    const fact = typedFact({
      context: {
        scope_type: 'joint_venture',
        scope_ref: 'case:starwood-apollo',
        actor_relation: 'managed_funds_or_affiliates',
        related_entity_id: null,
      },
    });
    expect(project(fact)).toEqual([]);
  });

  it('fails closed on subject mismatch, invalid percentage, or non-VERIFY producer', () => {
    expect(project(typedFact({ subject_ref: 'case:other' }))).toEqual([]);
    expect(project(typedFact({ value: { kind: 'percentage', value: 141.5 } }))).toEqual([]);

    const wrongLane = typedFact() as Record<string, unknown>;
    ((wrongLane.extensions as Record<string, unknown>)['public_facts.v1'] as Record<string, unknown>).producer_lane = 'DISCOVERY';
    expect(project(wrongLane)).toEqual([]);
  });

  it('does not use an arbitrary HTTP source URL in public display', () => {
    expect(project(typedFact(), { sourceUrl: 'http://example.com/source' })).toEqual([]);
  });
});
