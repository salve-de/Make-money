export const BOOKMARK_STORAGE_KEY = 'makemoney.bookmarks.v1';
export const DEFAULT_BOOKMARK_IDS = ['ent_photoai', 'ent_keyence'] as const;

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readGuestBookmarkIds(storage?: Storage): Set<string> {
  const target = resolveStorage(storage);
  if (!target) return new Set(DEFAULT_BOOKMARK_IDS);

  try {
    const raw = target.getItem(BOOKMARK_STORAGE_KEY);
    if (raw === null) return new Set(DEFAULT_BOOKMARK_IDS);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== 'string')) {
      return new Set(DEFAULT_BOOKMARK_IDS);
    }
    return new Set(parsed.filter((id): id is string => id.trim().length > 0));
  } catch {
    return new Set(DEFAULT_BOOKMARK_IDS);
  }
}

export function writeGuestBookmarkIds(ids: ReadonlySet<string>, storage?: Storage): boolean {
  const target = resolveStorage(storage);
  if (!target) return false;
  try {
    target.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(Array.from(ids).sort()));
    return true;
  } catch {
    return false;
  }
}
