import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ env: {} as Record<string, string | undefined> }));

vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: async (name: string) => state.env[name] }));

import {
  buildNewsletterEmail,
  buildSavedSearchEmail,
  entityLink,
  isDeliverableEmail,
  isEmailConfigured,
  MAX_MAIL_ENTITIES,
  normalizeAppUrl,
  readEmailConfig,
  sendEmail,
  type MailEntity,
  type OutboundEmail,
} from './email';

const APP = 'https://make-money.example.jp';
const message: OutboundEmail = {
  to: 'reader@mail.jp',
  subject: '件名',
  text: '本文',
  html: '<p>本文</p>',
  idempotencyKey: 'mm-saved_search-abc-20260929-09',
};

function entity(index: number, overrides: Partial<MailEntity> = {}): MailEntity {
  return { id: `ent_saas_${String(index).padStart(20, '0')}`, name: `事例${index}`, tagline: `事例${index}は月額課金で稼ぐ一人事業`, ...overrides };
}

beforeEach(() => {
  state.env = { RESEND_API_KEY: 're_test_key', NOTIFY_FROM_EMAIL: 'Make Money <notify@make-money.example.jp>' };
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('configuration', () => {
  it('is configured only when both the API key and the sender are set', async () => {
    expect(await isEmailConfigured()).toBe(true);
    expect(await readEmailConfig()).toEqual({ apiKey: 're_test_key', from: 'Make Money <notify@make-money.example.jp>' });
    for (const missing of ['RESEND_API_KEY', 'NOTIFY_FROM_EMAIL']) {
      state.env = { ...state.env, [missing]: undefined };
      expect(await isEmailConfigured()).toBe(false);
      state.env = { RESEND_API_KEY: 're_test_key', NOTIFY_FROM_EMAIL: 'notify@make-money.example.jp' };
    }
    state.env = {};
    expect(await isEmailConfigured()).toBe(false);
  });

  it('refuses a sender that could inject headers or is not an address', async () => {
    state.env.NOTIFY_FROM_EMAIL = 'notify@make-money.example.jp\r\nBcc: attacker@mail.jp';
    expect(await isEmailConfigured()).toBe(false);
    state.env.NOTIFY_FROM_EMAIL = 'not-an-address';
    expect(await isEmailConfigured()).toBe(false);
  });
});

describe('isDeliverableEmail', () => {
  it.each(['reader@mail.jp', 'first.last+tag@sub.gmail.com', ' spaced@mail.jp '])('accepts %j', (value) => {
    expect(isDeliverableEmail(value)).toBe(true);
  });

  it.each([
    'abc123@anon.example.com', // the placeholder /api/user/me stores when an account has no email
    'someone@example.com',
    'someone@EXAMPLE.ORG',
    'someone@mail.test',
    'someone@app.localhost',
    'someone@site.invalid',
    'no-at-sign',
    'a@b',
    'two words@mail.jp',
    '<x@mail.jp>',
    'a@b@mail.jp',
    `${'a'.repeat(250)}@mail.jp`,
    '',
    null,
    undefined,
    42,
  ])('rejects %j', (value) => {
    expect(isDeliverableEmail(value)).toBe(false);
  });
});

describe('sendEmail', () => {
  it('does nothing and reports why when mail is not configured', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    state.env = {};
    expect(await sendEmail(message)).toEqual({ ok: false, status: 0, retryable: false, code: 'not_configured' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("posts to Resend with the key, the sender, one recipient and the mail's idempotency key", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ id: 'email-1' }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const withHeaders = { ...message, headers: { 'List-Unsubscribe': '<https://x.example/u>' } };

    expect(await sendEmail(withHeaders)).toEqual({ ok: true, id: 'email-1' });

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({
      Authorization: 'Bearer re_test_key',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'mm-saved_search-abc-20260929-09',
    });
    expect(JSON.parse(init?.body as string)).toEqual({
      from: 'Make Money <notify@make-money.example.jp>',
      to: ['reader@mail.jp'],
      subject: '件名',
      text: '本文',
      html: '<p>本文</p>',
      headers: { 'List-Unsubscribe': '<https://x.example/u>' },
    });
  });

  it('omits the idempotency key and custom headers when there are none', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const { idempotencyKey: _key, ...plain } = message;
    void _key;
    expect(await sendEmail(plain)).toEqual({ ok: true, id: null });
    const [, init] = fetcher.mock.calls[0];
    expect(init?.headers).not.toHaveProperty('Idempotency-Key');
    expect(JSON.parse(init?.body as string)).not.toHaveProperty('headers');
  });

  it('reports a provider rejection without throwing, and does not retry it', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ name: 'validation_error', message: 'bad' }), { status: 422 }));
    vi.stubGlobal('fetch', fetcher);
    expect(await sendEmail(message)).toEqual({ ok: false, status: 422, retryable: false, code: 'validation_error' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('marks server errors as worth trying again on the next run', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response('gateway down', { status: 503 })));
    expect(await sendEmail(message)).toEqual({ ok: false, status: 503, retryable: true, code: null });
  });

  it('waits for the time the provider asks and retries a rate-limited send with the same key', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{"name":"rate_limit_exceeded"}', { status: 429, headers: { 'retry-after': '2' } }))
      .mockResolvedValueOnce(new Response('{"id":"email-2"}', { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const sleep = vi.fn(async () => {});

    expect(await sendEmail(message, { sleep })).toEqual({ ok: true, id: 'email-2' });

    expect(sleep).toHaveBeenCalledExactlyOnceWith(2000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({ 'Idempotency-Key': 'mm-saved_search-abc-20260929-09' });
  });

  it('gives up after three rate-limited attempts and says it can be retried later', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response('{}', { status: 429 }));
    vi.stubGlobal('fetch', fetcher);
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => {});
    expect(await sendEmail(message, { sleep })).toEqual({ ok: false, status: 429, retryable: true, code: null });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    // no header: a short default, never an unbounded wait
    expect(sleep.mock.calls.every(([ms]) => ms >= 250 && ms <= 5000)).toBe(true);
  });

  it('caps a very long retry-after', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'retry-after': '3600' } }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const sleep = vi.fn(async () => {});
    await sendEmail(message, { sleep });
    expect(sleep).toHaveBeenCalledWith(5000);
  });

  it('treats "this exact mail was already accepted" as delivered, not as a failure', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response('{"name":"invalid_idempotent_request"}', { status: 409 })));
    expect(await sendEmail(message)).toEqual({ ok: true, id: null, duplicate: true });
  });

  it('treats a request still in progress as retryable', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response('{"name":"concurrent_idempotent_requests"}', { status: 409 })));
    expect(await sendEmail(message)).toMatchObject({ ok: false, status: 409, retryable: true, code: 'concurrent_idempotent_requests' });
  });

  it('returns a network failure instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network down'); }));
    expect(await sendEmail(message)).toEqual({ ok: false, status: 0, retryable: true, code: 'network' });
  });

  it('never puts the API key anywhere but the Authorization header', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    await sendEmail(message);
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).not.toContain('re_test_key');
    expect(init?.body as string).not.toContain('re_test_key');
  });
});

