import { afterEach, describe, expect, it, vi } from 'vitest';
import { absoluteUrl, isSiteUrlConfigured, normalizeSiteUrl, siteUrl } from './url';

afterEach(() => vi.unstubAllEnvs());

describe('siteUrl', () => {
  it('未設定なら開発用の localhost', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    expect(siteUrl()).toBe('http://localhost:3000');
    expect(isSiteUrlConfigured()).toBe(false);
  });
  it('設定値のオリジンだけを使う（末尾スラッシュ・パス・クエリは捨てる）', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', ' https://example.com/foo/?a=1#b ');
    expect(siteUrl()).toBe('https://example.com');
    expect(isSiteUrlConfigured()).toBe(true);
    expect(absoluteUrl('/welcome')).toBe('https://example.com/welcome');
    expect(absoluteUrl('welcome')).toBe('https://example.com/welcome');
  });
  it('http/https 以外と解釈できない値は無効', () => {
    expect(normalizeSiteUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeSiteUrl('example.com')).toBeNull();
    expect(normalizeSiteUrl(undefined)).toBeNull();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'ftp://example.com');
    expect(siteUrl()).toBe('http://localhost:3000');
  });
});
