/**
 * User-facing publication windows for newly materialized Foundation records.
 *
 * The collector/writer may run hourly. This module deliberately keeps the
 * public cadence separate: records become visible in one of three JST
 * editions per day, without moving or overwriting the underlying objects.
 */

export const NEW_ARRIVALS_SCHEMA_VERSION = 'new-arrivals-contribution.v1' as const;
export const NEW_ARRIVALS_PREFIX = 'views/make-money/new-arrivals/v1/contributions/';
export const NEW_ARRIVAL_SLOT_HOURS_JST = [9, 15, 21] as const;

const JAPAN_OFFSET_MS = 9 * 60 * 60 * 1000;

export type NewArrivalsSlotHour = (typeof NEW_ARRIVAL_SLOT_HOURS_JST)[number];

export interface NewArrivalsReleaseSlot {
  releaseId: string;
  releaseAt: string;
  jstDate: string;
  jstHour: NewArrivalsSlotHour;
  label: string;
}

export interface NewArrivalsContribution {
  schema_version: typeof NEW_ARRIVALS_SCHEMA_VERSION;
  contribution_id: string;
  release_id: string;
  release_at: string;
  assigned_at: string;
  queue_run_id: string;
  queue_path: string | null;
  entity_ids: string[];
  entity_count: number;
}

export interface NewArrivalsRelease {
  releaseId: string;
  releaseAt: string;
  label: string;
  count: number;
  entityIds: string[];
  contributionCount: number;
}

function asDate(value: Date | string): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date-time: ${String(value)}`);
  return date;
}

function jstDateParts(value: Date | string): { year: number; month: number; day: number; hour: number; minute: number } {
  const shifted = new Date(asDate(value).getTime() + JAPAN_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function jstDateKey(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}/${pad(month)}/${pad(day)}`;
}

function releaseAtForJst(year: number, month: number, day: number, hour: NewArrivalsSlotHour): Date {
  // Date.UTC normalizes month/day overflow, which also handles the next-day
  // 09:00 fallback without a timezone database or daylight-saving surprises.
  return new Date(Date.UTC(year, month - 1, day, hour - 9, 0, 0, 0));
}

function slotFromParts(year: number, month: number, day: number, hour: NewArrivalsSlotHour): NewArrivalsReleaseSlot {
  const releaseAt = releaseAtForJst(year, month, day, hour);
  const date = jstDateParts(releaseAt);
  const dateKey = jstDateKey(date.year, date.month, date.day);
  return {
    releaseId: `${dateKey.replaceAll('/', '')}-${pad(hour)}`,
    releaseAt: releaseAt.toISOString(),
    jstDate: dateKey,
    jstHour: hour,
    label: `${dateKey.replaceAll('/', '.')} ${pad(hour)}:00 JST`,
  };
}

/**
 * Assign a materialized batch to the first publication window at or after
 * the time it became available. A batch arriving at 09:00:00 belongs to the
 * 09:00 edition; one arriving at 09:00:00.001 waits for 15:00.
 */
export function getNewArrivalsReleaseSlotAtOrAfter(value: Date | string): NewArrivalsReleaseSlot {
  const date = asDate(value);
  const parts = jstDateParts(date);
  for (const hour of NEW_ARRIVAL_SLOT_HOURS_JST) {
    const candidate = releaseAtForJst(parts.year, parts.month, parts.day, hour);
    if (candidate.getTime() >= date.getTime()) return slotFromParts(parts.year, parts.month, parts.day, hour);
  }

  return slotFromParts(parts.year, parts.month, parts.day + 1, NEW_ARRIVAL_SLOT_HOURS_JST[0]);
}

/** Return the next strict future publication window for a browser refresh. */
export function getNextNewArrivalsReleaseAt(value: Date | string = new Date()): Date {
  const date = asDate(value);
  return new Date(getNewArrivalsReleaseSlotAtOrAfter(new Date(date.getTime() + 1)).releaseAt);
}

export function formatNewArrivalsReleaseLabel(value: Date | string): string {
  const parts = jstDateParts(value);
  return `${String(parts.year).padStart(4, '0')}.${pad(parts.month)}.${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)} JST`;
}

function safeContributionId(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:-]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown-run';
}

export function buildNewArrivalsContribution(input: {
  queueRunId: string;
  entityIds: readonly string[];
  assignedAt?: Date | string;
  queuePath?: string | null;
}): NewArrivalsContribution {
  const assignedAt = asDate(input.assignedAt ?? new Date());
  const runId = input.queueRunId.trim() || 'unknown-run';
  const entityIds = [...new Set(input.entityIds.map((id) => id.trim()).filter(Boolean))].sort();
  const slot = getNewArrivalsReleaseSlotAtOrAfter(assignedAt);

  return {
    schema_version: NEW_ARRIVALS_SCHEMA_VERSION,
    contribution_id: `contrib_${safeContributionId(runId)}`,
    release_id: slot.releaseId,
    release_at: slot.releaseAt,
    assigned_at: assignedAt.toISOString(),
    queue_run_id: runId,
    queue_path: input.queuePath?.trim() || null,
    entity_ids: entityIds,
    entity_count: entityIds.length,
  };
}

export function newArrivalsContributionKey(contribution: NewArrivalsContribution): string {
  const slot = getNewArrivalsReleaseSlotAtOrAfter(contribution.release_at);
  return `${NEW_ARRIVALS_PREFIX}${slot.jstDate}/${safeContributionId(contribution.contribution_id)}.json`;
}

export function parseNewArrivalsContribution(input: unknown): NewArrivalsContribution | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (value.schema_version !== NEW_ARRIVALS_SCHEMA_VERSION) return null;
  if (typeof value.contribution_id !== 'string' || !value.contribution_id.trim()) return null;
  if (typeof value.release_id !== 'string' || !value.release_id.trim()) return null;
  if (typeof value.release_at !== 'string' || Number.isNaN(new Date(value.release_at).getTime())) return null;
  if (typeof value.assigned_at !== 'string' || Number.isNaN(new Date(value.assigned_at).getTime())) return null;
  if (typeof value.queue_run_id !== 'string' || !value.queue_run_id.trim()) return null;
  if (value.queue_path !== null && typeof value.queue_path !== 'string') return null;
  if (!Array.isArray(value.entity_ids) || !value.entity_ids.every((id) => typeof id === 'string' && id.trim())) return null;
  const entityIds = [...new Set(value.entity_ids.map((id) => (id as string).trim()))].sort();
  if (value.entity_count !== entityIds.length) return null;
  return {
    schema_version: NEW_ARRIVALS_SCHEMA_VERSION,
    contribution_id: value.contribution_id.trim(),
    release_id: value.release_id.trim(),
    release_at: new Date(value.release_at).toISOString(),
    assigned_at: new Date(value.assigned_at).toISOString(),
    queue_run_id: value.queue_run_id.trim(),
    queue_path: typeof value.queue_path === 'string' ? value.queue_path.trim() || null : null,
    entity_ids: entityIds,
    entity_count: entityIds.length,
  };
}

export function makeNewArrivalsRelease(input: {
  releaseId: string;
  releaseAt: string;
  entityIds: readonly string[];
  contributionCount: number;
}): NewArrivalsRelease {
  const entityIds = [...new Set(input.entityIds.map((id) => id.trim()).filter(Boolean))].sort();
  return {
    releaseId: input.releaseId,
    releaseAt: new Date(input.releaseAt).toISOString(),
    label: formatNewArrivalsReleaseLabel(input.releaseAt),
    count: entityIds.length,
    entityIds,
    contributionCount: input.contributionCount,
  };
}
