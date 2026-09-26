import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCommercialPublicFactProjection } from './publication-rights';
import { gitBlobSha1, projectTypedRecordSetV4 } from './typed-ingest';

type JsonObject = Record<string, unknown>;

const typedFixture =
  'src/lib/foundation/fixtures/real-starwood-apollo-2026-09-26-typed-record-set-v1.json';
const starwoodId = 'ent_org_0e1d9b556075d9fc7f36';
const apolloId = 'ent_org_4a819d424adf6b2a118f';
const observationId = 'obs_3b978269d9ec6eba82dc1f9b';

function preparedFixture() {
  const typedText = readFileSync(typedFixture, 'utf8');
  const typedRecordSet = JSON.parse(typedText) as JsonObject;
  return {
    bundle: projectTypedRecordSetV4(typedRecordSet, gitBlobSha1(typedText)),
    typedRecordSet,
  };
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function projectedTarget(bundle: JsonObject | null): JsonObject | null {
  if (!bundle || !Array.isArray(bundle.observations)) return null;
  return (bundle.observations as JsonObject[])
    .find((row) => row.observation_id === observationId) || null;
}

describe('2026-09-26 Starwood/Apollo public observation association', () => {
  it('associates the exact reviewed observation to Starwood and Apollo only', () => {
    const prepared = preparedFixture();
    const result = buildCommercialPublicFactProjection(
      prepared.bundle,
      prepared.typedRecordSet,
    );

    expect(result.assessment.status).toBe('ALLOWED');
    const target = projectedTarget(result.bundle);
    expect(target).not.toBeNull();
    expect(target?.entity_ids).toEqual([starwoodId, apolloId]);

    const serialized = JSON.stringify(target);
    expect(serialized).toContain('1020000000');
    expect(serialized).toContain('41.5');
    expect(serialized).toContain('58.5');
    expect(serialized).not.toContain('rising_minimum_yield_guarantee');
    expect(serialized).not.toContain('exact_joint_venture_legal_name');
    expect(serialized).not.toContain('exact_apollo_investing_legal_entities');
  });

  it('fails closed when the typed subject_ref changes', () => {
    const prepared = preparedFixture();
    const typed = deepClone(prepared.typedRecordSet);
    typed.subject_ref = 'case:wrong-subject';

    const result = buildCommercialPublicFactProjection(prepared.bundle, typed);
    expect(projectedTarget(result.bundle)).toBeNull();
  });

  it('fails closed when either required canonical entity is missing', () => {
    const prepared = preparedFixture();
    const bundle = deepClone(prepared.bundle);
    bundle.entities = (bundle.entities as JsonObject[])
      .filter((row) => row.entity_id !== apolloId);

    const result = buildCommercialPublicFactProjection(
      bundle,
      prepared.typedRecordSet,
    );
    expect(projectedTarget(result.bundle)).toBeNull();
  });

  it('fails closed when entity evidence no longer matches the observation evidence set', () => {
    const prepared = preparedFixture();
    const bundle = deepClone(prepared.bundle);
    const entities = bundle.entities as JsonObject[];
    const apollo = entities.find((row) => row.entity_id === apolloId)!;
    apollo.evidence_ids = ['ev_8ab84a0f3b532a7171d1a6d4'];

    const result = buildCommercialPublicFactProjection(
      bundle,
      prepared.typedRecordSet,
    );
    expect(projectedTarget(result.bundle)).toBeNull();
  });

  it('fails closed when SEC evidence policy identity is changed', () => {
    const prepared = preparedFixture();
    const bundle = deepClone(prepared.bundle);
    const evidence = bundle.evidence as JsonObject[];
    evidence[0].rights_policy_id = 'rights.unapproved-test.v1';

    const result = buildCommercialPublicFactProjection(
      bundle,
      prepared.typedRecordSet,
    );
    expect(projectedTarget(result.bundle)).toBeNull();
  });

  it('never associates the observation to an unrelated third entity', () => {
    const prepared = preparedFixture();
    const bundle = deepClone(prepared.bundle);
    (bundle.entities as JsonObject[]).push({
      entity_id: 'ent_org_aaaaaaaaaaaaaaaaaaaa',
      entity_type: 'organization',
      canonical_name: 'Unrelated Third Entity',
      aliases: [],
      canonical_identifier: null,
      domain: null,
      status: null,
      observed_at: '2026-09-25T22:28:24Z',
      evidence_ids: [
        'ev_8ab84a0f3b532a7171d1a6d4',
        'ev_f841248a66756d400605f3ac',
      ],
    });

    const result = buildCommercialPublicFactProjection(
      bundle,
      prepared.typedRecordSet,
    );
    const target = projectedTarget(result.bundle);
    expect(target?.entity_ids).toEqual([starwoodId, apolloId]);
    expect((target?.entity_ids as string[])).not.toContain(
      'ent_org_aaaaaaaaaaaaaaaaaaaa',
    );
  });
});
