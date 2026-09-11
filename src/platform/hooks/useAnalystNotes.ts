'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { AnalystNote } from '../types/terminal';
import { ANALYST_NOTES_STORAGE_KEY, decodeAnalystNotes, persistAnalystNotes } from './analyst-notes-storage';

export type NoteSaveStatus = 'loading' | 'saved' | 'local' | 'saving' | 'error';
type NoteState = { owner: string | null; notes: Record<string, AnalystNote>; status: NoteSaveStatus; saveStatuses?: Record<string, NoteSaveStatus>; guestDirty?: boolean };
/** A state from a previous account must never appear during an authentication transition. */
export function notesForOwner(state: NoteState, owner: string | null): Record<string, AnalystNote> {
  return state.owner === owner ? state.notes : {};
}

export function shouldPersistGuestNotes(state: NoteState, owner: string | null, loading: boolean): boolean {
  return !loading && owner === null && state.owner === null && state.status === 'local' && state.guestDirty === true;
}

export function useAnalystNotes() {
  const { user, token, loading } = useAuth();
  const owner = user?.uid ?? null;
  const [state, setState] = useState<NoteState>({ owner: null, notes: {}, status: 'loading' });
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    let cancelled = false;
    const timers = pending.current;
    async function load() {
      if (loading) return;
      if (!owner) {
        try {
          const notes = decodeAnalystNotes(localStorage.getItem(ANALYST_NOTES_STORAGE_KEY)).notes;
          if (!cancelled) setState({ owner, notes, status: 'local' });
        } catch { if (!cancelled) setState({ owner, notes: {}, status: 'error' }); }
        return;
      }
      if (!token) return;
      try {
        const response = await fetch('/api/analyst-notes', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (!response.ok) throw new Error('Notes unavailable');
        const data = await response.json();
        if (data.uid !== owner) throw new Error('Wrong note owner');
        const decoded = decodeAnalystNotes(JSON.stringify(data.notes));
        if (decoded.hasInvalidEntries) throw new Error('Invalid notes');
        if (!cancelled) setState((previous) => {
          // A GET started before an edit can finish after its PUT. Keep all explicitly edited drafts, even once acknowledged.
          if (previous.owner === owner && previous.saveStatuses && Object.keys(previous.saveStatuses).length) {
            const edited = Object.fromEntries(Object.keys(previous.saveStatuses).filter((id) => previous.notes[id]).map((id) => [id, previous.notes[id]]));
            return { ...previous, notes: { ...decoded.notes, ...edited } };
          }
          return { owner, notes: decoded.notes, status: 'saved' };
        });
      } catch { if (!cancelled) setState((previous) => ({ owner, notes: notesForOwner(previous, owner), status: 'error' })); }
    }
    void load();
    return () => { cancelled = true; for (const timer of timers.values()) clearTimeout(timer); timers.clear(); };
  }, [owner, token, loading]);

  const saveNote = useCallback((entityId: string, content: string) => {
    const note = { entityId, content, updatedAt: new Date().toISOString() };
    setState((previous) => ({ owner, notes: { ...notesForOwner(previous, owner), [entityId]: note }, status: owner ? 'saving' : 'local', guestDirty: !owner, saveStatuses: { ...(previous.owner === owner ? previous.saveStatuses : {}), [entityId]: owner ? 'saving' : 'local' } }));
    if (!owner) return; // Guest persistence is handled by the effect below, never uploaded on login.
    if (!token) { setState((previous) => ({ ...previous, status: 'error', saveStatuses: { ...previous.saveStatuses, [entityId]: 'error' } })); return; }
    const old = pending.current.get(entityId); if (old) clearTimeout(old);
    pending.current.set(entityId, setTimeout(() => {
      pending.current.delete(entityId);
      queue.current = queue.current.catch(() => {}).then(async () => {
        let saved = false;
        try {
          const response = await fetch('/api/analyst-notes', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ entityId, content }) });
          const data = await response.json();
          saved = response.ok && data.uid === owner && data.note?.content === content;
        } catch { /* Keep the current in-memory draft and visibly report unsaved state. */ }
        setState((previous) => previous.owner !== owner || previous.notes[entityId]?.updatedAt !== note.updatedAt ? previous : { ...previous, status: saved ? 'saved' : 'error', saveStatuses: { ...previous.saveStatuses, [entityId]: saved ? 'saved' : 'error' } });
      });
    }, 400));
  }, [owner, token]);
  useEffect(() => {
    if (!shouldPersistGuestNotes(state, owner, loading)) return;
    try { persistAnalystNotes(localStorage, state.notes); }
    catch {
      // Synchronize a browser storage failure into the visible save status.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState((previous) => ({ ...previous, status: 'error' }));
    }
  }, [state, owner, loading]);
  const notes = useMemo(() => loading ? {} : notesForOwner(state, owner), [loading, state, owner]);
  const getNote = useCallback((entityId: string) => notes[entityId]?.content || '', [notes]);
  const getSaveStatus = useCallback((entityId: string): NoteSaveStatus => state.owner !== owner || loading ? 'loading' : !owner ? state.status : state.saveStatuses?.[entityId] ?? state.status, [state, owner, loading]);
  return { notes, getNote, saveNote, getSaveStatus, allNotesList: Object.values(notes).filter((note) => note.content.trim()), isLoaded: !loading && state.owner === owner && state.status !== 'loading', saveStatus: state.owner === owner ? state.status : 'loading' as NoteSaveStatus };
}
