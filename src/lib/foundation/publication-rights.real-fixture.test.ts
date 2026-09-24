import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCommercialPublicFactProjection } from './publication-rights';
import {
  gitBlobSha1,
  prepareFoundationTypedIngest,
  TYPED_PROJECTOR_VERSION,
} from './typed-ingest';

const typedPath =
  'staging/automation/typed-records/DISCOVERY/2026/09/24/run_discovery_1e74e968e095440244da1b9d01171d3f/gentherm-modine-performance-technologies-rmt-2026-typed-record-set-v1.json';
const artifactPath =
  'staging/automation/discovery/2026/09/24/20260924T221200JST-discovery-run_discovery_1e74e968e095440244da1b9d01171d3f.json';

describe('mapper v6 + commercial publication rights integration', () => {
  it('keeps the real observation-only policy-missing Web ChatGPT sidecar RIGHTS_HELD', () => {
    const typedText = readFileSync(
      'src/lib/foundation/fixtures/real-gentherm-modine-typed-record-set-v1.json',
      'utf8',
    );
    const artifactText = readFileSync(
      'src/lib/foundation/fixtures/real-gentherm-modine-collection-run-v1.json',
      'utf8',
    );

    const prepared = prepareFoundationTypedIngest({
      write_authorized: true,
      source: {
        repository: 'salve-de/universal-foundation',
        source_ref: 'main',
        source_commit_sha: 'a85596d6e7de6aba66047df383724577055c2fad',
        typed_record_set_path: typedPath,
        typed_record_set_blob_sha: gitBlobSha1(typedText),
        source_artifact_path: artifactPath,
        source_artifact_blob_sha: gitBlobSha1(artifactText),
      },
      typed_record_set_text: typedText,
      source_artifact_text: artifactText,
    });

    expect(TYPED_PROJECTOR_VERSION).toBe('r2-queue-mapper-v6');
    expect(prepared.bundle.observations).toHaveLength(7); // transport + six source observations
    expect(prepared.bundle.claims).toEqual([]);
    expect(prepared.bundle.metrics).toEqual([]);
    expect(prepared.bundle.money_signals).toEqual([]);
    expect(prepared.bundle.events).toEqual([]);
    expect(prepared.bundle.relationships).toEqual([]);

    const result = buildCommercialPublicFactProjection(prepared.bundle);
    expect(result.bundle).toBeNull();
    expect(result.assessment.status).toBe('RIGHTS_HELD');
    expect(result.assessment.allowedEvidenceIds).toEqual([]);
    expect(result.assessment.heldEvidenceIds).toHaveLength(3);
    expect(result.assessment.reasons).toContain(
      'evidence source has no uniquely resolved approved rights policy',
    );
  });
});
