import {
  DISTRIBUTION_CATEGORIES,
  DISTRIBUTION_CURRENCIES,
  DISTRIBUTION_LIMITS,
  DISTRIBUTION_PLATFORMS,
  type DistributionTerms,
} from '@/shared/marketplace-distribution';

/** 掲載⇔SellRelay 連携の失敗。code はブラウザへ返してよい理由コード（日本語は shared 側で付ける）。 */
export class DistributionError extends Error {
  constructor(readonly code: string, readonly status = 409) {
    super(code);
    this.name = 'DistributionError';
  }
}

export function fail(code: string, status = 409): never {
  throw new DistributionError(code, status);
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_INPUT', 400);
  return value as Record<string, unknown>;
}

export function reference(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) fail('INVALID_REFERENCE', 400);
  return value;
}

/** 公開されている https のURLだけ。手元・社内・IP直打ち・認証情報付き・ポート指定は拒否する。 */
export function publicHttps(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048 || value !== value.trim() || /[\u0000- \\]/.test(value)) fail('UNSAFE_URL', 400);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail('UNSAFE_URL', 400);
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !host.includes('.')
    || /^[\d.]+$/.test(host) || host.includes(':') || host.startsWith('[')
    || /(^|\.)(localhost|local|internal|home|lan|test|example|invalid)$/.test(host)) fail('UNSAFE_URL', 400);
  return url.toString();
}

/** SellRelay の接続先。パス・クエリの無い https の公開オリジンだけ。 */
export function relayOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail('INVALID_RELAY_ORIGIN', 503);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) {
    fail('INVALID_RELAY_ORIGIN', 503);
  }
  return url.origin;
}

function text(row: Record<string, unknown>, key: 'name' | 'tagline' | 'description' | 'audience'): string {
  const [min, max] = DISTRIBUTION_LIMITS[key];
  const value = row[key];
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) fail('INVALID_TERMS', 400);
  return value.trim();
}

function integer(row: Record<string, unknown>, key: 'price' | 'rate' | 'months'): number {
  const [min, max] = DISTRIBUTION_LIMITS[key === 'rate' ? 'rateBp' : key];
  const value = row[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) fail('INVALID_TERMS', 400);
  return value;
}

/** 掲載者が明示した SellRelay 商品の条件。項目の過不足・範囲外・重複は拒否する。 */
export function parseTerms(value: unknown): DistributionTerms {
  const row = record(value);
  const keys = ['name', 'tagline', 'description', 'audience', 'category', 'platforms', 'price', 'currency', 'rate', 'months'];
  if (Object.keys(row).length !== keys.length || keys.some((key) => !Object.hasOwn(row, key))) fail('INVALID_TERMS', 400);
  const platforms = row.platforms;
  if (!(DISTRIBUTION_CATEGORIES as readonly unknown[]).includes(row.category)
    || !Array.isArray(platforms) || platforms.length < 1 || platforms.length > DISTRIBUTION_PLATFORMS.length
    || new Set(platforms).size !== platforms.length
    || platforms.some((item) => !(DISTRIBUTION_PLATFORMS as readonly unknown[]).includes(item))
    || !(DISTRIBUTION_CURRENCIES as readonly unknown[]).includes(row.currency)) fail('INVALID_TERMS', 400);
  return {
    name: text(row, 'name'),
    tagline: text(row, 'tagline'),
    description: text(row, 'description'),
    audience: text(row, 'audience'),
    category: row.category as DistributionTerms['category'],
    platforms: [...(platforms as DistributionTerms['platforms'])].sort(),
    price: integer(row, 'price'),
    currency: row.currency as DistributionTerms['currency'],
    rate: integer(row, 'rate'),
    months: integer(row, 'months'),
  };
}

/**
 * SellRelay が返した転送先を確かめる。作者が登録したURLと同じ場所で、SellRelay の紹介の印（sr_attribution）が
 * ちょうど1つ付いているだけの時に限り、その転送先を返す。任意のURLへは送らない。
 */
export function verifiedDestination(location: unknown, destination: string): string {
  const target = new URL(publicHttps(location));
  const expected = new URL(publicHttps(destination));
  if (target.origin !== expected.origin || target.pathname !== expected.pathname || target.hash !== expected.hash
    || expected.searchParams.has('sr_attribution')) fail('UNSAFE_REDIRECT', 502);
  const token = target.searchParams.getAll('sr_attribution');
  if (token.length !== 1 || !token[0] || token[0].length > 4096) fail('UNSAFE_REDIRECT', 502);
  target.searchParams.delete('sr_attribution');
  if (target.searchParams.toString() !== expected.searchParams.toString()) fail('UNSAFE_REDIRECT', 502);
  return String(location);
}
