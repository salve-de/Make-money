import { describe, expect, it } from 'vitest';
import { validateResearchBundle, validateTypedProjectionBundle } from './ingest';
import {
  FoundationTypedIngestValidationError,
  TYPED_PROJECTOR_VERSION,
  gitBlobSha1,
  prepareFoundationTypedIngest,
  typedProjectionRunId,
} from './typed-ingest';

const sourceRunId = 'run_discovery_test_001';
const subjectRef = 'case:test-company:2026';
const typedPath =
  'staging/automation/typed-records/DISCOVERY/2026/09/24/run_discovery_test_001/test-company-typed-record-set-v1.json';
const artifactPath =
  'staging/automation/discovery/2026/09/24/test-run.json';

function sidecar(verificationStatus = 'UNVERIFIED') {
  return {
    schema_version: 'typed-record-set.v1',
    source_run_id: sourceRunId,
    source_artifact: {
      path: artifactPath,
      blob_sha: '',
      lane: 'DISCOVERY',
    },
    purpose: 'make_money',
    subject_ref: subjectRef,
    subject: {
      query: 'Test Company',
      candidate_name: 'Test Company',
      candidate_domain: 'example.com',
      notes: null,
    },
    provenance: {
      retrieved_at: '2026-09-24T00:00:00Z',
      recorded_at: '2026-09-24T00:01:00Z',
      collection_channel: 'web',
      agent: {
        name: 'OpenAI ChatGPT scheduled collection',
        model: 'GPT-5.6 Sol',
        version: null,
      },
      rights_reviewed_at: null,
    },
    sources: [],
    evidence: [],
    entities: [
      {
        entity_id: 'ent_organization_1234567890abcdef1234',
        entity_type: 'organization',
        canonical_name: 'Test Company',
        aliases: ['Test Company'],
        canonical_identifier: null,
        domain: 'example.com',
        status: null,
        observed_at: '2026-09-24T00:00:00Z',
        evidence_ids: [],
      },
    ],
    claims: [],
    metrics: [],
    money_signals: [],
    events: [],
    relationships: [],
    observations: [
      {
        observation_id: 'obs_1234567890abcdef12345678',
        observation_type: 'business_model.test',
        origin_type: 'reported',
        verification_status: verificationStatus,
        observed_at: '2026-09-24T00:00:00Z',
        collection_channel: 'web',
        observer: 'DISCOVERY',
        evidence_ids: [],
        payload_schema_ref: null,
        payload: {
          summary: 'Human-readable summary from the typed observation.',
          subject_ref: subjectRef,
        },
      },
    ],
    quality: {
      mapping_status: 'REQUIRES_BUNDLE_V2',
      unknowns: [{ field: 'pricing', status: 'unknown' }],
      conflicts: [],
      warnings: ['keep structured payload'],
      schema_validation: 'NOT_RUN',
    },
  };
}

function requestFor(
  typed: ReturnType<typeof sidecar>,
  artifact: Record<string, unknown>,
) {
  const artifactText = JSON.stringify(artifact);
  const artifactBlob = gitBlobSha1(artifactText);
  typed.source_artifact.blob_sha = artifactBlob;
  const typedText = JSON.stringify(typed);
  const typedBlob = gitBlobSha1(typedText);

  return {
    write_authorized: true as const,
    source: {
      repository: 'salve-de/universal-foundation',
      source_ref: 'main',
      source_commit_sha: 'a'.repeat(40),
      typed_record_set_path: typedPath,
      typed_record_set_blob_sha: typedBlob,
      source_artifact_path: artifactPath,
      source_artifact_blob_sha: artifactBlob,
    },
    typed_record_set_text: typedText,
    source_artifact_text: artifactText,
  };
}

