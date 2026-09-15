import { batchD1, queryD1, type D1Statement } from './d1';

export class EntityApprovalStoreError extends Error {
  constructor(message: string, readonly status: 503 = 503) {
    super(message);
    this.name = 'EntityApprovalStoreError';
  }
}

const WRITE_CHUNK_SIZE = 100;
const READ_CHUNK_SIZE = 50;
const ENTITY_ID = /^[a-z0-9][a-z0-9._:-]{0,199}$/;

function normalizeIds(values: readonly string[]): string[] {
  const ids = [...new Set(values.map((value) => value.trim().toLowerCase()))];
  if (ids.some((id) => !ENTITY_ID.test(id))) throw new EntityApprovalStoreError('Invalid entity approval identifier');
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
  if (typeof entityId !== 'string' || !ENTITY_ID.test(entityId)) throw new EntityApprovalStoreError('Invalid approval row');
  return { entityId };
}

async function readBack(ids: readonly string[]): Promise<Set<string>> {
  const persisted = new Set<string>();
  for (const chunk of chunks(ids, READ_CHUNK_SIZE)) {
    const placeholders = chunk.map(() => '?').join(',');
    const rows = await queryD1(`SELECT entity_id AS entityId FROM entity_approvals WHERE entity_id IN (${placeholders})`, [...chunk], parseApprovalRow);
    for (const row of rows) persisted.add(row.entityId);
  }
  return persisted;
}

/**
 * Persist a global editorial approval overlay in D1.
 *
 * Batches are intentionally chunked. Each upsert is idempotent, so a provider
 * failure after an earlier chunk can be retried safely. We never acknowledge
 * success until a read-back proves that every requested ID is present.
 */
export async function approveD1Entities(rawIds: readonly string[], approvedBy: string) {
  const ids = normalizeIds(rawIds);
  const actor = approvedBy.trim();
  if (!actor || actor.length > 128) throw new EntityApprovalStoreError('Invalid approval actor');
  if (ids.length === 0) return { approvedCount: 0, entityIds: [], updated: false };

  const approvedAt = new Date().toISOString();
  let changes = 0;
  try {
    for (const chunk of chunks(ids, WRITE_CHUNK_SIZE)) {
      const statements: D1Statement[] = chunk.map((entityId) => ({
        sql: 'INSERT INTO entity_approvals(entity_id,approved_by,approved_at) VALUES(?,?,?) ON CONFLICT(entity_id) DO NOTHING',
        params: [entityId, actor, approvedAt],
      }));
      const results = await batchD1(statements);
      changes += results.reduce((sum, result) => sum + result.changes, 0);
    }

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

export async function listD1ApprovedEntityIds(): Promise<string[]> {
  try {
    const rows = await queryD1('SELECT entity_id AS entityId FROM entity_approvals ORDER BY entity_id', [], parseApprovalRow);
    return rows.map((row) => row.entityId);
  } catch (error) {
    if (error instanceof EntityApprovalStoreError) throw error;
    throw new EntityApprovalStoreError('Approval store unavailable');
  }
}
