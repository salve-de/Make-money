/**
 * Pure rules for the media asset fetcher (scripts/media/fetch-official-assets.ts):
 * where it may go (official site boundary, robots.txt), what it must not load
 * (trackers) and how to recognise an image from its bytes.
 *
 * No I/O, no Node APIs: the rules are unit-tested here and the script only
 * wires them to Playwright and fetch. Operating procedure:
 * docs/MEDIA_ASSETS_AND_PROVENANCE.md
 */

/** Product token in the User-Agent; robots.txt groups are matched against it. */
export const MEDIA_FETCH_PRODUCT_TOKEN = 'MakeMoneyMediaFetch';

// ---------------------------------------------------------------------------
// Official site boundary
// ---------------------------------------------------------------------------

/**
 * Two-label public suffixes that are common in the catalog. There is no public
 * suffix list in the repo, so this is a heuristic: an unlisted suffix makes two
 * unrelated sites look like one site, never the other way round.
 */
const SECOND_LEVEL_SUFFIXES: ReadonlySet<string> = new Set([
  'co.jp', 'or.jp', 'ne.jp', 'ac.jp', 'ad.jp', 'ed.jp', 'go.jp', 'gr.jp', 'lg.jp',
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'ltd.uk', 'plc.uk', 'me.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.nz', 'org.nz', 'net.nz',
  'com.br', 'net.br', 'org.br', 'com.cn', 'net.cn', 'org.cn',
  'com.hk', 'com.sg', 'com.tw', 'com.my', 'com.ph', 'com.vn', 'com.mx', 'com.ar', 'com.co', 'com.tr', 'com.ua',
  'co.kr', 'or.kr', 'co.in', 'net.in', 'org.in', 'co.id', 'co.th', 'co.il', 'co.za',
]);

/** Hosting platforms where every subdomain is a different owner. */
const SHARED_HOSTING_SUFFIXES: readonly string[] = [
  'vercel.app', 'netlify.app', 'github.io', 'gitlab.io', 'pages.dev', 'workers.dev', 'web.app', 'firebaseapp.com',
  'herokuapp.com', 'blogspot.com', 'wordpress.com', 'substack.com', 'notion.site', 'carrd.co', 'webflow.io',
  'wixsite.com', 'myshopify.com', 'azurewebsites.net', 'cloudfront.net', 'onrender.com', 'fly.dev', 'railway.app',
  'glitch.me', 'framer.website', 'framer.app', 'ghost.io', 'bubbleapps.io',
];

const PRIVATE_HOST_SUFFIXES: readonly string[] = ['.localhost', '.local', '.internal', '.lan', '.home.arpa', '.intranet', '.corp'];

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

/** Registrable domain (eTLD+1, heuristic). `www.keyence.co.jp` -> `keyence.co.jp`. */
export function registrableDomain(hostname: string): string {
  const host = normalizeHost(hostname);
  const labels = host.split('.');
  if (labels.length <= 2) return host;
  for (const suffix of SHARED_HOSTING_SUFFIXES) {
    if (host === suffix) return host;
    if (host.endsWith(`.${suffix}`)) return labels.slice(-(suffix.split('.').length + 1)).join('.');
  }
  if (SECOND_LEVEL_SUFFIXES.has(labels.slice(-2).join('.'))) return labels.slice(-3).join('.');
  return labels.slice(-2).join('.');
}

