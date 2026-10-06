import { describe, expect, it, vi } from 'vitest';
import { BOOKMARK_STORAGE_KEY } from './bookmark-storage';
import { ANALYST_NOTES_STORAGE_KEY } from './analyst-notes-storage';
import { carryOverGuestData, readGuestCarryOver } from './guest-carryover';

const store = (entries: Record<string, string>) => ({ getItem: (key: string) => entries[key] ?? null });
const res = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

describe('readGuestCarryOver', () => {
  it('ゲストの保存とメモの件数を数える（空のメモは数えない）', () => {
    const note = (id: string, content: string) => ({ entityId: id, content, updatedAt: '2026-10-06T00:00:00.000Z' });
    const summary = readGuestCarryOver(store({
      [BOOKMARK_STORAGE_KEY]: JSON.stringify(['a', 'b']),
      [ANALYST_NOTES_STORAGE_KEY]: JSON.stringify({ a: note('a', '要確認'), b: note('b', '  ') }),
    }));
    expect(summary).toEqual({ bookmarkIds: ['a', 'b'], noteIds: ['a'] });
  });
  it('何も無ければ空', () => {
    expect(readGuestCarryOver(store({}))).toEqual({ bookmarkIds: [], noteIds: [] });
  });
});

describe('carryOverGuestData', () => {
  it('アカウントに無い保存だけを追加し、既にあるメモは上書きしない', async () => {
    const calls: string[] = [];
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url} ${init?.body ?? ''}`);
      if (url === '/api/bookmarks' && !init?.method) return res({ saved: [{ itemType: 'business', itemId: 'a' }] });
      if (url === '/api/bookmarks') return res({ saved: true });
      if (url === '/api/analyst-notes' && !init?.method) return res({ uid: 'u1', notes: { n1: { content: '既存' } } });
      return res({ uid: 'u1' });
    });
    const result = await carryOverGuestData('t', 'u1',
      { bookmarkIds: ['a', 'b'], noteIds: ['n1', 'n2'] },
      { n1: { content: 'ゲスト1' }, n2: { content: 'ゲスト2' } }, fetcher);
    expect(result).toEqual({ bookmarks: 1, notes: 1 });
    expect(calls.filter((c) => c.startsWith('POST'))).toEqual(['POST /api/bookmarks {"itemType":"business","itemId":"b"}']);
    expect(calls.filter((c) => c.startsWith('PUT'))).toEqual(['PUT /api/analyst-notes {"entityId":"n2","content":"ゲスト2"}']);
  });
  it('読み込みに失敗したら何も送らず例外にする', async () => {
    const fetcher = vi.fn(async () => res({}, false));
    await expect(carryOverGuestData('t', 'u1', { bookmarkIds: ['a'], noteIds: [] }, {}, fetcher)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('別のアカウントのメモ応答は受け付けない', async () => {
    const fetcher = vi.fn(async () => res({ uid: 'other', notes: {} }));
    await expect(carryOverGuestData('t', 'u1', { bookmarkIds: [], noteIds: ['n'] }, { n: { content: 'x' } }, fetcher)).rejects.toThrow();
  });
});
