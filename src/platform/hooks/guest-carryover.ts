import { readGuestBookmarkIds } from './bookmark-storage';
import { ANALYST_NOTES_STORAGE_KEY, decodeAnalystNotes } from './analyst-notes-storage';

/** ログインする前にこの端末へ保存した事例とメモ。アカウントには入っていない。 */
export interface GuestCarryOverSummary {
  bookmarkIds: string[];
  noteIds: string[];
}

export function dismissKey(uid: string): string {
  return `makemoney.carryover.done.${uid}`;
}

export function readGuestCarryOver(storage: Pick<Storage, 'getItem'>): GuestCarryOverSummary {
  const bookmarkIds = [...readGuestBookmarkIds(storage as Storage)];
  let noteIds: string[] = [];
  try {
    const { notes } = decodeAnalystNotes(storage.getItem(ANALYST_NOTES_STORAGE_KEY));
    noteIds = Object.values(notes).filter((note) => note.content.trim()).map((note) => note.entityId);
  } catch { /* 読めない場合は空として扱う */ }
  return { bookmarkIds, noteIds };
}

export interface CarryOverResult { bookmarks: number; notes: number }

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * ゲスト分をアカウントへ移す。アカウント側に既にあるものは上書きしない（保存は追加だけ、メモは空の事例だけ）。
 * この端末のゲスト分は消さない。途中で失敗したら例外にし、呼び出し側が「移せなかった」と案内する。
 */
export async function carryOverGuestData(
  token: string,
  uid: string,
  guest: GuestCarryOverSummary,
  guestNotes: Record<string, { content: string }>,
  fetcher: Fetcher = (url, init) => fetch(url, init),
): Promise<CarryOverResult> {
  const auth = { Authorization: `Bearer ${token}` };
  const json = { ...auth, 'Content-Type': 'application/json' };
  let bookmarks = 0;
  let notes = 0;

  if (guest.bookmarkIds.length > 0) {
    const list = await fetcher('/api/bookmarks', { headers: auth, cache: 'no-store' });
    if (!list.ok) throw new Error('保存した事例を読み込めませんでした');
    const payload: unknown = await list.json();
    const rows = payload && typeof payload === 'object' && 'saved' in payload && Array.isArray(payload.saved) ? payload.saved : null;
    if (!rows) throw new Error('保存した事例を読み込めませんでした');
    const existing = new Set<string>(rows
      .filter((row: unknown): row is { itemType: string; itemId: string } => Boolean(row) && typeof row === 'object' && (row as { itemType?: unknown }).itemType === 'business' && typeof (row as { itemId?: unknown }).itemId === 'string')
      .map((row) => row.itemId));
    for (const id of guest.bookmarkIds) {
      if (existing.has(id)) continue;
      // この API は同じ事例を送るたびに保存・解除が切り替わるため、アカウントに無いものだけを送る
      const response = await fetcher('/api/bookmarks', { method: 'POST', headers: json, body: JSON.stringify({ itemType: 'business', itemId: id }) });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || !body || typeof body !== 'object' || (body as { saved?: unknown }).saved !== true) throw new Error('保存した事例を移せませんでした');
      bookmarks += 1;
    }
  }

  if (guest.noteIds.length > 0) {
    const list = await fetcher('/api/analyst-notes', { headers: auth, cache: 'no-store' });
    if (!list.ok) throw new Error('メモを読み込めませんでした');
    const payload = await list.json().catch(() => null) as { uid?: unknown; notes?: Record<string, { content?: unknown }> } | null;
    if (!payload || payload.uid !== uid || !payload.notes || typeof payload.notes !== 'object') throw new Error('メモを読み込めませんでした');
    for (const id of guest.noteIds) {
      const content = guestNotes[id]?.content;
      if (!content || !content.trim()) continue;
      const current = payload.notes[id]?.content;
      if (typeof current === 'string' && current.trim()) continue;
      const response = await fetcher('/api/analyst-notes', { method: 'PUT', headers: json, body: JSON.stringify({ entityId: id, content }) });
      if (!response.ok) throw new Error('メモを移せませんでした');
      notes += 1;
    }
  }
  return { bookmarks, notes };
}
