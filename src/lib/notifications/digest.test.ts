import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedSearchFilters } from '@/shared/saved-search';
import type { FinancialEntity } from '@/shared/terminal';
import { MAX_EMAILS_PER_RUN, MAX_ENTITY_READS, runDigest, type DigestDeps } from './digest';
import type { OutboundEmail, SendEmailResult } from './email';
import { isoWeekKeyJst, recipientHash, type NotificationKind } from './ledger';
import type { DigestAlertRecipient, DigestRelease, DigestSubscriber } from './types';

const APP = 'https://make-money.example.jp';
const NOW = new Date('2026-09-29T12:00:00+09:00'); // Tuesday of ISO week 2026-W40
const NO_FILTERS: SavedSearchFilters = { filter: 'ALL', batch: 'ALL', tags: [], bookmarks: [], screener: null };
const RELEASE: DigestRelease = { releaseId: '20260929-09', label: '2026.09.29 09:00 JST', entityIds: ['ent_alpha', 'ent_bravo', 'ent_charlie'] };

/** Three cases that differ on every axis the catalog filters look at. */
const ALPHA = entity('ent_alpha', { name: 'Alpha Studio', scale: 'SOLO', sector: 'AI_AUTOMATION', batchId: 'b1', tags: ['B2B'], margin: 60, capital: 0, moat: 'DATA' });
const BRAVO = entity('ent_bravo', { name: 'Bravo Corp', scale: 'ENTERPRISE', sector: 'OTHER', batchId: 'b2', tags: ['B2C'], margin: 20, capital: 5_000_000, moat: 'BRAND' });
const CHARLIE = entity('ent_charlie', { name: 'Charlie Works', scale: 'SOLO', sector: 'SAAS', batchId: 'b1', tags: ['B2B', '完全1人'], margin: 40, capital: 100_000, moat: 'DATA' });

function entity(id: string, spec: { name: string; scale: string; sector: string; batchId: string; tags: string[]; margin: number; capital: number; moat: string }): FinancialEntity {
  return {
    id,
    ticker: id.toUpperCase(),
    name: spec.name,
    tagline: `${spec.name}は小さく稼ぐ事業`,
    founder: '創業者',
    scale: spec.scale,
    sector: spec.sector,
    batchId: spec.batchId,
    tags: spec.tags,
    pnl: { operatingMargin: spec.margin },
    operations: { isCapitalUnconfirmed: false, initialCapitalRequired: spec.capital },
    strategy: { moatType: spec.moat, blindspot: '' },
  } as unknown as FinancialEntity;
}

function search(id: string, name: string, query = '', filters: Partial<SavedSearchFilters> = {}) {
  return { id, name, query, filters: { ...NO_FILTERS, ...filters } };
}
function person(userId: string, email: string | null, ...searches: ReturnType<typeof search>[]): DigestAlertRecipient {
  return { userId, email, searches };
}

interface Options {
  release?: DigestRelease | null;
  entities?: FinancialEntity[];
  recipients?: DigestAlertRecipient[];
  subscribers?: DigestSubscriber[];
  now?: Date;
  unsubscribeUrl?: (id: string) => string | null;
  respond?: (message: OutboundEmail) => SendEmailResult;
  alertsTruncated?: boolean;
  subscribersTruncated?: boolean;
}