describe('normalizeAppUrl and entityLink', () => {
  it('keeps the origin and any path, without a trailing slash', () => {
    expect(normalizeAppUrl('https://make-money.example.jp/')).toBe('https://make-money.example.jp');
    expect(normalizeAppUrl(' http://localhost:3000 ')).toBe('http://localhost:3000');
    expect(normalizeAppUrl('https://host.example/app/')).toBe('https://host.example/app');
  });

  it.each([undefined, null, '', 'not a url', 'javascript:alert(1)', 'ftp://host.example'])('rejects %j', (value) => {
    expect(normalizeAppUrl(value)).toBeNull();
  });

  it('builds the case link the site understands and encodes the id', () => {
    expect(entityLink(APP, 'ent_a_1')).toBe(`${APP}/?entity=ent_a_1`);
    expect(entityLink(APP, 'a b&c')).toBe(`${APP}/?entity=a%20b%26c`);
  });
});

describe('buildSavedSearchEmail', () => {
  it('names the count, lists each case with its link, and points to the management page', () => {
    const mail = buildSavedSearchEmail({ appUrl: APP, total: 2, entities: [entity(1, { conditions: ['高利益率'] }), entity(2)] });
    expect(mail.subject).toBe('【Make Money】保存した条件に合う新着事例が2件あります');
    expect(mail.text).toContain('1. 事例1');
    expect(mail.text).toContain('事例1は月額課金で稼ぐ一人事業');
    expect(mail.text).toContain(`${APP}/?entity=ent_saas_00000000000000000001`);
    expect(mail.text).toContain('一致した条件: 高利益率');
    expect(mail.text).toContain(`条件と通知の管理: ${APP}/alerts`);
    expect(mail.text).toContain('通知をオフにするか、条件を削除');
    expect(mail.html).toContain(`href="${APP}/alerts"`);
    expect(mail.html).toContain(`href="${APP}/?entity=ent_saas_00000000000000000002"`);
    expect(mail.headers).toBeUndefined();
  });

  it('lists at most 10 cases and says how many more there are', () => {
    const entities = Array.from({ length: 14 }, (_, index) => entity(index + 1));
    const mail = buildSavedSearchEmail({ appUrl: APP, total: 14, entities });
    expect(MAX_MAIL_ENTITIES).toBe(10);
    expect(mail.subject).toContain('14件');
    expect(mail.text).toContain('10. 事例10');
    expect(mail.text).not.toContain('11. 事例11');
    expect(mail.text).toContain('ほか4件は、サイトで確認できます。');
    expect(mail.html).toContain('ほか4件は、');
    expect((mail.html.match(/<li /g) ?? []).length).toBe(10);
  });

  it('adds no "and more" line when everything fits', () => {
    const mail = buildSavedSearchEmail({ appUrl: APP, total: 3, entities: [entity(1), entity(2), entity(3)] });
    expect(mail.text).not.toContain('ほか');
  });

  it('escapes names, descriptions and conditions in the HTML', () => {
    const mail = buildSavedSearchEmail({
      appUrl: APP,
      total: 1,
      entities: [entity(1, { name: '<script>alert(1)</script>&"\'', tagline: '<img src=x onerror=alert(1)>', conditions: ['<b>条件</b>'] })],
    });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<img');
    expect(mail.html).not.toContain('<b>');
    expect(mail.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;&amp;&quot;&#39;');
    expect(mail.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('encodes the case id in the link so it cannot break out of the attribute', () => {
    const mail = buildSavedSearchEmail({ appUrl: APP, total: 1, entities: [entity(1, { id: 'x"><script>' })] });
    expect(mail.html).not.toContain('"><script>');
    expect(mail.html).toContain('?entity=x%22%3E%3Cscript%3E');
  });

  it('leaves out the catalog’s stock description and keeps long names and descriptions to one short line', () => {
    const mail = buildSavedSearchEmail({
      appUrl: APP,
      total: 2,
      entities: [
        entity(1, { tagline: '事例1の事業モデル・公開情報観測データ' }),
        entity(2, { name: `長い名前${'あ'.repeat(300)}`, tagline: `1行目\n2行目 ${'い'.repeat(300)}` }),
      ],
    });
    expect(mail.text).not.toContain('公開情報観測データ');
    expect(mail.text).toContain('2. 長い名前');
    for (const line of mail.text.split('\n')) expect(Array.from(line).length).toBeLessThanOrEqual(140);
    expect(mail.text).toContain('1行目 2行目');
  });

  it('shows a few condition names and counts the rest', () => {
    const mail = buildSavedSearchEmail({ appUrl: APP, total: 1, entities: [entity(1, { conditions: ['A', 'B', 'C', 'D', 'E'] })] });
    expect(mail.text).toContain('一致した条件: A、B、C ほか2件');
  });
});

describe('buildNewsletterEmail', () => {
  const unsubscribeUrl = `${APP}/api/notifications/unsubscribe?u=sub-1&s=${'a'.repeat(64)}`;

  it('carries a visible stop link and the one-click unsubscribe headers', () => {
    const mail = buildNewsletterEmail({
      appUrl: APP, total: 12, entities: Array.from({ length: 12 }, (_, index) => entity(index + 1)), releaseLabel: '2026.09.29 09:00 JST', unsubscribeUrl,
    });
    expect(mail.subject).toBe('【Make Money】新着事例のお知らせ（2026.09.29 09:00 JST）');
    expect(mail.text).toContain(`配信の停止: ${unsubscribeUrl}`);
    expect(mail.html).toContain(`href="${unsubscribeUrl.replace(/&/g, '&amp;')}"`);
    expect(mail.headers).toEqual({
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
    expect(mail.text).toContain('最新の更新（2026.09.29 09:00 JST）で追加された事例は12件でした。');
    expect(mail.text).toContain('ほか2件は、サイトで確認できます。');
    expect(mail.text).not.toContain('一致した条件');
    expect((mail.html.match(/<li /g) ?? []).length).toBe(10);
  });

  it('does not put a header-breaking label into the subject', () => {
    const mail = buildNewsletterEmail({ appUrl: APP, total: 1, entities: [entity(1)], releaseLabel: '9時\r\nBcc: x@mail.jp', unsubscribeUrl });
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });
});
