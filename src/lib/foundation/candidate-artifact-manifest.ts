import { ScheduledHandoffMaterializationError, type ScheduledQueueRun } from './scheduled-r2-handoff';
type Row = Record<string, unknown>;
const row = (value: unknown): value is Row => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const candidatePath = /^staging\/r2-queue\/\d{4}\/\d{2}\/\d{2}\/candidates\/([A-Za-z0-9_-]+)\/[A-Za-z0-9_.-]+\.json$/;

/** Explicit artifact references only; never infer files from names or directory listings. */
export function candidateArtifactManifest(queue: ScheduledQueueRun) {
  const entries = new Map<string, { path: string; count?: number }>();
  const add = (path: unknown, count?: unknown) => {
    const match = typeof path === 'string' && path.match(candidatePath);
    if (!match || (typeof queue.run_id === 'string' && match[1] !== queue.run_id)) {
      throw new ScheduledHandoffMaterializationError(['Invalid candidate artifact path']);
    }
    if (count !== undefined && (!Number.isSafeInteger(count) || Number(count) <= 0)) {
      throw new ScheduledHandoffMaterializationError(['Invalid candidate artifact count']);
    }
    const prior = entries.get(path as string);
    if (prior?.count !== undefined && count !== undefined && prior.count !== count) {
      throw new ScheduledHandoffMaterializationError(['Conflicting candidate artifact count']);
    }
    entries.set(path as string, { path: path as string, count: prior?.count ?? count as number | undefined });
  };
  const recorded = queue.recorded_items;
  if (Array.isArray(recorded)) for (const item of recorded) {
    if (row(item) && item.state === 'VALIDATED_FOR_R2_HANDOFF' && item.artifact_path) add(item.artifact_path, item.count);
  }
  let expectedTotal: number | undefined;
  if (row(recorded) && recorded.state === 'VALIDATED_FOR_R2_HANDOFF') {
    if (Array.isArray(recorded.artifact_paths)) recorded.artifact_paths.forEach(path => add(path));
    if (typeof recorded.artifact_directory === 'string' && Array.isArray(recorded.artifact_files)) {
      recorded.artifact_files.forEach(file => add(`${recorded.artifact_directory}/${String(file)}`));
    }
    if (entries.size && Number.isSafeInteger(recorded.count) && Number(recorded.count) > 0) expectedTotal = Number(recorded.count);
  }
  const log = queue.write_log;
  const writes = Array.isArray(log) ? log : row(log) && Array.isArray(log.candidate_writes) ? log.candidate_writes : [];
  // A completed inline handoff supersedes tentative file-write plans. Only
  // summary-only legacy queues require write-log artifact discovery.
  const inline = Array.isArray(queue.normalized_candidates) && queue.normalized_candidates.length > 0
    || Array.isArray(recorded) && recorded.some(item => row(item) && (item.Entity || item.normalized || item.bundle));
  for (const item of inline ? [] : writes) {
    if (!row(item) || typeof item.path !== 'string' || !item.path.includes('/candidates/')) continue;
    if (item.result !== undefined && String(item.result).toUpperCase() !== 'SUCCESS') continue;
    if (item.operation !== undefined && String(item.operation).toLowerCase() !== 'create') continue;
    if (item.repository !== undefined && item.repository !== 'salve-de/universal-foundation') throw new ScheduledHandoffMaterializationError(['Foreign candidate repository']);
    add(item.path, item.bundle_count);
  }
  return { entries: [...entries.values()], expectedTotal };
}
