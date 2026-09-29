import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ env: {} as Record<string, string | undefined> }));

vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: async (name: string) => state.env[name] }));

import { buildNewsletterUnsubscribeUrl, signNewsletterUnsubscribe, verifyNewsletterUnsubscribe } from './unsubscribe-link';

beforeEach(() => {
  state.env = { NOTIFY_CRON_SECRET: 'cron-secret-value' };
});

describe('newsletter unsubscribe signatures', () => {
  it('signs an id and verifies it', async () => {
    const signature = await signNewsletterUnsubscribe('subscriber-1');
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
    expect(await verifyNewsletterUnsubscribe('subscriber-1', signature!)).toBe(true);
  });

  it('is deterministic, so the link in an old email keeps working', async () => {
    expect(await signNewsletterUnsubscribe('subscriber-1')).toBe(await signNewsletterUnsubscribe('subscriber-1'));
  });

  it("does not let one subscriber's signature work for another id", async () => {
    const signature = (await signNewsletterUnsubscribe('subscriber-1'))!;
    expect(await verifyNewsletterUnsubscribe('subscriber-2', signature)).toBe(false);
  });

  it.each([
    ['a changed character', (value: string) => `${value.slice(0, -1)}${value.endsWith('0') ? '1' : '0'}`],
    ['upper case hex', (value: string) => value.toUpperCase()],
    ['a truncated signature', (value: string) => value.slice(0, 63)],
    ['an extended signature', (value: string) => `${value}0`],
    ['not hex', () => 'z'.repeat(64)],
    ['empty', () => ''],
  ])('rejects %s', async (_label, tamper) => {
    const signature = (await signNewsletterUnsubscribe('subscriber-1'))!;
    expect(await verifyNewsletterUnsubscribe('subscriber-1', tamper(signature))).toBe(false);
  });

  it('rejects an empty or oversized id without doing any work', async () => {
    const signature = (await signNewsletterUnsubscribe('subscriber-1'))!;
    expect(await verifyNewsletterUnsubscribe('', signature)).toBe(false);
    expect(await verifyNewsletterUnsubscribe('x'.repeat(129), signature)).toBe(false);
  });

  it('stops working when the secret changes, and never signs without one', async () => {
    const signature = (await signNewsletterUnsubscribe('subscriber-1'))!;
    state.env = { NOTIFY_CRON_SECRET: 'a-different-secret' };
    expect(await verifyNewsletterUnsubscribe('subscriber-1', signature)).toBe(false);
    state.env = {};
    expect(await signNewsletterUnsubscribe('subscriber-1')).toBeNull();
    expect(await verifyNewsletterUnsubscribe('subscriber-1', signature)).toBe(false);
  });

  it('prefers the dedicated unsubscribe secret, so the cron secret can be rotated freely', async () => {
    state.env = { NOTIFY_UNSUBSCRIBE_SECRET: 'link-secret', NOTIFY_CRON_SECRET: 'cron-1' };
    const signature = (await signNewsletterUnsubscribe('subscriber-1'))!;
    state.env = { NOTIFY_UNSUBSCRIBE_SECRET: 'link-secret', NOTIFY_CRON_SECRET: 'cron-2-rotated' };
    expect(await verifyNewsletterUnsubscribe('subscriber-1', signature)).toBe(true);
    state.env = { NOTIFY_CRON_SECRET: 'link-secret' };
    expect(await verifyNewsletterUnsubscribe('subscriber-1', signature)).toBe(true);
  });

  it('gives a signature for one purpose no meaning for another id spelling', async () => {
    const signature = (await signNewsletterUnsubscribe('subscriber-1'))!;
    expect(await verifyNewsletterUnsubscribe('subscriber-1 ', signature)).toBe(false);
    expect(await verifyNewsletterUnsubscribe('Subscriber-1', signature)).toBe(false);
  });
});

describe('buildNewsletterUnsubscribeUrl', () => {
  it('builds a link on the app that carries the id and a valid signature', async () => {
    const url = (await buildNewsletterUnsubscribeUrl('https://make-money.example.jp', 'sub/1 &x'))!;
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://make-money.example.jp/api/notifications/unsubscribe');
    expect(parsed.searchParams.get('u')).toBe('sub/1 &x');
    expect(await verifyNewsletterUnsubscribe(parsed.searchParams.get('u')!, parsed.searchParams.get('s')!)).toBe(true);
  });

  it('returns null when no secret is configured', async () => {
    state.env = {};
    expect(await buildNewsletterUnsubscribeUrl('https://make-money.example.jp', 'subscriber-1')).toBeNull();
  });
});
