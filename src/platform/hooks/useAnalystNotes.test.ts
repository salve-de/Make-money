import { describe, expect, it, vi } from 'vitest';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null, token: null, loading: false }) }));
import { notesForOwner, shouldPersistGuestNotes } from './useAnalystNotes';
describe('analyst note account transitions', () => {
  const notes = { x: { entityId: 'x', content: 'private user A note', updatedAt: '2026-09-11' } };
  it('hides old user notes synchronously before new owner fetch resolves', () => {
    const state = { owner: 'A', notes, status: 'saved' as const };
    expect(notesForOwner(state, 'A')).toEqual(notes);
    expect(notesForOwner(state, 'B')).toEqual({});
    expect(notesForOwner(state, null)).toEqual({});
  });
  it('does not copy guest notes into a signed-in account', () => {
    const state = { owner: null, notes, status: 'local' as const };
    expect(notesForOwner(state, null)).toEqual(notes);
    expect(notesForOwner(state, 'A')).toEqual({});
  });
});

describe('guest storage preservation until an explicit edit', () => {
  it('does not rewrite recovered or malformed storage merely by loading it', () => {
    const restored = { owner: null, notes: {}, status: 'local' as const };
    expect(shouldPersistGuestNotes(restored, null, false)).toBe(false);
    expect(shouldPersistGuestNotes({ ...restored, guestDirty: false }, null, false)).toBe(false);
    expect(shouldPersistGuestNotes({ ...restored, guestDirty: true }, null, false)).toBe(true);
  });
  it('does not flush guest edits into an account or during authentication transitions', () => {
    const edited = { owner: null, notes: {}, status: 'local' as const, guestDirty: true };
    expect(shouldPersistGuestNotes(edited, 'account', false)).toBe(false);
    expect(shouldPersistGuestNotes(edited, null, true)).toBe(false);
    expect(shouldPersistGuestNotes({ ...edited, owner: 'previous-user' }, null, false)).toBe(false);
  });
});