/** In-memory stand-ins for storage and the mail provider, with the ledger's uniqueness rule. */
function harness(options: Options = {}) {
  const ledger = new Map<string, Set<string>>();
  const sent: OutboundEmail[] = [];
  const marks: Array<{ userId: string; searchIds: readonly string[]; release: string }> = [];
  const bucket = (kind: NotificationKind, key: string) => {
    const id = `${kind}|${key}`;
    if (!ledger.has(id)) ledger.set(id, new Set());
    return ledger.get(id)!;
  };
  const deps = {
    now: vi.fn(() => options.now ?? NOW),
    readRelease: vi.fn(async () => (options.release === undefined ? RELEASE : options.release)),
    readEntities: vi.fn(async () => options.entities ?? [ALPHA, BRAVO, CHARLIE]),
    listAlertRecipients: vi.fn(async () => ({ recipients: options.recipients ?? [], truncated: options.alertsTruncated ?? false })),
    listSubscribers: vi.fn(async () => ({ subscribers: options.subscribers ?? [], truncated: options.subscribersTruncated ?? false })),
    loadSent: vi.fn(async (kind: NotificationKind, key: string) => new Set(bucket(kind, key))),
    claim: vi.fn(async (kind: NotificationKind, hash: string, key: string) => {
      const set = bucket(kind, key);
      if (set.has(hash)) return false;
      set.add(hash);
      return true;
    }),
    unclaim: vi.fn(async (kind: NotificationKind, hash: string, key: string) => {
      bucket(kind, key).delete(hash);
    }),
    markNotified: vi.fn(async (userId: string, searchIds: readonly string[], release: string) => {
      marks.push({ userId, searchIds, release });
    }),
    unsubscribeUrl: vi.fn(async (id: string) => (options.unsubscribeUrl ? options.unsubscribeUrl(id) : `${APP}/api/notifications/unsubscribe?u=${id}&s=sig`)),
    send: vi.fn(async (message: OutboundEmail): Promise<SendEmailResult> => {
      sent.push(message);
      return options.respond ? options.respond(message) : { ok: true, id: 'mail-id' };
    }),
  } satisfies DigestDeps;
  return { deps, sent, ledger, marks, bucket };
}

const run = (h: ReturnType<typeof harness>) => runDigest(h.deps, { appUrl: APP });
const recipientsOf = (h: ReturnType<typeof harness>) => h.sent.map((message) => message.to);
/** Ledger rows held across every kind and edition. Looking a bucket up is not a claim. */
const claimedCount = (h: ReturnType<typeof harness>) => [...h.ledger.values()].reduce((total, hashes) => total + hashes.size, 0);

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('when there is nothing to send', () => {
  it('does nothing when no edition has been published yet', async () => {
    const h = harness({ release: null, recipients: [person('u1', 'one@mail.jp', search('s1', 'all'))] });
    expect(await run(h)).toEqual({ release: null, sent: 0, skipped: 0, failed: 0 });
    expect(h.deps.readEntities).not.toHaveBeenCalled();
    expect(h.deps.send).not.toHaveBeenCalled();
  });

  it('does nothing when no case of the edition can be shown', async () => {
    const h = harness({ entities: [], recipients: [person('u1', 'one@mail.jp', search('s1', 'all'))], subscribers: [{ id: 'n1', email: 'n1@mail.jp' }] });
    expect(await run(h)).toEqual({ release: '20260929-09', sent: 0, skipped: 0, failed: 0 });
    expect(h.deps.listAlertRecipients).not.toHaveBeenCalled();
    expect(h.deps.send).not.toHaveBeenCalled();
  });

  it('sends nothing to people whose searches match nothing, and does not count them as skipped', async () => {
    const h = harness({ recipients: [person('u1', 'one@mail.jp', search('s1', '該当なし', 'zzz-no-such-case'))] });
    expect(await run(h)).toEqual({ release: '20260929-09', sent: 0, skipped: 0, failed: 0 });
    expect(h.sent).toEqual([]);
    expect(claimedCount(h)).toBe(0);
  });
});

