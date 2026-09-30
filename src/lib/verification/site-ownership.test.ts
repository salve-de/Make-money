import { describe, expect, it, vi } from 'vitest';

import { proveSiteOwnership, siteOwnershipDnsName, siteOwnershipToken } from './site-ownership';

const TOKEN = siteOwnershipToken('owner-1', 'example.com');
const text = (body: string, status = 200) => new Response(body, { status });
const redirect = (location: string) => new Response(null, { status: 301, headers: { location } });
const dns = (answers: Array<{ type: number; data: string }>) => new Response(JSON.stringify({ Answer: answers }), { status: 200 });

function fetcher(routes: Record<string, () => Response | Promise<Response>>) {
  return vi.fn(async (url: string) => {
    const key = Object.keys(routes).find((prefix) => url.startsWith(prefix));
    return key ? routes[key]() : text('not found', 404);
  });
}

describe('siteOwnershipToken', () => {
  it('is stable for the same user and site and differs across users and sites', () => {
    expect(TOKEN).toBe(siteOwnershipToken('owner-1', 'example.com'));
    expect(TOKEN).toMatch(/^kinrokoku-verify-[0-9a-f]{40}$/);
    expect(TOKEN).not.toBe(siteOwnershipToken('owner-2', 'example.com'));
    expect(TOKEN).not.toBe(siteOwnershipToken('owner-1', 'example.org'));
    expect(siteOwnershipDnsName('example.com')).toBe('_kinrokoku-verification.example.com');
  });
});

describe('proveSiteOwnership', () => {
  it('accepts the token in the well-known file on the site', async () => {
    const fetch = fetcher({ 'https://example.com/.well-known/kinrokoku-verification.txt': () => text(`${TOKEN}\n`) });
    expect(await proveSiteOwnership('example.com', TOKEN, fetch)).toBe(true);
  });

  it('follows a redirect between the bare and www host, but not to another site', async () => {
    const www = fetcher({
      'https://example.com/.well-known': () => redirect('https://www.example.com/.well-known/kinrokoku-verification.txt'),
      'https://www.example.com/.well-known': () => text(TOKEN),
    });
    expect(await proveSiteOwnership('example.com', TOKEN, www)).toBe(true);

    const away = fetcher({
      'https://example.com/.well-known': () => redirect('https://attacker.test/token.txt'),
      'https://attacker.test/': () => text(TOKEN),
    });
    expect(await proveSiteOwnership('example.com', TOKEN, away)).toBe(false);
    expect(away.mock.calls.map(([url]) => url)).not.toContain('https://attacker.test/token.txt');
  });

  it('rejects a file with a different token or only part of it', async () => {
    const other = fetcher({ 'https://example.com/.well-known': () => text(siteOwnershipToken('owner-2', 'example.com')) });
    expect(await proveSiteOwnership('example.com', TOKEN, other)).toBe(false);
    const partial = fetcher({ 'https://example.com/.well-known': () => text(`${TOKEN}extra`) });
    expect(await proveSiteOwnership('example.com', TOKEN, partial)).toBe(false);
  });

  it('accepts the token as a DNS TXT record when the file is missing', async () => {
    const fetch = fetcher({ 'https://cloudflare-dns.com/dns-query': () => dns([{ type: 16, data: `"${TOKEN}"` }]) });
    expect(await proveSiteOwnership('example.com', TOKEN, fetch)).toBe(true);
    expect(fetch.mock.calls.at(-1)?.[0]).toContain('name=_kinrokoku-verification.example.com');
  });

  it('treats unreadable sources as not proven', async () => {
    const failing = vi.fn(async () => { throw new Error('timeout'); });
    expect(await proveSiteOwnership('example.com', TOKEN, failing)).toBe(false);
    const wrongType = fetcher({ 'https://cloudflare-dns.com/dns-query': () => dns([{ type: 5, data: TOKEN }]) });
    expect(await proveSiteOwnership('example.com', TOKEN, wrongType)).toBe(false);
  });
});
