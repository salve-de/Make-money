import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ local: vi.fn(), canonical: vi.fn(), view: vi.fn(), parse: vi.fn(), adapt: vi.fn(), gate: vi.fn() }));
vi.mock('@/lib/company-access/local-entity-index', () => ({ findCachedPublishableEntity: state.local }));
vi.mock('@/lib/foundation/business-reader', () => ({ readFoundationEntitySummaryById: state.canonical }));
vi.mock('@/lib/foundation/make-money-view', () => ({ readMakeMoneyViewDetail: state.view }));
vi.mock('@/lib/foundation/schema', () => ({ parseFoundationBusinessCase: state.parse }));
vi.mock('@/lib/foundation/foundation-adapter', () => ({ adaptFoundationDetailToFinancialEntity: state.adapt, adaptFoundationSummaryToFinancialEntity: state.adapt }));
vi.mock('@/lib/company-access/public-entity', () => ({ isPublishableEntity: state.gate, publicEntity: (v: unknown) => v, publicFoundationData: (v: unknown) => v }));
import { findExecutionSource } from './source';

describe('execution identity without financial publication', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    state.local.mockResolvedValue(null); state.canonical.mockResolvedValue(null);
    state.view.mockResolvedValue(null); state.parse.mockImplementation(v => v);
    state.adapt.mockImplementation(v => v); state.gate.mockReturnValue(true);
  });
  it('carries publishable R2 context into execution without financial or private fields', async () => {
    state.view.mockResolvedValue({ id: 'ent_live', name: 'Live', tagline: 'Recorded business',
      strategy: { actionPlaybook: [], initialTraction: [], blindspot: 'Recorded insight' },
      operations: { primaryChannels: ['Recorded channel'] }, pnl: { monthlyRevenue: 99 }, meta: { secret: true } });
    const source = await findExecutionSource('ent_live');
    expect(source?.strategy.blindspot).toBe('Recorded insight');
    expect(source?.operations.primaryChannels).toEqual(['Recorded channel']);
    expect(source?.contextUnavailable).toBeUndefined();
    expect(source).not.toHaveProperty('pnl'); expect(source).not.toHaveProperty('meta');
  });
  it('does not carry rejected R2 context into a blank plan', async () => {
    state.view.mockResolvedValue({ id: 'ent_live', name: 'Live' });
    state.gate.mockReturnValue(false);
    state.canonical.mockResolvedValue({ id: 'ent_live', name: 'Live' });
    expect(await findExecutionSource('ent_live')).toMatchObject({ contextUnavailable: true });
  });
  it('rejects a mismatched or invalid R2 view', async () => {
    state.view.mockResolvedValue({ id: 'ent_other', name: 'Other' });
    expect(await findExecutionSource('ent_live')).toBeNull();
    state.parse.mockImplementation(() => { throw new Error('Invalid schema'); });
    expect(await findExecutionSource('ent_live')).toBeNull();
  });
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