function sourceArtifact() {
  return {
    schema_version: 'collection-run.v1',
    lane: 'DISCOVERY',
    run_id: sourceRunId,
    started_at: '2026-09-24T00:00:00Z',
    finished_at: '2026-09-24T00:01:00Z',
    contract_ref: 'registry/collection/collection-os.v3.json',
    input_snapshot: {},
    source_attempts: [],
    recorded_items: [{ subject_ref: subjectRef }],
    coverage_delta: {},
    audit: {},
    checkpoint: {},
    final_status: 'SUCCESS',
  };
}

describe('typed sidecar ingest projection', () => {
  it('projects a valid typed sidecar losslessly and deterministically without collection coverage', () => {
    const firstRequest = requestFor(sidecar(), sourceArtifact());
    const first = prepareFoundationTypedIngest(firstRequest);
    const second = prepareFoundationTypedIngest(firstRequest);

    expect(first.mapperVersion).toBe(TYPED_PROJECTOR_VERSION);
    expect(first.coverageAssessment).toBe('UNASSESSED');
    expect(first.bundle).toEqual(second.bundle);
    expect(first.bundle.collection_coverage).toBeUndefined();
    expect(first.bundle.run_id).toBe(
      typedProjectionRunId(firstRequest.source.typed_record_set_blob_sha, subjectRef),
    );

    const observations = first.bundle.observations as Array<Record<string, unknown>>;
    expect(observations[0].transport_typed_record_set_v1).toEqual(first.typedRecordSet);
    expect(observations[1].text).toBe('Human-readable summary from the typed observation.');
    expect((first.bundle.quality as Record<string, unknown>).schema_validation).toBe('PASS');
  });

  it('defaults an entity-valued subject_ref to that entity in a multi-entity sidecar', () => {
    const typed = sidecar() as any;
    const subjectEntityId = typed.entities[0].entity_id;
    typed.subject_ref = subjectEntityId;
    typed.subject = { query: 'Subject entity test' };
    typed.observations[0].payload = { note: 'No explicit entity ID in payload.' };
    typed.entities.push({
      ...typed.entities[0],
      entity_id: 'ent_organization_abcdef1234567890abcd',
      canonical_name: 'Other Company',
      aliases: ['Other Company'],
      domain: 'other.example',
    });
    const artifact = sourceArtifact();
    artifact.recorded_items = [{ subject_ref: subjectEntityId }];

    const prepared = prepareFoundationTypedIngest(requestFor(typed, artifact));
    const observations = prepared.bundle.observations as Array<Record<string, unknown>>;
    expect(observations[1].entity_ids).toEqual([subjectEntityId]);
    expect((prepared.bundle.entities as Array<Record<string, unknown>>)
      .filter((entity) => entity.entity_type === 'case')).toHaveLength(0);
  });

  it('keeps the legacy coverage gate closed and allows only the internal typed coverage mode', () => {
    const prepared = prepareFoundationTypedIngest(requestFor(sidecar(), sourceArtifact()));

    expect(() => validateResearchBundle(prepared.bundle)).toThrow(/collection_coverage/);
    expect(() => validateTypedProjectionBundle(prepared.bundle)).not.toThrow();
  });

  it('fails closed when the supplied sidecar bytes do not match the Git blob SHA', () => {
    const request = requestFor(sidecar(), sourceArtifact());
    request.source.typed_record_set_blob_sha = 'b'.repeat(40);

    expect(() => prepareFoundationTypedIngest(request)).toThrowError(
      FoundationTypedIngestValidationError,
    );
    try {
      prepareFoundationTypedIngest(request);
    } catch (error) {
      expect((error as FoundationTypedIngestValidationError).reasonCode)
        .toBe('SIDECAR_BLOB_MISMATCH');
    }
  });

  it('holds a typed sidecar that violates the typed-record-set schema', () => {
    const request = requestFor(sidecar('PARTIAL'), sourceArtifact());

    expect(() => prepareFoundationTypedIngest(request)).toThrowError(
      FoundationTypedIngestValidationError,
    );
    try {
      prepareFoundationTypedIngest(request);
    } catch (error) {
      expect((error as FoundationTypedIngestValidationError).reasonCode)
        .toBe('SOURCE_SCHEMA_INVALID');
    }
  });
});
