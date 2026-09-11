import type { AnalystNote } from '@/shared/terminal';
import schema from '@/shared/schemas/analyst-note.json';
import { compileParser } from '@/shared/validate-json';

export const ANALYST_NOTES_STORAGE_KEY = 'make_money_analyst_notes_v1';
const parseNote = compileParser<AnalystNote>(schema, 'analyst note');

/** Salvage valid notes independently; never coerce malformed content into user text. */
export function decodeAnalystNotes(raw: string | null): {
  notes: Record<string, AnalystNote>;
  hasInvalidEntries: boolean;
} {
  if (raw === null) return { notes: {}, hasInvalidEntries: false };
  let input: unknown;
  try { input = JSON.parse(raw); }
  catch { return { notes: {}, hasInvalidEntries: true }; }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { notes: {}, hasInvalidEntries: true };
  }
  const entries: Array<[string, AnalystNote]> = [];
  let hasInvalidEntries = false;
  for (const [entityId, value] of Object.entries(input)) {
    try {
      const note = parseNote(value);
      if (note.entityId !== entityId) throw new Error('Note entity mismatch');
      entries.push([entityId, note]);
    } catch {
      hasInvalidEntries = true;
    }
  }
  return { notes: Object.fromEntries(entries), hasInvalidEntries };
}

/** Preserve a malformed original before the user's next edit replaces its storage slot. */
export function persistAnalystNotes(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  notes: Record<string, AnalystNote>,
): void {
  const original = storage.getItem(ANALYST_NOTES_STORAGE_KEY);
  if (original !== null && decodeAnalystNotes(original).hasInvalidEntries) {
    const prefix = `${ANALYST_NOTES_STORAGE_KEY}.recovery.${Date.now()}`;
    let recoveryKey = prefix;
    let suffix = 0;
    while (storage.getItem(recoveryKey) !== null) recoveryKey = `${prefix}.${++suffix}`;
    // If backup fails (quota or permission), throw before replacing the original.
    storage.setItem(recoveryKey, original);
  }
  storage.setItem(ANALYST_NOTES_STORAGE_KEY, JSON.stringify(notes));
}
