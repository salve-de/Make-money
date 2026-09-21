import { describe, expect, it } from 'vitest';
import { DEFAULT_BOOKMARK_IDS, readGuestBookmarkIds, writeGuestBookmarkIds } from './bookmark-storage';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
    clear: () => { values.clear(); },
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() { return values.size; },
  } as Storage;
}

describe('bookmark storage', () => {
  it('uses the guest defaults when no browser state exists', () => {
    const storage = memoryStorage();
    expect(Array.from(readGuestBookmarkIds(storage))).toEqual(DEFAULT_BOOKMARK_IDS);
  });

  it('round-trips bookmark IDs without changing the input set', () => {
    const storage = memoryStorage();
    const ids = new Set(['ent_custom', 'ent_photoai']);
    expect(writeGuestBookmarkIds(ids, storage)).toBe(true);
    expect(Array.from(readGuestBookmarkIds(storage))).toEqual(['ent_custom', 'ent_photoai']);
    expect(ids).toEqual(new Set(['ent_custom', 'ent_photoai']));
  });

  it('recovers from malformed local storage instead of crashing the ledger', () => {
    const storage = memoryStorage();
    storage.setItem('makemoney.bookmarks.v1', '{broken');
    expect(Array.from(readGuestBookmarkIds(storage))).toEqual(DEFAULT_BOOKMARK_IDS);
  });
});