describe('matching saved searches against the edition', () => {
  const cases: Array<[string, string, Partial<SavedSearchFilters>, string[]]> = [
    ['a word in the name', 'alpha', {}, ['Alpha Studio']],
    ['a word in the description', 'は小さく稼ぐ', {}, ['Alpha Studio', 'Bravo Corp', 'Charlie Works']],
    ['no word and no filter', '', {}, ['Alpha Studio', 'Bravo Corp', 'Charlie Works']],
    ['one-person businesses', '', { filter: 'SOLO' }, ['Alpha Studio', 'Charlie Works']],
    ['high margin', '', { filter: 'HIGH_MARGIN' }, ['Alpha Studio']],
    ['no starting capital', '', { filter: 'ZERO_CAPITAL' }, ['Alpha Studio']],
    ['large companies', '', { filter: 'MONOPOLY' }, ['Bravo Corp']],
    ['AI-native', '', { filter: 'AI_NATIVE' }, ['Alpha Studio']],
    ['every tag must be present', '', { tags: ['B2B', '完全1人'] }, ['Charlie Works']],
    ['a single tag', '', { tags: ['B2B'] }, ['Alpha Studio', 'Charlie Works']],
    ['a batch', '', { batch: 'b2' }, ['Bravo Corp']],
    ['a screener on scale and margin', '', { screener: { scales: ['SOLO'], minMargin: 50, maxCapital: null, moats: [] } }, ['Alpha Studio']],
    ['a screener capital ceiling', '', { screener: { scales: [], minMargin: 0, maxCapital: 200_000, moats: [] } }, ['Alpha Studio', 'Charlie Works']],
    ['a screener moat', '', { screener: { scales: [], minMargin: 0, maxCapital: null, moats: ['BRAND'] } }, ['Bravo Corp']],
    ['a word and a filter together', 'alpha', { filter: 'MONOPOLY' }, []],
  ];

  it.each(cases)('%s', async (_label, query, filters, expectedNames) => {
    const h = harness({ recipients: [person('u1', 'one@mail.jp', search('s1', '条件', query, filters))] });
    const result = await run(h);
    if (expectedNames.length === 0) {
      expect(result.sent).toBe(0);
      expect(h.sent).toEqual([]);
      return;
    }
    expect(result.sent).toBe(1);
    const text = h.sent[0].text;
    for (const name of ['Alpha Studio', 'Bravo Corp', 'Charlie Works']) {
      if (expectedNames.includes(name)) expect(text).toContain(name);
      else expect(text).not.toContain(name);
    }
    expect(h.sent[0].subject).toContain(`${expectedNames.length}件`);
  });

  it('never treats the saved-cases list as a condition, even if a stored row still carries bookmarks', async () => {
    const h = harness({ recipients: [person('u1', 'one@mail.jp', search('s1', '保存済み', '', { filter: 'BOOKMARKED', bookmarks: ['ent_alpha'] }))] });
    expect((await run(h)).sent).toBe(0);
    expect(h.sent).toEqual([]);
  });

  it('does not announce a case it cannot evaluate, and still handles the others', async () => {
    const broken = { ...ALPHA, id: 'ent_broken', name: 'Broken Case', strategy: undefined } as unknown as FinancialEntity;
    const screener = { scales: [], minMargin: 0, maxCapital: null, moats: ['DATA'] };
    const h = harness({ entities: [broken, CHARLIE], recipients: [person('u1', 'one@mail.jp', search('s1', 'データ堀', '', { screener }))] });
    expect((await run(h)).sent).toBe(1);
    expect(h.sent[0].text).toContain('Charlie Works');
    expect(h.sent[0].text).not.toContain('Broken Case');
  });
});

