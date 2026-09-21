import { describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/lib/storage/d1', () => ({ queryD1: state.query }));
vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: vi.fn().mockResolvedValue(null) }));
import { getBuilderCreditBudget } from './budget';

describe('builder budget for older active sessions', () => {
  it('counts recently updated sessions and blocks exhausted credit allowance', async () => {
    state.query.mockImplementation(async (sql: string) => {
      expect(sql).toContain("updated_at >= datetime('now','-1 day')");
      expect(sql).not.toContain('created_at >=');
      return [{ used: 6 }];
    });
    expect(await getBuilderCreditBudget('owner')).toEqual({ used: 6, limit: 5, remaining: 0 });
  });
});
