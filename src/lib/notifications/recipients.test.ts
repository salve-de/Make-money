import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn() }));

vi.mock('@/lib/storage/d1', () => ({ queryD1: state.query, executeD1: state.execute }));

import {
  DELETE_SUBSCRIBER_SQL,
  deleteNewsletterSubscriber,
  listActiveSubscribers,
  listAlertRecipients,
  LIST_ALERT_SEARCHES_SQL,
  LIST_SUBSCRIBERS_SQL,
  markSavedSearchesNotified,
} from './recipients';

const filters = JSON.stringify({ filter: 'SOLO', batch: 'ALL', tags: [], bookmarks: [], screener: null });
const row = (overrides: Record<string, unknown> = {}) => ({ id: 's1', userId: 'u1', name: '条件', query: 'AI', filters, email: 'one@mail.jp', ...overrides });

/** queryD1 runs its own row parser; emulate that so the module under test sees the same errors. */
function answer(rows: unknown[]) {
  return async (_sql: string, _params: unknown[], parse?: (value: unknown) => unknown) => rows.map((value) => (parse ? parse(value) : value));
}

beforeEach(() => {
  state.query.mockReset();
  state.execute.mockReset().mockResolvedValue({ changes: 1, lastRowId: null });
});

describe('listAlertRecipients', () => {
  it('reads only searches with notifications on, joined to the stored account address', () => {
    expect(LIST_ALERT_SEARCHES_SQL).toContain('WHERE s.notify = 1');
    expect(LIST_ALERT_SEARCHES_SQL).toContain('LEFT JOIN users u ON u.id = s.user_id');
    expect(LIST_ALERT_SEARCHES_SQL).toMatch(/LIMIT 5000/);
  });

  it('groups searches by person, keeping the order the database gave', async () => {
    state.query.mockImplementation(answer([
      row({ id: 's1', userId: 'u1', name: '一つ目' }),
      row({ id: 's2', userId: 'u1', name: '二つ目' }),
      row({ id: 's3', userId: 'u2', name: '別の人', email: 'two@mail.jp' }),
    ]));
    const { recipients, truncated } = await listAlertRecipients();
    expect(truncated).toBe(false);
    expect(recipients.map((recipient) => [recipient.userId, recipient.email, recipient.searches.map((item) => item.id)])).toEqual([
      ['u1', 'one@mail.jp', ['s1', 's2']],
      ['u2', 'two@mail.jp', ['s3']],
    ]);
    expect(recipients[0].searches[0]).toEqual({ id: 's1', name: '一つ目', query: 'AI', filters: { filter: 'SOLO', batch: 'ALL', tags: [], bookmarks: [], screener: null } });
  });

  it('keeps a person with no account row, with a null address, so the digest can skip them', async () => {
    state.query.mockImplementation(answer([row({ email: null })]));
    expect((await listAlertRecipients()).recipients[0].email).toBeNull();
  });

  it('leaves out a search whose stored conditions can no longer be read, rather than guessing', async () => {
    state.query.mockImplementation(answer([
      row({ id: 'broken', filters: '{' }),
      row({ id: 'bookmarks', filters: JSON.stringify({ filter: 'BOOKMARKED', batch: 'ALL', tags: [], bookmarks: ['ent_x'], screener: null }) }),
      row({ id: 'fine' }),
    ]));
    const { recipients } = await listAlertRecipients();
    expect(recipients[0].searches.map((item) => item.id)).toEqual(['fine']);
  });

  it('drops a person all of whose searches are unreadable', async () => {
    state.query.mockImplementation(answer([row({ filters: 'nonsense' })]));
    expect((await listAlertRecipients()).recipients).toEqual([]);
  });

  it('reports when the row limit was reached, so an operator can see a run did not cover everyone', async () => {
    state.query.mockImplementation(answer(Array.from({ length: 5000 }, (_, index) => row({ id: `s${index}`, userId: `u${index}` }))));
    expect((await listAlertRecipients()).truncated).toBe(true);
  });

  it('fails loudly on a malformed row', async () => {
    state.query.mockImplementation(answer([{ id: 's1' }]));
    await expect(listAlertRecipients()).rejects.toThrow('malformed');
  });
});

describe('markSavedSearchesNotified', () => {
  it("updates only the given searches of the given person, in one statement", async () => {
    await markSavedSearchesNotified('u1', ['s1', 's2'], '20260929-09');
    expect(state.execute).toHaveBeenCalledExactlyOnceWith(
      'UPDATE saved_searches SET last_notified_release=? WHERE user_id=? AND id IN (?,?)',
      ['20260929-09', 'u1', 's1', 's2'],
    );
  });

  it('does nothing without ids and bounds the list', async () => {
    await markSavedSearchesNotified('u1', [], '20260929-09');
    expect(state.execute).not.toHaveBeenCalled();
    await markSavedSearchesNotified('u1', Array.from({ length: 150 }, (_, index) => `s${index}`), '20260929-09');
    expect((state.execute.mock.calls[0][1] as unknown[]).length).toBe(2 + 100);
  });
});

describe('newsletter subscribers', () => {
  it('reads only active subscribers, oldest first, within a limit', () => {
    expect(LIST_SUBSCRIBERS_SQL).toContain("status = 'active'");
    // Double opt-in: a pending sign-up (confirmed_at NULL) is never a recipient.
    expect(LIST_SUBSCRIBERS_SQL).toContain('confirmed_at IS NOT NULL');
    expect(LIST_SUBSCRIBERS_SQL).toContain('ORDER BY subscribed_at, id');
    expect(LIST_SUBSCRIBERS_SQL).toMatch(/LIMIT 5000/);
  });

  it('returns the stored id and address', async () => {
    state.query.mockImplementation(answer([{ id: 'n1', email: 'a@mail.jp' }, { id: 'n2', email: 'b@mail.jp' }]));
    expect(await listActiveSubscribers()).toEqual({
      subscribers: [{ id: 'n1', email: 'a@mail.jp' }, { id: 'n2', email: 'b@mail.jp' }],
      truncated: false,
    });
  });

  it('reports the limit and rejects malformed rows', async () => {
    state.query.mockImplementation(answer(Array.from({ length: 5000 }, (_, index) => ({ id: `n${index}`, email: `n${index}@mail.jp` }))));
    expect((await listActiveSubscribers()).truncated).toBe(true);
    state.query.mockImplementation(answer([{ id: 'n1' }]));
    await expect(listActiveSubscribers()).rejects.toThrow('malformed');
  });

  it('deletes one subscriber row by id', async () => {
    await deleteNewsletterSubscriber('n1');
    expect(state.execute).toHaveBeenCalledExactlyOnceWith(DELETE_SUBSCRIBER_SQL, ['n1']);
    expect(DELETE_SUBSCRIBER_SQL).toBe('DELETE FROM newsletter_subscribers WHERE id = ?');
  });
});