describe('the saved-search email', () => {
  it('sends one email per person, combining all of their searches and naming which matched', async () => {
    const h = harness({
      recipients: [
        person('u1', 'one@mail.jp', search('s1', '一人事業', '', { filter: 'SOLO' }), search('s2', '高利益率', '', { filter: 'HIGH_MARGIN' }), search('s3', '無関係', 'zzz-none')),
        person('u2', 'two@mail.jp', search('s4', '大企業', '', { filter: 'MONOPOLY' })),
      ],
    });
    expect(await run(h)).toEqual({ release: '20260929-09', sent: 2, skipped: 0, failed: 0 });

    const first = h.sent.find((message) => message.to === 'one@mail.jp')!;
    // Alpha matches two of the person's searches but is listed once
    expect(first.text.match(/entity=ent_alpha/g)).toHaveLength(1);
    expect(first.text).toContain('一致した条件: 一人事業、高利益率');
    expect(first.text).toContain('Charlie Works');
    expect(first.text).not.toContain('Bravo Corp');
    expect(first.subject).toBe('【Make Money】保存した条件に合う新着事例が2件あります');
    expect(first.text).toContain(`${APP}/?entity=ent_alpha`);
    expect(first.text).toContain(`${APP}/alerts`);
    expect(first.headers).toBeUndefined();

    const second = h.sent.find((message) => message.to === 'two@mail.jp')!;
    expect(second.text).toContain('Bravo Corp');
    expect(second.text).not.toContain('Alpha Studio');
  });

  it('records which searches were notified, and only those that matched', async () => {
    const h = harness({ recipients: [person('u1', 'one@mail.jp', search('s1', '一人事業', '', { filter: 'SOLO' }), search('s3', '無関係', 'zzz-none'))] });
    await run(h);
    expect(h.marks).toEqual([{ userId: 'u1', searchIds: ['s1'], release: '20260929-09' }]);
  });

  it('lists at most 10 cases and reports the full count', async () => {
    const many = Array.from({ length: 12 }, (_, index) => entity(`ent_case_${String(index).padStart(2, '0')}`, { name: `Case ${String(index).padStart(2, '0')}`, scale: 'SOLO', sector: 'SAAS', batchId: 'b1', tags: [], margin: 50, capital: 0, moat: 'DATA' }));
    const h = harness({ entities: many, recipients: [person('u1', 'one@mail.jp', search('s1', '全部'))] });
    await run(h);
    const mail = h.sent[0];
    expect(mail.subject).toContain('12件');
    expect(mail.text).toContain('Case 09');
    expect(mail.text).not.toContain('Case 10');
    expect(mail.text).toContain('ほか2件は、サイトで確認できます。');
  });

  it('addresses the mail to the stored address, normalized, with a key that identifies person and edition', async () => {
    const h = harness({ recipients: [person('u1', '  One@Mail.JP ', search('s1', '全部'))] });
    await run(h);
    const hash = await recipientHash('one@mail.jp');
    expect(h.sent[0].to).toBe('one@mail.jp');
    expect(h.sent[0].idempotencyKey).toBe(`mm-saved_search-${hash}-20260929-09`);
  });

  it('keeps going when recording the notified edition fails: the mail was sent', async () => {
    const h = harness({ recipients: [person('u1', 'one@mail.jp', search('s1', '全部'))] });
    h.deps.markNotified.mockRejectedValueOnce(new Error('db down'));
    expect(await run(h)).toMatchObject({ sent: 1, failed: 0 });
  });
});

describe('never mailing the same edition twice', () => {
  const twoPeople = () => [person('u1', 'one@mail.jp', search('s1', '全部')), person('u2', 'two@mail.jp', search('s2', '全部'))];

  it('sends nothing on a repeated run of the same edition', async () => {
    const h = harness({ recipients: twoPeople() });
    expect(await run(h)).toMatchObject({ sent: 2, skipped: 0 });
    expect(await run(h)).toEqual({ release: '20260929-09', sent: 0, skipped: 2, failed: 0 });
    expect(h.sent).toHaveLength(2);
  });

  it('sends again when a new edition is published', async () => {
    const h = harness({ recipients: twoPeople() });
    await run(h);
    h.deps.readRelease.mockResolvedValue({ ...RELEASE, releaseId: '20260929-15', label: '2026.09.29 15:00 JST' });
    expect(await run(h)).toMatchObject({ release: '20260929-15', sent: 2 });
    expect(h.sent).toHaveLength(4);
  });

  it('claims before sending, so two overlapping runs cannot both send', async () => {
    const h = harness({ recipients: twoPeople() });
    const order: string[] = [];
    h.deps.claim.mockImplementation(async (kind, hash, key) => {
      order.push('claim');
      const set = h.bucket(kind, key);
      if (set.has(hash)) return false;
      set.add(hash);
      return true;
    });
    h.deps.send.mockImplementation(async (message) => {
      order.push('send');
      h.sent.push(message);
      return { ok: true, id: 'x' };
    });
    const [first, second] = await Promise.all([run(h), run(h)]);
    expect(first.sent + second.sent).toBe(2);
    expect(first.skipped + second.skipped).toBe(2);
    expect(h.sent).toHaveLength(2);
    expect(order.indexOf('claim')).toBeLessThan(order.indexOf('send'));
  });

  it('skips a person another run has just claimed, without sending', async () => {
    const h = harness({ recipients: twoPeople() });
    const taken = await recipientHash('one@mail.jp');
    h.deps.claim.mockImplementation(async (kind, hash, key) => {
      const set = h.bucket(kind, key);
      if (hash === taken || set.has(hash)) return false;
      set.add(hash);
      return true;
    });
    expect(await run(h)).toEqual({ release: '20260929-09', sent: 1, skipped: 1, failed: 0 });
    expect(recipientsOf(h)).toEqual(['two@mail.jp']);
  });

  it('mails an address shared by two accounts once per edition', async () => {
    const h = harness({ recipients: [person('u1', 'same@mail.jp', search('s1', '全部')), person('u2', 'SAME@mail.jp', search('s2', '全部'))] });
    expect(await run(h)).toMatchObject({ sent: 1, skipped: 1 });
  });

  it('keeps the claim when the provider says it already holds this exact mail', async () => {
    const h = harness({ recipients: [person('u1', 'one@mail.jp', search('s1', '全部'))], respond: () => ({ ok: true, id: null, duplicate: true }) });
    expect(await run(h)).toEqual({ release: '20260929-09', sent: 0, skipped: 1, failed: 0 });
    expect(h.deps.unclaim).not.toHaveBeenCalled();
    expect(h.marks).toEqual([]);
  });
});

