import { batchD1, queryD1, type D1Statement } from './d1';
import { ENTITY_APPROVAL_ID_PATTERN } from '@/shared/entity-approval-contract';

export class EntityApprovalStoreError extends Error {
  constructor(message: string, readonly status: 503 = 503) {
    super(message);
    this.name = 'EntityApprovalStoreError';
  }
}

// D1 allows at most 100 bound parameters per query. Three parameters are used
// per inserted row, so 30 rows keeps one multi-row INSERT at 90 parameters.
const WRITE_ROWS_PER_QUERY = 30;
const READ_CHUNK_SIZE = 100;

function normalizeIds(values: readonly string[]): string[] {
  const ids = [...new Set(values.map((value) => value.trim().toLowerCase()))];
  if (ids.some((id) => !ENTITY_APPROVAL_ID_PATTERN.test(id))) {
    throw new EntityApprovalStoreError('Invalid entity approval identifier');
  }
  return ids;
}

function chunks<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function parseApprovalRow(value: unknown): { entityId: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new EntityApprovalStoreError('Invalid approval row');
  const entityId = (value as Record<string, unknown>).entityId;
  if (typeof entityId !== 'string' || !ENTITY_APPROVAL_ID_PATTERN.test(entityId)) throw new EntityApprovalStoreError('Invalid approval row');
  return { entityId };
}

async function readBack(ids: readonly string[]): Promise<Set<string>> {
  const persisted = new Set<string>();
  for (const chunk of chunks(ids, READ_CHUNK_SIZE)) {
    const placeholders = chunk.map(() => '?').join(',');
    const rows = await queryD1(
      `SELECT entity_id AS entityId FROM entity_approvals WHERE entity_id IN (${placeholders})`,
      [...chunk],
      parseApprovalRow,
    );
    for (const row of rows) persisted.add(row.entityId);
  }
  return persisted;
}

function buildInsertStatements(ids: readonly string[], actor: string, approvedAt: string): D1Statement[] {
  return chunks(ids, WRITE_ROWS_PER_QUERY).map((chunk) => ({
    sql: `INSERT INTO entity_approvals(entity_id,approved_by,approved_at) VALUES ${chunk.map(() => '(?,?,?)').join(',')} ON CONFLICT(entity_id) DO NOTHING`,
    params: chunk.flatMap((entityId) => [entityId, actor, approvedAt]),
  }));
}

/**
 * Persist a global editorial approval overlay in D1.
 *
 * One Worker invocation uses a small number of multi-row writes plus bounded
 * read-back queries. Upserts are idempotent, so a later client chunk can retry
 * safely after transport/provider failure.
 */
export async function approveD1Entities(rawIds: readonly string[], approvedBy: string) {
  const ids = normalizeIds(rawIds);
  const actor = approvedBy.trim();
  if (!actor || actor.length > 128) throw new EntityApprovalStoreError('Invalid approval actor');
  if (ids.length === 0) return { approvedCount: 0, entityIds: [], updated: false };

  const approvedAt = new Date().toISOString();
  try {
    const statements = buildInsertStatements(ids, actor, approvedAt);
    const results = await batchD1(statements);
    const changes = results.reduce((sum, result) => sum + result.changes, 0);

    const persisted = await readBack(ids);
    if (ids.some((id) => !persisted.has(id))) {
      throw new EntityApprovalStoreError('Approval read-back did not confirm every entity');
    }
    return { approvedCount: ids.length, entityIds: ids, updated: changes > 0 };
  } catch (error) {
    if (error instanceof EntityApprovalStoreError) throw error;
    throw new EntityApprovalStoreError('Approval could not be persisted');
  }
}

/** Return only the approved subset of caller-supplied IDs; never full-scan the table. */
export async function listD1ApprovedEntityIds(rawIds: readonly string[]): Promise<string[]> {
  const ids = normalizeIds(rawIds);
  if (ids.length === 0) return [];
  try {
    const persisted = await readBack(ids);
    return ids.filter((id) => persisted.has(id));
  } catch (error) {
    if (error instanceof EntityApprovalStoreError) throw error;
    throw new EntityApprovalStoreError('Approval store unavailable');
  }
}