/** False for localhost, IP literals, single-label and obviously internal names (SSRF guard). */
export function isPublicWebHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (!host || host === 'localhost') return false;
  if (host.startsWith('[') || host.includes(':')) return false; // IPv6 literal
  if (/^\d+(\.\d+){0,3}$/.test(host)) return false; // IPv4 literal (URL already normalises 127.1 etc.)
  if (!host.includes('.')) return false;
  return !PRIVATE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function parseUrl(value: string | URL): URL | null {
  if (value instanceof URL) return value;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** Same registrable domain, both http(s) and both public hosts. */
export function isSameSite(a: string | URL, b: string | URL): boolean {
  const left = parseUrl(a);
  const right = parseUrl(b);
  if (!left || !right) return false;
  const web = (url: URL) => (url.protocol === 'https:' || url.protocol === 'http:') && isPublicWebHost(url.hostname);
  if (!web(left) || !web(right)) return false;
  return registrableDomain(left.hostname) === registrableDomain(right.hostname);
}

// ---------------------------------------------------------------------------
// Trackers (optional blocking while rendering; never blocks the official site itself)
// ---------------------------------------------------------------------------

const TRACKER_HOST_SUFFIXES: readonly string[] = [
  'google-analytics.com', 'analytics.google.com', 'googletagmanager.com', 'googletagservices.com', 'doubleclick.net',
  'googlesyndication.com', 'googleadservices.com', 'facebook.net', 'hotjar.com', 'hotjar.io', 'clarity.ms',
  'segment.io', 'segment.com', 'mixpanel.com', 'amplitude.com', 'fullstory.com', 'mouseflow.com', 'crazyegg.com',
  'heapanalytics.com', 'newrelic.com', 'nr-data.net', 'bat.bing.com', 'snap.licdn.com', 'px.ads.linkedin.com',
  'ads.linkedin.com', 'analytics.tiktok.com', 'criteo.com', 'criteo.net', 'taboola.com', 'outbrain.com', 'adsrvr.org',
  'scorecardresearch.com', 'quantserve.com', 'omtrdc.net', 'demdex.net', 'everesttech.net', 'hs-analytics.net',
  'hsadspixel.net', 'plausible.io', 'posthog.com', 'ads-twitter.com', 'analytics.twitter.com',
];

export function isTrackerHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  return TRACKER_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

// ---------------------------------------------------------------------------
// robots.txt (RFC 9309)
// ---------------------------------------------------------------------------

export interface RobotsRule {
  allow: boolean;
  pattern: string;
}

export interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
}

/** What we know about a host's robots.txt. */
export type RobotsPolicy =
  | { kind: 'allow_all'; reason: string }
  | { kind: 'disallow_all'; reason: string }
  | { kind: 'rules'; groups: RobotsGroup[] };

const ROBOTS_MAX_CHARS = 512 * 1024;
const ROBOTS_MAX_RULES = 5000;

export function parseRobotsTxt(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let collectingAgents = false;
  let ruleCount = 0;

  for (const rawLine of text.slice(0, ROBOTS_MAX_CHARS).replace(/^﻿/, '').split(/\r\n|\n|\r/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === 'user-agent') {
      if (!current || !collectingAgents) {
        current = { agents: [], rules: [] };
        groups.push(current);
        collectingAgents = true;
      }
      current.agents.push(value.toLowerCase());
    } else if (field === 'allow' || field === 'disallow') {
      if (!current) continue; // a rule before any user-agent belongs to no group
      collectingAgents = false;
      if (value === '' || ruleCount >= ROBOTS_MAX_RULES) continue; // empty rule = no restriction
      current.rules.push({ allow: field === 'allow', pattern: value });
      ruleCount += 1;
    }
  }
  return groups;
}

/**
 * Maps the outcome of fetching /robots.txt to a policy (RFC 9309 section 2.3.1):
 * 2xx is parsed, 4xx means "no robots.txt", 5xx / 429 / unreachable means "stay away".
 */
export function robotsPolicyFromFetch(result: { status: number; body: string } | { error: string }): RobotsPolicy {
  if ('error' in result) return { kind: 'disallow_all', reason: `robots.txt unreachable: ${result.error}` };
  const { status, body } = result;
  if (status >= 200 && status < 300) return { kind: 'rules', groups: parseRobotsTxt(body) };
  if (status === 429 || status >= 500 || (status >= 300 && status < 400)) return { kind: 'disallow_all', reason: `robots.txt returned HTTP ${status}` };
  return { kind: 'allow_all', reason: `robots.txt returned HTTP ${status} (no robots rules)` };
}

/** Percent-escapes of unreserved characters are equivalent to the character itself. */
function normalizeRobotsPath(value: string): string {
  return value.replace(/%[0-9a-fA-F]{2}/g, (escape) => {
    const char = String.fromCharCode(parseInt(escape.slice(1), 16));
    return /[A-Za-z0-9\-._~]/.test(char) ? char : escape.toUpperCase();
  });
}

/** Full-string wildcard match (`*`), iterative so hostile patterns cannot backtrack exponentially. */
function wildcardMatch(pattern: string, text: string): boolean {
  let p = 0;
  let t = 0;
  let starP = -1;
  let starT = 0;
  while (t < text.length) {
    if (p < pattern.length && pattern[p] === '*') {
      starP = p;
      starT = t;
      p += 1;
    } else if (p < pattern.length && pattern[p] === text[t]) {
      p += 1;
      t += 1;
    } else if (starP !== -1) {
      p = starP + 1;
      starT += 1;
      t = starT;
    } else {
      return false;
    }
  }
  while (p < pattern.length && pattern[p] === '*') p += 1;
  return p === pattern.length;
}

