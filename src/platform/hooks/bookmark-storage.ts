export const BOOKMARK_STORAGE_KEY = 'makemoney.bookmarks.v1';

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 保存した事例のID。まだ何も保存していない人は空（見本を勝手に保存済みにしない）。 */
export function readGuestBookmarkIds(storage?: Storage): Set<string> {
  const target = resolveStorage(storage);
  if (!target) return new Set<string>();

  try {
    const raw = target.getItem(BOOKMARK_STORAGE_KEY);
    if (raw === null) return new Set<string>();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== 'string')) {
      return new Set<string>();
    }
    return new Set(parsed.filter((id): id is string => id.trim().length > 0));
  } catch {
    return new Set<string>();
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
