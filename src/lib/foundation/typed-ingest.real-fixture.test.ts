import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  gitBlobSha1,
  prepareFoundationTypedIngest,
} from './typed-ingest';

const typedPath =
  'staging/automation/typed-records/DISCOVERY/2026/09/24/run_discovery_1e74e968e095440244da1b9d01171d3f/gentherm-modine-performance-technologies-rmt-2026-typed-record-set-v1.json';
const artifactPath =
  'staging/automation/discovery/2026/09/24/20260924T221200JST-discovery-run_discovery_1e74e968e095440244da1b9d01171d3f.json';
const typedBlob = '8c58f3dbc66fd644759104abb129320d0a9bf0b3';
const artifactBlob = 'f420ff3c53deb5f63e1294e1c53b4739f9383ef3';

describe('real scheduled Web ChatGPT typed sidecar fixture', () => {
  it('accepts the exact immutable bytes and preserves structured semantics losslessly', () => {
    const typedText = readFileSync(
      'src/lib/foundation/fixtures/real-gentherm-modine-typed-record-set-v1.json',
      'utf8',
    );
    const artifactText = readFileSync(
      'src/lib/foundation/fixtures/real-gentherm-modine-collection-run-v1.json',
      'utf8',
    );

    expect(gitBlobSha1(typedText)).toBe(typedBlob);
    expect(gitBlobSha1(artifactText)).toBe(artifactBlob);

    const prepared = prepareFoundationTypedIngest({
      write_authorized: true,
      source: {
        repository: 'salve-de/universal-foundation',
        source_ref: 'main',
        source_commit_sha: 'a85596d6e7de6aba66047df383724577055c2fad',
        typed_record_set_path: typedPath,
        typed_record_set_blob_sha: typedBlob,
        source_artifact_path: artifactPath,
        source_artifact_blob_sha: artifactBlob,
      },
      typed_record_set_text: typedText,
      source_artifact_text: artifactText,
    });

    expect(prepared.coverageAssessment).toBe('UNASSESSED');
    expect(prepared.typedRecordSet.quality).toMatchObject({
      mapping_status: 'REQUIRES_BUNDLE_V2',
      schema_validation: 'NOT_RUN',
    });

    const observations = prepared.bundle.observations as Array<Record<string, unknown>>;
    const transport = observations.find(
      (item) => item.observation_type === 'transport.typed_record_set_v1',
    );
    expect(transport?.transport_typed_record_set_v1).toEqual(prepared.typedRecordSet);

    const reported = observations.find(
      (item) => item.observation_id === 'obs_3a0b0a67c9c0f5f137ecd700',
    );
    expect(reported?.text).toContain('special_dividend');
    expect(reported?.payload).toMatchObject({
      special_dividend: {
        aggregate_amount: 58350533,
        currency: 'USD',
      },
      exchange_ratio_adjustment: {
        spinco_cash_distribution_current_estimate: 159000000,
        currency: 'USD',
      },
    });

    const conflicts = (prepared.bundle.quality as { conflicts?: string[] }).conflicts || [];
    expect(conflicts.some((value) => value.includes('special_dividend_record_date'))).toBe(true);
  });
});
