import { describe, expect, it } from 'vitest';
import { ANALYST_NOTES_STORAGE_KEY as key, decodeAnalystNotes, persistAnalystNotes } from './analyst-notes-storage';
const note = { entityId: 'ent_valid', content: '保存するメモ jkJK', updatedAt: '2026-09-11T00:00:00Z' };

describe('analyst note recovery', () => {
  it('preserves valid text and additional fields without coercion', () => {
    const input = { ent_valid: { ...note, futureField: 'keep' } };
    expect(decodeAnalystNotes(JSON.stringify(input))).toEqual({ notes: input, hasInvalidEntries: false });
  });
  it.each(['null', '[]', '42', '"text"', '{broken', '', '{"bad":{"content":42}}'])('rejects malformed saved notes: %s', (raw) => {
    expect(decodeAnalystNotes(raw)).toEqual({ notes: {}, hasInvalidEntries: true });
  });
  it('salvages good records without letting one broken record erase them', () => {
    const raw = JSON.stringify({ ent_valid: note, bad: { content: 42 }, wrongId: note });
    expect(decodeAnalystNotes(raw)).toEqual({ notes: { ent_valid: note }, hasInvalidEntries: true });
    expect(decodeAnalystNotes(null)).toEqual({ notes: {}, hasInvalidEntries: false });
  });
  it('backs up the exact malformed original before a user edit and supports reload', () => {
    const original = JSON.stringify({ ent_valid: note, bad: { content: 42 } });
    const values = new Map([[key, original]]);
    const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
    persistAnalystNotes(storage, { ent_valid: { ...note, content: 'edited' } });
    expect([...values.entries()].filter(([k]) => k.startsWith(`${key}.recovery.`)).map(([, v]) => v)).toEqual([original]);
    expect(decodeAnalystNotes(storage.getItem(key)).notes.ent_valid.content).toBe('edited');
    persistAnalystNotes(storage, { ent_valid: note });
    expect(values.size).toBe(2);
  });
  it('does not overwrite the malformed original if recovery storage fails', () => {
    const original = '{broken';
    const writes: string[] = [];
    const storage = { getItem: (k: string) => k === key ? original : null, setItem: (k: string) => { writes.push(k); throw new Error('QuotaExceededError'); } };
    expect(() => persistAnalystNotes(storage, { ent_valid: note })).toThrow('QuotaExceededError');
    expect(writes).toHaveLength(1);
    expect(writes[0]).not.toBe(key);
    expect(storage.getItem(key)).toBe(original);
  });
});
