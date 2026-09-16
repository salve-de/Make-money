import { beforeEach, describe, expect, it, vi } from 'vitest';
import { approveD1Entities, EntityApprovalStoreError, listD1ApprovedEntityIds } from './entity-approvals';
import { batchD1, queryD1 } from './d1';
import { MAX_APPROVAL_IDS_PER_REQUEST } from '@/shared/entity-approval-contract';

vi.mock('./d1', () => ({ batchD1: vi.fn(), queryD1: vi.fn() }));
const batch = vi.mocked(batchD1);
const query = vi.mocked(queryD1);

beforeEach(() => {
  batch.mockReset();
  query.mockReset();
});

describe('D1 entity approval store', () => {
  it('writes idempotent approval rows and acknowledges only after read-back', async () => {
    batch.mockResolvedValue([{ changes: 2, lastRowId: null }]);
    query.mockImplementation(async (_sql, params, parseRow) => (params || []).map((id) => parseRow!({ entityId: id })));
    await expect(approveD1Entities([' A ', 'b', 'a'], 'admin-1')).resolves.toEqual({
      approvedCount: 2,
      entityIds: ['a', 'b'],
      updated: true,
    });
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch.mock.calls[0][0]).toHaveLength(1);
    expect(batch.mock.calls[0][0][0].sql).toContain('ON CONFLICT(entity_id) DO NOTHING');
  });

  it('keeps the maximum route batch inside D1 bind and invocation query budgets', async () => {
    const ids = Array.from({ length: MAX_APPROVAL_IDS_PER_REQUEST }, (_, index) => `ent-${index}`);
    batch.mockImplementation(async (statements) => statements.map(() => ({ changes: 1, lastRowId: null })));
    query.mockImplementation(async (_sql, params, parseRow) => (params || []).map((id) => parseRow!({ entityId: id })));

    await expect(approveD1Entities(ids, 'admin-1')).resolves.toMatchObject({
      approvedCount: MAX_APPROVAL_IDS_PER_REQUEST,
      entityIds: ids,
    });

    expect(batch).toHaveBeenCalledTimes(1);
    const statements = batch.mock.calls[0][0];
    expect(statements).toHaveLength(27);
    expect(Math.max(...statements.map((statement) => statement.params.length))).toBeLessThanOrEqual(90);
    expect(query).toHaveBeenCalledTimes(8);
    expect(statements.length + query.mock.calls.length).toBeLessThanOrEqual(50);
  });

  it('rejects a partial provider acknowledgement after write instead of reporting success', async () => {
    batch.mockResolvedValue([{ changes: 2, lastRowId: null }]);
    query.mockImplementation(async (_sql, params, parseRow) => [parseRow!({ entityId: params?.[0] })]);
    await expect(approveD1Entities(['a', 'b'], 'admin-1')).rejects.toBeInstanceOf(EntityApprovalStoreError);
  });

  it('is safe to retry rows that already exist', async () => {
    batch.mockResolvedValue([{ changes: 0, lastRowId: null }]);
    query.mockImplementation(async (_sql, params, parseRow) => (params || []).map((id) => parseRow!({ entityId: id })));
    await expect(approveD1Entities(['a'], 'admin-1')).resolves.toMatchObject({ updated: false, entityIds: ['a'] });
  });

  it('rejects malformed IDs before touching D1', async () => {
    await expect(approveD1Entities(['../../etc/passwd'], 'admin-1')).rejects.toBeInstanceOf(EntityApprovalStoreError);
    expect(batch).not.toHaveBeenCalled();
  });

  it('returns only the canonical persisted overlay for supplied IDs', async () => {
    query.mockImplementation(async (_sql, _params, parseRow) => [parseRow!({ entityId: 'a' })]);
    await expect(listD1ApprovedEntityIds(['a', 'b'])).resolves.toEqual(['a']);
    expect(query.mock.calls[0][0]).toContain('WHERE entity_id IN');
  });
});
