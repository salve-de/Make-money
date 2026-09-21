import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ local: vi.fn(), canonical: vi.fn() }));
vi.mock('@/lib/company-access/local-entity-index', () => ({ findCachedPublishableEntity: state.local }));
vi.mock('@/lib/foundation/business-reader', () => ({ readFoundationEntitySummaryById: state.canonical }));
import { findExecutionSource } from './source';

describe('execution identity without financial publication', () => {
  beforeEach(() => { state.local.mockResolvedValue(null); state.canonical.mockResolvedValue(null); });
  it('opens a known case even when its financial evidence gate rejects the dossier', async () => {
    const source = await findExecutionSource('ent_keyence');
    expect(source).toMatchObject({ id: 'ent_keyence', contextUnavailable: true });
    expect(source).not.toHaveProperty('pnl');
    expect(source).not.toHaveProperty('meta');
    expect(source?.strategy.actionPlaybook).toEqual([]);
  });
  it('supports canonical new arrivals not yet in the local registry', async () => {
    state.canonical.mockResolvedValue({ id: 'ent_new', name: 'New case' });
    expect(await findExecutionSource('ent_new')).toMatchObject({ id: 'ent_new', name: 'New case' });
  });
  it('does not invent unknown identities', async () => {
    expect(await findExecutionSource('ent_unknown')).toBeNull();
  });
  it('does not send financial or premium fields from a publishable dossier', async () => {
    state.local.mockResolvedValue({ id: 'ent_known', name: 'Known', pnl: { monthlyRevenue: 42 },
      meta: { private: true }, strategy: { actionPlaybook: [], blindspot: 'hint' }, operations: { primaryChannels: [] } });
    const source = await findExecutionSource('ent_known');
    expect(source?.strategy.blindspot).toBe('hint');
    expect(source).not.toHaveProperty('pnl');
    expect(source).not.toHaveProperty('meta');
  });
});
