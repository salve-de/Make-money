import { ScheduledHandoffMaterializationError, type ScheduledQueueRun } from './scheduled-r2-handoff';

const allowedFields = new Set([
  'coverage.normalized_bundle_coverage.Metric',
  'field_coverage_delta.metric_bundles',
]);

export function auditCorrectionTarget(queue: ScheduledQueueRun): string | null {
  if (queue.schema_version !== 'r2-queue-run-correction.v1') return null;
  const path = queue.input_snapshot?.corrects_path;
  if (typeof path !== 'string' || !/^staging\/r2-queue\/\d{4}\/\d{2}\/\d{2}\/[^/]+\.json$/.test(path)) {
    throw new ScheduledHandoffMaterializationError(['audit correction target path is invalid']);
  }
  return path;
}

/** Validate audit counters only. Never reinterpret these rows as business facts. */
export function validateAuditCorrection(queue: ScheduledQueueRun, target: ScheduledQueueRun) {
  if (!auditCorrectionTarget(queue) || queue.input_snapshot?.corrects_run_id !== target.run_id) {
    throw new ScheduledHandoffMaterializationError(['audit correction target run does not match']);
  }
  const rows = queue.recorded_items;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ScheduledHandoffMaterializationError(['audit correction has no changes']);
  }
  const seen = new Set<string>();
  return rows.map((row: unknown) => {
    const r = row && typeof row === 'object' ? row as Record<string, unknown> : {};
    if (r.type !== 'audit_correction' || typeof r.field !== 'string' || !allowedFields.has(r.field) || seen.has(r.field)
      || !Number.isSafeInteger(r.old_value) || !Number.isSafeInteger(r.correct_value)
      || Number(r.old_value) < 0 || Number(r.correct_value) < 0) {
      throw new ScheduledHandoffMaterializationError(['audit correction contains unsupported or invalid change']);
    }
    seen.add(r.field);
    let current: unknown = target;
    for (const key of r.field.split('.')) {
      current = current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
    }
    if (current !== r.old_value && current !== r.correct_value) {
      throw new ScheduledHandoffMaterializationError(['audit correction prior value does not match target']);
    }
    return { field: r.field, old_value: r.old_value as number, correct_value: r.correct_value as number };
  });
}
