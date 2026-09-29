import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn() }));

vi.mock('@/lib/storage/d1', () => ({ queryD1: state.query, executeD1: state.execute }));

import {
  CLAIM_SEND_SQL,
  claimSend,
  isoWeekKeyJst,
  loadSentRecipients,
  LOAD_SENT_SQL,
  NOTIFICATION_KINDS,
  RELEASE_SEND_SQL,
  recipientHash,
  releaseSend,
} from './ledger';

beforeEach(() => {
  state.query.mockReset();
  state.execute.mockReset().mockResolvedValue({ changes: 1, lastRowId: null });
});

describe('recipientHash', () => {
  it('is a stable SHA-256 hex digest that ignores case and surrounding spaces', async () => {
    const hash = await recipientHash('Reader@Mail.JP');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await recipientHash('  reader@mail.jp ')).toBe(hash);
  });

  it('differs per address and never contains the address', async () => {
    const a = await recipientHash('a@mail.jp');
    const b = await recipientHash('b@mail.jp');
    expect(a).not.toBe(b);
    expect(a).not.toContain('@');
    expect(a).not.toContain('mail');
  });
});

describe('isoWeekKeyJst', () => {
  it.each([
    ['2026-09-29T00:00:00+09:00', '2026-W40'], // a Tuesday
    ['2026-09-28T00:00:00+09:00', '2026-W40'], // the Monday that opens the week
    ['2026-09-27T23:59:59+09:00', '2026-W39'], // the Sunday that closes the previous one
    ['2026-01-01T12:00:00+09:00', '2026-W01'], // ISO week 1 contains the first Thursday
    ['2026-12-31T12:00:00+09:00', '2026-W53'], // 2026 has 53 ISO weeks
    ['2027-01-01T12:00:00+09:00', '2026-W53'], // and the new calendar year still belongs to it
    ['2024-12-30T12:00:00+09:00', '2025-W01'], // Monday of the week that holds 2025's first Thursday
    ['2025-06-15T12:00:00+09:00', '2025-W24'],
  ])('%s is in %s', (moment, expected) => {
    expect(isoWeekKeyJst(new Date(moment))).toBe(expected);
  });

  it('follows Japan time, not UTC, at the week boundary', () => {
    // 2026-09-27 16:00 UTC is already Monday 01:00 in Japan
    expect(isoWeekKeyJst(new Date('2026-09-27T16:00:00Z'))).toBe('2026-W40');
    expect(isoWeekKeyJst(new Date('2026-09-27T14:59:59Z'))).toBe('2026-W39');
  });

  it('gives the same key for every moment of one week', () => {
    const keys = new Set(['2026-09-28T00:00:00', '2026-09-30T13:00:00', '2026-10-04T23:59:59'].map((moment) => isoWeekKeyJst(new Date(`${moment}+09:00`))));
    expect([...keys]).toEqual(['2026-W40']);
  });
});

describe('ledger statements', () => {
  it('uses the two kinds the migration and the digest agree on', () => {
    expect(NOTIFICATION_KINDS).toEqual({ savedSearch: 'saved_search', newsletter: 'newsletter' });
  });

  it('claims with the unique key and asks for the row back to learn whether it won', async () => {
    state.query.mockResolvedValueOnce([{ id: 'row-1' }]);
    expect(await claimSend('saved_search', 'hash-1', '20260929-09', 1234)).toBe(true);
    const [sql, params] = state.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toBe(CLAIM_SEND_SQL);
    expect(sql).toContain('ON CONFLICT(kind,recipient_hash,release_key) DO NOTHING');
    expect(sql).toContain('RETURNING id');
    expect(params).toEqual([expect.stringMatching(/^[0-9a-f-]{36}$/), 'saved_search', 'hash-1', '20260929-09', 1234]);
  });

  it('reports a lost claim when nothing is inserted', async () => {
    state.query.mockResolvedValueOnce([]);
    expect(await claimSend('newsletter', 'hash-1', '2026-W40')).toBe(false);
  });

  it('releases exactly one recipient-edition claim', async () => {
    await releaseSend('saved_search', 'hash-1', '20260929-09');
    expect(state.execute).toHaveBeenCalledWith(RELEASE_SEND_SQL, ['saved_search', 'hash-1', '20260929-09']);
    expect(RELEASE_SEND_SQL).toContain('kind=? AND recipient_hash=? AND release_key=?');
  });

  it('loads who was already mailed for one kind and edition as a set', async () => {
    state.query.mockImplementationOnce(async (_sql: string, _params: unknown[], parse: (value: unknown) => unknown) =>
      [{ recipientHash: 'h1' }, { recipientHash: 'h2' }, { recipientHash: 'h1' }].map(parse));
    const sent = await loadSentRecipients('saved_search', '20260929-09');
    expect(sent).toEqual(new Set(['h1', 'h2']));
    expect(state.query.mock.calls[0].slice(0, 2)).toEqual([LOAD_SENT_SQL, ['saved_search', '20260929-09']]);
  });

  it('fails loudly on a malformed ledger row rather than treating everyone as unsent', async () => {
    state.query.mockImplementationOnce(async (_sql: string, _params: unknown[], parse: (value: unknown) => unknown) => [{ wrong: 1 }].map(parse));
    await expect(loadSentRecipients('saved_search', '20260929-09')).rejects.toThrow('malformed');
  });
});
