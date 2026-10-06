import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ env: {} as Record<string, string | undefined> }));
vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: async (name: string) => state.env[name] }));

import { buildNewsletterConfirmUrl, checkNewsletterConfirmLink, CONFIRM_LINK_TTL_SECONDS } from './confirm-link';
import { signNewsletterUnsubscribe } from './unsubscribe-link';

const NOW = Date.UTC(2026, 9, 6, 0, 0, 0);
const APP = 'https://make-money.example.jp';

async function parts(subscriberId = 'sub-1', nowMs = NOW) {
  const url = new URL((await buildNewsletterConfirmUrl(APP, subscriberId, nowMs))!);
  return { id: url.searchParams.get('u')!, e: url.searchParams.get('e')!, s: url.searchParams.get('s')!, url };
}

beforeEach(() => {
  state.env = { NOTIFY_CRON_SECRET: 'cron-secret-value' };
});

describe('newsletter confirmation links', () => {
  it('builds a link without an address and accepts it before expiry', async () => {
    const { id, e, s, url } = await parts();
    expect(url.origin + url.pathname).toBe(`${APP}/api/newsletter/confirm`);
    expect(url.search).not.toContain('@');
    expect(await checkNewsletterConfirmLink(id, e, s, NOW + 1_000)).toBe('valid');
  });

  it('rejects an expired link as expired, but a forged one as invalid', async () => {
    const { id, e, s } = await parts();
    expect(await checkNewsletterConfirmLink(id, e, s, NOW + (CONFIRM_LINK_TTL_SECONDS + 5) * 1000)).toBe('expired');
    // Pushing the expiry forward invalidates the signature instead of extending the link.
    expect(await checkNewsletterConfirmLink(id, String(Number(e) + 86_400), s, NOW + (CONFIRM_LINK_TTL_SECONDS + 5) * 1000)).toBe('invalid');
  });

  it.each([
    ['another subscriber id', (p: { id: string; e: string; s: string }) => [`${p.id}x`, p.e, p.s]],
    ['a changed signature', (p: { id: string; e: string; s: string }) => [p.id, p.e, `${p.s.slice(0, -1)}${p.s.endsWith('0') ? '1' : '0'}`]],
    ['a truncated signature', (p: { id: string; e: string; s: string }) => [p.id, p.e, p.s.slice(0, 63)]],
    ['a non-numeric expiry', (p: { id: string; e: string; s: string }) => [p.id, 'abc', p.s]],
    ['an empty id', (p: { id: string; e: string; s: string }) => ['', p.e, p.s]],
  ])('rejects %s', async (_label, tamper) => {
    const [id, e, s] = tamper(await parts());
    expect(await checkNewsletterConfirmLink(id, e, s, NOW + 1_000)).toBe('invalid');
  });

  it('does not accept an unsubscribe signature as a confirmation', async () => {
    const unsubscribeSignature = (await signNewsletterUnsubscribe('sub-1'))!;
    const { e } = await parts();
    expect(await checkNewsletterConfirmLink('sub-1', e, unsubscribeSignature, NOW + 1_000)).toBe('invalid');
  });

  it('cannot be built or checked without a secret', async () => {
    const { id, e, s } = await parts();
    state.env = {};
    expect(await buildNewsletterConfirmUrl(APP, 'sub-1', NOW)).toBeNull();
    expect(await checkNewsletterConfirmLink(id, e, s, NOW + 1_000)).toBe('invalid');
  });

  it('prefers NOTIFY_UNSUBSCRIBE_SECRET, like the unsubscribe link', async () => {
    const { id, e, s } = await parts();
    state.env = { NOTIFY_CRON_SECRET: 'cron-secret-value', NOTIFY_UNSUBSCRIBE_SECRET: 'other-secret' };
    expect(await checkNewsletterConfirmLink(id, e, s, NOW + 1_000)).toBe('invalid');
  });
});
