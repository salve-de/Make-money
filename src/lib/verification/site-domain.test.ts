import { describe, expect, it } from 'vitest';

import { isSharedSiteDomain, siteDomain } from './site-domain';

describe('siteDomain', () => {
  it.each([
    ['https://www.Example.com/pricing?x=1#top', 'example.com'],
    ['http://EXAMPLE.com:8080/', 'example.com'],
    ['example.com', 'example.com'],
    ['www.example.com/path', 'example.com'],
    ['  https://shop.example.co.jp  ', 'shop.example.co.jp'],
    ['https://example.com./', 'example.com'],
    ['https://www.www.example.com', 'www.example.com'],
    ['https://日本語.example.jp/', 'xn--wgv71a119e.example.jp'],
  ])('normalizes %s', (input, expected) => {
    expect(siteDomain(input)).toBe(expected);
  });

  it('treats the same site written differently as the same domain', () => {
    expect(siteDomain('https://www.Example.com/')).toBe(siteDomain('http://example.com/about'));
  });

  it.each([
    null,
    undefined,
    '',
    '   ',
    'localhost',
    'http://localhost:3000',
    'https://192.168.0.1/admin',
    'https://[::1]/',
    'ftp://example.com',
    'mailto:someone@example.com',
    'https://user:pass@example.com/',
    'https://exa mple.com',
    'https://.com',
    'not a url',
    'x'.repeat(3000),
  ])('rejects %s', (input) => {
    expect(siteDomain(input as string | null | undefined)).toBeNull();
  });
});

describe('isSharedSiteDomain', () => {
  it.each(['github.com', 'gist.github.com', 'en.wikipedia.org', 'medium.com', 'notion.so', 'apps.apple.com', 'reddit.com', 'x.com'])(
    'treats %s as a shared service',
    (domain) => expect(isSharedSiteDomain(domain)).toBe(true),
  );

  it.each(['example.com', 'myapp.vercel.app', 'notgithub.com', 'github.com.example.org', 'apple.com', 'wikipedia.example.com'])(
    'treats %s as a domain a single owner can hold',
    (domain) => expect(isSharedSiteDomain(domain)).toBe(false),
  );
});
