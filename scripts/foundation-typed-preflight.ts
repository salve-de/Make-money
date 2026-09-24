import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  prepareFoundationTypedIngest,
  type FoundationTypedIngestRequest,
} from '../src/lib/foundation/typed-ingest';
import { prepareFoundationTypedProjectionResearch } from '../src/lib/foundation/ingest';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function summarizeRights(typedRecordSet: Record<string, unknown>) {
  const sources = Array.isArray(typedRecordSet.sources)
    ? typedRecordSet.sources.filter(isObject)
    : [];
  const evidence = Array.isArray(typedRecordSet.evidence)
    ? typedRecordSet.evidence.filter(isObject)
    : [];
  const blockers: string[] = [];

  for (const source of sources) {
    const id = typeof source.source_id === 'string' ? source.source_id : 'unknown';
    if (typeof source.rights_policy_id !== 'string' || !source.rights_policy_id.trim()) {
      blockers.push(`source:${id}:missing_rights_policy_id`);
    }
    if (source.rights_status === 'pending_review' || source.rights_status === 'blocked') {
      blockers.push(`source:${id}:rights_${String(source.rights_status)}`);
    }
  }

  for (const item of evidence) {
    const id = typeof item.evidence_id === 'string' ? item.evidence_id : 'unknown';
    if (typeof item.rights_policy_id !== 'string' || !item.rights_policy_id.trim()) {
      blockers.push(`evidence:${id}:missing_rights_policy_id`);
    }
    if (item.rights_status === 'pending_review' || item.rights_status === 'blocked') {
      blockers.push(`evidence:${id}:rights_${String(item.rights_status)}`);
    }
  }

  return {
    source_count: sources.length,
    evidence_count: evidence.length,
    policy_reference_blockers: [...new Set(blockers)],
    note:
      'This is a structural preflight only. Commercial/public authorization must be resolved by the active Make-Money rights gate and registered rights policies.',
  };
}

export async function buildTypedProductionPreflight(request: FoundationTypedIngestRequest) {
  const prepared = prepareFoundationTypedIngest(request);
  const plannedWrites = await prepareFoundationTypedProjectionResearch(prepared.bundle);
  const countsByRole = plannedWrites.objects.reduce<Record<string, number>>((acc, item) => {
    acc[item.logical_role] = (acc[item.logical_role] || 0) + 1;
    return acc;
  }, {});
  const entityIds = Array.isArray((prepared.bundle as { entities?: unknown }).entities)
    ? ((prepared.bundle as { entities: unknown[] }).entities)
        .map((entity) => isObject(entity) && typeof entity.entity_id === 'string' ? entity.entity_id : null)
        .filter((value): value is string => Boolean(value))
    : [];

  return {
    schema_version: 'foundation-typed-production-preflight.v1',
    mode: 'READ_ONLY_OFFLINE',
    r2_provider_calls: 0,
    r2_mutations: 0,
    queue_mutations: 0,
    source: prepared.source,
    mapper_version: prepared.mapperVersion,
    coverage_assessment: prepared.coverageAssessment,
    run_id: (prepared.bundle as { run_id?: unknown }).run_id,
    retrieved_at: (prepared.bundle as { retrieved_at?: unknown }).retrieved_at,
    entity_ids: [...new Set(entityIds)].sort(),
    planned_write_count: plannedWrites.objects.length,
    planned_write_counts_by_role: countsByRole,
    planned_writes: plannedWrites,
    public_rights_structure: summarizeRights(prepared.typedRecordSet),
    invariants: {
      write_authorized: plannedWrites.write_authorized,
      all_create_only: plannedWrites.objects.every((item) => item.create_only === true),
      copy_object_forbidden: plannedWrites.forbidden_operations.includes('CopyObject'),
      delete_object_forbidden: plannedWrites.forbidden_operations.includes('DeleteObject'),
      move_forbidden: plannedWrites.forbidden_operations.includes('Move'),
      rename_forbidden: plannedWrites.forbidden_operations.includes('Rename'),
      overwrite_forbidden: plannedWrites.forbidden_operations.includes('Overwrite'),
      legacy_mutation_forbidden: plannedWrites.forbidden_operations.includes('LegacyUniversalMutation'),
    },
  };
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: pnpm foundation:typed:preflight <typed-ingest-request.json>');
    process.exitCode = 2;
    return;
  }

  const request = JSON.parse(readFileSync(resolve(inputPath), 'utf8')) as FoundationTypedIngestRequest;
  const report = await buildTypedProductionPreflight(request);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
