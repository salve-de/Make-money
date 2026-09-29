import { describe, expect, it } from 'vitest';
import {
  MEDIA_FETCH_PRODUCT_TOKEN,
  isPublicWebHost,
  isSameSite,
  isTrackerHost,
  parseRobotsTxt,
  pickPricingLink,
  registrableDomain,
  robotsAllows,
  robotsPolicyFromFetch,
  sniffImage,
  type RobotsPolicy,
} from './media-fetch-policy';

describe('official site boundary', () => {
  it('reduces hosts to their registrable domain', () => {
    expect(registrableDomain('www.keyence.co.jp')).toBe('keyence.co.jp');
    expect(registrableDomain('keyence.co.jp')).toBe('keyence.co.jp');
    expect(registrableDomain('cdn.assets.photoai.com')).toBe('photoai.com');
    expect(registrableDomain('stevehanov.ca')).toBe('stevehanov.ca');
    expect(registrableDomain('a.foo.vercel.app')).toBe('foo.vercel.app');
    expect(registrableDomain('Example.COM.')).toBe('example.com');
  });

  it('keeps unrelated sites apart, including look-alikes and shared hosting tenants', () => {
    expect(isSameSite('https://photoai.com/', 'https://www.photoai.com/pricing')).toBe(true);
    expect(isSameSite('https://www.keyence.co.jp/', 'https://static.keyence.co.jp/a.png')).toBe(true);
    expect(isSameSite('https://www.keyence.co.jp/', 'https://www.omron.co.jp/')).toBe(false);
    expect(isSameSite('https://photoai.com/', 'https://photoai.com.evil.example/')).toBe(false);
    expect(isSameSite('https://photoai.com/', 'https://notphotoai.com/')).toBe(false);
    expect(isSameSite('https://foo.vercel.app/', 'https://bar.vercel.app/')).toBe(false);
    expect(isSameSite('https://photoai.com/', 'not a url')).toBe(false);
  });

  it('never treats non-web or internal targets as an official site', () => {
    for (const host of ['localhost', '127.0.0.1', '169.254.169.254', '[::1]', 'intranet', 'printer.local', 'db.internal', '']) {
      expect(isPublicWebHost(host)).toBe(false);
    }
    expect(isPublicWebHost('www.costco.com')).toBe(true);
    expect(isSameSite('http://127.0.0.1/', 'http://127.0.0.1/')).toBe(false);
    expect(isSameSite('file:///etc/passwd', 'https://photoai.com/')).toBe(false);
    expect(isSameSite('ftp://photoai.com/', 'https://photoai.com/')).toBe(false);
  });

  it('recognises trackers by host suffix only', () => {
    expect(isTrackerHost('www.googletagmanager.com')).toBe(true);
    expect(isTrackerHost('script.hotjar.com')).toBe(true);
    expect(isTrackerHost('googletagmanager.com.example.org')).toBe(false);
    expect(isTrackerHost('photoai.com')).toBe(false);
  });
});

function rules(text: string): RobotsPolicy {
  return { kind: 'rules', groups: parseRobotsTxt(text) };
}
const allowed = (policy: RobotsPolicy, url: string) => robotsAllows(policy, url);