describe('when a send fails', () => {
  it('gives the claim back, keeps going for everyone else, and a later run delivers only what is missing', async () => {
    const h = harness({
      recipients: [person('u1', 'one@mail.jp', search('s1', '全部')), person('u2', 'two@mail.jp', search('s2', '全部'))],
      respond: (message) => (message.to === 'two@mail.jp' ? { ok: false, status: 503, retryable: true, code: null } : { ok: true, id: 'ok' }),
    });
    expect(await run(h)).toEqual({ release: '20260929-09', sent: 1, skipped: 0, failed: 1 });
    expect(h.bucket('saved_search', '20260929-09').size).toBe(1);
    expect(h.marks.map((mark) => mark.userId)).toEqual(['u1']);

    // the provider recovers; the second run sends to the one who did not get it and nobody else
    h.deps.send.mockImplementation(async (message) => {
      h.sent.push(message);
      return { ok: true, id: 'ok' };
    });
    const before = h.sent.length;
    expect(await run(h)).toEqual({ release: '20260929-09', sent: 1, skipped: 1, failed: 0 });
    expect(h.sent.slice(before).map((message) => message.to)).toEqual(['two@mail.jp']);
  });

  it('reuses the same idempotency key on the retry, so a mail that did go out cannot go out twice', async () => {
    const h = harness({ recipients: [person('u1', 'one@mail.jp', search('s1', '全部'))], respond: () => ({ ok: false, status: 0, retryable: true, code: 'network' }) });
    await run(h);
    await run(h);
    expect(h.sent).toHaveLength(2);
    expect(h.sent[0].idempotencyKey).toBeTruthy();
    expect(h.sent[1].idempotencyKey).toBe(h.sent[0].idempotencyKey);
  });

  it('still counts the failure if giving the claim back also fails', async () => {
    const h = harness({ recipients: [person('u1', 'one@mail.jp', search('s1', '全部'))], respond: () => ({ ok: false, status: 500, retryable: true, code: null }) });
    h.deps.unclaim.mockRejectedValueOnce(new Error('db down'));
    expect(await run(h)).toMatchObject({ sent: 0, failed: 1 });
  });
});

describe('addresses', () => {
  it('never mails an account without a real address, and never invents one', async () => {
    const h = harness({
      recipients: [
        person('u1', null, search('s1', '全部')),
        person('u2', 'placeholder123@anon.example.com', search('s2', '全部')),
        person('u3', '', search('s3', '全部')),
        person('u4', 'real@mail.jp', search('s4', '全部')),
      ],
    });
    expect(await run(h)).toEqual({ release: '20260929-09', sent: 1, skipped: 3, failed: 0 });
    expect(recipientsOf(h)).toEqual(['real@mail.jp']);
    // nothing was claimed for the unusable ones
    expect(h.bucket('saved_search', '20260929-09').size).toBe(1);
  });

  it('does not count an address-less account that has nothing to be told', async () => {
    const h = harness({ recipients: [person('u1', null, search('s1', '該当なし', 'zzz-none'))] });
    expect(await run(h)).toEqual({ release: '20260929-09', sent: 0, skipped: 0, failed: 0 });
  });
});

