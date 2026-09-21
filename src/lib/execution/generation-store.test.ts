import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/lib/storage/d1', () => ({ queryD1: state.query }));

import { executionOwnerKey, getExecutionGeneration } from './generation-store';

beforeEach(() => {
  state.query.mockReset().mockResolvedValue([]);
});

describe('execution generation store', () => {
  it('uses a deterministic opaque owner key rather than the raw UID', () => {
    const key = executionOwnerKey('user-123');
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain('user-123');
    expect(executionOwnerKey('user-123')).toBe(key);
    expect(executionOwnerKey('user-456')).not.toBe(key);
  });

  it('defaults to generation zero before any account-data reset', async () => {
    await expect(getExecutionGeneration('user-123')).resolves.toEqual({ generation: 0, resetAt: null });
  });

  it('reads and validates the persisted generation tombstone', async () => {
    state.query.mockImplementation(async (_sql: string, _params: unknown[], parse: (value: unknown) => unknown) => [
      parse({ generation: 3, resetAt: '2026-09-19T00:00:00.000Z' }),
    ]);
    await expect(getExecutionGeneration('user-123')).resolves.toEqual({
      generation: 3,
      resetAt: '2026-09-19T00:00:00.000Z',
    });
  });

  it('rejects malformed generation rows', async () => {
    state.query.mockImplementation(async (_sql: string, _params: unknown[], parse: (value: unknown) => unknown) => [
      parse({ generation: -1, resetAt: null }),
    ]);
    await expect(getExecutionGeneration('user-123')).rejects.toThrow('Invalid execution generation');
  });
});
