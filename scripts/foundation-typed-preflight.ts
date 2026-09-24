import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  prepareFoundationTypedIngest,
  type FoundationTypedIngestRequest,
} from '../src/lib/foundation/typed-ingest';
import {
  preflightFoundationResearch,
  preflightFoundationTypedProjectionResearch,
  prepareFoundationResearch,
  prepareFoundationTypedProjectionResearch,
} from '../src/lib/foundation/ingest';
import {
  getFoundationBucket,
  listR2Objects,
  readR2Object,
} from '../src/lib/storage/r2';

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


const REBUILD_STATE_KEY = 'views/make-money/v1/_rebuild-state.json';
const UNRESOLVED_REPLAY_STATE_KEY = 'views/make-money/v1/_unresolved-replay-state.json';
const PROJECTION_PROGRESS_PREFIX = 'views/make-money/v1/_projection-progress/';

function decodeJsonObject(body: Uint8Array): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(body));
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function buildMakeMoneyReplayStatePreflight(adapters: {
  getBucket?: () => string;
  readObject?: typeof readR2Object;
  listObjects?: typeof listR2Objects;
} = {}) {
  const getBucket = adapters.getBucket || (() => getFoundationBucket('lake'));
  const readObject = adapters.readObject || readR2Object;
  const listObjects = adapters.listObjects || listR2Objects;
  const bucket = getBucket();
  const rebuildObject = await readObject(bucket, REBUILD_STATE_KEY);
  const unresolvedReplayObject = await readObject(bucket, UNRESOLVED_REPLAY_STATE_KEY);
  const rebuildState = rebuildObject ? decodeJsonObject(rebuildObject.body) : null;
  const unresolvedReplayState = unresolvedReplayObject
    ? decodeJsonObject(unresolvedReplayObject.body)
    : null;

  if (!rebuildState || rebuildState.complete !== true) {
    return {
      schema_version: 'make-money-replay-production-preflight.v1',
      mode: 'READ_ONLY',
      r2_mutations: 0,
      queue_mutations: 0,
      rebuild_state: rebuildState,
      unresolved_replay_state: unresolvedReplayState,
      next_projection_progress: [],
      pending_unresolved_runs: [],
      state: 'GLOBAL_BACKFILL_PENDING',
      blocks_reconcile: true,
      control_state_update_expected: false,
    };
  }

  const cursor =
    unresolvedReplayState && typeof unresolvedReplayState.cursor === 'string'
      ? unresolvedReplayState.cursor
      : undefined;
  const page = await listObjects({
    bucket,
    prefix: PROJECTION_PROGRESS_PREFIX,
    cursor,
    limit: 5,
  });

  const progressRows: Array<Record<string, unknown>> = [];
  for (const item of page.objects.filter((candidate) => candidate.key.endsWith('.json'))) {
    const object = await readObject(bucket, item.key);
    if (!object) continue;
    const parsed = decodeJsonObject(object.body);
    if (parsed) progressRows.push(parsed);
  }

  const pending = progressRows
    .filter((row) =>
      Array.isArray(row.unresolved_entity_ids) &&
      row.unresolved_entity_ids.some((id) => typeof id === 'string' && id.trim()),
    )
    .map((row) => ({
      run_id: typeof row.run_id === 'string' ? row.run_id : null,
      unresolved_entity_ids: Array.isArray(row.unresolved_entity_ids)
        ? row.unresolved_entity_ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        : [],
    }));

  return {
    schema_version: 'make-money-replay-production-preflight.v1',
    mode: 'READ_ONLY',
    r2_mutations: 0,
    queue_mutations: 0,
    rebuild_state: rebuildState,
    unresolved_replay_state: unresolvedReplayState,
    next_projection_progress: progressRows,
    next_page_truncated: page.truncated,
    next_page_cursor: page.cursor || null,
    pending_unresolved_runs: pending,
    state: pending.length > 0
      ? 'UNRESOLVED_REPLAY_PENDING'
      : 'NO_PENDING_UNRESOLVED_REPLAY',
    blocks_reconcile: pending.length > 0,
    control_state_update_expected: true,
  };
}

export async function buildTypedRemoteProductionPreflight(
  request: FoundationTypedIngestRequest,
) {
  const prepared = prepareFoundationTypedIngest(request);
  const result = await preflightFoundationTypedProjectionResearch(prepared.bundle);
  return {
    schema_version: 'foundation-typed-remote-production-preflight.v1',
    mode: 'READ_ONLY_REMOTE_R2',
    request_write_authorized: request.write_authorized === true,
    r2_mutations: 0,
    queue_mutations: 0,
    run_id: (prepared.bundle as { run_id?: unknown }).run_id,
    source: prepared.source,
    ...result,
  };
}

export async function buildBundleRemoteProductionPreflight(bundle: unknown) {
  const result = await preflightFoundationResearch(bundle);
  return {
    schema_version: 'foundation-bundle-remote-production-preflight.v1',
    mode: 'READ_ONLY_REMOTE_R2',
    r2_mutations: 0,
    queue_mutations: 0,
    ...result,
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
    request_write_authorized: request.write_authorized === true,
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


export async function buildBundleProductionPreflight(bundle: unknown) {
  const plannedWrites = await prepareFoundationResearch(bundle);
  const countsByRole = plannedWrites.objects.reduce<Record<string, number>>((acc, item) => {
    acc[item.logical_role] = (acc[item.logical_role] || 0) + 1;
    return acc;
  }, {});
  return {
    schema_version: 'foundation-bundle-production-preflight.v1',
    mode: 'READ_ONLY_OFFLINE',
    r2_provider_calls: 0,
    r2_mutations: 0,
    queue_mutations: 0,
    run_id: bundle && typeof bundle === 'object' && !Array.isArray(bundle)
      ? (bundle as { run_id?: unknown }).run_id
      : null,
    planned_write_count: plannedWrites.objects.length,
    planned_write_counts_by_role: countsByRole,
    planned_writes: plannedWrites,
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
  const args = process.argv.slice(2);
  const mode = args[0]?.startsWith('--') ? args[0] : '--typed';
  if (mode === '--view-replay') {
    const report = await buildMakeMoneyReplayStatePreflight();
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  const inputPath = mode === '--typed' ? args[0] : args[1];
  if (!inputPath) {
    console.error(
      'Usage: pnpm foundation:typed:preflight [--bundle|--remote|--bundle-remote] <input.json> | --view-replay',
    );
    process.exitCode = 2;
    return;
  }

  const input = JSON.parse(readFileSync(resolve(inputPath), 'utf8'));
  const report =
    mode === '--bundle'
      ? await buildBundleProductionPreflight(input)
      : mode === '--remote'
        ? await buildTypedRemoteProductionPreflight(input as FoundationTypedIngestRequest)
        : mode === '--bundle-remote'
          ? await buildBundleRemoteProductionPreflight(input)
          : await buildTypedProductionPreflight(input as FoundationTypedIngestRequest);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
