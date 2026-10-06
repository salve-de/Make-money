import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import robots, { DISALLOWED_PATHS } from '@/app/robots';
import sitemap from '@/app/sitemap';
import { buildSitemapEntries, PUBLIC_STATIC_PATHS, SITEMAP_MAX_URLS } from './sitemap-entries';
import { entityMetadata, noIndexMetadata, pageMetadata } from './metadata';
import { serializeJsonLd, websiteJsonLd } from './json-ld';
import { catalogIds } from '@/shared/catalog-membership';

beforeEach(() => vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com'));
afterEach(() => vi.unstubAllEnvs());

describe('robots', () => {
  it('API・個人ページ・メンテナンスを拒否し、sitemap を指す', () => {
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.userAgent).toBe('*');
    expect(rule.allow).toBe('/');
    for (const path of ['/api/', '/alerts', '/execute', '/build', '/verify', '/success', '/maintenance', '/marketplace/businesses/mine']) {
      expect(rule.disallow).toContain(path);
    }
    expect(result.sitemap).toBe('https://example.com/sitemap.xml');
  });
  it('sitemap に入れる固定ページは拒否対象に含まれない', () => {
    for (const path of PUBLIC_STATIC_PATHS) {
      expect(DISALLOWED_PATHS.some((blocked) => path === blocked || path.startsWith(blocked))).toBe(false);
    }
  });
});

describe('sitemap', () => {
  it('固定ページと公開目録の事例だけを、絶対URLで返す', () => {
    const entries = sitemap();
    expect(entries.length).toBe(PUBLIC_STATIC_PATHS.length + catalogIds().length);
    expect(entries[0].url).toBe('https://example.com/');
    expect(entries.every((entry) => entry.url.startsWith('https://example.com/'))).toBe(true);
    expect(entries.some((entry) => /\/(api|alerts|execute|maintenance)/.test(entry.url))).toBe(false);
    const sample = catalogIds()[0];
    expect(entries.map((entry) => entry.url)).toContain(`https://example.com/?entity=${encodeURIComponent(sample)}`);
  });
  it('5万URLの上限を超えず、固定ページは残る', () => {
    const many = Array.from({ length: SITEMAP_MAX_URLS + 500 }, (_, index) => `ent_${index}`);
    const entries = buildSitemapEntries(many);
    expect(entries).toHaveLength(SITEMAP_MAX_URLS);
    expect(entries[0].url).toBe('https://example.com/');
  });
  it('ID は URL エンコードされる', () => {
    expect(buildSitemapEntries(['a b&c']).at(-1)?.url).toBe('https://example.com/?entity=a%20b%26c');
  });
});

describe('メタデータ', () => {
  it('公開ページは canonical・OG・Twitter カードを持つ', () => {
    const meta = pageMetadata({ title: 'T | Make Money', description: 'D', path: '/discover' });
    expect(meta.alternates?.canonical).toBe('https://example.com/discover');
    expect(meta.openGraph).toMatchObject({ title: 'T | Make Money', url: 'https://example.com/discover', locale: 'ja_JP' });
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image' });
    expect(meta.robots).toBeUndefined();
  });
  it('path を渡さなければ canonical を付けない（子の階層への誤継承を避ける）', () => {
    expect(pageMetadata({ title: 'T', description: 'D' }).alternates).toBeUndefined();
  });
  it('個人・作業ページは noindex で、共有情報を持たない', () => {
    const meta = noIndexMetadata('保存した条件 | Make Money');
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.openGraph).toBeUndefined();
  });
  it('事例: 目録外（null）は名前を出さず noindex', () => {
    const meta = entityMetadata(null);
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(JSON.stringify(meta)).not.toContain('ent_');
  });
  it('事例: 名前・説明を出し、説明は長すぎる時に切る', () => {
    const meta = entityMetadata({ id: 'ent_x', name: 'サンプル社', tagline: 'あ'.repeat(300) });
    expect(meta.title).toBe('サンプル社 | 事例 | Make Money');
    expect(String(meta.description).length).toBeLessThanOrEqual(120);
    expect(meta.alternates?.canonical).toBe('https://example.com/?entity=ent_x');
  });
});

describe('構造化データ', () => {
  it('WebSite だけで、評価・価格を含まない', () => {
    const json = serializeJsonLd(websiteJsonLd());
    expect(JSON.parse(json)['@type']).toBe('WebSite');
    expect(json).not.toMatch(/Review|AggregateRating|ratingValue|offers|price/i);
  });
  it('< を逃がす', () => {
    expect(serializeJsonLd({ a: '</script>' })).not.toContain('</script>');
  });
});