describe('robots.txt', () => {
  it('allows everything when no group applies and honours the * group otherwise', () => {
    expect(allowed(rules(''), 'https://a.example/anything')).toBe(true);
    const policy = rules('User-agent: *\nDisallow: /private\nDisallow: /cart\n');
    expect(allowed(policy, 'https://a.example/pricing')).toBe(true);
    expect(allowed(policy, 'https://a.example/private/report')).toBe(false);
    expect(allowed(policy, 'https://a.example/cart?x=1')).toBe(false);
    expect(allowed(rules('User-agent: *\nDisallow:\n'), 'https://a.example/')).toBe(true);
    expect(allowed(rules('User-agent: *\nDisallow: /\n'), 'https://a.example/')).toBe(false);
  });

  it('lets the longest rule win and Allow win ties', () => {
    const policy = rules('User-agent: *\nDisallow: /a\nAllow: /a/b\nDisallow: /tie\nAllow: /tie\n');
    expect(allowed(policy, 'https://a.example/a/x')).toBe(false);
    expect(allowed(policy, 'https://a.example/a/b/c')).toBe(true);
    expect(allowed(policy, 'https://a.example/tie')).toBe(true);
  });

  it('supports * wildcards, the $ anchor and the query string', () => {
    const policy = rules('User-agent: *\nDisallow: /*.png$\nDisallow: /search?q=\nDisallow: /*/draft/\n');
    expect(allowed(policy, 'https://a.example/img/logo.png')).toBe(false);
    expect(allowed(policy, 'https://a.example/img/logo.png?v=2')).toBe(true);
    expect(allowed(policy, 'https://a.example/img/logo.jpg')).toBe(true);
    expect(allowed(policy, 'https://a.example/search?q=cats')).toBe(false);
    expect(allowed(policy, 'https://a.example/search')).toBe(true);
    expect(allowed(policy, 'https://a.example/blog/draft/post')).toBe(false);
  });

  it('prefers the group that names our product token, case-insensitively', () => {
    const text = [
      'User-agent: *',
      'Disallow: /',
      '',
      `User-agent: ${MEDIA_FETCH_PRODUCT_TOKEN.toUpperCase()}`,
      'User-agent: SomeOtherBot',
      'Disallow: /members',
      '',
    ].join('\r\n');
    const policy = rules(text);
    expect(allowed(policy, 'https://a.example/pricing')).toBe(true);
    expect(allowed(policy, 'https://a.example/members/1')).toBe(false);
  });

  it('ignores comments, BOM, unknown fields and rules that precede any user-agent', () => {
    const text = '﻿Disallow: /orphan\n# comment\nSitemap: https://a.example/sitemap.xml\nUser-agent: * # everyone\nCrawl-delay: 5\nDisallow: /x # trailing\n';
    const policy = rules(text);
    expect(allowed(policy, 'https://a.example/orphan')).toBe(true);
    expect(allowed(policy, 'https://a.example/x')).toBe(false);
  });

  it('treats percent-encoded unreserved characters as the character itself', () => {
    const policy = rules('User-agent: *\nDisallow: /%7Euser\n');
    expect(allowed(policy, 'https://a.example/~user/page')).toBe(false);
  });

  it('maps the robots.txt HTTP outcome to a policy as RFC 9309 asks', () => {
    expect(robotsPolicyFromFetch({ status: 404, body: '' }).kind).toBe('allow_all');
    expect(robotsPolicyFromFetch({ status: 403, body: '' }).kind).toBe('allow_all');
    expect(robotsPolicyFromFetch({ status: 500, body: '' }).kind).toBe('disallow_all');
    expect(robotsPolicyFromFetch({ status: 429, body: '' }).kind).toBe('disallow_all');
    expect(robotsPolicyFromFetch({ status: 302, body: '' }).kind).toBe('disallow_all');
    expect(robotsPolicyFromFetch({ error: 'timeout' }).kind).toBe('disallow_all');
    const parsed = robotsPolicyFromFetch({ status: 200, body: 'User-agent: *\nDisallow: /no\n' });
    expect(parsed.kind).toBe('rules');
    expect(allowed(parsed, 'https://a.example/no')).toBe(false);
    expect(allowed(robotsPolicyFromFetch({ error: 'x' }), 'https://a.example/')).toBe(false);
  });

  it('survives hostile wildcard patterns without exponential backtracking', () => {
    const policy = rules(`User-agent: *\nDisallow: /${'*a'.repeat(200)}b\n`);
    const started = Date.now();
    expect(allowed(policy, `https://a.example/${'a'.repeat(3000)}`)).toBe(true);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});

const text = (value: string) => Array.from(value, (char) => char.charCodeAt(0));
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const be16 = (n: number) => [(n >> 8) & 255, n & 255];
const le16 = (n: number) => [n & 255, (n >> 8) & 255];
const le24 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];
const le32 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
const bytes = (...parts: number[][]) => Uint8Array.from(parts.flat());
const zeros = (n: number) => new Array<number>(n).fill(0);

describe('image sniffing', () => {
  it('reads type and size from PNG, JPEG and GIF headers', () => {
    const png = bytes([0x89, ...text('PNG'), 0x0d, 0x0a, 0x1a, 0x0a], be32(13), text('IHDR'), be32(1280), be32(800), zeros(8));
    expect(sniffImage(png)).toEqual({ contentType: 'image/png', extension: 'png', width: 1280, height: 800 });

    const jpeg = bytes([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], zeros(14), [0xff, 0xc0, 0x00, 0x11, 0x08], be16(300), be16(600), [0x03], zeros(9));
    expect(sniffImage(jpeg)).toEqual({ contentType: 'image/jpeg', extension: 'jpg', width: 600, height: 300 });

    const gif = bytes(text('GIF89a'), le16(32), le16(16), zeros(4));
    expect(sniffImage(gif)).toEqual({ contentType: 'image/gif', extension: 'gif', width: 32, height: 16 });
  });

  it('reads the three WebP flavours', () => {
    const riff = (chunk: number[]) => bytes(text('RIFF'), le32(chunk.length + 4), text('WEBP'), chunk);
    const lossy = riff([...text('VP8 '), ...le32(10), 0, 0, 0, 0x9d, 0x01, 0x2a, ...le16(120), ...le16(60)]);
    expect(sniffImage(lossy)).toMatchObject({ contentType: 'image/webp', width: 120, height: 60 });

    const bits = 99 | (49 << 14);
    const lossless = riff([...text('VP8L'), ...le32(5), 0x2f, ...le32(bits)]);
    expect(sniffImage(lossless)).toMatchObject({ extension: 'webp', width: 100, height: 50 });

    const extended = riff([...text('VP8X'), ...le32(10), 0, 0, 0, 0, ...le24(1199), ...le24(629)]);
    expect(sniffImage(extended)).toMatchObject({ extension: 'webp', width: 1200, height: 630 });
  });

  it('reads AVIF, ICO (largest entry) and SVG (attributes, then viewBox)', () => {
    const avif = bytes(be32(24), text('ftyp'), text('avif'), be32(0), text('avifmif1'), be32(20), text('ispe'), be32(0), be32(640), be32(480));
    expect(sniffImage(avif)).toEqual({ contentType: 'image/avif', extension: 'avif', width: 640, height: 480 });

    const entry = (size: number) => [size, size, 0, 0, 1, 0, 32, 0, ...le32(64), ...le32(38)];
    const ico = bytes([0, 0, 1, 0], le16(2), entry(16), entry(0), zeros(8));
    expect(sniffImage(ico)).toEqual({ contentType: 'image/vnd.microsoft.icon', extension: 'ico', width: 256, height: 256 });

    const encode = (value: string) => new TextEncoder().encode(value);
    expect(sniffImage(encode('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24"><path/></svg>'))).toEqual({
      contentType: 'image/svg+xml',
      extension: 'svg',
      width: 24,
      height: 24,
    });
    expect(sniffImage(encode('<svg viewBox="0 0 512 256" xmlns="http://www.w3.org/2000/svg"></svg>'))).toMatchObject({ width: 512, height: 256 });
    expect(sniffImage(encode('<svg xmlns="http://www.w3.org/2000/svg" width="100%"></svg>'))).toMatchObject({ width: null, height: null });
  });

  it('does not mistake error pages and junk for images', () => {
    const encode = (value: string) => new TextEncoder().encode(value);
    expect(sniffImage(encode('<!DOCTYPE html><html><body>404 Not Found</body></html>'))).toBeNull();
    expect(sniffImage(encode('{"error":"forbidden"}'))).toBeNull();
    expect(sniffImage(new Uint8Array(0))).toBeNull();
    expect(sniffImage(Uint8Array.from([0x89, 0x50, 0x4e]))).toBeNull();
  });
});

describe('pricing page selection', () => {
  const home = 'https://saas.example/';
  const link = (href: string, text: string, inNav = false) => ({ href, text, inNav });
  const pick = (links: ReturnType<typeof link>[], current = home) => pickPricingLink(links, home, current)?.href ?? null;

  it('takes the pricing link, preferring pricing paths and navigation over document order', () => {
    expect(pick([link('https://saas.example/contact', 'See prices'), link('https://saas.example/pricing', 'Pricing')])).toBe('https://saas.example/pricing');
    expect(pick([link('https://saas.example/offers', 'Price list'), link('https://saas.example/buy', 'Prices', true)])).toBe('https://saas.example/buy');
    expect(pick([link('https://saas.example/a', 'Price A'), link('https://saas.example/b', 'Price B')])).toBe('https://saas.example/a');
    expect(pick([link('https://saas.example/%E6%96%99%E9%87%91', '料金')])).toBe('https://saas.example/%E6%96%99%E9%87%91');
  });

  it('never picks off-site links, the current page, in-page anchors or non-web links', () => {
    expect(pick([link('https://other.example/pricing', 'Pricing')])).toBeNull();
    expect(pick([link('https://saas.example/#pricing', 'Pricing')])).toBeNull();
    expect(pick([link('https://saas.example/pricing#faq', 'Pricing')], 'https://saas.example/pricing')).toBeNull();
    expect(pick([link('mailto:sales@saas.example', 'Pricing enquiries'), link('javascript:void(0)', 'Pricing'), link('not a url', 'Pricing')])).toBeNull();
    expect(pick([])).toBeNull();
  });

  it('does not mistake blog posts and help articles that talk about prices for a pricing page', () => {
    const title = "Asana's shocking pricing practices and how you can get away with it too";
    expect(pick([link('https://saas.example/blog/asanas-shocking-pricing-practices', title)])).toBeNull();
    expect(pick([link('https://saas.example/ja/blog/pricing', 'Pricing')])).toBeNull();
    expect(pick([link('https://saas.example/help/billing/plans', 'Pricing plans')])).toBeNull();
    // a long label is fine when the path itself says pricing
    expect(pick([link('https://saas.example/pricing', 'Read everything about our pricing, plans and discounts')])).toBe('https://saas.example/pricing');
    // ... but not when it does not
    expect(pick([link('https://saas.example/launch-week', 'Read everything about our pricing, plans and discounts')])).toBeNull();
  });
});
