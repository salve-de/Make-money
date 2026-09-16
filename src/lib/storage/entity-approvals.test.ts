import { beforeEach, describe, expect, it, vi } from 'vitest';
import { approveD1Entities, EntityApprovalStoreError, listD1ApprovedEntityIds } from './entity-approvals';
import { batchD1, queryD1 } from './d1';

vi.mock('./d1', () => ({ batchD1: vi.fn(), queryD1: vi.fn() }));
const batch = vi.mocked(batchD1);
const query = vi.mocked(queryD1);

beforeEach(() => {
  batch.mockReset();
  query.mockReset();
});

describe('D1 entity approval store', () => {
  it('writes idempotent approval rows and acknowledges only after read-back', async () => {
    batch.mockResolvedValue([{ changes: 1, lastRowId: null }, { changes: 1, lastRowId: null }]);
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

  it('rejects a partial provider acknowledgement after write instead of reporting success', async () => {
    batch.mockResolvedValue([{ changes: 1, lastRowId: null }, { changes: 1, lastRowId: null }]);
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

  it('returns the canonical persisted overlay for supplied IDs', async () => {
    query.mockImplementation(async (_sql, _params, parseRow) => [parseRow!({ entityId: 'a' }), parseRow!({ entityId: 'b' })]);
    await expect(listD1ApprovedEntityIds(['a', 'b'])).resolves.toEqual(['a', 'b']);
  });
});
