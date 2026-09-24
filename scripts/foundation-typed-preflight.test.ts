import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  gitBlobSha1,
  prepareFoundationTypedIngest,
} from '../src/lib/foundation/typed-ingest';
import {
  buildBundleProductionPreflight,
  buildTypedProductionPreflight,
} from './foundation-typed-preflight';

const typedPath =
  'staging/automation/typed-records/DISCOVERY/2026/09/24/run_discovery_1e74e968e095440244da1b9d01171d3f/gentherm-modine-performance-technologies-rmt-2026-typed-record-set-v1.json';
const artifactPath =
  'staging/automation/discovery/2026/09/24/20260924T221200JST-discovery-run_discovery_1e74e968e095440244da1b9d01171d3f.json';

function request() {
  const typedText = readFileSync(
    'src/lib/foundation/fixtures/real-gentherm-modine-typed-record-set-v1.json',
    'utf8',
  );
  const artifactText = readFileSync(
    'src/lib/foundation/fixtures/real-gentherm-modine-collection-run-v1.json',
    'utf8',
  );
  return {
    write_authorized: true as const,
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
  };
}

test('offline typed production preflight uses the exact production planner without touching R2', async () => {
  const input = request();
  assert.equal(input.write_authorized, true);
  const report = await buildTypedProductionPreflight(input);

  assert.equal(report.schema_version, 'foundation-typed-production-preflight.v1');
  assert.equal(report.mode, 'READ_ONLY_OFFLINE');
  assert.equal(report.r2_provider_calls, 0);
  assert.equal(report.r2_mutations, 0);
  assert.equal(report.queue_mutations, 0);
  assert.equal(report.coverage_assessment, 'UNASSESSED');
  assert.equal(report.request_write_authorized, true);

  assert.equal(report.planned_writes.write_authorized, false);
  assert.equal(report.planned_write_count, 5);
  assert.deepEqual(report.planned_write_counts_by_role, {
    entity: 4,
    research_bundle: 1,
  });
  assert.equal(report.invariants.all_create_only, true);
  assert.equal(report.invariants.copy_object_forbidden, true);
  assert.equal(report.invariants.delete_object_forbidden, true);
  assert.equal(report.invariants.move_forbidden, true);
  assert.equal(report.invariants.rename_forbidden, true);
  assert.equal(report.invariants.overwrite_forbidden, true);
  assert.equal(report.invariants.legacy_mutation_forbidden, true);

  const canonical = report.planned_writes.objects.find(
    (item) => item.logical_role === 'research_bundle',
  );
  assert.ok(canonical);
  assert.match(
    canonical.key,
    new RegExp(`^datasets/ds\\.business\\.research-bundles\\.derived/v1/2026/09/24/${report.run_id}\\.json$`),
  );
  assert.equal(canonical.create_only, true);
  assert.equal(canonical.preflight_status, 'NOT_CHECKED');

  assert.equal(report.entity_ids.length, 4);
  assert.ok(report.public_rights_structure.policy_reference_blockers.length > 0);
});


test('generic bundle production preflight uses exact legacy planner without R2 or Queue mutations', async () => {
  const input = request();
  const prepared = prepareFoundationTypedIngest(input);
  const report = await buildBundleProductionPreflight(prepared.bundle);

  assert.equal(report.schema_version, 'foundation-bundle-production-preflight.v1');
  assert.equal(report.mode, 'READ_ONLY_OFFLINE');
  assert.equal(report.r2_provider_calls, 0);
  assert.equal(report.r2_mutations, 0);
  assert.equal(report.queue_mutations, 0);
  assert.equal(report.planned_writes.write_authorized, false);
  assert.equal(report.planned_write_count, 5);
  assert.deepEqual(report.planned_write_counts_by_role, {
    entity: 4,
    research_bundle: 1,
  });
  assert.equal(report.invariants.all_create_only, true);
  assert.equal(report.invariants.overwrite_forbidden, true);
  assert.equal(report.invariants.legacy_mutation_forbidden, true);
});