function ruleMatches(rule: RobotsRule, target: string): boolean {
  const anchored = rule.pattern.endsWith('$');
  const pattern = normalizeRobotsPath(anchored ? rule.pattern.slice(0, -1) : rule.pattern);
  return wildcardMatch(anchored ? pattern : `${pattern}*`, target);
}

/** May `token` fetch `url` under this robots policy? Longest matching rule wins, Allow wins ties. */
export function robotsAllows(policy: RobotsPolicy, url: string | URL, token: string = MEDIA_FETCH_PRODUCT_TOKEN): boolean {
  if (policy.kind === 'allow_all') return true;
  if (policy.kind === 'disallow_all') return false;
  const parsed = parseUrl(url);
  if (!parsed) return false;

  const wanted = token.toLowerCase();
  const own = policy.groups.filter((group) => group.agents.includes(wanted));
  const applicable = own.length > 0 ? own : policy.groups.filter((group) => group.agents.includes('*'));
  const target = normalizeRobotsPath(`${parsed.pathname || '/'}${parsed.search}`);

  let best: { length: number; allow: boolean } | null = null;
  for (const group of applicable) {
    for (const rule of group.rules) {
      if (!ruleMatches(rule, target)) continue;
      const length = rule.pattern.length;
      if (!best || length > best.length || (length === best.length && rule.allow && !best.allow)) best = { length, allow: rule.allow };
    }
  }
  return best ? best.allow : true;
}

// ---------------------------------------------------------------------------
// Image recognition (never trust the Content-Type header alone)
// ---------------------------------------------------------------------------

export interface SniffedImage {
  contentType: string;
  extension: string;
  width: number | null;
  height: number | null;
}

const ascii = (b: Uint8Array, start: number, length: number) => String.fromCharCode(...b.subarray(start, start + length));
const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const u32le = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

function image(contentType: string, extension: string, width: number | null, height: number | null): SniffedImage {
  const valid = width !== null && height !== null && width > 0 && height > 0 && width <= 100_000 && height <= 100_000;
  return { contentType, extension, width: valid ? width : null, height: valid ? height : null };
}

function sniffPng(b: Uint8Array): SniffedImage | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 24 || !signature.every((byte, i) => b[i] === byte) || ascii(b, 12, 4) !== 'IHDR') return null;
  return image('image/png', 'png', u32be(b, 16), u32be(b, 20));
}

function sniffJpeg(b: Uint8Array): SniffedImage | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const marker = b[i + 1];
    if (marker === 0xff) { i += 1; continue; }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const length = u16be(b, i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return image('image/jpeg', 'jpg', u16be(b, i + 7), u16be(b, i + 5));
    }
    if (marker === 0xda || length < 2) break;
    i += 2 + length;
  }
  return image('image/jpeg', 'jpg', null, null);
}

function sniffGif(b: Uint8Array): SniffedImage | null {
  if (b.length < 10 || (ascii(b, 0, 6) !== 'GIF87a' && ascii(b, 0, 6) !== 'GIF89a')) return null;
  return image('image/gif', 'gif', u16le(b, 6), u16le(b, 8));
}