describe('the weekly newsletter', () => {
  const subscribers: DigestSubscriber[] = [{ id: 'sub-1', email: 'sub1@mail.jp' }, { id: 'sub-2', email: 'Sub2@Mail.jp' }, { id: 'sub-3', email: 'x@anon.example.com' }];

  it('sends the edition to each active subscriber with their own stop link', async () => {
    const h = harness({ subscribers });
    expect(await run(h)).toEqual({ release: '20260929-09', sent: 2, skipped: 1, failed: 0 });
    expect(recipientsOf(h)).toEqual(['sub1@mail.jp', 'sub2@mail.jp']);
    const [first, second] = h.sent;
    expect(first.subject).toBe('【Make Money】新着事例のお知らせ（2026.09.29 09:00 JST）');
    expect(first.text).toContain('Alpha Studio');
    expect(first.text).toContain(`配信の停止: ${APP}/api/notifications/unsubscribe?u=sub-1&s=sig`);
    expect(second.text).toContain('u=sub-2');
    expect(first.headers).toMatchObject({ 'List-Unsubscribe': `<${APP}/api/notifications/unsubscribe?u=sub-1&s=sig>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });
    expect(first.html).toContain('配信を停止する');
  });

  it('lists at most 10 cases', async () => {
    const many = Array.from({ length: 12 }, (_, index) => entity(`ent_case_${String(index).padStart(2, '0')}`, { name: `Case ${String(index).padStart(2, '0')}`, scale: 'SOLO', sector: 'SAAS', batchId: 'b1', tags: [], margin: 50, capital: 0, moat: 'DATA' }));
    const h = harness({ entities: many, subscribers: [subscribers[0]] });
    await run(h);
    expect(h.sent[0].text).toContain('Case 09');
    expect(h.sent[0].text).not.toContain('Case 10');
    expect(h.sent[0].text).toContain('ほか2件は、サイトで確認できます。');
  });

  it('is limited to one a week however often the digest runs, even across editions', async () => {
    const h = harness({ subscribers: [subscribers[0]] });
    expect(await run(h)).toMatchObject({ sent: 1 });
    expect(await run(h)).toMatchObject({ sent: 0, skipped: 1 });
    h.deps.readRelease.mockResolvedValue({ ...RELEASE, releaseId: '20260930-09', label: '2026.09.30 09:00 JST' });
    h.deps.now.mockReturnValue(new Date('2026-10-02T12:00:00+09:00')); // Friday, same ISO week
    expect(await run(h)).toMatchObject({ sent: 0, skipped: 1 });
    expect(h.bucket('newsletter', '2026-W40').size).toBe(1);
  });

  it('sends again the following week', async () => {
    const h = harness({ subscribers: [subscribers[0]] });
    await run(h);
    h.deps.now.mockReturnValue(new Date('2026-10-06T12:00:00+09:00'));
    expect(isoWeekKeyJst(new Date('2026-10-06T12:00:00+09:00'))).toBe('2026-W41');
    expect(await run(h)).toMatchObject({ sent: 1 });
    expect(h.sent).toHaveLength(2);
  });

  it('never sends a newsletter that has no way to stop it', async () => {
    const h = harness({ subscribers, unsubscribeUrl: () => null });
    expect(await run(h)).toEqual({ release: '20260929-09', sent: 0, skipped: 3, failed: 0 });
    expect(h.deps.send).not.toHaveBeenCalled();
    expect(h.deps.claim).not.toHaveBeenCalled();
  });

  it('keeps alert mails and the newsletter apart, even for the same address', async () => {
    const h = harness({ recipients: [person('u1', 'both@mail.jp', search('s1', '全部'))], subscribers: [{ id: 'sub-1', email: 'both@mail.jp' }] });
    expect(await run(h)).toMatchObject({ sent: 2 });
    expect(h.sent.map((message) => message.subject.includes('保存した条件'))).toEqual([true, false]);
  });

  it('gives the newsletter its own ledger key, by kind and week', async () => {
    const h = harness({ subscribers: [subscribers[0]] });
    await run(h);
    expect([...h.ledger.keys()]).toEqual(['newsletter|2026-W40']);
    expect(h.sent[0].idempotencyKey).toBe(`mm-newsletter-${await recipientHash('sub1@mail.jp')}-2026-W40`);
  });
});

describe('failures before anything is sent', () => {
  it('stops with nothing sent or claimed when the cases cannot be read, so a re-run redoes the whole edition', async () => {
    const h = harness({ recipients: [person('u1', 'one@mail.jp', search('s1', '全部'))], subscribers: [subscribers()[0]] });
    h.deps.readEntities.mockRejectedValue(new Error('R2 unavailable'));
    await expect(run(h)).rejects.toThrow('R2 unavailable');
    expect(h.deps.listAlertRecipients).not.toHaveBeenCalled();
    expect(h.deps.claim).not.toHaveBeenCalled();
    expect(h.deps.send).not.toHaveBeenCalled();
    expect(claimedCount(h)).toBe(0);
  });

  it('stops when the newest edition cannot be read', async () => {
    const h = harness();
    h.deps.readRelease.mockRejectedValue(new Error('index unavailable'));
    await expect(run(h)).rejects.toThrow('index unavailable');
    expect(h.deps.send).not.toHaveBeenCalled();
  });

  function subscribers(): DigestSubscriber[] {
    return [{ id: 'sub-1', email: 'sub1@mail.jp' }];
  }
});

describe('bounds on one run', () => {
  const crowd = (count: number) => Array.from({ length: count }, (_, index) => person(`u${index}`, `user${index}@mail.jp`, search(`s${index}`, '全部')));

  it('stops at the send limit, says so, and a re-run finishes the rest without repeating anyone', async () => {
    const total = MAX_EMAILS_PER_RUN + 5;
    const h = harness({ recipients: crowd(total) });
    expect(await run(h)).toEqual({ release: '20260929-09', sent: MAX_EMAILS_PER_RUN, skipped: 0, failed: 0, truncated: true });
    expect(await run(h)).toEqual({ release: '20260929-09', sent: 5, skipped: MAX_EMAILS_PER_RUN, failed: 0 });
    expect(new Set(recipientsOf(h)).size).toBe(total);
    expect(h.sent).toHaveLength(total);
  });

  it('does not spend the send limit on people who were already mailed', async () => {
    const h = harness({ recipients: crowd(MAX_EMAILS_PER_RUN + 1) });
    await run(h);
    const second = await run(h);
    expect(second).toMatchObject({ sent: 1, skipped: MAX_EMAILS_PER_RUN });
    expect(second.truncated).toBeUndefined();
  });

  it('shares the send limit between alerts and the newsletter, alerts first', async () => {
    const h = harness({ recipients: crowd(MAX_EMAILS_PER_RUN), subscribers: [{ id: 'sub-1', email: 'sub1@mail.jp' }] });
    const result = await run(h);
    expect(result).toMatchObject({ sent: MAX_EMAILS_PER_RUN, truncated: true });
    expect(recipientsOf(h)).not.toContain('sub1@mail.jp');
  });

  it('reads at most the first cases of a very large edition and reports it', async () => {
    const ids = Array.from({ length: MAX_ENTITY_READS + 50 }, (_, index) => `ent_${index}`);
    const h = harness({ release: { ...RELEASE, entityIds: ids }, recipients: [] });
    expect(await run(h)).toMatchObject({ truncated: true });
    expect(h.deps.readEntities).toHaveBeenCalledWith(ids.slice(0, MAX_ENTITY_READS));
  });

  it('reports when a recipient list was cut short by its own limit', async () => {
    expect(await run(harness({ recipients: [], alertsTruncated: true }))).toMatchObject({ truncated: true });
    expect(await run(harness({ subscribers: [{ id: 'sub-1', email: 'sub1@mail.jp' }], subscribersTruncated: true }))).toMatchObject({ truncated: true });
  });

  it('omits the flag when nothing was cut', async () => {
    const result = await run(harness({ recipients: crowd(3) }));
    expect(result).not.toHaveProperty('truncated');
  });
});
