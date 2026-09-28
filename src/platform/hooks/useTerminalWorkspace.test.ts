import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ query: '', setters: [] as ReturnType<typeof vi.fn>[] }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(state.query) }));
vi.mock('react', () => ({
  useState: (initial: unknown) => {
    const setter = vi.fn();
    state.setters.push(setter);
    return [initial, setter];
  },
  useEffect: (effect: () => void) => effect(),
}));
import { useTerminalWorkspace } from './useTerminalWorkspace';

describe('workspace URL synchronization', () => {
  it('restores ledger when history returns from a mode URL to the root URL', () => {
    vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
    try {
      state.setters = [];
      state.query = 'mode=SYNTHESIS';
      useTerminalWorkspace();
      expect(state.setters[0]).toHaveBeenLastCalledWith('SYNTHESIS');
      state.setters = [];
      state.query = '';
      useTerminalWorkspace();
      expect(state.setters[0]).toHaveBeenLastCalledWith('LEDGER');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