function sniffWebp(b: Uint8Array): SniffedImage | null {
  if (b.length < 16 || ascii(b, 0, 4) !== 'RIFF' || ascii(b, 8, 4) !== 'WEBP') return null;
  const chunk = ascii(b, 12, 4);
  if (chunk === 'VP8 ' && b.length >= 30) return image('image/webp', 'webp', u16le(b, 26) & 0x3fff, u16le(b, 28) & 0x3fff);
  if (chunk === 'VP8L' && b.length >= 25) {
    const bits = u32le(b, 21);
    return image('image/webp', 'webp', (bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  if (chunk === 'VP8X' && b.length >= 30) return image('image/webp', 'webp', u24le(b, 24) + 1, u24le(b, 27) + 1);
  return image('image/webp', 'webp', null, null);
}

function sniffAvif(b: Uint8Array): SniffedImage | null {
  if (b.length < 16 || ascii(b, 4, 4) !== 'ftyp') return null;
  const brand = ascii(b, 8, 4);
  if (brand !== 'avif' && brand !== 'avis') return null;
  const head = ascii(b, 0, Math.min(b.length, 2048));
  const at = head.indexOf('ispe');
  if (at < 0 || at + 16 > b.length) return image('image/avif', 'avif', null, null);
  return image('image/avif', 'avif', u32be(b, at + 8), u32be(b, at + 12));
}

function sniffIco(b: Uint8Array): SniffedImage | null {
  if (b.length < 22 || b[0] !== 0 || b[1] !== 0 || b[2] !== 1 || b[3] !== 0) return null;
  const count = u16le(b, 4);
  if (count < 1 || count > 255 || 6 + count * 16 > b.length) return null;
  let width = 0;
  let height = 0;
  for (let n = 0; n < count; n += 1) {
    const offset = 6 + n * 16;
    const w = b[offset] || 256;
    const h = b[offset + 1] || 256;
    if (w * h > width * height) { width = w; height = h; }
  }
  return image('image/vnd.microsoft.icon', 'ico', width, height);
}

function svgSize(tag: string): { width: number; height: number } | null {
  const attribute = (name: string) => {
    const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag);
    return match ? (match[1] ?? match[2]) : null;
  };
  const plain = (value: string | null) => {
    const match = /^\s*(\d*\.?\d+)\s*(?:px)?\s*$/i.exec(value ?? '');
    return match ? Math.round(parseFloat(match[1])) : null;
  };
  const width = plain(attribute('width'));
  const height = plain(attribute('height'));
  if (width && height) return { width, height };
  const box = (attribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  if (box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0) return { width: Math.round(box[2]), height: Math.round(box[3]) };
  return null;
}

function sniffSvg(b: Uint8Array): SniffedImage | null {
  const head = new TextDecoder('utf-8').decode(b.subarray(0, 4096)).replace(/^﻿/, '');
  const prolog = /^\s*(?:<\?xml[^>]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*(<svg\b[^>]*>)/i.exec(head);
  if (!prolog) return null;
  const size = svgSize(prolog[1]);
  return image('image/svg+xml', 'svg', size?.width ?? null, size?.height ?? null);
}

/** Recognises PNG, JPEG, GIF, WebP, AVIF, ICO and SVG from the leading bytes; `null` for anything else (HTML error pages, etc.). */
export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  return sniffPng(bytes) ?? sniffJpeg(bytes) ?? sniffGif(bytes) ?? sniffWebp(bytes) ?? sniffAvif(bytes) ?? sniffIco(bytes) ?? sniffSvg(bytes);
}

// ---------------------------------------------------------------------------
// Pricing page selection
// ---------------------------------------------------------------------------

/** Link text that suggests a pricing page (owner spec 2026-09-29). */
export const PRICING_LINK_TEXT = /pricing|料金|price/i;

/** Articles and help pages that merely talk about prices: a blog post titled "... pricing ..." is not a pricing page. */
const ARTICLE_PATH = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:blogs?|posts?|news|articles?|stories|press|insights|resources|learn|docs?|help|support|kb|community|forums?|changelog|releases|tags?|categor(?:y|ies))(?:\/|$)/i;
const PRICING_PATH = /(?:^|\/)(?:pricing|prices?|plans?|料金|価格)(?:[-_./]|$)/i;
const MAX_LABEL_WITHOUT_PRICING_PATH = 32;

export interface PricingLinkCandidate {
  href: string;
  text: string;
  /** Inside <nav> or <header>: the main navigation is where real pricing links live. */
  inNav: boolean;
}

function decodedPath(url: URL): string {
  try {
    return decodeURIComponent(url.pathname);
  } catch {
    return url.pathname;
  }
}

function withoutHash(url: URL): string {
  const copy = new URL(url.href);
  copy.hash = '';
  return copy.href;
}

/**
 * Picks the page to screenshot as "pricing" from links whose text matched PRICING_LINK_TEXT: same site only, never the
 * current page, no articles / help pages, and a long sentence is accepted only when its path itself says pricing.
 * Pricing-looking paths and navigation links come first; otherwise the first link in document order wins.
 */
export function pickPricingLink(links: readonly PricingLinkCandidate[], home: string | URL, current: string | URL): URL | null {
  const currentUrl = parseUrl(current);
  const seen = new Set<string>(currentUrl ? [withoutHash(currentUrl)] : []);
  const candidates: { url: URL; rank: number }[] = [];
  for (const link of links) {
    const url = parseUrl(link.href);
    if (!url || !isSameSite(url, home)) continue;
    const key = withoutHash(url);
    if (seen.has(key)) continue;
    const path = decodedPath(url);
    const pricingPath = PRICING_PATH.test(path);
    if (ARTICLE_PATH.test(path) || (!pricingPath && link.text.length > MAX_LABEL_WITHOUT_PRICING_PATH)) continue;
    seen.add(key);
    const target = new URL(key);
    candidates.push({ url: target, rank: (pricingPath ? 2 : 0) + (link.inNav ? 1 : 0) });
  }
  candidates.sort((a, b) => b.rank - a.rank); // stable: ties keep document order
  return candidates[0]?.url ?? null;
}
